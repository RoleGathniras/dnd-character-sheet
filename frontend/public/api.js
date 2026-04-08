export const API = {
    tokenKey: "dnd_token",

    get token() {
        return localStorage.getItem(this.tokenKey);
    },

    set token(v) {
        if (v) localStorage.setItem(this.tokenKey, v);
        else localStorage.removeItem(this.tokenKey);
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
            const txt = await res.text();
            throw new Error(`Login fehlgeschlagen: ${txt}`);
        }

        const data = await res.json();
        this.token = data.access_token;
        return data;
    },
    async register(username, password) {
        return this.request("/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });
    },


    async request(path, opts = {}) {
        const headers = new Headers(opts.headers || {});
        const t = this.token;
        if (t) headers.set("Authorization", `Bearer ${t}`);

        const res = await fetch(`/api${path}`, { ...opts, headers });

        if (!res.ok) {
            const ct = res.headers.get("content-type") || "";
            const body = ct.includes("application/json")
                ? await res.json()
                : await res.text();

            const detail = body?.detail;
            let reason = "";

            if (typeof detail === "string") {
                reason = detail;
            } else if (Array.isArray(detail)) {
                reason = detail
                    .map((entry) => {
                        const loc = Array.isArray(entry?.loc) ? entry.loc.join(".") : "unknown";
                        const msg = entry?.msg || "Ungültige Eingabe";
                        return `${loc}: ${msg}`;
                    })
                    .join(" | ");
            } else if (detail?.message) {
                reason = detail.message;
            } else if (typeof body === "string") {
                reason = body;
            }

            if (!reason) {
                if (res.status === 401) reason = "Nicht eingeloggt oder Sitzung abgelaufen.";
                else if (res.status === 404) reason = "Charakter nicht verfügbar oder kein Zugriff.";
                else if (res.status === 422) reason = "Ungültige Eingabedaten.";
                else reason = "Unbekannter Fehler.";
            }

            const err = new Error(reason);
            err.status = res.status;
            err.path = path;
            err.method = opts.method || "GET";
            err.raw = body;

            throw err;
        }

        const ct = res.headers.get("content-type") || "";
        return ct.includes("application/json") ? res.json() : res.text();
    },


    // ===== User =====

    me() {
        return this.request("/users/me");
    },

    // ===== Characters =====

    characters() {
        return this.request("/characters");
    },

    getCharacter(id) {
        return this.request(`/characters/${id}`);
    },
    createCharacter(payload) {
        return this.request(`/characters`, {
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
    deleteCharacter(id) {
        return this.request(`/characters/${id}`, {
            method: "DELETE",
        });
    },


    // ===== Admin =====

    listUsers() {
        return this.request("/users");
    },

    patchUserRole(id, role) {
        return this.request(`/users/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role }),
        });
    },
    deleteUser(id) {
        return this.request(`/users/${id}`, {
            method: "DELETE",
        });
    },
    activateUser(id) {
        return this.request(`/users/${id}/activate`, {
            method: "PATCH",
        });
    },
    async createUserByAdmin({ username, password, role = "player", isActive = true }) {
        await this.register(username, password);

        const users = await this.listUsers();
        const created = users.find((u) => u.username === username);

        if (!created) {
            throw new Error("Neu erstellter User konnte nicht gefunden werden.");
        }

        if (isActive && created.is_active === false) {
            await this.activateUser(created.id);
        }

        if (created.role !== role) {
            await this.patchUserRole(created.id, role);
        }

        return created;
    }


};
