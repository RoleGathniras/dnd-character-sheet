import { NAV } from "./nav_config.js";


function setDisplay(el, value) {
    if (!el) return;
    el.style.display = value;
}

function makeSubButton({ label, onClick }) {
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
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    target.focus?.({ preventScroll: true });
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
    enableDomScan = true,
}) {
    if (!navList) return;
    navList.innerHTML = "";

    for (const groupCfg of NAV) {
        const group = document.createElement("div");
        group.className = "navGroup";

        const onThisPage = isCurrentPage(groupCfg.href);

        const titleBtn = document.createElement("button");
        titleBtn.type = "button";
        titleBtn.className = "drawer__item drawer__group";
        titleBtn.setAttribute("aria-expanded", onThisPage ? "true" : "false");
        titleBtn.textContent = groupCfg.title;

        const subList = document.createElement("div");
        subList.className = "navSubList";
        subList.hidden = !onThisPage;

        titleBtn.addEventListener("click", () => {
            const isOpen = titleBtn.getAttribute("aria-expanded") === "true";
            titleBtn.setAttribute("aria-expanded", String(!isOpen));
            subList.hidden = isOpen;
        });

        group.appendChild(titleBtn);

        let sections = groupCfg.sections.map(([id, label]) => ({ id, label }));

        if (enableDomScan && onThisPage) {
            let scope = document;

            if (groupCfg.key === "sheet") {
                scope = sheetRootEl ?? document;
            } else if (groupCfg.key === "spells") {
                scope = document.querySelector("main.page--spells") ?? document;
            } else if (groupCfg.key === "inventory") {
                scope = document.querySelector("main.page--inventory") ?? document;
            }

            const domSections = collectSections(scope);

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