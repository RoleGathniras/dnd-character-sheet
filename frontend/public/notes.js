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

    const notes_npcs = document.getElementById("notes_npcs");
    const notes_quests = document.getElementById("notes_quests");
    const notes_places = document.getElementById("notes_places");
    const notes_story = document.getElementById("notes_story");

    const required = [
        btnMenu, drawer, backdrop, btnCloseDrawer, listMine, listNpcs,
        notes_npcs, notes_quests, notes_places, notes_story
    ];

    if (required.some((el) => !el)) {
        console.warn("[notes.js] Missing required DOM elements. Script skipped.");
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
    function emptyPersistNotes() {
        return {
            v: 1,
            npcs: "",
            quests: "",
            places: "",
            story: "",
        };
    }

    const notesState = emptyPersistNotes();

    function applyPersistNotes(persist) {
        const p = persist && typeof persist === "object" ? persist : emptyPersistNotes();

        notesState.npcs = String(p.npcs || "");
        notesState.quests = String(p.quests || "");
        notesState.places = String(p.places || "");
        notesState.story = String(p.story || "");
    }

    function toPersistNotes() {
        return structuredClone(notesState);
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
        data.notes = toPersistNotes();
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
                    const myNotes = toPersistNotes();
                    const latest = await API.getCharacter(id);

                    latest.data = latest.data && typeof latest.data === "object" ? latest.data : {};
                    latest.data.notes = myNotes;

                    const payload2 = {
                        data: latest.data,
                        updated_at: latest.updated_at,
                    };

                    currentCharacter = await API.patchCharacter(id, payload2);
                } catch (e2) {
                    console.error("[notes.js] Save failed after 409 retry.", e2);
                }
            } else {
                console.error("[notes.js] Save failed.", e);
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
    function fillInputs() {
        notes_npcs.value = notesState.npcs;
        notes_quests.value = notesState.quests;
        notes_places.value = notesState.places;
        notes_story.value = notesState.story;
    }

    // =========================================================
    // Bind Inputs
    // =========================================================
    function bindInputs() {
        notes_npcs.addEventListener("input", () => {
            notesState.npcs = notes_npcs.value;
            markDirtyAndScheduleSave();
        });

        notes_quests.addEventListener("input", () => {
            notesState.quests = notes_quests.value;
            markDirtyAndScheduleSave();
        });

        notes_places.addEventListener("input", () => {
            notesState.places = notes_places.value;
            markDirtyAndScheduleSave();
        });

        notes_story.addEventListener("input", () => {
            notesState.story = notes_story.value;
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
            const toggleBtn = e.target.closest(".notesSectionToggle");
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
            console.warn("[notes.js] Failed to load characters", e);
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

            applyPersistNotes(emptyPersistNotes());
            fillInputs();
            return;
        }

        try {
            const c = await API.getCharacter(Number(id));
            currentCharacter = c;
            boundCharacterId = c.id;

            const persist = c?.data?.notes ?? emptyPersistNotes();
            applyPersistNotes(persist);

            fillInputs();
        } catch (e) {
            console.error("[notes.js] Failed to load character. Running in-memory only.", e);

            boundCharacterId = null;
            currentCharacter = null;

            applyPersistNotes(emptyPersistNotes());
            fillInputs();
        }
    }

    // =========================================================
    // Startup
    // =========================================================
    function startup() {
        bindInputs();
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