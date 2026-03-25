import { API } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
    // =========================================================
    // DOM
    // =========================================================
    const money_pm = document.getElementById("money_pm");
    const money_gm = document.getElementById("money_gm");
    const money_sm = document.getElementById("money_sm");
    const money_em = document.getElementById("money_em");
    const money_km = document.getElementById("money_km");

    const currentCarryWeight = document.getElementById("currentCarryWeight");
    const maxCarryWeight = document.getElementById("maxCarryWeight");

    const item_name = document.getElementById("item_name");
    const item_count = document.getElementById("item_count");
    const item_type = document.getElementById("item_type");
    const item_weight = document.getElementById("item_weight");
    const item_desc = document.getElementById("item_desc");
    const btnAddItem = document.getElementById("btnAddItem");

    const inventoryWeaponsRows = document.getElementById("inventoryWeaponsRows");
    const inventoryArmorRows = document.getElementById("inventoryArmorRows");
    const inventoryIngredientsRows = document.getElementById("inventoryIngredientsRows");
    const inventoryQuestRows = document.getElementById("inventoryQuestRows");
    const inventoryOtherRows = document.getElementById("inventoryOtherRows");

    const btnMenu = document.getElementById("btnMenu");
    const drawer = document.getElementById("drawer");
    const backdrop = document.getElementById("backdrop");
    const btnCloseDrawer = document.getElementById("btnCloseDrawer");
    const listMine = document.getElementById("listMine");
    const listNpcs = document.getElementById("listNpcs");

    if (
        !money_pm || !money_gm || !money_sm || !money_em || !money_km ||
        !currentCarryWeight || !maxCarryWeight ||
        !item_name || !item_count || !item_type || !item_weight || !item_desc || !btnAddItem ||
        !inventoryWeaponsRows || !inventoryArmorRows || !inventoryIngredientsRows || !inventoryQuestRows || !inventoryOtherRows ||
        !btnMenu || !drawer || !backdrop || !btnCloseDrawer || !listMine || !listNpcs
    ) {
        console.warn("[inventory.js] Missing required DOM elements. Script skipped.");
        return;
    }

    // =========================================================
    // State
    // =========================================================
    const ITEM_TYPES = ["waffe", "ruestung", "zutat", "quest", "sonstiges"];

    let currentCharacter = null;
    let boundCharacterId = null;

    let saveTimer = null;
    let isSaving = false;
    let pendingSave = false;

    // =========================================================
    // Persist Shape
    // =========================================================
    function emptyPersistInventory() {
        return {
            v: 1,
            money: {
                pm: 0,
                gm: 0,
                sm: 0,
                em: 0,
                km: 0,
            },
            items: {
                waffe: [],
                ruestung: [],
                zutat: [],
                quest: [],
                sonstiges: [],
            }
        };
    }

    const inventoryState = emptyPersistInventory();

    function applyPersistInventory(persist) {
        const p = persist && typeof persist === "object" ? persist : emptyPersistInventory();

        inventoryState.money.pm = toNonNegativeNumber(p.money?.pm);
        inventoryState.money.gm = toNonNegativeNumber(p.money?.gm);
        inventoryState.money.sm = toNonNegativeNumber(p.money?.sm);
        inventoryState.money.em = toNonNegativeNumber(p.money?.em);
        inventoryState.money.km = toNonNegativeNumber(p.money?.km);

        for (const type of ITEM_TYPES) {
            inventoryState.items[type] = Array.isArray(p.items?.[type])
                ? p.items[type].map(normalizeItem)
                : [];
        }
    }

    function toPersistInventory() {
        return structuredClone(inventoryState);
    }

    // =========================================================
    // General Helpers
    // =========================================================
    function toNonNegativeNumber(value) {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0) return 0;
        return n;
    }

    function toPositiveInteger(value, fallback = 1) {
        const n = Math.floor(Number(value));
        if (!Number.isFinite(n) || n < 1) return fallback;
        return n;
    }

    function normalizeItem(raw) {
        return {
            id: String(raw?.id || createItemId()),
            name: String(raw?.name || "").trim(),
            count: toPositiveInteger(raw?.count, 1),
            type: ITEM_TYPES.includes(raw?.type) ? raw.type : "sonstiges",
            weight: toNonNegativeNumber(raw?.weight),
            desc: String(raw?.desc || ""),
            isExpanded: false,
        };
    }

    function createItemId() {
        if (window.crypto?.randomUUID) return window.crypto.randomUUID();
        return "item-" + Date.now() + "-" + Math.random().toString(16).slice(2);
    }

    function escapeHtml(str) {
        return String(str)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;");
    }

    function getSelectedCharacterId() {
        return (
            localStorage.getItem("dnd_current_character_id") ||
            localStorage.getItem("selectedCharacterId") ||
            ""
        );
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
        return getHttpStatus(err) === 409 || s.includes("409") || s.includes("Conflict");
    }

    function ensureCharacterData() {
        if (!currentCharacter) return null;
        currentCharacter.data = currentCharacter.data && typeof currentCharacter.data === "object"
            ? currentCharacter.data
            : {};
        return currentCharacter.data;
    }

    function writeStateIntoCharacter() {
        const data = ensureCharacterData();
        if (!data) return;
        data.inventory = toPersistInventory();
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
                    const myInventory = toPersistInventory();
                    const latest = await API.getCharacter(id);

                    latest.data = latest.data && typeof latest.data === "object" ? latest.data : {};
                    latest.data.inventory = myInventory;

                    const payload2 = {
                        data: latest.data,
                        updated_at: latest.updated_at,
                    };

                    currentCharacter = await API.patchCharacter(id, payload2);
                } catch (e2) {
                    console.error("[inventory.js] Save failed after 409 retry.", e2);
                }
            } else {
                console.error("[inventory.js] Save failed.", e);
            }
        } finally {
            isSaving = false;

            if (pendingSave) {
                if (saveTimer) clearTimeout(saveTimer);
                saveTimer = setTimeout(() => void saveNow(), 650);
            }
        }
    }

    // =========================================================
    // Character / Strength / Carry
    // =========================================================
    function getStrengthScore(character) {
        const n = Number(character?.data?.str);
        if (!Number.isFinite(n) || n <= 0) return 0;
        return n;
    }

    function calculateCarryCapacityFromStrength(score) {
        // Aktuell nach deiner Vorgabe: aus Konstitutionswert berechnen.
        // Falls du später doch STR oder eine andere Hausregel willst:
        // nur diese Funktion anpassen.
        if (!Number.isFinite(score) || score <= 0) return 0;
        return score * 15;
    }

    function getCurrentTotalWeight() {
        let total = 0;

        for (const type of ITEM_TYPES) {
            for (const item of inventoryState.items[type]) {
                total += toNonNegativeNumber(item.weight) * toPositiveInteger(item.count, 1);
            }
        }

        return Number(total.toFixed(2));
    }

    function renderCarryStats() {
        currentCarryWeight.value = String(getCurrentTotalWeight());

        const strScore = getStrengthScore(currentCharacter);
        const carry = calculateCarryCapacityFromStrength(strScore);
        maxCarryWeight.value = String(carry);
    }

    // =========================================================
    // Money
    // =========================================================
    function fillMoneyInputs() {
        money_pm.value = inventoryState.money.pm || "";
        money_gm.value = inventoryState.money.gm || "";
        money_sm.value = inventoryState.money.sm || "";
        money_em.value = inventoryState.money.em || "";
        money_km.value = inventoryState.money.km || "";
    }

    function bindMoneyInputs() {
        function saveMoney() {
            inventoryState.money.pm = toNonNegativeNumber(money_pm.value);
            inventoryState.money.gm = toNonNegativeNumber(money_gm.value);
            inventoryState.money.sm = toNonNegativeNumber(money_sm.value);
            inventoryState.money.em = toNonNegativeNumber(money_em.value);
            inventoryState.money.km = toNonNegativeNumber(money_km.value);

            markDirtyAndScheduleSave();
        }

        money_pm.addEventListener("input", saveMoney);
        money_gm.addEventListener("input", saveMoney);
        money_sm.addEventListener("input", saveMoney);
        money_em.addEventListener("input", saveMoney);
        money_km.addEventListener("input", saveMoney);
    }

    // =========================================================
    // Add Item Form
    // =========================================================
    function clearAddItemForm() {
        item_name.value = "";
        item_count.value = "1";
        item_type.value = "waffe";
        item_weight.value = "";
        item_desc.value = "";
    }

    function readItemForm() {
        return normalizeItem({
            id: createItemId(),
            name: item_name.value,
            count: item_count.value,
            type: item_type.value,
            weight: item_weight.value,
            desc: item_desc.value,
        });
    }

    function bindAddItem() {
        btnAddItem.addEventListener("click", () => {
            const item = readItemForm();

            if (!item.name.trim()) {
                item_name.focus();
                return;
            }

            inventoryState.items[item.type].push(item);

            clearAddItemForm();
            renderAllInventoryTables();
            renderCarryStats();
            markDirtyAndScheduleSave();
        });
    }

    // =========================================================
    // Inventory Rendering
    // =========================================================
    function getRowsElementForType(type) {
        switch (type) {
            case "waffe":
                return inventoryWeaponsRows;
            case "ruestung":
                return inventoryArmorRows;
            case "zutat":
                return inventoryIngredientsRows;
            case "quest":
                return inventoryQuestRows;
            case "sonstiges":
                return inventoryOtherRows;
            default:
                return inventoryOtherRows;
        }
    }

    function getEmptyTextForType(type) {
        switch (type) {
            case "waffe":
                return "Noch keine Waffen eingetragen.";
            case "ruestung":
                return "Noch keine Rüstungen eingetragen.";
            case "zutat":
                return "Noch keine Zutaten eingetragen.";
            case "quest":
                return "Noch keine Questgegenstände eingetragen.";
            default:
                return "Noch keine sonstigen Gegenstände eingetragen.";
        }
    }

    function renderInventoryTable(type) {
        const tbody = getRowsElementForType(type);
        const items = inventoryState.items[type] ?? [];

        tbody.innerHTML = "";

        if (!items.length) {
            tbody.innerHTML = `
            <tr class="rowHint">
                <td colspan="4" class="muted small">${escapeHtml(getEmptyTextForType(type))}</td>
            </tr>
        `;
            return;
        }

        items.forEach((item, index) => {
            const totalItemWeight = Number((item.weight * item.count).toFixed(2));

            const row = document.createElement("tr");
            row.className = "inventory-row";
            row.dataset.type = type;
            row.dataset.index = String(index);

            row.innerHTML = `
            <td colspan="4">
                <div class="inventory-card">
                    <div class="inventory-card__top">
                        <button type="button" class="inventory-item__name" data-action="toggle-desc">
                            ${escapeHtml(item.name || "-")}
                        </button>

                        <button
                            type="button"
                            class="btn btn--ghost btn--mini inventory-card__delete"
                            data-action="delete-item"
                            aria-label="Gegenstand löschen"
                        >
                            ✕
                        </button>

                        <div class="inventory-card__meta">
                            <span>Anzahl: ${escapeHtml(item.count)}</span>
                            <span>Gewicht: ${escapeHtml(totalItemWeight)}</span>
                            <span>Art: ${escapeHtml(item.type)}</span>
                        </div>
                    </div>
                </div>
            </td>
        `;
            tbody.appendChild(row);

            const descRow = document.createElement("tr");
            descRow.className = "inventory-desc-row";
            descRow.dataset.type = type;
            descRow.dataset.index = String(index);
            descRow.hidden = !item.isExpanded;

            descRow.innerHTML = `
            <td colspan="4">
                <div class="inventory-desc-card">
                    <div class="formGrid">
                        <label class="field">
                            <span class="label">Name</span>
                            <input type="text" data-edit="name" value="${escapeHtml(item.name)}" />
                        </label>

                        <label class="field">
                            <span class="label">Anzahl</span>
                            <input
                                type="number"
                                min="1"
                                inputmode="numeric"
                                data-edit="count"
                                value="${escapeHtml(item.count)}"
                            />
                        </label>

                        <label class="field">
                            <span class="label">Art</span>
                            <select data-edit="type">
                                <option value="waffe" ${item.type === "waffe" ? "selected" : ""}>Waffe</option>
                                <option value="ruestung" ${item.type === "ruestung" ? "selected" : ""}>Rüstung</option>
                                <option value="zutat" ${item.type === "zutat" ? "selected" : ""}>Zutat</option>
                                <option value="quest" ${item.type === "quest" ? "selected" : ""}>Questgegenstand</option>
                                <option value="sonstiges" ${item.type === "sonstiges" ? "selected" : ""}>Sonstiges</option>
                            </select>
                        </label>

                        <label class="field">
                            <span class="label">Gewicht</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                inputmode="decimal"
                                data-edit="weight"
                                value="${escapeHtml(item.weight)}"
                            />
                        </label>

                        <label class="field field--full">
                            <span class="label">Beschreibung</span>
                            <textarea rows="5" data-edit="desc">${escapeHtml(item.desc)}</textarea>
                        </label>
                    </div>
                </div>
            </td>
        `;
            tbody.appendChild(descRow);
        });
    }

    function renderAllInventoryTables() {
        for (const type of ITEM_TYPES) {
            renderInventoryTable(type);
        }
    }

    // =========================================================
    // Inventory Actions
    // =========================================================
    function moveItemToType(item, fromType, toType, fromIndex) {
        if (fromType === toType) return;

        inventoryState.items[fromType].splice(fromIndex, 1);
        item.type = toType;
        item.isExpanded = true;
        inventoryState.items[toType].push(item);
    }

    function bindInventoryTableEvents() {
        const allBodies = [
            inventoryWeaponsRows,
            inventoryArmorRows,
            inventoryIngredientsRows,
            inventoryQuestRows,
            inventoryOtherRows,
        ];

        allBodies.forEach((tbody) => {
            tbody.addEventListener("click", (e) => {
                const baseRow = e.target.closest("tr[data-type][data-index]");
                if (!baseRow) return;

                const type = baseRow.dataset.type;
                const index = Number(baseRow.dataset.index);
                const item = inventoryState.items[type]?.[index];
                if (!item) return;

                const actionEl = e.target.closest("[data-action]");
                if (!actionEl) return;

                const action = actionEl.dataset.action;

                if (action === "delete-item") {
                    inventoryState.items[type].splice(index, 1);
                    renderAllInventoryTables();
                    renderCarryStats();
                    markDirtyAndScheduleSave();
                    return;
                }

                if (action === "toggle-desc") {
                    item.isExpanded = !item.isExpanded;
                    renderAllInventoryTables();
                }
            });

            tbody.addEventListener("input", (e) => {
                const field = e.target.closest("[data-edit]");
                if (!field) return;

                const descRow = e.target.closest("tr[data-type][data-index]");
                if (!descRow) return;

                const type = descRow.dataset.type;
                const index = Number(descRow.dataset.index);
                const item = inventoryState.items[type]?.[index];
                if (!item) return;

                const editKey = field.dataset.edit;

                if (editKey === "name") item.name = field.value;
                if (editKey === "count") item.count = toPositiveInteger(field.value, 1);
                if (editKey === "weight") item.weight = toNonNegativeNumber(field.value);
                if (editKey === "desc") item.desc = field.value;

                renderAllInventoryTables();
                renderCarryStats();
                markDirtyAndScheduleSave();
            });

            tbody.addEventListener("change", (e) => {
                const field = e.target.closest("[data-edit]");
                if (!field) return;

                const descRow = e.target.closest("tr[data-type][data-index]");
                if (!descRow) return;

                const fromType = descRow.dataset.type;
                const index = Number(descRow.dataset.index);
                const item = inventoryState.items[fromType]?.[index];
                if (!item) return;

                const editKey = field.dataset.edit;

                if (editKey === "type") {
                    const targetType = ITEM_TYPES.includes(field.value) ? field.value : "sonstiges";
                    moveItemToType(item, fromType, targetType, index);
                }

                renderAllInventoryTables();
                renderCarryStats();
                markDirtyAndScheduleSave();
            });
        });
    }

    // =========================================================
    // Drawer
    // =========================================================
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
        listMine.innerHTML = "";
        listNpcs.innerHTML = "";

        let chars = [];
        try {
            chars = await API.characters();
        } catch (e) {
            console.warn("[inventory.js] Failed to load characters", e);
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
                    <span class="drawerItem__name">${escapeHtml(name)}</span>
                    <span class="drawerItem__kind">${escapeHtml(kind)}</span>
                </span>
                ${owner ? `<span class="drawerItem__sub">${escapeHtml(owner)}</span>` : ``}
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

    // =========================================================
    // Load / Hydrate
    // =========================================================
    async function loadCharacterAndHydrate() {
        const id = getSelectedCharacterId();

        if (!id) {
            boundCharacterId = null;
            currentCharacter = null;
            applyPersistInventory(emptyPersistInventory());
            fillMoneyInputs();
            renderAllInventoryTables();
            renderCarryStats();
            return;
        }

        try {
            const c = await API.getCharacter(Number(id));
            currentCharacter = c;
            boundCharacterId = c.id;

            const persist = c?.data?.inventory ?? emptyPersistInventory();
            applyPersistInventory(persist);

            fillMoneyInputs();
            renderAllInventoryTables();
            renderCarryStats();
        } catch (e) {
            console.error("[inventory.js] Failed to load character. Running in-memory only.", e);

            boundCharacterId = null;
            currentCharacter = null;

            applyPersistInventory(emptyPersistInventory());
            fillMoneyInputs();
            renderAllInventoryTables();
            renderCarryStats();
        }
    }

    // =========================================================
    // Startup
    // =========================================================
    function startup() {
        bindMoneyInputs();
        bindAddItem();
        bindInventoryTableEvents();

        btnMenu.addEventListener("click", openDrawer);
        btnCloseDrawer.addEventListener("click", closeDrawer);
        backdrop.addEventListener("click", closeDrawer);

        return loadCharacterAndHydrate();
    }

    startup().then(() => {
        loadCharactersForDrawer();
    });
});