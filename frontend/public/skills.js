import { API } from "./api.js";

const currentCharacterId =
    Number(localStorage.getItem("dnd_current_character_id")) || null;
let currentCharacter = null;
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
function abilityMod(score) {
    return Math.floor((score - 10) / 2);
}

function recalcSkills(data) {
    const proficiencyBonus = Number(data.proficiency_bonus ?? 0);

    const abilityMods = {
        str: abilityMod(Number(data.str ?? 10)),
        dex: abilityMod(Number(data.dex ?? 10)),
        int: abilityMod(Number(data.int ?? 10)),
        wis: abilityMod(Number(data.wis ?? 10)),
        cha: abilityMod(Number(data.cha ?? 10)),
    };

    for (const skill of SKILLS) {
        const base = abilityMods[skill.ability] ?? 0;
        const proficient = document.getElementById(skill.profId)?.checked ?? false;
        const value = base + (proficient ? proficiencyBonus : 0);

        const output = document.getElementById(skill.outId);

        if (output) {
            output.value = value;
        }
    }
}
async function saveSkills() {
    if (!currentCharacterId) return;

    try {
        // Frischen Stand holen, damit wir keine anderen Änderungen überschreiben.
        const latestCharacter = await API.getCharacter(currentCharacterId);

        const data = {
            ...(latestCharacter.data ?? {}),
        };

        for (const skill of SKILLS) {
            const checkbox = document.getElementById(skill.profId);
            data[skill.profId] = checkbox?.checked ?? false;
        }

        const updatedCharacter = await API.updateCharacter(currentCharacterId, {
            data,
            updated_at: latestCharacter.updated_at,
        });

        currentCharacter = updatedCharacter;

        console.log("Fertigkeiten gespeichert.");
    } catch (error) {
        console.error("Fertigkeiten konnten nicht gespeichert werden:", error);
    }
}
function bindSkillChanges() {
    for (const skill of SKILLS) {
        const checkbox = document.getElementById(skill.profId);
        if (!checkbox) continue;

        checkbox.addEventListener("change", async () => {
            if (!currentCharacter) return;

            recalcSkills(currentCharacter.data ?? {});
            await saveSkills();
        });
    }
}
async function loadCharacter() {
    if (!currentCharacterId) {
        console.log("Kein Charakter ausgewählt.");
        return;
    }

    try {
        const character = await API.getCharacter(currentCharacterId);
        const data = character.data ?? {};
        currentCharacter = character;

        document
            .querySelectorAll('input[type="checkbox"][id^="skill_"][id$="_prof"]')
            .forEach((el) => {
                el.checked = Boolean(data[el.id]);
            });
        recalcSkills(data);
        console.log("Fertigkeiten geladen:", character.name);
    } catch (error) {
        console.error("Fertigkeiten konnten nicht geladen werden:", error);
    }
}
bindSkillChanges();
loadCharacter();