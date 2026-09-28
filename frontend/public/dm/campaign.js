import { API } from "../api.js";

const campaignName = document.getElementById("campaign-name");
const characterList = document.getElementById("campaign-characters");
const params = new URLSearchParams(window.location.search);
const campaignId = Number(params.get("id"));
const showAddButton = document.getElementById("show-add-character-button");
const addCharacterArea = document.getElementById("add-character-area");
const availableCharacters = document.getElementById("available-characters");
const cancelAddButton = document.getElementById("cancel-add-character-button");


async function loadAvailableCharacters() {
    try {
        const [characters, campaign] = await Promise.all([
            API.characters(),
            API.getCampaign(campaignId),
        ]);

        const assignedIds = new Set(
            campaign.characters.map((character) => character.id),
        );

        const available = characters.filter(
            (character) =>
                character.kind === "pc" &&
                !assignedIds.has(character.id),
        );

        availableCharacters.innerHTML = "";

        if (available.length === 0) {
            availableCharacters.innerHTML =
                "<p>Keine weiteren Spielercharaktere verfügbar.</p>";
            return;
        }

        for (const character of available) {
            const characterElement = document.createElement("div");

            characterElement.innerHTML = `
                <strong>${character.name}</strong>
                <span>${character.owner_username ?? "Kein Besitzer"}</span>

                <button type="button">
                    Hinzufügen
                </button>
            `;

            const addButton = characterElement.querySelector("button");

            addButton.addEventListener("click", async () => {
                try {
                    await API.addCharacterToCampaign(
                        campaignId,
                        character.id,
                    );

                    await loadCampaign();
                    await loadAvailableCharacters();
                } catch (error) {
                    console.error(error);
                    alert(
                        `Charakter konnte nicht hinzugefügt werden: ${error.message}`,
                    );
                }
            });

            availableCharacters.appendChild(characterElement);
        }
    } catch (error) {
        console.error(error);

        availableCharacters.innerHTML =
            `<p>Charaktere konnten nicht geladen werden: ${error.message}</p>`;
    }
}

showAddButton.addEventListener("click", async () => {
    addCharacterArea.hidden = false;
    showAddButton.hidden = true;

    await loadAvailableCharacters();
});

cancelAddButton.addEventListener("click", () => {
    addCharacterArea.hidden = true;
    showAddButton.hidden = false;
});

async function loadCampaign() {
    if (!campaignId) {
        campaignName.textContent = "Ungültige Kampagne";
        characterList.innerHTML = "<p>Keine Kampagne ausgewählt.</p>";
        return;
    }

    try {
        const campaign = await API.getCampaign(campaignId);

        campaignName.textContent = campaign.name;
        characterList.innerHTML = "";

        if (campaign.characters.length === 0) {
            characterList.innerHTML =
                "<p>Noch keine Spielercharaktere zugeordnet.</p>";
            return;
        }

        for (const character of campaign.characters) {
            const characterElement = document.createElement("div");

            characterElement.innerHTML = `
                <strong>${character.name}</strong>
                <span>${character.owner_username ?? "Kein Besitzer"}</span>

                <button
                    type="button"
                    class="remove-character-button"
                    data-character-id="${character.id}"
                >
                    Entfernen
                </button>
            `;
            const removeButton = characterElement.querySelector(
                ".remove-character-button",
            );

            removeButton.addEventListener("click", async () => {
                try {
                    await API.removeCharacterFromCampaign(
                        campaignId,
                        character.id,
                    );

                    await loadCampaign();
                } catch (error) {
                    console.error(error);
                    alert(`Charakter konnte nicht entfernt werden: ${error.message}`);
                }
            });

            characterList.appendChild(characterElement);
        }
    } catch (error) {
        console.error(error);

        campaignName.textContent = "Kampagne konnte nicht geladen werden";
        characterList.innerHTML = `<p>${error.message}</p>`;
    }
}

loadCampaign();