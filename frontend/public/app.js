(function () {
  // ===== Elements =====
  const drawer = document.getElementById("drawer");
  const backdrop = document.getElementById("backdrop");
  const btnMenu = document.getElementById("btnMenu");
  const btnClose = document.getElementById("btnCloseDrawer");

  const statusEl = document.getElementById("appStatus");
  const btnLoad = document.getElementById("btnLoad");
  const btnSave = document.getElementById("btnSave");

  const btnLogin = document.getElementById("btnLogin");
  const btnLogout = document.getElementById("btnLogout");

  const listMine = document.getElementById("listMine");
  const listNpcs = document.getElementById("listNpcs");
  const characterSelect = document.getElementById("characterSelect");

  // ===== State =====
  let currentCharacterId = null;

  // ===== Helpers =====
  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function openDrawer() {
    drawer?.classList.add("is-open");
    drawer?.setAttribute("aria-hidden", "false");
    if (backdrop) backdrop.hidden = false;
  }

  function closeDrawer() {
    drawer?.classList.remove("is-open");
    drawer?.setAttribute("aria-hidden", "true");
    if (backdrop) backdrop.hidden = true;
  }

  function setLoggedInUI(isLoggedIn) {
    btnLogin.style.display = isLoggedIn ? "none" : "inline-block";
    btnLogout.style.display = isLoggedIn ? "inline-block" : "none";

    // Buttons erst sinnvoll, wenn ein Character gewählt ist
    btnLoad.disabled = !isLoggedIn || !currentCharacterId;
    btnSave.disabled = true; // Save kommt in 4.3
  }

  function setCurrentCharacter(id) {
    currentCharacterId = id ? Number(id) : null;
    if (characterSelect) {
      characterSelect.value = currentCharacterId ? String(currentCharacterId) : "";
    }
    btnLoad.disabled = !currentCharacterId;
    btnSave.disabled = true;
  }

  // ===== Data =====
  async function loadCharacters() {
    if (!listMine || !listNpcs) return;

    listMine.innerHTML = "";
    listNpcs.innerHTML = "";

    if (characterSelect) {
      characterSelect.innerHTML = "";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "(Charakter wählen)";
      characterSelect.appendChild(placeholder);
    }

    const chars = await API.characters();

    for (const c of chars) {
      // Drawer Button
      const b = document.createElement("button");
      b.className = "drawer__item";
      b.textContent = `${c.name} (${c.kind})`;

      b.addEventListener("click", async () => {
        setCurrentCharacter(c.id);
        closeDrawer();
        await loadCharacter(c.id);
      });

      if (c.kind === "npc") listNpcs.appendChild(b);
      else listMine.appendChild(b);

      // Dropdown Option (Fallback)
      if (characterSelect) {
        const opt = document.createElement("option");
        opt.value = String(c.id);
        opt.textContent = `${c.name} (${c.kind})`;
        characterSelect.appendChild(opt);
      }
    }

    // Auto-select first character if none selected
    if (!currentCharacterId && chars.length > 0) {
      setCurrentCharacter(chars[0].id);
      setStatus(`Charaktere geladen: ${chars.length} (1 ausgewählt)`);
      btnLoad.disabled = false;
    } else {
      setStatus(`Charaktere geladen: ${chars.length}`);
    }
  }

  async function loadCharacter(id) {
    const cid = Number(id);
    if (!cid) {
      setStatus("Kein Charakter ausgewählt.");
      return;
    }

    try {
      setStatus("Lade Charakter…");
      const c = await API.getCharacter(cid);

      // Für Meilenstein 4.3: hier rufen wir später jsonToSheet(c.data) auf
      // Aktuell nur Status/Debug:
      setStatus(`Geladen: ${c.name} (${c.kind})`);
      btnSave.disabled = true; // Save kommt in 4.3
    } catch (e) {
      console.error(e);
      setStatus("Fehler beim Laden des Charakters ❌");
      alert("Fehler beim Laden des Charakters.");
    }
  }

  // ===== Auth =====
  async function doLogin() {
    const username = prompt("Username");
    const password = prompt("Passwort");
    if (!username || !password) return;

    try {
      await API.login(username, password);
      setLoggedInUI(true);
      setStatus("Eingeloggt ✅");

      await loadCharacters();

      // Optional: direkt den ausgewählten Charakter laden
      if (currentCharacterId) {
        await loadCharacter(currentCharacterId);
      }
    } catch (e) {
      console.error(e);
      alert("Login fehlgeschlagen");
      setStatus("Login fehlgeschlagen ❌");
    }
  }

  function doLogout() {
    API.token = null;
    location.reload();
  }

  // ===== Events =====
  btnMenu?.addEventListener("click", openDrawer);
  btnClose?.addEventListener("click", closeDrawer);
  backdrop?.addEventListener("click", closeDrawer);

  btnLogin?.addEventListener("click", doLogin);
  btnLogout?.addEventListener("click", doLogout);

  characterSelect?.addEventListener("change", async () => {
    const id = characterSelect.value;
    setCurrentCharacter(id);
    if (currentCharacterId) await loadCharacter(currentCharacterId);
  });

  btnLoad?.addEventListener("click", async () => {
    if (!currentCharacterId) return;
    await loadCharacter(currentCharacterId);
  });

  // Save kommt in 4.3
  btnSave?.addEventListener("click", () => setStatus("Speichern: kommt in Meilenstein 4.3"));

  // ===== Startup =====
  // Auto-resume: wenn Token existiert, versuchen wir Characters zu laden
  if (window.API && API.token) {
    setLoggedInUI(true);
    loadCharacters()
      .then(async () => {
        if (currentCharacterId) await loadCharacter(currentCharacterId);
      })
      .catch(() => {
        API.token = null;
        setLoggedInUI(false);
        setStatus("Token ungültig – bitte neu einloggen");
      });
  } else {
    setLoggedInUI(false);
    setStatus("UI bereit ✅ (Meilenstein 4.2)");
  }
})();
