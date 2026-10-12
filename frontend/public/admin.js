import { API } from "./api.js";
import { getCurrentCharacterId } from "/player/character-selection.js";
import { loadCharacters } from "/shared/legacy-character-list.js";
import { initDrawer } from "/shared/drawer.js";
import {
    buildSheetNav,
    scrollToHashWithRetry,
} from "./nav.js";
import { logout } from "/shared/auth.js";
import { setStatus } from "/shared/status.js";
import { renderDrawerTitle, refreshCurrentUserAndUI } from "/shared/drawer-user.js";


(function () {
    const isAdminPage = location.pathname.endsWith("/admin.html");
    if (!isAdminPage) return;
    const mainDrawer = initDrawer({
        drawer: document.getElementById("drawer"),
        backdrop: document.getElementById("backdrop"),
        openButton: document.getElementById("btnMenu"),
        closeButton: document.getElementById("btnCloseDrawer"),
    });

    const navigationDrawer = initDrawer({
        drawer: document.getElementById("navDrawer"),
        backdrop: document.getElementById("navBackdrop"),
        openButton: document.getElementById("btnNavOpen"),
        closeButton: document.getElementById("btnNavClose"),
    });
    const btnLogout = document.getElementById("btnLogout");

    btnLogout?.addEventListener("click", () => {
        logout();

        localStorage.removeItem("dnd_current_character_id");
        localStorage.removeItem("selectedCharacterId");

        window.location.href = "/index.html";
    });

    document.getElementById("btnPlayerRules")
        ?.addEventListener("click", () => {
            mainDrawer?.close();
            window.location.href = "/player_rules.html";
        });

    document.getElementById("btnAdmin")
        ?.addEventListener("click", () => {
            mainDrawer?.close();
            window.location.href = "/admin.html";
        });

    const navList = document.getElementById("navList");
    const btnNavOpen = document.getElementById("btnNavOpen");
    const sheetRootEl = document.getElementById("sheetRoot");

    const adminUsers = document.getElementById("adminUsers");
    const btnReloadUsers = document.getElementById("btnReloadUsers");

    const createUserUsername = document.getElementById("createUserUsername");
    const createUserPassword = document.getElementById("createUserPassword");
    const createUserRole = document.getElementById("createUserRole");
    const createUserActive = document.getElementById("createUserActive");
    const btnCreateUser = document.getElementById("btnCreateUser");

    let currentCharacter = null;

    function closeNavDrawerFallback() {
        navigationDrawer?.close();
    }

    function escapeHtml(s) {
        return String(s)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
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
                ${pending ? `<span class="badge">inaktiv</span>` : ``}
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
            const originalRole = u.role;
            const newRole = sel.value;

            try {
                const updated = await API.patchUserRole(u.id, newRole);
                u.role = updated.role ?? newRole;
                btnSaveRole.textContent = "Gespeichert";
                setTimeout(() => (btnSaveRole.textContent = "Speichern"), 900);
            } catch (e) {
                console.error(e);
                sel.value = originalRole;
                btnSaveRole.textContent = "Fehler";
                setTimeout(() => (btnSaveRole.textContent = "Speichern"), 900);
                alert(e?.message || "Rolle konnte nicht gespeichert werden.");
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

        const btnToggleActive = document.createElement("button");
        btnToggleActive.className = "btn btn--primary";
        btnToggleActive.textContent = u.is_active ? "Deaktivieren" : "Aktivieren";

        btnToggleActive.addEventListener("click", async () => {
            btnToggleActive.disabled = true;
            try {
                await API.setUserActive(u.id, !u.is_active);
                await loadUsersIntoAdmin();
            } catch (e) {
                console.error(e);
                alert(e?.message || "Status konnte nicht geändert werden.");
                btnToggleActive.disabled = false;
            }
        });

        const actions = document.createElement("div");
        actions.className = "userActions";
        actions.append(btnToggleActive, sel, btnSaveRole, btnDeleteUser);

        row.append(meta, actions);
        return row;
    }

    function setLoggedInUI(isLoggedIn) {
        for (const id of ["btnLogout", "btnMenu", "btnNavOpen"]) {
            const element = document.getElementById(id);

            if (element) {
                element.style.display = isLoggedIn ? "inline-block" : "none";
            }
        }

        const avatar = document.getElementById("currentCharacterAvatar");
        if (avatar) {
            avatar.hidden = !isLoggedIn;
        }

        const sheetRoot = document.getElementById("sheetRoot");
        if (sheetRoot) {
            sheetRoot.style.display = isLoggedIn ? "" : "none";
        }

        if (!isLoggedIn) {
            navigationDrawer?.close();
        }
    }

    async function loadUsersIntoAdmin() {
        if (!adminUsers) return;

        adminUsers.textContent = "Lade…";

        try {
            const users = await API.listUsers();
            adminUsers.innerHTML = "";

            if (!users.length) {
                adminUsers.textContent = "Keine User vorhanden.";
                return;
            }

            users.forEach((u) => adminUsers.appendChild(renderUserRow(u)));
        } catch (e) {
            console.error(e);
            adminUsers.textContent = "Fehler beim Laden der User ❌";
        }
    }

    async function createUser() {
        const username = createUserUsername?.value?.trim();
        const password = createUserPassword?.value ?? "";
        const role = createUserRole?.value ?? "player";
        const isActive = !!createUserActive?.checked;

        if (!username || !password) {
            alert("Bitte Username und Passwort eingeben.");
            return;
        }

        btnCreateUser.disabled = true;

        try {
            await API.createUserByAdmin({
                username,
                password,
                role,
                isActive,
            });

            createUserUsername.value = "";
            createUserPassword.value = "";
            createUserRole.value = "player";
            createUserActive.checked = true;

            await loadUsersIntoAdmin();
            setStatus(`User erstellt: ${username} ✅`);
        } catch (e) {
            console.error(e);
            alert(e?.message || "User konnte nicht erstellt werden.");
            setStatus("User-Erstellung fehlgeschlagen ❌");
        } finally {
            btnCreateUser.disabled = false;
        }
    }

    window.addEventListener("hashchange", () => {
        scrollToHashWithRetry();
    });

    (async function startupAdmin() {
        buildSheetNav({
            navList,
            btnNavOpen,
            closeNavDrawer: closeNavDrawerFallback,
            sheetRootEl,
        });
        scrollToHashWithRetry();

        if (!API.token) {
            setLoggedInUI(false);
            renderDrawerTitle();
            setStatus("Nicht eingeloggt ❌");
            window.location.href = "/index.html";
            return;
        }

        try {
            setLoggedInUI(true);
            await refreshCurrentUserAndUI();
            await loadCharacters({
                closeDrawer: () => mainDrawer?.close(),
            });

            const me = await API.me();
            if (me?.role !== "admin") {
                setStatus("Kein Admin-Zugriff ❌");
                alert("Nur Admins dürfen diese Seite öffnen.");
                window.location.href = "/index.html";
                return;
            }

            const currentCharacterId = Number(getCurrentCharacterId() || 0);
            if (currentCharacterId) {
                try {
                    currentCharacter = await API.getCharacter(currentCharacterId);
                } catch {
                    currentCharacter = null;
                }
            }

            await loadUsersIntoAdmin();
            setStatus("Adminbereich bereit ✅");
        } catch (e) {
            console.error(e);

            if (e?.status === 401) {
                API.token = null;
                setLoggedInUI(false);
                setStatus("Token ungültig – bitte neu einloggen");
            } else {
                setStatus("Admin-Startup fehlgeschlagen ❌");
            }
        }
    })();

    btnReloadUsers?.addEventListener("click", loadUsersIntoAdmin);
    btnCreateUser?.addEventListener("click", createUser);
})();