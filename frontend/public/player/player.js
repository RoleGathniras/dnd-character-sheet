import { API } from "../api.js";
import {
    handleCreate,
    loadCharacters,
    refreshCurrentUserAndUI,
    renderDrawerTitle,
    setCurrentCharacter,
    setLoggedInUI,
    setStatus,
} from "../app.js";
import { resizeImageFile } from "./image-utils.js";

(function () {
    const isPlayerPage =
        location.pathname.endsWith("/player/player.html");

    if (!isPlayerPage) return;

    const characterGrid = document.getElementById("characterGrid");
    const charactersPanel = document.getElementById("charactersPanel");
    const landingHero = document.getElementById("landingHero");
    const emptyState = document.getElementById("characterEmptyState");
    const btnCreateCharacter = document.getElementById("btnCreateCharacter");
    const currentCharacterAvatar = document.getElementById("currentCharacterAvatar");
    const currentCharacterAvatarImg = document.getElementById("currentCharacterAvatarImg");
    const currentCharacterAvatarFallback = document.getElementById("currentCharacterAvatarFallback");

    const editCharacterForm = document.getElementById("editCharacterForm");
    const editCharacterName = document.getElementById("editCharacterName");
    const editCharacterRace = document.getElementById("editCharacterRace");
    const editCharacterClass = document.getElementById("editCharacterClass");
    const cancelEditCharacter = document.getElementById("cancelEditCharacter");

    const saveEditCharacter = document.getElementById("saveEditCharacter");
    const editCharacterError = document.getElementById("editCharacterError");
    const selectEditCharacterImage =
        document.getElementById("selectEditCharacterImage");

    const deleteEditCharacter =
        document.getElementById("deleteEditCharacter");

    const editCharacterImage =
        document.getElementById("editCharacterImage");

    const editCharacterImagePreview =
        document.getElementById("editCharacterImagePreview");

    const editCharacterImagePreviewImg =
        document.getElementById("editCharacterImagePreviewImg");

    const removeEditCharacterImage =
        document.getElementById("removeEditCharacterImage");

    let editCharacterImageDataUrl = null;
    let editCharacterImageCrop = {
        x: 50,
        y: 50,
        zoom: 1,
    };

    let editingCharacterId = null;

    function updateLandingAuthState(isLoggedIn) {
        if (charactersPanel) {
            charactersPanel.hidden = !isLoggedIn;
        }

        if (landingHero) {
            landingHero.hidden = isLoggedIn;
        }
    }

    function escapeHtml(s) {
        return String(s)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function getSelectedCharacterId() {
        return (
            localStorage.getItem("dnd_current_character_id") ||
            localStorage.getItem("selectedCharacterId") ||
            ""
        );
    }

    function getCharacterImageDataUrl(character) {
        const image =
            character?.data?.description?.appearance?.imageDataUrl ||
            character?.data?.character_description?.appearance?.imageDataUrl ||
            character?.data?.appearance?.imageDataUrl ||
            "";

        console.log("[index.js] resolved image", {
            id: character?.id,
            name: character?.name,
            resolved: image ? "[HAS IMAGE]" : "[NO IMAGE]",
            data: character?.data,
        });

        return image;
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

    function isPlayableCharacter(character) {
        return String(character?.kind || "").toLowerCase() !== "npc";
    }

    function getCharacterPlaceholderName(name) {
        const safe = String(name || "Charakter").trim();
        return safe ? safe.charAt(0).toUpperCase() : "?";
    }

    function renderTopbarCharacterAvatar(character) {
        if (!currentCharacterAvatar || !currentCharacterAvatarImg || !currentCharacterAvatarFallback) {
            return;
        }

        currentCharacterAvatar.hidden = false;

        if (!character) {
            currentCharacterAvatarImg.removeAttribute("src");
            currentCharacterAvatarImg.hidden = true;
            currentCharacterAvatarFallback.hidden = false;
            currentCharacterAvatarFallback.textContent = "?";
            return;
        }

        const imageDataUrl = getCharacterImageDataUrl(character);
        const crop = getCharacterImageCrop(character);
        const name = String(character?.name || "Charakter").trim();
        const fallbackLetter = name ? name.charAt(0).toUpperCase() : "?";

        if (imageDataUrl) {
            currentCharacterAvatarImg.src = imageDataUrl;
            currentCharacterAvatarImg.alt = name;
            currentCharacterAvatarImg.style.objectPosition = `${crop.x}% ${crop.y}%`;
            currentCharacterAvatarImg.hidden = false;
            currentCharacterAvatarFallback.hidden = true;
        } else {
            currentCharacterAvatarImg.removeAttribute("src");
            currentCharacterAvatarImg.hidden = true;
            currentCharacterAvatarFallback.hidden = false;
            currentCharacterAvatarFallback.textContent = fallbackLetter;
        }
    }

    async function renderCharacterCards() {
        if (!characterGrid) return;

        if (!API.token) {
            characterGrid.innerHTML = "";
            if (emptyState) {
                emptyState.hidden = false;
                emptyState.textContent = "Bitte einloggen, um deine Charaktere zu sehen.";
            }
            renderTopbarCharacterAvatar(null);
            return;
        }

        try {
            const chars = await API.characters();
            console.log("[index.js] API.characters()", structuredClone(chars));

            const playableChars = chars.filter(isPlayableCharacter);
            const selectedId = Number(getSelectedCharacterId() || 0);
            const selectedCharacter =
                playableChars.find((c) => Number(c.id) === selectedId) || null;

            characterGrid.innerHTML = "";

            if (!playableChars.length) {
                if (emptyState) {
                    emptyState.hidden = false;
                    emptyState.textContent = "Noch keine spielbaren Charaktere vorhanden.";
                }

                renderTopbarCharacterAvatar(null);
                setStatus("Keine spielbaren Charaktere vorhanden.");
                return;
            }

            if (emptyState) emptyState.hidden = true;

            renderTopbarCharacterAvatar(selectedCharacter);

            for (const c of playableChars) {
                const card = document.createElement("article");
                card.className = "characterCard";

                const imageDataUrl = getCharacterImageDataUrl(c);
                const crop = getCharacterImageCrop(c);
                const safeName = String(c.name ?? "Unbenannt");

                const imageWrap = document.createElement("div");
                imageWrap.className = "characterCard__imageWrap";

                if (imageDataUrl) {
                    const img = document.createElement("img");
                    img.className = "characterCard__image";
                    img.alt = safeName;
                    img.loading = "lazy";
                    img.decoding = "async";
                    img.src = imageDataUrl;
                    img.style.objectPosition = `${crop.x}% ${crop.y}%`;

                    img.addEventListener("error", () => {
                        console.error("[index.js] image render failed", {
                            id: c.id,
                            name: c.name,
                            srcPrefix: imageDataUrl.slice(0, 80),
                        });

                        imageWrap.innerHTML = "";
                        const fallback = document.createElement("div");
                        fallback.className = "characterCard__imagePlaceholder";
                        fallback.textContent = getCharacterPlaceholderName(safeName);
                        imageWrap.appendChild(fallback);
                    });

                    imageWrap.appendChild(img);
                } else {
                    const placeholder = document.createElement("div");
                    placeholder.className = "characterCard__imagePlaceholder";
                    placeholder.textContent = getCharacterPlaceholderName(safeName);
                    imageWrap.appendChild(placeholder);
                }
                const editButton = document.createElement("button");
                editButton.type = "button";
                editButton.className = "characterCard__edit";
                editButton.setAttribute("aria-label", `${safeName} bearbeiten`);
                editButton.title = "Charakter bearbeiten";

                editButton.innerHTML = `
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                            d="M12 20h9"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                        />
                        <path
                            d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linejoin="round"
                        />
                    </svg>
                `;

                editButton.addEventListener("click", (event) => {
                    event.stopPropagation();

                    editingCharacterId = c.id;

                    editCharacterName.value = String(c.name ?? "");
                    editCharacterRace.value = String(c.data?.race ?? "");
                    editCharacterClass.value = String(c.data?.class ?? "");

                    card.after(editCharacterForm);
                    editCharacterImageDataUrl = getCharacterImageDataUrl(c);
                    editCharacterImageCrop = getCharacterImageCrop(c);

                    editCharacterImage.value = "";

                    if (editCharacterImageDataUrl) {
                        editCharacterImagePreviewImg.src =
                            editCharacterImageDataUrl;

                        editCharacterImagePreviewImg.style.objectPosition =
                            `${editCharacterImageCrop.x}% ${editCharacterImageCrop.y}%`;

                        editCharacterImagePreview.hidden = false;
                    } else {
                        editCharacterImagePreviewImg.removeAttribute("src");
                        editCharacterImagePreview.hidden = true;
                    }
                    editCharacterForm.hidden = false;
                });

                imageWrap.appendChild(editButton);

                const body = document.createElement("div");
                body.className = "characterCard__body";

                const title = document.createElement("div");
                title.className = "characterCard__title";
                title.textContent = safeName;

                body.appendChild(title);
                card.append(imageWrap, body);

                card.addEventListener("click", () => {
                    setCurrentCharacter(c.id);
                    renderTopbarCharacterAvatar(c);
                    window.location.href = "/player/sheet.html";
                });

                characterGrid.appendChild(card);
            }

            setStatus(`Charaktere geladen: ${playableChars.length}`);
        } catch (e) {
            console.error("[index.js] Fehler beim Laden der Charakterkarten", e);
            characterGrid.innerHTML = "";
            renderTopbarCharacterAvatar(null);

            if (emptyState) {
                emptyState.hidden = false;
                emptyState.textContent = "Fehler beim Laden der Charaktere.";
            }

            setStatus("Fehler beim Laden der Charaktere ❌");
        }
    }

    window.addEventListener("auth:login", async () => {
        try {
            setLoggedInUI(true);
            updateLandingAuthState(true);
            await refreshCurrentUserAndUI();
            await loadCharacters();
            await renderCharacterCards();
        } catch (e) {
            console.error("[index.js] Fehler nach Login", e);
            setStatus("Login ok, aber Initialisierung fehlgeschlagen ❌");
        }
    });

    window.addEventListener("auth:logout", () => {
        if (characterGrid) characterGrid.innerHTML = "";
        renderTopbarCharacterAvatar(null);
        updateLandingAuthState(false);

        if (emptyState) {
            emptyState.hidden = false;
            emptyState.textContent = "Bitte einloggen, um deine Charaktere zu sehen.";
        }
    });

    window.addEventListener("character:created", async () => {
        await renderCharacterCards();
    });

    window.addEventListener("character:deleted", async () => {
        await renderCharacterCards();
    });

    btnCreateCharacter?.addEventListener("click", () => {
        handleCreate("pc");
    });

    cancelEditCharacter?.addEventListener("click", () => {
        editingCharacterId = null;

        editCharacterName.value = "";
        editCharacterRace.value = "";
        editCharacterClass.value = "";

        editCharacterForm.hidden = true;
    });

    saveEditCharacter?.addEventListener("click", async () => {
        if (!editingCharacterId) return;

        const name = editCharacterName.value.trim();
        const race = editCharacterRace.value.trim();
        const characterClass = editCharacterClass.value.trim();

        if (!name || !race || !characterClass) {
            editCharacterError.textContent =
                "Name, Volk und Klasse dürfen nicht leer sein.";
            return;
        }

        try {
            editCharacterError.textContent = "";

            const latestCharacter =
                await API.getCharacter(editingCharacterId);

            const newData = {
                ...(latestCharacter.data ?? {}),
                race,
                class: characterClass,
            };

            const description = {
                ...(newData.description ?? {}),
            };

            const appearance = {
                ...(description.appearance ?? {}),
                imageDataUrl: editCharacterImageDataUrl ?? "",
                imageCrop: {
                    ...editCharacterImageCrop,
                },
            };

            description.appearance = appearance;
            newData.description = description;

            await API.patchCharacter(editingCharacterId, {
                name,
                data: newData,
                updated_at: latestCharacter.updated_at,
            });

            editingCharacterId = null;
            editCharacterForm.hidden = true;

            await loadCharacters();
            await renderCharacterCards();
        } catch (error) {
            console.error(
                "Charakter konnte nicht gespeichert werden:",
                error,
            );

            editCharacterError.textContent =
                "Charakter konnte nicht gespeichert werden.";
        }
    });

    deleteEditCharacter?.addEventListener("click", async () => {
        if (!editingCharacterId) return;

        const name = editCharacterName.value.trim() || "diesen Charakter";

        const confirmed = window.confirm(
            `Möchtest du "${name}" wirklich löschen?`
        );

        if (!confirmed) return;

        try {
            editCharacterError.textContent = "";

            await API.deleteCharacter(editingCharacterId);

            editingCharacterId = null;
            editCharacterForm.hidden = true;

            await loadCharacters();
            await renderCharacterCards();
        } catch (error) {
            console.error(
                "Charakter konnte nicht gelöscht werden:",
                error,
            );

            editCharacterError.textContent =
                "Charakter konnte nicht gelöscht werden.";
        }
    });

    editCharacterImage?.addEventListener("change", async () => {
        const file = editCharacterImage.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            editCharacterError.textContent =
                "Das Bild darf maximal 10 MB groß sein.";

            editCharacterImage.value = "";
            return;
        }

        if (!file.type.startsWith("image/")) {
            editCharacterError.textContent =
                "Bitte wähle eine Bilddatei aus.";

            editCharacterImage.value = "";
            return;
        }

        try {
            editCharacterError.textContent = "";

            editCharacterImageDataUrl =
                await resizeImageFile(file, {
                    maxWidth: 900,
                    maxHeight: 900,
                    quality: 0.86,
                });

            editCharacterImageCrop = {
                x: 50,
                y: 50,
                zoom: 1,
            };

            editCharacterImagePreviewImg.src =
                editCharacterImageDataUrl;

            editCharacterImagePreviewImg.style.objectPosition =
                "50% 50%";

            editCharacterImagePreview.hidden = false;
        } catch (error) {
            console.error(
                "Charakterbild konnte nicht verarbeitet werden:",
                error,
            );

            editCharacterError.textContent =
                "Charakterbild konnte nicht verarbeitet werden.";
        } finally {
            editCharacterImage.value = "";
        }
    });

    removeEditCharacterImage?.addEventListener("click", () => {
        editCharacterImageDataUrl = null;

        editCharacterImageCrop = {
            x: 50,
            y: 50,
            zoom: 1,
        };

        editCharacterImagePreviewImg.removeAttribute("src");
        editCharacterImagePreview.hidden = true;
        editCharacterImage.value = "";
    });

    selectEditCharacterImage?.addEventListener("click", () => {
        editCharacterImage?.click();
    });

    (async function startupIndex() {
        if (!API.token) {
            setLoggedInUI(false);
            updateLandingAuthState(false);
            renderDrawerTitle();

            if (emptyState) {
                emptyState.hidden = false;
                emptyState.textContent = "Bitte einloggen, um deine Charaktere zu sehen.";
            }

            setStatus("UI bereit ✅");
            return;
        }

        try {
            setLoggedInUI(true);
            updateLandingAuthState(true);
            await refreshCurrentUserAndUI();
            await loadCharacters();
            await renderCharacterCards();
        } catch (e) {
            console.error("[index.js] Startup fehlgeschlagen", e);

            if (e?.status === 401) {
                API.token = null;
                setLoggedInUI(false);
                setStatus("Token ungültig – bitte neu einloggen");
            } else {
                setStatus("Startup-Fehler – bitte Konsole prüfen");
            }
        }
    })();
})();