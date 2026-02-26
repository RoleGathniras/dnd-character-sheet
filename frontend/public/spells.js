// frontend/public/spells.js
// UI-only Mock: Tabs + Slot-Renderer + Description Toggle

document.addEventListener("DOMContentLoaded", () => {
    const tabs = [...document.querySelectorAll(".tab[data-spell-level]")];
    const slotsEl = document.getElementById("spellSlots");
    const slotsCountInput = document.getElementById("spellSlotsCountInput");

    const descBox = document.getElementById("spellDescriptionBox");
    const btnCloseDesc = document.getElementById("btnCloseSpellDesc");

    // Defensive: wenn irgendwas fehlt, lieber ruhig bleiben.
    if (!tabs.length || !slotsEl || !slotsCountInput || !descBox || !btnCloseDesc) {
        console.warn("[spells.js] Missing required DOM elements. Script skipped.");
        return;
    }

    let currentLevel = "cantrip";

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

        for (let i = 1; i <= n; i++) {
            const id = `slot_${currentLevel}_${i}`;
            const label = document.createElement("label");
            label.className = "slot";
            label.innerHTML = `
        <input type="checkbox" id="${id}" />
        <span>${i}</span>
      `;
            slotsEl.appendChild(label);
        }
    }

    function setActiveTab(level) {
        currentLevel = level;

        tabs.forEach((t) => {
            const isActive = t.dataset.spellLevel === level;
            t.classList.toggle("is-active", isActive);
            t.setAttribute("aria-selected", isActive ? "true" : "false");
        });

        // Cantrips haben keine Slots
        const isCantrip = level === "cantrip";
        slotsCountInput.disabled = isCantrip;
        if (isCantrip) slotsCountInput.value = 0;

        renderSlots(isCantrip ? 0 : Number(slotsCountInput.value || 0));
        hideDesc();

        // später: spellbookList + panelRows nach level filtern
    }

    // Events
    tabs.forEach((t) =>
        t.addEventListener("click", () => setActiveTab(t.dataset.spellLevel))
    );

    slotsCountInput.addEventListener("input", () =>
        renderSlots(Number(slotsCountInput.value || 0))
    );

    btnCloseDesc.addEventListener("click", hideDesc);

    // Start
    setActiveTab("cantrip");
});