import { API } from "/api.js";
import { setStatus } from "/shared/status.js";
import { escapeHtml } from "/shared/html.js";
import { renderTopbarCharacterAvatar } from "/player/player-topbar.js";
import {
    getCurrentCharacterId,
    setCurrentCharacter,
} from "/player/character-selection.js";

export async function loadCharacters({ closeDrawer } = {}) {
    const listMine = document.getElementById("listMine");
    if (!listMine) return [];

    listMine.innerHTML = "";

    const chars = await API.characters();
    const currentCharacterId = getCurrentCharacterId();

    const currentCharacter = chars.find(
        character => Number(character.id) === Number(currentCharacterId),
    );

    renderTopbarCharacterAvatar(currentCharacter ?? null);

    for (const c of chars) {
        const b = document.createElement("button");
        b.className = "drawer__item";

        if (Number(c.id) === Number(currentCharacterId)) {
            b.classList.add("is-active");
        }

        const name = escapeHtml(c.name ?? "");
        const kind = escapeHtml((c.kind ?? "").toUpperCase());
        const ownerName = c.owner_username
            ? escapeHtml(c.owner_username)
            : "";

        b.innerHTML = `
            <span class="drawerItem__main">
                <span class="drawerItem__name">${name}</span>
                <span class="drawerItem__kind">${kind}</span>
            </span>
            ${ownerName
                ? `<span class="drawerItem__sub">${ownerName}</span>`
                : ""}
        `;

        b.addEventListener("click", () => {
            setCurrentCharacter(c.id);
            closeDrawer?.();

            if (location.pathname.endsWith("/sheet.html")) {
                window.location.reload();
                return;
            }

            window.location.href = "/player/sheet.html";
        });

        if (
            c.kind !== "npc" &&
            Number(c.id) !== Number(currentCharacterId)
        ) {
            listMine.appendChild(b);
        }
    }

    setStatus(`Charaktere geladen: ${chars.length}`);
    return chars;
}