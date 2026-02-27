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
    // Details-Inputs
    const sb_name = document.getElementById("sb_name");
    const sb_time = document.getElementById("sb_time");
    const sb_range = document.getElementById("sb_range");
    const sb_hit = document.getElementById("sb_hit");
    const sb_effect = document.getElementById("sb_effect");
    const sb_desc = document.getElementById("sb_desc");
    // Defensive: wenn irgendwas fehlt, lieber ruhig bleiben.
    if (
        !tabs.length || !slotsEl || !slotsCountInput ||
        !descBox || !btnCloseDesc ||
        !spellbookList || !btnAddSpell ||
        !sb_name || !sb_time || !sb_range || !sb_hit || !sb_effect || !sb_desc
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

    btnAddSpell.addEventListener("click", () => {
        if (!currentLevel) return; // Safety

        const spell = createEmptySpell();
        getSpellsFor(currentLevel).push(spell); // oder spellsByLevel[currentLevel].push(spell)

        selectedSpellId = spell.id;
        renderSpellbook(currentLevel);
        fillSpellDetails(spell);
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
        document.getElementById("sb_name").value = spell.name;
        document.getElementById("sb_time").value = spell.time;
        document.getElementById("sb_range").value = spell.range;
        document.getElementById("sb_hit").value = spell.hit;
        document.getElementById("sb_effect").value = spell.effect;
        document.getElementById("sb_desc").value = spell.desc;
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

        // später: spellbookList + panelRows nach level filtern
    }

    // Events
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


    setActiveTab("cantrip");
});