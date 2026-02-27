export const NAV = [
  {
    key: "sheet",
    title: "Charakterbogen",
    href: "/sheet.html",
    // “Default”-Sections, falls DOM nicht geladen / nicht vorhanden
    sections: [
      ["sec-values", "Werte"],
      ["sec-abilities", "Attribute"],
      ["sec-skills", "Fertigkeiten"],
      ["sec-saves", "Rettungswürfe"],
      ["sec-passives", "Passive Werte"],
      ["sec-deathsaves", "Deathsaves"],
      ["sec-combat", "Kampf"],
    ],
  },
  {
    key: "spells",
    title: "Zauber",
    href: "/spell.html",
    sections: [
      ["sec-spell-attacks", "Zauberangriffe"],
      ["sec-spell-slots", "Zauberslots"],
      ["sec-spell-panel", "Zauberpanel"],
      ["sec-spellbook", "Zauberbuch"],
      ["sec-spell-details", "Zauber-Details"],
    ],
  },
];