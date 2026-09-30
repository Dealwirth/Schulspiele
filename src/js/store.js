/* ==========================================================================
   Seidla — Gedächtnis
   Die Wirtshausrunde bleibt am Gerät: Gruppe, laufende Partie, Punktestand
   und die Chronik liegen im localStorage. Fällt das Netz aus, wird weiter
   gespielt; jeder abgeschlossene Durchgang wandert in den Ausgangskorb und
   geht später raus, sobald wieder Empfang ist.
   ========================================================================== */
(function () {
  "use strict";
  const SS = window.SS;

  const NS = "seidla:";
  const V = 2; // Format-Version; bei Änderungen alte Stände verwerfen

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(NS + key);
      if (raw === null) return fallback;
      const obj = JSON.parse(raw);
      if (obj && obj.__v !== undefined && obj.__v !== V) return fallback;
      return obj && obj.d !== undefined ? obj.d : fallback;
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(NS + key, JSON.stringify({ __v: V, d: value })); return true; }
    catch (e) { return false; }
  }
  function drop(key) {
    try { localStorage.removeItem(NS + key); } catch (e) {}
  }
  function available() {
    try {
      const k = NS + "__probe";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  }

  const uid = (n) => SS.uid(n || 10);
  const now = () => Date.now();

  /* ── Profil (Name, Farbe, Strafen-Modus) ──────────────────────────────── */
  const DEFAULT_PROFILE = { name: "", color: null, penalty: "flüssig", seen: false };

  function loadProfile() {
    return Object.assign({}, DEFAULT_PROFILE, read("profile", {}));
  }
  function saveProfile(patch) {
    const p = Object.assign(loadProfile(), patch || {});
    write("profile", p);
    return p;
  }

  /* ── Gruppe ───────────────────────────────────────────────────────────── */
  /**
   * Eine Gruppe ist mehr als eine Verbindung: sie hält den Namen der Runde,
   * die Mitgliederliste und den Code, damit sie nach einem Neustart oder
   * einer Nacht ohne Netz wieder auftaucht.
   */
  function saveGroup(g) {
    if (!g || !g.code) return null;
    const cur = loadGroup();
    const merged = Object.assign({}, cur || {}, g, {
      members: g.members || (cur ? cur.members : []),
      createdAt: (cur && cur.createdAt) || g.createdAt || now(),
      updatedAt: now(),
    });
    write("group", merged);
    return merged;
  }
  function loadGroup() {
    const g = read("group", null);
    if (!g || !g.code) return null;
    return g;
  }
  function touchMembers(players, opts) {
    opts = opts || {};
    const g = loadGroup();
    if (!g) return null;
    const members = (players || []).filter((p) => p.connected !== false).map((p) => {
      const old = (g.members || []).find((m) => m.id === p.id);
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        isHost: !!p.isHost,
        firstSeen: (old && old.firstSeen) || now(),
        lastSeen: now(),
        visits: ((old && old.visits) || 0) + (old ? 0 : 1),
      };
    });
    return saveGroup(Object.assign({}, g, { members: members, name: opts.name || g.name }));
  }
  function clearGroup() { drop("group"); }

  /* ── Laufende Partie ──────────────────────────────────────────────────── */
  /** Alles, was nötig ist, um nach einem Absturz oder Neustart weiterzumachen. */
  function snapshot(state) {
    return {
      groupCode: state.code || null,
      groupName: (loadGroup() || {}).name || null,
      mode: state.mode,
      role: state.role,
      gameId: state.gameId,
      settings: state.settings,
      phase: state.phase,
      round: state.round,
      players: state.players,
      scores: state.scores,
      pub: state.pub,
      at: now(),
      seq: state.syncSeq || 0,
    };
  }
  function saveSession(state) {
    if (!state || (!state.gameId && !state.code)) return;
    if (state.phase !== "playing" && state.phase !== "over") return;
    write("session", snapshot(state));
  }
  function loadSession() { return read("session", null); }
  function clearSession() { drop("session"); }

  /* ── Ausgangskorb ─────────────────────────────────────────────────────── */
  /**
   * Jede abgeschlossene Sache (Runde, Spielende, Beitritt) wird hier abgelegt,
   * solange kein Kontakt zum Host besteht. Beim nächsten Kontakt geht der
   * ganze Korb in einem Zug raus — nichts geht verloren.
   */
  function outbox() { return read("outbox", []); }
  function queue(evt) {
    const list = outbox();
    const entry = Object.assign({ id: uid(12), at: now() }, evt);
    list.push(entry);
    if (list.length > 400) list.splice(0, list.length - 400);
    write("outbox", list);
    SS.emit("outbox");
    return entry;
  }
  function clearOutbox(ids) {
    if (!ids || !ids.length) { write("outbox", []); }
    else {
      const kill = {}; ids.forEach((i) => (kill[i] = true));
      write("outbox", outbox().filter((e) => !kill[e.id]));
    }
    SS.emit("outbox");
  }
  function outboxCount() { return outbox().length; }

  /* ── Wirtshaus-Chronik ────────────────────────────────────────────────── */
  /** Was im Wirtshaus halt so passiert — bleibt für immer im Buch stehen. */
  function chronicle() { return read("chronicle", []); }
  function addChronicle(entry) {
    const list = chronicle();
    list.unshift(Object.assign({ id: uid(10), at: now() }, entry));
    if (list.length > 500) list.length = 500;
    write("chronicle", list);
    SS.emit("chronicle");
    return list[0];
  }
  function chronicleFor(groupCode) {
    return chronicle().filter((e) => !groupCode || !e.groupCode || e.groupCode === groupCode);
  }
  function clearChronicle() { write("chronicle", []); SS.emit("chronicle"); }

  /** Verdichtete Auswertung: wer war wie oft dabei, wer hat am meisten Punkte. */
  function tally() {
    const list = chronicle();
    const byName = {};
    list.forEach((e) => {
      if (!e.who || e.group) return; // nur Einzelpersonen, keine Gruppenzeilen
      const k = e.who;
      const t = (byName[k] = byName[k] || { name: k, rounds: 0, wins: 0, points: 0, drinks: 0 });
      if (e.type === "runde") t.rounds++;
      if (e.type === "sieg") t.wins++;
      if (e.type === "schluck") t.drinks++;
      t.points += e.points || 0;
    });
    return Object.keys(byName).map((k) => byName[k]).sort((a, b) => b.points - a.points || b.wins - a.wins);
  }

  /* ── Aufräumen ────────────────────────────────────────────────────────── */
  function wipe() {
    ["group", "session", "outbox", "chronicle", "profile"].forEach(drop);
    SS.emit("outbox"); SS.emit("chronicle");
  }

  /** Wie viel Platz brauchen wir? (localStorage fasst meist ~5 MB) */
  function usage() {
    let bytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf(NS) === 0) bytes += k.length + (localStorage.getItem(k) || "").length;
      }
    } catch (e) {}
    return { bytes, kb: Math.round(bytes / 1024), ok: available() };
  }

  SS.store = {
    available, read, write, drop,
    loadProfile, saveProfile,
    saveGroup, loadGroup, touchMembers, clearGroup,
    snapshot, saveSession, loadSession, clearSession,
    outbox, queue, clearOutbox, outboxCount,
    chronicle, addChronicle, chronicleFor, clearChronicle, tally,
    wipe, usage,
  };
})();
