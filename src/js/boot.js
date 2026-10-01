/* ==========================================================================
   Seidla — Start
   Name und Runde wiederherstellen, Netzwerk aufbauen, Ausgangskorb nachreichen.

   Wichtig für länger offline: Der Abend wird aus dem signierten Speicher
   wiederhergestellt, auch wenn er Tage alt ist. Wer als Gast dabei war,
   findet über den gespeicherten Code von selbst zurück — und der Wirt
   öffnet seine Runde mit demselben Code wieder, damit alle wieder reinfinden.
   ========================================================================== */
(function () {
  "use strict";
  const SS = window.SS;

  const SESSION_KEYS = ["players", "assignments", "sidequests", "proposals", "ring",
    "settings", "groupName", "seed", "reviews", "endedAt"];

  function restore() {
    if (!SS.store) return false;
    const prof = SS.store.loadProfile();
    const group = SS.store.loadGroup();

    if (group && group.name) SS.state.groupName = group.name;
    if (group && group.code) SS.state.code = group.code;

    // Laufenden Abend wieder aufnehmen — Aufgaben, Nachweise und Wertung
    // stehen noch da, egal wie lange die Pause war.
    const sess = SS.store.loadSession();
    if (sess && (sess.phase === "running" || sess.phase === "review" || sess.phase === "over")) {
      SESSION_KEYS.forEach((k) => { if (sess[k] !== undefined) SS.state[k] = sess[k]; });
      SS.state.phase = sess.phase;
      SS.state.code = sess.groupCode || SS.state.code;
      if (sess.mode === "online" && sess.role === "guest") {
        SS.state.mode = "online"; SS.state.role = "guest";
        SS.state.connection = "lost";
      } else if (sess.mode === "online" && sess.role === "host") {
        SS.state.mode = "online"; SS.state.role = "host";
        SS.state.me = "host"; SS.state.hostId = "host";
        SS.state.connection = "offline";
      } else {
        SS.state.mode = "local"; SS.state.role = "solo";
      }
      SS.state.pending = SS.store.outboxCount() > 0;
      SS.state.route = sess.phase === "review" ? "review" : sess.phase === "over" ? "end" : "tasks";
      SS.logLine("Letzter Abend wiederhergestellt (" + new Date(sess.at || Date.now()).toLocaleString("de-DE") + ").", "ok");
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
    // Der Wirt: Runde wieder aufmachen, damit alle mit demselben Code
    // zurückfinden können.
    if (group && group.role === "host" && group.code) {
      SS.state.mode = "online";
      SS.state.role = "host";
      SS.state.connection = "offline";
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

    // Beitrittslink (#join=CODE) hat Vorrang.
    const fromLink = SS.ui.checkJoinLink && SS.ui.checkJoinLink();

    // Netzwerk im Hintergrund prüfen (nicht blockierend).
    SS.net.init().then((ok) => {
      if (!ok) SS.logLine("Kein Verbindungsdienst — der Abend läuft am Gerät.", "");
      if (!ok && SS.state.connection === "offline") SS.net.setStatus("offline");
    });

    // Nachreichen, sobald wieder Kontakt besteht.
    SS.on("net", () => { if (SS.state.role === "guest") SS.net.flushOutbox(); });
    window.addEventListener("online", () => {
      if (SS.state.role === "guest") SS.net.flushOutbox();
      if (SS.state.role === "host" && SS.state.code) SS.net.reopen();
    });

    if (fromLink) return;

    if (SS.state.mode === "online" && SS.state.role === "guest" && SS.state.code) {
      // Gast: zurück in die Runde.
      const prof = SS.store.loadProfile();
      SS.net.rejoin(SS.state.code, prof.name).then((ok) => {
        if (!ok) {
          SS.ui.go(SS.state.phase === "lobby" ? "lobby" : "tasks");
          return;
        }
        SS.net.flushOutbox();
        SS.ui.go(SS.state.phase === "review" ? "review" : SS.state.phase === "over" ? "end" : SS.state.phase === "running" ? "tasks" : "lobby");
      });
    } else if (SS.state.mode === "online" && SS.state.role === "host" && SS.state.code) {
      // Wirt: Runde mit demselben Code wieder aufmachen.
      SS.net.reopen();
      SS.ui.go(SS.state.phase === "review" ? "review" : SS.state.phase === "over" ? "end" : SS.state.phase === "running" ? "tasks" : "lobby");
    } else if (SS.state.route === "home" && SS.state.mode === "local" && SS.store.loadGroup()) {
      SS.ui.go(SS.state.phase === "running" || SS.state.phase === "review" || SS.state.phase === "over"
        ? (SS.state.phase === "over" ? "end" : SS.state.phase === "review" ? "review" : "tasks") : "lobby");
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
