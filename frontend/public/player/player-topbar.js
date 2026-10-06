import { API } from "/api.js";

export function initPlayerTopbar() {
    bindTopbarAvatarNavigation();
    bindTopbarLevelEditing();
    bindTopbarCharacterInfoEditing();
}

function bindTopbarAvatarNavigation() {
    const currentCharacterAvatar =
        document.getElementById("currentCharacterAvatar");

    if (!currentCharacterAvatar) return;
    if (currentCharacterAvatar.dataset.bound === "1") return;

    currentCharacterAvatar.dataset.bound = "1";
    currentCharacterAvatar.style.cursor = "pointer";

    currentCharacterAvatar.addEventListener("click", () => {
        window.location.href = "/player/player.html";
    });
}
function bindTopbarLevelEditing() {
    const btnCharacterLevel =
        document.getElementById("btnCharacterLevel");

    if (!btnCharacterLevel) return;
    if (btnCharacterLevel.dataset.bound === "1") return;

    btnCharacterLevel.dataset.bound = "1";

    btnCharacterLevel.addEventListener("click", async () => {
        const currentCharacterId =
            Number(localStorage.getItem("dnd_current_character_id")) || null;

        if (!currentCharacterId) return;

        try {
            const latestCharacter =
                await API.getCharacter(currentCharacterId);

            const currentLevel =
                Number(latestCharacter.data?.level ?? 1);

            const input = window.prompt(
                "Neue Stufe (1–20):",
                String(currentLevel),
            );

            if (input === null) return;

            const level = Number(input);

            if (!Number.isInteger(level) || level < 1 || level > 20) {
                alert("Die Stufe muss zwischen 1 und 20 liegen.");
                return;
            }

            const newData = {
                ...(latestCharacter.data ?? {}),
                level,
            };

            const updatedCharacter =
                await API.patchCharacter(latestCharacter.id, {
                    data: newData,
                    updated_at: latestCharacter.updated_at,
                });

            renderTopbarCharacterAvatar(updatedCharacter);

            window.dispatchEvent(
                new CustomEvent("character:updated", {
                    detail: {
                        character: updatedCharacter,
                    },
                }),
            );
        } catch (error) {
            console.error(
                "Stufe konnte nicht gespeichert werden:",
                error,
            );
        }
    });
}
function bindTopbarCharacterInfoEditing() {
    const btnCharacterInfo =
        document.getElementById("btnCharacterInfo");

    if (!btnCharacterInfo) return;
    if (btnCharacterInfo.dataset.bound === "1") return;

    btnCharacterInfo.dataset.bound = "1";

    btnCharacterInfo.addEventListener("click", async () => {
        const currentCharacterId =
            Number(localStorage.getItem("dnd_current_character_id")) || null;

        if (!currentCharacterId) return;

        try {
            const latestCharacter =
                await API.getCharacter(currentCharacterId);

            const currentName =
                String(latestCharacter.name ?? "").trim();

            const currentRace =
                String(latestCharacter.data?.race ?? "").trim();

            const currentClass =
                String(latestCharacter.data?.class ?? "").trim();

            const newName =
                window.prompt("Charaktername:", currentName);

            if (newName === null) return;

            const newRace =
                window.prompt("Volk:", currentRace);

            if (newRace === null) return;

            const newClass =
                window.prompt("Klasse:", currentClass);

            if (newClass === null) return;

            const name = newName.trim();
            const race = newRace.trim();
            const characterClass = newClass.trim();

            if (!name || !race || !characterClass) {
                alert("Name, Volk und Klasse dürfen nicht leer sein.");
                return;
            }

            const newData = {
                ...(latestCharacter.data ?? {}),
                race,
                class: characterClass,
            };

            const updatedCharacter =
                await API.patchCharacter(latestCharacter.id, {
                    name,
                    data: newData,
                    updated_at: latestCharacter.updated_at,
                });

            renderTopbarCharacterAvatar(updatedCharacter);

            window.dispatchEvent(
                new CustomEvent("character:updated", {
                    detail: {
                        character: updatedCharacter,
                    },
                }),
            );
        } catch (error) {
            console.error(
                "Charakterdaten konnten nicht gespeichert werden:",
                error,
            );
        }
    });
}

function getCharacterImageDataUrl(character) {
    return (
        character?.data?.description?.appearance?.imageDataUrl ||
        character?.data?.character_description?.appearance?.imageDataUrl ||
        character?.data?.appearance?.imageDataUrl ||
        ""
    );
}

function getCharacterImageCrop(character) {
    const crop =
        character?.data?.description?.appearance?.imageCrop ||
        character?.data?.character_description?.appearance?.imageCrop ||
        character?.data?.appearance?.imageCrop ||
        null;

    return {
        x: Number(crop?.x ?? 50),
        y: Number(crop?.y ?? 50),
        zoom: Number(crop?.zoom ?? 1),
    };
}

export function renderTopbarCharacterAvatar(character) {
    const currentCharacterAvatar =
        document.getElementById("currentCharacterAvatar");
    const currentCharacterAvatarImg =
        document.getElementById("currentCharacterAvatarImg");
    const currentCharacterAvatarFallback =
        document.getElementById("currentCharacterAvatarFallback");
    const topbarCharacterName =
        document.getElementById("topbarCharacterName");
    const topbarCharacterMeta =
        document.getElementById("topbarCharacterMeta");
    const topbarCharacterLevel =
        document.getElementById("topbarCharacterLevel");

    if (
        !currentCharacterAvatar ||
        !currentCharacterAvatarImg ||
        !currentCharacterAvatarFallback
    ) {
        return;
    }

    currentCharacterAvatar.hidden = false;

    if (!character) {
        currentCharacterAvatarImg.removeAttribute("src");
        currentCharacterAvatarImg.hidden = true;

        currentCharacterAvatarFallback.hidden = false;
        currentCharacterAvatarFallback.textContent = "?";

        if (topbarCharacterName) {
            topbarCharacterName.textContent = "Kein Charakter";
        }

        if (topbarCharacterMeta) {
            topbarCharacterMeta.textContent = "—";
        }

        if (topbarCharacterLevel) {
            topbarCharacterLevel.textContent = "—";
        }

        return;
    }

    const data = character.data ?? {};

    const imageDataUrl = getCharacterImageDataUrl(character);
    const crop = getCharacterImageCrop(character);

    const name = String(character.name || "Charakter").trim();
    const fallbackLetter = name ? name.charAt(0).toUpperCase() : "?";

    const race = String(data.race ?? "").trim();
    const characterClass = String(data.class ?? "").trim();
    const level = String(data.level ?? "").trim();

    if (topbarCharacterName) {
        topbarCharacterName.textContent = name;
    }

    if (topbarCharacterMeta) {
        const metaParts = [];

        if (race) metaParts.push(race);
        if (characterClass) metaParts.push(characterClass);

        topbarCharacterMeta.textContent =
            metaParts.length > 0 ? metaParts.join(" · ") : "—";
    }

    if (topbarCharacterLevel) {
        topbarCharacterLevel.textContent = level || "—";
    }

    if (imageDataUrl) {
        currentCharacterAvatarImg.src = imageDataUrl;
        currentCharacterAvatarImg.alt = name;
        currentCharacterAvatarImg.style.objectPosition =
            `${crop.x}% ${crop.y}%`;

        currentCharacterAvatarImg.hidden = false;
        currentCharacterAvatarFallback.hidden = true;
    } else {
        currentCharacterAvatarImg.removeAttribute("src");
        currentCharacterAvatarImg.hidden = true;

        currentCharacterAvatarFallback.hidden = false;
        currentCharacterAvatarFallback.textContent = fallbackLetter;
    }
}

export async function loadPlayerTopbar() {
    const currentCharacterId =
        Number(localStorage.getItem("dnd_current_character_id")) || null;

    if (!currentCharacterId) {
        renderTopbarCharacterAvatar(null);
        return;
    }

    try {
        const character = await API.getCharacter(currentCharacterId);
        renderTopbarCharacterAvatar(character);
    } catch (error) {
        console.error(
            "Player-Topbar konnte nicht geladen werden:",
            error,
        );
        renderTopbarCharacterAvatar(null);
    }
}