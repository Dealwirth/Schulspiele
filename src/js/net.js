/* ==========================================================================
   Seidla — Netzwerkschicht
   Der Wirt öffnet eine Runde, alle anderen treten mit dem Code bei.
   Transport ist WebRTC (PeerJS) — geräteübergreifend (iPhone, iPad, Android,
   Laptop). Für den Verbindungsaufbau wird der öffentliche PeerJS-Broker
   genutzt, danach läuft der Datenverkehr direkt.

   Wichtig: Der Wirt funktioniert immer, auch ohne Internet. Der Code wird
   sofort und lokal erzeugt; die Verbindung wird nur im Hintergrund versucht.
   Fällt das Netz aus, läuft der Abend am Gerät weiter und die Nachweise
   wandern in den Ausgangskorb.

   Der Broker ist nur zum Finden der Geräte nötig. Er sieht keine Fotos und
   keine Nachrichten — die laufen verschlüsselt direkt zwischen den Geräten.
   ========================================================================== */
(function () {
  "use strict";
  const SS = window.SS;

  const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ohne I/O/0/1
  const CODE_LEN = 4;
  const PREFIX = "seidla-";

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
  let retryTimer = null;

  /* ── Statusanzeige im Kopf ────────────────────────────────────────────── */
  function setStatus(kind, label) {
    SS.state.connection = kind;
    const badge = SS.$("#netBadge");
    if (!badge) return;
    badge.className = "net-badge " + (kind === "online" ? "online" : kind === "connecting" ? "warn" : kind === "lost" ? "bad" : "");
    badge.textContent = label || {
      offline: "Am Gerät", connecting: "Verbinde …", online: "Verbunden", lost: "Ohne Netz",
    }[kind];
  }

  function ensureLib() {
    if (libChecked) return libOk;
    libChecked = true;
    libOk = typeof window.Peer === "function";
    return libOk;
  }

  /* ── Senden ───────────────────────────────────────────────────────────── */
  function sendToHost(msg) {
    if (hostConn && hostConn.open) {
      try { hostConn.send(msg); return true; } catch (e) { return false; }
    }
    return false;
  }
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
  function guestCount() { return conns.filter((c) => c.open).length; }

  /* ── Zustandsverteilung ───────────────────────────────────────────────── */
  function wireSnapshot() {
    return {
      players: SS.state.players,
      hostId: SS.state.hostId,
      phase: SS.state.phase,
      groupName: SS.state.groupName,
      seed: SS.state.seed,
      ring: SS.state.ring,
      assignments: SS.state.assignments,
      sidequests: SS.state.sidequests,
      proposals: SS.state.proposals,
      settings: SS.state.settings,
      reviews: SS.state.reviews,
      log: SS.state.log.slice(-40),
    };
  }
  function broadcastState() {
    if (SS.state.role !== "host" || !conns.length) return false;
    broadcast({ t: "state", s: wireSnapshot() });
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
        broadcast({ t: "state", s: wireSnapshot() });
        SS.emit("net");
      }
      conns = conns.filter((c) => c !== conn);
      // Kein Gast mehr da: der Abend läuft trotzdem am Gerät weiter.
      if (!guestCount()) setStatus(SS.state.mode === "online" ? "lost" : "offline",
        SS.state.mode === "online" ? "Ohne Netz" : "Am Gerät");
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
    if (SS.state.role === "guest") handleGuestIncoming(msg);
    else handleHostIncoming(conn, msg);
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
        if (msg.groupName) SS.state.groupName = msg.groupName;
        if (msg.settings) SS.state.settings = msg.settings;
        setStatus("online");
        SS.emit("joined");
        break;
      }
      case "state": {
        applyState(msg.s);
        SS.emit("net");
        break;
      }
      case "deal": {
        SS.state.phase = "running";
        if (SS.ui && SS.state.route !== "tasks") SS.ui.go("tasks");
        SS.toast("Deine Aufgaben sind da!", "ok");
        SS.emit("net");
        break;
      }
      case "review": {
        SS.state.phase = "review";
        SS.toast("Die Gesamtwertung läuft — bewertet die Nachweise der anderen!", "ok");
        if (SS.ui && SS.state.route !== "review") SS.ui.go("review");
        SS.emit("net");
        break;
      }
      case "closed": {
        SS.state.phase = "over";
        SS.toast("Der Wirt hat den Abend abgeschlossen.", "ok");
        SS.emit("net");
        break;
      }
      case "act": {
        SS.applyActionRaw(msg.pid, msg.name, msg.payload);
        SS.emit("net");
        break;
      }
      case "chat": {
        SS.receiveChat({ id: msg.id, from: msg.from, text: msg.text, at: Date.now() });
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
        SS.toast("Der Host hat die Gruppe geschlossen. Es geht am Gerät weiter.", "err");
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
        // Wiedereintritt ist ausdrücklich erlaubt: Wer während des Abends die
        // Verbindung verliert, soll wieder reinfinden — der Stand steht am Host.
        const name = String(msg.name || "Gast").slice(0, 22);
        let p = msg.pid && SS.player(msg.pid);
        if (!p) p = SS.addPlayer(name, { id: msg.pid || SS.uid(8), connected: true, isHost: false });
        else { p.connected = true; p.name = name; }
        conn.pid = p.id;
        sendConn(conn, {
          t: "welcome", you: p.id, hostId: SS.state.hostId, code: SS.state.code,
          players: SS.state.players, groupName: SS.state.groupName,
          phase: SS.state.phase, settings: SS.state.settings,
        });
        sendConn(conn, { t: "state", s: wireSnapshot() });
        if (SS.store) SS.store.touchMembers(SS.state.players);
        SS.logLine(name + " is dabei.", "ok");
        broadcast({ t: "state", s: wireSnapshot() });
        if (SS.state.phase === "running") broadcast({ t: "deal" });
        if (SS.state.phase === "review") broadcast({ t: "review" });
        setStatus("online");
        SS.emit("net");
        break;
      }
      case "ping": sendConn(conn, { t: "pong" }); break;
      case "act": {
        const pid = conn.pid || msg.pid;
        if (!pid) return;
        SS.applyActionRaw(pid, msg.name, msg.payload);
        SS.emit("net");
        break;
      }
      case "chat": {
        const who = SS.player(conn.pid);
        const from = (who ? who.name : "Gast");
        const text = String(msg.text || "").slice(0, 200);
        if (!text) return;
        const id = msg.id || SS.uid(10);
        // Am Host ablegen und an alle weiterreichen (auch an den Absender,
        // damit alle dieselbe Reihenfolge sehen).
        SS.receiveChat({ id: id, pid: conn.pid, from: from, text: text, at: Date.now() });
        broadcast({ t: "chat", id: id, from: from, text: text });
        SS.emit("net");
        break;
      }
      case "leave": {
        if (conn.pid) {
          const who = SS.player(conn.pid);
          SS.removePlayer(conn.pid);
          SS.logLine((who ? who.name : "Ein Gast") + " hat verlassen.");
          broadcast({ t: "state", s: wireSnapshot() });
          SS.emit("net");
        }
        break;
      }
      case "req": sendConn(conn, { t: "state", s: wireSnapshot() }); break;
      case "outbox": {
        // Nachgereichtes aus der offline verbrachten Zeit.
        const evts = Array.isArray(msg.events) ? msg.events : [];
        if (!evts.length) return;
        let merges = 0, chats = 0;
        evts.forEach((e) => {
          if (!e || typeof e !== "object") return;
          if (e.kind === "aktion" && e.action) { SS.applyActionRaw(conn.pid, e.action, e.payload); merges++; }
          else if (e.kind === "chat" && e.text) {
            const from = (SS.player(conn.pid) || {}).name || e.from || "Gast";
            const id = e.id || SS.uid(10);
            SS.receiveChat({ id: id, pid: conn.pid, from: from, text: String(e.text).slice(0, 200), at: e.at || Date.now() });
            broadcast({ t: "chat", id: id, from: from, text: String(e.text).slice(0, 200) });
            chats++;
          }
        });
        if (merges || chats) {
          SS.logLine((SS.player(conn.pid) || {}).name + ": " + (merges + chats) + " Sache(n) aus der Offline-Zeit nachgereicht.", "ok");
          broadcast({ t: "state", s: wireSnapshot() });
          SS.emit("net");
        }
        break;
      }
      default: break;
    }
  }

  function applyState(s) {
    if (!s) return;
    ["players", "hostId", "phase", "groupName", "seed", "ring", "assignments",
      "sidequests", "proposals", "settings", "reviews"].forEach((k) => {
      if (s[k] !== undefined) SS.state[k] = s[k];
    });
    if (Array.isArray(s.log) && s.log.length) SS.state.log = s.log;
  }

  /* ── Ausgangskorb: offline Gespieltes nachreichen ─────────────────────── */
  function flushOutbox() {
    if (!SS.store) return false;
    if (SS.state.role !== "guest") return false;
    if (SS.state.connection !== "online") return false;
    const list = SS.store.outbox();
    if (!list.length) return false;
    if (!sendToHost({ t: "outbox", events: list })) return false;
    SS.store.clearOutbox();
    SS.state.pending = false;
    SS.toast(list.length + " offline Gemachtes is nachgreicht worn.", "ok");
    return true;
  }
  SS.on("net", () => { if (SS.state.role === "guest") setTimeout(flushOutbox, 400); });

  /* ── Gruppe erstellen (Host) ──────────────────────────────────────────── */
  /**
   * Der Code entsteht sofort und ohne Netz. Danach wird versucht, sich mit
   * dem Broker zu verbinden. Klappt das nicht, bleibt der Abend trotzdem
   * voll spielbar — nur eben am selben Gerät. Sobald wieder Netz da ist,
   * verbindet sich die Runde von selbst.
   */
  function createGroup(hostName) {
    const code = newCode();
    SS.state.mode = "online";
    SS.state.role = "host";
    SS.state.code = code;
    SS.state.hostId = SS.state.me = "host";
    SS.state.seed = code + ":" + SS.uid(6);
    SS.state.players = [];
    const own = SS.addPlayer(hostName || "Wirt", { id: "host", isHost: true, connected: true });
    SS.state.me = own.id;
    if (SS.store) {
      SS.store.saveGroup({
        code: code, name: SS.state.groupName || "Wirtshausrunde",
        role: "host", lastHost: true, members: [],
      });
      SS.store.touchMembers(SS.state.players);
    }
    SS.logLine("Runde " + code + " aufgemacht.", "ok");

    // Verbindung im Hintergrund aufbauen. Der Abend läuft schon.
    const connected = tryOpen(code);
    SS.emit("net");
    return Promise.resolve({ code: code, connected: connected });
  }

  /** Broker verbinden. Mehrfach versuchen, ohne den Abend zu stören. */
  function tryOpen(code) {
    if (!ensureLib()) { setStatus("offline"); return false; }
    if (peer) { try { peer.destroy(); } catch (e) {} peer = null; }
    setStatus("connecting");
    try {
      peer = new window.Peer(peerIdFor(code), {
        debug: 1,
        config: { iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ] },
      });
    } catch (e) { setStatus("offline"); return false; }

    peer.on("open", () => {
      setStatus("online");
      SS.logLine("Runde " + code + " ist erreichbar. Beitritt mit dem Code möglich.", "ok");
      if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
      SS.emit("net");
    });

    peer.on("connection", (conn) => {
      conns.push(conn);
      attachConn(conn, {});
      SS.emit("net");
    });

    peer.on("error", (err) => {
      const type = err && err.type;
      if (type === "unavailable-id") {
        // Code schon belegt: einen frischen nehmen. Der Abend bleibt stehen.
        const fresh = newCode();
        SS.state.code = fresh;
        SS.logLine("Code war belegt — neuer Code: " + fresh, "");
        if (SS.store) SS.store.saveGroup({ code: fresh, role: "host", lastHost: true });
        try { peer.destroy(); } catch (e) {}
        peer = null;
        setTimeout(() => tryOpen(fresh), 300);
        SS.emit("net");
        return;
      }
      if (type === "network" || type === "server-error" || type === "socket-error" || type === "ssl-unavailable") {
        setStatus("offline", "Am Gerät");
        scheduleRetry(code);
      }
    });

    peer.on("disconnected", () => {
      setStatus("lost", "Ohne Netz");
      try { peer.reconnect(); } catch (e) {}
      scheduleRetry(code);
    });
    return true;
  }

  /** Ohne Netz: regelmäßig erneut versuchen, ohne den Abend zu stören. */
  function scheduleRetry(code) {
    if (retryTimer) return;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      if (SS.state.role !== "host") return;
      if (SS.state.connection === "online") return;
      if (!navigator.onLine) { scheduleRetry(code); return; }
      tryOpen(SS.state.code || code);
    }, 15000);
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
      if (peer) { try { peer.destroy(); } catch (e) {} peer = null; }
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
        reject(new Error("Keine Runde mit dem Code «" + code + "» gefunden. Stimmt der Code, ist der Wirt schon in der Lobby, und haben beide Geräte Internet?"));
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
              code: code, name: SS.state.groupName || "Wirtshausrunde",
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
          reject(new Error("Keine Runde mit dem Code «" + code + "» gefunden. Ist der Code richtig und der Wirt schon in der Lobby?"));
          return;
        }
        if (!settled && (type === "network" || type === "server-error" || type === "socket-error" || type === "ssl-unavailable")) {
          settled = true;
          clearTimeout(giveUpAfter);
          setStatus("offline");
          reject(new Error("Gerade kein Verbindungsdienst erreichbar. Du kannst am selben Gerät mitspielen."));
        }
      });
    });
  }

  /* ── Runde wieder aufmachen (nach Neustart oder ohne Netz) ────────────── */
  /**
   * Der Wirt öffnet seine Runde erneut mit demselben Code. Damit finden alle
   * Gäste zurück, auch wenn der Abend Tage pausiert hat. Ohne Netz passiert
   * nichts Schlimmes — dann wird es eben später erneut versucht.
   */
  function reopen() {
    if (SS.state.role !== "host" || !SS.state.code) return false;
    if (SS.state.connection === "online" && peer && !peer.destroyed) return true;
    return tryOpen(SS.state.code);
  }

  /* ── Wieder in die Runde finden ───────────────────────────────────────── */
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
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    peer = null; conns = []; hostConn = null;
    setStatus("offline");
  }

  function available() { return ensureLib(); }

  function init() {
    if (!ensureLib()) {
      setStatus("offline", "Am Gerät");
      return Promise.resolve(false);
    }
    return probeBroker().catch(() => false);
  }

  function probeBroker() {
    return new Promise((resolve) => {
      let done = false;
      let p;
      const finish = (ok) => { if (!done) { done = true; try { p.destroy(); } catch (e) {} resolve(ok); } };
      try {
        p = new window.Peer({ debug: 0, config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] } });
      } catch (e) { return resolve(false); }
      p.on("open", () => finish(true));
      p.on("error", () => finish(false));
      setTimeout(() => finish(false), 6000);
    });
  }

  Object.assign(SS.net, {
    init, available, setStatus, flushOutbox, rejoin,
    createGroup, joinGroup, leave, guestCount, reopen,
    sendToHost, broadcastState, broadcast, sendTo,
  });
})();
