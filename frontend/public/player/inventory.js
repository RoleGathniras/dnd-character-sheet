import { API } from "/api.js";
import { getCurrentCharacterId } from "/player/character-selection.js";

const characterId = getCurrentCharacterId();

const form = document.getElementById("addInventoryItemForm");
const templateSelect = document.getElementById("item_template");
const quantityInput = document.getElementById("item_count");
const addButton = document.getElementById("btnAddItem");
const preview = document.getElementById("itemTemplatePreview");
const status = document.getElementById("inventoryStatus");
const privateStorageRows = document.getElementById("privateStorageRows");
const privateStorageStatus = document.getElementById("privateStorageStatus");

const moneyInputs = Object.fromEntries(
    ["pm", "gm", "sm", "em", "km"].map(key => [
        key,
        document.getElementById(`money_${key}`),
    ]),
);

const tables = {
    weapon: document.getElementById("inventoryWeaponsRows"),
    armor: document.getElementById("inventoryArmorRows"),
    other: document.getElementById("inventoryOtherRows"),
};

const categoryLabels = {
    weapon: "Waffe",
    armor: "Rüstung",
    other: "Sonstiges",
};

const currencyLabels = {
    cp: "KM",
    sp: "SM",
    ep: "EM",
    gp: "GM",
    pp: "PM",
};

const numberFormat = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 3,
});

let character = null;
let templates = [];
let instances = [];
let adding = false;
let ready = false;

let moneyTimer = null;
let savingMoney = false;
let moneyRevision = 0;
let savedMoneyRevision = 0;

let privateInstances = [];
let transferring = false;
let transferRefreshFailed = false;

function showStatus(message) {
    status.textContent = message;
}

function updateAddButton() {
    addButton.disabled =
        !ready || adding || transferring ||
        transferRefreshFailed || !templateSelect.value;
}

function updateTemplatePreview() {
    const template = templates.find(
        entry => entry.id === Number(templateSelect.value),
    );

    preview.textContent = template
        ? `${categoryLabels[template.category]} · ` +
        `${numberFormat.format(Number(template.weight_lb))} Pfd pro Stück · ` +
        `${numberFormat.format(Number(template.cost_amount))} ` +
        `${currencyLabels[template.cost_currency]}`
        : "";

    updateAddButton();
}

function renderTemplates() {
    templateSelect.replaceChildren(
        new Option(
            templates.length
                ? "Bitte Gegenstand auswählen"
                : "Keine verfügbaren Vorlagen",
            "",
        ),
    );

    for (const template of templates) {
        templateSelect.add(new Option(
            `${template.name} · ${categoryLabels[template.category]}`,
            String(template.id),
        ));
    }

    templateSelect.disabled = templates.length === 0;
    updateTemplatePreview();
}

function appendDetail(container, text) {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    container.appendChild(paragraph);
}
function canonicalJson(value) {
    if (Array.isArray(value)) {
        return `[${value.map(canonicalJson).join(",")}]`;
    }

    if (value !== null && typeof value === "object") {
        return `{${Object.keys(value).sort().map(key =>
            `${JSON.stringify(key)}:${canonicalJson(value[key])}`
        ).join(",")}}`;
    }

    return JSON.stringify(value);
}

function appendMergeControls(container, source, items) {
    const targets = items.filter(target =>
        target.id !== source.id &&
        target.template_id === source.template_id &&
        target.location === source.location &&
        target.character_id === source.character_id &&
        target.campaign_id === source.campaign_id &&
        target.quantity + source.quantity <= 9999 &&
        canonicalJson(target.snapshot) === canonicalJson(source.snapshot)
    );

    if (!targets.length) return;

    const mergeForm = document.createElement("form");
    mergeForm.className = "row gap";
    mergeForm.dataset.itemTransfer = "1";

    const select = document.createElement("select");
    select.setAttribute("aria-label", "Zielstapel zum Zusammenführen");

    for (const target of targets) {
        select.add(new Option(
            `Stapel #${target.id} · ${target.quantity} Stück`,
            String(target.id),
        ));
    }

    const button = document.createElement("button");
    button.type = "submit";
    button.className = "btn";
    button.textContent = "Zusammenführen";

    select.disabled = transferring || transferRefreshFailed;
    button.disabled = transferring || transferRefreshFailed;

    mergeForm.append(select, button);
    container.appendChild(mergeForm);

    mergeForm.addEventListener("submit", async event => {
        event.preventDefault();

        if (transferring || adding || transferRefreshFailed) return;

        const target = targets.find(
            item => item.id === Number(select.value),
        );
        if (!target) return;

        transferring = true;
        updateAddButton();
        showTransferStatus("Stapel werden zusammengeführt…");

        document.querySelectorAll(
            "form[data-item-transfer] input, " +
            "form[data-item-transfer] select, " +
            "form[data-item-transfer] button",
        ).forEach(element => {
            element.disabled = true;
        });

        let changed = false;

        try {
            await API.mergeItemInstances(target.id, {
                source_id: source.id,
                expected_source_version: source.version,
                expected_target_version: target.version,
            });
            changed = true;
        } catch (error) {
            console.error(error);
            showTransferStatus(error.message || "Zusammenführen fehlgeschlagen.");
        }

        try {
            [instances, privateInstances] = await Promise.all([
                API.listCharacterInventory(characterId),
                API.listCharacterPrivateStorage(characterId),
            ]);

            transferRefreshFailed = false;

            if (changed) {
                showTransferStatus("Stapel zusammengeführt.");
            }
        } catch (error) {
            console.error(error);
            transferRefreshFailed = true;
            showTransferStatus(
                "Anzeige konnte nicht aktualisiert werden. Bitte Seite neu laden.",
            );
        } finally {
            transferring = false;
            updateAddButton();
            renderInventory();
            renderPrivateStorage();
        }
    });
}

function appendTransferControls(container, item, targetLocation) {
    const form = document.createElement("form");
    form.className = "row gap";

    const label = document.createElement("label");
    label.textContent = "Menge ";

    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = String(item.quantity);
    input.step = "1";
    input.value = String(item.quantity);
    input.required = true;
    input.setAttribute("aria-label", `Transfermenge für ${item.snapshot.name}`);

    const button = document.createElement("button");
    button.type = "submit";
    button.className = "btn";
    button.textContent = targetLocation === "private_storage"
        ? "In private Truhe"
        : "Ins Inventar";

    input.disabled = transferring || transferRefreshFailed;
    button.disabled = transferring || transferRefreshFailed;

    label.appendChild(input);
    form.append(label, button);
    container.appendChild(form);

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (
            transferring ||
            adding ||
            transferRefreshFailed ||
            !form.reportValidity()
        ) return;

        const quantity = Number(input.value);

        if (
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            quantity > item.quantity
        ) return;

        transferring = true;
        updateAddButton();
        showTransferStatus("Gegenstand wird verschoben…");

        document.querySelectorAll(
            "form[data-item-transfer] input, " +
            "form[data-item-transfer] select, " +
            "form[data-item-transfer] button",
        ).forEach(element => {
            element.disabled = true;
        });

        let changed = false;

        try {
            await API.movePersonalItem(item.id, {
                target_location: targetLocation,
                expected_version: item.version,
                quantity,
            });

            changed = true;
        } catch (error) {
            console.error(error);
            showTransferStatus(error.message || "Transfer fehlgeschlagen.");
        }

        // Auch nach einem Konflikt die aktuellen Mengen/Versionen laden.
        try {
            const loaded = await Promise.all([
                API.listCharacterInventory(characterId),
                API.listCharacterPrivateStorage(characterId),
            ]);

            [instances, privateInstances] = loaded;
            transferRefreshFailed = false;

            if (changed) {
                showTransferStatus("Gegenstand verschoben.");
            }
        } catch (error) {
            console.error(error);
            transferRefreshFailed = true;
            showTransferStatus(
                "Anzeige konnte nicht aktualisiert werden. " +
                "Bitte Seite neu laden, bevor du weitere Transfers ausführst.",
            );
        } finally {
            transferring = false;
            updateAddButton();
            renderInventory();
            renderPrivateStorage();
        }
    });

    form.dataset.itemTransfer = "1";
}

function showTransferStatus(message) {
    showStatus(message);
    privateStorageStatus.textContent = message;
}

function renderPrivateStorage() {
    privateStorageRows.replaceChildren();

    if (!privateInstances.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.className = "muted small";
        cell.textContent = "Die private Truhe ist leer.";
        row.appendChild(cell);
        privateStorageRows.appendChild(row);
        return;
    }

    for (const item of privateInstances) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        const details = document.createElement("details");
        const summary = document.createElement("summary");

        summary.textContent =
            `${item.snapshot.name} · Anzahl: ${item.quantity} · ` +
            `${numberFormat.format(
                Number(item.snapshot.weight_lb) * item.quantity,
            )} Pfd`;

        details.appendChild(summary);

        if (item.snapshot.description) {
            appendDetail(details, item.snapshot.description);
        }

        appendTransferControls(details, item, "inventory");
        appendMergeControls(details, item, privateInstances);

        cell.appendChild(details);
        row.appendChild(cell);
        privateStorageRows.appendChild(row);
    }
}
function renderInventory() {
    for (const [category, tbody] of Object.entries(tables)) {
        tbody.replaceChildren();

        const items = instances.filter(
            item => item.snapshot.category === category,
        );

        if (!items.length) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 4;
            cell.className = "muted small";
            cell.textContent = "Keine Gegenstände vorhanden.";
            row.appendChild(cell);
            tbody.appendChild(row);
            continue;
        }

        for (const item of items) {
            const snapshot = item.snapshot;
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 4;

            const details = document.createElement("details");
            const summary = document.createElement("summary");

            const totalWeight =
                Number(snapshot.weight_lb) * item.quantity;

            summary.textContent =
                `${snapshot.name} · Anzahl: ${item.quantity} · ` +
                `${numberFormat.format(totalWeight)} Pfd`;

            details.appendChild(summary);

            appendDetail(
                details,
                `Einzelgewicht: ${numberFormat.format(Number(snapshot.weight_lb))
                } Pfd`,
            );

            if (snapshot.weapon) {
                appendDetail(
                    details,
                    `Schaden: ${snapshot.weapon.damage_dice.replace("d", "W")
                    } ${snapshot.weapon.damage_type}`,
                );

                if (snapshot.weapon.properties.length) {
                    appendDetail(
                        details,
                        `Eigenschaften: ${snapshot.weapon.properties.join(", ")}`,
                    );
                }
            }

            if (snapshot.armor) {
                const armor = snapshot.armor;
                let acText = armor.armor_type === "shield"
                    ? `RK-Bonus: +${armor.ac_value}`
                    : `Rüstungsklasse: ${armor.ac_value}`;

                if (armor.ac_modifier) {
                    acText += ` + ${armor.ac_modifier.toUpperCase()}-Modifikator`;
                }

                if (armor.modifier_cap !== null) {
                    acText += ` (Modifikator maximal +${armor.modifier_cap})`;
                }

                appendDetail(details, acText);

                if (armor.strength_required !== null) {
                    appendDetail(
                        details,
                        `Benötigte Stärke: ${armor.strength_required}`,
                    );
                }

                if (armor.stealth_disadvantage) {
                    appendDetail(details, "Nachteil auf Heimlichkeit");
                }
            }

            if (snapshot.description) {
                const description = document.createElement("p");
                description.textContent = snapshot.description;
                description.style.whiteSpace = "pre-wrap";
                details.appendChild(description);
            }
            appendTransferControls(details, item, "private_storage");
            appendMergeControls(details, item, instances);
            cell.appendChild(details);
            row.appendChild(cell);
            tbody.appendChild(row);
        }
    }

    renderCarryStats();
}

function renderCarryStats() {
    const total = instances.reduce(
        (sum, item) =>
            sum + Number(item.snapshot.weight_lb) * item.quantity,
        0,
    );

    const strength = Number(character?.data?.str ?? 0);

    document.getElementById("currentCarryWeight").value =
        String(Number(total.toFixed(3)));

    document.getElementById("maxCarryWeight").value =
        String(Number.isFinite(strength) && strength > 0
            ? strength * 15
            : 0);
}

function readMoneyInputs() {
    return Object.fromEntries(
        Object.entries(moneyInputs).map(([key, input]) => [
            key,
            Math.min(
                99999999,
                Math.max(0, Math.floor(Number(input.value) || 0)),
            ),
        ]),
    );
}

async function saveMoney() {
    if (savingMoney || savedMoneyRevision === moneyRevision) return;

    savingMoney = true;
    const revision = moneyRevision;
    const money = readMoneyInputs();

    try {
        for (let attempt = 0; attempt < 2; attempt++) {
            const latest = await API.getCharacter(characterId);
            const data = structuredClone(latest.data ?? {});

            // Nur Münzen ändern, andere Charakterdaten erhalten.
            data.inventory = {
                ...(data.inventory ?? {}),
                money,
            };

            try {
                character = await API.patchCharacter(characterId, {
                    data,
                    updated_at: latest.updated_at,
                });
                break;
            } catch (error) {
                if (error.status !== 409 || attempt === 1) throw error;
            }
        }

        savedMoneyRevision = revision;
        renderCarryStats();
        showStatus("Münzen gespeichert.");
    } catch (error) {
        console.error(error);
        showStatus(
            "Münzen konnten nicht gespeichert werden. " +
            "Bitte einen Münzwert erneut ändern, um es nochmals zu versuchen.",
        );
    } finally {
        savingMoney = false;

        if (moneyRevision > revision) {
            clearTimeout(moneyTimer);
            moneyTimer = setTimeout(() => void saveMoney(), 650);
        }
    }
}

for (const input of Object.values(moneyInputs)) {
    input.disabled = true;

    input.addEventListener("input", () => {
        moneyRevision += 1;
        clearTimeout(moneyTimer);
        moneyTimer = setTimeout(() => void saveMoney(), 650);
    });
}

templateSelect.addEventListener("change", updateTemplatePreview);

form.addEventListener("submit", async event => {
    event.preventDefault();

    if (
        !ready || adding || transferring ||
        transferRefreshFailed || !form.reportValidity()
    ) return;

    const templateId = Number(templateSelect.value);
    const quantity = Number(quantityInput.value);

    if (
        !templates.some(template => template.id === templateId) ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 9999
    ) {
        showStatus("Bitte einen Gegenstand und eine gültige Anzahl wählen.");
        return;
    }

    adding = true;
    updateAddButton();
    showStatus("Gegenstand wird hinzugefügt…");

    try {
        const created = await API.createItemInstance({
            template_id: templateId,
            character_id: characterId,
            quantity,
        });

        // Die erfolgreiche Antwort enthält das gespeicherte Exemplar.
        instances.push(created);
        renderInventory();
        showStatus(`${created.snapshot.name} hinzugefügt.`);
    } catch (error) {
        console.error(error);
        showStatus(error.message || "Hinzufügen fehlgeschlagen.");
    } finally {
        adding = false;
        updateAddButton();
    }
});

document.querySelector("main.page--inventory")
    .addEventListener("click", event => {
        const button = event.target.closest(".collapsibleCard__toggle");
        if (!button) return;

        const card = button.closest(".collapsibleCard");
        const body = card?.querySelector(".collapsibleCard__body");
        if (!body) return;

        const isOpen = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!isOpen));
        body.hidden = isOpen;
        card.classList.toggle("is-open", !isOpen);
    });

// Im neuen Modell sind Zutaten und Questgegenstände zunächst "Sonstiges".
for (const id of ["sec-items-ingredients", "sec-items-quest"]) {
    document.getElementById(id)?.remove();
}

async function startup() {
    if (!characterId) {
        showStatus("Bitte zuerst einen Charakter auswählen.");
        return;
    }

    showStatus("Inventar wird geladen…");

    try {
        const loaded = await Promise.all([
            API.getCharacter(characterId),
            API.listItemTemplates(),
            API.listCharacterInventory(characterId),
            API.listCharacterPrivateStorage(characterId),
        ]);

        [character, templates, instances, privateInstances] = loaded;

        for (const [key, input] of Object.entries(moneyInputs)) {
            input.value = String(
                character.data?.inventory?.money?.[key] ?? 0,
            );
            input.disabled = false;
        }

        ready = true;
        renderTemplates();
        renderInventory();
        renderPrivateStorage();
        showStatus("Inventar geladen.");
    } catch (error) {
        console.error(error);
        showStatus(error.message || "Inventar konnte nicht geladen werden.");
    }
}

void startup();