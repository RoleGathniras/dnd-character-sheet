function byId(id) {
    return document.getElementById(id);
}

function qs(sel) {
    return document.querySelector(sel);
}

function getInputValue(el) {
    if (!el) return "";
    if (el.type === "checkbox") return !!el.checked;
    return (el.value ?? "").toString();
}

function setInputValue(el, value) {
    if (!el) return;
    if (el.type === "checkbox") {
        el.checked = !!value;
        return;
    }
    el.value = value ?? "";
}

function resolveField(key) {
    return byId(key) || qs(`[name="${key}"]`) || qs(`[data-field="${key}"]`);
}

function readNumber(id, fallback = 0) {
    const el = document.getElementById(id);
    if (!el) return fallback;
    const raw = String(el.value ?? "").trim().replace(",", ".");
    if (raw === "") return fallback;
    const v = Number(raw);
    return Number.isFinite(v) ? v : fallback;
}

function readCheckbox(id) {
    const el = document.getElementById(id);
    return !!el && !!el.checked;
}

function writeValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value ?? "";
}

function writeCheckbox(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.checked = !!value;
}

function setCheckboxValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.checked = !!value;
}

function toIntOrNull(v) {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (s === "") return null;
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return Math.trunc(n);
}

function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
}

export function jsonToSheet(data) {
    const d = data || {};

    console.log("=== jsonToSheet DEBUG ===");
    console.log("PB from JSON:", d.proficiency_bonus);
    console.log("PB field resolve:", resolveField("proficiency_bonus"));

    setInputValue(resolveField("character_name"), d.character_name);
    setInputValue(resolveField("class"), d.class);
    setInputValue(resolveField("race"), d.race);
    setInputValue(resolveField("level"), d.level);
    setInputValue(resolveField("inspiration"), d.inspiration);

    setInputValue(resolveField("ac"), d.ac);
    setInputValue(resolveField("hp_current"), d.hp_current);
    setInputValue(resolveField("hp_max"), d.hp_max);
    setInputValue(resolveField("hp_temp"), d.hp_temp);
    setInputValue(resolveField("speed"), d.speed);

    setInputValue(resolveField("str"), d.str);
    setInputValue(resolveField("dex"), d.dex);
    setInputValue(resolveField("con"), d.con);
    setInputValue(resolveField("int"), d.int);
    setInputValue(resolveField("wis"), d.wis);
    setInputValue(resolveField("cha"), d.cha);

    setInputValue(resolveField("proficiency_bonus"), d.proficiency_bonus ?? "");

    setInputValue(resolveField("notes_adv_dis"), d.notes_adv_dis);

    ["str", "dex", "con", "int", "wis", "cha"].forEach(a => {
        setInputValue(resolveField(`save_${a}_prof`), d[`save_${a}_prof`]);
    });

    // Skill-Proficiencies (alle Checkboxen automatisch setzen)
    document
        .querySelectorAll('input[type="checkbox"][id^="skill_"][id$="_prof"]')
        .forEach((el) => {
            // JSON keys sind exakt die IDs (z.B. "skill_stealth_prof")
            el.checked = Boolean(d?.[el.id]);
        });
}

export function sheetToJson() {
    const out = {};
    console.log("sheetToJson() VERSION: PB PATCH ACTIVE ✅");
    out.character_name = getInputValue(resolveField("character_name"));
    out.class = getInputValue(resolveField("class"));
    out.race = getInputValue(resolveField("race"));
    out.level = getInputValue(resolveField("level"));
    out.inspiration = !!resolveField("inspiration")?.checked;
    out.ac = getInputValue(resolveField("ac"));
    out.speed = getInputValue(resolveField("speed"));

// --- HP Normalisierung ---
    const hpMaxRaw = toIntOrNull(getInputValue(resolveField("hp_max")));
    const hpCurRaw = toIntOrNull(getInputValue(resolveField("hp_current")));
    const hpTempRaw = toIntOrNull(getInputValue(resolveField("hp_temp")));

    const hp_max = hpMaxRaw === null ? null : Math.max(0, hpMaxRaw);
    let hp_current = hpCurRaw === null ? null : hpCurRaw;
    const hp_temp = hpTempRaw === null ? null : Math.max(0, hpTempRaw);

// Current clampen
    if (hp_current !== null) {
        if (hp_max !== null) {
            hp_current = clamp(hp_current, 0, hp_max);
        } else {
            hp_current = Math.max(0, hp_current);
        }
    }

    out.hp_max = hp_max;
    out.hp_current = hp_current;
    out.hp_temp = hp_temp;

    out.str = getInputValue(resolveField("str"));
    out.dex = getInputValue(resolveField("dex"));
    out.con = getInputValue(resolveField("con"));
    out.int = getInputValue(resolveField("int"));
    out.wis = getInputValue(resolveField("wis"));
    out.cha = getInputValue(resolveField("cha"));

    out.proficiency_bonus = Number(getInputValue(resolveField("proficiency_bonus")) || 0);

    // Übungsbonus
    console.log("PB el:", resolveField("proficiency_bonus"));
    console.log("PB raw:", resolveField("proficiency_bonus")?.value);

    // Skill-Proficiencies (alle Checkboxen automatisch persistieren)
    document
        .querySelectorAll('input[type="checkbox"][id^="skill_"][id$="_prof"]')
        .forEach((el) => {
            out[el.id] = el.checked;
        });

    console.log("=== sheetToJson DEBUG ===");
    console.log("PB field:", resolveField("proficiency_bonus"));
    console.log("PB raw value:", resolveField("proficiency_bonus")?.value);
    console.log("PB in out:", out.proficiency_bonus);

    out.notes_adv_dis = getInputValue(resolveField("notes_adv_dis"));

    ["str", "dex", "con", "int", "wis", "cha"].forEach(a => {
        out[`save_${a}_prof`] = !!resolveField(`save_${a}_prof`)?.checked;
    });
    return out;
}
