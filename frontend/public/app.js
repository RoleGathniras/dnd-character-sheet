(function () {
  const drawer = document.getElementById("drawer");
  const backdrop = document.getElementById("backdrop");
  const btnMenu = document.getElementById("btnMenu");
  const btnClose = document.getElementById("btnCloseDrawer");

  const statusEl = document.getElementById("appStatus");
  const btnLoad = document.getElementById("btnLoad");
  const btnSave = document.getElementById("btnSave");

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

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

  btnMenu?.addEventListener("click", openDrawer);
  btnClose?.addEventListener("click", closeDrawer);
  backdrop?.addEventListener("click", closeDrawer);

  // MVP: Buttons noch ohne Backend-Logik, nur UX-Feedback
  btnLoad?.addEventListener("click", () => setStatus("Laden: kommt in Meilenstein 4.2"));
  btnSave?.addEventListener("click", () => setStatus("Speichern: kommt in Meilenstein 4.3"));

  setStatus("UI bereit ✅ (Meilenstein 4.0)");
})();
