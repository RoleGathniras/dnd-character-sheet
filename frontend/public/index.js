import { API } from "./api.js";
import {
    refreshCurrentUserAndUI,
    setLoggedInUI,
    setStatus,
} from "./app.js";

(function () {
    const isIndexPage =
        location.pathname === "/" ||
        location.pathname.endsWith("/index") ||
        location.pathname.endsWith("/index.html");

    if (!isIndexPage) return;

    function redirectForRole(user) {
        if (user?.role === "player") {
            window.location.href = "/player/player.html";
            return true;
        }

        if (user?.role === "dm") {
            window.location.href = "/dm/campaigns.html";
            return true;
        }

        if (user?.role === "admin") {
            window.location.href = "/admin.html";
            return true;
        }

        setStatus("Unbekannte Benutzerrolle ❌");
        return false;
    }

    window.addEventListener("auth:login", async () => {
        try {
            const user = await refreshCurrentUserAndUI();
            redirectForRole(user);
        } catch (e) {
            console.error("[index.js] Fehler nach Login", e);
            setStatus("Login ok, aber Weiterleitung fehlgeschlagen ❌");
        }
    });

    (async function startupIndex() {
        if (!API.token) {
            setLoggedInUI(false);
            setStatus("Bereit");
            return;
        }

        try {
            const user = await refreshCurrentUserAndUI();
            redirectForRole(user);
        } catch (e) {
            console.error("[index.js] Startup fehlgeschlagen", e);

            if (e?.status === 401) {
                API.token = null;
                setLoggedInUI(false);
                setStatus("Token ungültig – bitte neu einloggen");
            } else {
                setStatus("Startup-Fehler – bitte Konsole prüfen");
            }
        }
    })();
})();