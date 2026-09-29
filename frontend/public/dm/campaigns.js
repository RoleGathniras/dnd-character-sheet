import { API } from "../api.js";
import {
  initDmMainDrawer,
  initDmMainNavigation,
} from "./dm-nav.js";

const createButton = document.getElementById("create-campaign-button");
const createForm = document.getElementById("create-campaign-form");
const nameInput = document.getElementById("campaign-name");
const characterList = document.getElementById("campaign-character-list");
const saveButton = document.getElementById("save-campaign-button");
const cancelButton = document.getElementById("cancel-campaign-button");
const errorElement = document.getElementById("create-campaign-error");

const editCampaignForm = document.getElementById("edit-campaign-form");
const editCampaignName = document.getElementById("edit-campaign-name");
const editCampaignImageInput = document.getElementById("edit-campaign-image");
const editCampaignImagePreview = document.getElementById("edit-campaign-image-preview");
const editCampaignImagePreviewImg = document.getElementById("edit-campaign-image-preview-img");
const saveEditCampaignButton = document.getElementById("save-edit-campaign-button");
const cancelEditCampaignButton = document.getElementById("cancel-edit-campaign-button");
const editCampaignError = document.getElementById("edit-campaign-error");

let editingCampaignId = null;
let editCampaignImageDataUrl = null;

const campaignImageInput = document.getElementById("campaign-image");
const campaignImagePreview = document.getElementById("campaign-image-preview");
const campaignImagePreviewImg = document.getElementById("campaign-image-preview-img");

let campaignImageDataUrl = null;
initDmMainDrawer();
initDmMainNavigation();

function resizeCampaignImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      const image = new Image();

      image.addEventListener("load", () => {
        const maxWidth = 1200;
        const maxHeight = 800;

        let width = image.width;
        let height = image.height;

        const scale = Math.min(
          maxWidth / width,
          maxHeight / height,
          1
        );

        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Bild konnte nicht verarbeitet werden."));
          return;
        }

        context.drawImage(image, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve(dataUrl);
      });

      image.addEventListener("error", () => {
        reject(new Error("Bild konnte nicht geladen werden."));
      });

      image.src = reader.result;
    });

    reader.addEventListener("error", () => {
      reject(new Error("Datei konnte nicht gelesen werden."));
    });

    reader.readAsDataURL(file);
  });
}
cancelEditCampaignButton.addEventListener("click", () => {
  editingCampaignId = null;
  editCampaignImageDataUrl = null;

  editCampaignName.value = "";
  editCampaignImageInput.value = "";
  editCampaignImagePreviewImg.removeAttribute("src");
  editCampaignImagePreview.hidden = true;
  editCampaignError.textContent = "";

  editCampaignForm.hidden = true;
});

campaignImageInput.addEventListener("change", async () => {
  const file = campaignImageInput.files[0];

  if (!file) {
    campaignImageDataUrl = null;
    campaignImagePreviewImg.removeAttribute("src");
    campaignImagePreview.hidden = true;
    return;
  }

  if (!file.type.startsWith("image/")) {
    campaignImageInput.value = "";
    campaignImageDataUrl = null;
    campaignImagePreviewImg.removeAttribute("src");
    campaignImagePreview.hidden = true;
    return;
  }

  try {
    campaignImageDataUrl = await resizeCampaignImage(file);

    campaignImagePreviewImg.src = campaignImageDataUrl;
    campaignImagePreview.hidden = false;
  } catch (error) {
    console.error(error);

    campaignImageInput.value = "";
    campaignImageDataUrl = null;
    campaignImagePreviewImg.removeAttribute("src");
    campaignImagePreview.hidden = true;
  }
});
editCampaignImageInput.addEventListener("change", async () => {
  const file = editCampaignImageInput.files[0];

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    editCampaignImageInput.value = "";
    return;
  }

  try {
    editCampaignImageDataUrl = await resizeCampaignImage(file);

    editCampaignImagePreviewImg.src = editCampaignImageDataUrl;
    editCampaignImagePreview.hidden = false;
  } catch (error) {
    console.error(error);

    editCampaignImageInput.value = "";
    editCampaignError.textContent = "Das Bild konnte nicht verarbeitet werden.";
  }
});
saveEditCampaignButton.addEventListener("click", async () => {
  const name = editCampaignName.value.trim();

  editCampaignError.textContent = "";

  if (!name) {
    editCampaignError.textContent = "Bitte gib einen Namen für die Kampagne ein.";
    return;
  }

  if (!editingCampaignId) {
    editCampaignError.textContent = "Die Kampagne konnte nicht gefunden werden.";
    return;
  }

  try {
    await API.updateCampaign(editingCampaignId, {
      name,
      image_data_url: editCampaignImageDataUrl,
    });

    editingCampaignId = null;
    editCampaignImageDataUrl = null;

    editCampaignName.value = "";
    editCampaignImageInput.value = "";
    editCampaignImagePreviewImg.removeAttribute("src");
    editCampaignImagePreview.hidden = true;
    editCampaignError.textContent = "";

    editCampaignForm.hidden = true;

    await loadCampaigns();
  } catch (error) {
    console.error(error);
    editCampaignError.textContent = "Die Kampagne konnte nicht gespeichert werden.";
  }
});

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
      const card = document.createElement("article");
      card.className = "dm-campaign-card";

      const imageWrapper = document.createElement("div");
      imageWrapper.className = "dm-campaign-card__image";

      if (campaign.image_data_url) {
        const image = document.createElement("img");
        image.src = campaign.image_data_url;
        image.alt = "";
        imageWrapper.appendChild(image);
      } else {
        const placeholder = document.createElement("span");
        placeholder.className = "dm-campaign-card__placeholder";
        placeholder.textContent = campaign.name.charAt(0).toUpperCase();
        imageWrapper.appendChild(placeholder);
      }

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "dm-campaign-card__edit";
      editButton.setAttribute("aria-label", `${campaign.name} bearbeiten`);

      editButton.addEventListener("click", () => {
        editingCampaignId = campaign.id;
        editCampaignImageDataUrl = campaign.image_data_url ?? null;

        editCampaignName.value = campaign.name;
        editCampaignImageInput.value = "";
        editCampaignError.textContent = "";

        if (editCampaignImageDataUrl) {
          editCampaignImagePreviewImg.src = editCampaignImageDataUrl;
          card.after(editCampaignForm);
          editCampaignImagePreview.hidden = false;
        } else {
          editCampaignImagePreviewImg.removeAttribute("src");
          editCampaignImagePreview.hidden = true;
        }

        editCampaignForm.hidden = false;
      });

      editButton.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 20h9"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
          <path
            d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
          />
        </svg>
      `;

      imageWrapper.appendChild(editButton);

      const content = document.createElement("div");
      content.className = "dm-campaign-card__content";

      const title = document.createElement("h2");
      title.textContent = campaign.name;

      const details = document.createElement("div");
      details.className = "dm-campaign-card__details";

      const players = document.createElement("span");
      players.textContent = `${campaign.characters.length} Spieler`;

      const session = document.createElement("span");
      session.textContent = `Sitzung ${campaign.session_number ?? 0}`;

      const level = document.createElement("span");

      if (campaign.level_min && campaign.level_max) {
        level.textContent = `Level ${campaign.level_min}–${campaign.level_max}`;
      } else {
        level.textContent = "Level –";
      }

      const ingameDays = document.createElement("span");
      ingameDays.textContent = `${campaign.ingame_days ?? 0} Ingame-Tage`;

      details.append(players, session, level, ingameDays);

      const openLink = document.createElement("a");
      openLink.className = "btn dm-campaign-card__open";
      openLink.href = `campaign.html?id=${campaign.id}`;
      openLink.textContent = "Kampagne öffnen";

      content.append(title, details, openLink);
      card.append(imageWrapper, content);
      campaignList.appendChild(card);
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
      characterList.innerHTML = "<p>Keine Spielercharaktere vorhanden.</p>";
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
    characterList.innerHTML = `<p>Charaktere konnten nicht geladen werden: ${error.message}</p>`;
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

    const characterIds = Array.from(selectedCharacters).map((checkbox) =>
      Number(checkbox.value),
    );
    await API.createCampaign({
      name,
      character_ids: characterIds,
      image_data_url: campaignImageDataUrl,
    });
    campaignImageDataUrl = null;
    campaignImageInput.value = "";
    campaignImagePreviewImg.removeAttribute("src");
    campaignImagePreview.hidden = true;

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
