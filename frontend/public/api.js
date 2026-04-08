export const API = {
    tokenKey: "dnd_token",

    get token() {
        return localStorage.getItem(this.tokenKey);
    },

    set token(value) {
        if (value) localStorage.setItem(this.tokenKey, value);
        else localStorage.removeItem(this.tokenKey);
    },

    clearToken() {
        this.token = null;
    },

    async login(username, password) {
        const body = new URLSearchParams();
        body.set("username", username);
        body.set("password", password);

        const res = await fetch("/api/auth/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Login fehlgeschlagen: ${text}`);
        }

        const data = await res.json();
        this.token = data.access_token;
        return data;
    },

    async request(path, options = {}) {
        const headers = new Headers(options.headers || {});
        const token = this.token;

        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }

        const response = await fetch(`/api${path}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const contentType = response.headers.get("content-type") || "";
            const responseBody = contentType.includes("application/json")
                ? await response.json()
                : await response.text();

            const detail = responseBody?.detail;
            let message = "";

            if (typeof detail === "string") {
                message = detail;
            } else if (Array.isArray(detail)) {
                message = detail
                    .map((entry) => {
                        const loc = Array.isArray(entry?.loc) ? entry.loc.join(".") : "unknown";
                        const msg = entry?.msg || "Ungültige Eingabe";
                        return `${loc}: ${msg}`;
                    })
                    .join(" | ");
            } else if (detail?.message) {
                message = detail.message;
            } else if (typeof responseBody === "string") {
                message = responseBody;
            }

            if (!message) {
                if (response.status === 401) message = "Nicht eingeloggt oder Sitzung abgelaufen.";
                else if (response.status === 403) message = "Keine Berechtigung.";
                else if (response.status === 404) message = "Ressource nicht gefunden.";
                else if (response.status === 409) message = "Konflikt mit dem aktuellen Datenstand.";
                else if (response.status === 422) message = "Ungültige Eingabedaten.";
                else message = "Unbekannter Fehler.";
            }

            const error = new Error(message);
            error.status = response.status;
            error.path = path;
            error.method = options.method || "GET";
            error.raw = responseBody;

            throw error;
        }

        if (response.status === 204) {
            return null;
        }

        const contentType = response.headers.get("content-type") || "";
        return contentType.includes("application/json")
            ? await response.json()
            : await response.text();
    },

    // ===== User =====

    me() {
        return this.request("/users/me");
    },

    // ===== Characters =====

    characters() {
        return this.request("/characters");
    },

    listCharacters() {
        return this.characters();
    },

    getCharacter(id) {
        return this.request(`/characters/${id}`);
    },

    createCharacter(payload) {
        return this.request("/characters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
    },

    patchCharacter(id, payload) {
        return this.request(`/characters/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
    },

    updateCharacter(id, payload) {
        return this.patchCharacter(id, payload);
    },

    deleteCharacter(id) {
        return this.request(`/characters/${id}`, {
            method: "DELETE",
        });
    },

    // ===== Admin =====

    listUsers() {
        return this.request("/users");
    },

    createUser({ username, password, role = "player", isActive = true }) {
        return this.request("/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username,
                password,
                role,
                is_active: isActive,
            }),
        });
    },

    async createUserByAdmin({ username, password, role = "player", isActive = true }) {
        return this.createUser({ username, password, role, isActive });
    },

    updateUser(id, payload) {
        return this.request(`/users/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
    },

    patchUserRole(id, role) {
        return this.updateUser(id, { role });
    },

    setUserActive(id, isActive) {
        return this.updateUser(id, { is_active: isActive });
    },

    activateUser(id) {
        return this.setUserActive(id, true);
    },

    deactivateUser(id) {
        return this.setUserActive(id, false);
    },

    changeUserPassword(id, password) {
        return this.updateUser(id, { password });
    },

    deleteUser(id) {
        return this.request(`/users/${id}`, {
            method: "DELETE",
        });
    },

    // ===== Legacy / entfernt im Backend =====

    async register() {
        throw new Error("Die offene Registrierung wurde entfernt. User müssen jetzt vom Admin angelegt werden.");
    },
};