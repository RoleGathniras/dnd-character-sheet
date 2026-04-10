// ============================================================
// PLAYER RULES
// ============================================================

const PDF_FILE_PATH = "/assets/pdf/spielerhandbuch.pdf";
const PDF_PAGE_OFFSET = 1;

// ============================================================
// DATA
// - page = Buchseite
// - PDF-Seite wird automatisch mit Offset berechnet
// ============================================================

const playerRulesData = [
    {
        id: "einleitung",
        title: "Einleitung",
        entry: {
            title: "Einleitung",
            page: 5
        },
        topics: [
            { title: "Abenteuerwelten", page: 5 },
            { title: "Wie man dieses Buch verwendet", page: 6 },
            { title: "Wie man spielt", page: 6 },
            { title: "Abenteuer", page: 7 }
        ]
    },

    {
        id: "teil-1",
        title: "Teil 1: Charaktere Schritt für Schritt",
        entry: {
            title: "Teil 1: Charaktere Schritt für Schritt"
        },
        topics: [
            { title: "Kapitel 1: Charaktere Schritt für Schritt" },
            { title: "Kapitel 2: Völker" },
            { title: "Kapitel 3: Klassen" },
            { title: "Kapitel 4: Persönlichkeit und Hintergrund" },
            { title: "Kapitel 5: Ausrüstung" },
            { title: "Kapitel 6: Anpassungsmöglichkeiten" }
        ]
    },

    {
        id: "kapitel-1",
        title: "Kapitel 1: Charaktere Schritt für Schritt",
        entry: {
            title: "Kapitel 1: Charaktere Schritt für Schritt"
        },
        topics: [
            { title: "einen Charakter 1. Stufe" }
        ]
    },

    {
        id: "kapitel-2",
        title: "Kapitel 2: Völker",
        entry: {
            title: "Kapitel 2: Völker"
        },
        topics: [
            { title: "Ein Volk auswählen" },
            { title: "Elf" },
            { title: "Halblinge" },
            { title: "Menschen" },
            { title: "Zwerge" },
            { title: "Drachenblütige" },
            { title: "Gnome" },
            { title: "Halbelfen" },
            { title: "Halborks" },
            { title: "Tieflinge" }
        ]
    },

    {
        id: "kapitel-3",
        title: "Kapitel 3: Klassen",
        entry: {
            title: "Kapitel 3: Klassen"
        },
        topics: [
            { title: "Barbar" },
            { title: "Barde" },
            { title: "Druide" },
            { title: "Hexenmeister" },
            { title: "Kämpfer" },
            { title: "Kleriker" },
            { title: "Magier" },
            { title: "Mönch" },
            { title: "Paladin" },
            { title: "Schurke" },
            { title: "Waldläufer" },
            { title: "Zauberer" }
        ]
    },

    {
        id: "kapitel-4",
        title: "Kapitel 4: Persönlichkeit und Hintergrund",
        entry: {
            title: "Kapitel 4: Persönlichkeit und Hintergrund"
        },
        topics: [
            { title: "Einzelheiten des Charakters" },
            { title: "Inspiration" },
            { title: "Hintergründe" }
        ]
    },

    {
        id: "kapitel-5",
        title: "Kapitel 5: Ausrüstung",
        entry: {
            title: "Kapitel 5: Ausrüstung"
        },
        topics: [
            { title: "Anfangsausrüstung" },
            { title: "Reichtümer" },
            { title: "Rüstungen und Schilde" },
            { title: "Waffen" },
            { title: "Abenteurerausrüstung" },
            { title: "Werkzeuge" },
            { title: "Reittiere und Fahrzeuge" },
            { title: "Handelsgüter" },
            { title: "Ausgaben" },
            { title: "Tand" }
        ]
    },

    {
        id: "kapitel-6",
        title: "Kapitel 6: Anpassungsmöglichkeiten",
        entry: {
            title: "Kapitel 6: Anpassungsmöglichkeiten"
        },
        topics: [
            { title: "Klassenkombinationen" },
            { title: "Talente" }
        ]
    },

    {
        id: "teil-2",
        title: "Teil 2: Abenteuer",
        entry: {
            title: "Teil 2: Abenteuer"
        },
        topics: [
            { title: "Kapitel 7: Attributswerte verwenden" },
            { title: "Kapitel 8: Auf Abenteuer ausziehen" },
            { title: "Kapitel 9: Kampf" }
        ]
    },

    {
        id: "kapitel-7",
        title: "Kapitel 7: Attributswerte verwenden",
        entry: {
            title: "Kapitel 7: Attributswerte verwenden"
        },
        topics: [
            { title: "Attributswerte und Modifikatoren" },
            { title: "Vorteil und Nachteil" },
            { title: "Übungsbonus" },
            { title: "Attributswürfe" },
            { title: "Einzelne Attributswerte anwenden" },
            { title: "Rettungswürfe" }
        ]
    },

    {
        id: "kapitel-8",
        title: "Kapitel 8: Auf Abenteuer ausziehen",
        entry: {
            title: "Kapitel 8: Auf Abenteuer ausziehen"
        },
        topics: [
            { title: "Zeit" },
            { title: "Bewegung" },
            { title: "Die Umgebung" },
            { title: "Soziale Interaktion" },
            { title: "Rasten" },
            { title: "Verschiedene Abenteuern" }
        ]
    },

    {
        id: "kapitel-9",
        title: "Kapitel 9: Kampf",
        entry: {
            title: "Kapitel 9: Kampf"
        },
        topics: [
            { title: "Der Kampfablauf" },
            { title: "Bewegung und Positionierung" },
            { title: "Aktionen im Kampf" },
            { title: "Einen Angriff ausführen" },
            { title: "Deckung" },
            { title: "Schaden und Heilung" },
            { title: "Berittener Kampf" },
            { title: "Unterwasserkampf" }
        ]
    },

    {
        id: "teil-3",
        title: "Teil 3: Magie",
        entry: {
            title: "Teil 3: Magie"
        },
        topics: [
            { title: "Kapitel 10: Zauber wirken" },
            { title: "Kapitel 11: Zauber" }
        ]
    },

    {
        id: "kapitel-10",
        title: "Kapitel 10: Zauber wirken",
        entry: {
            title: "Kapitel 10: Zauber wirken"
        },
        topics: [
            { title: "Was ist ein Zauber?" },
            { title: "Einen Zauber wirken" }
        ]
    },

    {
        id: "kapitel-11",
        title: "Kapitel 11: Zauber",
        entry: {
            title: "Kapitel 11: Zauber"
        },
        topics: [
            { title: "Zauberlisten" },
            { title: "Zauberbeschreibungen" }
        ]
    },

    {
        id: "anhang-a",
        title: "Anhang A: Zustände",
        entry: {
            title: "Anhang A: Zustände"
        },
        topics: []
    },

    {
        id: "anhang-b",
        title: "Anhang B: Götter des Multiversums",
        entry: {
            title: "Anhang B: Götter des Multiversums"
        },
        topics: []
    },

    {
        id: "anhang-c",
        title: "Anhang C: Die Existenzebenen",
        entry: {
            title: "Anhang C: Die Existenzebenen"
        },
        topics: [
            { title: "Die Materielle Ebene" },
            { title: "Jenseits der Materiellen Ebene" }
        ]
    },

    {
        id: "anhang-d",
        title: "Anhang D: Kreaturenspielwerte",
        entry: {
            title: "Anhang D: Kreaturenspielwerte"
        },
        topics: []
    },

    {
        id: "anhang-e",
        title: "Anhang E: Lektüre zur Inspiration",
        entry: {
            title: "Anhang E: Lektüre zur Inspiration"
        },
        topics: []
    },

    {
        id: "index",
        title: "Index",
        entry: {
            title: "Index"
        },
        topics: []
    },

    {
        id: "charakterblatt",
        title: "Charakterblatt",
        entry: {
            title: "Charakterblatt"
        },
        topics: []
    }
];

// ============================================================
// HELPERS
// ============================================================

function openRuleEntry(entry) {
    if (!entry || typeof entry.page !== "number") {
        alert(`Für "${entry?.title || "diesen Eintrag"}" ist noch keine PDF-Seite hinterlegt.`);
        return;
    }

    const pdfPage = entry.page + PDF_PAGE_OFFSET;
    const pdfUrl = `${PDF_FILE_PATH}#page=${pdfPage}`;

    window.open(pdfUrl, "_blank", "noopener");
}

function setButtonLabel(button, entry) {
    if (!button || !entry) return;

    button.textContent = entry.title;

    if (typeof entry.page === "number") {
        button.title = `Buchseite ${entry.page} · PDF-Seite ${entry.page + PDF_PAGE_OFFSET}`;
    } else {
        button.title = "Noch keine PDF-Seite hinterlegt";
    }
}

function bindEntryButton(button, entry) {
    if (!button || !entry) return;

    setButtonLabel(button, entry);

    button.addEventListener("click", () => {
        openRuleEntry(entry);
    });
}

function bindTopicButtons(container, topics) {
    if (!container) return;

    const topicButtons = Array.from(container.querySelectorAll(".ruleTopicButton"));

    topicButtons.forEach((button, index) => {
        const topic = topics[index];
        if (!topic) return;

        setButtonLabel(button, topic);

        button.addEventListener("click", () => {
            openRuleEntry(topic);
        });
    });
}

function bindSection(sectionElement, sectionData) {
    if (!sectionElement || !sectionData) return;

    const toggle = sectionElement.querySelector(".ruleSection__toggle");
    const body = sectionElement.querySelector(".ruleSection__body");
    const entryButton = sectionElement.querySelector(".ruleEntryButton");
    const topicList = sectionElement.querySelector(".ruleTopicList");

    if (toggle && body) {
        toggle.addEventListener("click", () => {
            const isOpen = sectionElement.classList.toggle("is-open");
            body.hidden = !isOpen;
            toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        });
    }

    bindEntryButton(entryButton, sectionData.entry);
    bindTopicButtons(topicList, sectionData.topics || []);
}

// ============================================================
// INIT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    const sectionElements = Array.from(document.querySelectorAll(".ruleSection"));

    sectionElements.forEach((sectionElement, index) => {
        const sectionData = playerRulesData[index];
        bindSection(sectionElement, sectionData);
    });
});