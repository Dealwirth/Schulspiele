/* ==========================================================================
   Seidla — Netzwerkschicht
   Der Host öffnet eine "Runde", alle anderen treten mit dem 4-Zeichen-Code bei.
   Transport ist WebRTC (PeerJS) — Geräteübergreifend (iPhone, iPad, Android,
   Laptop). Für den Verbindungsaufbau wird der öffentliche PeerJS-Broker
   genutzt, danach läuft der Datenverkehr direkt.

   Reißt die Verbindung ab, wird trotzdem weitergespielt: Der Ausgangskorb
   sammelt alles, was passiert ist, und schickt es beim nächsten Kontakt in
   einem Zug nach. Nichts geht verloren.
   ========================================================================== */
(function () {
  "use strict";
  const SS = window.SS;

  const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ohne I/O/0/1
  const CODE_LEN = 4;
  const PREFIX = "seidla-";
  const BROKER = { host: "0.peerjs.com", port: 443, path: "/", secure: true, key: "peerjs" };

  function newCode() {
    let s = "";
    for (let i = 0; i < CODE_LEN; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    return s;
  }
  const peerIdFor = (code) => PREFIX + String(code).toUpperCase();

  let peer = null;
  let conns = [];        // Host: Verbindungen zu Gästen
  let hostConn = null;   // Gast: Verbindung zum Host
  let libChecked = false;
  let libOk = false;

  /* ── Statusanzeige im Kopf ────────────────────────────────────────────── */
  function setStatus(kind, label) {
    SS.state.connection = kind;
    const badge = SS.$("#netBadge");
    if (!badge) return;
    badge.className = "net-badge " + (kind === "online" ? "online" : kind === "connecting" ? "warn" : kind === "lost" ? "bad" : "");
    badge.textContent = label || { offline: "Lokal", connecting: "Verbinde …", online: "Verbunden", lost: "Verbindung weg" }[kind];
  }

  function ensureLib() {
    if (libChecked) return libOk;
    libChecked = true;
    libOk = typeof window.Peer === "function";
    return libOk;
  }

  /* ── Gast → Host ──────────────────────────────────────────────────────── */
  function sendToHost(msg) {
    if (hostConn && hostConn.open) {
      try { hostConn.send(msg); return true; } catch (e) { return false; }
    }
    return false;
  }

  /* ── Host → alle Gäste ────────────────────────────────────────────────── */
  function sendConn(conn, msg) {
    if (conn && conn.open) { try { conn.send(msg); return true; } catch (e) { return false; } }
    return false;
  }
  function broadcast(msg, exceptPid) {
    conns.forEach((c) => { if (c.open && c.pid !== exceptPid) sendConn(c, msg); });
  }
  function sendTo(pid, msg) {
    const c = conns.find((x) => x.pid === pid);
    if (c) sendConn(c, msg);
  }

  /* ── Zustandsverteilung ───────────────────────────────────────────────── */
  function wireSnapshot() {
    return {
      players: SS.state.players,
      hostId: SS.state.hostId,
      gameId: SS.state.gameId,
      settings: SS.state.settings,
      phase: SS.state.phase,
      round: SS.state.round,
      turn: SS.state.turn,
      scores: SS.state.scores,
      pub: SS.state.pub,
      priv: SS.state.priv,
      lastResult: SS.state.lastResult,
      syncSeed: SS.state.syncSeed,
      syncSeq: SS.state.syncSeq,
    };
  }
  function publicSnapshot() {
    // ohne priv: einzelne Gäste erhalten ihren geheimen Teil separat
    const s = wireSnapshot();
    s.priv = {};
    return s;
  }
  function broadcastState() {
    if (SS.state.role !== "host" || !conns.length) return false;
    broadcast({ t: "state", s: publicSnapshot() });
    conns.forEach((c) => {
      if (c.pid && SS.state.priv && c.pid in SS.state.priv) sendConn(c, { t: "priv", priv: SS.state.priv[c.pid] });
    });
    return true;
  }

  /* ── Verbindungen einrichten ──────────────────────────────────────────── */
  function attachConn(conn, opts) {
    conn.on("data", (msg) => onData(conn, msg));
    conn.on("close", () => onClose(conn));
    conn.on("error", (err) => { console.warn("Verbindungsfehler", err); });
    if (opts && opts.pid) conn.pid = opts.pid;
    if (opts && opts.isHost) hostConn = conn;
  }

  function onClose(conn) {
    if (SS.state.role === "host") {
      if (conn.pid) {
        SS.removePlayer(conn.pid);
        SS.logLine((SS.player(conn.pid) || {}).name + " hat die Runde verlassen.");
        broadcast({ t: "state", s: publicSnapshot() });
        SS.emit("net");
      }
      conns = conns.filter((c) => c !== conn);
      if (SS.state.phase === "playing") SS.emit("playerLeft", conn.pid);
    } else {
      if (conn === hostConn) {
        setStatus("lost");
        SS.toast("Verbindung zur Runde verloren. Es geht am Gerät weiter — nachgereicht wird später.", "err");
        SS.state.pending = true;
        SS.emit("net");
      }
    }
  }

  function onData(conn, msg) {
    if (!msg || typeof msg !== "object") return;

    if (SS.state.role === "guest") {
      handleGuestIncoming(msg);
    } else {
      handleHostIncoming(conn, msg);
    }
  }

  /* ── Gast-Empfang ─────────────────────────────────────────────────────── */
  function handleGuestIncoming(msg) {
    switch (msg.t) {
      case "welcome": {
        SS.state.mode = "online";
        SS.state.role = "guest";
        SS.state.hostId = msg.hostId;
        SS.state.me = msg.you;
        SS.state.players = msg.players || [];
        SS.state.code = msg.code || SS.state.code;
        setStatus("online");
        SS.emit("joined");
        break;
      }
      case "state": {
        applyState(msg.s);
        SS.emit("net");
        break;
      }
      case "start": {
        // Der Host hat die Partie gestartet — Gäste wechseln in die Spielansicht.
        SS.state.phase = "playing";
        if (SS.ui && SS.state.route !== "game") SS.ui.go("game");
        SS.emit("net");
        break;
      }
      case "priv": {
        SS.state.priv[SS.state.me] = msg.priv;
        SS.emit("net");
        break;
      }
      case "act": {
        // Vom Host autoritativ verteilte Aktion (selten) — direkt anwenden
        SS.applyActionRaw(msg.pid, msg.name, msg.payload);
        SS.emit("net");
        break;
      }
      case "chat": {
        SS.logLine(msg.from + ": " + msg.text, "chat");
        SS.emit("net");
        break;
      }
      case "kick": {
        SS.toast(msg.reason || "Du wurdest entfernt.", "err");
        leave();
        SS.emit("net");
        break;
      }
      case "hostleft": {
        setStatus("lost");
        SS.toast("Der Host hat die Gruppe geschlossen.", "err");
        SS.state.connection = "lost";
        SS.emit("net");
        break;
      }
      default: break;
    }
  }

  /* ── Host-Empfang ─────────────────────────────────────────────────────── */
  function handleHostIncoming(conn, msg) {
    switch (msg.t) {
      case "hello": {
        // Wiedereintritt ist ausdrücklich erlaubt: Wer während einer Partie
        // die Verbindung verliert, soll wieder reinfinden — der Punktestand
        // steht ohnehin am Host. Neue Gäste bekommen den laufenden Stand.
        const name = String(msg.name || "Gast").slice(0, 22);
        let p = msg.pid && SS.player(msg.pid);
        if (!p) p = SS.addPlayer(name, { id: msg.pid || SS.uid(8), connected: true, isHost: false });
        else { p.connected = true; p.name = name; }
        conn.pid = p.id;
        SS.state.priv[p.id] = SS.state.priv[p.id] || {};
        sendConn(conn, {
          t: "welcome",
          you: p.id,
          hostId: SS.state.hostId,
          code: SS.state.code,
          players: SS.state.players,
          gameId: SS.state.gameId,
          phase: SS.state.phase,
        });
        if (SS.store) SS.store.touchMembers(SS.state.players);
        SS.logLine(name + " is dabei.", "ok");
        broadcast({ t: "state", s: publicSnapshot() });
        if (SS.state.phase === "playing") broadcast({ t: "start" });
        SS.emit("net");
        break;
      }
      case "ping": {
        sendConn(conn, { t: "pong" });
        break;
      }
      case "act": {
        const pid = conn.pid || msg.pid;
        if (!pid) return;
        SS.applyActionRaw(pid, msg.name, msg.payload);
        SS.emit("net");
        break;
      }
      case "chat": {
        const who = SS.player(conn.pid);
        const line = (who ? who.name : "Gast") + ": " + String(msg.text).slice(0, 200);
        SS.logLine(line, "chat");
        broadcast({ t: "chat", from: who ? who.name : "Gast", text: String(msg.text).slice(0, 200) });
        SS.emit("net");
        break;
      }
      case "leave": {
        if (conn.pid) {
          const who = SS.player(conn.pid);
          SS.removePlayer(conn.pid);
          SS.logLine((who ? who.name : "Ein Gast") + " hat verlassen.");
          broadcast({ t: "state", s: publicSnapshot() });
          SS.emit("net");
        }
        break;
      }
      case "req": {
        // Gast erbittet kompletten Zustand (z. B. nach Neuverbinden)
        sendConn(conn, { t: "state", s: publicSnapshot() });
        if (conn.pid && SS.state.priv[conn.pid] !== undefined) sendConn(conn, { t: "priv", priv: SS.state.priv[conn.pid] });
        break;
      }
      case "outbox": {
        // Nachgereichtes aus der offline verbrachten Zeit.
        const evts = Array.isArray(msg.events) ? msg.events : [];
        if (!evts.length) return;
        let merges = 0;
        evts.forEach((e) => {
          if (!e || typeof e !== "object") return;
          if (e.kind === "spielzug" || e.kind === "runde" || e.kind === "sieg") {
            if (SS.store) SS.store.addChronicle({
              type: e.kind === "spielzug" ? "runde" : e.kind,
              groupCode: SS.state.code || null,
              game: (SS.getMeta(e.gameId) || {}).name || "",
              round: e.round || 0,
              who: (SS.player(conn.pid) || {}).name || "Gast",
              offline: true,
            });
            merges++;
          } else if (e.kind === "punkte" && e.pid) {
            SS.state.scores[e.pid] = (SS.state.scores[e.pid] || 0) + (e.points || 0);
            merges++;
          }
        });
        if (merges) {
          SS.logLine((SS.player(conn.pid) || {}).name + ": " + merges + " Eintrag/Einträge aus der Offline-Zeit nachgreicht.", "ok");
          broadcast({ t: "state", s: publicSnapshot() });
          SS.emit("net");
        }
        break;
      }
      default: break;
    }
  }

  function applyState(s) {
    if (!s) return;
    ["players", "hostId", "gameId", "settings", "phase", "round", "turn", "scores", "pub", "lastResult", "syncSeed", "syncSeq"].forEach((k) => {
      if (s[k] !== undefined) SS.state[k] = s[k];
    });
  }

  /* ── Ausgangskorb: offline Gespieltes nachreichen ─────────────────────── */
  /**
   * Was ohne Netz passiert ist, liegt in SS.store.outbox(). Sobald wieder
   * Kontakt zum Host besteht, geht der ganze Korb in einem Zug raus und
   * wird danach geleert. Der Host verbucht die Einträge in seiner Chronik.
   */
  function flushOutbox() {
    if (!SS.store) return false;
    if (SS.state.role !== "guest") return false;
    if (SS.state.connection !== "online") return false;
    const list = SS.store.outbox();
    if (!list.length) return false;
    if (!sendToHost({ t: "outbox", events: list })) return false;
    SS.store.clearOutbox();
    SS.state.pending = false;
    SS.toast(list.length + " offline Gespieltes is nachgreicht worn.", "ok");
    return true;
  }
  SS.on("net", () => { if (SS.state.role === "guest") setTimeout(flushOutbox, 400); });

  /* ── Gruppe erstellen (Host) ──────────────────────────────────────────── */
  function createGroup(hostName) {
    return new Promise((resolve, reject) => {
      if (!ensureLib()) return reject(new Error("Netzwerk-Bibliothek konnte nicht geladen werden. Bitte Internetverbindung prüfen."));
      setStatus("connecting");

      // Eigener, frischer Code bei jedem Öffnen — kein Wiederverwenden des alten.
      let code = null;
      let attempts = 0;

      const tryCreate = () => {
        code = newCode();
        const id = peerIdFor(code);
        peer = new window.Peer(id, { debug: 1, config: { iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ] } });

        let settled = false;

        peer.on("open", () => {
          settled = true;
          SS.state.mode = "online";
          SS.state.role = "host";
          SS.state.code = code;
          SS.state.hostId = SS.state.me = "host";
          SS.state.syncSeed = code + ":" + SS.uid(6);
          // Host selbst als Teilnehmer
          SS.state.players = [];
          SS.state.scores = {};
          const own = SS.addPlayer(hostName || "Host", { id: "host", isHost: true, connected: true });
          SS.state.me = own.id;
          setStatus("online");
          // Runde bleibt am Gerät — taucht nach Neustart oder ohne Netz wieder auf.
          if (SS.store) {
            SS.store.saveGroup({
              code: code, name: (SS.store.loadGroup() || {}).name || "Wirtshausrunde",
              role: "host", lastHost: true, members: [],
            });
            SS.store.touchMembers(SS.state.players);
          }
          SS.logLine("Runde " + code + " geöffnet. Warte auf Beitritte …", "ok");
          resolve({ code });
          SS.emit("net");
        });

        peer.on("connection", (conn) => {
          conns.push(conn);
          attachConn(conn, {});
          SS.emit("net");
        });

        peer.on("error", (err) => {
          const type = err && err.type;
          if (!settled && (type === "unavailable-id" || type === "unavailable")) {
            try { peer.destroy(); } catch (e) {}
            attempts++;
            if (attempts < 10) { code = newCode(); return setTimeout(tryCreate, 220); }
            setStatus("lost");
            return reject(new Error("Kein freier Gruppencode gefunden. Bitte erneut versuchen."));
          }
          if (!settled && (type === "network" || type === "server-error" || type === "socket-error" || type === "ssl-unavailable")) {
            setStatus("offline");
            return reject(new Error("Der Verbindungsdienst ist gerade nicht erreichbar. Nutze so lange den Modus «Am selben Gerät»."));
          }
          console.warn("Peer-Fehler", type, err);
        });

        peer.on("disconnected", () => {
          setStatus("lost", "Broker getrennt");
          try { peer.reconnect(); } catch (e) {}
        });
      };

      tryCreate();
    });
  }

  /* ── Gruppe betreten (Gast) ───────────────────────────────────────────── */
  function joinGroup(code, guestName) {
    return new Promise((resolve, reject) => {
      if (!ensureLib()) return reject(new Error("Netzwerk-Bibliothek konnte nicht geladen werden."));
      code = String(code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code.length !== CODE_LEN) return reject(new Error("Bitte einen " + CODE_LEN + "-stelligen Rundencode eingeben."));
      setStatus("connecting");
      SS.state.code = code;

      // Feste Kennung pro Gerät: erlaubt den Wiedereintritt nach einem Abbruch.
      let myPid = SS.store ? SS.store.read("devicePid", null) : null;
      if (!myPid) {
        myPid = SS.uid(10);
        if (SS.store) SS.store.write("devicePid", myPid);
      }
      peer = new window.Peer({
        debug: 1,
        config: { iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ] },
      });

      let settled = false;
      const giveUpAfter = setTimeout(() => {
        if (settled) return;
        settled = true;
        setStatus("offline");
        try { peer.destroy(); } catch (e) {}
        reject(new Error("Keine Gruppe mit dem Code «" + code + "» gefunden. Läuft das Spiel am Host-Gerät, ist der Code richtig, und sind beide Geräte im Internet?"));
      }, 22000);

      peer.on("open", () => {
        const conn = peer.connect(peerIdFor(code), { reliable: true, serialization: "json" });
        hostConn = conn;
        attachConn(conn, { isHost: true });

        conn.on("open", () => {
          settled = true;
          clearTimeout(giveUpAfter);
          SS.state.mode = "online";
          SS.state.role = "guest";
          SS.state.me = myPid;
          if (SS.store) {
            SS.store.saveGroup({
              code: code, name: (SS.store.loadGroup() || {}).name || "Wirtshausrunde",
              role: "guest", lastHost: false,
            });
          }
          sendConn(conn, { t: "hello", name: guestName || "Gast", pid: myPid });
          resolve({ code: code });
        });
        conn.on("error", (err) => {
          if (settled) return;
          settled = true;
          clearTimeout(giveUpAfter);
          setStatus("offline");
          reject(new Error("Verbindung fehlgeschlagen: " + (err && err.message ? err.message : "unbekannt")));
        });
      });

      peer.on("error", (err) => {
        const type = err && err.type;
        if (type === "peer-unavailable") {
          if (settled) return;
          settled = true;
          clearTimeout(giveUpAfter);
          setStatus("offline");
          reject(new Error("Keine Gruppe mit dem Code «" + code + "» gefunden. Ist der Code richtig und der Host bereits in der Lobby?"));
          return;
        }
        if (!settled && (type === "network" || type === "server-error" || type === "socket-error" || type === "ssl-unavailable")) {
          settled = true;
          clearTimeout(giveUpAfter);
          setStatus("offline");
          reject(new Error("Der Verbindungsdienst ist gerade nicht erreichbar. Nutze so lange den Modus «Am selben Gerät»."));
        }
      });
    });
  }

  /* ── Wieder in die Runde finden (nach Verbindungsabbruch) ─────────────── */
  function rejoin(code, name) {
    if (SS.state.connection === "connecting") return Promise.reject(new Error("läuft schon"));
    setStatus("connecting", "Neu verbinden …");
    return joinGroup(code, name).then(() => {
      SS.toast("Wieder in der Runde.", "ok");
      return true;
    }).catch(() => {
      setStatus("lost");
      return false;
    });
  }

  /* ── Verlassen ────────────────────────────────────────────────────────── */
  function leave() {
    try {
      if (SS.state.role === "host") {
        broadcast({ t: "hostleft" });
        conns.forEach((c) => { try { c.close(); } catch (e) {} });
      } else if (hostConn) {
        sendConn(hostConn, { t: "leave" });
      }
    } catch (e) {}
    try { if (peer) peer.destroy(); } catch (e) {}
    peer = null; conns = []; hostConn = null;
    setStatus("offline");
  }

  /* ── Selbsttest des Verbindungsdienstes ───────────────────────────────── */
  function available() { return ensureLib(); }

  function init() {
    if (!ensureLib()) {
      setStatus("offline", "Ohne Netzwerk");
      console.info("Schulspiele: PeerJS nicht verfügbar — es läuft nur der Modus «Am selben Gerät».");
      return Promise.resolve(false);
    }
    // Sanfter Erreichbarkeitstest (kein Peer wird dauerhaft geöffnet).
    return probeBroker().catch(() => false);
  }

  function probeBroker() {
    return new Promise((resolve) => {
      let done = false;
      const finish = (ok) => { if (!done) { done = true; try { p.destroy(); } catch (e) {} resolve(ok); } };
      let p;
      try {
        p = new window.Peer({ debug: 0, config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] } });
      } catch (e) { return resolve(false); }
      p.on("open", () => finish(true));
      p.on("error", () => finish(false));
      setTimeout(() => finish(false), 6000);
    });
  }

  /* ── Export ───────────────────────────────────────────────────────────── */
  Object.assign(SS.net, {
    init, available, setStatus, flushOutbox, rejoin,
    createGroup, joinGroup, leave,
    sendToHost, broadcastState, broadcast, sendTo,
  });
})();
