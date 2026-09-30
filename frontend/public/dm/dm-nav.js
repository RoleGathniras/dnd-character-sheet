const params = new URLSearchParams(window.location.search);
export const campaignId = Number(params.get("id"));

if (campaignId) {
    sessionStorage.setItem("dnd_dm_campaign_id", String(campaignId));
}
import { initDrawer } from "/shared/drawer.js";
import { DM_NAV } from "./dm-nav-config.js";


function createDmNavButton(title, href) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "drawer__item";
    button.textContent = title;

    button.addEventListener("click", () => {
        window.location.href = `${href}?id=${campaignId}`;
    });

    return button;
}

export function initDmNavigation() {
    const navList = document.getElementById("navList");

    if (!navList) {
        return;
    }

    navList.innerHTML = "";

    for (const group of DM_NAV) {
        // Einzelner Navigationseintrag, z. B. Übersicht
        if (group.href) {
            const list = document.createElement("div");
            list.className = "drawer__list";

            const button = createDmNavButton(group.title, group.href);

            list.appendChild(button);
            navList.appendChild(list);
            continue;
        }

        // Gruppe, z. B. Spieler, Welt oder Spielleitung
        const section = document.createElement("div");
        section.className = "drawer__section";

        const title = document.createElement("div");
        title.className = "drawer__title";
        title.textContent = group.title;

        const list = document.createElement("div");
        list.className = "drawer__list";

        for (const item of group.items ?? []) {
            list.appendChild(
                createDmNavButton(item.title, item.href)
            );
        }

        section.appendChild(title);
        section.appendChild(list);
        navList.appendChild(section);
    }
}

export function initDmNavDrawer() {
    initDrawer({
        drawer: document.getElementById("navDrawer"),
        backdrop: document.getElementById("navBackdrop"),
        openButton: document.getElementById("btnNavOpen"),
        closeButton: document.getElementById("btnNavClose"),
    });
}

export function initDmMainDrawer() {
    initDrawer({
        drawer: document.getElementById("drawer"),
        backdrop: document.getElementById("backdrop"),
        openButton: document.getElementById("btnDrawerOpen"),
        closeButton: document.getElementById("btnCloseDrawer"),
    });
}

export function initDmMainNavigation() {
    const btnCampaigns = document.getElementById("btnCampaigns");
    const btnLogout = document.getElementById("btnLogout");

    if (btnCampaigns) {
        btnCampaigns.addEventListener("click", () => {
            window.location.href = "/dm/campaigns.html";
        });
        document.getElementById("btnPlayerRules")?.addEventListener("click", () => {
            window.location.href = "/player_rules.html";
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            localStorage.removeItem("dnd_token");
            window.location.href = "/index.html";
        });
    }
}