import { API } from "/api.js";
import { buildSheetNav } from "/nav.js";
import { initDrawer } from "/shared/drawer.js";
import {
    logout,
    refreshCurrentUser,
} from "/shared/auth.js";
import {
    initCharacterStatusbar,
    loadCharacterStatusbar,
} from "/character_statusbar.js";
import { renderPlayerCharacters } from "/player/player-characters.js";
import {
    initPlayerTopbar,
    loadPlayerTopbar,
} from "/player/player-topbar.js";
let playerSessionPromise = null;

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
    startPlayerSession().catch(error => {
        console.error("Player-Session konnte nicht gestartet werden:", error);
    });
}

export async function authenticatePlayer() {
    if (!API.token) {
        return null;
    }

    try {
        const user = await refreshCurrentUser();

        if (user.role !== "player") {
            throw new Error("Diese Seite ist nur für Spieler vorgesehen.");
        }

        return user;
    } catch (error) {
        if (error?.status === 401) {
            API.clearToken();
        }

        throw error;
    }
}

export function startPlayerSession() {
    if (!playerSessionPromise) {
        playerSessionPromise = (async () => {
            const user = await authenticatePlayer();

            if (!user) {
                return null;
            }

            await renderPlayerCharacters();

            return user;
        })().catch(error => {
            playerSessionPromise = null;
            throw error;
        });
    }

    return playerSessionPromise;
}
export function setLoggedInUI(isLoggedIn) {
    for (const id of ["btnLogout", "btnMenu", "btnNavOpen"]) {
        const element = document.getElementById(id);

        if (element) {
            element.style.display = isLoggedIn ? "inline-block" : "none";
        }
    }

    const avatar = document.getElementById("currentCharacterAvatar");
    if (avatar) {
        avatar.hidden = !isLoggedIn;
    }

    const sheetRoot = document.getElementById("sheetRoot");
    if (sheetRoot) {
        sheetRoot.style.display = isLoggedIn ? "" : "none";
    }
}