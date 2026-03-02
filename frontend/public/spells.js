// frontend/public/spells.js
// UI-only Mock: Tabs + Slot-Renderer + Description Toggle

document.addEventListener("DOMContentLoaded", () => {
    const tabs = [...document.querySelectorAll(".tab[data-spell-level]")];
    const slotsEl = document.getElementById("spellSlots");
    const slotsCountInput = document.getElementById("spellSlotsCountInput");
    const descBox = document.getElementById("spellDescriptionBox");
    const btnCloseDesc = document.getElementById("btnCloseSpellDesc");
    const spellbookList = document.getElementById("spellbookList");
    const btnAddSpell = document.getElementById("btnAddSpell");
    const spellPanelRows = document.getElementById("spellPanelRows");
    const btnUseInPanel = document.getElementById("btnUseInPanel");
    // Details-Inputs
    const sb_name = document.getElementById("sb_name");
    const sb_time = document.getElementById("sb_time");
    const sb_range = document.getElementById("sb_range");
    const sb_hit = document.getElementById("sb_hit");
    const sb_effect = document.getElementById("sb_effect");
    const sb_desc = document.getElementById("sb_desc");
    const btnDeleteSpell = document.getElementById("btnDeleteSpell");
    const spellDescTitle = document.getElementById("spellDescTitle");
    const spellDescText = document.getElementById("spellDescText");
    // Defensive: wenn irgendwas fehlt, lieber ruhig bleiben.
    if (
        !tabs.length || !slotsEl || !slotsCountInput ||
        !descBox || !btnCloseDesc ||
        !spellbookList || !btnAddSpell || !spellPanelRows || !btnUseInPanel ||
        !sb_name || !sb_time || !sb_range || !sb_hit || !btnDeleteSpell || !sb_effect || !spellDescTitle || !spellDescText || !sb_desc
    ) {
        console.warn("[spells.js] Missing required DOM elements. Script skipped.");
        return;
    }

    let currentLevel = "cantrip";
    // In-Memory State pro Grad
    const slotCountsByLevel = {
        cantrip: 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0, "9": 0,
    };

    // Merkt welche Slots "verbraucht" sind: { "1": Set([1,3]), ... }
    const slotUsedByLevel = {
        cantrip: new Set(),
        "1": new Set(), "2": new Set(), "3": new Set(), "4": new Set(), "5": new Set(),
        "6": new Set(), "7": new Set(), "8": new Set(), "9": new Set(),
    };
    // Zauber pro Grad
    const spellsByLevel = {
        cantrip: [],
        "1": [], "2": [], "3": [], "4": [], "5": [],
        "6": [], "7": [], "8": [], "9": [],
    };
    const panelSpellsByLevel = {
        cantrip: [],
        "1": [], "2": [], "3": [], "4": [], "5": [],
        "6": [], "7": [], "8": [], "9": [],
    };

    let selectedSpellId = null;

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
    btnDeleteSpell.addEventListener("click", () => {
        if (!selectedSpellId) return;

        const list = getSpellsFor(currentLevel);
        const idx = list.findIndex(s => s.id === selectedSpellId);
        if (idx === -1) return;

        list.splice(idx, 1);
        selectedSpellId = null;

        renderSpellbook(currentLevel);
        clearSpellDetails();
    });

    btnAddSpell.addEventListener("click", () => {
        if (!currentLevel) return; // Safety

        const spell = createEmptySpell();
        getSpellsFor(currentLevel).push(spell); // oder spellsByLevel[currentLevel].push(spell)

        selectedSpellId = spell.id;
        renderSpellbook(currentLevel);
        fillSpellDetails(spell);
    });
    btnUseInPanel.addEventListener("click", () => {
        const spell = getSelectedSpell(currentLevel);
        if (!spell) return;

        // id mitnehmen, damit Panel-Eintrag eindeutig bleibt
        panelSpellsByLevel[currentLevel].push({ ...spell, id: spell.id });
        renderPanel(currentLevel);
    });

    function getSpellsFor(level) {
        return spellsByLevel[level] ?? [];
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

    function renderSlots(n) {
        slotsEl.innerHTML = "";

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
        const existsInLevel = getSpellsFor(level).some(s => s.id === selectedSpellId);
        if (!existsInLevel) selectedSpellId = null;
        // Cantrips haben keine Slots
        const isCantrip = level === "cantrip";
        slotsCountInput.disabled = isCantrip;

        if (isCantrip) {
            slotsCountInput.value = 0;
            renderSlots(0);
        } else {
            // Count pro Grad ins Input spiegeln
            slotsCountInput.value = String(getCountFor(level));
            renderSlots(getCountFor(level));
        }

        hideDesc();
        renderSpellbook(level);
        renderPanel(level);
        fillSpellDetails(getSelectedSpell(level));

        // später: spellbookList + panelRows nach level filtern
    }
    function getSelectedSpell(level) {
        if (!selectedSpellId) return null;
        const list = getSpellsFor(level);
        return list.find(s => s.id === selectedSpellId) || null;
    }
    function clearSpellDetails() {
        sb_name.value = "";
        sb_time.value = "";
        sb_range.value = "";
        sb_hit.value = "";
        sb_effect.value = "";
        sb_desc.value = "";
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
    <td>${spell.effect || "-"}</td>
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
    function showDescFromPanelSpell(spell) {
        spellDescTitle.textContent = spell?.name?.trim() || "Zauber";
        spellDescText.value = spell?.desc || "";
        descBox.classList.remove("is-hidden");
    }


    // Events
    function bindSpellDetailsInputs() {
        function applyPatch(patchFn) {
            const spell = getSelectedSpell(currentLevel);
            if (!spell) return;

            patchFn(spell);

            // Liste aktualisieren (Name/active state sichtbar)
            renderSpellbook(currentLevel);
        }

        sb_name.addEventListener("input", () => {
            applyPatch(s => s.name = sb_name.value);
        });
        sb_time.addEventListener("input", () => {
            applyPatch(s => s.time = sb_time.value);
        });
        sb_range.addEventListener("input", () => {
            applyPatch(s => s.range = sb_range.value);
        });
        sb_hit.addEventListener("input", () => {
            applyPatch(s => s.hit = sb_hit.value);
        });
        sb_effect.addEventListener("input", () => {
            applyPatch(s => s.effect = sb_effect.value);
        });
        sb_desc.addEventListener("input", () => {
            applyPatch(s => s.desc = sb_desc.value);
        });
    }
    tabs.forEach((t) => {
        t.addEventListener("click", () => setActiveTab(t.dataset.spellLevel));

        t.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setActiveTab(t.dataset.spellLevel);
            }
        });
    });

    slotsCountInput.addEventListener("input", () => {
        if (currentLevel === "cantrip") return;
        setCountFor(currentLevel, slotsCountInput.value);
        renderSlots(getCountFor(currentLevel));
    });

    btnCloseDesc.addEventListener("click", hideDesc);

    bindSpellDetailsInputs();
    setActiveTab("cantrip");

    spellPanelRows.addEventListener("click", (e) => {
        // 1) Remove-Button hat Vorrang
        const removeBtn = e.target.closest("[data-panel-remove]");
        if (removeBtn) {
            const idx = Number(removeBtn.dataset.panelRemove);
            const list = panelSpellsByLevel[currentLevel] ?? [];
            if (!Number.isInteger(idx) || idx < 0 || idx >= list.length) return;

            list.splice(idx, 1);
            renderPanel(currentLevel);
            hideDesc(); // optional: Beschreibung schließen, falls offen
            return;
        }

        // 2) Klick auf Zeile öffnet Beschreibung
        const row = e.target.closest("tr[data-panel-open='1']");
        if (!row) return;

        const id = row.dataset.panelSpellId;
        const list = panelSpellsByLevel[currentLevel] ?? [];
        const spell = list.find(s => s.id === id);
        if (!spell) return;

        showDescFromPanelSpell(spell);
    });

});
