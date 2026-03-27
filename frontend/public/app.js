import { API } from "./api.js";
import { buildSheetNav } from "/nav.js";

let currentCharacterId = Number(localStorage.getItem("dnd_current_character_id")) || null;
let currentUser = null;

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

const btnAdmin = document.getElementById("btnAdmin");
const adminPanel = document.getElementById("adminPanel");
const adminUsers = document.getElementById("adminUsers");
const btnReloadUsers = document.getElementById("btnReloadUsers");

const sheetRootEl = document.getElementById("sheetRoot");

const btnDelete = document.getElementById("btnDelete");
const btnCreatePC = document.getElementById("btnCreatePC");
const btnCreateNPC = document.getElementById("btnCreateNPC");

const btnRegister = document.getElementById("btnRegister");
const authPanel = document.getElementById("authPanel");
const authUsername = document.getElementById("authUsername");
const authPassword = document.getElementById("authPassword");
const btnAuthDoRegister = document.getElementById("btnAuthDoRegister");
const btnAuthCancel = document.getElementById("btnAuthCancel");
const charactersPanel = document.getElementById("charactersPanel");
const landingHero = document.getElementById("landingHero");


const navDrawer = document.getElementById("navDrawer");
const navBackdrop = document.getElementById("navBackdrop");
const btnNavOpen = document.getElementById("btnNavOpen");
const btnNavClose = document.getElementById("btnNavClose");
const navList = document.getElementById("navList");

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
    if (btnDelete) btnDelete.disabled = !currentCharacterId;
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
    if (!btnCreateNPC) return;

    const role = currentUser?.role;
    const isDmOrAdmin = role === "dm" || role === "admin";

    btnCreateNPC.style.display = isDmOrAdmin ? "inline-block" : "none";
    btnCreateNPC.disabled = !isDmOrAdmin;
}

export function setAdminVisible(isAdmin) {
    if (btnAdmin) btnAdmin.hidden = !isAdmin;
    if (!isAdmin && adminPanel) adminPanel.hidden = true;
}

export function setLoggedInUI(isLoggedIn) {
    setDisplay(btnLogin, isLoggedIn ? "none" : "inline-block");
    setDisplay(btnLogout, isLoggedIn ? "inline-block" : "none");

    if (btnSave) btnSave.disabled = true;

    if (btnCreatePC) btnCreatePC.disabled = !isLoggedIn;
    if (btnDelete) btnDelete.disabled = !isLoggedIn || !currentCharacterId;

    setDisplay(btnMenu, isLoggedIn ? "inline-block" : "none");
    setDisplay(btnActions, isLoggedIn ? "inline-block" : "none");
    setDisplay(btnNavOpen, isLoggedIn ? "inline-block" : "none");

    if (!isLoggedIn) closeNavDrawer();

    if (sheetRootEl) sheetRootEl.style.display = isLoggedIn ? "" : "none";

    if (!isLoggedIn) closeActionsMenu();

    setDisplay(btnRegister, isLoggedIn ? "none" : "inline-block");
    if (!isLoggedIn) showAuthPanel(false);
}

export async function refreshCurrentUserAndUI() {
    try {
        currentUser = await API.me();
        renderDrawerTitle();
        setAdminVisible(currentUser?.role === "admin");
        applyRoleUI();
    } catch (e) {
        console.error(e);

        currentUser = null;
        renderDrawerTitle();
        applyRoleUI();
        setAdminVisible(false);
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
            showAdminPanel(false);

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

    setStatus(`Charaktere geladen: ${chars.length}`);
    return chars;
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

function showAuthPanel(show) {
    if (!authPanel) return;
    authPanel.hidden = !show;

    if (show) {
        authUsername?.focus();
    } else {
        if (authUsername) authUsername.value = "";
        if (authPassword) authPassword.value = "";
    }
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

function toggleSection(toggleBtn, sectionEl) {
    if (!toggleBtn || !sectionEl) return;

    const willOpen = sectionEl.hidden;
    sectionEl.hidden = !willOpen;
    toggleBtn.setAttribute("aria-expanded", String(willOpen));
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

function showAdminPanel(show) {
    if (!adminPanel) return;
    adminPanel.hidden = !show;
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
// CHARACTERS / AUTH / ADMIN
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
        alert("Konnte Charakter nicht erstellen.");
    }
}

function renderUserRow(u) {
    const row = document.createElement("div");
    row.className = "userRow";

    const pending = u.is_active === false;

    const meta = document.createElement("div");
    meta.className = "userMeta";
    meta.innerHTML = `
        <div class="userName">
            ${escapeHtml(u.username)}
            ${pending ? `<span class="badge">pending</span>` : ``}
        </div>
        <div class="userId">ID: ${u.id}</div>
    `;

    const sel = document.createElement("select");
    sel.className = "select";
    ["player", "dm", "admin"].forEach((r) => {
        const opt = document.createElement("option");
        opt.value = r;
        opt.textContent = r;
        sel.appendChild(opt);
    });
    sel.value = u.role;

    const btnSaveRole = document.createElement("button");
    btnSaveRole.className = "btn btn--primary";
    btnSaveRole.textContent = "Speichern";

    btnSaveRole.addEventListener("click", async () => {
        btnSaveRole.disabled = true;
        const newRole = sel.value;

        try {
            const updated = await API.patchUserRole(u.id, newRole);
            u.role = updated.role ?? newRole;
            btnSaveRole.textContent = "Gespeichert";
            setTimeout(() => (btnSaveRole.textContent = "Speichern"), 900);
        } catch (e) {
            console.error(e);
            sel.value = u.role;
            btnSaveRole.textContent = "Fehler";
            setTimeout(() => (btnSaveRole.textContent = "Speichern"), 900);
            alert(e?.message || String(e));
        } finally {
            btnSaveRole.disabled = false;
        }
    });

    const btnDeleteUser = document.createElement("button");
    btnDeleteUser.className = "btn btn--danger";
    btnDeleteUser.textContent = "Löschen";

    btnDeleteUser.addEventListener("click", async () => {
        const confirmed = confirm(`User "${u.username}" wirklich löschen?`);
        if (!confirmed) return;

        btnDeleteUser.disabled = true;

        try {
            await API.deleteUser(u.id);
            await loadUsersIntoAdmin();
        } catch (e) {
            console.error(e);
            alert(e?.message || "Löschen fehlgeschlagen.");
            btnDeleteUser.disabled = false;
        }
    });

    let btnApprove = null;
    if (pending) {
        btnApprove = document.createElement("button");
        btnApprove.className = "btn btn--primary";
        btnApprove.textContent = "Freischalten";

        btnApprove.addEventListener("click", async () => {
            btnApprove.disabled = true;
            try {
                await API.activateUser(u.id);
                await loadUsersIntoAdmin();
            } catch (e) {
                console.error(e);
                alert(e?.message || "Freischalten fehlgeschlagen.");
                btnApprove.disabled = false;
            }
        });
    }

    const actions = document.createElement("div");
    actions.className = "userActions";
    if (btnApprove) actions.append(btnApprove);
    actions.append(sel, btnSaveRole, btnDeleteUser);

    row.append(meta, actions);
    return row;
}

async function loadUsersIntoAdmin() {
    if (!adminUsers) return;

    adminUsers.textContent = "Lade…";
    try {
        const users = await API.listUsers();
        adminUsers.innerHTML = "";
        users.forEach((u) => adminUsers.appendChild(renderUserRow(u)));
    } catch (e) {
        console.error(e);
        adminUsers.textContent = "Fehler beim Laden der User ❌";
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

function updateLandingAuthState(isLoggedIn) {
    if (charactersPanel) {
        charactersPanel.hidden = !isLoggedIn;
    }

    if (landingHero) {
        landingHero.hidden = isLoggedIn;
    }
}

async function doRegister() {
    const username = authUsername?.value?.trim();
    const password = authPassword?.value;

    if (!username || !password) {
        alert("Bitte Username und Passwort eingeben.");
        return;
    }

    btnAuthDoRegister.disabled = true;
    try {
        await API.register(username, password);
        showAuthPanel(false);
        setStatus("Account erstellt – wartet auf Admin-Freischaltung 🕯️");
        alert("Account erstellt. Ein Admin muss dich freischalten, bevor du dich einloggen kannst.");
    } catch (e) {
        console.error(e);
        alert(e?.message || "Registrierung fehlgeschlagen.");
    } finally {
        btnAuthDoRegister.disabled = false;
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

btnRegister?.addEventListener("click", () => showAuthPanel(authPanel.hidden));
btnAuthCancel?.addEventListener("click", () => showAuthPanel(false));
btnAuthDoRegister?.addEventListener("click", doRegister);

btnCreatePC?.addEventListener("click", () => handleCreate("pc"));
btnCreateNPC?.addEventListener("click", () => handleCreate("npc"));

toggleMine?.addEventListener("click", () => toggleSection(toggleMine, listMine));
toggleNpcs?.addEventListener("click", () => toggleSection(toggleNpcs, listNpcs));

bindSectionToggle(toggleMine, listMine, true);
bindSectionToggle(toggleNpcs, listNpcs, false);
bindSectionToggle(toggleActions, actionsMenu, true);

btnAdmin?.addEventListener("click", async () => {
    closeDrawer();
    showAdminPanel(true);
    await loadUsersIntoAdmin();
});

btnReloadUsers?.addEventListener("click", loadUsersIntoAdmin);

window.addEventListener("hashchange", () => {
    scrollToHashWithRetry();
});

// ============================================================
// STARTUP
// ============================================================

(function startup() {

    const isIndexPage =
        location.pathname === "/" ||
        location.pathname.endsWith("/index") ||
        location.pathname.endsWith("/index.html");

    const isSheetPage = location.pathname.endsWith("/sheet.html");
    const isSpellPage = location.pathname.endsWith("/spell.html");
    const isInventoryPage = location.pathname.endsWith("/inventory.html");
    const isCharacterPage = location.pathname.endsWith("/charakter.html");
    const isNotesPage = location.pathname.endsWith("/notes.html");

    if (isSpellPage || isInventoryPage || isCharacterPage || isNotesPage || isSheetPage) {
        buildSheetNav({ navList, btnNavOpen, closeNavDrawer, sheetRootEl });
        scrollToHashWithRetry();
    }

    if (isIndexPage) {
        setLoggedInUI(!!API.token);
        renderDrawerTitle();
        return;
    }

    if (!isSheetPage) {
        setLoggedInUI(!!API.token);
    }
})();