import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";

// ============================================================
// DOM
// ============================================================

const viewerTitle = document.getElementById("viewerTitle");
const viewerStatus = document.getElementById("viewerStatus");
const pageIndicator = document.getElementById("pageIndicator");

const btnPrevPage = document.getElementById("btnPrevPage");
const btnNextPage = document.getElementById("btnNextPage");
const btnZoomOut = document.getElementById("btnZoomOut");
const btnZoomReset = document.getElementById("btnZoomReset");
const btnZoomIn = document.getElementById("btnZoomIn");

const canvas = document.getElementById("pdfCanvas");
const ctx = canvas.getContext("2d");

// ============================================================
// STATE
// ============================================================

let pdfDoc = null;
let currentPage = 1;
let totalPages = 1;
let scale = 1.2;
let isRendering = false;
let pendingPage = null;

const params = new URLSearchParams(window.location.search);
const fileParam = params.get("file") || "";
const pageParam = Number(params.get("page")) || 1;
const titleParam = params.get("title") || "Regelwerk";

// ============================================================
// HELPERS
// ============================================================

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function updatePageIndicator() {
    pageIndicator.textContent = `Seite ${currentPage} / ${totalPages}`;
}

function updateButtons() {
    btnPrevPage.disabled = currentPage <= 1 || isRendering;
    btnNextPage.disabled = currentPage >= totalPages || isRendering;

    btnZoomOut.disabled = isRendering;
    btnZoomReset.disabled = isRendering;
    btnZoomIn.disabled = isRendering;
}

function updateStatus(message) {
    viewerStatus.textContent = message;
}

async function renderPage(pageNumber) {
    if (!pdfDoc) return;

    isRendering = true;
    updateButtons();
    updateStatus(`Seite ${pageNumber} wird geladen ...`);

    try {
        const page = await pdfDoc.getPage(pageNumber);

        const canvasWrap = document.querySelector(".ruleViewer__canvasWrap");
        const wrapWidth = Math.max((canvasWrap?.clientWidth || 320) - 20, 200);

        const baseViewport = page.getViewport({ scale: 1 });
        const fittedScale = (wrapWidth / baseViewport.width) * scale;
        const viewport = page.getViewport({ scale: fittedScale });

        const outputScale = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);

        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const renderContext = {
            canvasContext: ctx,
            viewport,
            transform: outputScale !== 1
                ? [outputScale, 0, 0, outputScale, 0, 0]
                : null
        };

        await page.render(renderContext).promise;

        currentPage = pageNumber;
        updatePageIndicator();
        updateStatus(`PDF geladen: ${titleParam}`);
    } catch (error) {
        console.error("Fehler beim Rendern der PDF-Seite:", error);
        updateStatus("Fehler beim Anzeigen der Seite.");
    } finally {
        isRendering = false;
        updateButtons();

        if (pendingPage !== null && pendingPage !== currentPage) {
            const nextPage = pendingPage;
            pendingPage = null;
            renderPage(nextPage);
        } else {
            pendingPage = null;
        }
    }
}

function queueRenderPage(pageNumber) {
    const safePage = clamp(pageNumber, 1, totalPages);

    if (isRendering) {
        pendingPage = safePage;
        return;
    }

    renderPage(safePage);
}

function changePage(offset) {
    queueRenderPage(currentPage + offset);
}

function changeZoom(nextScale) {
    scale = clamp(nextScale, 0.5, 3);
    queueRenderPage(currentPage);
}

// ============================================================
// INIT
// ============================================================

async function initViewer() {
    viewerTitle.textContent = titleParam;

    if (!fileParam) {
        updateStatus("Keine PDF-Datei angegeben.");
        return;
    }

    try {
        updateStatus("PDF wird geladen ...");

        const loadingTask = pdfjsLib.getDocument(fileParam);
        pdfDoc = await loadingTask.promise;

        totalPages = pdfDoc.numPages;
        currentPage = clamp(pageParam, 1, totalPages);

        updatePageIndicator();
        updateButtons();

        await renderPage(currentPage);
    } catch (error) {
        console.error("Fehler beim Laden der PDF:", error);
        updateStatus("PDF konnte nicht geladen werden.");
    }
}

// ============================================================
// EVENTS
// ============================================================

btnPrevPage.addEventListener("click", () => changePage(-1));
btnNextPage.addEventListener("click", () => changePage(1));

btnZoomOut.addEventListener("click", () => changeZoom(scale - 0.2));
btnZoomReset.addEventListener("click", () => changeZoom(1.2));
btnZoomIn.addEventListener("click", () => changeZoom(scale + 0.2));

initViewer();