/* ==========================================================================
   Seidla — Start
   Name und Runde wiederherstellen, Netzwerk aufbauen, Ausgangskorb nachreichen.
   ========================================================================== */
(function () {
  "use strict";
  const SS = window.SS;

  function restore() {
    if (!SS.store) return;
    const prof = SS.store.loadProfile();
    const group = SS.store.loadGroup();

    if (group && group.name) SS.state.groupName = group.name;
    if (group && group.code) SS.state.code = group.code;

    // Laufenden Abend wieder aufnehmen — Aufgaben und Nachweise stehen noch da.
    const sess = SS.store.loadSession();
    if (sess && (sess.phase === "running" || sess.phase === "over")) {
      ["players", "assignments", "sidequests", "proposals", "ring", "settings", "groupName", "seed"].forEach((k) => {
        if (sess[k] !== undefined) SS.state[k] = sess[k];
      });
      SS.state.phase = sess.phase;
      SS.state.code = sess.groupCode || SS.state.code;
      if (sess.mode === "online" && sess.role === "guest") {
        SS.state.mode = "online"; SS.state.role = "guest";
        SS.state.connection = "lost";
      } else {
        SS.state.mode = "local"; SS.state.role = "solo";
      }
      SS.state.pending = SS.store.outboxCount() > 0;
      SS.state.route = SS.state.phase === "over" ? "album" : "tasks";
      SS.logLine("Letzter Abend wiederhergestellt.", "ok");
      return true;
    }

    // Auch ohne laufenden Abend: Wer als Gast dabei war, soll wieder
    // hineinfinden. Die Runde steht ja noch im Speicher.
    if (group && group.role === "guest" && group.code) {
      SS.state.mode = "online";
      SS.state.role = "guest";
      SS.state.connection = "lost";
      SS.state.pending = SS.store.outboxCount() > 0;
      return true;
    }
    if (prof.name) SS.state.route = "home";
    return false;
  }

  function boot() {
    SS.ui.initUI();
    restore();
    SS.renderCurrent();

    // Netzwerk im Hintergrund prüfen (nicht blockierend).
    SS.net.init().then((ok) => {
      if (!ok) SS.logLine("Kein Verbindungsdienst — es läuft alles am Gerät.", "");
      SS.net.setStatus(SS.state.connection === "online" ? "online" : "offline");
    });

    // Nachreichen, sobald wieder Kontakt besteht.
    SS.on("net", () => { if (SS.state.role === "guest") SS.net.flushOutbox(); });
    window.addEventListener("online", () => { if (SS.state.role === "guest") SS.net.flushOutbox(); });

    // Wiedereintritt nach einem Abbruch: Code steht noch, Name steht noch.
    if (SS.state.mode === "online" && SS.state.role === "guest" && SS.state.code) {
      const prof = SS.store.loadProfile();
      SS.net.rejoin(SS.state.code, prof.name).then((ok) => {
        if (!ok) return;
        SS.net.flushOutbox();
        // Nach dem Wiedereintritt dorthin, wo der Abend gerade steht.
        SS.ui.go(SS.state.phase === "running" || SS.state.phase === "over" ? "tasks" : "lobby");
      });
    } else if (SS.state.route === "home" && SS.state.mode === "local" && SS.store.loadGroup()) {
      // Wer schon einmal dabei war, landet direkt in seiner Runde.
      SS.ui.go(SS.state.phase === "running" || SS.state.phase === "over" ? "tasks" : "lobby");
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
