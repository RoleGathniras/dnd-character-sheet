import { API } from "../api.js";
import { renderTopbarCharacterAvatar } from "/player/player-topbar.js";
import { resizeImageFile } from "./image-utils.js";

function initCharacter() {
    // =========================================================
    // DOM
    // =========================================================
    const appearance_age = document.getElementById("appearance_age");
    const appearance_height = document.getElementById("appearance_height");
    const appearance_weight = document.getElementById("appearance_weight");
    const appearance_eyes = document.getElementById("appearance_eyes");
    const appearance_skin = document.getElementById("appearance_skin");
    const appearance_hair = document.getElementById("appearance_hair");
    const appearance_description = document.getElementById("appearance_description");

    const appearance_imageFile = document.getElementById("appearance_imageFile");
    const appearance_imagePreview = document.getElementById("appearance_imagePreview");
    const appearance_imagePlaceholder = document.getElementById("appearance_imagePlaceholder");
    const btnRemoveAppearanceImage = document.getElementById("btnRemoveAppearanceImage");

    const prof_lang_proficiencies = document.getElementById("prof_lang_proficiencies");
    const prof_lang_languages = document.getElementById("prof_lang_languages");

    const personality_traits = document.getElementById("personality_traits");
    const personality_ideals = document.getElementById("personality_ideals");
    const personality_bonds = document.getElementById("personality_bonds");
    const personality_flaws = document.getElementById("personality_flaws");


    const required = [
        appearance_age, appearance_height, appearance_weight, appearance_eyes,
        appearance_skin, appearance_hair, appearance_description,
        appearance_imageFile, appearance_imagePreview, appearance_imagePlaceholder,
        btnRemoveAppearanceImage,
        prof_lang_proficiencies, prof_lang_languages,
        personality_traits, personality_ideals, personality_bonds, personality_flaws
    ];

    if (required.some((el) => !el)) {
        console.warn("[charakter.js] Missing required DOM elements. Script skipped.");
        return;
    }

    // =========================================================
    // State
    // =========================================================
    let currentCharacter = null;
    let boundCharacterId = null;

    let saveTimer = null;
    let isSaving = false;
    let pendingSave = false;

    // =========================================================
    // Persist Shape
    // =========================================================
    function emptyPersistDescription() {
        return {
            v: 2,
            appearance: {
                imageDataUrl: "",
                imageCrop: {
                    x: 50,
                    y: 50,
                    zoom: 1
                },
                age: "",
                height: "",
                weight: "",
                eyes: "",
                skin: "",
                hair: "",
                description: "",
            },
            proficienciesAndLanguages: {
                proficiencies: "",
                languages: "",
            },
            personality: {
                traits: "",
                ideals: "",
                bonds: "",
                flaws: "",
            }
        };
    }

    const descriptionState = emptyPersistDescription();

    function applyPersistDescription(persist) {
        const p = persist && typeof persist === "object"
            ? persist
            : emptyPersistDescription();

        descriptionState.appearance.imageDataUrl = String(p.appearance?.imageDataUrl || "");
        descriptionState.appearance.imageCrop = {
            x: Number(p.appearance?.imageCrop?.x ?? 50),
            y: Number(p.appearance?.imageCrop?.y ?? 50),
            zoom: Number(p.appearance?.imageCrop?.zoom ?? 1),
        };

        descriptionState.appearance.age = String(p.appearance?.age || "");
        descriptionState.appearance.height = String(p.appearance?.height || "");
        descriptionState.appearance.weight = String(p.appearance?.weight || "");
        descriptionState.appearance.eyes = String(p.appearance?.eyes || "");
        descriptionState.appearance.skin = String(p.appearance?.skin || "");
        descriptionState.appearance.hair = String(p.appearance?.hair || "");
        descriptionState.appearance.description = String(p.appearance?.description || "");

        descriptionState.proficienciesAndLanguages.proficiencies = String(
            p.proficienciesAndLanguages?.proficiencies || ""
        );
        descriptionState.proficienciesAndLanguages.languages = String(
            p.proficienciesAndLanguages?.languages || ""
        );

        descriptionState.personality.traits = String(p.personality?.traits || "");
        descriptionState.personality.ideals = String(p.personality?.ideals || "");
        descriptionState.personality.bonds = String(p.personality?.bonds || "");
        descriptionState.personality.flaws = String(p.personality?.flaws || "");
    }

    function toPersistDescription() {
        return structuredClone(descriptionState);
    }

    // =========================================================
    // Helpers
    // =========================================================
    function getSelectedCharacterId() {
        return (
            localStorage.getItem("dnd_current_character_id") ||
            localStorage.getItem("selectedCharacterId") ||
            ""
        );
    }

    function setSelectedCharacterId(id) {
        if (id) {
            localStorage.setItem("dnd_current_character_id", String(id));
            localStorage.setItem("selectedCharacterId", String(id));
        } else {
            localStorage.removeItem("dnd_current_character_id");
            localStorage.removeItem("selectedCharacterId");
        }
    }
    function getHttpStatus(err) {
        return (
            err?.status ??
            err?.response?.status ??
            err?.cause?.status ??
            err?.data?.status ??
            null
        );
    }

    function isConflict409(err) {
        const s = String(err ?? "");
        return getHttpStatus(err) === 409 || s.includes("409") || s.includes("Conflict");
    }

    function ensureCharacterData() {
        if (!currentCharacter) return null;
        currentCharacter.data = currentCharacter.data && typeof currentCharacter.data === "object"
            ? currentCharacter.data
            : {};
        return currentCharacter.data;
    }

    function writeStateIntoCharacter() {
        const data = ensureCharacterData();
        if (!data) return;
        data.description = toPersistDescription();
    }

    function escapeHtml(str) {
        return String(str)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;");
    }


    function markDirtyAndScheduleSave() {
        writeStateIntoCharacter();
        pendingSave = true;

        if (!currentCharacter || !boundCharacterId) return;

        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            void saveNow();
        }, 650);
    }

    async function saveNow() {
        if (!currentCharacter) return;
        if (!pendingSave) return;
        if (isSaving) return;

        const selectedNow = Number(getSelectedCharacterId() || 0);
        if (!selectedNow || selectedNow !== boundCharacterId) {
            pendingSave = false;
            return;
        }

        isSaving = true;
        pendingSave = false;

        const id = Number(currentCharacter.id);

        try {
            writeStateIntoCharacter();

            const payload = {
                data: currentCharacter.data,
                updated_at: currentCharacter.updated_at,
            };

            currentCharacter = await API.patchCharacter(id, payload);
            console.log("[charakter.js] PATCH response", structuredClone(currentCharacter));
        } catch (e) {
            if (isConflict409(e)) {
                try {
                    const myDescription = toPersistDescription();
                    const latest = await API.getCharacter(id);

                    latest.data = latest.data && typeof latest.data === "object" ? latest.data : {};
                    latest.data.description = myDescription;

                    const payload2 = {
                        data: latest.data,
                        updated_at: latest.updated_at,
                    };

                    currentCharacter = await API.patchCharacter(id, payload2);
                } catch (e2) {
                    console.error("[charakter.js] Save failed after 409 retry.", e2);
                }
            } else {
                console.error("[charakter.js] Save failed.", e);
            }
        } finally {
            isSaving = false;

            if (pendingSave) {
                if (saveTimer) clearTimeout(saveTimer);
                saveTimer = setTimeout(() => void saveNow(), 650);
            }
        }
    }
    function applyImageCropToElement(imgEl) {
        const crop = descriptionState.appearance.imageCrop || { x: 50, y: 50, zoom: 1 };
        const x = Number.isFinite(crop.x) ? crop.x : 50;
        const y = Number.isFinite(crop.y) ? crop.y : 50;

        imgEl.style.objectPosition = `${x}% ${y}%`;
    }


    // =========================================================
    // Render
    // =========================================================
    function fillAppearanceInputs() {
        appearance_age.value = descriptionState.appearance.age;
        appearance_height.value = descriptionState.appearance.height;
        appearance_weight.value = descriptionState.appearance.weight;
        appearance_eyes.value = descriptionState.appearance.eyes;
        appearance_skin.value = descriptionState.appearance.skin;
        appearance_hair.value = descriptionState.appearance.hair;
        appearance_description.value = descriptionState.appearance.description;

        renderImagePreview();
    }

    function fillProficienciesAndLanguages() {
        prof_lang_proficiencies.value = descriptionState.proficienciesAndLanguages.proficiencies;
        prof_lang_languages.value = descriptionState.proficienciesAndLanguages.languages;
    }

    function fillPersonalityInputs() {
        personality_traits.value = descriptionState.personality.traits;
        personality_ideals.value = descriptionState.personality.ideals;
        personality_bonds.value = descriptionState.personality.bonds;
        personality_flaws.value = descriptionState.personality.flaws;
    }

    function renderImagePreview() {
        const src = descriptionState.appearance.imageDataUrl.trim();
        const crop = descriptionState.appearance.imageCrop || { x: 50, y: 50, zoom: 1 };

        if (src) {
            appearance_imagePreview.src = src;
            appearance_imagePreview.style.objectPosition = `${crop.x}% ${crop.y}%`;
            appearance_imagePreview.hidden = false;
            appearance_imagePlaceholder.hidden = true;
        } else {
            appearance_imagePreview.removeAttribute("src");
            appearance_imagePreview.hidden = true;
            appearance_imagePlaceholder.hidden = false;
        }
    }

    // =========================================================
    // Bind Inputs
    // =========================================================
    function bindTextInputs() {
        const textBindings = [
            [appearance_age, () => descriptionState.appearance.age = appearance_age.value],
            [appearance_height, () => descriptionState.appearance.height = appearance_height.value],
            [appearance_weight, () => descriptionState.appearance.weight = appearance_weight.value],
            [appearance_eyes, () => descriptionState.appearance.eyes = appearance_eyes.value],
            [appearance_skin, () => descriptionState.appearance.skin = appearance_skin.value],
            [appearance_hair, () => descriptionState.appearance.hair = appearance_hair.value],
            [appearance_description, () => descriptionState.appearance.description = appearance_description.value],

            [prof_lang_proficiencies, () => descriptionState.proficienciesAndLanguages.proficiencies = prof_lang_proficiencies.value],
            [prof_lang_languages, () => descriptionState.proficienciesAndLanguages.languages = prof_lang_languages.value],

            [personality_traits, () => descriptionState.personality.traits = personality_traits.value],
            [personality_ideals, () => descriptionState.personality.ideals = personality_ideals.value],
            [personality_bonds, () => descriptionState.personality.bonds = personality_bonds.value],
            [personality_flaws, () => descriptionState.personality.flaws = personality_flaws.value],
        ];

        textBindings.forEach(([el, updater]) => {
            el.addEventListener("input", () => {
                updater();
                markDirtyAndScheduleSave();
            });
        });
    }

    function bindImageInput() {
        appearance_imageFile.addEventListener("change", async () => {
            const file = appearance_imageFile.files?.[0];
            if (!file) return;

            if (file.size > 10 * 1024 * 1024) {
                console.warn("[charakter.js] Image file too large.");
                appearance_imageFile.value = "";
                return;
            }

            if (!file.type.startsWith("image/")) {
                console.warn("[charakter.js] Selected file is not an image.");
                appearance_imageFile.value = "";
                return;
            }

            try {
                const dataUrl = await resizeImageFile(file, {
                    maxWidth: 900,
                    maxHeight: 900,
                    quality: 0.86,
                });

                descriptionState.appearance.imageDataUrl = dataUrl;
                descriptionState.appearance.imageCrop = {
                    x: 50,
                    y: 50,
                    zoom: 1,
                };

                renderImagePreview();
                writeStateIntoCharacter();
                renderTopbarCharacterAvatar(currentCharacter);
                markDirtyAndScheduleSave();
            } catch (e) {
                console.error("[charakter.js] Failed to process image file.", e);
            } finally {
                appearance_imageFile.value = "";
            }
        });

        btnRemoveAppearanceImage.addEventListener("click", () => {
            descriptionState.appearance.imageDataUrl = "";
            descriptionState.appearance.imageCrop = {
                x: 50,
                y: 50,
                zoom: 1,
            };

            renderImagePreview();
            writeStateIntoCharacter();
            renderTopbarCharacterAvatar(currentCharacter);
            markDirtyAndScheduleSave();
        });
    }

    // =========================================================
    // Collapsible Sections
    // =========================================================
    function toggleCollapsible(toggleBtn) {
        if (!toggleBtn) return;

        const card = toggleBtn.closest(".collapsibleCard");
        if (!card) return;

        const body = card.querySelector(".collapsibleCard__body");
        if (!body) return;

        const isOpen = toggleBtn.getAttribute("aria-expanded") === "true";

        toggleBtn.setAttribute("aria-expanded", String(!isOpen));
        body.hidden = isOpen;
        card.classList.toggle("is-open", !isOpen);
    }

    function bindCollapsibleSections() {
        document.addEventListener("click", (e) => {
            const toggleBtn = e.target.closest(".characterSectionToggle");
            if (!toggleBtn) return;
            toggleCollapsible(toggleBtn);
        });
    }

    // =========================================================
    // Load / Hydrate
    // =========================================================
    async function loadCharacterAndHydrate() {
        const id = getSelectedCharacterId();

        if (!id) {
            boundCharacterId = null;
            currentCharacter = null;

            applyPersistDescription(emptyPersistDescription());
            fillAppearanceInputs();
            fillProficienciesAndLanguages();
            fillPersonalityInputs();
            return;
        }

        try {
            const c = await API.getCharacter(Number(id));
            currentCharacter = c;
            boundCharacterId = c.id;

            const persist = c?.data?.description ?? emptyPersistDescription();
            applyPersistDescription(persist);

            fillAppearanceInputs();
            fillProficienciesAndLanguages();
            fillPersonalityInputs();
        } catch (e) {
            console.error("[charakter.js] Failed to load character. Running in-memory only.", e);

            boundCharacterId = null;
            currentCharacter = null;

            applyPersistDescription(emptyPersistDescription());
            fillAppearanceInputs();
            fillProficienciesAndLanguages();
            fillPersonalityInputs();
        }
    }

    // =========================================================
    // Startup
    // =========================================================
    function startup() {
        bindTextInputs();
        bindImageInput();
        bindCollapsibleSections();

        return loadCharacterAndHydrate();
    }

    startup().then(() => {
    });
}

initCharacter();