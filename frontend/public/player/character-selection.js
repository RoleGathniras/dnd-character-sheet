const STORAGE_KEY = "dnd_current_character_id";
const LEGACY_STORAGE_KEY = "selectedCharacterId";

let currentCharacterId =
    Number(
        localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem(LEGACY_STORAGE_KEY)
    ) || null;

export function getCurrentCharacterId() {
    return currentCharacterId;
}

export function setCurrentCharacter(id) {
    currentCharacterId = id ? Number(id) : null;

    if (currentCharacterId) {
        localStorage.setItem(
            STORAGE_KEY,
            String(currentCharacterId)
        );

        localStorage.setItem(
            LEGACY_STORAGE_KEY,
            String(currentCharacterId)
        );
    } else {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
}