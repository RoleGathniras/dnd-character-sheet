import { API } from "./api.js";
import {
    loadCharacters,
    refreshCurrentUserAndUI,
    renderTopbarCharacterAvatar,
    setLoggedInUI,
} from "./app.js";

// ============================================================
// PLAYER RULES
// ============================================================

const PDF_FILE_PATH = "/assets/pdf/spielerhandbuch.pdf";
const PDF_PAGE_OFFSET = 0;

// ============================================================
// DATA
// ============================================================

const playerRulesData = [
    {
        id: "voelker",
        title: "Völker",
        entry: { title: "Völker", page: 1, file: "/assets/pdf/races.pdf" },
        topics: [
            { title: "Ein Volk auswählen", page: 1, file: "/assets/pdf/races.pdf" },
            { title: "Elfen", page: 2, file: "/assets/pdf/races.pdf" },
            { title: "Halblinge", page: 7, file: "/assets/pdf/races.pdf" },
            { title: "Menschen", page: 10, file: "/assets/pdf/races.pdf" },
            { title: "Zwerge", page: 13, file: "/assets/pdf/races.pdf" },
            { title: "Drachenblütige", page: 16, file: "/assets/pdf/races.pdf" },
            { title: "Gnome", page: 19, file: "/assets/pdf/races.pdf" },
            { title: "Halbelfen", page: 22, file: "/assets/pdf/races.pdf" },
            { title: "Halborks", page: 24, file: "/assets/pdf/races.pdf" },
            { title: "Tieflinge", page: 26, file: "/assets/pdf/races.pdf" }
        ]
    },
    {
        id: "klassen",
        title: "Klassen",
        entry: { title: "Klassen", page: 1, file: "/assets/pdf/classes.pdf" },
        topics: [
            { title: "Barbar", page: 2, file: "/assets/pdf/classes.pdf" },
            { title: "Barde", page: 7, file: "/assets/pdf/classes.pdf" },
            { title: "Druide", page: 12, file: "/assets/pdf/classes.pdf" },
            { title: "Hexenmeister", page: 18, file: "/assets/pdf/classes.pdf" },
            { title: "Kämpfer", page: 25, file: "/assets/pdf/classes.pdf" },
            { title: "Kleriker", page: 31, file: "/assets/pdf/classes.pdf" },
            { title: "Magier", page: 39, file: "/assets/pdf/classes.pdf" },
            { title: "Mönch", page: 47, file: "/assets/pdf/classes.pdf" },
            { title: "Paladin", page: 53, file: "/assets/pdf/classes.pdf" },
            { title: "Schurke", page: 60, file: "/assets/pdf/classes.pdf" },
            { title: "Waldläufer", page: 65, file: "/assets/pdf/classes.pdf" },
            { title: "Zauberer", page: 70, file: "/assets/pdf/classes.pdf" }
        ]
    },
    {
        id: "persoenlichkeit-und-hintergrund",
        title: "Persönlichkeit und Hintergrund",
        entry: {
            title: "Persönlichkeit und Hintergrund",
            page: 1,
            file: "/assets/pdf/backround.pdf"
        },
        topics: [
            { title: "Einzelheiten des Charakters", page: 1, file: "/assets/pdf/backround.pdf" },
            { title: "Inspiration", page: 5, file: "/assets/pdf/backround.pdf" },
            { title: "Hintergründe", page: 5, file: "/assets/pdf/backround.pdf" }
        ]
    },
    {
        id: "ausruestung",
        title: "Ausrüstung",
        entry: { title: "Ausrüstung", page: 1, file: "/assets/pdf/gear.pdf" },
        topics: [
            { title: "Anfangsausrüstung", page: 1, file: "/assets/pdf/gear.pdf" },
            { title: "Reichtümer", page: 1, file: "/assets/pdf/gear.pdf" },
            { title: "Rüstungen und Schilde", page: 2, file: "/assets/pdf/gear.pdf" },
            { title: "Waffen", page: 4, file: "/assets/pdf/gear.pdf" },
            { title: "Abenteurerausrüstung", page: 6, file: "/assets/pdf/gear.pdf" },
            { title: "Werkzeuge", page: 12, file: "/assets/pdf/gear.pdf" },
            { title: "Reittiere und Fahrzeuge", page: 13, file: "/assets/pdf/gear.pdf" },
            { title: "Handelsgüter", page: 15, file: "/assets/pdf/gear.pdf" },
            { title: "Ausgaben", page: 15, file: "/assets/pdf/gear.pdf" },
            { title: "Tand", page: 18, file: "/assets/pdf/gear.pdf" }
        ]
    },
    {
        id: "anpassungsmoeglichkeiten",
        title: "Anpassungsmöglichkeiten",
        entry: { title: "Anpassungsmöglichkeiten", page: 1, file: "/assets/pdf/customization.pdf" },
        topics: [
            { title: "Klassenkombinationen", page: 1, file: "/assets/pdf/customization.pdf" },
            { title: "Talente", page: 3, file: "/assets/pdf/customization.pdf" }
        ]
    },
    {
        id: "attributswerte-verwenden",
        title: "Attributswerte verwenden",
        entry: { title: "Attributswerte verwenden", page: 1, file: "/assets/pdf/attributes.pdf" },
        topics: [
            { title: "Attributswerte und Modifikatoren", page: 1, file: "/assets/pdf/attributes.pdf" },
            { title: "Vorteil und Nachteil", page: 1, file: "/assets/pdf/attributes.pdf" },
            { title: "Übungsbonus", page: 1, file: "/assets/pdf/attributes.pdf" },
            { title: "Attributswürfe", page: 2, file: "/assets/pdf/attributes.pdf" },
            { title: "Einzelne Attributswerte anwenden", page: 3, file: "/assets/pdf/attributes.pdf" },
            { title: "Rettungswürfe", page: 7, file: "/assets/pdf/attributes.pdf" }
        ]
    },
    {
        id: "auf-abenteuer-ausziehen",
        title: "Auf Abenteuer ausziehen",
        entry: { title: "Auf Abenteuer ausziehen", page: 1, file: "/assets/pdf/adventures.pdf" },
        topics: [
            { title: "Zeit", page: 1, file: "/assets/pdf/adventures.pdf" },
            { title: "Bewegung", page: 1, file: "/assets/pdf/adventures.pdf" },
            { title: "Die Umgebung", page: 3, file: "/assets/pdf/adventures.pdf" },
            { title: "Soziale Interaktion", page: 5, file: "/assets/pdf/adventures.pdf" },
            { title: "Rasten", page: 6, file: "/assets/pdf/adventures.pdf" },
            { title: "Zwischen den Abenteuern", page: 6, file: "/assets/pdf/adventures.pdf" }
        ]
    },
    {
        id: "kampf",
        title: "Kampf",
        entry: { title: "Kampf", page: 1, file: "/assets/pdf/fight.pdf" },
        topics: [
            { title: "Der Kampfablauf", page: 1, file: "/assets/pdf/fight.pdf" },
            { title: "Bewegung und Positionierung", page: 2, file: "/assets/pdf/fight.pdf" },
            { title: "Aktionen im Kampf", page: 4, file: "/assets/pdf/fight.pdf" },
            { title: "Einen Angriff ausführen", page: 5, file: "/assets/pdf/fight.pdf" },
            { title: "Deckung", page: 8, file: "/assets/pdf/fight.pdf" },
            { title: "Schaden und Heilung", page: 8, file: "/assets/pdf/fight.pdf" },
            { title: "Berittener Kampf", page: 10, file: "/assets/pdf/fight.pdf" },
            { title: "Unterwasserkampf", page: 10, file: "/assets/pdf/fight.pdf" }
        ]
    },
    {
        id: "zauber-wirken",
        title: "Zauber wirken",
        entry: { title: "Zauber wirken", page: 1, file: "/assets/pdf/usemagic.pdf" },
        topics: [
            { title: "Was ist ein Zauber?", page: 1, file: "/assets/pdf/usemagic.pdf" },
            { title: "Einen Zauber wirken", page: 2, file: "/assets/pdf/usemagic.pdf" }
        ]
    },
    {
        id: "zauber",
        title: "Zauber",
        entry: { title: "Zauber", page: 1, file: "/assets/pdf/spelllist.pdf" },
        topics: [
            { title: "Zauberliste des Barden", page: 1, file: "/assets/pdf/spelllist.pdf" },
            { title: "Zauberliste des Klerikers", page: 1, file: "/assets/pdf/spelllist.pdf" },
            { title: "Zauberliste des Druiden", page: 2, file: "/assets/pdf/spelllist.pdf" },
            { title: "Zauberliste des Paladins", page: 2, file: "/assets/pdf/spelllist.pdf" },
            { title: "Zauberliste des Waldläufers", page: 3, file: "/assets/pdf/spelllist.pdf" },
            { title: "Zauberliste des Zauberers", page: 3, file: "/assets/pdf/spelllist.pdf" },
            { title: "Zauberliste des Hexenmeisters", page: 4, file: "/assets/pdf/spelllist.pdf" },
            { title: "Zauberliste des Magiers", page: 4, file: "/assets/pdf/spelllist.pdf" },

            { title: "Zauberbeschreibung A - E", page: 1, file: "/assets/pdf/spelldescriptions_a_e.pdf" },
            { title: "Zauberbeschreibung F - I", page: 1, file: "/assets/pdf/spelldescriptions_f_i.pdf" },
            { title: "Zauberbeschreibung K - P", page: 1, file: "/assets/pdf/spelldescriptions_k_p.pdf" },
            { title: "Zauberbeschreibung R - S", page: 1, file: "/assets/pdf/spelldescriptions_r_s.pdf" },
            { title: "Zauberbeschreibung T - Z", page: 1, file: "/assets/pdf/spelldescriptions_t_z.pdf" }
        ]
    },
    {
        id: "zustaende",
        title: "Zustände",
        entry: { title: "Zustände", page: 1, file: "/assets/pdf/states.pdf" },
        topics: []
    },
    {
        id: "goetter-des-multiversums",
        title: "Götter des Multiversums",
        entry: { title: "Götter des Multiversums", page: 1, file: "/assets/pdf/gods.pdf" },
        topics: []
    },
    {
        id: "die-existenzebenen",
        title: "Die Existenzebenen",
        entry: { title: "Die Existenzebenen", page: 1, file: "/assets/pdf/planes.pdf" },
        topics: [
            { title: "Die Materielle Ebene", page: 1, file: "/assets/pdf/planes.pdf" },
            { title: "Jenseits der Materiellen Ebene", page: 2, file: "/assets/pdf/planes.pdf" }
        ]
    },
    {
        id: "kreaturenspielwerte",
        title: "Kreaturenspielwerte",
        entry: { title: "Kreaturenspielwerte", page: 1, file: "/assets/pdf/creatures.pdf" },
        topics: []
    }
];

// ============================================================
// HELPERS
// ============================================================

function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
}

function getSectionTitle(sectionElement) {
    const titleElement = sectionElement.querySelector(".ruleSection__title");
    return normalizeText(titleElement?.textContent);
}

function openRuleEntry(entry) {
    if (!entry || typeof entry.page !== "number") {
        alert(`Für "${entry?.title || "diesen Eintrag"}" ist noch keine PDF-Seite hinterlegt.`);
        return;
    }

    const filePath = entry.file || PDF_FILE_PATH;

    const viewerUrl =
        `/rule_viewer.html?file=${encodeURIComponent(filePath)}&page=${encodeURIComponent(entry.page)}&title=${encodeURIComponent(entry.title)}`;

    window.location.href = viewerUrl;
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
    button.addEventListener("click", () => openRuleEntry(entry));
}

function bindTopicButtons(container, topics) {
    if (!container) return;

    const topicButtons = Array.from(container.querySelectorAll(".ruleTopicButton"));

    topicButtons.forEach((button, index) => {
        const topic = topics[index];
        if (!topic) return;

        setButtonLabel(button, topic);
        button.addEventListener("click", () => openRuleEntry(topic));
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

function buildRulesNav() {
    const navList = document.getElementById("navList");
    if (!navList) return;

    navList.innerHTML = "";

    const sections = Array.from(document.querySelectorAll(".ruleSection"));

    sections.forEach((section) => {
        const label =
            section.dataset.navLabel ||
            section.querySelector(".ruleSection__title")?.textContent?.trim() ||
            "Abschnitt";

        const id = section.id;
        if (!id) return;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "drawer__item";
        button.textContent = label;

        button.addEventListener("click", () => {
            const target = document.getElementById(id);
            if (!target) return;

            target.scrollIntoView({ behavior: "smooth", block: "start" });

            const navDrawer = document.getElementById("navDrawer");
            const navBackdrop = document.getElementById("navBackdrop");

            navDrawer?.classList.remove("is-open");
            navDrawer?.setAttribute("aria-hidden", "true");
            if (navBackdrop) navBackdrop.hidden = true;
        });

        navList.appendChild(button);
    });
}

async function loadCurrentCharacterAvatar() {
    const selectedId =
        localStorage.getItem("dnd_current_character_id") ||
        localStorage.getItem("selectedCharacterId");

    if (!selectedId) {
        renderTopbarCharacterAvatar(null);
        return;
    }

    try {
        const character = await API.getCharacter(Number(selectedId));
        renderTopbarCharacterAvatar(character);
    } catch (error) {
        console.warn("[player_rules.js] Charakterbild konnte nicht geladen werden.", error);
        renderTopbarCharacterAvatar(null);
    }
}

// ============================================================
// INIT
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
    const sectionElements = Array.from(document.querySelectorAll(".ruleSection"));

    const dataByTitle = new Map(
        playerRulesData.map(section => [normalizeText(section.title), section])
    );

    sectionElements.forEach((sectionElement) => {
        const sectionTitle = getSectionTitle(sectionElement);
        const sectionData = dataByTitle.get(sectionTitle);

        if (!sectionData) {
            console.warn(`Keine Daten für Section gefunden: "${sectionTitle}"`, sectionElement);
            return;
        }

        bindSection(sectionElement, sectionData);
    });

    buildRulesNav();

    const isLoggedIn = !!API.token;
    setLoggedInUI(isLoggedIn);

    if (isLoggedIn) {
        try {
            await refreshCurrentUserAndUI();
            await loadCharacters();
        } catch (error) {
            console.warn("[player_rules.js] User/Drawer konnte nicht geladen werden.", error);
        }

        await loadCurrentCharacterAvatar();
    } else {
        renderTopbarCharacterAvatar(null);
    }
});