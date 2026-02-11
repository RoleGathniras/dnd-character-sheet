function byId(id) { return document.getElementById(id); }
function qs(sel) { return document.querySelector(sel); }

function getInputValue(el) {
  if (!el) return "";
  if (el.type === "checkbox") return !!el.checked;
  return (el.value ?? "").toString();
}

function setInputValue(el, value) {
  if (!el) return;
  if (el.type === "checkbox") { el.checked = !!value; return; }
  el.value = value ?? "";
}

function resolveField(key) {
  return byId(key) || qs(`[name="${key}"]`) || qs(`[data-field="${key}"]`);
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

  setInputValue(resolveField("notes"), d.notes);
}

export function sheetToJson() {
  const out = {};
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

  out.notes = getInputValue(resolveField("notes"));
  return out;
}
