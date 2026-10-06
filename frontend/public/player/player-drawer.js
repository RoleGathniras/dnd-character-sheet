export function createPlayerDrawer() {
    return `
        <div id="drawer" class="drawer" aria-hidden="true">
            <div class="drawer__header">
                <strong id="drawerUserTitle">Charaktere</strong>

                <button id="btnCloseDrawer" class="btn" aria-label="Schließen">
                    ✕
                </button>
            </div>

            <div class="drawer__content">
                <div class="drawer__section">
                    <button
                        type="button"
                        class="drawer__title drawer__toggle"
                        id="toggleMine"
                        aria-expanded="true"
                    >
                        Charaktere
                    </button>

                    <div id="listMine" class="drawer__list">
                        <button class="drawer__item" disabled>
                            (noch keine Daten)
                        </button>
                    </div>
                </div>
            </div>

            <div class="drawer__footer">
                <button id="btnPlayerRules" class="drawer__item" type="button">
                    Spielerhandbuch
                </button>

                <button
                    id="btnAccountSettings"
                    class="drawer__item"
                    type="button"
                    disabled
                >
                    Accounteinstellungen
                </button>

                <button id="btnLogout" class="drawer__item" type="button">
                    Abmelden
                </button>
            </div>
        </div>

        <div id="backdrop" class="backdrop" hidden></div>
    `;
}
export function createPlayerNavDrawer() {
    return `
        <div id="navBackdrop" class="backdrop" hidden></div>

        <aside id="navDrawer" class="drawer drawer--right" aria-hidden="true">
            <div class="drawer__header">
                <strong>Navigation</strong>

                <button id="btnNavClose" class="btn" aria-label="Schließen">
                    ✕
                </button>
            </div>

            <div id="navList" class="drawer__content"></div>
        </aside>
    `;
}
export function mountPlayerDrawers() {
    const drawerMount = document.getElementById("playerDrawerMount");
    const navDrawerMount = document.getElementById("playerNavDrawerMount");

    if (drawerMount) {
        drawerMount.outerHTML = createPlayerDrawer();
    }

    if (navDrawerMount) {
        navDrawerMount.outerHTML = createPlayerNavDrawer();
    }
}