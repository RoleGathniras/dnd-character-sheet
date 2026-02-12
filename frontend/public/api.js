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
            headers: {"Content-Type": "application/x-www-form-urlencoded"},
            body,
        });

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Login failed (${res.status}): ${txt}`);
        }

        const data = await res.json();
        this.token = data.access_token;
        return data;
    },

    async request(path, opts = {}) {
        const headers = new Headers(opts.headers || {});
        const t = this.token;
        if (t) headers.set("Authorization", `Bearer ${t}`);

        const res = await fetch(`/api${path}`, {...opts, headers});

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`API error (${res.status}) ${opts.method || "GET"} ${path}: ${txt}`);
        }

        const ct = res.headers.get("content-type") || "";
        return ct.includes("application/json") ? res.json() : res.text();
    },


    me() {
        return this.request("/users/me");
    },

    characters() {
        return this.request("/characters");
    },

    getCharacter(id) {
        return this.request(`/characters/${id}`);
    },

    patchCharacter(id, payload) {
        return this.request(`/characters/${id}`, {
            method: "PATCH",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload),
        });
    },
        // --- Admin ---
    listUsers() {
        return this.request("/users");
    },

    patchUserRole(id, role) {
        return this.request(`/users/${id}`, {
            method: "PATCH",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ role }),
        });
    },

};
