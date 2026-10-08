import { API } from "/api.js";
import {
    login,
    refreshCurrentUser,
} from "/shared/auth.js";

const btnLogin = document.getElementById("btnLogin");

function setStatus(message) {
    let statusEl = document.getElementById("appStatus");

    if (!statusEl) {
        statusEl = document.createElement("p");
        statusEl.id = "appStatus";
        btnLogin.after(statusEl);
    }

    statusEl.textContent = message;
}

function redirectForRole(user) {
    if (user?.role === "player") {
        window.location.href = "/player/player.html";
        return;
    }

    if (user?.role === "dm") {
        window.location.href = "/dm/campaigns.html";
        return;
    }

    if (user?.role === "admin") {
        window.location.href = "/admin.html";
        return;
    }

    setStatus("Unbekannte Benutzerrolle ❌");
}

async function handleLogin() {
    const username = prompt("Username");
    const password = prompt("Passwort");

    if (!username || !password) return;

    try {
        const user = await login(username, password);
        redirectForRole(user);
    } catch (error) {
        console.error(error);
        setStatus(error?.message || "Login fehlgeschlagen");
    }
}

btnLogin?.addEventListener("click", handleLogin);

async function startupIndex() {
    if (!API.token) {
        return;
    }

    try {
        const user = await refreshCurrentUser();
        redirectForRole(user);
    } catch (error) {
        console.error(error);

        if (error?.status === 401) {
            API.clearToken();
            setStatus("Token ungültig – bitte neu einloggen");
        } else {
            setStatus("Startup-Fehler – bitte Konsole prüfen");
        }
    }
}

startupIndex();