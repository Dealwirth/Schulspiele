/* ==========================================================================
   Schulspiele — Start
   Liest einen Gruppencode aus der Adresse, startet die Oberfläche und prüft
   einmalig, ob der Verbindungsdienst erreichbar ist.
   ========================================================================== */
(function () {
  "use strict";
  const SS = window.SS;

  function param(name) {
    try { return new URLSearchParams(location.search).get(name); } catch (e) { return null; }
  }

  function start() {
    SS.ui.initUI();

    const code = (param("code") || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const direct = param("join");
    if (code.length === 4 || direct) {
      const c = code.length === 4 ? code : String(direct).toUpperCase().replace(/[^A-Z0-9]/g, "");
      setTimeout(() => SS.ui.openJoinDialog ? SS.ui.openJoinDialog(c) : null, 250);
    }

    // Verbindungsdienst einmalig prüfen und den Status im Kopf anzeigen.
    SS.net.init().then((ok) => {
      if (!ok) {
        const badge = SS.$("#netBadge");
        if (badge) { badge.className = "net-badge warn"; badge.textContent = "Nur lokal"; }
        console.info("Schulspiele: Gruppen sind derzeit nicht verfügbar — «Am selben Gerät» funktioniert weiterhin.");
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
