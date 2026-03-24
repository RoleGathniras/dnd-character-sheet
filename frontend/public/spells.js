// frontend/public/spells.js
// UI-only: Spell Tabs + Slots + Spellbook + Panel + Description (In-Memory)
import { API } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
    // 0 DOM: Welche HTML-Elemente benutzt werden
    const tabs = [...document.querySelectorAll(".tab[data-spell-level]")];
    const slotsEl = document.getElementById("spellSlots");
    const slotsCountInput = document.getElementById("spellSlotsCountInput");
    const spellbookList = document.getElementById("spellbookList");
    const btnAddSpell = document.getElementById("btnAddSpell");
    const spellPanelRows = document.getElementById("spellPanelRows");
    const btnUseInPanel = document.getElementById("btnUseInPanel");
    const btnDeleteSpell = document.getElementById("btnDeleteSpell");
    const descBox = document.getElementById("spellDescriptionBox");
    const btnCloseDesc = document.getElementById("btnCloseSpellDesc");
    const spellDescTitle = document.getElementById("spellDescTitle");
    const spellDescText = document.getElementById("spellDescText");

    // Details-Inputs
    const sb_name = document.getElementById("sb_name");
    const sb_time = document.getElementById("sb_time");
    const sb_range = document.getElementById("sb_range");
    const sb_hit = document.getElementById("sb_hit");
    const sb_effect = document.getElementById("sb_effect");
    const sb_desc = document.getElementById("sb_desc");

    // Charakter Drawer
    const btnMenu = document.getElementById("btnMenu");
    const drawer = document.getElementById("drawer");
    const backdrop = document.getElementById("backdrop");
    const btnCloseDrawer = document.getElementById("btnCloseDrawer");
    const listMine = document.getElementById("listMine");
    const listNpcs = document.getElementById("listNpcs");
    const drawerActionsSection = document.getElementById("drawerActionsSection");
    const btnAdmin = document.getElementById("btnAdmin");

    // Defensive
    if (
        !tabs.length ||
        !slotsEl ||
        !slotsCountInput ||
        !spellbookList ||
        !btnAddSpell ||
        !spellPanelRows ||
        !btnUseInPanel ||
        !btnDeleteSpell ||
        !descBox ||
        !btnCloseDesc ||
        !spellDescTitle ||
        !spellDescText ||
        !sb_name ||
        !sb_time ||
        !sb_range ||
        !sb_hit ||
        !sb_effect ||
        !sb_desc ||

        !btnMenu ||
        !drawer ||
        !backdrop ||
        !btnCloseDrawer ||
        !listMine ||
        !listNpcs ||
        !drawerActionsSection ||
        !btnAdmin
    ) {
        console.warn("[spells.js] Missing required DOM elements. Script skipped.");
        return;
    }
    drawerActionsSection.hidden = true;
    btnAdmin.hidden = true;

    btnMenu.addEventListener("click", openDrawer);
    btnCloseDrawer.addEventListener("click", closeDrawer);
    backdrop.addEventListener("click", closeDrawer);
    // ----------------------------
    // Character Binding + Persist
    // ----------------------------

    const LEVELS = ["cantrip", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

    function emptyPersistSpells() {
        const slotCounts = {};
        const slotUsed = {};
        const spells = {};
        const panel = {};
        for (const lvl of LEVELS) {
            slotCounts[lvl] = 0;
            slotUsed[lvl] = [];
            spells[lvl] = [];
            panel[lvl] = [];
        }
        return {
            v: 1,
            slotCountsByLevel: slotCounts,
            slotUsedByLevel: slotUsed,
            spellsByLevel: spells,
            panelSpellsByLevel: panel
        };
    }

    // 1 State: Welche Variablen den Zustand definieren
    let currentLevel = "cantrip";
    let selectedSpellId = null;

    const slotCountsByLevel = {
        cantrip: 0,
        "1": 0,
        "2": 0,
        "3": 0,
        "4": 0,
        "5": 0,
        "6": 0,
        "7": 0,
        "8": 0,
        "9": 0,
    };

    // Merkt welche Slots "verbraucht" sind: { "1": Set([1,3]), ... }
    const slotUsedByLevel = {
        cantrip: new Set(),
        "1": new Set(),
        "2": new Set(),
        "3": new Set(),
        "4": new Set(),
        "5": new Set(),
        "6": new Set(),
        "7": new Set(),
        "8": new Set(),
        "9": new Set(),
    };

    // Zauber pro Grad (Spellbook)
    const spellsByLevel = {
        cantrip: [],
        "1": [],
        "2": [],
        "3": [],
        "4": [],
        "5": [],
        "6": [],
        "7": [],
        "8": [],
        "9": [],
    };

    // Panel pro Grad
    const panelSpellsByLevel = {
        cantrip: [],
        "1": [],
        "2": [],
        "3": [],
        "4": [],
        "5": [],
        "6": [],
        "7": [],
        "8": [],
        "9": [],
    };

    function applyPersist(persist) {
        const p = persist && typeof persist === "object" ? persist : emptyPersistSpells();

        for (const lvl of LEVELS) {
            slotCountsByLevel[lvl] = Math.max(0, Number(p.slotCountsByLevel?.[lvl] ?? 0));

            const usedArr = Array.isArray(p.slotUsedByLevel?.[lvl]) ? p.slotUsedByLevel[lvl] : [];
            slotUsedByLevel[lvl] = new Set(usedArr.map(Number).filter(Number.isFinite));

            spellsByLevel[lvl] = Array.isArray(p.spellsByLevel?.[lvl]) ? p.spellsByLevel[lvl] : [];
            panelSpellsByLevel[lvl] = Array.isArray(p.panelSpellsByLevel?.[lvl]) ? p.panelSpellsByLevel[lvl] : [];
        }
    }

    function toPersist() {
        const slotUsedObj = {};
        for (const lvl of LEVELS) {
            slotUsedObj[lvl] = [...(slotUsedByLevel[lvl] ?? new Set())].sort((a, b) => a - b);
        }
        return {
            v: 1,
            slotCountsByLevel: { ...slotCountsByLevel },
            slotUsedByLevel: slotUsedObj,
            spellsByLevel: structuredClone(spellsByLevel),
            panelSpellsByLevel: structuredClone(panelSpellsByLevel),
        };
    }


    function getSelectedCharacterId() {
        return (
            localStorage.getItem("dnd_current_character_id") ||
            localStorage.getItem("selectedCharacterId") ||
            ""
        );
    }


    // Character cache for optimistic locking
    let currentCharacter = null; // { id, data, updated_at, ... }
    let boundCharacterId = null; // Number | null
    // Debug-Expose (nur Dev)
    window.__spellDebug = {
        get currentCharacter() {
            return currentCharacter;
        },
        get boundCharacterId() {
            return boundCharacterId;
        },
        toPersist,
    };
    let saveTimer = null;
    let isSaving = false;
    let pendingSave = false;


    function getHttpStatus(err) {
        return (
            err?.status ??
            err?.response?.status ??
            err?.cause?.status ??
            err?.data?.status ??
            null
        );
    }

    function isConflict409(err) {
        const s = String(err ?? "");
        return (
            getHttpStatus(err) === 409 ||
            s.includes("409") ||
            s.includes("Conflict")
        );
    }

    function writeStateIntoCharacter() {
        if (!currentCharacter) return;
        currentCharacter.data = currentCharacter.data && typeof currentCharacter.data === "object" ? currentCharacter.data : {};
        currentCharacter.data.spells = toPersist();
    }

    function markDirtyAndScheduleSave() {
        writeStateIntoCharacter();
        pendingSave = true;

        if (!currentCharacter || !boundCharacterId) return;

        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            void saveNow();
        }, 650);
    }

    async function loadCharacterAndHydrate() {
        const id = getSelectedCharacterId();
        console.log("[spells.js] loadCharacterAndHydrate -> selectedCharacterId =", id);
        if (!id) {
            boundCharacterId = null;
            console.warn("[spells.js] No selected character id in localStorage. Running in-memory only.");
            applyPersist(emptyPersistSpells());
            renderSlots(getCountFor(currentLevel));
            renderSpellbook(currentLevel);
            renderPanel(currentLevel);
            const selectedSpell = getSelectedSpell();
            fillSpellDetails(selectedSpell);
            return;
        }

        try {
            const c = await API.getCharacter(Number(id));
            currentCharacter = c;
            boundCharacterId = c.id;

            const persist = c?.data?.spells ?? emptyPersistSpells();
            applyPersist(persist);
            renderSlots(getCountFor(currentLevel));
            renderSpellbook(currentLevel);
            renderPanel(currentLevel);
            const selectedSpell = getSelectedSpell();
            fillSpellDetails(selectedSpell);
        } catch (e) {
            boundCharacterId = null;
            console.error("[spells.js] Failed to load character. Running in-memory only.", e);
            applyPersist(emptyPersistSpells());
            renderSlots(getCountFor(currentLevel));
            renderSpellbook(currentLevel);
            renderPanel(currentLevel);
            const selectedSpell = getSelectedSpell();
            fillSpellDetails(selectedSpell);
        }
    }

    async function saveNow() {
        if (!currentCharacter) return;
        if (!pendingSave) return;
        if (isSaving) return;

        const selectedNow = Number(getSelectedCharacterId() || 0);
        if (!selectedNow || selectedNow !== boundCharacterId) {
            pendingSave = false;
            return;
        }

        isSaving = true;
        pendingSave = false;

        const id = Number(currentCharacter.id);

        try {
            writeStateIntoCharacter();

            const payload = {
                data: currentCharacter.data,
                updated_at: currentCharacter.updated_at,
            };

            currentCharacter = await API.patchCharacter(id, payload);
        } catch (e) {
            if (isConflict409(e)) {
                try {
                    const mySpells = toPersist();
                    const latest = await API.getCharacter(id);

                    latest.data = (latest.data && typeof latest.data === "object") ? latest.data : {};
                    latest.data.spells = mySpells;

                    const payload2 = { data: latest.data, updated_at: latest.updated_at };
                    currentCharacter = await API.patchCharacter(id, payload2);
                } catch (e2) {
                    console.error("[spells.js] Save failed after 409 retry.", e2);
                }
            } else {
                console.error("[spells.js] Save failed.", e);
            }
        } finally {
            isSaving = false;

            if (pendingSave) {
                if (saveTimer) clearTimeout(saveTimer);
                saveTimer = setTimeout(() => void saveNow(), 650);
            }
        }
    }


    // 2 UI/Helper: Reine Anzeige/kleine Tools
    function createEmptySpell() {
        return {
            id: crypto.randomUUID(),
            name: "",
            time: "",
            range: "",
            hit: "",
            effect: "",
            desc: "",
        };
    }

    function getSpellsFor(level) {
        return spellsByLevel[level] ?? [];
    }

    function getSelectedSpell(level) {
        if (!selectedSpellId) return null;
        const list = getSpellsFor(level);
        return list.find((s) => s.id === selectedSpellId) || null;
    }

    function getCountFor(level) {
        return Math.max(0, Number(slotCountsByLevel[level] ?? 0));
    }

    function setCountFor(level, n) {
        const val = Math.max(0, Number(n || 0));
        slotCountsByLevel[level] = val;

        // Wenn Count kleiner wird: "used" Set auf gültige Slots trimmen
        const used = slotUsedByLevel[level];
        for (const idx of [...used]) {
            if (idx > val) used.delete(idx);
        }
    }

    function hideDesc() {
        descBox.classList.add("is-hidden");
    }

    function showDescFromPanelSpell(spell) {
        spellDescTitle.textContent = spell?.name?.trim() || "Zauber";
        spellDescText.value = spell?.desc || "";
        descBox.classList.remove("is-hidden");
    }

    function clearSpellDetails() {
        sb_name.value = "";
        sb_time.value = "";
        sb_range.value = "";
        sb_hit.value = "";
        sb_effect.value = "";
        sb_desc.value = "";
    }

    function fillSpellDetails(spell) {
        if (!spell) {
            clearSpellDetails();
            return;
        }
        sb_name.value = spell.name || "";
        sb_time.value = spell.time || "";
        sb_range.value = spell.range || "";
        sb_hit.value = spell.hit || "";
        sb_effect.value = spell.effect || "";
        sb_desc.value = spell.desc || "";
    }

    function renderSlots(n) {
        slotsEl.innerHTML = "";
        slotsCountInput.value = n > 0 ? String(n) : "";

        if (n <= 0) {
            slotsEl.innerHTML =
                '<span class="muted small">Keine Slots (z.B. Zaubertricks) oder noch nicht definiert.</span>';
            return;
        }

        const usedSet = slotUsedByLevel[currentLevel] ?? new Set();

        for (let i = 1; i <= n; i++) {
            const id = `slot_${currentLevel}_${i}`;
            const label = document.createElement("label");
            label.className = "slot";

            const checked = usedSet.has(i) ? "checked" : "";

            label.innerHTML = `
        <input type="checkbox" id="${id}" ${checked} data-slot-index="${i}" />
        <span>${i}</span>
      `;

            const input = label.querySelector("input");
            input.addEventListener("change", () => {
                const idx = Number(input.dataset.slotIndex);
                if (input.checked) usedSet.add(idx);
                else usedSet.delete(idx);
                writeBackToCharacterData();
                markDirtyAndScheduleSave();
            });

            slotsEl.appendChild(label);
        }
    }

    function renderSpellbook(level) {
        const list = getSpellsFor(level);
        spellbookList.innerHTML = "";

        if (!list.length) {
            spellbookList.innerHTML =
                '<div class="spellbook__empty muted small">Keine Zauber im aktuellen Grad.</div>';
            return;
        }

        list.forEach((spell) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "spellbook__item btn btn--ghost";
            btn.textContent = spell.name?.trim() || "(Unbenannter Zauber)";
            btn.dataset.id = spell.id;

            if (spell.id === selectedSpellId) btn.classList.add("is-active");

            btn.addEventListener("click", () => {
                selectedSpellId = spell.id;
                renderSpellbook(level);
                fillSpellDetails(spell);
            });

            spellbookList.appendChild(btn);
        });
    }

    function renderPanel(level) {
        const list = panelSpellsByLevel[level] ?? [];
        spellPanelRows.innerHTML = "";

        if (!list.length) {
            spellPanelRows.innerHTML = `
        <tr class="rowHint">
          <td colspan="6" class="muted small">
            Noch leer. Zauber aus dem Zauberbuch hinzufügen.
          </td>
        </tr>
      `;
            return;
        }

        list.forEach((spell, idx) => {
            const tr = document.createElement("tr");
            tr.dataset.panelOpen = "1";
            tr.dataset.panelSpellId = spell.id;
            tr.innerHTML = `
        <td>${spell.name || "-"}</td>
        <td>${spell.time || "-"}</td>
        <td>${spell.range || "-"}</td>
        <td>${spell.hit || "-"}</td>
        <td>${escapeHtml(spell.effect || "-")}</td>
        <td class="cell-actions">
          <button type="button"
                  class="btn btn--ghost btn--mini"
                  data-panel-remove="${idx}"
                  aria-label="Zauber aus Panel entfernen">✕</button>
        </td>
      `;
            spellPanelRows.appendChild(tr);
        });
    }

    function writeBackToCharacterData() {
        writeStateIntoCharacter();
    }
    function escapeHtml(str) {
        return String(str)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;");
    }

    // 4 Admin
    // (n/a)

    // 5 Auth
    // (n/a)

    // 6 Events: “Button klickt → Funktion”
    function bindSpellDetailsInputs() {
        function applyPatch(patchFn) {
            const spell = getSelectedSpell(currentLevel);
            if (!spell) return;

            patchFn(spell);

            // Liste aktualisieren (Name/active state sichtbar)
            renderSpellbook(currentLevel);
            writeBackToCharacterData();
            markDirtyAndScheduleSave();
        }

        sb_name.addEventListener("input", () => applyPatch((s) => (s.name = sb_name.value)));
        sb_time.addEventListener("input", () => applyPatch((s) => (s.time = sb_time.value)));
        sb_range.addEventListener("input", () => applyPatch((s) => (s.range = sb_range.value)));
        sb_hit.addEventListener("input", () => applyPatch((s) => (s.hit = sb_hit.value)));
        sb_effect.addEventListener("input", () => applyPatch((s) => (s.effect = sb_effect.value)));
        sb_desc.addEventListener("input", () => applyPatch((s) => (s.desc = sb_desc.value)));
    }

    function bindTabs() {
        tabs.forEach((t) => {
            t.addEventListener("click", () => setActiveTab(t.dataset.spellLevel));

            t.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveTab(t.dataset.spellLevel);
                }
            });
        });
    }

    function bindSlotsCountInput() {
        slotsCountInput.addEventListener("input", () => {
            if (currentLevel === "cantrip") return;
            setCountFor(currentLevel, slotsCountInput.value);
            renderSlots(getCountFor(currentLevel));
            writeBackToCharacterData();
            markDirtyAndScheduleSave();
        });
    }

    function bindDescriptionClose() {
        btnCloseDesc.addEventListener("click", hideDesc);
    }

    function bindAddSpell() {
        btnAddSpell.addEventListener("click", () => {
            if (!currentLevel) return;

            const spell = createEmptySpell();
            getSpellsFor(currentLevel).push(spell);

            selectedSpellId = spell.id;
            renderSpellbook(currentLevel);
            fillSpellDetails(spell);
            writeBackToCharacterData();
            markDirtyAndScheduleSave();
        });
    }

    function bindDeleteSpell() {
        btnDeleteSpell.addEventListener("click", () => {
            if (!selectedSpellId) return;

            const list = getSpellsFor(currentLevel);
            const idx = list.findIndex((s) => s.id === selectedSpellId);
            if (idx === -1) return;

            list.splice(idx, 1);
            selectedSpellId = null;

            renderSpellbook(currentLevel);
            clearSpellDetails();
            writeBackToCharacterData();
            markDirtyAndScheduleSave();
        });
    }

    function bindUseInPanel() {
        btnUseInPanel.addEventListener("click", () => {
            const spell = getSelectedSpell(currentLevel);
            if (!spell) return;

            const list = panelSpellsByLevel[currentLevel];
            if (list.some(s => s.id === spell.id)) return; // schon drin

            list.push({ ...spell, id: spell.id });
            renderPanel(currentLevel);
            writeBackToCharacterData();
            markDirtyAndScheduleSave();
        });
    }

    function bindPanelClick() {
        spellPanelRows.addEventListener("click", (e) => {
            // 1) Remove-Button hat Vorrang
            const removeBtn = e.target.closest("[data-panel-remove]");
            if (removeBtn) {
                const idx = Number(removeBtn.dataset.panelRemove);
                const list = panelSpellsByLevel[currentLevel] ?? [];
                if (!Number.isInteger(idx) || idx < 0 || idx >= list.length) return;

                list.splice(idx, 1);
                renderPanel(currentLevel);
                hideDesc();
                writeBackToCharacterData();
                markDirtyAndScheduleSave();
                return;
            }

            // 2) Klick auf Zeile öffnet Beschreibung
            const row = e.target.closest("tr[data-panel-open='1']");
            if (!row) return;

            const id = row.dataset.panelSpellId;
            const list = panelSpellsByLevel[currentLevel] ?? [];
            const spell = list.find((s) => s.id === id);
            if (!spell) return;

            showDescFromPanelSpell(spell);
        });
    }

    // 7 Startup: App bootet
    function setActiveTab(level) {
        if (!level) level = "cantrip";
        currentLevel = level;

        tabs.forEach((t) => {
            const isActive = t.dataset.spellLevel === level;
            t.classList.toggle("is-active", isActive);
            t.setAttribute("aria-selected", isActive ? "true" : "false");
            t.tabIndex = isActive ? 0 : -1; // roving tabindex
        });

        // Wenn der selektierte Spell nicht im neuen Level existiert: reset
        const existsInLevel = getSpellsFor(level).some((s) => s.id === selectedSpellId);
        if (!existsInLevel) selectedSpellId = null;

        // Cantrips haben keine Slots
        const isCantrip = level === "cantrip";
        slotsCountInput.disabled = isCantrip;

        if (isCantrip) {
            slotsCountInput.value = 0;
            renderSlots(0);
        } else {
            slotsCountInput.value = String(getCountFor(level));
            renderSlots(getCountFor(level));
        }

        hideDesc();
        renderSpellbook(level);
        renderPanel(level);
        fillSpellDetails(getSelectedSpell(level));
    }
    function openDrawer() {
        drawer.classList.add("is-open");
        drawer.setAttribute("aria-hidden", "false");
        backdrop.hidden = false;
    }

    function closeDrawer() {
        drawer.classList.remove("is-open");
        drawer.setAttribute("aria-hidden", "true");
        backdrop.hidden = true;
    }
    async function loadCharactersForDrawer() {
        console.log("[spells.js] loadCharactersForDrawer called");
        listMine.innerHTML = "";
        listNpcs.innerHTML = "";

        let chars = [];
        try {
            chars = await API.characters();
        } catch (e) {
            console.warn("[spells.js] Failed to load characters", e);
            return;
        }

        const currentId = Number(localStorage.getItem("selectedCharacterId"));

        for (const c of chars) {
            const b = document.createElement("button");
            b.className = "drawer__item";

            if (Number(c.id) === currentId) {
                b.classList.add("is-active");
            }

            const name = c.name ?? "";
            const kind = (c.kind ?? "").toUpperCase();
            const owner = c.owner_username ?? "";

            b.innerHTML = `
                <span class="drawerItem__main">
                    <span class="drawerItem__name">${name}</span>
                    <span class="drawerItem__kind">${kind}</span>
                </span>
                ${owner ? `<span class="drawerItem__sub">${owner}</span>` : ``}
            `;

            b.addEventListener("click", async () => {
                setSelectedCharacterId(c.id);
                closeDrawer();
                await loadCharacterAndHydrate();
                await loadCharactersForDrawer();
            });

            if (c.kind === "npc") listNpcs.appendChild(b);
            else listMine.appendChild(b);
        }
    }
    function setSelectedCharacterId(id) {
        if (id) {
            localStorage.setItem("dnd_current_character_id", String(id));
            localStorage.setItem("selectedCharacterId", String(id));
        } else {
            localStorage.removeItem("dnd_current_character_id");
            localStorage.removeItem("selectedCharacterId");
        }
    }

    async function startup() {
        bindSpellDetailsInputs();
        bindTabs();
        bindSlotsCountInput();
        bindDescriptionClose();
        bindAddSpell();
        bindDeleteSpell();
        bindUseInPanel();
        bindPanelClick();

        await loadCharacterAndHydrate();
        setActiveTab("cantrip");           // rendert jetzt mit hydriertem state
    }

    startup().then(() => {
        loadCharactersForDrawer();
    })
});