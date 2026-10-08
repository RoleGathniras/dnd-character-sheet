import { buildSheetNav } from "/nav.js";
import { initDrawer } from "/shared/drawer.js";
import {
    initCharacterStatusbar,
    loadCharacterStatusbar,
} from "/character_statusbar.js";
import {
    initPlayerTopbar,
    loadPlayerTopbar,
} from "/player/player-topbar.js";
import { logout } from "/shared/auth.js";

export function initPlayerLayout() {
    // Linker Player-Drawer
    const drawer = document.getElementById("drawer");
    const backdrop = document.getElementById("backdrop");
    const btnMenu = document.getElementById("btnMenu");
    const btnClose = document.getElementById("btnCloseDrawer");

    const playerMainDrawer = initDrawer({
        drawer,
        backdrop,
        openButton: btnMenu,
        closeButton: btnClose,
    });

    const btnPlayerRules = document.getElementById("btnPlayerRules");

    btnPlayerRules?.addEventListener("click", () => {
        playerMainDrawer?.close();
        window.location.href = "/player_rules.html";
    });

    const btnLogout = document.getElementById("btnLogout");

    btnLogout?.addEventListener("click", () => {
        logout();

        localStorage.removeItem("dnd_current_character_id");
        localStorage.removeItem("selectedCharacterId");

        window.location.href = "/index.html";
    });

    // Rechter Navigationsdrawer
    const navDrawer = document.getElementById("navDrawer");
    const navBackdrop = document.getElementById("navBackdrop");
    const btnNavOpen = document.getElementById("btnNavOpen");
    const btnNavClose = document.getElementById("btnNavClose");
    const navList = document.getElementById("navList");
    const sheetRootEl = document.getElementById("sheetRoot");

    const hasSheetNavigation =
        navDrawer &&
        navBackdrop &&
        btnNavOpen &&
        btnNavClose &&
        navList;

    if (!hasSheetNavigation) {
        return;
    }

    const playerNavDrawer = initDrawer({
        drawer: navDrawer,
        backdrop: navBackdrop,
        openButton: btnNavOpen,
        closeButton: btnNavClose,
    });

    buildSheetNav({
        navList,
        btnNavOpen,
        closeNavDrawer: () => playerNavDrawer?.close(),
        sheetRootEl,
    });

    const currentCharacterId =
        Number(localStorage.getItem("dnd_current_character_id")) || null;

    initCharacterStatusbar();

    if (currentCharacterId) {
        loadCharacterStatusbar(currentCharacterId);
    }

    initPlayerTopbar();
    loadPlayerTopbar();
}
