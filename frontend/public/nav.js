import {NAV} from "./nav_config.js";


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

function isCurrentPage(href) {
    const path = window.location.pathname;

    // index.html ist Landing/Login (oder Dashboard)
    if (href === "/index.html") {
        return path === "/" || path.endsWith("/index") || path.endsWith("/index.html");
    }

    // sheet/spell/inventory etc.
    return path.endsWith(href);
}

function scrollToSection(id, closeNavDrawer) {
    closeNavDrawer?.();
    history.replaceState(null, "", `#${encodeURIComponent(id)}`);
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({behavior: "smooth", block: "start"});
    target.focus?.({preventScroll: true});
}

/**
 * Konfig-basierte rechte Navigation.
 * DOM-Scan ist optional: wenn aktiv, überschreibt er Labels aus NAV.
 */
export function buildSheetNav({
                                  navList,
                                  btnNavOpen,
                                  closeNavDrawer,
                                  sheetRootEl,
                                  enableDomScan = true, // <- optionaler Schalter
                              }) {
    if (!navList) return;
    navList.innerHTML = "";

    for (const groupCfg of NAV) {
        const group = document.createElement("div");
        group.className = "navGroup";

        const titleBtn = document.createElement("button");
        titleBtn.type = "button";
        titleBtn.className = "drawer__item drawer__group";
        titleBtn.textContent = groupCfg.title;
        titleBtn.addEventListener("click", () => {
            closeNavDrawer?.();
            window.location.href = groupCfg.href;
        });

        group.appendChild(titleBtn);

        const subList = document.createElement("div");
        subList.className = "navSubList";

        const onThisPage = isCurrentPage(groupCfg.href);

        // Default: aus Config
        let sections = groupCfg.sections.map(([id, label]) => ({id, label}));

        // Optional: DOM-Scan nur wenn wir auf der Seite sind (und Root sinnvoll)
        if (enableDomScan && onThisPage) {
            const scope =
                groupCfg.key === "sheet"
                    ? (sheetRootEl ?? document)
                    : (document.querySelector("main.page--spells") ?? document);

            const domSections = collectSections(scope);

            // Wenn DOM was liefert: Labels aus DOM nehmen, Reihenfolge wie NAV behalten (Fallback: NAV)
            if (domSections.length) {
                const byId = new Map(domSections.map((s) => [s.id, s]));
                sections = sections.map((s) => byId.get(s.id) ?? s);
            }
        }

        for (const sec of sections) {
            subList.appendChild(
                makeSubButton({
                    label: sec.label,
                    onClick: () => {
                        if (!onThisPage) {
                            // Wenn wir NICHT auf der Seite sind: Seite + Hash laden
                            closeNavDrawer?.();
                            window.location.href = `${groupCfg.href}#${encodeURIComponent(sec.id)}`;
                            return;
                        }
                        scrollToSection(sec.id, closeNavDrawer);
                    },
                })
            );
        }

        group.appendChild(subList);
        navList.appendChild(group);
    }

    setDisplay(btnNavOpen, "inline-block");
}