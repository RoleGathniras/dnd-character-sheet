import { API } from "../api.js";
import { getCurrentCharacterId } from "/player/character-selection.js";
import { setStatus } from "/shared/status.js";

(function () {
  const isActionsPage = location.pathname.endsWith("/actions.html");

  if (!isActionsPage) return;

  let currentCharacter = null;
  let attackSaveTimer = null;
  let editingActionId = null;
  let expandedActionId = null;
  let inventoryWeapons = [];
  let equipmentBusy = false;
  let attackSaveQueue = Promise.resolve();
  const attackWeaponKeys = {};

  function setValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;

    if (el.type === "checkbox") {
      el.checked = Boolean(value);
      return;
    }

    el.value = value ?? "";
  }

  function getValue(id) {
    const el = document.getElementById(id);
    if (!el) return "";

    if (el.type === "checkbox") {
      return el.checked;
    }

    return el.value ?? "";
  }

  function toNum(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function abilityMod(score) {
    return Math.floor((score - 10) / 2);
  }

  function loadAttacks(data) {
    for (let i = 1; i <= 5; i++) {
      setValue(`attack_${i}_type`, data[`attack_${i}_type`] ?? "");

      setValue(`attack_${i}_abil`, data[`attack_${i}_abil`] ?? "");

      setValue(`attack_${i}_prof`, data[`attack_${i}_prof`] ?? false);

      setValue(`attack_${i}_misc`, data[`attack_${i}_misc`] ?? 0);

      setValue(`attack_${i}_range`, data[`attack_${i}_range`] ?? "");

      setValue(`attack_${i}_damage`, data[`attack_${i}_damage`] ?? "");
    }
  }

  function recalcAttacks() {
    const data = currentCharacter?.data ?? {};

    const proficiencyBonus = toNum(data.proficiency_bonus);

    for (let i = 1; i <= 5; i++) {
      const ability = getValue(`attack_${i}_abil`);

      const proficient = Boolean(getValue(`attack_${i}_prof`));

      const misc = toNum(getValue(`attack_${i}_misc`));

      let modifier = 0;

      if (ability) {
        const score = toNum(data[ability] ?? 10);

        modifier = abilityMod(score);
      }

      const attackBonus = modifier + (proficient ? proficiencyBonus : 0) + misc;

      setValue(`attack_${i}_bonus`, attackBonus);
    }
  }
  function saveAttacks() {
    if (!currentCharacter) return Promise.resolve(false);

    const characterId = currentCharacter.id;
    const attackData = {};

    for (let i = 1; i <= 5; i++) {
      attackData[`attack_${i}_type`] = getValue(`attack_${i}_type`);
      attackData[`attack_${i}_abil`] = getValue(`attack_${i}_abil`);
      attackData[`attack_${i}_prof`] = Boolean(getValue(`attack_${i}_prof`));
      attackData[`attack_${i}_misc`] = toNum(getValue(`attack_${i}_misc`));
      attackData[`attack_${i}_range`] = getValue(`attack_${i}_range`);
      attackData[`attack_${i}_damage`] = getValue(`attack_${i}_damage`);
      attackData[`attack_${i}_weapon_key`] = attackWeaponKeys[i] ?? null;
    }

    attackSaveQueue = attackSaveQueue.then(async () => {
      try {
        for (let attempt = 0; attempt < 2; attempt++) {
          const latest = await API.getCharacter(characterId);

          try {
            currentCharacter = await API.patchCharacter(characterId, {
              data: {
                ...(latest.data ?? {}),
                ...attackData,
              },
              updated_at: latest.updated_at,
            });
            break;
          } catch (error) {
            if (error.status !== 409 || attempt === 1) throw error;
          }
        }

        window.dispatchEvent(new CustomEvent("character:updated", {
          detail: { character: currentCharacter },
        }));

        setStatus("Auto-Save ✅");
        return true;
      } catch (error) {
        console.error("[actions] Angriffe konnten nicht gespeichert werden", error);
        setStatus("Angriffe konnten nicht gespeichert werden ❌");
        return false;
      }
    });

    return attackSaveQueue;
  }
  function scheduleAttackSave() {
    if (attackSaveTimer) {
      clearTimeout(attackSaveTimer);
    }

    attackSaveTimer = setTimeout(() => {
      attackSaveTimer = null;
      saveAttacks();
    }, 800);
  }
  function getCharacterActions() {
    const actions = currentCharacter?.data?.actions;

    return Array.isArray(actions) ? actions : [];
  }
  function escapeActionHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function openActionEditor(action) {
    const editor = document.getElementById("actionEditor");

    const name = document.getElementById("actionName");

    const description = document.getElementById("actionDescription");

    const type = document.getElementById("actionType");

    const limited = document.getElementById("actionLimitedUses");

    const usesMax = document.getElementById("actionUsesMax");

    const resetOn = document.getElementById("actionResetOn");

    const usesOptions = document.getElementById("actionUsesOptions");

    const deleteButton = document.getElementById("btnDeleteAction");

    if (!editor) return;

    editingActionId = action.id;

    if (name) {
      name.value = action.name ?? "";
    }

    if (description) {
      description.value = action.description ?? "";
    }

    if (type) {
      type.value = action.action_type ?? "action";
    }

    if (limited) {
      limited.checked = Boolean(action.limited_uses);
    }

    if (usesMax) {
      usesMax.value = String(action.uses_max ?? 1);
    }

    if (resetOn) {
      resetOn.value = action.reset_on ?? "manual";
    }

    if (usesOptions) {
      usesOptions.hidden = !Boolean(action.limited_uses);
    }

    if (deleteButton) {
      deleteButton.hidden = false;
    }

    editor.hidden = false;
  }
  async function toggleActionUse(actionId, index) {
    if (!currentCharacter) return;

    try {
      const latestCharacter = await API.getCharacter(currentCharacter.id);

      const actions = Array.isArray(latestCharacter.data?.actions)
        ? latestCharacter.data.actions
        : [];

      const updatedActions = actions.map((action) => {
        if (action.id !== actionId) {
          return action;
        }

        const usesMax = Math.max(1, Number(action.uses_max) || 1);

        const usesCurrent = Math.max(
          0,
          Math.min(usesMax, Number(action.uses_current) || 0),
        );

        /*
         * Klick auf einen gefüllten Punkt:
         * Anwendungen bis davor bleiben übrig.
         *
         * Klick auf einen leeren Punkt:
         * Anwendungen werden bis zu diesem
         * Punkt wieder aufgefüllt.
         */
        const newUsesCurrent = index < usesCurrent ? index : index + 1;

        return {
          ...action,
          uses_current: Math.min(usesMax, newUsesCurrent),
        };
      });

      const newData = {
        ...(latestCharacter.data ?? {}),
        actions: updatedActions,
      };

      const updatedCharacter = await API.patchCharacter(latestCharacter.id, {
        data: newData,
        updated_at: latestCharacter.updated_at,
      });

      currentCharacter = updatedCharacter;

      renderActions();

      window.dispatchEvent(
        new CustomEvent("character:updated", {
          detail: {
            character: updatedCharacter,
          },
        }),
      );

      setStatus("Auto-Save ✅");
    } catch (error) {
      console.error(
        "[actions] Anwendungen konnten nicht gespeichert werden",
        error,
      );

      setStatus("Speichern fehlgeschlagen ❌");
    }
  }

  async function moveAction(actionId, direction) {
    if (!currentCharacter) return;

    try {
      const latestCharacter = await API.getCharacter(currentCharacter.id);

      const actions = Array.isArray(latestCharacter.data?.actions)
        ? [...latestCharacter.data.actions]
        : [];

      const currentIndex = actions.findIndex(
        (action) => action.id === actionId,
      );

      if (currentIndex === -1) return;

      const newIndex = currentIndex + direction;

      // Nicht über den Anfang oder das Ende hinaus verschieben
      if (newIndex < 0 || newIndex >= actions.length) {
        return;
      }

      // Die beiden Aktionen tauschen
      [actions[currentIndex], actions[newIndex]] = [
        actions[newIndex],
        actions[currentIndex],
      ];

      const newData = {
        ...(latestCharacter.data ?? {}),
        actions,
      };

      const updatedCharacter = await API.patchCharacter(latestCharacter.id, {
        data: newData,
        updated_at: latestCharacter.updated_at,
      });

      currentCharacter = updatedCharacter;

      renderActions();

      window.dispatchEvent(
        new CustomEvent("character:updated", {
          detail: {
            character: updatedCharacter,
          },
        }),
      );

      setStatus("Reihenfolge gespeichert ✅");
    } catch (error) {
      console.error(
        "[actions] Reihenfolge konnte nicht gespeichert werden",
        error,
      );

      setStatus("Sortieren fehlgeschlagen ❌");
    }
  }
  function renderActions() {
    const list = document.getElementById("actionsList");

    if (!list) return;

    const actions = getCharacterActions();

    if (actions.length === 0) {
      list.innerHTML = `
            <p class="muted">
                Noch keine Aktionen angelegt.
            </p>
        `;

      return;
    }

    list.innerHTML = "";

    for (const action of actions) {
      const card = document.createElement("article");

      card.className = "actionCard";

      const typeLabels = {
        action: "Aktion",
        bonus_action: "Bonusaktion",
        reaction: "Reaktion",
        free_action: "Freie Aktion",
        other: "Sonstiges",
      };

      const typeLabel = typeLabels[action.action_type] ?? "Sonstiges";

      const resetLabels = {
        short_rest: "Kurze Rast",
        long_rest: "Lange Rast",
        manual: "Manuell",
      };

      let usesHtml = "";

      if (action.limited_uses) {
        const usesMax = Math.max(1, Number(action.uses_max) || 1);

        const usesCurrent = Math.max(
          0,
          Math.min(usesMax, Number(action.uses_current) || 0),
        );

        const dots = [];

        for (let i = 0; i < usesMax; i++) {
          const active = i < usesCurrent;

          dots.push(`
            <button
                class="actionCard__use ${active ? "is-active" : ""}"
                type="button"
                data-use-index="${i}"
                aria-label="Anwendung ${i + 1}"
            ></button>
        `);
        }

        usesHtml = `
        <div class="actionCard__uses">
            <span>Anwendungen:</span>

            <div class="actionCard__useDots">
                ${dots.join("")}
            </div>

            <small>
                Regeneration:
                ${escapeActionHtml(resetLabels[action.reset_on] ?? "Manuell")}
            </small>
        </div>
    `;
      }

      card.innerHTML = `
        <button
            class="actionCard__header"
            type="button"
            aria-expanded="false"
        >
            <span class="actionCard__title">
                <span class="actionCard__chevron">▶</span>
                <strong>${escapeActionHtml(action.name)}</strong>
            </span>

            <span>${escapeActionHtml(typeLabel)}</span>
        </button>

        <div class="actionCard__details" hidden>

            <div class="actionCard__descriptionSection">
                <button
                    class="actionCard__descriptionToggle"
                    type="button"
                    aria-expanded="false"
                >
                    <span>Beschreibung</span>
                    <span class="actionCard__descriptionChevron">▼</span>
                </button>

                <div
                    class="actionCard__description"
                    hidden
                >
                    ${escapeActionHtml(action.description)}
                </div>
            </div>

            ${usesHtml}

            <div class="actionCard__buttons">
                <div class="actionCard__sort">
                    <button
                        class="btn actionCard__moveUp"
                        type="button"
                        title="Nach oben"
                        aria-label="Aktion nach oben verschieben"
                    >
                        ↑
                    </button>

                    <button
                        class="btn actionCard__moveDown"
                        type="button"
                        title="Nach unten"
                        aria-label="Aktion nach unten verschieben"
                    >
                        ↓
                    </button>
                </div>

                <button
                    class="btn actionCard__edit"
                    type="button"
                >
                    Bearbeiten
                </button>
            </div>

        </div>
    `;
      if (expandedActionId === action.id) {
        const details = card.querySelector(".actionCard__details");

        const header = card.querySelector(".actionCard__header");

        const chevron = card.querySelector(".actionCard__chevron");

        if (details) {
          details.hidden = false;
        }

        if (header) {
          header.setAttribute("aria-expanded", "true");
        }

        if (chevron) {
          chevron.textContent = "▼";
        }
      }
      const header = card.querySelector(".actionCard__header");

      const details = card.querySelector(".actionCard__details");

      const chevron = card.querySelector(".actionCard__chevron");

      const descriptionToggle = card.querySelector(
        ".actionCard__descriptionToggle",
      );

      const description = card.querySelector(".actionCard__description");

      const descriptionChevron = card.querySelector(
        ".actionCard__descriptionChevron",
      );

      header?.addEventListener("click", () => {
        const isOpen = !details.hidden;

        details.hidden = isOpen;

        expandedActionId = isOpen ? null : action.id;

        header.setAttribute("aria-expanded", isOpen ? "false" : "true");

        if (chevron) {
          chevron.textContent = isOpen ? "▶" : "▼";
        }
      });

      descriptionToggle?.addEventListener("click", () => {
        const isOpen = !description.hidden;

        description.hidden = isOpen;

        descriptionToggle.setAttribute(
          "aria-expanded",
          isOpen ? "false" : "true",
        );

        if (descriptionChevron) {
          descriptionChevron.textContent = isOpen ? "▼" : "▲";
        }
      });

      card.querySelector(".actionCard__edit")?.addEventListener("click", () => {
        openActionEditor(action);
      });
      card
        .querySelector(".actionCard__moveUp")
        ?.addEventListener("click", () => {
          moveAction(action.id, -1);
        });

      card
        .querySelector(".actionCard__moveDown")
        ?.addEventListener("click", () => {
          moveAction(action.id, 1);
        });
      card.querySelectorAll(".actionCard__use").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.stopPropagation();

          const index = Number(button.dataset.useIndex);

          toggleActionUse(action.id, index);
        });
      });

      list.appendChild(card);
    }
  }

  async function loadCharacter() {
    const characterId = getCurrentCharacterId();

    if (!characterId) {
      currentCharacter = null;

      setStatus("Kein Charakter ausgewählt.");
      return;
    }

    try {
      const character = await API.getCharacter(characterId);

      currentCharacter = character;

      const data = character.data ?? {};

      loadAttacks(data);
      recalcAttacks();
      renderActions();
      setStatus(`Geladen: ${character.name}`);
    } catch (error) {
      console.error("[actions] Charakter konnte nicht geladen werden", error);

      setStatus("Fehler beim Laden des Charakters ❌");
    }
  }

  function bindAttackCalculation() {
    for (let i = 1; i <= 5; i++) {
      const type = document.getElementById(`attack_${i}_type`);

      const ability = document.getElementById(`attack_${i}_abil`);

      const proficient = document.getElementById(`attack_${i}_prof`);

      const misc = document.getElementById(`attack_${i}_misc`);

      const range = document.getElementById(`attack_${i}_range`);

      const damage = document.getElementById(`attack_${i}_damage`);

      type?.addEventListener("input", scheduleAttackSave);

      ability?.addEventListener("change", () => {
        recalcAttacks();
        scheduleAttackSave();
      });

      proficient?.addEventListener("change", () => {
        recalcAttacks();
        scheduleAttackSave();
      });

      misc?.addEventListener("input", () => {
        recalcAttacks();
        scheduleAttackSave();
      });

      range?.addEventListener("input", scheduleAttackSave);

      damage?.addEventListener("input", scheduleAttackSave);
    }
  }
  async function saveAction() {
    if (!currentCharacter) {
      setStatus("Kein Charakter ausgewählt.");
      return;
    }

    const name = document.getElementById("actionName")?.value.trim() ?? "";

    const description =
      document.getElementById("actionDescription")?.value.trim() ?? "";

    const actionType = document.getElementById("actionType")?.value ?? "action";

    const limitedUses =
      document.getElementById("actionLimitedUses")?.checked ?? false;

    const usesMaxRaw = Number(document.getElementById("actionUsesMax")?.value);

    const usesMax = limitedUses
      ? Math.max(
        1,
        Math.min(
          99,
          Number.isFinite(usesMaxRaw) ? Math.trunc(usesMaxRaw) : 1,
        ),
      )
      : 0;

    const resetOn = limitedUses
      ? (document.getElementById("actionResetOn")?.value ?? "manual")
      : "manual";

    if (!name) {
      alert("Bitte gib einen Namen für die Aktion ein.");
      return;
    }

    const newAction = {
      id: crypto.randomUUID(),
      name,
      description,
      action_type: actionType,

      // Kategorien bauen wir später in der UI aus.
      category: "class",

      limited_uses: limitedUses,
      uses_max: usesMax,
      uses_current: usesMax,
      reset_on: resetOn,
    };

    try {
      setStatus("Speichere Aktion…");

      const latestCharacter = await API.getCharacter(currentCharacter.id);

      const existingActions = Array.isArray(latestCharacter.data?.actions)
        ? latestCharacter.data.actions
        : [];

      let updatedActions;

      if (editingActionId) {
        updatedActions = existingActions.map((action) => {
          if (action.id !== editingActionId) {
            return action;
          }

          return {
            ...action,
            name,
            description,
            action_type: actionType,
            category: action.category ?? "class",
            limited_uses: limitedUses,
            uses_max: usesMax,
            reset_on: resetOn,

            uses_current: limitedUses
              ? Math.min(action.uses_current ?? usesMax, usesMax)
              : 0,
          };
        });
      } else {
        updatedActions = [...existingActions, newAction];
      }

      const newData = {
        ...(latestCharacter.data ?? {}),
        actions: updatedActions,
      };

      const updatedCharacter = await API.patchCharacter(latestCharacter.id, {
        data: newData,
        updated_at: latestCharacter.updated_at,
      });

      currentCharacter = updatedCharacter;

      renderActions();
      resetActionEditor();

      window.dispatchEvent(
        new CustomEvent("character:updated", {
          detail: {
            character: updatedCharacter,
          },
        }),
      );

      setStatus("Aktion gespeichert ✅");
    } catch (error) {
      console.error("[actions] Aktion konnte nicht gespeichert werden", error);

      setStatus("Aktion konnte nicht gespeichert werden ❌");
    }
  }
  function resetActionEditor() {
    const editor = document.getElementById("actionEditor");

    const name = document.getElementById("actionName");

    const description = document.getElementById("actionDescription");

    const type = document.getElementById("actionType");

    const limited = document.getElementById("actionLimitedUses");

    const usesMax = document.getElementById("actionUsesMax");

    const resetOn = document.getElementById("actionResetOn");

    const usesOptions = document.getElementById("actionUsesOptions");
    const deleteButton = document.getElementById("btnDeleteAction");

    if (name) name.value = "";
    if (description) description.value = "";
    if (type) type.value = "action";
    if (limited) limited.checked = false;
    if (usesMax) usesMax.value = "1";
    if (resetOn) resetOn.value = "short_rest";

    if (usesOptions) {
      usesOptions.hidden = true;
    }

    if (deleteButton) {
      deleteButton.hidden = true;
    }

    if (editor) {
      editor.hidden = true;
    }
    editingActionId = null;
  }
  async function deleteCurrentAction() {
    if (!currentCharacter || !editingActionId) {
      return;
    }

    const confirmed = confirm("Diese Aktion wirklich löschen?");

    if (!confirmed) {
      return;
    }

    try {
      setStatus("Lösche Aktion…");

      const latestCharacter = await API.getCharacter(currentCharacter.id);

      const actions = Array.isArray(latestCharacter.data?.actions)
        ? latestCharacter.data.actions
        : [];

      const updatedActions = actions.filter(
        (action) => action.id !== editingActionId,
      );

      const newData = {
        ...(latestCharacter.data ?? {}),
        actions: updatedActions,
      };

      const updatedCharacter = await API.patchCharacter(latestCharacter.id, {
        data: newData,
        updated_at: latestCharacter.updated_at,
      });

      currentCharacter = updatedCharacter;

      renderActions();
      resetActionEditor();

      window.dispatchEvent(
        new CustomEvent("character:updated", {
          detail: {
            character: updatedCharacter,
          },
        }),
      );

      setStatus("Aktion gelöscht ✅");
    } catch (error) {
      console.error("[actions] Aktion konnte nicht gelöscht werden", error);

      setStatus("Aktion konnte nicht gelöscht werden ❌");
    }
  }
  function bindActionEditor() {
    const btnAdd = document.getElementById("btnAddAction");

    const btnCancel = document.getElementById("btnCancelAction");

    const btnSave = document.getElementById("btnSaveAction");

    const editor = document.getElementById("actionEditor");

    const limitedUses = document.getElementById("actionLimitedUses");

    const btnDelete = document.getElementById("btnDeleteAction");

    const usesOptions = document.getElementById("actionUsesOptions");

    btnAdd?.addEventListener("click", () => {
      if (!editor) return;

      editor.hidden = false;
    });

    btnSave?.addEventListener("click", saveAction);

    btnCancel?.addEventListener("click", () => {
      resetActionEditor();
    });

    limitedUses?.addEventListener("change", () => {
      if (!usesOptions) return;

      usesOptions.hidden = !limitedUses.checked;
    });
    btnDelete?.addEventListener("click", deleteCurrentAction);
  }
  function weaponKey(item) {
    function canonical(value) {
      if (Array.isArray(value)) {
        return `[${value.map(canonical).join(",")}]`;
      }

      if (value !== null && typeof value === "object") {
        return `{${Object.keys(value).sort().map(key =>
          `${JSON.stringify(key)}:${canonical(value[key])}`
        ).join(",")}}`;
      }

      return JSON.stringify(value);
    }

    return canonical({
      template_id: item.template_id,
      snapshot: item.snapshot,
      hands: item.equipped_hands,
    });
  }

  function weaponRange(weapon) {
    if (weapon.range_normal == null) return "Nicht hinterlegt";

    const format = new Intl.NumberFormat("de-DE", {
      maximumFractionDigits: 1,
    });

    let text = `${format.format(Number(weapon.range_normal))} m`;

    if (weapon.range_long != null) {
      text += ` / ${format.format(Number(weapon.range_long))} m`;
    }

    return text;
  }

  function clearAttackCard(slot) {
    for (const field of ["type", "abil", "range", "damage"]) {
      setValue(`attack_${slot}_${field}`, "");
    }

    setValue(`attack_${slot}_prof`, false);
    setValue(`attack_${slot}_misc`, 0);
    attackWeaponKeys[slot] = null;
  }

  function applyEquippedWeapons() {
    const data = currentCharacter?.data ?? {};

    for (let slot = 1; slot <= 5; slot++) {
      const item = inventoryWeapons.find(entry =>
        entry.attack_slot === slot &&
        entry.equipped_hands != null
      );

      const name = document.getElementById(`attack_${slot}_type`);
      const range = document.getElementById(`attack_${slot}_range`);

      name.readOnly = Boolean(item);
      range.readOnly = Boolean(item);

      if (!item) {
        // Alte manuelle Angriffe erhalten. Nur frühere Waffenbelegungen leeren.
        if (attackWeaponKeys[slot] || data[`attack_${slot}_weapon_key`]) {
          clearAttackCard(slot);
        }
        continue;
      }

      const key = weaponKey(item);
      const previousKey =
        attackWeaponKeys[slot] ?? data[`attack_${slot}_weapon_key`];

      if (previousKey !== key) {
        clearAttackCard(slot);

        const weapon = item.snapshot.weapon;
        const dice =
          weapon.hand_requirement === "versatile" &&
            item.equipped_hands === 2
            ? weapon.versatile_damage
            : weapon.damage_dice;

        setValue(
          `attack_${slot}_damage`,
          `${(dice ?? "").replace("d", "W")} ${weapon.damage_type}`,
        );
      }

      attackWeaponKeys[slot] = key;
      setValue(`attack_${slot}_type`, item.snapshot.name);
      setValue(`attack_${slot}_range`, weaponRange(item.snapshot.weapon));
    }

    recalcAttacks();
  }

  function renderWeaponControls() {
    for (let slot = 1; slot <= 5; slot++) {
      const row = document.getElementById(`attack_${slot}_type`)
        .closest(".attacksRow");

      let nameGroup = row.querySelector(".attackNameGroup");

      if (!nameGroup) {
        nameGroup = document.createElement("div");
        nameGroup.className = "attackNameGroup";

        const nameInput = document.getElementById(`attack_${slot}_type`);
        nameInput.before(nameGroup);
        nameGroup.appendChild(nameInput);
      }

      let controls = nameGroup.querySelector("[data-weapon-controls]");

      if (!controls) {
        controls = document.createElement("div");
        controls.dataset.weaponControls = "1";
        nameGroup.appendChild(controls);
      }

      controls.replaceChildren();

      const equipped = inventoryWeapons.find(item =>
        item.attack_slot === slot && item.equipped_hands != null
      );

      if (equipped) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "btn";
        remove.textContent = "✕";
        remove.setAttribute("aria-label", `${equipped.snapshot.name} ablegen`);
        remove.title = "Waffe ablegen";
        remove.disabled = equipmentBusy;

        remove.addEventListener("click", () => {
          void changeCardEquipment(slot, equipped, null);
        });

        controls.appendChild(remove);
        continue;
      }

      const open = document.createElement("button");
      open.type = "button";
      open.className = "btn";
      open.textContent = "+";
      open.title = "Waffe ausrüsten";
      open.setAttribute("aria-label", `Waffe für Angriffskarte ${slot} ausrüsten`);
      open.disabled = equipmentBusy;
      controls.appendChild(open);

      const picker = document.createElement("div");
      picker.className = "row gap";
      picker.classList.add("attackWeaponPicker");
      picker.hidden = true;

      const select = document.createElement("select");
      select.setAttribute("aria-label", `Waffe für Angriffskarte ${slot}`);

      const available = inventoryWeapons.filter(item => item.attack_slot == null);

      select.add(new Option("Waffe auswählen", ""));

      for (const item of available) {
        select.add(new Option(
          `${item.snapshot.name} · Stapel #${item.id}`,
          String(item.id),
        ));
      }

      const hands = document.createElement("select");
      hands.setAttribute("aria-label", "Handnutzung");

      const equip = document.createElement("button");
      equip.type = "button";
      equip.className = "btn";
      equip.textContent = "Ausrüsten";
      equip.disabled = true;

      select.addEventListener("change", () => {
        const item = available.find(entry => entry.id === Number(select.value));
        hands.replaceChildren();
        equip.disabled = !item;

        if (!item) return;

        const requirement = item.snapshot.weapon.hand_requirement;

        if (["one", "versatile"].includes(requirement)) {
          hands.add(new Option("Einhändig", "1"));
        }
        if (["two", "versatile"].includes(requirement)) {
          hands.add(new Option("Zweihändig", "2"));
        }
      });

      equip.addEventListener("click", () => {
        const item = available.find(entry => entry.id === Number(select.value));
        if (item) void changeCardEquipment(slot, item, Number(hands.value));
      });

      open.addEventListener("click", () => {
        picker.hidden = !picker.hidden;
      });

      picker.append(select, hands, equip);
      controls.appendChild(picker);
    }
  }

  async function refreshWeaponCards() {
    const inventory = await API.listCharacterInventory(currentCharacter.id);

    inventoryWeapons = inventory.filter(item =>
      item.snapshot.category === "weapon" &&
      item.snapshot.weapon
    );

    applyEquippedWeapons();
    renderWeaponControls();
  }

  async function changeCardEquipment(slot, item, hands) {
    if (equipmentBusy) return;

    // Eine vorhandene manuelle Karte nicht ohne Hinweis überschreiben.
    if (
      hands !== null &&
      getValue(`attack_${slot}_type`) &&
      !confirm("Den bisherigen Angriff in dieser Karte durch die Waffe ersetzen?")
    ) return;

    equipmentBusy = true;

    const section = document.getElementById("sec-attacks");
    section.querySelectorAll("input, select, button").forEach(element => {
      element.disabled = true;
    });

    try {
      clearTimeout(attackSaveTimer);
      attackSaveTimer = null;

      if (!await saveAttacks()) {
        throw new Error("Bitte zuerst die Angriffsänderungen erfolgreich speichern.");
      }

      await API.updateItemEquipment(item.id, {
        equipped_hands: hands,
        attack_slot: hands === null ? null : slot,
        expected_version: item.version,
      });

      await refreshWeaponCards();

      if (!await saveAttacks()) {
        throw new Error(
          "Waffenzuordnung gespeichert, aber Angriffsänderungen nicht gespeichert.",
        );
      }

      setStatus(hands === null ? "Waffe abgelegt." : "Waffe ausgerüstet.");
    } catch (error) {
      console.error("[actions] Waffenzuordnung fehlgeschlagen", error);

      try {
        await refreshWeaponCards();
      } catch (refreshError) {
        console.error(refreshError);
        setStatus("Waffenstand unbekannt. Bitte Seite neu laden.");
        return;
      }

      setStatus(error.message || "Waffenzuordnung fehlgeschlagen.");
    } finally {
      equipmentBusy = false;
      section.querySelectorAll("input, select, button").forEach(element => {
        element.disabled = false;
      });
      renderWeaponControls();
    }
  }

  (async function startupActions() {
    bindAttackCalculation();
    bindActionEditor();

    await loadCharacter();

    if (currentCharacter) {
      try {
        await refreshWeaponCards();
      } catch (error) {
        console.error(error);
        setStatus("Inventar konnte nicht geladen werden. Bitte Seite neu laden.");
      }
    }
  })();
})();
