const params = new URLSearchParams(window.location.search);
export const campaignId = Number(params.get("id"));

export function initDmNavigation() {
    const routes = {
        navCampaignOverview: "campaign.html",
        navCampaignPlayers: "players.html",
        navCampaignNpcs: "npcs.html",
        navCampaignEnemies: "enemies.html",
        navCampaignItems: "items.html",
        navCampaignNotes: "notes.html",
        navCampaignCombat: "combat.html",
    };

    for (const [elementId, page] of Object.entries(routes)) {
        const element = document.getElementById(elementId);

        if (!element) continue;

        element.addEventListener("click", () => {
            window.location.href = `${page}?id=${campaignId}`;
        });
    }
}

export function initDmNavDrawer() {
    const btnNavOpen = document.getElementById("btnNavOpen");
    const btnNavClose = document.getElementById("btnNavClose");
    const navDrawer = document.getElementById("navDrawer");
    const navBackdrop = document.getElementById("navBackdrop");

    if (!btnNavOpen || !btnNavClose || !navDrawer || !navBackdrop) {
        return;
    }

    function openNavDrawer() {
        navDrawer.classList.add("is-open");
        navDrawer.setAttribute("aria-hidden", "false");
        navBackdrop.hidden = false;
    }

    function closeNavDrawer() {
        navDrawer.classList.remove("is-open");
        navDrawer.setAttribute("aria-hidden", "true");
        navBackdrop.hidden = true;
    }

    btnNavOpen.addEventListener("click", openNavDrawer);
    btnNavClose.addEventListener("click", closeNavDrawer);
    navBackdrop.addEventListener("click", closeNavDrawer);
}

export function initDmMainDrawer() {
    const btnDrawerOpen = document.getElementById("btnDrawerOpen");
    const btnCloseDrawer = document.getElementById("btnCloseDrawer");
    const drawer = document.getElementById("drawer");
    const backdrop = document.getElementById("backdrop");

    if (!btnDrawerOpen || !btnCloseDrawer || !drawer || !backdrop) {
        return;
    }

    function openDrawer() {
        drawer.classList.add("is-open");
        drawer.setAttribute("aria-hidden", "false");
        backdrop.hidden = false;
    }

    function closeDrawer() {
        drawer.classList.remove("is-open");
        drawer.setAttribute("aria-hidden", "true");
        backdrop.hidden = true;
    }

    btnDrawerOpen.addEventListener("click", openDrawer);
    btnCloseDrawer.addEventListener("click", closeDrawer);
    backdrop.addEventListener("click", closeDrawer);
}

export function initDmMainNavigation() {
    const btnCampaigns = document.getElementById("btnCampaigns");
    const btnLogout = document.getElementById("btnLogout");

    if (btnCampaigns) {
        btnCampaigns.addEventListener("click", () => {
            window.location.href = "campaigns.html";
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            localStorage.removeItem("dnd_token");
            window.location.href = "../index.html";
        });
    }
}