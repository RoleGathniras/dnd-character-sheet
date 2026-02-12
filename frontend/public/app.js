import {API} from "./api.js";
import {jsonToSheet, sheetToJson} from "./mapper.js";
import {renderOverlay, toggleOverlay, showOverlay} from "./overlay.js";

(function () {

    // ===== Elements =====
    const drawer = document.getElementById("drawer");
    const backdrop = document.getElementById("backdrop");
    const btnMenu = document.getElementById("btnMenu");
    const btnClose = document.getElementById("btnCloseDrawer");

    const statusEl = document.getElementById("appStatus");
    const btnLoad = document.getElementById("btnLoad");
    const btnSave = document.getElementById("btnSave");
    const btnLogin = document.getElementById("btnLogin");
    const btnLogout = document.getElementById("btnLogout");

    const listMine = document.getElementById("listMine");
    const listNpcs = document.getElementById("listNpcs");
    const characterSelect = document.getElementById("characterSelect");

    const btnAdmin = document.getElementById("btnAdmin");
    const adminPanel = document.getElementById("adminPanel");
    const adminUsers = document.getElementById("adminUsers");
    const btnReloadUsers = document.getElementById("btnReloadUsers");

    const sheetRootEl = document.getElementById("sheetRoot");
    const btnDelete = document.getElementById("btnDelete");


    // ===== State =====
    let currentCharacterId = Number(localStorage.getItem("dnd_current_character_id")) || null;
    let isDirty = false;
    let currentCharacterUpdatedAt = null;

    let currentUser = null;

    // ===== Helpers =====
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

        // Buttons erst sinnvoll, wenn ein Character gewählt ist
        btnLoad.disabled = !isLoggedIn || !currentCharacterId;
        btnSave.disabled = true; // erst aktiv wenn dirty
    }

    function setCurrentCharacter(id) {
        currentCharacterId = id ? Number(id) : null;

        if (currentCharacterId) {
            localStorage.setItem("dnd_current_character_id", String(currentCharacterId));
        } else {
            localStorage.removeItem("dnd_current_character_id");
        }

        if (characterSelect) {
            characterSelect.value = currentCharacterId ? String(currentCharacterId) : "";
        }

        btnLoad.disabled = !currentCharacterId;
        btnSave.disabled = true;
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
    async function loadCharacters() {
        if (!listMine || !listNpcs) return;

        listMine.innerHTML = "";
        listNpcs.innerHTML = "";

        if (characterSelect) {
            characterSelect.innerHTML = "";
            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.textContent = "(Charakter wählen)";
            characterSelect.appendChild(placeholder);
        }

        const chars = await API.characters();

        for (const c of chars) {
            // Drawer Button
            const b = document.createElement("button");
            b.className = "drawer__item";
            const owner = c.owner_username ? ` – ${c.owner_username}` : "";
            b.textContent = `${c.name} (${c.kind})${owner}`;


            b.addEventListener("click", async () => {
                setCurrentCharacter(c.id);
                closeDrawer();
                showAdminPanel(false);

                try {
                    await loadCharacter(c.id);
                } catch (e) {
                    // Wenn Character nicht sichtbar/weg: Auswahl zurücksetzen und Liste neu laden
                    setCurrentCharacter(null); // oder "" je nach eurer Implementierung
                    // optional: localStorage remove, falls setCurrentCharacter das nicht macht
                    // localStorage.removeItem("selectedCharacterId");

                    await loadCharacters();
                    setStatus?.("Charakter nicht verfügbar oder kein Zugriff.");
                }
            });


            if (c.kind === "npc") listNpcs.appendChild(b);
            else listMine.appendChild(b);

            // Dropdown Option (Fallback)
            if (characterSelect) {
                const opt = document.createElement("option");
                opt.value = String(c.id);
                opt.textContent = `${c.name} (${c.kind})`;
                characterSelect.appendChild(opt);
            }
        }

        // Auto-select first character if none selected
        if (!currentCharacterId && chars.length > 0) {
            setCurrentCharacter(chars[0].id);
            setStatus(`Charaktere geladen: ${chars.length} (1 ausgewählt)`);
            btnLoad.disabled = false;
        } else {
            setStatus(`Charaktere geladen: ${chars.length}`);
        }
    }

    async function loadSheetTemplateOnce() {
        if (!sheetRootEl) return;

        const res = await fetch("/sheet.html");
        if (!res.ok) {
            sheetRootEl.innerHTML = "<p>Sheet konnte nicht geladen werden ❌</p>";
            return;
        }

        sheetRootEl.innerHTML = await res.text();

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
                renderOverlay(c.data);
                showOverlay();
            } catch (e) {
                console.error("Mapping/Overlay failed", e);
            }

            isDirty = false;
            btnSave.disabled = true;

            setStatus(`Geladen: ${c.name} (${c.kind})`);
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

        row.append(meta, sel, btnSaveRole);
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
            setAdminVisible(currentUser?.role === "admin");
        } catch (e) {
            // Token vermutlich invalid
            console.error(e);
            currentUser = null;
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

    characterSelect?.addEventListener("change", async () => {
        const id = characterSelect.value;
        setCurrentCharacter(id);
        showAdminPanel(false);
        if (currentCharacterId) await loadCharacter(currentCharacterId);
    });

    btnLoad?.addEventListener("click", async () => {
        if (!currentCharacterId) return;
        showAdminPanel(false);
        await loadCharacter(currentCharacterId);
    });

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

                await loadCharacters();

                if (currentCharacterId) {
                    try {
                        await loadCharacter(currentCharacterId);
                    } catch (e) {
                        if (e?.status === 404) {
                            console.warn("Last character not found/visible, clearing selection.");
                            setCurrentCharacter(null); // oder "" je nach eurer Implementierung
                            setStatus("Letzter Charakter nicht verfügbar – bitte neu wählen.");
                        } else {
                            // alles andere ist ein echter Fehler → nach außen werfen
                            throw e;
                        }
                    }
                }

                setStatus("Bereit ✅");
            } else {
                setLoggedInUI(false);
                setAdminVisible(false);
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
