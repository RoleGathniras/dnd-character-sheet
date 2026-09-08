import { API } from "./api.js";

let currentStatusbarCharacter = null;


export function initCharacterStatusbar() {
    const appbar = document.querySelector(".appbar");

    if (!appbar) return;

    // Nicht doppelt erzeugen
    if (document.getElementById("characterStatusbar")) return;

    const statusbar = document.createElement("section");
    statusbar.id = "characterStatusbar";
    statusbar.className = "characterStatusbar";

    statusbar.innerHTML = `
        <div class="characterStatusbar__stats">

            <div class="characterStatusbar__dropdown">
                <button
                    id="btnStatusbarAc"
                    class="characterStatusbar__button"
                    type="button"
                    aria-expanded="false"
                >
                    <span class="characterStatusbar__label">RK</span>
                    <span id="statusbarAc" class="characterStatusbar__value">–</span>
                </button>

                <div
                    id="statusbarAcPanel"
                    class="characterStatusbar__panel"
                    hidden
                >
                    <label>
                        Rüstungsklasse
                        <input
                            id="statusbarAcInput"
                            type="number"
                            min="0"
                        >
                    </label>
                </div>
            </div>

            <div class="characterStatusbar__dropdown">
                <button
                    id="btnStatusbarInitiative"
                    class="characterStatusbar__button"
                    type="button"
                    aria-expanded="false"
                >
                    <span class="characterStatusbar__label">Initiative</span>
                    <span id="statusbarInitiative" class="characterStatusbar__value">–</span>
                </button>

                <div
                    id="statusbarInitiativePanel"
                    class="characterStatusbar__panel"
                    hidden
                >
                    <label>
                        Initiative
                        <input
                            id="statusbarInitiativeInput"
                            type="number"
                        >
                    </label>
                </div>
            </div>

            <div class="characterStatusbar__dropdown">
                <button
                    id="btnStatusbarHp"
                    class="characterStatusbar__button"
                    type="button"
                    aria-expanded="false"
                >
                    <span>
                        <span class="characterStatusbar__label">TP</span>
                        <span
                            id="statusbarHp"
                            class="characterStatusbar__value"
                        >
                            –
                        </span>
                    </span>

                    <span aria-hidden="true">▾</span>
                </button>

                <div
                    id="statusbarHpPanel"
                    class="characterStatusbar__panel"
                    hidden
                >
                    <label>
                        Aktuell
                        <input
                            id="statusbarHpCurrent"
                            type="number"
                            min="0"
                        >
                    </label>

                    <label>
                        Maximum
                        <input
                            id="statusbarHpMax"
                            type="number"
                            min="0"
                        >
                    </label>

                    <label>
                        Temporär
                        <input
                            id="statusbarHpTemp"
                            type="number"
                            min="0"
                        >
                    </label>
                </div>
            </div>

            <div class="characterStatusbar__dropdown">
                <button
                    id="btnStatusbarConditions"
                    class="characterStatusbar__button"
                    type="button"
                    aria-expanded="false"
                >
                    <span>
                        <span class="characterStatusbar__label">
                            Zustände
                        </span>

                        <span
                            id="statusbarConditionsCount"
                            class="characterStatusbar__value"
                        >
                            Keine
                        </span>
                    </span>

                    <span aria-hidden="true">▾</span>
                </button>

               <div
                    id="statusbarConditionsPanel"
                    class="characterStatusbar__panel characterStatusbar__conditionsPanel"
                    hidden
                >
                    <button type="button" class="characterStatusbar__condition" data-condition="blinded">
                        Blind
                    </button>

                    <button type="button" class="characterStatusbar__condition" data-condition="charmed">
                        Bezaubert
                    </button>

                    <button type="button" class="characterStatusbar__condition" data-condition="deafened">
                        Taub
                    </button>

                    <button type="button" class="characterStatusbar__condition" data-condition="frightened">
                        Verängstigt
                    </button>

                    <button type="button" class="characterStatusbar__condition" data-condition="grappled">
                        Gepackt
                    </button>

                    <button type="button" class="characterStatusbar__condition" data-condition="incapacitated">
                        Kampfunfähig
                    </button>

                    <button type="button" class="characterStatusbar__condition" data-condition="invisible">
                        Unsichtbar
                    </button>

                    <button type="button" class="characterStatusbar__condition" data-condition="paralyzed">
                        Gelähmt
                    </button>

                    <button type="button" class="characterStatusbar__condition" data-condition="petrified">
                        Versteinert
                    </button>

                    <button type="button" class="characterStatusbar__condition" data-condition="poisoned">
                        Vergiftet
                    </button>

                    <button type="button" class="characterStatusbar__condition" data-condition="prone">
                        Liegend
                    </button>

                    <button type="button" class="characterStatusbar__condition" data-condition="restrained">
                        Festgesetzt
                    </button>

                    <button type="button" class="characterStatusbar__condition" data-condition="stunned">
                        Betäubt
                    </button>

                    <button type="button" class="characterStatusbar__condition" data-condition="unconscious">
                        Bewusstlos
                    </button>

                    <button type="button" class="characterStatusbar__condition" data-condition="exhaustion">
                        Erschöpfung
                    </button>
                </div>
            </div>

        </div>
    `;

    appbar.insertAdjacentElement("afterend", statusbar);

    bindDropdown(
        document.getElementById("btnStatusbarHp"),
        document.getElementById("statusbarHpPanel")
    );

    bindDropdown(
        document.getElementById("btnStatusbarConditions"),
        document.getElementById("statusbarConditionsPanel")
    );
    bindConditionButtons();

    bindDropdown(
        document.getElementById("btnStatusbarAc"),
        document.getElementById("statusbarAcPanel")
    );
    bindDropdown(
        document.getElementById("btnStatusbarInitiative"),
        document.getElementById("statusbarInitiativePanel")
    );
}


export async function loadCharacterStatusbar(characterId) {
    if (!characterId) return;

    try {
        const character = await API.getCharacter(characterId);

        currentStatusbarCharacter = character;

        const data = character?.data ?? {};

        const acEl = document.getElementById("statusbarAc");
        const initiativeEl =
            document.getElementById("statusbarInitiative");

        const hpCurrentInput =
            document.getElementById("statusbarHpCurrent");

        const hpMaxInput =
            document.getElementById("statusbarHpMax");

        const hpTempInput =
            document.getElementById("statusbarHpTemp");

        const acInput =
            document.getElementById("statusbarAcInput");

        const initiativeInput =
            document.getElementById("statusbarInitiativeInput");

        if (acEl) {
            acEl.textContent = data.ac ?? "–";
        }

        if (acInput) {
            acInput.value = data.ac ?? 0;
        }

        if (initiativeEl) {
            const initiative = Number(data.initiative);

            if (Number.isFinite(initiative)) {
                initiativeEl.textContent =
                    initiative > 0
                        ? `+${initiative}`
                        : String(initiative);
            } else {
                initiativeEl.textContent = "–";
            }
        }
        if (initiativeInput) {
            initiativeInput.value = data.initiative ?? 0;
        }

        const hpCurrent = data.hp_current;
        const hpMax = data.hp_max;
        const hpTemp = data.hp_temp;

        renderHp(hpCurrent, hpMax, hpTemp);

        if (hpCurrentInput) {
            hpCurrentInput.value = hpCurrent ?? 0;
        }

        if (hpMaxInput) {
            hpMaxInput.value = hpMax ?? 0;
        }

        if (hpTempInput) {
            hpTempInput.value = hpTemp ?? 0;
        }
        const conditions = Array.isArray(data.conditions)
            ? data.conditions
            : [];

        const conditionButtons =
            document.querySelectorAll(
                ".characterStatusbar__condition"
            );

        for (const button of conditionButtons) {
            button.classList.toggle(
                "is-active",
                conditions.includes(button.dataset.condition)
            );
        }

        renderConditionsState();

        bindHpInputs();
        bindAcInput();
        bindInitiativeInput();

    } catch (error) {
        console.error(
            "[character_statusbar] Charakter konnte nicht geladen werden",
            error
        );
    }
}


function bindDropdown(button, panel) {
    if (!button || !panel) return;

    button.addEventListener("click", () => {
        const isOpen =
            button.getAttribute("aria-expanded") === "true";

        button.setAttribute(
            "aria-expanded",
            isOpen ? "false" : "true"
        );

        panel.hidden = isOpen;
    });
}

function bindConditionButtons() {
    const buttons = document.querySelectorAll(
        ".characterStatusbar__condition"
    );

    for (const button of buttons) {
        if (button.dataset.bound === "1") continue;

        button.dataset.bound = "1";

        button.addEventListener("click", async () => {
            button.classList.toggle("is-active");
            renderConditionsState();

            await saveConditions();
        });
    }
}

function renderConditionsState() {
    const conditionButtons = document.querySelectorAll(
        ".characterStatusbar__condition"
    );

    const activeConditions = Array.from(
        conditionButtons
    ).filter((button) =>
        button.classList.contains("is-active")
    );

    const conditionsButton =
        document.getElementById("btnStatusbarConditions");

    const conditionsCount =
        document.getElementById("statusbarConditionsCount");

    const hasConditions = activeConditions.length > 0;

    conditionsButton?.classList.toggle(
        "has-active-condition",
        hasConditions
    );

    if (conditionsCount) {
        conditionsCount.textContent =
            hasConditions
                ? `${activeConditions.length} aktiv`
                : "Keine";
    }
}
async function saveConditions() {
    if (!currentStatusbarCharacter) return;

    const activeConditions = Array.from(
        document.querySelectorAll(
            ".characterStatusbar__condition.is-active"
        )
    ).map((button) => button.dataset.condition);

    try {
        const latestCharacter =
            await API.getCharacter(
                currentStatusbarCharacter.id
            );

        const newData = {
            ...(latestCharacter.data ?? {}),
            conditions: activeConditions,
        };

        const updatedCharacter =
            await API.patchCharacter(
                latestCharacter.id,
                {
                    data: newData,
                    updated_at: latestCharacter.updated_at,
                }
            );

        currentStatusbarCharacter = updatedCharacter;

        window.dispatchEvent(
            new CustomEvent("character:updated", {
                detail: {
                    character: updatedCharacter,
                },
            })
        );

    } catch (error) {
        console.error(
            "[character_statusbar] Zustände konnten nicht gespeichert werden",
            error
        );
    }
}


function bindHpInputs() {
    const hpCurrentInput =
        document.getElementById("statusbarHpCurrent");

    const hpMaxInput =
        document.getElementById("statusbarHpMax");

    const hpTempInput =
        document.getElementById("statusbarHpTemp");

    if (
        !hpCurrentInput ||
        !hpMaxInput ||
        !hpTempInput
    ) {
        return;
    }

    // Keine Listener doppelt setzen
    if (hpCurrentInput.dataset.bound === "1") {
        return;
    }

    hpCurrentInput.dataset.bound = "1";
    hpMaxInput.dataset.bound = "1";
    hpTempInput.dataset.bound = "1";

    hpCurrentInput.addEventListener("input", updateHpPreview);
    hpMaxInput.addEventListener("input", updateHpPreview);
    hpTempInput.addEventListener("input", updateHpPreview);
    hpCurrentInput.addEventListener("change", saveHp);
    hpMaxInput.addEventListener("change", saveHp);
    hpTempInput.addEventListener("change", saveHp);
}

async function saveAc() {
    if (!currentStatusbarCharacter) return;

    const acInput =
        document.getElementById("statusbarAcInput");

    const acEl =
        document.getElementById("statusbarAc");

    if (!acInput) return;

    let ac = Number(acInput.value) || 0;

    ac = Math.max(0, ac);

    acInput.value = ac;

    if (acEl) {
        acEl.textContent = ac;
    }

    try {
        const latestCharacter =
            await API.getCharacter(currentStatusbarCharacter.id);

        const newData = {
            ...(latestCharacter.data ?? {}),
            ac: ac,
        };

        const updatedCharacter =
            await API.patchCharacter(
                latestCharacter.id,
                {
                    data: newData,
                    updated_at: latestCharacter.updated_at,
                }
            );

        currentStatusbarCharacter =
            updatedCharacter;
        window.dispatchEvent(
            new CustomEvent("character:updated", {
                detail: {
                    character: updatedCharacter,
                },
            })
        );
    } catch (error) {
        console.error(
            "[character_statusbar] RK konnte nicht gespeichert werden",
            error
        );
    }
}


async function saveHp() {
    if (!currentStatusbarCharacter) return;

    const hpCurrentInput =
        document.getElementById("statusbarHpCurrent");

    const hpMaxInput =
        document.getElementById("statusbarHpMax");

    const hpTempInput =
        document.getElementById("statusbarHpTemp");

    if (
        !hpCurrentInput ||
        !hpMaxInput ||
        !hpTempInput
    ) {
        return;
    }

    let hpCurrent =
        Number(hpCurrentInput.value) || 0;

    let hpMax =
        Number(hpMaxInput.value) || 0;

    let hpTemp =
        Number(hpTempInput.value) || 0;

    hpMax = Math.max(0, hpMax);
    hpTemp = Math.max(0, hpTemp);

    hpCurrent = Math.max(
        0,
        Math.min(hpCurrent, hpMax)
    );

    hpCurrentInput.value = hpCurrent;
    hpMaxInput.value = hpMax;
    hpTempInput.value = hpTemp;

    renderHp(hpCurrent, hpMax, hpTemp);

    try {
        const latestCharacter =
            await API.getCharacter(
                currentStatusbarCharacter.id
            );

        const newData = {
            ...(latestCharacter.data ?? {}),
            hp_current: hpCurrent,
            hp_max: hpMax,
            hp_temp: hpTemp,
        };

        const updatedCharacter =
            await API.patchCharacter(
                latestCharacter.id,
                {
                    data: newData,
                    updated_at:
                        latestCharacter.updated_at,
                }
            );

        currentStatusbarCharacter =
            updatedCharacter;

        window.dispatchEvent(
            new CustomEvent("character:updated", {
                detail: {
                    character: updatedCharacter,
                },
            })
        );

    } catch (error) {
        console.error(
            "[character_statusbar] TP konnten nicht gespeichert werden",
            error
        );
    }
}

function updateHpPreview() {
    const hpCurrentInput =
        document.getElementById("statusbarHpCurrent");

    const hpMaxInput =
        document.getElementById("statusbarHpMax");

    const hpTempInput =
        document.getElementById("statusbarHpTemp");

    if (!hpCurrentInput || !hpMaxInput || !hpTempInput) {
        return;
    }

    const hpCurrent = Number(hpCurrentInput.value) || 0;
    const hpMax = Number(hpMaxInput.value) || 0;
    const hpTemp = Number(hpTempInput.value) || 0;

    renderHp(hpCurrent, hpMax, hpTemp);
}

function renderHp(hpCurrent, hpMax, hpTemp) {
    const hpEl =
        document.getElementById("statusbarHp");

    if (!hpEl) return;

    hpEl.textContent =
        `${hpCurrent ?? 0} / ${hpMax ?? 0}`;

    if (Number(hpTemp) > 0) {
        hpEl.textContent += ` (+${hpTemp})`;
    }
}


function bindInitiativeInput() {
    const initiativeInput =
        document.getElementById("statusbarInitiativeInput");

    if (!initiativeInput) return;

    if (initiativeInput.dataset.bound === "1") {
        return;
    }

    initiativeInput.dataset.bound = "1";

    initiativeInput.addEventListener(
        "change",
        saveInitiative
    );
}


async function saveInitiative() {
    if (!currentStatusbarCharacter) return;

    const initiativeInput =
        document.getElementById("statusbarInitiativeInput");

    const initiativeEl =
        document.getElementById("statusbarInitiative");

    if (!initiativeInput) return;

    const initiative =
        Number(initiativeInput.value) || 0;

    if (initiativeEl) {
        initiativeEl.textContent =
            initiative > 0
                ? `+${initiative}`
                : String(initiative);
    }

    try {
        const latestCharacter =
            await API.getCharacter(
                currentStatusbarCharacter.id
            );

        const newData = {
            ...(latestCharacter.data ?? {}),
            initiative: initiative,
        };

        const updatedCharacter =
            await API.patchCharacter(
                latestCharacter.id,
                {
                    data: newData,
                    updated_at:
                        latestCharacter.updated_at,
                }
            );

        currentStatusbarCharacter =
            updatedCharacter;

        window.dispatchEvent(
            new CustomEvent("character:updated", {
                detail: {
                    character: updatedCharacter,
                },
            })
        );

    } catch (error) {
        console.error(
            "[character_statusbar] Initiative konnte nicht gespeichert werden",
            error
        );
    }
}
function bindAcInput() {
    const acInput =
        document.getElementById("statusbarAcInput");

    if (!acInput) return;

    if (acInput.dataset.bound === "1") {
        return;
    }

    acInput.dataset.bound = "1";

    acInput.addEventListener("change", saveAc);
}



