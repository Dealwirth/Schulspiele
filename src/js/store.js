/* ==========================================================================
   Seidla — Gedächtnis
   Gruppe, laufender Abend, Album, Chat und Chronik bleiben am Gerät. Fällt
   das Netz aus, wird weitergespielt; alles wandert in den Ausgangskorb und
   geht später raus.

   Zwei Dinge sind hier wichtig:

   1. Nachprüfbarkeit. Jeder gespeicherte Stand bekommt eine Signatur aus
      einem Geräteschlüssel. Wer im localStorage herumpfuscht, ohne den
      Schlüssel zu kennen, macht den Stand ungültig — er wird verworfen
      statt still geladen. Das ist kein Schutz gegen einen Angreifer mit
      Zugriff auf das Gerät (der könnte den Schlüssel lesen), aber es
      verhindert bequemes Beschummeln über die Konsole.

   2. Doppelte Ablage. Derselbe Stand liegt zusätzlich in einem Cookie.
      Geht der localStorage verloren (Safari räumt den nach Tagen ohne
      Besuch auf), wird aus dem Cookie wiederhergestellt — und umgekehrt.
      So überlebt ein Abend auch eine längere Pause.
   ========================================================================== */
(function () {
  "use strict";
  const SS = window.SS;

  const NS = "seidla:";
  const V = 4;                    // Format-Version; alte Stände werden verworfen
  const COOKIE_KEYS = ["session", "group", "profile"];   // zusätzlich als Cookie
  const COOKIE_DAYS = 400;        // so lange bleibt der Abend auffindbar

  /* ── Geräteschlüssel und Signatur ──────────────────────────────────────── */
  /**
   * Ein zufälliger Schlüssel pro Gerät. Damit wird jeder Stand signiert.
   * Ohne diesen Schlüssel lässt sich ein gefälschter Stand nicht gültig
   * unterschreiben.
   */
  function deviceKey() {
    let k = rawRead("devkey");
    // Der Schlüssel liegt auch im Cookie — sonst wäre nach dem Aufräumen des
    // localStorage jeder gespeicherte Stand plötzlich ungültig.
    if (!k || typeof k !== "string" || k.length < 24) k = getCookie("devkey");
    if (!k || typeof k !== "string" || k.length < 24) {
      k = randomKey();
      setCookie("devkey", k, COOKIE_DAYS);
    }
    rawWrite("devkey", k);
    return k;
  }
  function randomKey() {
    try {
      const a = new Uint8Array(24);
      (window.crypto || window.msCrypto).getRandomValues(a);
      return Array.from(a).map((x) => x.toString(16).padStart(2, "0")).join("");
    } catch (e) {
      let s = "";
      for (let i = 0; i < 48; i++) s += Math.floor(Math.random() * 16).toString(16);
      return s;
    }
  }

  /**
   * Signatur über einen Wert. FNV-1a mit dem Geräteschlüssel als Salz.
   * Reicht, um versehentliches oder bequemes Verfälschen zu erkennen.
   */
  function sign(value) {
    const text = JSON.stringify(value === undefined ? null : value);
    const key = deviceKey();
    let h = 0x811c9dc5;
    const mix = key + "|" + text + "|" + key;
    for (let i = 0; i < mix.length; i++) {
      h ^= mix.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    // Länge mit einrechnen, damit angehängte Zeichen auffallen.
    let h2 = 0x811c9dc5 ^ text.length;
    for (let i = mix.length - 1; i >= 0; i--) {
      h2 ^= mix.charCodeAt(i);
      h2 = Math.imul(h2, 0x01000193) >>> 0;
    }
    return h.toString(36) + "-" + h2.toString(36) + "-" + text.length.toString(36);
  }

  /* ── Rohe Ablage ──────────────────────────────────────────────────────── */
  function rawRead(key) {
    try {
      const v = localStorage.getItem(NS + key);
      return v === null ? null : JSON.parse(v);
    } catch (e) { return null; }
  }
  function rawWrite(key, value) {
    try { localStorage.setItem(NS + key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }
  function rawDrop(key) {
    try { localStorage.removeItem(NS + key); } catch (e) {}
    dropCookie(key);
  }

  /* ── Cookies (zweite Ablage, überlebt das Aufräumen des localStorage) ─── */
  function setCookie(name, value, days) {
    try {
      const d = new Date(Date.now() + (days || COOKIE_DAYS) * 864e5);
      const enc = encodeURIComponent(typeof value === "string" ? value : JSON.stringify(value));
      document.cookie = "seidla_" + name + "=" + enc + "; expires=" + d.toUTCString() +
        "; path=/; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : "");
      return true;
    } catch (e) { return false; }
  }
  function getCookie(name) {
    try {
      const m = document.cookie.match(new RegExp("(?:^|; )seidla_" + name + "=([^;]*)"));
      if (!m) return null;
      const v = decodeURIComponent(m[1]);
      try { return JSON.parse(v); } catch (e) { return v; }
    } catch (e) { return null; }
  }
  function dropCookie(name) {
    try { document.cookie = "seidla_" + name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"; } catch (e) {}
  }

  /* ── Signiertes Lesen und Schreiben ───────────────────────────────────── */
  /** Legt einen Wert mit Signatur ab — im localStorage und als Cookie. */
  function put(key, value) {
    const payload = { __v: V, d: value, sig: sign(value) };
    const ok = rawWrite(key, payload);
    if (COOKIE_KEYS.indexOf(key) !== -1) putCookie(key, payload);
    return ok;
  }

  /**
   * Cookie-Ablage mit Rückfall. Ein Cookie fasst nur rund 4 KB, ein Abend
   * mit vielen Leuten deutlich mehr. Deshalb wird der Stand fürs Cookie
   * eingekürzt (siehe compactSession) und, falls selbst das zu groß ist,
   * auf das Nötigste zusammengestrichen: Runde, Leute, Einstellungen, Keim.
   * Damit findet die Runde wieder zusammen und die Aufgaben lassen sich
   * identisch neu austeilen.
   *
   * Wichtig: Es wird zurückgelesen und geprüft. Ein Cookie, das still
   * verworfen wurde, darf nicht als gesichert gelten.
   */
  function putCookie(key, payload) {
    const variants = [payload];
    if (key === "session" && payload.d) {
      const small = compactSession(payload.d);
      variants.push({ __v: V, d: small, sig: sign(small) });
      const lean = leanSession(payload.d);
      variants.push({ __v: V, d: lean, sig: sign(lean) });
    }
    for (const cand of variants) {
      setCookie(key, cand, COOKIE_DAYS);
      const back = getCookie(key);
      if (back && back.sig === cand.sig) return true;
    }
    return false;
  }

  /**
   * Kurzform des Abends fürs Cookie: Aufgabentexte fallen weg und werden
   * beim Laden aus Aufgabenkennung und Ziel neu erzeugt. Das spart den
   * größten Batzen.
   */
  function compactSession(s) {
    const tasks = {};
    Object.keys(s.assignments || {}).forEach((pid) => {
      tasks[pid] = (s.assignments[pid] || []).map((t) => {
        const o = { a: t.aid, t: t.taskId };
        if (t.target) o.g = t.target;
        if (t.points) o.n = t.points;
        if (t.level) o.l = t.level;
        if (t.type) o.y = t.type;
        if (t.confirmed) o.c = 1;
        if (t.photo) o.p = 1;
        if (t.voided) o.v = 1;
        if (t.flagBy && t.flagBy.length) o.f = t.flagBy;
        if (t.at) o.z = t.at;
        return o;
      });
    });
    return {
      c: s.groupCode || null, g: s.groupName || null, s: s.seed || null,
      md: s.mode, r: s.role, ph: s.phase, m: s.modeId || null,
      st: s.settings || null, v: s.players || [], rg: s.ring || [],
      sq: s.sidequests || [], pr: s.proposals || [], rv: s.reviews || {},
      a: tasks, at: s.at || now(),
    };
  }

  /** Nur das Nötigste: Runde, Leute, Einstellungen, Keim. Keine Aufgaben. */
  function leanSession(s) {
    return {
      c: s.groupCode || null, g: s.groupName || null, s: s.seed || null,
      md: s.mode, r: s.role, ph: s.phase, m: s.modeId || null,
      st: s.settings || null, v: s.players || [], at: s.at || now(), lean: 1,
    };
  }

  /**
   * Kurzform wieder zu einem vollen Abend machen. Die Aufgabentexte
   * entstehen hier neu — aus Aufgabenkennung, Ziel und Keim, also genau so,
   * wie sie beim Austeilen entstanden sind.
   */
  function expandSession(c) {
    if (!c) return null;
    const players = c.v || [];
    const nameOf = (pid) => { const p = players.find((x) => x.id === pid); return p ? p.name : "jemand"; };
    const assignments = {};
    Object.keys(c.a || {}).forEach((pid) => {
      assignments[pid] = (c.a[pid] || []).map((o) => {
        const base = SS.tasks ? SS.tasks.taskById(o.t) : null;
        const rng = SS.seededRng(String(c.s || "seidla") + ":" + o.a);
        const text = base
          ? SS.assign.render(base.text, o.g ? nameOf(o.g) : null, rng)
          : "(Aufgabe nicht mehr im Katalog)";
        return {
          aid: o.a, taskId: o.t, type: o.y || (base ? base.type : "quatsch"),
          level: o.l || (base ? base.level : 1),
          target: o.g || null, points: o.n || 1, text: text,
          done: !!o.p, at: o.z || null,
          photo: o.p ? "gerettet:" + o.a : null,
          confirmed: !!o.c, voided: !!o.v, flagged: (o.f || []).length, flagBy: o.f || [],
        };
      });
    });
    return {
      groupCode: c.c, groupName: c.g, seed: c.s, mode: c.md, role: c.r,
      phase: c.ph, modeId: c.m, settings: c.st, players: players, ring: c.rg || [],
      sidequests: c.sq || [], proposals: c.pr || [], reviews: c.rv || {},
      assignments: assignments, at: c.at, recovered: true,
    };
  }

  /** Erkennt die Kurzform und macht daraus einen vollen Abend. */
  function normalizeSession(s) {
    if (!s) return null;
    if (s.a !== undefined || s.lean) return expandSession(s);
    return s;
  }

  /**
   * Liest einen Wert und prüft die Signatur. Stimmt sie nicht, wird der Wert
   * verworfen und aus der zweiten Ablage (Cookie) versucht.
   */
  function get(key, fallback) {
    const tries = [];
    const local = rawRead(key);
    if (local) tries.push({ from: "local", obj: local });
    if (COOKIE_KEYS.indexOf(key) !== -1) {
      const c = getCookie(key);
      if (c) tries.push({ from: "cookie", obj: c });
    }
    for (const t of tries) {
      const obj = t.obj;
      if (!obj || typeof obj !== "object") continue;
      if (obj.__v !== V) continue;
      if (obj.sig !== sign(obj.d)) {
        // Verfälscht oder aus einer anderen Sitzung. Nicht übernehmen.
        SS.emit("tamper", key);
        continue;
      }
      // Die zweite Ablage nachziehen, falls sie leer oder alt war.
      if (t.from === "cookie" && !local) rawWrite(key, obj);
      if (t.from === "local" && COOKIE_KEYS.indexOf(key) !== -1 && !getCookie(key)) putCookie(key, obj);
      const val = obj.d === undefined ? fallback : obj.d;
      return key === "session" ? (normalizeSession(val) || fallback) : val;
    }
    return fallback;
  }

  function drop(key) {
    rawDrop(key);
  }
  function available() {
    try {
      const k = NS + "__probe";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  }
  function cookiesAvailable() {
    try { setCookie("__probe", "1", 1); const ok = getCookie("__probe") !== null; dropCookie("__probe"); return ok; }
    catch (e) { return false; }
  }

  const uid = (n) => SS.uid(n || 10);
  const now = () => Date.now();

  /* ── Profil ───────────────────────────────────────────────────────────── */
  const DEFAULT_PROFILE = { name: "", color: null, seen: false };

  function loadProfile() {
    return Object.assign({}, DEFAULT_PROFILE, get("profile", {}));
  }
  function saveProfile(patch) {
    const p = Object.assign(loadProfile(), patch || {});
    put("profile", p);
    return p;
  }

  /* ── Gruppe ───────────────────────────────────────────────────────────── */
  /**
   * Eine Gruppe hält den Namen der Runde, den Code und die Mitgliederliste,
   * damit sie nach einem Neustart oder einer Nacht ohne Netz wieder auftaucht.
   */
  function saveGroup(g) {
    if (!g || !g.code) return null;
    const cur = loadGroup();
    const merged = Object.assign({}, cur || {}, g, {
      members: g.members || (cur ? cur.members : []),
      createdAt: (cur && cur.createdAt) || g.createdAt || now(),
      updatedAt: now(),
    });
    put("group", merged);
    return merged;
  }
  function loadGroup() {
    const g = get("group", null);
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
        id: p.id, name: p.name, color: p.color, isHost: !!p.isHost,
        firstSeen: (old && old.firstSeen) || now(),
        lastSeen: now(),
        visits: ((old && old.visits) || 0) + (old ? 0 : 1),
      };
    });
    return saveGroup(Object.assign({}, g, { members: members, name: opts.name || g.name }));
  }
  function clearGroup() { drop("group"); }

  /* ── Laufender Abend ──────────────────────────────────────────────────── */
  function snapshot(state) {
    return {
      groupCode: state.code || null,
      groupName: state.groupName || (loadGroup() || {}).name || null,
      mode: state.mode,
      role: state.role,
      phase: state.phase,
      endedAt: state.endedAt || null,
      seed: state.seed,
      modeId: state.settings && state.settings.modeId,
      ring: state.ring,
      players: state.players,
      assignments: state.assignments,
      sidequests: state.sidequests,
      proposals: state.proposals,
      settings: state.settings,
      reviews: state.reviews,
      at: now(),
    };
  }
  function saveSession(state) {
    if (!state || (!state.seed && !state.code)) return;
    if (state.phase === "lobby") return;
    put("session", snapshot(state));
  }
  function loadSession() { return get("session", null); }
  function clearSession() { drop("session"); }

  /* ── Ausgangskorb ─────────────────────────────────────────────────────── */
  function outbox() { return get("outbox", []); }
  function queue(evt) {
    const list = outbox();
    const entry = Object.assign({ id: uid(12), at: now() }, evt);
    list.push(entry);
    if (list.length > 400) list.splice(0, list.length - 400);
    put("outbox", list);
    SS.emit("outbox");
    return entry;
  }
  function clearOutbox(ids) {
    if (!ids || !ids.length) put("outbox", []);
    else {
      const kill = {}; ids.forEach((i) => (kill[i] = true));
      put("outbox", outbox().filter((e) => !kill[e.id]));
    }
    SS.emit("outbox");
  }
  function outboxCount() { return outbox().length; }

  /* ── Chat ─────────────────────────────────────────────────────────────── */
  /**
   * Der Spielchat: alle reden miteinander. Er liegt am Gerät, damit er
   * einen Verbindungsabbruch übersteht.
   */
  function chat() { return get("chat", []); }
  function addChat(entry) {
    const list = chat();
    const line = Object.assign({ id: uid(10), at: now() }, entry);
    // Doppelte Einträge vermeiden (eigene Nachricht kommt vom Host zurück).
    if (list.some((x) => x.id === line.id)) return line;
    list.push(line);
    if (list.length > 400) list.splice(0, list.length - 400);
    put("chat", list);
    SS.emit("chat");
    return line;
  }
  function clearChat() { put("chat", []); SS.emit("chat"); }

  /* ── Wirtshaus-Chronik ────────────────────────────────────────────────── */
  function chronicle() { return get("chronicle", []); }
  function addChronicle(entry) {
    const list = chronicle();
    list.unshift(Object.assign({ id: uid(10), at: now() }, entry));
    if (list.length > 500) list.length = 500;
    put("chronicle", list);
    SS.emit("chronicle");
    return list[0];
  }
  function chronicleFor(groupCode) {
    return chronicle().filter((e) => !groupCode || !e.groupCode || e.groupCode === groupCode);
  }
  function clearChronicle() { put("chronicle", []); SS.emit("chronicle"); }

  function tally() {
    const list = chronicle();
    const byName = {};
    list.forEach((e) => {
      if (!e.who || e.group) return;
      const k = e.who;
      const t = (byName[k] = byName[k] || { name: k, tasks: 0, points: 0, sidequests: 0 });
      if (e.type === "aufgabe") t.tasks++;
      if (e.type === "sidequest") t.sidequests++;
      t.points += e.points || 0;
    });
    return Object.keys(byName).map((k) => byName[k]).sort((a, b) => b.points - a.points);
  }

  /* ── Fotoalbum ────────────────────────────────────────────────────────── */
  function album() { return get("album", []); }
  /**
   * Ein Bild ins Album legen. Die Kennung ist die Aufgaben-Kennung, damit
   * dasselbe Bild auf jedem Gerät denselben Platz hat und ein erneutes
   * Einstellen das alte ersetzt statt es doppelt zu führen.
   */
  function addPhoto(entry) {
    const list = album();
    const rec = Object.assign({ id: entry.aid || uid(12), at: now() }, entry);
    const at = list.findIndex((p) => p.id === rec.id);
    if (at !== -1) list.splice(at, 1);
    list.unshift(rec);
    if (list.length > 240) list.length = 240;
    if (!put("album", list)) {
      // Speicher voll: die ältesten Bilder opfern, damit der Abend weiterläuft.
      list.splice(Math.max(0, list.length - 80));
      put("album", list);
      SS.toast("Gerätespeicher fast voll — die ältesten Bilder wurden entfernt.", "err");
    }
    SS.emit("album");
    return rec;
  }
  function photosOf(groupCode) {
    return album().filter((p) => !groupCode || !p.groupCode || p.groupCode === groupCode);
  }
  function photoOf(pid) { return album().filter((p) => p.pid === pid); }
  /** Das Bild zu einer Aufgabe. Der Album-Platz ist die Aufgaben-Kennung. */
  function photoByAid(aid) { return album().find((p) => p.aid === aid) || null; }
  /** Kennungen aller Bilder einer Runde — für den Abgleich zwischen Geräten. */
  function photoKeys(groupCode) {
    return photosOf(groupCode).map((p) => p.aid).filter(Boolean);
  }
  function dropPhoto(id) {
    put("album", album().filter((p) => p.id !== id));
    SS.emit("album");
  }
  function clearAlbum() { put("album", []); SS.emit("album"); }

  /* ── Aufräumen ────────────────────────────────────────────────────────── */
  function wipe() {
    ["group", "session", "outbox", "chronicle", "album", "profile", "chat", "reviews"].forEach(drop);
    SS.emit("outbox"); SS.emit("chronicle"); SS.emit("album"); SS.emit("chat");
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
    return { bytes, kb: Math.round(bytes / 1024), ok: available(), cookies: cookiesAvailable() };
  }

  SS.store = {
    available, cookiesAvailable, read: get, write: put, drop,
    sign, deviceKey,
    loadProfile, saveProfile,
    saveGroup, loadGroup, touchMembers, clearGroup,
    snapshot, saveSession, loadSession, clearSession,
    outbox, queue, clearOutbox, outboxCount,
    chat, addChat, clearChat,
    chronicle, addChronicle, chronicleFor, clearChronicle, tally,
    album, addPhoto, photosOf, photoOf, photoByAid, photoKeys, dropPhoto, clearAlbum,
    wipe, usage,
  };
})();
