import { API } from "/api.js";
import {
    campaignId,
    initDmNavigation,
    initDmNavDrawer,
    initDmMainDrawer,
    initDmMainNavigation,
} from "./dm-nav.js";

const status = document.getElementById("playersStatus");
const list = document.getElementById("campaignCharacters");
const select = document.getElementById("characterSelect");
const addButton = document.getElementById("btnAddCharacter");
const form = document.getElementById("addCharacterForm");

let busy = false;
let availableCount = 0;

function setBusy(value) {
    busy = value;
    select.disabled = value || availableCount === 0;
    addButton.disabled = value || availableCount === 0;

    list.querySelectorAll("button").forEach(button => {
        button.disabled = value;
    });
}

function renderCharacters(campaign, characters) {
    document.getElementById("appbarCampaignName").textContent =
        campaign.name;

    list.replaceChildren();
    select.replaceChildren(new Option("Bitte auswählen", ""));

    const assignedIds = new Set(
        campaign.characters.map(character => Number(character.id)),
    );

    const available = characters.filter(character =>
        character.kind === "pc" &&
        !assignedIds.has(Number(character.id)),
    );

    availableCount = available.length;

    for (const character of available) {
        const owner = character.owner_username
            ? ` · ${character.owner_username}`
            : "";

        select.add(new Option(
            `${character.name}${owner} · ID ${character.id}`,
            String(character.id),
        ));
    }

    if (campaign.characters.length === 0) {
        const empty = document.createElement("p");
        empty.textContent = "Noch keine Charaktere zugeordnet.";
        list.appendChild(empty);
    }

    for (const character of campaign.characters) {
        const row = document.createElement("div");
        const name = document.createElement("p");
        const removeButton = document.createElement("button");

        const owner = character.owner_username
            ? ` · ${character.owner_username}`
            : "";

        name.textContent =
            `${character.name}${owner} · ID ${character.id}`;

        removeButton.type = "button";
        removeButton.className = "btn btn--danger";
        removeButton.textContent = "Aus Kampagne entfernen";

        removeButton.addEventListener("click", () => {
            if (busy) return;

            if (!confirm(
                `${character.name} aus dieser Kampagne entfernen? ` +
                "Charakter und Inventar bleiben erhalten.",
            )) return;

            void changeAssignment(
                () => API.removeCharacterFromCampaign(
                    campaignId,
                    character.id,
                ),
                "Charakter aus der Kampagne entfernt.",
            );
        });

        row.append(name, removeButton);
        list.appendChild(row);
    }
}

async function refreshCharacters() {
    const [campaign, characters] = await Promise.all([
        API.getCampaign(campaignId),
        API.characters(),
    ]);

    renderCharacters(campaign, characters);
}

async function changeAssignment(request, successMessage) {
    if (busy) return;
    setBusy(true);

    try {
        await request();
    } catch (error) {
        console.error(error);
        status.textContent =
            error?.message || "Zuordnung konnte nicht geändert werden.";
        setBusy(false);
        return;
    }

    try {
        await refreshCharacters();
        status.textContent = successMessage;
    } catch (error) {
        console.error(error);
        status.textContent =
            "Änderung gespeichert, aber die Anzeige konnte nicht " +
            "aktualisiert werden. Bitte Seite neu laden.";
    } finally {
        setBusy(false);
    }
}

form.addEventListener("submit", event => {
    event.preventDefault();

    const characterId = Number(select.value);
    if (!characterId || busy) return;

    void changeAssignment(
        () => API.addCharacterToCampaign(campaignId, characterId),
        "Charakter zur Kampagne hinzugefügt.",
    );
});

async function startup() {
    initDmMainDrawer();
    initDmNavDrawer();
    initDmNavigation();
    initDmMainNavigation();
    setBusy(true);

    if (!API.token) {
        window.location.href = "/index.html";
        return;
    }

    if (!Number.isInteger(campaignId) || campaignId <= 0) {
        status.textContent =
            "Keine gültige Kampagne ausgewählt. " +
            "Bitte über die Kampagnenauswahl öffnen.";
        return;
    }

    try {
        await refreshCharacters();
        status.textContent = "Spielerverwaltung bereit.";
        setBusy(false);
    } catch (error) {
        console.error(error);
        status.textContent =
            error?.message || "Spielerverwaltung konnte nicht geladen werden.";
    }
}

void startup();