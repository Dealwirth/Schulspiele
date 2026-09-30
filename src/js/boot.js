/* ==========================================================================
   Seidla — Start
   Liest einen Rundencode aus der Adresse, stellt die letzte Runde wieder her
   und prüft den Verbindungsdienst. Fällt das Netz aus, läuft der Abend
   trotzdem weiter — der Ausgangskorb holt das Versäumte später nach.
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

    // Steht noch eine Runde im Gerät? Dann Namen und Punktestand übernehmen,
    // damit der Abend dort weitermacht, wo er aufgehört hat.
    if (SS.store) {
      const sess = SS.store.loadSession();
      const grp = SS.store.loadGroup();
      if (grp && grp.members && grp.members.length) {
        SS.state.code = SS.state.code || grp.code;
        SS.state.players = grp.members.map((m, i) => ({
          id: m.id, name: m.name, color: m.color || SS.colorFor(i),
          connected: false, isHost: !!m.isHost, index: i,
        }));
      }
      if (sess && sess.phase === "playing") SS.state.lastSession = sess;
      SS.state.pending = SS.store.outboxCount() > 0;
    }

    SS.net.init().then((ok) => {
      if (!ok) {
        const badge = SS.$("#netBadge");
        if (badge) { badge.className = "net-badge warn"; badge.textContent = "Läuft am Gerät"; }
        console.info("Seidla: Rundenservice derzeit nicht erreichbar — es läuft am selben Gerät weiter.");
      }
    });

    // Beharrlich nachschauen, ob im Ausgangskorb was liegt.
    setInterval(() => {
      if (SS.state.role === "guest" && SS.state.connection === "online") SS.net.flushOutbox();
    }, 15000);

    // Gast ohne Verbindung: behutsam versuchen, wieder in die Runde zu kommen.
    setInterval(() => {
      if (SS.state.role !== "guest" || SS.state.connection === "online" || SS.state.connection === "connecting") return;
      if (!SS.state.code || !SS.state.me) return;
      const me = SS.player(SS.state.me);
      if (SS.net.rejoin) SS.net.rejoin(SS.state.code, (me && me.name) || "Gast");
    }, 25000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
