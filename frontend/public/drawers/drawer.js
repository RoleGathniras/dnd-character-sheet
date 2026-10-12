export function initDrawer({
    drawer,
    backdrop,
    openButton,
    closeButton,
}) {
    if (!drawer || !backdrop || !openButton || !closeButton) {
        return;
    }

    function open() {
        drawer.classList.add("is-open");
        drawer.setAttribute("aria-hidden", "false");
        backdrop.hidden = false;
    }

    function close() {
        drawer.classList.remove("is-open");
        drawer.setAttribute("aria-hidden", "true");
        backdrop.hidden = true;
    }

    openButton.addEventListener("click", open);
    closeButton.addEventListener("click", close);
    backdrop.addEventListener("click", close);

    return {
        open,
        close,
    };
}
