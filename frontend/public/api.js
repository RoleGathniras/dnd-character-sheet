const API = {
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
      body
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Login failed (${res.status}): ${txt}`);
    }

    const data = await res.json();
    this.token = data.access_token;
    return data;
  },

  async request(path, { method = "GET", json } = {}) {
    const headers = {};
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    if (json !== undefined) headers["Content-Type"] = "application/json";

    const res = await fetch(`/api${path}`, {
      method,
      headers,
      body: json !== undefined ? JSON.stringify(json) : undefined
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`API error (${res.status}) ${method} ${path}: ${txt}`);
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
  }
};
