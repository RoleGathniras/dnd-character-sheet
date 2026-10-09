import { API } from "./api.js";
import { buildSheetNav, scrollToHashWithRetry, } from "/nav.js";
import { initDrawer } from "/shared/drawer.js";
import { setStatus } from "/shared/status.js";
import { renderTopbarCharacterAvatar } from "/player/player-topbar.js";
import { escapeHtml } from "/shared/html.js";
import {
  getCurrentCharacterId,
  setCurrentCharacter,
} from "/player/character-selection.js";
export { getCurrentCharacterId, setCurrentCharacter };

// ============================================================
// DOM
// ============================================================
const drawer = document.getElementById("drawer");
const backdrop = document.getElementById("backdrop");
const btnMenu = document.getElementById("btnMenu");
const btnClose = document.getElementById("btnCloseDrawer");
const btnLogout = document.getElementById("btnLogout");
const listMine = document.getElementById("listMine");
const sheetRootEl = document.getElementById("sheetRoot");
const btnAdmin = document.getElementById("btnAdmin");
const btnPlayerRules = document.getElementById("btnPlayerRules");
const navDrawer = document.getElementById("navDrawer");
const navBackdrop = document.getElementById("navBackdrop");
const btnNavOpen = document.getElementById("btnNavOpen");
const btnNavClose = document.getElementById("btnNavClose");
const navList = document.getElementById("navList");
const currentCharacterAvatar = document.getElementById(
  "currentCharacterAvatar",
);
const usesLegacyDrawer =
  location.pathname.endsWith("/admin.html") ||
  location.pathname.endsWith("/player_rules.html");

const playerNavDrawer = usesLegacyDrawer
  ? initDrawer({
    drawer: navDrawer,
    backdrop: navBackdrop,
    openButton: btnNavOpen,
    closeButton: btnNavClose,
  })
  : null;

const playerMainDrawer = usesLegacyDrawer
  ? initDrawer({
    drawer,
    backdrop,
    openButton: btnMenu,
    closeButton: btnClose,
  })
  : null;
// ============================================================
// EXPORTS
// ============================================================
export function setLoggedInUI(isLoggedIn) {
  setDisplay(btnLogout, isLoggedIn ? "inline-block" : "none");
  setDisplay(btnMenu, isLoggedIn ? "inline-block" : "none");
  setDisplay(btnNavOpen, isLoggedIn ? "inline-block" : "none");

  if (currentCharacterAvatar) {
    currentCharacterAvatar.hidden = !isLoggedIn;
  }

  if (!isLoggedIn) {
    closeNavDrawer();
  }

  if (sheetRootEl) {
    sheetRootEl.style.display = isLoggedIn ? "" : "none";
  }

}

export async function loadCharacters() {
  if (!listMine) return [];

  listMine.innerHTML = "";

  const chars = await API.characters();

  const currentCharacter = chars.find(
    (character) => Number(character.id) === Number(getCurrentCharacterId()),
  );

  renderTopbarCharacterAvatar(currentCharacter ?? null);

  for (const c of chars) {
    const b = document.createElement("button");
    b.className = "drawer__item";

    if (Number(c.id) === Number(getCurrentCharacterId())) {
      b.classList.add("is-active");
    }

    const name = escapeHtml(c.name ?? "");
    const kind = escapeHtml((c.kind ?? "").toUpperCase());
    const ownerName = c.owner_username ? escapeHtml(c.owner_username) : "";

    b.innerHTML = `
            <span class="drawerItem__main">
                <span class="drawerItem__name">${name}</span>
                <span class="drawerItem__kind">${kind}</span>
            </span>
            ${ownerName ? `<span class="drawerItem__sub">${ownerName}</span>` : ``}
        `;

    b.addEventListener("click", () => {
      setCurrentCharacter(c.id);
      closeDrawer();

      if (location.pathname.endsWith("/sheet.html")) {
        window.location.reload();
        return;
      }

      window.location.href = "/player/sheet.html";
    });

    if (
      c.kind !== "npc" &&
      Number(c.id) !== Number(getCurrentCharacterId())
    ) {
      listMine.appendChild(b);
    }
  }
  setStatus(`Charaktere geladen: ${chars.length}`);
  return chars;
}
// ============================================================
// HELPERS
// ============================================================
function setDisplay(el, value) {
  if (!el) return;
  el.style.display = value;
}

function closeDrawer() {
  playerMainDrawer?.close();
}

function closeNavDrawer() {
  playerNavDrawer?.close();
}
// ============================================================
// CHARACTERS / AUTH
// ============================================================
// ============================================================
// GLOBAL EVENTS
// ============================================================
btnAdmin?.addEventListener("click", () => {
  closeDrawer();
  window.location.href = "/admin.html";
});
btnPlayerRules?.addEventListener("click", () => {
  closeDrawer();
  window.location.href = "/player_rules.html";
});

window.addEventListener("hashchange", () => {
  scrollToHashWithRetry();
});
// ============================================================
// STARTUP
// ============================================================

(function startup() {
  const isAdminPage = location.pathname.endsWith("/admin.html");
  const isPlayerRulesPage = location.pathname.endsWith("/player_rules.html");

  if (
    isAdminPage ||
    isPlayerRulesPage
  ) {
    buildSheetNav({
      navList,
      btnNavOpen,
      closeNavDrawer,
      sheetRootEl,
    });

    scrollToHashWithRetry();

    setLoggedInUI(!!API.token);

  }
})();
