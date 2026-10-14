import { API } from "/api.js";

const form = document.getElementById("createItemForm");
const fields = document.getElementById("itemFields");
const category = document.getElementById("category");
const weaponFields = document.getElementById("weaponFields");
const armorFields = document.getElementById("armorFields");
const status = document.getElementById("createItemStatus");

let ready = false;
let saving = false;

function addField(containerId, name, title, options = {}) {
    const wrapper = document.createElement("div");
    const label = document.createElement("label");
    label.htmlFor = name;
    label.textContent = title;

    const input = document.createElement(
        options.choices ? "select" : "input",
    );

    input.id = name;
    input.name = name;

    if (options.choices) {
        for (const [value, text] of options.choices) {
            input.add(new Option(text, value));
        }
    } else {
        input.type = options.type ?? "text";

        for (const attribute of ["min", "max", "step", "maxLength", "pattern"]) {
            if (options[attribute] !== undefined) {
                input[attribute] = options[attribute];
            }
        }
    }

    input.required = options.required ?? false;

    if (options.value !== undefined) {
        input.value = options.value;
    }

    wrapper.append(label, input);
    document.getElementById(containerId).appendChild(wrapper);
    return input;
}

addField("commonFields", "name", "Name", {
    required: true,
    maxLength: 100,
});

addField("commonFields", "cost_amount", "Wert", {
    type: "number",
    min: "0",
    max: "9999999999.99",
    step: "0.01",
    value: "0",
    required: true,
});

addField("commonFields", "cost_currency", "Währung", {
    value: "gp",
    choices: [
        ["cp", "Kupfer"],
        ["sp", "Silber"],
        ["ep", "Elektrum"],
        ["gp", "Gold"],
        ["pp", "Platin"],
    ],
});

addField("commonFields", "weight_lb", "Gewicht in Pfd", {
    type: "number",
    min: "0",
    max: "999999999.999",
    step: "0.001",
    value: "0",
    required: true,
});

addField("weaponInputs", "weapon_type", "Waffenart", {
    choices: [
        ["simple_melee", "Einfache Nahkampfwaffe"],
        ["simple_ranged", "Einfache Fernkampfwaffe"],
        ["martial_melee", "Nahkampf-Kriegswaffe"],
        ["martial_ranged", "Fernkampf-Kriegswaffe"],
    ],
});

addField("weaponInputs", "damage_dice", "Schadenswürfel, z. B. 1d8", {
    required: true,
    maxLength: 30,
    pattern: "[1-9][0-9]*d[1-9][0-9]*",
});

addField("weaponInputs", "damage_type", "Schadensart, z. B. Hieb", {
    required: true,
    maxLength: 50,
});

const hands = addField("weaponInputs", "hand_requirement", "Benötigte Hände", {
    choices: [
        ["one", "Einhändig"],
        ["two", "Zweihändig"],
        ["versatile", "Vielseitig"],
    ],
});

const versatile = addField(
    "weaponInputs",
    "versatile_damage",
    "Schadenswürfel bei zweihändiger Nutzung",
    {
        maxLength: 30,
        pattern: "[1-9][0-9]*d[1-9][0-9]*",
    },
);

addField("weaponInputs", "range_normal", "Normale Fernkampf-/Wurfreichweite in Metern", {
    type: "number",
    min: "0.1",
    step: "0.1",
});

addField("weaponInputs", "range_long", "Lange Fernkampf-/Wurfreichweite in Metern", {
    type: "number",
    min: "0.1",
    step: "0.1",
});

addField("weaponInputs", "properties", "Eigenschaften, durch Komma getrennt", {
    maxLength: 1529,
});

addField("armorInputs", "armor_type", "Rüstungsart", {
    choices: [
        ["light", "Leicht"],
        ["medium", "Mittelschwer"],
        ["heavy", "Schwer"],
        ["shield", "Schild"],
    ],
});

addField("armorInputs", "ac_value", "Rüstungsklasse / RK-Bonus bei Schild", {
    type: "number",
    min: "0",
    step: "1",
    required: true,
});

const modifier = addField("armorInputs", "ac_modifier", "RK-Modifikator", {
    choices: [
        ["", "Keiner"],
        ["str", "Stärke"],
        ["dex", "Geschicklichkeit"],
        ["con", "Konstitution"],
        ["int", "Intelligenz"],
        ["wis", "Weisheit"],
        ["cha", "Charisma"],
    ],
});

const cap = addField("armorInputs", "modifier_cap", "Modifikator maximal (optional)", {
    type: "number",
    min: "0",
    step: "1",
});

addField("armorInputs", "strength_required", "Benötigte Stärke (optional)", {
    type: "number",
    min: "0",
    step: "1",
});

addField("armorInputs", "stealth_disadvantage", "Nachteil auf Heimlichkeit", {
    type: "checkbox",
});

addField("armorInputs", "slot", "Slot", {
    value: "body",
    choices: [
        ["head", "Kopf"],
        ["body", "Körper"],
        ["arms", "Arme"],
        ["legs", "Beine"],
        ["feet", "Füße"],
        ["back", "Rücken"],
        ["hand", "Hand"],
    ],
});

function updateConditionalFields() {
    const isWeapon = category.value === "weapon";
    const isArmor = category.value === "armor";

    weaponFields.hidden = !isWeapon;
    weaponFields.disabled = !isWeapon;
    armorFields.hidden = !isArmor;
    armorFields.disabled = !isArmor;

    const isVersatile = hands.value === "versatile";
    versatile.disabled = !isVersatile;
    versatile.required = isWeapon && isVersatile;
    versatile.parentElement.hidden = !isVersatile;

    cap.disabled = !modifier.value;
}

category.addEventListener("change", updateConditionalFields);
hands.addEventListener("change", updateConditionalFields);
modifier.addEventListener("change", updateConditionalFields);

function value(name) {
    return form.elements.namedItem(name).value.trim();
}

function optionalNumber(name) {
    const text = value(name);
    return text === "" ? null : Number(text);
}

function buildPayload() {
    const payload = {
        name: value("name"),
        category: category.value,
        description: value("description"),
        cost_amount: value("cost_amount"),
        cost_currency: value("cost_currency"),
        weight_lb: value("weight_lb"),
    };

    if (!payload.name) {
        throw new Error("Bitte einen Namen eingeben.");
    }

    if (payload.category === "weapon") {
        const properties = [...new Set(
            value("properties")
                .split(",")
                .map(entry => entry.trim())
                .filter(Boolean),
        )];

        if (properties.length > 30 || properties.some(entry => entry.length > 50)) {
            throw new Error(
                "Maximal 30 Eigenschaften mit jeweils höchstens 50 Zeichen.",
            );
        }

        const normal = optionalNumber("range_normal");
        const long = optionalNumber("range_long");

        if (long !== null && (normal === null || long < normal)) {
            throw new Error(
                "Die lange Reichweite benötigt eine normale Reichweite " +
                "und darf nicht kleiner sein.",
            );
        }

        payload.weapon = {
            weapon_type: value("weapon_type"),
            damage_dice: value("damage_dice"),
            damage_type: value("damage_type"),
            hand_requirement: hands.value,
            versatile_damage: hands.value === "versatile"
                ? value("versatile_damage")
                : null,
            range_normal: normal,
            range_long: long,
            properties,
        };
    }

    if (payload.category === "armor") {
        payload.armor = {
            armor_type: value("armor_type"),
            ac_value: Number(value("ac_value")),
            ac_modifier: modifier.value || null,
            modifier_cap: modifier.value
                ? optionalNumber("modifier_cap")
                : null,
            strength_required: optionalNumber("strength_required"),
            stealth_disadvantage:
                form.elements.namedItem("stealth_disadvantage").checked,
            slot: value("slot"),
        };
    }

    return payload;
}

form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!ready || saving || !form.reportValidity()) return;

    let payload;

    try {
        payload = buildPayload();
    } catch (error) {
        status.textContent = error.message;
        return;
    }

    saving = true;
    fields.disabled = true;
    status.textContent = "Vorlage wird erstellt…";

    try {
        const created = await API.createItemTemplate(payload);

        form.reset();
        updateConditionalFields();
        status.textContent =
            `„${created.name}“ erstellt. Die Vorlage ist jetzt im Inventar verfügbar.`;
    } catch (error) {
        console.error(error);
        status.textContent = error.message || "Erstellung fehlgeschlagen.";
    } finally {
        saving = false;
        fields.disabled = false;
    }
});

async function startup() {
    updateConditionalFields();

    if (!API.token) {
        status.textContent = "Bitte zuerst einloggen.";
        return;
    }

    try {
        const user = await API.me();
        const backLink = document.getElementById("backLink");

        if (user.role === "player") {
            backLink.href = "/player/inventory.html";
        } else if (user.role === "dm") {
            backLink.href = "/dm/campaigns.html";
        } else {
            backLink.href = "/admin/admin.html";
        }

        ready = true;
        fields.disabled = false;
    } catch (error) {
        console.error(error);
        status.textContent = error.message || "Sitzung konnte nicht geladen werden.";
    }
}

void startup();