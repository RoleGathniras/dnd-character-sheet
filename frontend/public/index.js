import { API } from "./api.js";
import {
    applyRoleUI,
    loadCharacters,
    refreshCurrentUserAndUI,
    renderDrawerTitle,
    setAdminVisible,
    setCurrentCharacter,
    setLoggedInUI,
    setStatus,
} from "./app.js";

(function () {
    const isIndexPage =
        location.pathname === "/" ||
        location.pathname.endsWith("/index") ||
        location.pathname.endsWith("/index.html");

    if (!isIndexPage) return;

    const characterGrid = document.getElementById("characterGrid");
    const emptyState = document.getElementById("characterEmptyState");

    function escapeHtml(s) {
        return String(s)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    async function renderCharacterCards() {
        if (!characterGrid) return;

        if (!API.token) {
            characterGrid.innerHTML = "";
            if (emptyState) emptyState.hidden = false;
            return;
        }

        try {
            const chars = await API.characters();

            characterGrid.innerHTML = "";

            if (!chars.length) {
                if (emptyState) {
                    emptyState.hidden = false;
                    emptyState.textContent = "Noch keine Charaktere vorhanden.";
                }
                setStatus("Keine Charaktere vorhanden.");
                return;
            }

            if (emptyState) emptyState.hidden = true;

            for (const c of chars) {
                const card = document.createElement("button");
                card.type = "button";
                card.className = "characterCard";

                const imageDataUrl = c.data?.appearance?.imageDataUrl || "";
                const safeName = escapeHtml(c.name ?? "Unbenannt");
                const safeKind = escapeHtml((c.kind ?? "pc").toUpperCase());
                const safeOwner = c.owner_username ? escapeHtml(c.owner_username) : "";

                card.innerHTML = `
                    <div class="characterCard__imageWrap">
                        ${imageDataUrl
                        ? `<img class="characterCard__image" src="${imageDataUrl}" alt="${safeName}">`
                        : `<div class="characterCard__imagePlaceholder">Kein Bild</div>`
                    }
                    </div>

                    <div class="characterCard__body">
                        <div class="characterCard__title">${safeName}</div>
                        <div class="characterCard__meta">
                            <span class="characterCard__badge">${safeKind}</span>
                            ${safeOwner ? `<span class="characterCard__owner">${safeOwner}</span>` : ``}
                        </div>
                    </div>
                `;

                card.addEventListener("click", () => {
                    setCurrentCharacter(c.id);
                    window.location.href = "/sheet.html";
                });

                characterGrid.appendChild(card);
            }

            setStatus(`Charaktere geladen: ${chars.length}`);
        } catch (e) {
            console.error("[index.js] Fehler beim Laden der Charakterkarten", e);
            characterGrid.innerHTML = "";
            if (emptyState) {
                emptyState.hidden = false;
                emptyState.textContent = "Fehler beim Laden der Charaktere.";
            }
            setStatus("Fehler beim Laden der Charaktere ❌");
        }
    }

    window.addEventListener("auth:login", async () => {
        try {
            setLoggedInUI(true);
            await refreshCurrentUserAndUI();
            applyRoleUI();
            await loadCharacters(); // Drawer
            await renderCharacterCards(); // Landing Cards
        } catch (e) {
            console.error("[index.js] Fehler nach Login", e);
            setStatus("Login ok, aber Initialisierung fehlgeschlagen ❌");
        }
    });

    window.addEventListener("auth:logout", () => {
        if (characterGrid) characterGrid.innerHTML = "";
        if (emptyState) {
            emptyState.hidden = false;
            emptyState.textContent = "Bitte einloggen, um deine Charaktere zu sehen.";
        }
    });

    window.addEventListener("character:created", async () => {
        await renderCharacterCards();
    });

    window.addEventListener("character:deleted", async () => {
        await renderCharacterCards();
    });

    (async function startupIndex() {
        if (!API.token) {
            setLoggedInUI(false);
            applyRoleUI();
            setAdminVisible(false);
            renderDrawerTitle();

            if (emptyState) {
                emptyState.hidden = false;
                emptyState.textContent = "Bitte einloggen, um deine Charaktere zu sehen.";
            }

            setStatus("UI bereit ✅");
            return;
        }

        try {
            setLoggedInUI(true);
            await refreshCurrentUserAndUI();
            applyRoleUI();
            await loadCharacters();
            await renderCharacterCards();
        } catch (e) {
            console.error("[index.js] Startup fehlgeschlagen", e);

            if (e?.status === 401) {
                API.token = null;
                setLoggedInUI(false);
                setAdminVisible(false);
                setStatus("Token ungültig – bitte neu einloggen");
            } else {
                setStatus("Startup-Fehler – bitte Konsole prüfen");
            }
        }
    })();
})();