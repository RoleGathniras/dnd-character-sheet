import { API } from "./api.js";
import {
    applyRoleUI,
    getCurrentCharacterId,
    loadCharacters,
    refreshCurrentUserAndUI,
    renderDrawerTitle,
    renderTopbarCharacterAvatar,
    setAdminVisible,
    setCurrentCharacter,
    setLoggedInUI,
    setStatus,
} from "./app.js";
import { jsonToSheet, sheetToJson } from "./mapper.js";


(function () {
    const isSheetPage = location.pathname.endsWith("/sheet.html");
    if (!isSheetPage) return;

    const sheetRootEl = document.getElementById("sheetRoot");
    const btnSave = document.getElementById("btnSave");
    const btnDelete = document.getElementById("btnDelete");

    let currentCharacter = null;
    let currentCharacterUpdatedAt = null;
    let isDirty = false;
    let autosaveTimer = null;
    let isSaving = false;
    let recalcAttacks = null;

    function getNum(id, fallback = 0) {
        const el = document.getElementById(id);
        if (!el) return fallback;

        let v = Number(el.value);
        if (!Number.isFinite(v)) return fallback;

        const hasMin = el.min !== "";
        const hasMax = el.max !== "";

        if (hasMin) v = Math.max(v, Number(el.min));
        if (hasMax) v = Math.min(v, Number(el.max));

        if (String(v) !== el.value) {
            el.value = String(v);
        }

        return v;
    }
    function setDerivedVal(id, value) {
        const el = document.getElementById(id);
        if (!el) return;

        const next = String(value);
        if (el.value === next) return;
        el.value = next;
    }

    function isChecked(id) {
        const el = document.getElementById(id);
        return !!el && el.checked;
    }

    function toNum(v) {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    }

    function getVal(id) {
        return document.getElementById(id)?.value ?? "";
    }

    function markDirty() {
        if (!getCurrentCharacterId()) return;
        isDirty = true;
        if (btnSave) btnSave.disabled = false;
        setStatus("Ungespeicherte Änderungen ⚠");
        scheduleAutoSave();
    }
    function syncTopbarAvatarFromCurrentCharacter() {
        renderTopbarCharacterAvatar(currentCharacter);
    }

    function scheduleAutoSave() {
        if (!getCurrentCharacterId()) return;
        if (!isDirty) return;

        if (autosaveTimer) clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(() => {
            autosaveTimer = null;
            doAutoSave();
            scheduleAutoSave();
        }, 800);
    }

    function abilityMod(score) {
        return Math.floor((score - 10) / 2);
    }

    const SKILLS = [
        { key: "athletics", ability: "str", profId: "skill_athletics_prof", outId: "skill_athletics" },

        { key: "acrobatics", ability: "dex", profId: "skill_acrobatics_prof", outId: "skill_acrobatics" },
        { key: "sleight_of_hand", ability: "dex", profId: "skill_sleight_of_hand_prof", outId: "skill_sleight_of_hand" },
        { key: "stealth", ability: "dex", profId: "skill_stealth_prof", outId: "skill_stealth" },

        { key: "arcana", ability: "int", profId: "skill_arcana_prof", outId: "skill_arcana" },
        { key: "history", ability: "int", profId: "skill_history_prof", outId: "skill_history" },
        { key: "investigation", ability: "int", profId: "skill_investigation_prof", outId: "skill_investigation" },
        { key: "nature", ability: "int", profId: "skill_nature_prof", outId: "skill_nature" },
        { key: "religion", ability: "int", profId: "skill_religion_prof", outId: "skill_religion" },

        { key: "animal_handling", ability: "wis", profId: "skill_animal_handling_prof", outId: "skill_animal_handling" },
        { key: "insight", ability: "wis", profId: "skill_insight_prof", outId: "skill_insight" },
        { key: "medicine", ability: "wis", profId: "skill_medicine_prof", outId: "skill_medicine" },
        { key: "perception", ability: "wis", profId: "skill_perception_prof", outId: "skill_perception" },
        { key: "survival", ability: "wis", profId: "skill_survival_prof", outId: "skill_survival" },

        { key: "deception", ability: "cha", profId: "skill_deception_prof", outId: "skill_deception" },
        { key: "intimidation", ability: "cha", profId: "skill_intimidation_prof", outId: "skill_intimidation" },
        { key: "performance", ability: "cha", profId: "skill_performance_prof", outId: "skill_performance" },
        { key: "persuasion", ability: "cha", profId: "skill_persuasion_prof", outId: "skill_persuasion" },
    ];

    const SAVES = [
        { ability: "str", profId: "save_str_prof", outId: "save_str" },
        { ability: "dex", profId: "save_dex_prof", outId: "save_dex" },
        { ability: "con", profId: "save_con_prof", outId: "save_con" },
        { ability: "int", profId: "save_int_prof", outId: "save_int" },
        { ability: "wis", profId: "save_wis_prof", outId: "save_wis" },
        { ability: "cha", profId: "save_cha_prof", outId: "save_cha" },
    ];

    function recalcSaves() {
        const pb = getNum("proficiency_bonus", 0);

        const abilityMods = {
            str: abilityMod(getNum("str", 10)),
            dex: abilityMod(getNum("dex", 10)),
            con: abilityMod(getNum("con", 10)),
            int: abilityMod(getNum("int", 10)),
            wis: abilityMod(getNum("wis", 10)),
            cha: abilityMod(getNum("cha", 10)),
        };

        for (const s of SAVES) {
            const base = abilityMods[s.ability] ?? 0;
            const val = base + (isChecked(s.profId) ? pb : 0);
            setDerivedVal(s.outId, val);
        }
    }

    function recalcSkills() {
        const pb = getNum("proficiency_bonus", 0);

        const abilityMods = {
            str: abilityMod(getNum("str", 10)),
            dex: abilityMod(getNum("dex", 10)),
            con: abilityMod(getNum("con", 10)),
            int: abilityMod(getNum("int", 10)),
            wis: abilityMod(getNum("wis", 10)),
            cha: abilityMod(getNum("cha", 10)),
        };

        for (const s of SKILLS) {
            const base = abilityMods[s.ability] ?? 0;
            const val = base + (isChecked(s.profId) ? pb : 0);
            setDerivedVal(s.outId, val);
        }
    }

    function recalcPassives() {
        const perception = getNum("skill_perception", 0);
        const investigation = getNum("skill_investigation", 0);
        const insight = getNum("skill_insight", 0);

        setDerivedVal("passive_perception", 10 + perception);
        setDerivedVal("passive_investigation", 10 + investigation);
        setDerivedVal("passive_insight", 10 + insight);
    }

    function recalcAbilities() {
        const scores = {
            str: getNum("str", 10),
            dex: getNum("dex", 10),
            con: getNum("con", 10),
            int: getNum("int", 10),
            wis: getNum("wis", 10),
            cha: getNum("cha", 10),
        };

        for (const [ability, score] of Object.entries(scores)) {
            setDerivedVal(`${ability}_mod`, abilityMod(score));
        }
    }
    function clampInput(el) {
        if (!el || el.type !== "number") return;

        const min = el.min !== "" ? Number(el.min) : null;
        const max = el.max !== "" ? Number(el.max) : null;

        let raw = String(el.value ?? "").trim();

        if (raw === "") return;

        raw = raw.replace(",", ".");
        let val = Number(raw);

        if (!Number.isFinite(val)) {
            el.value = "";
            return;
        }

        val = Math.trunc(val);

        if (min !== null && val < min) val = min;
        if (max !== null && val > max) val = max;

        const next = String(val);
        if (el.value !== next) {
            el.value = next;
        }
    }

    function recalcDerived() {
        recalcAbilities();
        recalcSkills();
        recalcSaves();
        recalcPassives();
    }

    function bindSkillAutoCalc() {
        const ids = [
            "proficiency_bonus",
            "str", "dex", "con", "int", "wis", "cha",
            ...SKILLS.flatMap((s) => [s.profId]),
            ...SAVES.flatMap((s) => [s.profId]),
        ];

        for (const id of ids) {
            const el = document.getElementById(id);
            if (!el) continue;

            if (el.type === "checkbox") {
                el.addEventListener("change", recalcDerived);
            } else {
                el.addEventListener("input", recalcDerived);
                el.addEventListener("change", recalcDerived);
            }
        }

        recalcDerived();
    }

    function bindAttackAutoCalc() {
        const attackCount = 5;

        function recalcAttack(i) {
            const abil = getVal(`attack_${i}_abil`);
            const pb = toNum(getVal("proficiency_bonus"));
            const misc = toNum(getVal(`attack_${i}_misc`));
            const prof = !!document.getElementById(`attack_${i}_prof`)?.checked;
            const mod = abil ? toNum(getVal(`${abil}_mod`)) : 0;

            setDerivedVal(`attack_${i}_bonus`, mod + (prof ? pb : 0) + misc);
        }

        recalcAttacks = function () {
            for (let i = 1; i <= attackCount; i++) recalcAttack(i);
        };

        document.getElementById("proficiency_bonus")?.addEventListener("input", recalcAttacks);
        ["str", "dex", "con", "int", "wis", "cha"].forEach((a) => {
            document.getElementById(a)?.addEventListener("input", recalcAttacks);
        });

        for (let i = 1; i <= attackCount; i++) {
            document.getElementById(`attack_${i}_abil`)?.addEventListener("change", recalcAttacks);
            document.getElementById(`attack_${i}_prof`)?.addEventListener("change", recalcAttacks);
            document.getElementById(`attack_${i}_misc`)?.addEventListener("input", recalcAttacks);
        }

        recalcAttacks();
    }

    async function loadCharacter(id) {
        const cid = Number(id);
        if (!cid) {
            currentCharacter = null;
            syncTopbarAvatarFromCurrentCharacter();
            setStatus("Kein Charakter ausgewählt.");
            return;
        }

        try {
            setStatus("Lade Charakter…");

            const c = await API.getCharacter(cid);

            currentCharacter = c;
            setCurrentCharacter(c.id);
            currentCharacterUpdatedAt = c.updated_at;

            jsonToSheet(c.data);
            recalcDerived();
            recalcAttacks?.();
            syncTopbarAvatarFromCurrentCharacter();

            const titleEl = document.getElementById("sheetTitle");
            if (titleEl) titleEl.textContent = c.name;

            isDirty = false;
            if (btnSave) btnSave.disabled = true;

            setStatus(`Geladen: ${c.name}`);
        } catch (e) {
            console.error(e);
            currentCharacter = null;
            syncTopbarAvatarFromCurrentCharacter();
            setStatus("Fehler beim Laden des Charakters ❌");
            alert("Fehler beim Laden des Charakters.");
        }
    }

    async function saveCurrentCharacter({ silent = false } = {}) {
        const currentCharacterId = getCurrentCharacterId();
        if (!currentCharacterId) return;
        if (isSaving) return;

        isSaving = true;

        try {
            if (!silent) setStatus("Speichere…");

            const sheetData = sheetToJson();

            const baseData =
                currentCharacter && currentCharacter.data && typeof currentCharacter.data === "object"
                    ? structuredClone(currentCharacter.data)
                    : {};

            const mergedData = {
                ...baseData,
                ...sheetData,
            };

            const res = await API.patchCharacter(currentCharacterId, {
                data: mergedData,
                updated_at: currentCharacterUpdatedAt,
            });

            currentCharacter = res;
            currentCharacterUpdatedAt = res.updated_at;
            syncTopbarAvatarFromCurrentCharacter();
            isDirty = false;
            if (btnSave) btnSave.disabled = true;

            setStatus(silent ? "Auto-Save ✅" : "Gespeichert ✅");

            setTimeout(() => {
                if (!isDirty) setStatus("Bereit ✅");
            }, 1200);
        } catch (e) {
            console.error("SAVE ERROR", e);

            if (String(e).includes("409")) {
                alert("Konflikt: Der Charakter wurde zwischenzeitlich geändert. Ich lade neu.");
                await loadCharacter(currentCharacterId);
                return;
            }

            setStatus("Speichern fehlgeschlagen ❌");
        } finally {
            isSaving = false;
        }
    }

    function doAutoSave() {
        saveCurrentCharacter({ silent: true });
    }

    function resetSheetUI() {
        const titleEl = document.getElementById("sheetTitle");
        if (titleEl) titleEl.textContent = "Kein Charakter geladen";

        currentCharacter = null;
        syncTopbarAvatarFromCurrentCharacter();

        isDirty = false;
        currentCharacterUpdatedAt = null;
        if (btnSave) btnSave.disabled = true;
        if (btnDelete) btnDelete.disabled = true;
    }

    btnSave?.addEventListener("click", async () => {
        await saveCurrentCharacter({ silent: false });
    });

    btnDelete?.addEventListener("click", async () => {
        const currentCharacterId = getCurrentCharacterId();
        if (!currentCharacterId) return;

        const confirmed = confirm("Willst du diesen Charakter wirklich löschen?");
        if (!confirmed) return;

        try {
            await API.deleteCharacter(currentCharacterId);
            setCurrentCharacter(null);
            resetSheetUI();
            await loadCharacters();
            setStatus("Charakter gelöscht.");
        } catch (e) {
            console.error(e);
            setStatus(e?.message || "Löschen fehlgeschlagen.");
        }
    });

    window.addEventListener("character:selected", async (e) => {
        const id = e.detail?.id;
        if (!id) return;
        await loadCharacter(id);
    });

    window.addEventListener("character:cleared", () => {
        resetSheetUI();
    });

    (async function startupSheet() {
        bindSkillAutoCalc();
        bindAttackAutoCalc();

        sheetRootEl?.addEventListener("focusin", (e) => {
            const el = e.target;
            if (!(el instanceof HTMLInputElement)) return;
            if (el.type !== "number") return;

            // Inhalt markieren, damit neuer Wert den alten direkt ersetzt
            requestAnimationFrame(() => {
                el.select();
            });
        });

        sheetRootEl?.addEventListener("keydown", (e) => {
            const el = e.target;
            if (!(el instanceof HTMLInputElement)) return;
            if (el.type !== "number") return;

            const allowedKeys = [
                "Backspace",
                "Delete",
                "Tab",
                "Escape",
                "Enter",
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown",
                "Home",
                "End",
            ];

            if (allowedKeys.includes(e.key)) return;

            // Strg/Cmd-Kombinationen erlauben (copy, paste, cut, select all)
            if (e.ctrlKey || e.metaKey) return;

            // Nur ganze Zahlen und optional führendes Minus erlauben
            if (!/^[0-9-]$/.test(e.key)) {
                e.preventDefault();
                return;
            }

            // Minus nur einmal und nur am Anfang erlauben
            if (e.key === "-") {
                const hasMin = el.min !== "";
                const min = hasMin ? Number(el.min) : null;

                // Kein Minus erlauben, wenn Feld keine negativen Werte zulässt
                if (min !== null && min >= 0) {
                    e.preventDefault();
                    return;
                }

                const start = el.selectionStart ?? 0;
                const end = el.selectionEnd ?? 0;
                const value = el.value ?? "";

                const nextValue = value.slice(0, start) + "-" + value.slice(end);

                if (start !== 0 || nextValue.indexOf("-") !== 0 || value.includes("-")) {
                    e.preventDefault();
                }
            }
        });

        sheetRootEl?.addEventListener("input", (e) => {
            const el = e.target;
            if (el instanceof HTMLInputElement && el.type === "number") {
                // Alles außer Ziffern und optional führendem Minus entfernen
                const hasMin = el.min !== "";
                const min = hasMin ? Number(el.min) : null;
                const allowNegative = min === null || min < 0;

                let value = el.value ?? "";

                value = value.replace(",", "");
                value = value.replace(".", "");
                value = value.replace(/[eE]/g, "");
                value = value.replace(/\+/g, "");

                if (allowNegative) {
                    value = value.replace(/(?!^)-/g, "");
                } else {
                    value = value.replace(/-/g, "");
                }

                value = value.replace(/[^\d-]/g, "");

                if (!allowNegative) {
                    value = value.replace(/-/g, "");
                }

                if (el.value !== value) {
                    el.value = value;
                }
            }

            markDirty();
        });

        sheetRootEl?.addEventListener("focusout", (e) => {
            clampInput(e.target);
            markDirty();
        });

        if (API.token) {
            try {
                setLoggedInUI(true);
                await refreshCurrentUserAndUI();
                applyRoleUI();
                await loadCharacters();

                const currentCharacterId = getCurrentCharacterId();
                if (currentCharacterId) {
                    await loadCharacter(currentCharacterId);
                } else {
                    setStatus("Bereit ✅");
                }
            } catch (e) {
                console.error(e);

                if (e?.status === 401) {
                    API.token = null;
                    setStatus("Token ungültig – bitte neu einloggen");
                } else {
                    setStatus("Startup-Fehler – bitte Konsole prüfen");
                }

                setLoggedInUI(false);
                setAdminVisible(false);
                renderDrawerTitle();
            }
        } else {
            setLoggedInUI(false);
            applyRoleUI();
            setAdminVisible(false);
            renderDrawerTitle();
            setStatus("UI bereit ✅");
        }
    })();
})();