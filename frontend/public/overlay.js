import { LABELS_DE } from "./overlay_i18n.js";

function ensureOverlay() {
  let el = document.getElementById("overlay");
  if (el) return el;

  el = document.createElement("div");
  el.id = "overlay";
  el.style.position = "fixed";
  el.style.right = "12px";
  el.style.bottom = "12px";
  el.style.zIndex = "9999";
  el.style.padding = "12px";
  el.style.borderRadius = "12px";
  el.style.maxWidth = "320px";
  el.style.background = "rgba(0,0,0,0.75)";
  el.style.backdropFilter = "blur(6px)";
  el.style.color = "white";
  el.style.fontSize = "14px";
  el.style.lineHeight = "1.25";
  el.style.display = "none";
  document.body.appendChild(el);
  return el;
}

export function showOverlay() { ensureOverlay().style.display = "block"; }
export function hideOverlay() { ensureOverlay().style.display = "none"; }
export function toggleOverlay() {
  const el = ensureOverlay();
  el.style.display = el.style.display === "none" ? "block" : "none";
}

function escapeHtml(s) {
  return (s ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderOverlay(data, labels = LABELS_DE) {
  const el = ensureOverlay();

  const order = [
    "character_name","class","race","level",
    "str","dex","con","int","wis","cha",
    "ac","hp_current","hp_max","speed",
    "notes",
  ];

  const rows = order
    .filter(k => data?.[k] !== undefined && data?.[k] !== null && `${data[k]}`.trim() !== "")
    .map(k => {
      const label = labels[k] ?? k;
      const value = escapeHtml(data[k]);
      return `<div style="display:flex; gap:8px; margin:2px 0;">
        <div style="min-width:120px; opacity:0.85;">${escapeHtml(label)}:</div>
        <div style="font-weight:600;">${value}</div>
      </div>`;
    })
    .join("");

  el.innerHTML = rows || `<div style="opacity:0.85;">Keine Daten.</div>`;
}
