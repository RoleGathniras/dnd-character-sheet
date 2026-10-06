import { API } from "./api.js";
import { buildSheetNav } from "/nav.js";
import { initDrawer } from "/shared/drawer.js";

let currentCharacterId =
  Number(localStorage.getItem("dnd_current_character_id")) || null;
let currentUser = null;
const isIndexPage =
  location.pathname === "/" ||
  location.pathname.endsWith("/index") ||
  location.pathname.endsWith("/index.html");

// ============================================================
// DOM
// ============================================================
const drawer = document.getElementById("drawer");
const backdrop = document.getElementById("backdrop");
const btnMenu = document.getElementById("btnMenu");
const btnClose = document.getElementById("btnCloseDrawer");
const statusEl = document.getElementById("appStatus");
const btnLogin = document.getElementById("btnLogin");
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
const currentCharacterAvatarImg = document.getElementById(
  "currentCharacterAvatarImg",
);
const currentCharacterAvatarFallback = document.getElementById(
  "currentCharacterAvatarFallback",
);
const topbarCharacterName = document.getElementById("topbarCharacterName");
const topbarCharacterMeta = document.getElementById("topbarCharacterMeta");
const topbarCharacterLevel = document.getElementById("topbarCharacterLevel");
const playerNavDrawer = initDrawer({
  drawer: navDrawer,
  backdrop: navBackdrop,
  openButton: btnNavOpen,
  closeButton: btnNavClose,
});
const playerMainDrawer = initDrawer({
  drawer,
  backdrop,
  openButton: btnMenu,
  closeButton: btnClose,
});
// ============================================================
// EXPORTS
// ============================================================

export function getCurrentCharacterId() {
  return currentCharacterId;
}

export function getCurrentUser() {
  return currentUser;
}

export function setStatus(msg) {
  if (!statusEl) return;
  statusEl.textContent = msg;
}

export function setCurrentCharacter(id) {
  currentCharacterId = id ? Number(id) : null;

  if (currentCharacterId) {
    localStorage.setItem(
      "dnd_current_character_id",
      String(currentCharacterId),
    );
    localStorage.setItem("selectedCharacterId", String(currentCharacterId));
  } else {
    localStorage.removeItem("dnd_current_character_id");
    localStorage.removeItem("selectedCharacterId");
  }
}

export function renderDrawerTitle() {
  const el = document.getElementById("drawerUserTitle");
  if (!el) return;

  if (!currentUser) {
    el.textContent = "Charaktere";
    return;
  }

  const username = currentUser.username ?? "???";
  const role = currentUser.role ?? "";
  el.textContent = role ? `${username} (${role})` : username;
}

export function setLoggedInUI(isLoggedIn) {
  setDisplay(btnLogin, isLoggedIn ? "none" : "inline-block");
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

export async function refreshCurrentUserAndUI() {
  try {
    currentUser = await API.me();
    renderDrawerTitle();
    return currentUser;
  } catch (e) {
    console.error(e);

    currentUser = null;
    renderDrawerTitle();
    throw e;
  }
}

export async function loadCharacters() {
  if (!listMine) return [];

  listMine.innerHTML = "";

  const chars = await API.characters();

  const currentCharacter = chars.find(
    (character) => Number(character.id) === Number(currentCharacterId),
  );

  renderTopbarCharacterAvatar(currentCharacter ?? null);

  for (const c of chars) {
    const b = document.createElement("button");
    b.className = "drawer__item";

    if (Number(c.id) === Number(currentCharacterId)) {
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
      Number(c.id) !== Number(currentCharacterId)
    ) {
      listMine.appendChild(b);
    }
  }
  setStatus(`Charaktere geladen: ${chars.length}`);
  return chars;
}

export function getCharacterImageDataUrl(character) {
  return (
    character?.data?.description?.appearance?.imageDataUrl ||
    character?.data?.character_description?.appearance?.imageDataUrl ||
    character?.data?.appearance?.imageDataUrl ||
    ""
  );
}

export function getCharacterImageCrop(character) {
  const crop =
    character?.data?.description?.appearance?.imageCrop ||
    character?.data?.character_description?.appearance?.imageCrop ||
    character?.data?.appearance?.imageCrop ||
    null;

  return {
    x: Number(crop?.x ?? 50),
    y: Number(crop?.y ?? 50),
    zoom: Number(crop?.zoom ?? 1),
  };
}

export function renderTopbarCharacterAvatar(character) {
  if (
    !currentCharacterAvatar ||
    !currentCharacterAvatarImg ||
    !currentCharacterAvatarFallback
  ) {
    return;
  }

  currentCharacterAvatar.hidden = false;

  if (!character) {
    currentCharacterAvatarImg.removeAttribute("src");
    currentCharacterAvatarImg.hidden = true;

    currentCharacterAvatarFallback.hidden = false;
    currentCharacterAvatarFallback.textContent = "?";

    if (topbarCharacterName) {
      topbarCharacterName.textContent = "Kein Charakter";
    }

    if (topbarCharacterMeta) {
      topbarCharacterMeta.textContent = "—";
    }
    if (topbarCharacterLevel) {
      topbarCharacterLevel.textContent = "—";
    }

    return;
  }

  const data = character.data ?? {};

  const imageDataUrl = getCharacterImageDataUrl(character);
  const crop = getCharacterImageCrop(character);

  const name = String(character.name || "Charakter").trim();
  const fallbackLetter = name ? name.charAt(0).toUpperCase() : "?";

  const race = String(data.race ?? "").trim();
  const characterClass = String(data.class ?? "").trim();
  const level = String(data.level ?? "").trim();

  if (topbarCharacterName) {
    topbarCharacterName.textContent = name;
  }

  if (topbarCharacterMeta) {
    const metaParts = [];

    if (race) metaParts.push(race);
    if (characterClass) metaParts.push(characterClass);

    topbarCharacterMeta.textContent =
      metaParts.length > 0 ? metaParts.join(" · ") : "—";
  }
  if (topbarCharacterLevel) {
    topbarCharacterLevel.textContent = level || "—";
  }

  if (imageDataUrl) {
    currentCharacterAvatarImg.src = imageDataUrl;
    currentCharacterAvatarImg.alt = name;
    currentCharacterAvatarImg.style.objectPosition = `${crop.x}% ${crop.y}%`;

    currentCharacterAvatarImg.hidden = false;
    currentCharacterAvatarFallback.hidden = true;
  } else {
    currentCharacterAvatarImg.removeAttribute("src");
    currentCharacterAvatarImg.hidden = true;

    currentCharacterAvatarFallback.hidden = false;
    currentCharacterAvatarFallback.textContent = fallbackLetter;
  }
}
// ============================================================
// HELPERS
// ============================================================

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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

function scrollToHashIfPresent() {
  const hash = window.location.hash;
  if (!hash || hash.length < 2) return;

  const id = decodeURIComponent(hash.slice(1));
  const target = document.getElementById(id);
  if (!target) return;

  target.scrollIntoView({ behavior: "smooth", block: "start" });
  target.focus?.({ preventScroll: true });
}

function scrollToHashWithRetry(tries = 20) {
  const hash = window.location.hash;
  if (!hash || hash.length < 2) return;

  const id = decodeURIComponent(hash.slice(1));
  const target = document.getElementById(id);

  if (target) {
    scrollToHashIfPresent();
    return;
  }

  if (tries <= 0) return;
  requestAnimationFrame(() => scrollToHashWithRetry(tries - 1));
}

// ============================================================
// CHARACTERS / AUTH
// ============================================================

export async function handleCreate(kind) {
  const name = prompt(
    kind === "npc" ? "Name des NPC:" : "Name des Charakters:",
  );

  if (!name?.trim()) return;

  const data = {
    schema_version: 1,
  };

  if (kind !== "npc") {
    const race = prompt("Volk:");
    if (!race?.trim()) return;

    const characterClass = prompt("Klasse:");
    if (!characterClass?.trim()) return;

    data.race = race.trim();
    data.class = characterClass.trim();
    data.level = 1;
  }

  const payload = {
    name: name.trim(),
    kind,
    data,
  };

  try {
    const created = await API.createCharacter(payload);

    setCurrentCharacter(created.id);
    await loadCharacters();

    const onSheet = location.pathname.endsWith("/sheet.html");

    if (onSheet) {
      window.dispatchEvent(
        new CustomEvent("character:selected", {
          detail: {
            id: created.id,
          },
        }),
      );
    } else {
      window.location.href = "/player/sheet.html";
    }

    setStatus(`Erstellt: ${created.name}`);
  } catch (err) {
    if (err.status === 403) {
      alert("Nur DM/Admin darf NPCs anlegen.");
      return;
    }

    console.error(err);

    alert(err?.message || "Du kannst max. 10 Charaktere erstellen.");
  }
}

async function doLogin() {
  const username = prompt("Username");
  const password = prompt("Passwort");

  if (!username || !password) return;

  try {
    await API.login(username, password);

    // Benutzer laden, damit wir die Rolle kennen
    currentUser = await API.me();

    // DM bekommt einen eigenen Arbeitsbereich
    if (currentUser.role === "dm") {
      window.location.href = "/dm/campaigns.html";
      return;
    }

    const isIndexPage =
      location.pathname === "/" ||
      location.pathname.endsWith("/index") ||
      location.pathname.endsWith("/index.html");

    if (isIndexPage) {
      window.dispatchEvent(new CustomEvent("auth:login"));
      setStatus("Eingeloggt ✅");
      return;
    }

    setLoggedInUI(true);
    await refreshCurrentUserAndUI();
    await loadCharacters();

    setStatus("Eingeloggt ✅");
  } catch (e) {
    console.error(e);
    alert(e?.message || "Login fehlgeschlagen");
    setStatus(e?.message || "Login fehlgeschlagen ❌");
  }
}

function doLogout() {
  API.token = null;
  setCurrentCharacter(null);
  window.dispatchEvent(new CustomEvent("auth:logout"));
  window.location.href = "/index.html";
}

// ============================================================
// GLOBAL EVENTS
// ============================================================

btnLogin?.addEventListener("click", doLogin);
btnLogout?.addEventListener("click", doLogout);

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

    if (API.token) {
      loadCharacters().catch((error) => {
        console.error("Charaktere konnten nicht geladen werden:", error);
      });
    }
  }
})();
