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

export function initPlayerLayout() {
    const navDrawer = document.getElementById("navDrawer");
    const navBackdrop = document.getElementById("navBackdrop");
    const btnNavOpen = document.getElementById("btnNavOpen");
    const btnNavClose = document.getElementById("btnNavClose");
    const navList = document.getElementById("navList");
    const sheetRootEl = document.getElementById("sheetRoot");

    if (
        !navDrawer ||
        !navBackdrop ||
        !btnNavOpen ||
        !btnNavClose ||
        !navList
    ) {
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
