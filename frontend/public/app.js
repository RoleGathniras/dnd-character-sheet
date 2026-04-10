import { API } from "./api.js";
import { buildSheetNav } from "/nav.js";

let currentCharacterId = Number(localStorage.getItem("dnd_current_character_id")) || null;
let currentUser = null;
const isIndexPage =
    location.pathname === "/" ||
    location.pathname.endsWith("/index") ||
    location.pathname.endsWith("/index.html");

const isSheetPage = location.pathname.endsWith("/sheet.html");
// ============================================================
// DOM
// ============================================================

const drawer = document.getElementById("drawer");
const backdrop = document.getElementById("backdrop");
const btnMenu = document.getElementById("btnMenu");
const btnClose = document.getElementById("btnCloseDrawer");

const btnActions = document.getElementById("btnActions");
const actionsMenu = document.getElementById("actionsMenu");

const statusEl = document.getElementById("appStatus");
const btnSave = document.getElementById("btnSave");
const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");

const listMine = document.getElementById("listMine");
const listNpcs = document.getElementById("listNpcs");
const toggleMine = document.getElementById("toggleMine");
const toggleNpcs = document.getElementById("toggleNpcs");
const toggleActions = document.getElementById("toggleActions");
const drawerActionsSection = document.getElementById("drawerActionsSection");
const sheetRootEl = document.getElementById("sheetRoot");

const btnDelete = document.getElementById("btnDelete");
const btnCreatePC = document.getElementById("btnCreatePC");
const btnCreateNPC = document.getElementById("btnCreateNPC");
const btnAdmin = document.getElementById("btnAdmin");
const btnPlayerRules = document.getElementById("btnPlayerRules");

const charactersPanel = document.getElementById("charactersPanel");
const landingHero = document.getElementById("landingHero");

const navDrawer = document.getElementById("navDrawer");
const navBackdrop = document.getElementById("navBackdrop");
const btnNavOpen = document.getElementById("btnNavOpen");
const btnNavClose = document.getElementById("btnNavClose");
const navList = document.getElementById("navList");

const currentCharacterAvatar = document.getElementById("currentCharacterAvatar");
const currentCharacterAvatarImg = document.getElementById("currentCharacterAvatarImg");
const currentCharacterAvatarFallback = document.getElementById("currentCharacterAvatarFallback");

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
        localStorage.setItem("dnd_current_character_id", String(currentCharacterId));
        localStorage.setItem("selectedCharacterId", String(currentCharacterId));
    } else {
        localStorage.removeItem("dnd_current_character_id");
        localStorage.removeItem("selectedCharacterId");
    }

    if (btnSave) btnSave.disabled = true;
    updateDrawerActions();
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

export function applyRoleUI() {
    updateDrawerActions();
}

function updateDrawerActions() {
    const role = currentUser?.role;
    const isLoggedIn = !!API.token;
    const isDmOrAdmin = role === "dm" || role === "admin";
    const isAdmin = role === "admin";
    const hasSelectedCharacter = !!currentCharacterId;

    if (drawerActionsSection) {
        drawerActionsSection.style.display = isIndexPage ? "" : "none";
    }

    if (btnCreatePC) {
        btnCreatePC.style.display = isIndexPage ? "" : "none";
        btnCreatePC.disabled = !isLoggedIn;
    }

    if (btnCreateNPC) {
        btnCreateNPC.style.display = isIndexPage && isDmOrAdmin ? "" : "none";
        btnCreateNPC.disabled = !isDmOrAdmin;
    }

    if (btnDelete) {
        btnDelete.style.display = isIndexPage && hasSelectedCharacter ? "" : "none";
        btnDelete.disabled = !isLoggedIn || !hasSelectedCharacter;
    }
    if (btnPlayerRules) {
        btnPlayerRules.style.display = isLoggedIn ? "" : "none";
        btnPlayerRules.disabled = !isLoggedIn;
    }
    if (btnAdmin) {
        btnAdmin.hidden = !(isIndexPage && isAdmin);
    }


    if (toggleActions && actionsMenu) {
        const hasVisibleAction =
            (btnCreatePC && btnCreatePC.style.display !== "none") ||
            (btnCreateNPC && btnCreateNPC.style.display !== "none") ||
            (btnDelete && btnDelete.style.display !== "none") ||
            (btnPlayerRules && btnPlayerRules.style.display !== "none") ||
            (btnAdmin && !btnAdmin.hidden);

        if (!hasVisibleAction) {
            setSectionOpen(toggleActions, actionsMenu, false);
        }
    }
}

export function setAdminVisible() {
    updateDrawerActions();
}

export function setLoggedInUI(isLoggedIn) {
    setDisplay(btnLogin, isLoggedIn ? "none" : "inline-block");
    setDisplay(btnLogout, isLoggedIn ? "inline-block" : "none");

    if (btnSave) btnSave.disabled = true;

    setDisplay(btnMenu, isLoggedIn ? "inline-block" : "none");
    setDisplay(btnActions, isLoggedIn ? "inline-block" : "none");
    setDisplay(btnNavOpen, isLoggedIn ? "inline-block" : "none");

    if (currentCharacterAvatar) {
        currentCharacterAvatar.hidden = !isLoggedIn;
    }

    if (!isLoggedIn) {
        closeNavDrawer();
        closeActionsMenu();
    }

    if (sheetRootEl) {
        sheetRootEl.style.display = isLoggedIn ? "" : "none";
    }

    updateDrawerActions();
}

export async function refreshCurrentUserAndUI() {
    try {
        currentUser = await API.me();
        renderDrawerTitle();
        setAdminVisible();
        applyRoleUI();
    } catch (e) {
        console.error(e);

        currentUser = null;
        renderDrawerTitle();
        applyRoleUI();
        setAdminVisible();
        throw e;
    }
}

export async function loadCharacters() {
    if (!listMine || !listNpcs) return [];

    listMine.innerHTML = "";
    listNpcs.innerHTML = "";

    const chars = await API.characters();

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

            const onSheet = location.pathname.endsWith("/sheet.html");
            if (onSheet) {
                window.dispatchEvent(
                    new CustomEvent("character:selected", {
                        detail: { id: c.id },
                    })
                );
                return;
            }

            window.location.href = "/sheet.html";
        });

        if (c.kind === "npc") listNpcs.appendChild(b);
        else listMine.appendChild(b);
    }

    updateDrawerActions();
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
    if (!currentCharacterAvatar || !currentCharacterAvatarImg || !currentCharacterAvatarFallback) {
        return;
    }

    currentCharacterAvatar.hidden = false;

    if (!character) {
        currentCharacterAvatarImg.removeAttribute("src");
        currentCharacterAvatarImg.hidden = true;
        currentCharacterAvatarFallback.hidden = false;
        currentCharacterAvatarFallback.textContent = "?";
        return;
    }

    const imageDataUrl = getCharacterImageDataUrl(character);
    const crop = getCharacterImageCrop(character);
    const name = String(character?.name || "Charakter").trim();
    const fallbackLetter = name ? name.charAt(0).toUpperCase() : "?";

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

export function bindTopbarAvatarNavigation() {
    if (!currentCharacterAvatar) return;
    if (currentCharacterAvatar.dataset.bound === "1") return;

    currentCharacterAvatar.dataset.bound = "1";
    currentCharacterAvatar.style.cursor = "pointer";

    currentCharacterAvatar.addEventListener("click", () => {
        window.location.href = "/index.html";
    });
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

function setSectionOpen(toggleBtn, listEl, open) {
    if (!toggleBtn || !listEl) return;
    toggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
    listEl.hidden = !open;
}

function bindSectionToggle(toggleBtn, listEl, defaultOpen) {
    if (!toggleBtn || !listEl) return;
    if (toggleBtn.dataset.bound === "1") return;

    toggleBtn.dataset.bound = "1";
    setSectionOpen(toggleBtn, listEl, defaultOpen);

    toggleBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const isOpen = toggleBtn.getAttribute("aria-expanded") === "true";
        setSectionOpen(toggleBtn, listEl, !isOpen);
    });
}

function openDrawer() {
    drawer?.classList.add("is-open");
    drawer?.setAttribute("aria-hidden", "false");
    if (backdrop) backdrop.hidden = false;
    document.getElementById("btnCloseDrawer")?.focus();
}

function closeDrawer() {
    document.getElementById("btnMenu")?.focus();
    drawer?.classList.remove("is-open");
    drawer?.setAttribute("aria-hidden", "true");
    if (backdrop) backdrop.hidden = true;
}

function openNavDrawer() {
    closeDrawer();
    navDrawer?.classList.add("is-open");
    navDrawer?.setAttribute("aria-hidden", "false");
    if (navBackdrop) navBackdrop.hidden = false;
}

function closeNavDrawer() {
    navDrawer?.classList.remove("is-open");
    navDrawer?.setAttribute("aria-hidden", "true");
    if (navBackdrop) navBackdrop.hidden = true;
}

function closeActionsMenu() {
    // aktuell leer, aber behalten als Hook
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

async function handleCreate(kind) {
    const name = prompt(kind === "npc" ? "Name des NPC:" : "Name des Charakters:");
    if (!name) return;

    const payload = {
        name: name.trim(),
        kind,
        data: { schema_version: 1 },
    };

    try {
        const created = await API.createCharacter(payload);
        setCurrentCharacter(created.id);
        await loadCharacters();

        const onSheet = location.pathname.endsWith("/sheet.html");
        if (onSheet) {
            window.dispatchEvent(
                new CustomEvent("character:selected", {
                    detail: { id: created.id },
                })
            );
        } else {
            window.location.href = "/sheet.html";
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

        const isIndexPage =
            location.pathname === "/" ||
            location.pathname.endsWith("/index") ||
            location.pathname.endsWith("/index.html");

        if (isIndexPage) {
            updateLandingAuthState(true);
            window.dispatchEvent(new CustomEvent("auth:login"));
            setStatus("Eingeloggt ✅");
            return;
        }

        setLoggedInUI(true);
        await refreshCurrentUserAndUI();
        applyRoleUI();
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
    updateLandingAuthState(false);
    window.dispatchEvent(new CustomEvent("auth:logout"));
    window.location.href = "/index.html";
}

export function updateLandingAuthState(isLoggedIn) {
    if (charactersPanel) {
        charactersPanel.hidden = !isLoggedIn;
    }

    if (landingHero) {
        landingHero.hidden = isLoggedIn;
    }
}

// ============================================================
// GLOBAL EVENTS
// ============================================================

btnMenu?.addEventListener("click", openDrawer);
btnClose?.addEventListener("click", closeDrawer);
backdrop?.addEventListener("click", closeDrawer);

btnNavOpen?.addEventListener("click", openNavDrawer);
btnNavClose?.addEventListener("click", closeNavDrawer);
navBackdrop?.addEventListener("click", closeNavDrawer);

btnLogin?.addEventListener("click", doLogin);
btnLogout?.addEventListener("click", doLogout);

btnCreatePC?.addEventListener("click", () => handleCreate("pc"));
btnCreateNPC?.addEventListener("click", () => handleCreate("npc"));

bindSectionToggle(toggleMine, listMine, true);
bindSectionToggle(toggleNpcs, listNpcs, false);
bindSectionToggle(toggleActions, actionsMenu, true);

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
btnDelete?.addEventListener("click", async () => {
    if (!currentCharacterId) return;

    const ok = window.confirm("Willst du diesen Charakter wirklich löschen?");
    if (!ok) return;

    try {
        await API.deleteCharacter(currentCharacterId);
        setCurrentCharacter(null);
        await loadCharacters();
        updateDrawerActions();
        closeDrawer();
        setStatus("Charakter gelöscht.");

        if (!isIndexPage) {
            window.location.href = "/index.html";
        }
    } catch (e) {
        console.error(e);
        alert(e?.message || "Charakter konnte nicht gelöscht werden.");
    }
});
// ============================================================
// STARTUP
// ============================================================

(function startup() {
    bindTopbarAvatarNavigation();

    const isSpellPage = location.pathname.endsWith("/spell.html");
    const isInventoryPage = location.pathname.endsWith("/inventory.html");
    const isCharacterPage = location.pathname.endsWith("/charakter.html");
    const isNotesPage = location.pathname.endsWith("/notes.html");
    const isAdminPage = location.pathname.endsWith("/admin.html");

    if (isSpellPage || isInventoryPage || isCharacterPage || isNotesPage || isSheetPage || isAdminPage) {
        buildSheetNav({ navList, btnNavOpen, closeNavDrawer, sheetRootEl });
        scrollToHashWithRetry();
    }

    if (isIndexPage) {
        setLoggedInUI(!!API.token);
        renderDrawerTitle();
        updateDrawerActions();
        return;
    }

    if (!isSheetPage) {
        setLoggedInUI(!!API.token);
        updateDrawerActions();
    }
})();