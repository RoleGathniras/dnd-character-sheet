// frontend/public/nav.js

function setDisplay(el, value) {
    if (!el) return;
    el.style.display = value;
}

function makeSubButton({label, onClick}) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "drawer__item drawer__sub";
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    return btn;
}

function collectSections(scopeEl) {
    const nodes = scopeEl?.querySelectorAll?.("[data-nav-label][id]") ?? [];
    return [...nodes].map((sec) => ({
        id: sec.id,
        label: sec.getAttribute("data-nav-label") || sec.id,
    }));
}

/**
 * Baut die rechte Navigation.
 * Übergib alles, was sie braucht, damit nav.js unabhängig bleibt.
 */
export function buildSheetNav({
                                  navList,
                                  btnNavOpen,
                                  closeNavDrawer,
                                  sheetRootEl,
                              }) {
    if (!navList) return;

    navList.innerHTML = "";

    // ===== Gruppe: Charakterbogen =====
    const sheetGroup = document.createElement("div");
    sheetGroup.className = "navGroup";

    const sheetTitle = document.createElement("button");
    sheetTitle.type = "button";
    sheetTitle.className = "drawer__item drawer__group";
    sheetTitle.textContent = "Charakterbogen";
    sheetTitle.addEventListener("click", () => {
        closeNavDrawer?.();
        window.location.href = "/index.html";
    });

    sheetGroup.appendChild(sheetTitle);

    const sheetSubList = document.createElement("div");
    sheetSubList.className = "navSubList";

    // Nur dann DOM-Sections sammeln, wenn wir sie wirklich haben
    const onIndexPage =
        window.location.pathname === "/" ||
        window.location.pathname.endsWith("/index.html");

    const sheetSections = onIndexPage ? collectSections(sheetRootEl) : [];

    for (const sec of sheetSections) {
        sheetSubList.appendChild(
            makeSubButton({
                label: sec.label,
                onClick: () => {
                    closeNavDrawer?.();
                    history.replaceState(null, "", `#${encodeURIComponent(sec.id)}`);
                    const target = document.getElementById(sec.id);
                    if (!target) return;
                    target.scrollIntoView({behavior: "smooth", block: "start"});
                    target.focus?.({preventScroll: true});
                },
            })
        );
    }

    // Wenn keine Unterpunkte (z.B. auf spell.html), optionaler Hint
    if (sheetSections.length === 0) {
        const hint = document.createElement("div");
        hint.className = "drawer__item drawer__sub muted";
        hint.textContent = "—";
        hint.style.cursor = "default";
        sheetSubList.appendChild(hint);
    }

    sheetGroup.appendChild(sheetSubList);
    navList.appendChild(sheetGroup);

    // ===== Gruppe: Zauber =====
    const spellsGroup = document.createElement("div");
    spellsGroup.className = "navGroup";

    const spellsTitle = document.createElement("button");
    spellsTitle.type = "button";
    spellsTitle.className = "drawer__item drawer__group";
    spellsTitle.textContent = "Zauber";
    spellsTitle.addEventListener("click", () => {
        closeNavDrawer?.();
        window.location.href = "/spell.html";
    });

    spellsGroup.appendChild(spellsTitle);

    const spellsSubList = document.createElement("div");
    spellsSubList.className = "navSubList";

    const isSpellPage = window.location.pathname.endsWith("/spell.html");
    const spellScope = document.querySelector("main.page--spells") || document;
    const spellSections = isSpellPage ? collectSections(spellScope) : [];

    for (const sec of spellSections) {
        spellsSubList.appendChild(
            makeSubButton({
                label: sec.label,
                onClick: () => {
                    closeNavDrawer?.();
                    history.replaceState(null, "", `#${encodeURIComponent(sec.id)}`);
                    const target = document.getElementById(sec.id);
                    if (!target) return;
                    target.scrollIntoView({behavior: "smooth", block: "start"});
                    target.focus?.({preventScroll: true});
                },
            })
        );
    }

    if (spellSections.length === 0) {
        const hint = document.createElement("div");
        hint.className = "drawer__item drawer__sub muted";
        hint.textContent = "— (Unterpunkte kommen später)";
        hint.style.cursor = "default";
        spellsSubList.appendChild(hint);
    }

    spellsGroup.appendChild(spellsSubList);
    navList.appendChild(spellsGroup);

    // Nav-Button sichtbar, sobald Nav existiert
    setDisplay(btnNavOpen, "inline-block");
}