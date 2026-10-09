import { API } from "/api.js";
import {
    getCurrentCharacterId,
    setCurrentCharacter,
} from "/app.js";
import { renderTopbarCharacterAvatar } from "/player/player-topbar.js";

export async function fetchPlayerCharacters() {
    const characters = await API.characters();

    return characters.filter(character => character.kind !== "npc");
}

export async function renderPlayerCharacters() {
    const listMine = document.getElementById("listMine");
    if (!listMine) return [];

    const characters = await fetchPlayerCharacters();
    const currentCharacterId = getCurrentCharacterId();

    const currentCharacter = characters.find(
        character => Number(character.id) === Number(currentCharacterId)
    );

    renderTopbarCharacterAvatar(currentCharacter ?? null);

    listMine.replaceChildren();

    for (const character of characters) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "drawer__item";

        if (Number(character.id) === Number(currentCharacterId)) {
            button.classList.add("is-active");
        }

        const main = document.createElement("span");
        main.className = "drawerItem__main";

        const name = document.createElement("span");
        name.className = "drawerItem__name";
        name.textContent = character.name ?? "";

        const kind = document.createElement("span");
        kind.className = "drawerItem__kind";
        kind.textContent = (character.kind ?? "").toUpperCase();

        main.append(name, kind);
        button.appendChild(main);

        if (character.owner_username) {
            const owner = document.createElement("span");
            owner.className = "drawerItem__sub";
            owner.textContent = character.owner_username;
            button.appendChild(owner);
        }

        button.addEventListener("click", () => {
            setCurrentCharacter(character.id);

            window.location.href = "/player/sheet.html";
        });

        listMine.appendChild(button);
    }

    return characters;
}