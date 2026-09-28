import { API } from "../api.js";

const createButton = document.getElementById("create-campaign-button");
const createForm = document.getElementById("create-campaign-form");
const nameInput = document.getElementById("campaign-name");
const characterList = document.getElementById("campaign-character-list");
const saveButton = document.getElementById("save-campaign-button");
const cancelButton = document.getElementById("cancel-campaign-button");
const errorElement = document.getElementById("create-campaign-error");


async function loadCampaigns() {
    const campaignList = document.getElementById("campaign-list");

    try {
        const campaigns = await API.listCampaigns();

        campaignList.innerHTML = "";

        if (campaigns.length === 0) {
            campaignList.innerHTML = "<p>Noch keine Kampagnen vorhanden.</p>";
            return;
        }

        for (const campaign of campaigns) {
            const campaignElement = document.createElement("div");

            campaignElement.innerHTML = `
                <h2>
                    <a href="campaign.html?id=${campaign.id}">
                        ${campaign.name}
                    </a>
                </h2>
                <p>${campaign.characters.length} Spielercharaktere</p>
            `;

            campaignList.appendChild(campaignElement);
        }
    } catch (error) {
        console.error(error);

        campaignList.innerHTML = `
            <p>Kampagnen konnten nicht geladen werden: ${error.message}</p>
        `;
    }
}

async function loadAvailableCharacters() {
    try {
        const characters = await API.characters();

        const playerCharacters = characters.filter(
            (character) => character.kind === "pc",
        );

        characterList.innerHTML = "";

        if (playerCharacters.length === 0) {
            characterList.innerHTML =
                "<p>Keine Spielercharaktere vorhanden.</p>";
            return;
        }

        for (const character of playerCharacters) {
            const label = document.createElement("label");

            label.innerHTML = `
                <input
                    type="checkbox"
                    name="campaign-character"
                    value="${character.id}"
                >
                ${character.name}
                (${character.owner_username ?? "Kein Besitzer"})
            `;

            characterList.appendChild(label);
            characterList.appendChild(document.createElement("br"));
        }
    } catch (error) {
        console.error(error);
        characterList.innerHTML =
            `<p>Charaktere konnten nicht geladen werden: ${error.message}</p>`;
    }
}

createButton.addEventListener("click", async () => {
    createForm.hidden = false;
    createButton.hidden = true;

    await loadAvailableCharacters();

    nameInput.focus();
});

cancelButton.addEventListener("click", () => {
    createForm.hidden = true;
    createButton.hidden = false;
    nameInput.value = "";
    errorElement.textContent = "";
});

saveButton.addEventListener("click", async () => {
    const name = nameInput.value.trim();

    if (!name) {
        errorElement.textContent = "Bitte einen Kampagnennamen eingeben.";
        return;
    }

    try {
        const selectedCharacters = document.querySelectorAll(
            'input[name="campaign-character"]:checked',
        );

        const characterIds = Array.from(selectedCharacters).map(
            (checkbox) => Number(checkbox.value),
        );

        await API.createCampaign({
            name,
            character_ids: characterIds,
        });

        nameInput.value = "";
        errorElement.textContent = "";

        createForm.hidden = true;
        createButton.hidden = false;

        await loadCampaigns();
    } catch (error) {
        console.error(error);
        errorElement.textContent = error.message;
    }
});

loadCampaigns();