// frontend/public/spells.js
// UI-only: Spell Tabs + Slots + Spellbook + Panel + Description (In-Memory)
import { API } from "./api.js";
import { renderTopbarCharacterAvatar } from "./app.js";
document.addEventListener("DOMContentLoaded", () => {
    // 0 DOM: Welche HTML-Elemente benutzt werden
    const slotsEl = document.getElementById("spellSlots");
    const slotsLevelSelect = document.getElementById("spellSlotsLevel");
    const slotsCountInput = document.getElementById("spellSlotsCountInput");
    const spellbookList = document.getElementById("spellbookList");
    const btnAddSpell = document.getElementById("btnAddSpell");
    const btnDeleteSpell = document.getElementById("btnDeleteSpell");
    const descBox = document.getElementById("spellDescriptionBox");
    const btnCloseDesc = document.getElementById("btnCloseSpellDesc");
    const spellDescTitle = document.getElementById("spellDescTitle");
    const spellDescText = document.getElementById("spellDescText");
    const spellSaveDc = document.getElementById("spellSaveDc");
    const spellAtkBonus = document.getElementById("spellAtkBonus");
    const spellAbility = document.getElementById("spellAbility");

    // Details-Inputs
    const sb_name = document.getElementById("sb_name");
    const sb_level = document.getElementById("sb_level");
    const sb_school = document.getElementById("sb_school");
    const sb_time = document.getElementById("sb_time");
    const sb_concentration = document.getElementById("sb_concentration");
    const sb_ritual = document.getElementById("sb_ritual");
    const sb_range = document.getElementById("sb_range");
    const sb_components = document.getElementById("sb_components");
    const sb_material = document.getElementById("sb_material");
    const sb_duration = document.getElementById("sb_duration");
    const sb_hit = document.getElementById("sb_hit");
    const sb_kind = document.getElementById("sb_kind");
    const sb_effect = document.getElementById("sb_effect");
    const sb_desc = document.getElementById("sb_desc");
    const spellDetailsCard = document.querySelector(".spellDetailsCard");
    const btnCloseSpellDetails = document.getElementById("btnCloseSpellDetails");
    const btnSelectSpell = document.getElementById("btnSelectSpell");
    const spellSelectCard = document.getElementById("spellSelectCard");
    const spellSelectList = document.getElementById("spellSelectList");
    const spellSelectPreview = document.getElementById("spellSelectPreview");
    const spellSelectLevel = document.getElementById("spellSelectLevel");
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
        !slotsEl ||
        !slotsLevelSelect ||
        !slotsCountInput ||
        !spellbookList ||
        !btnAddSpell ||
        !spellPanelRows ||
        !descBox ||
        !btnCloseDesc ||
        !spellDescTitle ||
        !spellDescText ||
        !sb_name ||
        !sb_time ||
        !sb_concentration ||
        !sb_ritual ||
        !sb_range ||
        !sb_components ||
        !sb_material ||
        !sb_duration ||
        !sb_hit ||
        !sb_kind ||
        !sb_effect ||
        !sb_desc ||
        !spellSaveDc ||
        !spellAtkBonus ||
        !spellAbility ||
        !spellDetailsCard ||
        !btnCloseSpellDetails ||
        !btnSelectSpell ||
        !spellSelectCard ||
        !spellSelectList ||
        !spellSelectPreview ||
        !spellSelectLevel ||
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
    const MAX_SPELL_SLOTS = 20;
    const MAX_SPELL_SAVE_DC = 99;
    const MIN_SPELL_ATK_BONUS = -99;
    const MAX_SPELL_ATK_BONUS = 99;

    const MAX_SB_NAME_LENGTH = 80;
    const MAX_SB_TIME_LENGTH = 50;
    const MAX_SB_RANGE_LENGTH = 50;
    const MAX_SB_HIT_LENGTH = 50;
    const MAX_SB_KIND_LENGTH = 50;
    const MAX_SB_EFFECT_LENGTH = 100;
    const MAX_SB_DESC_LENGTH = 3000;

    const MAX_SPELLS_TOTAL = 150;
    const MAX_SPELLS_PER_LEVEL = 40;

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
    let currentSlotLevel = "1";
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

        let remainingSpellCapacity = MAX_SPELLS_TOTAL;

        for (const lvl of LEVELS) {
            slotCountsByLevel[lvl] = toNonNegativeInteger(p.slotCountsByLevel?.[lvl] ?? 0, MAX_SPELL_SLOTS);

            const usedArr = Array.isArray(p.slotUsedByLevel?.[lvl]) ? p.slotUsedByLevel[lvl] : [];
            slotUsedByLevel[lvl] = new Set(
                usedArr
                    .map(Number)
                    .filter((n) => Number.isFinite(n) && n >= 1 && n <= slotCountsByLevel[lvl])
            );

            const rawSpells = Array.isArray(p.spellsByLevel?.[lvl]) ? p.spellsByLevel[lvl] : [];
            const allowedForLevel = Math.min(MAX_SPELLS_PER_LEVEL, remainingSpellCapacity);
            const normalizedSpells = rawSpells.map(normalizeSpell).slice(0, allowedForLevel);

            spellsByLevel[lvl] = normalizedSpells;
            remainingSpellCapacity -= normalizedSpells.length;

            const rawPanelSpells = Array.isArray(p.panelSpellsByLevel?.[lvl]) ? p.panelSpellsByLevel[lvl] : [];
            panelSpellsByLevel[lvl] = rawPanelSpells
                .map(normalizeSpell)
                .filter((panelSpell) => normalizedSpells.some((spell) => spell.id === panelSpell.id));
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
    function syncTopbarAvatarFromCurrentCharacter() {
        renderTopbarCharacterAvatar(currentCharacter);
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
    function ensureCharacterData() {
        if (!currentCharacter) return null;
        currentCharacter.data = currentCharacter.data && typeof currentCharacter.data === "object"
            ? currentCharacter.data
            : {};
        return currentCharacter.data;
    }

    function getSpellStatsFromCharacter() {
        const data = ensureCharacterData();
        const stats = data?.spellStats && typeof data.spellStats === "object"
            ? data.spellStats
            : { saveDc: "", atkBonus: "", ability: "" };

        if (data) data.spellStats = stats;
        return stats;
    }

    function fillSpellAttackStats() {
        const stats = getSpellStatsFromCharacter();

        const safeSaveDc = String(toBoundedInteger(stats.saveDc, 0, MAX_SPELL_SAVE_DC, 0));
        const safeAtkBonus = String(toBoundedInteger(stats.atkBonus, MIN_SPELL_ATK_BONUS, MAX_SPELL_ATK_BONUS, 0));
        const safeAbility = ["", "int", "wis", "cha"].includes(stats.ability) ? stats.ability : "";

        stats.saveDc = safeSaveDc;
        stats.atkBonus = safeAtkBonus;
        stats.ability = safeAbility;

        spellSaveDc.value = safeSaveDc;
        spellAtkBonus.value = safeAtkBonus;
        spellAbility.value = safeAbility;
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
    function bindSpellAttackInputs() {
        function saveSpellStats() {
            const stats = getSpellStatsFromCharacter();
            if (!stats) return;

            stats.saveDc = String(toBoundedInteger(spellSaveDc.value, 0, MAX_SPELL_SAVE_DC, 0));
            stats.atkBonus = String(toBoundedInteger(spellAtkBonus.value, MIN_SPELL_ATK_BONUS, MAX_SPELL_ATK_BONUS, 0));
            stats.ability = ["", "int", "wis", "cha"].includes(spellAbility.value) ? spellAbility.value : "";

            spellSaveDc.value = stats.saveDc;
            spellAtkBonus.value = stats.atkBonus;
            spellAbility.value = stats.ability;

            markDirtyAndScheduleSave();
        }

        spellSaveDc.addEventListener("input", saveSpellStats);
        spellAtkBonus.addEventListener("input", saveSpellStats);
        spellAbility.addEventListener("change", saveSpellStats);
    }

    async function loadCharacterAndHydrate() {
        const id = getSelectedCharacterId();
        console.log("[spells.js] loadCharacterAndHydrate -> selectedCharacterId =", id);
        if (!id) {
            boundCharacterId = null;
            currentCharacter = null;
            console.warn("[spells.js] No selected character id in localStorage. Running in-memory only.");
            applyPersist(emptyPersistSpells());
            renderSlots();
            renderSpellbook();
            renderPanel();
            const selectedSpell = getSelectedSpell(currentLevel);
            fillSpellDetails(selectedSpell);
            closeSpellDetails();
            fillSpellAttackStats();
            syncTopbarAvatarFromCurrentCharacter();
            return;
        }

        try {
            const c = await API.getCharacter(Number(id));
            currentCharacter = c;
            boundCharacterId = c.id;

            const persist = c?.data?.spells ?? emptyPersistSpells();
            applyPersist(persist);
            renderSlots();
            renderSpellbook();
            renderPanel();
            const selectedSpell = getSelectedSpell(currentLevel);
            fillSpellDetails(selectedSpell);
            fillSpellAttackStats();
            syncTopbarAvatarFromCurrentCharacter();
        } catch (e) {
            boundCharacterId = null;
            currentCharacter = null;
            console.error("[spells.js] Failed to load character. Running in-memory only.", e);
            applyPersist(emptyPersistSpells());
            renderSlots();
            renderSpellbook();
            renderPanel();
            const selectedSpell = getSelectedSpell();
            fillSpellDetails(selectedSpell);
            fillSpellAttackStats();
            syncTopbarAvatarFromCurrentCharacter();
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
            syncTopbarAvatarFromCurrentCharacter();
        } catch (e) {
            if (isConflict409(e)) {
                try {
                    const mySpells = toPersist();
                    const latest = await API.getCharacter(id);

                    latest.data = (latest.data && typeof latest.data === "object") ? latest.data : {};
                    latest.data.spells = mySpells;

                    const payload2 = { data: latest.data, updated_at: latest.updated_at };
                    currentCharacter = await API.patchCharacter(id, payload2);
                    syncTopbarAvatarFromCurrentCharacter();
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
    function createSpellId() {
        if (window.crypto?.randomUUID) {
            return window.crypto.randomUUID();
        }

        return "spell-" + Date.now() + "-" + Math.random().toString(16).slice(2);
    }
    function getTotalSpellCount() {
        let total = 0;
        for (const lvl of LEVELS) {
            total += spellsByLevel[lvl]?.length ?? 0;
        }
        return total;
    }

    // 2 UI/Helper: Reine Anzeige/kleine Tools
    function createEmptySpell() {
        return {
            id: createSpellId(),

            name: "",
            level: currentLevel === "cantrip" ? 0 : Number(currentLevel),
            school: "",

            time: "",
            range: "",
            components: "",
            material: "",
            duration: "",

            concentration: false,
            ritual: false,

            hit: "",
            kind: "",
            effect: "",

            desc: "",
        };
    }
    function normalizeSpell(raw) {
        return {
            id: String(raw?.id || createSpellId()),

            name: limitText(raw?.name, MAX_SB_NAME_LENGTH),
            level: toNonNegativeInteger(raw?.level ?? 0, 9),
            school: limitText(raw?.school, 50),

            time: limitText(raw?.time, MAX_SB_TIME_LENGTH),
            range: limitText(raw?.range, MAX_SB_RANGE_LENGTH),
            components: limitText(raw?.components, 50),
            material: limitText(raw?.material, 300),
            duration: limitText(raw?.duration, 100),

            concentration: Boolean(raw?.concentration),
            ritual: Boolean(raw?.ritual),

            hit: limitText(raw?.hit, MAX_SB_HIT_LENGTH),
            kind: limitText(raw?.kind, MAX_SB_KIND_LENGTH),
            effect: limitText(raw?.effect, MAX_SB_EFFECT_LENGTH),

            desc: String(raw?.desc ?? "").slice(0, MAX_SB_DESC_LENGTH),
        };
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function limitText(value, maxLength) {
        return String(value ?? "").trim().slice(0, maxLength);
    }

    function toNonNegativeInteger(value, max = Number.MAX_SAFE_INTEGER) {
        const n = Math.floor(Number(value));
        if (!Number.isFinite(n) || n < 0) return 0;
        return Math.min(n, max);
    }

    function toBoundedInteger(value, min, max, fallback = 0) {
        const n = Math.floor(Number(value));
        if (!Number.isFinite(n)) return fallback;
        return clamp(n, min, max);
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
        const val = toNonNegativeInteger(n || 0, MAX_SPELL_SLOTS);
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
    function openSpellDetails() {
        spellDetailsCard.classList.remove("is-collapsed");
    }

    function closeSpellDetails() {
        spellDetailsCard.classList.add("is-collapsed");
    }

    function syncPanelSpellById(level, spellId) {
        const source = (spellsByLevel[level] ?? []).find((s) => s.id === spellId);
        if (!source) return;

        const panelList = panelSpellsByLevel[level] ?? [];
        const panelSpell = panelList.find((s) => s.id === spellId);
        if (!panelSpell) return;

        panelSpell.name = source.name || "";
        panelSpell.time = source.time || "";
        panelSpell.range = source.range || "";
        panelSpell.hit = source.hit || "";
        panelSpell.kind = source.kind || "";
        panelSpell.effect = source.effect || "";
        panelSpell.desc = source.desc || "";
    }

    function removeSpellFromPanelById(level, spellId) {
        const list = panelSpellsByLevel[level] ?? [];
        const idx = list.findIndex((s) => s.id === spellId);
        if (idx !== -1) list.splice(idx, 1);
    }

    function showDescFromPanelSpell(spell) {
        spellDescTitle.textContent = spell?.name?.trim() || "Zauber";
        spellDescText.value = spell?.desc || "";
        descBox.classList.remove("is-hidden");
    }

    function clearSpellDetails() {
        sb_name.value = "";
        sb_level.value = "";
        sb_school.value = "";
        sb_time.value = "";
        sb_concentration.checked = false;
        sb_ritual.checked = false;
        sb_range.value = "";
        sb_components.value = "";
        sb_material.value = "";
        sb_duration.value = "";
        sb_hit.value = "";
        sb_kind.value = "";
        sb_effect.value = "";
        sb_desc.value = "";
    }

    function fillSpellDetails(spell) {
        if (!spell) {
            clearSpellDetails();
            return;
        }

        sb_name.value = spell.name || "";
        sb_level.value = spell.level === 0 ? "Zaubertrick" : String(spell.level);
        sb_school.value = spell.school || "";
        sb_time.value = spell.time || "";
        sb_concentration.checked = Boolean(spell.concentration);
        sb_ritual.checked = Boolean(spell.ritual);
        sb_range.value = spell.range || "";
        sb_components.value = spell.components || "";
        sb_material.value = spell.material || "";
        sb_duration.value = spell.duration || "";
        sb_hit.value = spell.hit || "";
        sb_kind.value = spell.kind || "";
        sb_effect.value = spell.effect || "";
        sb_desc.value = spell.desc || "";
    }

    function renderSlots() {
        const level = currentSlotLevel;
        const n = getCountFor(level);

        slotsEl.innerHTML = "";
        slotsCountInput.value = n > 0 ? String(n) : "";

        if (n <= 0) {
            slotsEl.innerHTML = `
            <span class="muted small">
                Für Grad ${level} sind noch keine Zauberslots definiert.
            </span>
        `;
            return;
        }

        const usedSet =
            slotUsedByLevel[level] ?? new Set();

        for (let i = 1; i <= n; i++) {
            const id = `slot_${level}_${i}`;

            const label =
                document.createElement("label");

            label.className = "slot";

            const checked =
                usedSet.has(i) ? "checked" : "";

            label.innerHTML = `
            <input
                type="checkbox"
                id="${id}"
                ${checked}
                data-slot-index="${i}"
            />

            <span
                class="spellSlotDot"
                aria-hidden="true"
            ></span>
        `;

            const input =
                label.querySelector("input");

            input.addEventListener("change", () => {
                const idx =
                    Number(input.dataset.slotIndex);

                if (input.checked) {
                    usedSet.add(idx);
                } else {
                    usedSet.delete(idx);
                }

                writeBackToCharacterData();
                markDirtyAndScheduleSave();
            });

            slotsEl.appendChild(label);
        }
    }
    function renderSpellbook() {
        spellbookList.innerHTML = "";

        let hasSpells = false;

        for (const level of LEVELS) {
            const list = getSpellsFor(level);

            if (!list.length) continue;

            hasSpells = true;

            // -----------------------------
            // Überschrift des Zaubergrades
            // -----------------------------
            const group = document.createElement("div");
            group.className = "spellbook__group";

            const title = document.createElement("div");
            title.className = "spellbook__groupTitle";
            title.textContent =
                level === "cantrip"
                    ? "Zaubertricks"
                    : `Grad ${level}`;

            group.appendChild(title);

            // -----------------------------
            // Zauber dieses Grades
            // -----------------------------
            for (const spell of list) {
                const item = document.createElement("div");
                item.className = "spellbook__item";

                item.dataset.id = spell.id;
                item.dataset.spellLevel = level;

                const levelLabel =
                    level === "cantrip" ? "0" : level;

                const inPanel =
                    (panelSpellsByLevel[level] ?? [])
                        .some((p) => p.id === spell.id);

                item.innerHTML = `
                <button
                    type="button"
                    class="spellbook__main"
                    data-spell-open="1"
                >
                    <span class="spellbook__level">
                        ${levelLabel}
                    </span>

                    <span class="spellbook__name">
                        ${escapeHtml(
                    spell.name?.trim() ||
                    "(Unbenannter Zauber)"
                )}
                    </span>
                </button>

                <div class="spellbook__actions">

                    <button
                        type="button"
                        class="spellbook__iconBtn ${inPanel ? "is-active" : ""
                    }"
                        data-spell-panel="1"
                        title="${inPanel
                        ? "Aus Panel entfernen"
                        : "Im Panel verwenden"
                    }"
                        aria-label="${inPanel
                        ? "Aus Panel entfernen"
                        : "Im Panel verwenden"
                    }"
                    >
                        ◆
                    </button>

                    <button
                        type="button"
                        class="spellbook__iconBtn spellbook__iconBtn--delete"
                        data-spell-delete="1"
                        title="Zauber löschen"
                        aria-label="Zauber löschen"
                    >
                        ×
                    </button>

                </div>
            `;

                // Aktuell ausgewählter Zauber
                if (spell.id === selectedSpellId) {
                    item.classList.add("is-active");
                }

                // =====================================================
                // Zauber öffnen
                // =====================================================
                const openBtn =
                    item.querySelector("[data-spell-open]");

                openBtn.addEventListener("click", () => {
                    currentLevel = level;
                    selectedSpellId = spell.id;

                    renderSpellbook();

                    fillSpellDetails(spell);
                    openSpellDetails();
                });

                // =====================================================
                // Panel ein / aus
                // =====================================================
                const panelBtn =
                    item.querySelector("[data-spell-panel]");

                panelBtn.addEventListener("click", (e) => {
                    e.stopPropagation();

                    const panelList =
                        panelSpellsByLevel[level] ?? [];

                    const existingIndex =
                        panelList.findIndex(
                            (p) => p.id === spell.id
                        );

                    if (existingIndex !== -1) {
                        // Bereits im Panel -> entfernen
                        panelList.splice(existingIndex, 1);
                    } else {
                        // Noch nicht im Panel -> hinzufügen
                        panelList.push(spell);
                    }

                    renderPanel();
                    renderSpellbook();

                    writeBackToCharacterData();
                    markDirtyAndScheduleSave();
                });

                // =====================================================
                // Zauber löschen
                // =====================================================
                const deleteBtn =
                    item.querySelector("[data-spell-delete]");

                deleteBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const confirmed = window.confirm(
                        `Möchtest du „${spell.name || "diesen Zauber"}“ wirklich löschen?`
                    );

                    if (!confirmed) return;
                    const spellList =
                        getSpellsFor(level);

                    const index =
                        spellList.findIndex(
                            (s) => s.id === spell.id
                        );

                    if (index === -1) return;

                    // Auch aus dem Panel entfernen
                    removeSpellFromPanelById(
                        level,
                        spell.id
                    );

                    // Aus Zauberbuch löschen
                    spellList.splice(index, 1);

                    // Falls gerade dieser Zauber geöffnet war
                    if (selectedSpellId === spell.id) {
                        selectedSpellId = null;

                        clearSpellDetails();
                        closeSpellDetails();
                    }

                    renderSpellbook();
                    renderPanel();

                    writeBackToCharacterData();
                    markDirtyAndScheduleSave();
                });

                group.appendChild(item);
            }

            spellbookList.appendChild(group);
        }

        // -----------------------------
        // Zauberbuch komplett leer
        // -----------------------------
        if (!hasSpells) {
            spellbookList.innerHTML = `
            <div class="spellbook__empty muted small">
                Noch keine Zauber im Zauberbuch.
            </div>
        `;
        }
    }

    function renderPanel() {
        spellPanelRows.innerHTML = "";

        let hasSpells = false;

        for (const level of LEVELS) {
            const list = panelSpellsByLevel[level] ?? [];

            if (!list.length) continue;

            hasSpells = true;

            // Überschrift für den jeweiligen Zaubergrad
            const groupRow = document.createElement("tr");
            groupRow.className = "panelGroupRow";

            groupRow.innerHTML = `
            <td colspan="7" class="panelGroupTitle">
                ${level === "cantrip" ? "Zaubertricks" : `Grad ${level}`}
            </td>
        `;

            spellPanelRows.appendChild(groupRow);

            for (const spell of list) {
                const tr = document.createElement("tr");

                tr.className = "panel-row";
                tr.dataset.panelSpellId = spell.id;
                tr.dataset.panelLevel = level;

                const levelLabel =
                    level === "cantrip" ? "0" : level;

                tr.innerHTML = `
                <td colspan="7" class="panelCell">
                    <div class="panelSpell">

                        <div
                            class="panelSpell__top"
                            data-panel-toggle="1"
                            role="button"
                            tabindex="0"
                            aria-expanded="false"
                        >
                            <div class="panelSpell__title">

                                <span class="panelSpell__level">
                                    ${levelLabel}
                                </span>

                                <span class="panelSpell__name">
                                    ${escapeHtml(spell.name || "-")}
                                </span>

                            </div>

                            <span
                                class="panelSpell__chevron"
                                aria-hidden="true"
                            >
                                ▼
                            </span>
                        </div>

                        <div class="panelSpell__bottom" hidden>
                            <div class="panelSpell__detailGrid">
                                <div class="panelSpell__detail">
                                    <span class="panelSpell__detailLabel">
                                        Zeit
                                    </span>
                                    <span>
                                        ${escapeHtml(spell.time || "-")}
                                    </span>
                                </div>

                                <div class="panelSpell__detail">
                                    <span class="panelSpell__detailLabel">
                                        Reichweite
                                    </span>
                                    <span>
                                        ${escapeHtml(spell.range || "-")}
                                    </span>
                                </div>

                                <div class="panelSpell__detail">
                                    <span class="panelSpell__detailLabel">
                                        Treffer / RW
                                    </span>
                                    <span>
                                        ${escapeHtml(spell.hit || "-")}
                                    </span>
                                </div>

                                <div class="panelSpell__detail">
                                    <span class="panelSpell__detailLabel">
                                        Effekt
                                    </span>
                                    <span>
                                        ${escapeHtml(spell.effect || "-")}
                                    </span>
                                </div>

                            </div>

                            <div class="panelSpell__description">
                                <div class="panelSpell__detailLabel">
                                    Beschreibung
                                </div>

                                <div class="panelSpell__descriptionText">
                                    ${escapeHtml(spell.desc || "Keine Beschreibung vorhanden.")}
                                </div>
                            </div>

                            <div class="panelSpell__actions">
                                <button
                                    type="button"
                                    class="btn btn--danger btn--mini"
                                    data-panel-remove="1"
                                >
                                    Aus Panel entfernen
                                </button>
                            </div>

                        </div>

                    </div>
                </td>
            `;

                spellPanelRows.appendChild(tr);
            }
        }

        if (!hasSpells) {
            spellPanelRows.innerHTML = `
            <tr class="rowHint">
                <td colspan="7" class="muted small">
                    Noch leer. Zauber aus dem Zauberbuch hinzufügen.
                </td>
            </tr>
        `;
        }
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

    function applyPatch(patchFn) {
        const spell = getSelectedSpell(currentLevel);
        if (!spell) return;

        patchFn(spell);
        syncPanelSpellById(currentLevel, spell.id);

        renderSpellbook();
        renderPanel();
        writeBackToCharacterData();
        markDirtyAndScheduleSave();
    }
    function bindSpellDetailsInputs() {
        sb_name.addEventListener("input", () =>
            applyPatch((s) => {
                s.name = limitText(sb_name.value, MAX_SB_NAME_LENGTH);
                sb_name.value = s.name;
            })
        );
        sb_level.addEventListener("change", () =>
            applyPatch((s) => {
                s.level = Number(sb_level.value) || 0;
            })
        );
        sb_school.addEventListener("change", () =>
            applyPatch((s) => {
                s.school = limitText(sb_school.value, 50);
                sb_school.value = s.school;
            })
        );

        sb_time.addEventListener("input", () =>
            applyPatch((s) => {
                s.time = limitText(sb_time.value, MAX_SB_TIME_LENGTH);
                sb_time.value = s.time;
            })
        );

        sb_concentration.addEventListener("change", () =>
            applyPatch((s) => {
                s.concentration = sb_concentration.checked;
            })
        );

        sb_ritual.addEventListener("change", () =>
            applyPatch((s) => {
                s.ritual = sb_ritual.checked;
            })
        );

        sb_range.addEventListener("input", () =>
            applyPatch((s) => {
                s.range = limitText(sb_range.value, MAX_SB_RANGE_LENGTH);
                sb_range.value = s.range;
            })
        );
        sb_components.addEventListener("input", () =>
            applyPatch((s) => {
                s.components = limitText(sb_components.value, 50);
                sb_components.value = s.components;
            })
        );

        sb_material.addEventListener("input", () =>
            applyPatch((s) => {
                s.material = limitText(sb_material.value, 300);
                sb_material.value = s.material;
            })
        );

        sb_duration.addEventListener("input", () =>
            applyPatch((s) => {
                s.duration = limitText(sb_duration.value, 100);
                sb_duration.value = s.duration;
            })
        );

        sb_hit.addEventListener("input", () =>
            applyPatch((s) => {
                s.hit = limitText(sb_hit.value, MAX_SB_HIT_LENGTH);
                sb_hit.value = s.hit;
            })
        );

        sb_kind.addEventListener("input", () =>
            applyPatch((s) => {
                s.kind = limitText(sb_kind.value, MAX_SB_KIND_LENGTH);
                sb_kind.value = s.kind;
            })
        );

        sb_effect.addEventListener("input", () =>
            applyPatch((s) => {
                s.effect = limitText(sb_effect.value, MAX_SB_EFFECT_LENGTH);
                sb_effect.value = s.effect;
            })
        );

        sb_desc.addEventListener("input", () =>
            applyPatch((s) => {
                s.desc = String(sb_desc.value ?? "").slice(0, MAX_SB_DESC_LENGTH);
                sb_desc.value = s.desc;
            })
        );
    }

    function bindSlotsCountInput() {
        slotsCountInput.addEventListener("input", () => {
            const n =
                Number(slotsCountInput.value) || 0;

            setCountFor(currentSlotLevel, n);

            renderSlots();

            writeBackToCharacterData();
            markDirtyAndScheduleSave();
        });
    }
    function bindSlotsLevelSelect() {
        slotsLevelSelect.addEventListener("change", () => {
            currentSlotLevel =
                slotsLevelSelect.value;

            renderSlots();
        });
    }

    function bindDescriptionClose() {
        btnCloseDesc.addEventListener("click", hideDesc);
    }

    function bindAddSpell() {
        if (!btnAddSpell) return;

        const onAddSpell = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const level =
                currentLevel ||
                document.querySelector('.tab.is-active')?.dataset.spellLevel ||
                "cantrip";

            if (!level) return;

            currentLevel = level;

            const levelList = getSpellsFor(level);

            if (getTotalSpellCount() >= MAX_SPELLS_TOTAL) {
                alert(`Maximal ${MAX_SPELLS_TOTAL} Zauber pro Charakter erlaubt.`);
                return;
            }

            if (levelList.length >= MAX_SPELLS_PER_LEVEL) {
                alert(`Maximal ${MAX_SPELLS_PER_LEVEL} Zauber auf Grad ${level} erlaubt.`);
                return;
            }
            const spell = normalizeSpell(createEmptySpell());
            levelList.push(spell);

            selectedSpellId = spell.id;
            renderSpellbook();
            fillSpellDetails(spell);
            openSpellDetails();
            writeBackToCharacterData();
            markDirtyAndScheduleSave();
        };

        btnAddSpell.addEventListener("click", onAddSpell);

    }

    function bindSpellDetailsClose() {
        btnCloseSpellDetails.addEventListener("click", () => {
            selectedSpellId = null;
            spellSelectCard.classList.add("is-hidden");
            spellSelectList.innerHTML = "";
            renderSpellbook();
            clearSpellDetails();
            closeSpellDetails();
        });
    }

    function takeDatabaseSpell(spell) {
        const oldLevel = currentLevel;

        const newLevel =
            Number(spell.level) === 0
                ? "cantrip"
                : String(spell.level);

        const oldList = spellsByLevel[oldLevel] ?? [];

        const index =
            oldList.findIndex((s) => s.id === selectedSpellId);

        if (index === -1) return;

        const targetSpell = oldList[index];

        targetSpell.name = spell.name;
        targetSpell.level = Number(spell.level) || 0;
        targetSpell.school = spell.school;

        targetSpell.time = spell.time;
        targetSpell.range = spell.range;
        targetSpell.components = spell.components;
        targetSpell.material = spell.material;
        targetSpell.duration = spell.duration;

        targetSpell.concentration = spell.concentration;
        targetSpell.ritual = spell.ritual;

        targetSpell.hit = spell.hit;
        targetSpell.kind = spell.kind;
        targetSpell.effect = spell.effect;

        targetSpell.desc = spell.desc;

        /*
         * Falls der ausgesuchte Zauber einen anderen Grad hat,
         * verschieben wir ihn auch in den richtigen Datenbereich.
         */
        if (newLevel !== oldLevel) {
            oldList.splice(index, 1);
            spellsByLevel[newLevel].push(targetSpell);
        }

        currentLevel = newLevel;

        writeBackToCharacterData();
        markDirtyAndScheduleSave();

        spellSelectCard.classList.add("is-hidden");
        spellSelectList.innerHTML = "";
        spellSelectPreview.innerHTML = "";

        renderSpellbook();
        renderPanel();
        fillSpellDetails(targetSpell);
        openSpellDetails();

        requestAnimationFrame(() => {
            spellDetailsCard.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        });
    }
    async function loadSpellSuggestions(level) {
        const spells = await API.getSpells(Number(level));

        spellSelectList.innerHTML = "";
        spellSelectPreview.innerHTML = "";

        if (spells.length === 0) {
            spellSelectList.innerHTML = `
            <p class="muted small">
                Keine Zauber für diesen Grad in der Datenbank gefunden.
            </p>
        `;
            return;
        }

        for (const spell of spells) {
            const item = document.createElement("button");

            item.type = "button";
            item.className = "btn btn--ghost";
            item.textContent = spell.name;

            item.addEventListener("click", () => {
                spellSelectPreview.innerHTML = `
                <h3>${spell.name}</h3>
                <p><strong>Grad:</strong> ${spell.level}</p>
                <p><strong>Schule:</strong> ${spell.school}</p>
                <p><strong>Zeit:</strong> ${spell.time}</p>
                <p><strong>Reichweite:</strong> ${spell.range}</p>
                <p><strong>Komponenten:</strong> ${spell.components}</p>
                <p><strong>Dauer:</strong> ${spell.duration}</p>
                <p><strong>Effekt:</strong> ${spell.effect}</p>
                <p>${spell.desc}</p>

                <button
                    class="btn"
                    id="btnTakeSpell"
                    type="button"
                >
                    Diesen Zauber übernehmen
                </button>
            `;

                requestAnimationFrame(() => {
                    spellSelectPreview.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                    });
                });

                const btnTakeSpell =
                    document.getElementById("btnTakeSpell");

                btnTakeSpell.addEventListener("click", () => {
                    takeDatabaseSpell(spell);
                });
            });

            spellSelectList.appendChild(item);
        }
    }
    function bindSelectSpell() {
        btnSelectSpell.addEventListener("click", async () => {
            try {
                const selectedSpell =
                    getSelectedSpell(currentLevel);

                const initialLevel =
                    selectedSpell
                        ? Number(selectedSpell.level) || 0
                        : currentLevel === "cantrip"
                            ? 0
                            : Number(currentLevel);

                spellSelectLevel.value =
                    String(initialLevel);

                spellSelectCard.classList.remove("is-hidden");

                await loadSpellSuggestions(initialLevel);

                requestAnimationFrame(() => {
                    spellSelectCard.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                    });
                });
            } catch (error) {
                console.error(
                    "Zauber konnten nicht geladen werden:",
                    error
                );
            }
        });

        spellSelectLevel.addEventListener("change", async () => {
            try {
                await loadSpellSuggestions(
                    Number(spellSelectLevel.value)
                );
            } catch (error) {
                console.error(
                    "Zauber konnten nicht geladen werden:",
                    error
                );
            }
        });
    }


    function bindPanelClick() {
        spellPanelRows.addEventListener("click", (e) => {
            const row =
                e.target.closest("tr[data-panel-spell-id]");

            if (!row) return;

            const level = row.dataset.panelLevel;
            const spellId = row.dataset.panelSpellId;

            const list =
                panelSpellsByLevel[level] ?? [];

            const spell =
                list.find((s) => s.id === spellId);

            if (!spell) return;

            // Entfernen
            const removeBtn =
                e.target.closest("[data-panel-remove]");

            if (removeBtn) {
                const index =
                    list.findIndex((s) => s.id === spellId);

                if (index === -1) return;

                list.splice(index, 1);

                renderPanel();
                hideDesc();

                writeBackToCharacterData();
                markDirtyAndScheduleSave();

                return;
            }

            // Karte auf-/zuklappen
            const toggle =
                e.target.closest("[data-panel-toggle]");

            if (!toggle) return;

            const bottom =
                row.querySelector(".panelSpell__bottom");

            if (!bottom) return;

            bottom.hidden = !bottom.hidden;

            const isOpen = !bottom.hidden;

            toggle.setAttribute(
                "aria-expanded",
                isOpen ? "true" : "false"
            );

            const chevron =
                row.querySelector(".panelSpell__chevron");

            if (chevron) {
                chevron.textContent =
                    isOpen ? "▲" : "▼";
            }
        });
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
                syncTopbarAvatarFromCurrentCharacter();
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
        bindSpellAttackInputs();
        bindSlotsCountInput();
        bindSlotsLevelSelect();
        bindDescriptionClose();
        bindAddSpell();
        bindSpellDetailsClose();
        bindSelectSpell();
        bindPanelClick();

        slotsLevelSelect.value = currentSlotLevel;

        await loadCharacterAndHydrate();
    }

    startup().then(() => {
        loadCharactersForDrawer();
    })
});