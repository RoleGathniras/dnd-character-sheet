import { API } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
    // =========================================================
    // DOM
    // =========================================================
    const btnMenu = document.getElementById("btnMenu");
    const drawer = document.getElementById("drawer");
    const backdrop = document.getElementById("backdrop");
    const btnCloseDrawer = document.getElementById("btnCloseDrawer");
    const listMine = document.getElementById("listMine");
    const listNpcs = document.getElementById("listNpcs");

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
        btnMenu, drawer, backdrop, btnCloseDrawer, listMine, listNpcs,
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
            v: 1,
            appearance: {
                imageDataUrl: "",
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
        } catch (e) {
            if (isConflict409(e)) {
                try {
                    const myDescription = toPersistDescription();
                    const latest = await API.getCharacter(id);

                    latest.data = latest.data && typeof latest.data === "object" ? latest.data : {};
                    latest.data.character_description = myDescription;

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

        if (src) {
            appearance_imagePreview.src = src;
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

            try {
                const dataUrl = await readFileAsDataUrl(file);
                descriptionState.appearance.imageDataUrl = dataUrl;
                renderImagePreview();
                markDirtyAndScheduleSave();
            } catch (e) {
                console.error("[charakter.js] Failed to read image file.", e);
            } finally {
                appearance_imageFile.value = "";
            }
        });

        btnRemoveAppearanceImage.addEventListener("click", () => {
            descriptionState.appearance.imageDataUrl = "";
            renderImagePreview();
            markDirtyAndScheduleSave();
        });
    }

    function readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                resolve(String(reader.result || ""));
            };

            reader.onerror = () => {
                reject(reader.error || new Error("Datei konnte nicht gelesen werden."));
            };

            reader.readAsDataURL(file);
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
    // Drawer
    // =========================================================
    function openDrawer() {
        drawer.classList.add("is-open");
        drawer.setAttribute("aria-hidden", "false");
        backdrop.hidden = false;
    }

    function closeDrawer() {
        drawer.classList.remove("is-open");
        drawer.setAttribute("aria-hidden", "true");
        backdrop.hidden = true;
    }

    async function loadCharactersForDrawer() {
        listMine.innerHTML = "";
        listNpcs.innerHTML = "";

        let chars = [];
        try {
            chars = await API.characters();
        } catch (e) {
            console.warn("[charakter.js] Failed to load characters", e);
            return;
        }

        const currentId = Number(localStorage.getItem("selectedCharacterId"));

        for (const c of chars) {
            const b = document.createElement("button");
            b.className = "drawer__item";

            if (Number(c.id) === currentId) {
                b.classList.add("is-active");
            }

            const name = c.name ?? "";
            const kind = (c.kind ?? "").toUpperCase();
            const owner = c.owner_username ?? "";

            b.innerHTML = `
                <span class="drawerItem__main">
                    <span class="drawerItem__name">${escapeHtml(name)}</span>
                    <span class="drawerItem__kind">${escapeHtml(kind)}</span>
                </span>
                ${owner ? `<span class="drawerItem__sub">${escapeHtml(owner)}</span>` : ``}
            `;

            b.addEventListener("click", async () => {
                setSelectedCharacterId(c.id);
                closeDrawer();
                await loadCharacterAndHydrate();
                await loadCharactersForDrawer();
            });

            if (c.kind === "npc") listNpcs.appendChild(b);
            else listMine.appendChild(b);
        }
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

        btnMenu.addEventListener("click", openDrawer);
        btnCloseDrawer.addEventListener("click", closeDrawer);
        backdrop.addEventListener("click", closeDrawer);

        return loadCharacterAndHydrate();
    }

    startup().then(() => {
        loadCharactersForDrawer();
    });
});