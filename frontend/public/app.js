// 0 DOM: Welche HTML-Elemente benutzt werden
//
// 1 State: Welche Variablen den Zustand definieren
//
// 2 UI/Helper: Reine Anzeige/kleine Tools
// 2a Derived Calculations (Skills, Mods, etc.)
//
// 3 Characters: Laden/Anzeigen/Erstellen/Löschen
//
// 4 Admin: Userliste, Rollen, freischalten
//
// 5 Auth: login/register/me()
//
// 6 Events: “Button klickt → Funktion”
//
// 7 Startup: App bootet, Sheet lädt, Token-check, Auto-load


import { API } from "./api.js";
import { jsonToSheet, sheetToJson } from "./mapper.js";
import { buildSheetNav } from "/nav.js";

(function () {
    // ============================================================
    // 0) DOM-REFERENZEN (UI-ELEMENTE)
    //    -> Hier sammeln wir ALLE Elemente, die wir anfassen.
    //    -> Vorteil: Wenn ein Button fehlt, merkst du es sofort hier.
    // ============================================================

    // Drawer / Navigation
    const drawer = document.getElementById("drawer");
    const backdrop = document.getElementById("backdrop");
    const btnMenu = document.getElementById("btnMenu");
    const btnClose = document.getElementById("btnCloseDrawer");

    // Actions Menu
    const btnActions = document.getElementById("btnActions");
    const actionsMenu = document.getElementById("actionsMenu");

    // Status + Hauptaktionen
    const statusEl = document.getElementById("appStatus");
    const btnSave = document.getElementById("btnSave");
    const btnLogin = document.getElementById("btnLogin");
    const btnLogout = document.getElementById("btnLogout");

    // Charakterlisten + Toggle
    const listMine = document.getElementById("listMine");
    const listNpcs = document.getElementById("listNpcs");
    const toggleMine = document.getElementById("toggleMine");
    const toggleNpcs = document.getElementById("toggleNpcs");
    const toggleActions = document.getElementById("toggleActions");


    // Admin-Bereich
    const btnAdmin = document.getElementById("btnAdmin");
    const adminPanel = document.getElementById("adminPanel");
    const adminUsers = document.getElementById("adminUsers");
    const btnReloadUsers = document.getElementById("btnReloadUsers");

    // Sheet Container
    const sheetRootEl = document.getElementById("sheetRoot");

    // Character Actions
    const btnDelete = document.getElementById("btnDelete");
    const btnCreatePC = document.getElementById("btnCreatePC");
    const btnCreateNPC = document.getElementById("btnCreateNPC");

    // Register / Auth Panel
    const btnRegister = document.getElementById("btnRegister");
    const authPanel = document.getElementById("authPanel");
    const authUsername = document.getElementById("authUsername");
    const authPassword = document.getElementById("authPassword");
    const btnAuthDoRegister = document.getElementById("btnAuthDoRegister");
    const btnAuthCancel = document.getElementById("btnAuthCancel");

    // Right Nav Drawer (Section Navigation)
    const navDrawer = document.getElementById("navDrawer");
    const navBackdrop = document.getElementById("navBackdrop");
    const btnNavOpen = document.getElementById("btnNavOpen");
    const btnNavClose = document.getElementById("btnNavClose");
    const navList = document.getElementById("navList");
    // ============================================================
    // 1) APP-STATE (ZUSTAND)
    //    -> Diese Variablen sind die “Wahrheit” der App.
    //    -> UI-Render + API-Calls richten sich danach.
    // ============================================================

    let currentCharacterId = Number(localStorage.getItem("dnd_current_character_id")) || null;
    let currentCharacterUpdatedAt = null; // wichtig für Optimistic Locking
    let isDirty = false;                  // ob Sheet ungespeicherte Änderungen hat
    let currentUser = null;               // Ergebnis von API.me()
    let autosaveTimer = null;
    let isSaving = false;

    // ============================================================
    // 2) UI/HELPER (KLEINE BAUSTEINE)
    //    -> Alles was: Text setzt, Panels zeigt, Menüs toggelt, etc.
    //    -> Keine API-Calls hier drin (möglichst).
    // ============================================================

    function setStatus(msg) {
        if (!statusEl) return;
        statusEl.textContent = msg;
    }

    function escapeHtml(s) {
        return String(s)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function renderDrawerTitle() {
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


    function showAuthPanel(show) {
        if (!authPanel) return;
        authPanel.hidden = !show;

        if (show) {
            authUsername?.focus();
        } else {
            authUsername.value = "";
            authPassword.value = "";
        }
    }

    function setSectionOpen(toggleBtn, listEl, open) {
        if (!toggleBtn || !listEl) return;
        toggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
        listEl.hidden = !open;
    }

    function bindSectionToggle(toggleBtn, listEl, defaultOpen) {
        if (!toggleBtn || !listEl) return;

        // verhindert doppelte Bindings (passiert schnell bei Re-Init / Multi-Page / Hot Reload)
        if (toggleBtn.dataset.bound === "1") return;
        toggleBtn.dataset.bound = "1";

        // Initialzustand
        setSectionOpen(toggleBtn, listEl, defaultOpen);

        toggleBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const isOpen = toggleBtn.getAttribute("aria-expanded") === "true";
            setSectionOpen(toggleBtn, listEl, !isOpen);

            console.log("[drawer-toggle]", toggleBtn.id, "open=", !isOpen, "hidden=", listEl.hidden);
        });
    }

    function openDrawer() {
        drawer?.classList.add("is-open");
        drawer?.setAttribute("aria-hidden", "false");
        if (backdrop) backdrop.hidden = false;

        document.getElementById("btnCloseDrawer")?.focus();
    }

    function openNavDrawer() {
        // optional: linken Drawer schließen, damit nicht zwei Schränke gleichzeitig umfallen
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

    function closeDrawer() {
        // Fokus raus aus dem Drawer, BEVOR aria-hidden=true gesetzt wird
        document.getElementById("btnMenu")?.focus();

        drawer?.classList.remove("is-open");
        drawer?.setAttribute("aria-hidden", "true");
        if (backdrop) backdrop.hidden = true;
    }

    function closeActionsMenu() {
    }

    function markDirty() {
        isDirty = true;
        btnSave.disabled = false;
        setStatus("Ungespeicherte Änderungen ⚠");
        scheduleAutoSave();
        console.log("[dirty] scheduled autosave", { currentCharacterId, isDirty });
    }

    function scheduleAutoSave() {
        if (!currentCharacterId) return;
        if (!isDirty) return;

        if (autosaveTimer) clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(() => {
            autosaveTimer = null;
            doAutoSave();
            scheduleAutoSave();
        }, 800);
    }

    function setCurrentCharacter(id) {
        currentCharacterId = id ? Number(id) : null;

        if (currentCharacterId) {
            localStorage.setItem("dnd_current_character_id", String(currentCharacterId));

            // Alias für andere Seiten/Module (z.B. spells.js)
            localStorage.setItem("selectedCharacterId", String(currentCharacterId));
        } else {
            localStorage.removeItem("dnd_current_character_id");
            localStorage.removeItem("selectedCharacterId");
        }

        btnSave.disabled = true;
        if (btnDelete) btnDelete.disabled = !currentCharacterId;
    }

    function setDisplay(el, value) {
        if (!el) return;
        el.style.display = value;
    }

    function setLoggedInUI(isLoggedIn) {
        setDisplay(btnLogin, isLoggedIn ? "none" : "inline-block");
        setDisplay(btnLogout, isLoggedIn ? "inline-block" : "none");

        if (btnSave) btnSave.disabled = true; // erst aktiv wenn dirty

        // Create/Delete nur wenn eingeloggt
        if (btnCreatePC) btnCreatePC.disabled = !isLoggedIn;
        if (btnDelete) btnDelete.disabled = !isLoggedIn || !currentCharacterId;

        // Drawer/Menu nur wenn eingeloggt
        setDisplay(btnMenu, isLoggedIn ? "inline-block" : "none");
        setDisplay(btnActions, isLoggedIn ? "inline-block" : "none");

        // ✅ Right-Nav-Button nur wenn eingeloggt
        setDisplay(btnNavOpen, isLoggedIn ? "inline-block" : "none");
        if (!isLoggedIn) closeNavDrawer?.();

        // Sheet anzeigen/verstecken
        if (sheetRootEl) sheetRootEl.style.display = isLoggedIn ? "" : "none";

        // Actions Menu Button
        setDisplay(btnActions, isLoggedIn ? "inline-block" : "none");
        if (!isLoggedIn) closeActionsMenu();

        // Register Button
        setDisplay(btnRegister, isLoggedIn ? "none" : "inline-block");
        if (!isLoggedIn) showAuthPanel(false);
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

    function setAdminVisible(isAdmin) {
        if (btnAdmin) btnAdmin.hidden = !isAdmin;
        if (!isAdmin && adminPanel) adminPanel.hidden = true;
    }

    function showAdminPanel(show) {
        if (!adminPanel) return;
        adminPanel.hidden = !show;
    }

    function getNum(id, fallback = 0) {
        const el = document.getElementById(id);
        if (!el) return fallback;
        const v = Number(el.value);
        return Number.isFinite(v) ? v : fallback;
    }

    /**function setVal(id, value) {
     const el = document.getElementById(id);
     if (!el) return;

     const next = String(value);
     if (el.value === next) return; // kein Spam

     el.value = next;

     // Wichtig: programmatic changes sollen genauso reagieren wie User-Input
     el.dispatchEvent(new Event("input", {bubbles: true}));
     el.dispatchEvent(new Event("change", {bubbles: true}));
     }*/

    function setDerivedVal(id, value) {
        const el = document.getElementById(id);
        if (!el) return;

        const next = String(value);
        if (el.value === next) return;
        el.value = next; // keine Events!
    }

    function isChecked(id) {
        const el = document.getElementById(id);
        return !!el && el.checked;
    }

    function scrollToHashIfPresent() {
        const hash = window.location.hash;
        if (!hash || hash.length < 2) return;

        const id = decodeURIComponent(hash.slice(1));
        const target = document.getElementById(id);
        if (!target) return;

        // Fokus + Scroll (CSS scroll-margin-top greift hier perfekt)
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        target.focus?.({ preventScroll: true });
    }

    /**
     * Falls das Sheet async geladen wird (Template in #sheetRoot),
     * kann der Anchor beim ersten Versuch noch nicht existieren.
     * Dann versuchen wir es kurz erneut.
     */
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
    // 2a) Sheet Calculations
    // ============================================================

    function abilityMod(score) {
        // DnD 5e: floor((score - 10) / 2)
        return Math.floor((score - 10) / 2);
    }

    const SKILLS = [
        // STR
        { key: "athletics", ability: "str", profId: "skill_athletics_prof", outId: "skill_athletics" },

        // DEX
        { key: "acrobatics", ability: "dex", profId: "skill_acrobatics_prof", outId: "skill_acrobatics" },
        { key: "sleight_of_hand", ability: "dex", profId: "skill_sleight_of_hand_prof", outId: "skill_sleight_of_hand" },
        { key: "stealth", ability: "dex", profId: "skill_stealth_prof", outId: "skill_stealth" },

        // INT
        { key: "arcana", ability: "int", profId: "skill_arcana_prof", outId: "skill_arcana" },
        { key: "history", ability: "int", profId: "skill_history_prof", outId: "skill_history" },
        { key: "investigation", ability: "int", profId: "skill_investigation_prof", outId: "skill_investigation" },
        { key: "nature", ability: "int", profId: "skill_nature_prof", outId: "skill_nature" },
        { key: "religion", ability: "int", profId: "skill_religion_prof", outId: "skill_religion" },

        // WIS
        { key: "animal_handling", ability: "wis", profId: "skill_animal_handling_prof", outId: "skill_animal_handling" },
        { key: "insight", ability: "wis", profId: "skill_insight_prof", outId: "skill_insight" },
        { key: "medicine", ability: "wis", profId: "skill_medicine_prof", outId: "skill_medicine" },
        { key: "perception", ability: "wis", profId: "skill_perception_prof", outId: "skill_perception" },
        { key: "survival", ability: "wis", profId: "skill_survival_prof", outId: "skill_survival" },

        // CHA
        { key: "deception", ability: "cha", profId: "skill_deception_prof", outId: "skill_deception" },
        { key: "intimidation", ability: "cha", profId: "skill_intimidation_prof", outId: "skill_intimidation" },
        { key: "performance", ability: "cha", profId: "skill_performance_prof", outId: "skill_performance" },
        { key: "persuasion", ability: "cha", profId: "skill_persuasion_prof", outId: "skill_persuasion" },
    ];
    const SAVES = [
        { ability: "str", profId: "save_str_prof", outId: "save_str" },
        { ability: "dex", profId: "save_dex_prof", outId: "save_dex" },
        { ability: "con", profId: "save_con_prof", outId: "save_con" },
        { ability: "int", profId: "save_int_prof", outId: "save_int" },
        { ability: "wis", profId: "save_wis_prof", outId: "save_wis" },
        { ability: "cha", profId: "save_cha_prof", outId: "save_cha" },
    ];

    function recalcSaves() {
        const pb = getNum("proficiency_bonus", 0);

        const abilityMods = {
            str: abilityMod(getNum("str", 10)),
            dex: abilityMod(getNum("dex", 10)),
            con: abilityMod(getNum("con", 10)),
            int: abilityMod(getNum("int", 10)),
            wis: abilityMod(getNum("wis", 10)),
            cha: abilityMod(getNum("cha", 10)),
        };

        for (const s of SAVES) {
            const base = abilityMods[s.ability] ?? 0;
            const val = base + (isChecked(s.profId) ? pb : 0);
            setDerivedVal(s.outId, val);
        }
    }

    function recalcSkills() {
        const pb = getNum("proficiency_bonus", 0);

        // Ability mods aus den Scores
        const abilityMods = {
            str: abilityMod(getNum("str", 10)),
            dex: abilityMod(getNum("dex", 10)),
            con: abilityMod(getNum("con", 10)),
            int: abilityMod(getNum("int", 10)),
            wis: abilityMod(getNum("wis", 10)),
            cha: abilityMod(getNum("cha", 10)),
        };

        for (const s of SKILLS) {
            const base = abilityMods[s.ability] ?? 0;
            const val = base + (isChecked(s.profId) ? pb : 0);
            setDerivedVal(s.outId, val);
        }
    }

    function recalcPassives() {
        const perception = getNum("skill_perception", 0);
        const investigation = getNum("skill_investigation", 0);
        const insight = getNum("skill_insight", 0);

        setDerivedVal("passive_perception", 10 + perception);
        setDerivedVal("passive_investigation", 10 + investigation);
        setDerivedVal("passive_insight", 10 + insight);
    }

    function recalcAbilities() {
        const scores = {
            str: getNum("str", 10),
            dex: getNum("dex", 10),
            con: getNum("con", 10),
            int: getNum("int", 10),
            wis: getNum("wis", 10),
            cha: getNum("cha", 10),
        };

        for (const [ability, score] of Object.entries(scores)) {
            setDerivedVal(`${ability}_mod`, abilityMod(score));
        }
    }

    function recalcDerived() {
        recalcAbilities();
        recalcSkills();
        recalcSaves();
        recalcPassives();
    }

    function bindSkillAutoCalc() {
        const ids = [
            "proficiency_bonus",
            "str", "dex", "con", "int", "wis", "cha",
            ...SKILLS.flatMap(s => [s.profId]),
            ...SAVES.flatMap(s => [s.profId]),
        ];

        for (const id of ids) {
            const el = document.getElementById(id);
            if (!el) continue;

            if (el.type === "checkbox") {
                el.addEventListener("change", recalcDerived);
            } else {
                el.addEventListener("input", recalcDerived);
                el.addEventListener("change", recalcDerived);
            }
        }

        recalcDerived();
    }

    function toNum(v) {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    }

    function getVal(id) {
        return document.getElementById(id)?.value ?? "";
    }

    let recalcAttacks = null;

    function bindAttackAutoCalc() {
        const attackCount = 5;

        function recalcAttack(i) {
            const abil = getVal(`attack_${i}_abil`);
            const pb = toNum(getVal("proficiency_bonus"));
            const misc = toNum(getVal(`attack_${i}_misc`));
            const prof = !!document.getElementById(`attack_${i}_prof`)?.checked;
            const mod = abil ? toNum(getVal(`${abil}_mod`)) : 0;

            setDerivedVal(`attack_${i}_bonus`, mod + (prof ? pb : 0) + misc);
        }

        recalcAttacks = function () {
            for (let i = 1; i <= attackCount; i++) recalcAttack(i);
        };

        document.getElementById("proficiency_bonus")?.addEventListener("input", recalcAttacks);
        ["str", "dex", "con", "int", "wis", "cha"].forEach(a => {
            document.getElementById(a)?.addEventListener("input", recalcAttacks);
        });

        for (let i = 1; i <= attackCount; i++) {
            document.getElementById(`attack_${i}_abil`)?.addEventListener("change", recalcAttacks);
            document.getElementById(`attack_${i}_prof`)?.addEventListener("change", recalcAttacks);
            document.getElementById(`attack_${i}_misc`)?.addEventListener("input", recalcAttacks);
        }

        recalcAttacks();
    }


    // ============================================================
    // 3) DATA-FLOW: CHARAKTERE (API + RENDER)
    //    -> Alles was mit Characters laden/anzeigen/erstellen/löschen zu tun hat
    // ============================================================

    async function handleCreate(kind) {
        const name = prompt(kind === "npc" ? "Name des NPC:" : "Name des Charakters:");
        if (!name) return;

        const payload = {
            name: name.trim(),
            kind, // "pc" oder "npc"
            data: { schema_version: 1 }, // minimal, später erweitern
        };

        try {
            const created = await API.createCharacter(payload);
            setCurrentCharacter(created.id);

            // Liste neu laden und neuen Character auswählen
            await loadCharacters();
            await loadCharacter(created.id);

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

    async function loadCharacters() {
        if (!listMine || !listNpcs) return;

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
            const kind = escapeHtml((c.kind ?? "").toUpperCase()); // PC/NPC
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
                    loadCharacter(c.id).catch(async () => {
                        setCurrentCharacter(null);
                        await loadCharacters();
                        setStatus("Charakter nicht verfügbar oder kein Zugriff.");
                    });
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

    async function loadCharacter(id) {
        const cid = Number(id);
        if (!cid) {
            setStatus("Kein Charakter ausgewählt.");
            return;
        }

        try {
            setStatus("Lade Charakter…");

            const c = await API.getCharacter(cid);

            // Globaler State für Save + Optimistic Locking
            currentCharacterId = c.id;
            currentCharacterUpdatedAt = c.updated_at;

            console.log("CHAR:", c);
            console.log("SET updated_at from loadCharacter:", currentCharacterUpdatedAt);

            try {
                jsonToSheet(c.data);
                recalcDerived();
                recalcAttacks?.();

                const titleEl = document.getElementById("sheetTitle");
                if (titleEl) titleEl.textContent = c.name;
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

    async function saveCurrentCharacter({ silent = false } = {}) {
        if (!currentCharacterId) return;

        if (isSaving) return; // kein Parallel-Save
        isSaving = true;

        try {
            if (!silent) setStatus("Speichere…");

            const data = sheetToJson();

            const res = await API.patchCharacter(currentCharacterId, {
                data,
                updated_at: currentCharacterUpdatedAt,
            });

            currentCharacterUpdatedAt = res.updated_at;
            isDirty = false;
            btnSave.disabled = true;
            setStatus(silent ? "Auto-gespeichert ✅" : "Gespeichert ✅");
            setTimeout(() => {
                if (!isDirty) setStatus("Bereit ✅");
            }, 1200);

            if (!silent) setStatus("Gespeichert ✅");
            else setStatus("Auto-Save ✅");
        } catch (e) {
            console.error("SAVE ERROR", e);

            if (String(e).includes("409")) {
                alert("Konflikt: Der Charakter wurde zwischenzeitlich geändert. Ich lade neu.");
                await loadCharacter(currentCharacterId);
                return;
            }

            setStatus("Speichern fehlgeschlagen ❌ (siehe Console)");
        } finally {
            isSaving = false;
        }
    }

    function doAutoSave() {
        // silent, damit es nicht ständig “Speichere…” flackert
        saveCurrentCharacter({ silent: true });
    }

    // ============================================================
    // 4) ADMIN UI: USER MANAGEMENT (nur Admin)
    //    -> Rendern, Rollen setzen, aktivieren, löschen
    // ============================================================

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
            const confirmed = confirm(`User "${u.username}" wirklich löschen?`);
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

    // ============================================================
    // 5) AUTH: LOGIN / REGISTER / CURRENT USER LADEN
    //    -> Token ist in API.js (localStorage), hier nur Workflow.
    // ============================================================

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

            // Wenn wir auf der Landing-/Index-Seite sind → direkt ins Sheet wechseln
            const isIndexPage =
                location.pathname === "/" ||
                location.pathname.endsWith("/index") ||
                location.pathname.endsWith("/index.html");

            if (isIndexPage) {
                window.location.href = "/sheet.html";
                return;
            }

            // Ab hier nur noch für sheet.html relevant
            setLoggedInUI(true);
            await refreshCurrentUserAndUI();
            applyRoleUI();

            setStatus("Eingeloggt ✅");

            const chars = await loadCharacters();

            // Auto-load last selected character (wenn er noch existiert)
            if (currentCharacterId) {
                const exists = Array.isArray(chars) && chars.some((c) => Number(c.id) === Number(currentCharacterId));

                if (exists) {
                    await loadCharacter(currentCharacterId);
                } else {
                    setCurrentCharacter(null);
                    setStatus("Letzter Charakter nicht verfügbar – bitte neu wählen.");
                }
            }
        } catch (e) {
            console.error(e);
            alert(e?.message || "Login fehlgeschlagen");
            setStatus(e?.message || "Login fehlgeschlagen ❌");
        }
    }

    function doLogout() {
        API.token = null;
        location.reload();
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
    // 6) EVENTS: BUTTONS / KLICKS / UI-INTERAKTION
    //    -> Hier wird nur verdrahtet: “wenn klick, dann Funktion”.
    // ============================================================

    // Drawer
    btnMenu?.addEventListener("click", openDrawer);
    btnClose?.addEventListener("click", closeDrawer);
    backdrop?.addEventListener("click", closeDrawer);

    // Right nav drawer
    btnNavOpen?.addEventListener("click", openNavDrawer);
    btnNavClose?.addEventListener("click", closeNavDrawer);
    navBackdrop?.addEventListener("click", closeNavDrawer);

    // Auth Buttons
    btnLogin?.addEventListener("click", doLogin);
    btnLogout?.addEventListener("click", doLogout);

    btnRegister?.addEventListener("click", () => showAuthPanel(authPanel.hidden));
    btnAuthCancel?.addEventListener("click", () => showAuthPanel(false));
    btnAuthDoRegister?.addEventListener("click", doRegister);

    // Characters
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
            console.error(e);
            setStatus(e.message);
        }
    });

    // Save (inkl. Optimistic Locking)
    btnSave?.addEventListener("click", async () => {
        await saveCurrentCharacter({ silent: false });
    });

    // Initial Drawer Sections
    bindSectionToggle(toggleMine, listMine, true);
    bindSectionToggle(toggleNpcs, listNpcs, false);
    bindSectionToggle(toggleActions, actionsMenu, true);

    // Admin
    btnAdmin?.addEventListener("click", async () => {
        closeDrawer();
        showAdminPanel(true);
        await loadUsersIntoAdmin();
    });
    btnReloadUsers?.addEventListener("click", loadUsersIntoAdmin);

    // ============================================================
    // 7) STARTUP: APP INITIALISIEREN
    //    -> Sheet laden, token prüfen, user/characters laden.
    // ============================================================

    (async function startup() {
        try {
            const isIndexPage =
                location.pathname === "/" ||
                location.pathname.endsWith("/index") ||
                location.pathname.endsWith("/index.html");

            const isSheetPage = location.pathname.endsWith("/sheet.html");
            const isSpellPage = location.pathname.endsWith("/spell.html");

            // ===== Index / Landing =====
            if (isSpellPage) {
                buildSheetNav({ navList, btnNavOpen, closeNavDrawer, sheetRootEl });
                scrollToHashWithRetry();
                setLoggedInUI(!!API.token);

                const cid =
                    localStorage.getItem("dnd_current_character_id") ||
                    localStorage.getItem("selectedCharacterId");

                console.log("[spell] current character id =", cid);

                if (!cid) {
                    setStatus?.("Kein Charakter gewählt – bitte erst im Sheet auswählen.");
                }
                return;
            }

            // ===== Spells =====
            if (isSpellPage) {
                buildSheetNav({ navList, btnNavOpen, closeNavDrawer, sheetRootEl });
                scrollToHashWithRetry();
                setLoggedInUI(!!API.token);
                return;
            }

            // ===== Sheet =====
            if (isSheetPage) {
                buildSheetNav({ navList, btnNavOpen, closeNavDrawer, sheetRootEl });
                scrollToHashWithRetry();

                bindSkillAutoCalc();
                bindAttackAutoCalc();
                sheetRootEl?.addEventListener("input", markDirty);
                sheetRootEl?.addEventListener("change", markDirty);
                // kein return -> danach gemeinsamer Auth-Flow
            } else {
                // unbekannte Seite: defensiv
                setLoggedInUI(!!API.token);
                setStatus("Unbekannte Seite – keine Initialisierung.");
                return;
            }

            // ===== Gemeinsamer Auth/Character Flow (nur Sheet) =====
            if (API.token) {
                setLoggedInUI(true);

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
            console.error(e);

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
    window.addEventListener("hashchange", () => {
        scrollToHashWithRetry();
    });
})
    ();
