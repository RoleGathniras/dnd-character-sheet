import {API} from "./api.js";
import {jsonToSheet, sheetToJson} from "./mapper.js";
import {renderOverlay, showOverlay} from "./overlay.js";

(function () {

    // ===== Elements =====
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

    const btnAdmin = document.getElementById("btnAdmin");
    const adminPanel = document.getElementById("adminPanel");
    const adminUsers = document.getElementById("adminUsers");
    const btnReloadUsers = document.getElementById("btnReloadUsers");
    const sheetRootEl = document.getElementById("sheetRoot");

    const btnDelete = document.getElementById("btnDelete");
    const btnCreatePC = document.getElementById("btnCreatePC");
    const btnCreateNPC = document.getElementById("btnCreateNPC");


    // ===== State =====
    let currentCharacterId = Number(localStorage.getItem("dnd_current_character_id")) || null;
    let isDirty = false;
    let currentCharacterUpdatedAt = null;

    let currentUser = null;

    // ===== Helpers =====
    function renderDrawerTitle() {
        const el = document.getElementById("drawerUserTitle");
        console.log("[renderDrawerTitle] called. el=", el, "currentUser=", currentUser);

        if (!el) return;

        // TEST: damit wir sehen, dass es wirklich schreibt
        if (!currentUser) {
            el.textContent = "Charaktere";
            return;
        }

        const username = currentUser.username ?? "???";
        const role = currentUser.role ?? "";
        el.textContent = role ? `${username} (${role})` : username;
    }


    function closeActionsMenu() {
        if (actionsMenu) actionsMenu.hidden = true;
    }

    function toggleActionsMenu() {
        if (actionsMenu) actionsMenu.hidden = !actionsMenu.hidden;
    }

    function setSectionOpen(toggleBtn, listEl, open) {
        if (!toggleBtn || !listEl) return;
        toggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
        listEl.hidden = !open;
    }

    function toggleSection(toggleBtn, listEl) {
        if (!toggleBtn || !listEl) return;

        // Quelle der Wahrheit: hidden-Status der Liste
        const openNext = listEl.hidden; // wenn hidden=true → als nächstes öffnen
        setSectionOpen(toggleBtn, listEl, openNext);

        console.log("[drawer-toggle]", toggleBtn.id, "open=", openNext, "hidden=", listEl.hidden);
    }


    function setStatus(msg) {
        if (statusEl) statusEl.textContent = msg;
    }

    function openDrawer() {
        drawer?.classList.add("is-open");
        drawer?.setAttribute("aria-hidden", "false");
        if (backdrop) backdrop.hidden = false;
    }

    function closeDrawer() {
        drawer?.classList.remove("is-open");
        drawer?.setAttribute("aria-hidden", "true");
        if (backdrop) backdrop.hidden = true;
    }

    function setLoggedInUI(isLoggedIn) {
        btnLogin.style.display = isLoggedIn ? "none" : "inline-block";
        btnLogout.style.display = isLoggedIn ? "inline-block" : "none";
        btnSave.disabled = true; // erst aktiv wenn dirty

        // Create/Delete nur wenn eingeloggt
        if (btnCreatePC) btnCreatePC.disabled = !isLoggedIn;
        if (btnDelete) btnDelete.disabled = !isLoggedIn || !currentCharacterId;

        // Drawer/Menu nur wenn eingeloggt (optional, aber wirkt aufgeräumt)
        if (btnMenu) btnMenu.style.display = isLoggedIn ? "inline-block" : "none";

        // Sheet anzeigen/verstecken
        if (sheetRootEl) sheetRootEl.style.display = isLoggedIn ? "" : "none";

        if (btnActions) btnActions.style.display = isLoggedIn ? "inline-block" : "none";
        if (!isLoggedIn) closeActionsMenu();


    }

    function applyRoleUI() {
        // Nur sinnvoll, wenn eingeloggt und currentUser geladen ist
        if (!btnCreateNPC) return;

        const role = currentUser?.role;
        const isDmOrAdmin = role === "dm" || role === "admin";

        // NPC nur für DM/Admin
        btnCreateNPC.style.display = isDmOrAdmin ? "inline-block" : "none";
        btnCreateNPC.disabled = !isDmOrAdmin;
    }

    function setCurrentCharacter(id) {
        currentCharacterId = id ? Number(id) : null;

        if (currentCharacterId) {
            localStorage.setItem("dnd_current_character_id", String(currentCharacterId));
        } else {
            localStorage.removeItem("dnd_current_character_id");
        }
        btnSave.disabled = true;
        // Delete nur wenn Character ausgewählt
        if (btnDelete) btnDelete.disabled = !currentCharacterId;
    }

    function markDirty() {
        isDirty = true;
        btnSave.disabled = false;
        setStatus("Ungespeicherte Änderungen ⚠");
    }

    function escapeHtml(s) {
        return String(s)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function setAdminVisible(isAdmin) {
        if (btnAdmin) btnAdmin.hidden = !isAdmin;
        if (!isAdmin && adminPanel) adminPanel.hidden = true;
    }

    function showAdminPanel(show) {
        if (!adminPanel) return;
        adminPanel.hidden = !show;
    }

    // ===== Data =====
    async function handleCreate(kind) {
        const name = prompt(kind === "npc" ? "Name des NPC:" : "Name des Charakters:");
        if (!name) return;

        // Minimaler Startzustand für data
        const payload = {
            name: name.trim(),
            kind, // "pc" oder "npc"
            data: {schema_version: 1} // minimal, später erweitern
        };

        try {
            const created = await API.createCharacter(payload);
            setCurrentCharacter?.(created.id);

            // Liste neu laden und neuen Character auswählen
            await loadCharacters(); // deine bestehende Funktion
            await loadCharacter(created.id); // deine bestehende Funktion
            setStatus(`Erstellt: ${created.name}`); // oder wie euer Status heißt
        } catch (err) {
            // DM-only NPC Rule kommt als 403 zurück -> verständlich anzeigen
            if (err.status === 403) {
                alert("Nur DM/Admin darf NPCs anlegen.");
                return;
            }
            console.error(err);
            alert("Konnte Charakter nicht erstellen.");
        }
    }

    async function loadCharacters() {
        if (!listMine || !listNpcs) return;

        listMine.innerHTML = "";
        listNpcs.innerHTML = "";

        const chars = await API.characters();

        for (const c of chars) {
            // Drawer Button
            const b = document.createElement("button");
            b.className = "drawer__item";
            const name = escapeHtml(c.name ?? "");
            const kind = escapeHtml((c.kind ?? "").toUpperCase()); // PC/NPC
            const ownerName = c.owner_username ? escapeHtml(c.owner_username) : "";

            b.innerHTML = `
  <span class="drawerItem__main">
    <span class="drawerItem__name">${name}</span>
    <span class="drawerItem__kind">${kind}</span>
  </span>
  ${ownerName ? `<span class="drawerItem__sub">${ownerName}</span>` : ``}
`;

            b.addEventListener("click", async () => {
                setCurrentCharacter(c.id);
                closeDrawer();
                showAdminPanel(false);

                try {
                    await loadCharacter(c.id);
                } catch (e) {
                    // Wenn Character nicht sichtbar/weg: Auswahl zurücksetzen und Liste neu laden
                    setCurrentCharacter(null);
                    await loadCharacters();
                    setStatus?.("Charakter nicht verfügbar oder kein Zugriff.");
                }
            });

            if (c.kind === "npc") listNpcs.appendChild(b);
            else listMine.appendChild(b);
        }

        setStatus(`Charaktere geladen: ${chars.length}`);
    }


    async function loadSheetTemplateOnce() {
        if (!sheetRootEl) return;

        const res = await fetch("/sheet.html");
        if (!res.ok) {
            sheetRootEl.innerHTML = "<p>Sheet konnte nicht geladen werden ❌</p>";
            return;
        }

        sheetRootEl.innerHTML = await res.text();

        // 👉 Default-Titel setzen
        const titleEl = document.getElementById("sheetTitle");
        if (titleEl) {
            titleEl.textContent = "Kein Charakter geladen";
        }

        // Dirty tracking
        sheetRootEl.addEventListener("input", markDirty);

        setStatus("Sheet geladen ✅");
    }

    async function loadCharacter(id) {
        const cid = Number(id);
        if (!cid) {
            setStatus("Kein Charakter ausgewählt.");
            return;
        }

        try {
            setStatus("Lade Charakter…");

            const c = await API.getCharacter(cid);

            // wichtig: globaler State für Save + optimistic locking
            currentCharacterId = c.id;
            currentCharacterUpdatedAt = c.updated_at;

            console.log("CHAR:", c);
            console.log("SET updated_at from loadCharacter:", currentCharacterUpdatedAt);
            console.log("DATA:", c.data);

            try {
                jsonToSheet(c.data);

                const titleEl = document.getElementById("sheetTitle");
                if (titleEl) titleEl.textContent = c.name;

                renderOverlay(c.data);
                showOverlay();
            } catch (e) {
                console.error("Mapping/Overlay failed", e);
            }

            isDirty = false;
            btnSave.disabled = true;

            setStatus(`Geladen: ${c.name}`);
        } catch (e) {
            console.error(e);
            setStatus("Fehler beim Laden des Charakters ❌");
            alert("Fehler beim Laden des Charakters.");
        }
    }


    // ----- Admin UI -----
    function renderUserRow(u) {
        const row = document.createElement("div");
        row.className = "userRow";

        const meta = document.createElement("div");
        meta.className = "userMeta";
        meta.innerHTML = `
            <div class="userName">${escapeHtml(u.username)}</div>
            <div class="userId">ID: ${u.id}</div>
        `;

        const sel = document.createElement("select");
        sel.className = "select";
        ["player", "dm", "admin"].forEach(r => {
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
                sel.value = u.role; // rollback
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
            const confirmed = confirm(
                `User "${u.username}" wirklich löschen?`
            );
            if (!confirmed) return;

            btnDeleteUser.disabled = true;

            try {
                await API.deleteUser(u.id);
                await loadUsersIntoAdmin(); // Liste neu laden
            } catch (e) {
                console.error(e);
                alert(e?.message || "Löschen fehlgeschlagen.");
                btnDeleteUser.disabled = false;
            }
        });

        const actions = document.createElement("div");
        actions.className = "userActions";

// Reihenfolge bestimmt die vertikale Anordnung
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
            users.forEach(u => adminUsers.appendChild(renderUserRow(u)));
        } catch (e) {
            console.error(e);
            adminUsers.textContent = "Fehler beim Laden der User ❌";
        }
    }

    // ===== Auth =====
    async function refreshCurrentUserAndUI() {
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


    async function doLogin() {
        const username = prompt("Username");
        const password = prompt("Passwort");
        if (!username || !password) return;

        try {
            await API.login(username, password);
            setLoggedInUI(true);

            await refreshCurrentUserAndUI();
            applyRoleUI();

            setStatus("Eingeloggt ✅");
            await loadCharacters();

            // Optional: direkt den ausgewählten Charakter laden
            if (currentCharacterId) {
                await loadCharacter(currentCharacterId);
            }
        } catch (e) {
            console.error(e);
            alert("Login fehlgeschlagen");
            setStatus("Login fehlgeschlagen ❌");
        }
    }

    function doLogout() {
        API.token = null;
        location.reload();
    }

    // ===== Events =====
    btnMenu?.addEventListener("click", openDrawer);
    btnClose?.addEventListener("click", closeDrawer);
    backdrop?.addEventListener("click", closeDrawer);

    btnLogin?.addEventListener("click", doLogin);
    btnLogout?.addEventListener("click", doLogout);
    btnCreatePC?.addEventListener("click", () => handleCreate("pc"));
    btnCreateNPC?.addEventListener("click", () => handleCreate("npc"));
    toggleMine?.addEventListener("click", () => toggleSection(toggleMine, listMine));
    toggleNpcs?.addEventListener("click", () => toggleSection(toggleNpcs, listNpcs));


    btnDelete?.addEventListener("click", async () => {
        if (!currentCharacterId) return;

        const confirmed = confirm("Willst du diesen Charakter wirklich löschen?");
        if (!confirmed) return;

        try {
            await API.deleteCharacter(currentCharacterId);

            setCurrentCharacter(null);
            await loadCharacters();
            setStatus("Charakter gelöscht.");
        } catch (e) {
            setStatus(e.message);
            console.error(e);
        }
    });


    btnSave?.addEventListener("click", async () => {
        console.log("SENDING updated_at:", currentCharacterUpdatedAt);

        if (!currentCharacterId) {
            setStatus("Kein Charakter geladen.");
            return;
        }

        try {
            setStatus("Speichere…");

            const data = sheetToJson();
            console.log("PAYLOAD", data);

            const res = await API.patchCharacter(currentCharacterId, {
                data,
                updated_at: currentCharacterUpdatedAt
            });

            // wichtig: neuen Stand übernehmen
            currentCharacterUpdatedAt = res.updated_at;

            console.log("PATCH RESULT", res);

            isDirty = false;
            btnSave.disabled = true;
            setStatus("Gespeichert ✅");
        } catch (e) {
            console.error("SAVE ERROR", e);

            if (String(e).includes("409")) {
                alert("Konflikt: Der Charakter wurde zwischenzeitlich geändert. Ich lade neu.");
                await loadCharacter(currentCharacterId); // setzt updated_at neu
                return;
            }

            setStatus("Speichern fehlgeschlagen ❌ (siehe Console)");
            alert(String(e));
        }
    });
    btnActions?.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleActionsMenu();
    });

    document.addEventListener("click", () => closeActionsMenu());


    btnAdmin?.addEventListener("click", async () => {
        closeDrawer();
        showAdminPanel(true);
        await loadUsersIntoAdmin();
    });

    btnReloadUsers?.addEventListener("click", loadUsersIntoAdmin);

    // ===== Startup =====
    (async function startup() {
        try {
            await loadSheetTemplateOnce();

            if (API.token) {
                setLoggedInUI(true);

                // currentUser laden (für Admin-Button etc.)
                await refreshCurrentUserAndUI();
                applyRoleUI();

                await loadCharacters();

                if (currentCharacterId) {
                    try {
                        await loadCharacter(currentCharacterId);
                    } catch (e) {
                        if (e?.status === 404) {
                            console.warn("Last character not found/visible, clearing selection.");
                            setCurrentCharacter(null);
                            setStatus("Letzter Charakter nicht verfügbar – bitte neu wählen.");
                        } else {
                            console.error("Auto-load last character failed", e);
                            setStatus("Letzten Charakter konnte ich nicht laden – bitte im Drawer wählen.");
                            setCurrentCharacter(null);
                        }
                    }

                }

                setStatus("Bereit ✅");
            } else {
                setLoggedInUI(false);
                applyRoleUI();
                setAdminVisible(false);
                renderDrawerTitle();
                setStatus("UI bereit ✅");
            }
        } catch (e) {
            // Token ungültig oder Startup-Fehler
            console.error(e);

            // Token nur killen, wenn es wirklich Auth ist
            if (e?.status === 401) {
                API.token = null;
                setStatus("Token ungültig – bitte neu einloggen");
            } else {
                setStatus("Startup-Fehler – bitte Konsole prüfen");
            }

            setLoggedInUI(false);
            setAdminVisible(false);
        }
    })();


})();
