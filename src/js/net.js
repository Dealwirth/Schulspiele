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
  // Der Datenkanal nimmt rund 16 KB je Nachricht. Alles, was darüber liegt,
  // wird in Stücke zerlegt und am anderen Ende wieder zusammengesetzt. Das
  // betrifft vor allem den Zustand einer großen Runde: Bei 100 Leuten ist die
  // Aufgabe-Liste allein größer als der Kanal fasst.
  const MAX_MSG = 12000;       // darüber wird gestückelt
  const FRAME = 6000;          // Nutzdaten je Stück
  let frameSeq = 0;

  /** Eine Nachricht in den Kanal geben — bei Bedarf in Stücken. */
  function push(conn, msg) {
    if (!conn || !conn.open) return false;
    let text;
    try { text = JSON.stringify(msg); } catch (e) { return false; }
    if (text.length <= MAX_MSG) { try { conn.send(msg); return true; } catch (e) { return false; } }
    const id = "f" + (frameSeq++) + "-" + Date.now().toString(36);
    const total = Math.ceil(text.length / FRAME);
    try {
      conn.send({ t: "big", id: id, seq: 0, total: total });
      for (let i = 0; i < total; i++) conn.send({ t: "big", id: id, seq: i + 1, d: text.slice(i * FRAME, (i + 1) * FRAME) });
      return true;
    } catch (e) { return false; }
  }

  const bigBoxes = new Map();  // id -> { parts: Map, total, got, at }

  /** Ein Stück einer großen Nachricht aufnehmen. */
  function takeBig(conn, msg) {
    const id = msg.id;
    if (!id) return null;
    let box = bigBoxes.get(id);
    if (!box) { box = { parts: new Map(), total: 0, got: 0, at: Date.now() }; bigBoxes.set(id, box); }
    if (msg.seq === 0) { box.total = msg.total; box.at = Date.now(); return null; }
    if (!box.total) return null;
    if (typeof msg.d === "string" && !box.parts.has(msg.seq)) { box.parts.set(msg.seq, msg.d); box.got++; }
    if (box.got < box.total) {
      if (Date.now() - box.at > 60000) bigBoxes.delete(id);
      return null;
    }
    let text = "";
    for (let i = 1; i <= box.total; i++) {
      const part = box.parts.get(i);
      if (part === undefined) { bigBoxes.delete(id); return null; }
    }
    for (let i = 1; i <= box.total; i++) text += box.parts.get(i);
    bigBoxes.delete(id);
    try { return JSON.parse(text); } catch (e) { return null; }
  }

  function sendToHost(msg) {
    return push(hostConn, msg);
  }
  function sendConn(conn, msg) {
    return push(conn, msg);
  }
  function broadcast(msg, exceptPid) {
    conns.forEach((c) => { if (c.open && c.pid !== exceptPid) sendConn(c, msg); });
  }
  function sendTo(pid, msg) {
    const c = conns.find((x) => x.pid === pid);
    if (c) sendConn(c, msg);
  }
  function guestCount() { return conns.filter((c) => c.open).length; }

  /* ── Fotos übertragen ─────────────────────────────────────────────────────
     Ein Bild ist groß, aber die Stückelung oben erledigt das: Es geht als
     eine Nachricht raus und wird unterwegs zerlegt. Wichtig ist hier nur der
     Weg — ein Gast schickt sein Bild an den Wirt, der es ablegt und an alle
     anderen verteilt. So hat am Ende jedes Gerät dasselbe Album.
     ──────────────────────────────────────────────────────────────────────── */

  const PHOTO_BYTES_MAX = 600 * 1024;  // größer wird nicht übertragen

  // Wie groß das verkleinerte Bild höchstens sein soll. Ein Handy liefert
  // sonst mehrere Megabyte, und die laufen weder durch den Kanal noch in den
  // Speicher. Am Rechner darf es etwas mehr sein, da ist der Speicher größer.
  function photoBudget() {
    const touch = (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0)
      || (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    return touch ? 180 * 1024 : 320 * 1024;
  }

  /**
   * Ein Bild verschicken. dataUrl darf null sein: Dann wird nur der Platz im
   * Album vermerkt, damit alle wissen, dass dieses Bild zu dieser Aufgabe
   * gehört — das Bild selbst kommt beim nächsten Kontakt nach.
   * Mit `target` geht es gezielt an eine Verbindung (für Nachzügler).
   */
  function sendPhoto(aid, pid, dataUrl, target) {
    if (dataUrl && dataUrl.length * 0.75 > PHOTO_BYTES_MAX) {
      SS.toast("Des Bild is z'groß zum Verschicken.", "err");
      return false;
    }
    const found = SS.findTaskAnywhere(aid);
    const msg = {
      t: "img", aid: aid, pid: pid, who: SS.nameOf(pid),
      text: found ? found.task.text : "", data: dataUrl || null,
    };
    if (target) return sendConn(target, msg);
    let ok;
    if (SS.state.role === "host") { broadcast(msg); ok = true; }
    // Bewusst über die öffentliche Funktion: So bleibt dieselbe Naht, über
    // die auch alles andere geht — und ein Test kann sie ersetzen.
    else ok = SS.net.sendToHost(msg);
    // Nicht durchgekommen: Beim nächsten Kontakt nochmal versuchen.
    if (!ok && dataUrl && SS.store) SS.store.queue({ kind: "bild", aid: aid, pid: pid, data: dataUrl, at: Date.now() });
    return ok;
  }

  /** Ein Bild aufnehmen — und am Wirt an alle anderen weiterreichen. */
  function receivePhoto(conn, msg) {
    const aid = msg.aid;
    if (!aid) return false;
    if (SS.store) {
      SS.store.addPhoto({
        aid: aid, pid: msg.pid, data: msg.data || null, who: msg.who,
        groupCode: SS.state.code || null, text: msg.text || "",
      });
    }
    // Die Aufgabe gilt damit als nachgewiesen — auf jedem Gerät.
    if (SS.notePhoto) { SS.notePhoto(msg.pid, aid); SS.persist(); if (SS.renderCurrent) SS.renderCurrent(); }
    // Der Absender bekommt sein Bild nicht zurück, er hat es ja selbst.
    if (SS.state.role === "host") broadcast(msg, conn && conn.pid);
    SS.emit("album");
    return true;
  }

  /** Wie viele Bilder fehlen hier im Vergleich zu einer Liste von Kennungen? */
  function missingPhotos(keys) {
    if (!SS.store || !Array.isArray(keys)) return [];
    const have = SS.store.photoKeys(SS.state.code || null);
    return keys.filter((k) => have.indexOf(k) === -1);
  }

  /**
   * Einem frisch dazugekommenen Gast alle Bilder schicken, die er noch nicht
   * hat. Er meldet vorher mit "want", welche er schon hat — sonst gingen bei
   * jedem Beitritt alle Bilder der Runde nochmal durch den Kanal.
   */
  function sendMissingPhotos(conn) {
    if (!SS.store) return;
    const have = (conn && conn.haveKeys) || [];
    const mine = SS.store.album().filter((p) => p.data && p.aid);
    const group = SS.state.code || null;
    mine.filter((p) => !group || !p.groupCode || p.groupCode === group)
      .filter((p) => have.indexOf(p.aid) === -1)
      .forEach((p) => sendPhoto(p.aid, p.pid, p.data, conn));
  }

  /** Am Wirt: ein Gast meldet, welche Bilder er schon hat. */
  function noteHaveKeys(conn, keys) {
    conn.haveKeys = Array.isArray(keys) ? keys : [];
  }

  /**
   * Was über den Kanal geht. Die Aufgabentexte bleiben weg: Die entstehen am
   * anderen Ende aus Aufgabenkennung, Zielperson und Keim neu. Sonst wäre
   * die Nachricht bei einer großen Runde größer als der Kanal fasst.
   * Die Bilder gehen ebenfalls nicht mit — die laufen als eigene Stücke.
   */
  function wireSnapshot() {
    const tasks = {};
    Object.keys(SS.state.assignments || {}).forEach((pid) => {
      tasks[pid] = (SS.state.assignments[pid] || []).map((t) => {
        const o = { aid: t.aid, taskId: t.taskId, type: t.type, level: t.level, points: t.points };
        if (t.target) o.target = t.target;
        if (t.photo) o.photo = 1;
        if (t.confirmed) o.confirmed = 1;
        if (t.confirmedBy) o.confirmedBy = t.confirmedBy;
        if (t.voided) o.voided = 1;
        if (t.at) o.at = t.at;
        if (t.flagBy && t.flagBy.length) o.flagBy = t.flagBy;
        return o;
      });
    });
    return {
      players: SS.state.players,
      hostId: SS.state.hostId,
      phase: SS.state.phase,
      endedAt: SS.state.endedAt || null,
      groupName: SS.state.groupName,
      seed: SS.state.seed,
      ring: SS.state.ring,
      assignments: tasks,
      sidequests: SS.state.sidequests,
      proposals: SS.state.proposals,
      settings: SS.state.settings,
      reviews: SS.state.reviews,
      photoKeys: SS.store ? SS.store.photoKeys(SS.state.code || null) : [],
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
    // Eine gestückelte Nachricht: erst zusammensetzen, dann verarbeiten.
    if (msg.t === "big") {
      const full = takeBig(conn, msg);
      if (full) onData(conn, full);
      return;
    }
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
        // Bilder, die hier fehlen, beim Wirt anfordern.
        if (msg.s && msg.s.photoKeys) {
          const missing = missingPhotos(msg.s.photoKeys);
          if (missing.length) sendToHost({ t: "want", keys: SS.store ? SS.store.photoKeys(SS.state.code || null) : [] });
        }
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
        if (msg.endedAt) SS.state.endedAt = msg.endedAt;
        SS.toast("Der Wirt hat den Abend beendet.", "ok");
        // Direkt zum Endstand — dort steht das Ergebnis für alle.
        if (SS.ui && SS.state.route !== "end") SS.ui.go("end");
        SS.emit("net");
        break;
      }
      case "act": {
        SS.applyActionRaw(msg.pid, msg.name, msg.payload);
        SS.emit("net");
        break;
      }
      case "img": {
        // Als Gast gibt es hier keine Gegenstelle — die gibt es nur am Wirt.
        receivePhoto(null, msg);
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
        // Bilder, die dieser Gast noch nicht hat, gezielt nachschicken.
        sendMissingPhotos(conn);
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
      case "img": {
        receivePhoto(conn, msg);
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
      case "want": {
        // Ein Gast meldet, welche Bilder er schon hat. Danach weiß der Wirt,
        // was noch fehlt — auch bei einem Gast, der neu dazukommt.
        noteHaveKeys(conn, msg.keys);
        sendMissingPhotos(conn);
        break;
      }
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
    ["players", "hostId", "phase", "endedAt", "groupName", "seed", "ring",
      "sidequests", "proposals", "settings", "reviews"].forEach((k) => {
      if (s[k] !== undefined) SS.state[k] = s[k];
    });
    if (s.assignments) SS.state.assignments = mergeAssignments(s.assignments);
    if (Array.isArray(s.log) && s.log.length) SS.state.log = s.log;
    // Der Gast muss den empfangenen Stand auch behalten. Ohne das war nach
    // einem Neustart der alte Stand wieder da — der Endstand verschwand.
    if (SS.persist) SS.persist();
  }

  /**
   * Die Aufgaben aus der Zustandsnachricht mit den eigenen zusammenführen.
   * Der Text steht nicht in der Nachricht, er entsteht hier neu — aus
   * Aufgabenkennung, Zielperson und Keim. Was schon da war, bleibt stehen.
   */
  function mergeAssignments(remote) {
    const out = {};
    const seed = String(SS.state.seed || "seidla");
    Object.keys(remote).forEach((pid) => {
      const mine = SS.state.assignments[pid] || [];
      out[pid] = (remote[pid] || []).map((r) => {
        const local = mine.find((t) => t.aid === r.aid);
        const base = SS.tasks ? SS.tasks.taskById(r.taskId) : null;
        let text = local && local.text ? local.text : "";
        if (!text && base) {
          const rng = SS.seededRng(seed + ":" + r.aid);
          text = SS.assign.render(base.text, r.target ? SS.nameOf(r.target) : null, rng);
        }
        const merged = Object.assign({}, local || {}, r, { text: text || "(Aufgabe unbekannt)" });
        // photo kommt als bloßes Ja/Nein — die eigene Bildkennung behalten.
        merged.photo = r.photo ? ((local && local.photo) || r.aid) : null;
        merged.confirmed = !!r.confirmed;
        merged.voided = !!r.voided;
        merged.flagBy = r.flagBy || (local && local.flagBy) || [];
        merged.flagged = merged.flagBy.length;
        merged.done = !!r.photo;
        return merged;
      });
    });
    return out;
  }

  /* ── Ausgangskorb: offline Gespieltes nachreichen ─────────────────────── */
  function flushOutbox() {
    if (!SS.store) return false;
    if (SS.state.role !== "guest") return false;
    if (SS.state.connection !== "online") return false;
    const list = SS.store.outbox();
    if (!list.length) return false;
    // Bilder werden stückweise geschickt, alles andere als eine Nachricht.
    const plain = list.filter((e) => e.kind !== "bild");
    const images = list.filter((e) => e.kind === "bild" && e.data);
    if (plain.length && !sendToHost({ t: "outbox", events: plain })) return false;
    let imagesOk = true;
    images.forEach((e) => { if (!sendPhoto(e.aid, e.pid, e.data)) imagesOk = false; });
    if (!imagesOk) {
      // Bilder, die nicht durchkamen, bleiben im Korb.
      SS.store.clearOutbox();
      images.filter((e) => !SS.store.photoByAid(e.aid)).forEach((e) => SS.store.queue(e));
      return false;
    }
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
  function joinGroup(code, guestName, opts) {
    opts = opts || {};
    const step = (s) => { if (typeof opts.onStep === "function") { try { opts.onStep(s); } catch (e) {} } };
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
        step("broker");
        const conn = peer.connect(peerIdFor(code), { reliable: true, serialization: "json" });
        hostConn = conn;
        attachConn(conn, { isHost: true });

        conn.on("open", () => {
          step("host");
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
          // Welche Bilder hat dieses Gerät schon? Nur die fehlenden kommen nach.
          sendConn(conn, { t: "want", keys: SS.store ? SS.store.photoKeys(code) : [] });
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
    sendToHost, broadcastState, broadcast, sendTo, wireSnapshot,
    sendPhoto, receivePhoto, missingPhotos, photoBudget,
  });
})();
