import {
    getCurrentUser,
    refreshCurrentUser,
} from "/shared/auth.js";

export function renderDrawerTitle() {
    const el = document.getElementById("drawerUserTitle");

    if (!el) return;

    const currentUser = getCurrentUser();

    if (!currentUser) {
        el.textContent = "Charaktere";
        return;
    }

    const username = currentUser.username ?? "???";
    const role = currentUser.role ?? "";

    el.textContent = role ? `${username} (${role})` : username;
}

export async function refreshCurrentUserAndUI() {
    try {
        const user = await refreshCurrentUser();
        renderDrawerTitle();
        return user;
    } catch (error) {
        console.error(error);
        renderDrawerTitle();
        throw error;
    }
}