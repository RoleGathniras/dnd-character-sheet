import { API } from "../api.js";
import {
  campaignId,
  initDmNavigation,
  initDmNavDrawer,
  initDmMainDrawer,
  initDmMainNavigation,
} from "./dm-nav.js";

// ============================================================
// DOM
// ============================================================

const appbarCampaignName = document.getElementById("appbarCampaignName");

const campaignFirstSession = document.getElementById("campaign-first-session");
const campaignSessionNumber = document.getElementById("campaign-session-number");
const campaignIngameDays = document.getElementById("campaign-ingame-days");
const campaignBookPage = document.getElementById("campaign-book-page");
const campaignLevelRange = document.getElementById("campaign-level-range");

const linkCampaignPlayers =
  document.getElementById("linkCampaignPlayers");

const campaignPlayerPortraits =
  document.getElementById("campaign-player-portraits");

const btnEditCampaignStatus =
  document.getElementById("btnEditCampaignStatus");

// ============================================================
// CAMPAIGN
// ============================================================
let currentCampaign = null;
let isEditingCampaignStatus = false;
initDmNavigation();
initDmNavDrawer();
initDmMainDrawer();
initDmMainNavigation();

const editIcon = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 20h9"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />
    <path
      d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
`;

const saveIcon = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M5 12l4 4L19 6"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
`;

async function loadCampaign() {
  if (!campaignId) {
    appbarCampaignName.textContent = "Ungültige Kampagne";
    return;
  }

  try {
    const campaign = await API.getCampaign(campaignId);
    currentCampaign = campaign;

    appbarCampaignName.textContent = campaign.name;

    renderCampaignStatus(campaign);
    renderPlayerPortraits(campaign.characters ?? []);
  } catch (error) {
    console.error(error);

    appbarCampaignName.textContent = "Kampagne konnte nicht geladen werden";
  }
}
function formatDate(dateString) {
  if (!dateString) return "–";

  const [year, month, day] = dateString.split("-");

  return `${day}.${month}.${year}`;
}
function renderCampaignStatus(campaign) {
  campaignFirstSession.textContent =
    formatDate(campaign.first_session_date);

  campaignSessionNumber.textContent =
    campaign.session_number ?? "–";

  campaignIngameDays.textContent =
    campaign.ingame_days != null
      ? `${campaign.ingame_days} Tage`
      : "–";

  campaignBookPage.textContent =
    campaign.book_page ?? "–";

  if (campaign.level_min != null && campaign.level_max != null) {
    campaignLevelRange.textContent =
      `${campaign.level_min}–${campaign.level_max}`;
  } else {
    campaignLevelRange.textContent = "–";
  }
}
function renderCampaignStatusEdit(campaign) {
  campaignFirstSession.innerHTML = `
    <input
      id="editCampaignFirstSession"
      type="date"
      value="${campaign.first_session_date ?? ""}"
    >
  `;

  campaignSessionNumber.innerHTML = `
    <input
      id="editCampaignSessionNumber"
      type="number"
      min="0"
      value="${campaign.session_number ?? 0}"
    >
  `;

  campaignIngameDays.innerHTML = `
    <input
      id="editCampaignIngameDays"
      type="number"
      min="0"
      value="${campaign.ingame_days ?? 0}"
    >
  `;

  campaignBookPage.innerHTML = `
    <input
      id="editCampaignBookPage"
      type="number"
      min="1"
      value="${campaign.book_page ?? ""}"
    >
  `;

  campaignLevelRange.innerHTML = `
    <div class="dm-level-range-edit">
      <input
        id="editCampaignLevelMin"
        type="number"
        min="1"
        max="20"
        value="${campaign.level_min ?? ""}"
        aria-label="Minimales Kampagnenlevel"
      >

      <span>–</span>

      <input
        id="editCampaignLevelMax"
        type="number"
        min="1"
        max="20"
        value="${campaign.level_max ?? ""}"
        aria-label="Maximales Kampagnenlevel"
      >
    </div>
  `;
}

async function saveCampaignStatus() {
  const levelMinInput =
    document.getElementById("editCampaignLevelMin");

  const levelMaxInput =
    document.getElementById("editCampaignLevelMax");

  const levelMin = levelMinInput.value
    ? Number(levelMinInput.value)
    : null;

  const levelMax = levelMaxInput.value
    ? Number(levelMaxInput.value)
    : null;

  if (
    levelMin !== null &&
    levelMax !== null &&
    levelMin > levelMax
  ) {
    alert("Das minimale Level darf nicht höher als das maximale Level sein.");
    return;
  }
  const payload = {
    first_session_date:
      document.getElementById("editCampaignFirstSession").value || null,

    session_number:
      Number(document.getElementById("editCampaignSessionNumber").value),

    ingame_days:
      Number(document.getElementById("editCampaignIngameDays").value),

    book_page:
      document.getElementById("editCampaignBookPage").value
        ? Number(document.getElementById("editCampaignBookPage").value)
        : null,

    level_min: levelMin,
    level_max: levelMax,
  };

  try {
    btnEditCampaignStatus.disabled = true;

    currentCampaign = await API.updateCampaign(
      campaignId,
      payload
    );

    isEditingCampaignStatus = false;

    renderCampaignStatus(currentCampaign);

    btnEditCampaignStatus.innerHTML = editIcon;
    btnEditCampaignStatus.title = "Kampagnenstatus bearbeiten";
    btnEditCampaignStatus.setAttribute(
      "aria-label",
      "Kampagnenstatus bearbeiten"
    );
  } catch (error) {
    console.error("Kampagnenstatus konnte nicht gespeichert werden.", error);
  } finally {
    btnEditCampaignStatus.disabled = false;
  }
}

function renderPlayerPortraits(characters) {
  campaignPlayerPortraits.innerHTML = "";

  for (const character of characters) {
    const portrait = document.createElement("div");
    portrait.className = "dm-player-portrait";

    const appearance = character.data?.description?.appearance;
    const imageUrl = appearance?.imageDataUrl;
    const crop = appearance?.imageCrop;

    if (imageUrl) {
      const img = document.createElement("img");

      img.src = imageUrl;
      img.alt = character.name;

      img.style.objectPosition =
        `${crop?.x ?? 50}% ${crop?.y ?? 50}%`;

      portrait.appendChild(img);
    } else {
      const fallback = document.createElement("span");
      fallback.textContent =
        character.name?.trim()?.charAt(0)?.toUpperCase() || "?";

      portrait.appendChild(fallback);
    }

    const name = document.createElement("small");
    name.textContent = character.name;

    portrait.appendChild(name);
    campaignPlayerPortraits.appendChild(portrait);
  }
}

// ============================================================
// DASHBOARD NAVIGATION
// ============================================================

linkCampaignPlayers.addEventListener("click", (event) => {
  event.preventDefault();

  window.location.href = `players.html?id=${campaignId}`;
});

// ============================================================
// START
// ============================================================

btnEditCampaignStatus.addEventListener("click", async () => {
  if (!currentCampaign) return;

  if (!isEditingCampaignStatus) {
    isEditingCampaignStatus = true;

    renderCampaignStatusEdit(currentCampaign);

    btnEditCampaignStatus.innerHTML = saveIcon;
    btnEditCampaignStatus.title = "Kampagnenstatus speichern";
    btnEditCampaignStatus.setAttribute(
      "aria-label",
      "Kampagnenstatus speichern"
    );

    return;
  }

  await saveCampaignStatus();
});

loadCampaign();