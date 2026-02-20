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

export function jsonToSheet(data) {
    const d = data || {};
    setInputValue(resolveField("character_name"), d.character_name);
    setInputValue(resolveField("class"), d.class);
    setInputValue(resolveField("race"), d.race);
    setInputValue(resolveField("level"), d.level);

    setInputValue(resolveField("ac"), d.ac);
    setInputValue(resolveField("hp_current"), d.hp_current);
    setInputValue(resolveField("hp_max"), d.hp_max);
    setInputValue(resolveField("speed"), d.speed);

    setInputValue(resolveField("str"), d.str);
    setInputValue(resolveField("dex"), d.dex);
    setInputValue(resolveField("con"), d.con);
    setInputValue(resolveField("int"), d.int);
    setInputValue(resolveField("wis"), d.wis);
    setInputValue(resolveField("cha"), d.cha);

    setInputValue(resolveField("proficiency_bonus"), d.proficiency_bonus ?? "");
    setCheckboxValue(resolveField("skill_athletics_prof"), !!d.skill_athletics_prof);
    setCheckboxValue(resolveField("skill_perception_prof"), !!d.skill_perception_prof);
    setCheckboxValue(resolveField("skill_persuasion_prof"), !!d.skill_persuasion_prof);
}

export function sheetToJson() {
    const out = {};
    console.log("sheetToJson() VERSION: PB PATCH ACTIVE ✅");
    out.character_name = getInputValue(resolveField("character_name"));
    out.class = getInputValue(resolveField("class"));
    out.race = getInputValue(resolveField("race"));
    out.level = getInputValue(resolveField("level"));

    out.ac = getInputValue(resolveField("ac"));
    out.hp_current = getInputValue(resolveField("hp_current"));
    out.hp_max = getInputValue(resolveField("hp_max"));
    out.speed = getInputValue(resolveField("speed"));

    out.str = getInputValue(resolveField("str"));
    out.dex = getInputValue(resolveField("dex"));
    out.con = getInputValue(resolveField("con"));
    out.int = getInputValue(resolveField("int"));
    out.wis = getInputValue(resolveField("wis"));
    out.cha = getInputValue(resolveField("cha"));

    // Übungsbonus
    out.proficiency_bonus = getInputValue(resolveField("proficiency_bonus"));

    // Skill-Proficiencies (Checkboxen)
    out.skill_athletics_prof =
        document.getElementById(resolveField("skill_athletics_prof"))?.checked ?? false;

    out.skill_perception_prof =
        document.getElementById(resolveField("skill_perception_prof"))?.checked ?? false;

    out.skill_persuasion_prof =
        document.getElementById(resolveField("skill_persuasion_prof"))?.checked ?? false;
    console.log("PB id:", resolveField("proficiency_bonus"));
    console.log("PB raw:", document.getElementById(resolveField("proficiency_bonus"))?.value);
    return out;
}
