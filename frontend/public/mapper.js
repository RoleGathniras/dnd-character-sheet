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

export function jsonToSheet(data) {
    const d = data || {};

    setInputValue(resolveField("inspiration"), d.inspiration);
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

    // ===== Combat: Death Saves =====
    for (let i = 1; i <= 3; i++) {
        const sId = `death_success_${i}`;
        const fId = `death_fail_${i}`;

        const sEl = document.getElementById(sId);
        if (sEl) sEl.checked = Boolean(d?.[sId]);

        const fEl = document.getElementById(fId);
        if (fEl) fEl.checked = Boolean(d?.[fId]);
    }

}

export function sheetToJson() {
    const out = {};
    out.inspiration = !!resolveField("inspiration")?.checked;
    out.speed = getInputValue(resolveField("speed"));


    out.str = getInputValue(resolveField("str"));
    out.dex = getInputValue(resolveField("dex"));
    out.con = getInputValue(resolveField("con"));
    out.int = getInputValue(resolveField("int"));
    out.wis = getInputValue(resolveField("wis"));
    out.cha = getInputValue(resolveField("cha"));

    out.proficiency_bonus = Number(getInputValue(resolveField("proficiency_bonus")) || 0);

    out.notes_adv_dis = getInputValue(resolveField("notes_adv_dis"));

    ["str", "dex", "con", "int", "wis", "cha"].forEach(a => {
        out[`save_${a}_prof`] = !!resolveField(`save_${a}_prof`)?.checked;
    });
    // ===== Combat: Death Saves =====
    for (let i = 1; i <= 3; i++) {
        out[`death_success_${i}`] = !!document.getElementById(`death_success_${i}`)?.checked;
        out[`death_fail_${i}`] = !!document.getElementById(`death_fail_${i}`)?.checked;
    }
    return out;
}
