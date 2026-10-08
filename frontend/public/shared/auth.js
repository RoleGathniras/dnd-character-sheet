import { API } from "/api.js";

let currentUser = null;

export function getCurrentUser() {
    return currentUser;
}

export async function refreshCurrentUser() {
    try {
        currentUser = await API.me();
        return currentUser;
    } catch (error) {
        currentUser = null;
        throw error;
    }
}

export function logout() {
    API.clearToken();
    currentUser = null;

    window.dispatchEvent(new CustomEvent("auth:logout"));
}

export async function login(username, password) {
    await API.login(username, password);
    return await refreshCurrentUser();
}