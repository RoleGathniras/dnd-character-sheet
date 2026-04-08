import { API } from "./api.js";
import {
    applyRoleUI,
    loadCharacters,
    refreshCurrentUserAndUI,
    renderDrawerTitle,
    setAdminVisible,
    setCurrentCharacter,
    setLoggedInUI,
    setStatus,
    updateLandingAuthState,
} from "./app.js";

(function () {
    const isIndexPage =
        location.pathname === "/" ||
        location.pathname.endsWith("/index") ||
        location.pathname.endsWith("/index.html");

    if (!isIndexPage) return;

    const characterGrid = document.getElementById("characterGrid");
    const emptyState = document.getElementById("characterEmptyState");
    const currentCharacterAvatar = document.getElementById("currentCharacterAvatar");
    const currentCharacterAvatarImg = document.getElementById("currentCharacterAvatarImg");
    const currentCharacterAvatarFallback = document.getElementById("currentCharacterAvatarFallback");

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

    function renderTopbarCharacterAvatar(character) {
        if (!currentCharacterAvatar || !currentCharacterAvatarImg || !currentCharacterAvatarFallback) {
            return;
        }

        if (!character) {
            currentCharacterAvatarImg.removeAttribute("src");
            currentCharacterAvatarImg.hidden = true;
            currentCharacterAvatarFallback.hidden = false;
            currentCharacterAvatarFallback.textContent = "?";
            return;
        }

        const imageDataUrl = getCharacterImageDataUrl(character);
        const name = String(character?.name || "Charakter").trim();
        const fallbackLetter = name ? name.charAt(0).toUpperCase() : "?";

        if (imageDataUrl) {
            currentCharacterAvatarImg.src = imageDataUrl;
            currentCharacterAvatarImg.alt = name;
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
            const selectedId = Number(getSelectedCharacterId() || 0);
            const selectedCharacter = chars.find((c) => Number(c.id) === selectedId) || null;

            characterGrid.innerHTML = "";

            if (!chars.length) {
                if (emptyState) {
                    emptyState.hidden = false;
                    emptyState.textContent = "Noch keine Charaktere vorhanden.";
                }

                renderTopbarCharacterAvatar(null);
                setStatus("Keine Charaktere vorhanden.");
                return;
            }

            if (emptyState) emptyState.hidden = true;

            renderTopbarCharacterAvatar(selectedCharacter);

            for (const c of chars) {
                console.log("[index.js] char image path", {
                    id: c.id,
                    name: c.name,
                    descriptionImage: c?.data?.description?.appearance?.imageDataUrl,
                    characterDescriptionImage: c?.data?.character_description?.appearance?.imageDataUrl,
                    rawData: c?.data,
                });

                const card = document.createElement("button");
                card.type = "button";
                card.className = "characterCard";

                const imageDataUrl = getCharacterImageDataUrl(c);
                const safeName = String(c.name ?? "Unbenannt");
                const safeKind = String((c.kind ?? "pc").toUpperCase());
                const safeOwner = c.owner_username ? String(c.owner_username) : "";

                const imageWrap = document.createElement("div");
                imageWrap.className = "characterCard__imageWrap";

                if (imageDataUrl) {
                    const img = document.createElement("img");
                    img.className = "characterCard__image";
                    img.alt = safeName;
                    img.loading = "lazy";
                    img.decoding = "async";
                    img.src = imageDataUrl;

                    img.addEventListener("error", () => {
                        console.error("[index.js] image render failed", {
                            id: c.id,
                            name: c.name,
                            srcPrefix: imageDataUrl.slice(0, 80),
                        });
                    });

                    imageWrap.appendChild(img);
                } else {
                    const placeholder = document.createElement("div");
                    placeholder.className = "characterCard__imagePlaceholder";
                    placeholder.textContent = "Kein Bild";
                    imageWrap.appendChild(placeholder);
                }

                const body = document.createElement("div");
                body.className = "characterCard__body";

                const title = document.createElement("div");
                title.className = "characterCard__title";
                title.textContent = safeName;

                const meta = document.createElement("div");
                meta.className = "characterCard__meta";

                const badge = document.createElement("span");
                badge.className = "characterCard__badge";
                badge.textContent = safeKind;
                meta.appendChild(badge);

                if (safeOwner) {
                    const owner = document.createElement("span");
                    owner.className = "characterCard__owner";
                    owner.textContent = safeOwner;
                    meta.appendChild(owner);
                }

                body.append(title, meta);
                card.append(imageWrap, body);

                card.addEventListener("click", () => {
                    setCurrentCharacter(c.id);
                    renderTopbarCharacterAvatar(c);
                    window.location.href = "/sheet.html";
                });

                characterGrid.appendChild(card);
            }

            setStatus(`Charaktere geladen: ${chars.length}`);
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
            applyRoleUI();
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

    (async function startupIndex() {
        if (!API.token) {
            setLoggedInUI(false);
            updateLandingAuthState(false);
            applyRoleUI();
            setAdminVisible(false);
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
            applyRoleUI();
            await loadCharacters();
            await renderCharacterCards();
        } catch (e) {
            console.error("[index.js] Startup fehlgeschlagen", e);

            if (e?.status === 401) {
                API.token = null;
                setLoggedInUI(false);
                setAdminVisible(false);
                setStatus("Token ungültig – bitte neu einloggen");
            } else {
                setStatus("Startup-Fehler – bitte Konsole prüfen");
            }
        }
    })();
})();