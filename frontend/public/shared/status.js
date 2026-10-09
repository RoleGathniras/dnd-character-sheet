export function setStatus(message) {
    const statusEl = document.getElementById("appStatus");

    if (!statusEl) {
        return;
    }

    statusEl.textContent = message;
}