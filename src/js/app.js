/* ==========================================================================
   Seidla — Kern
   Namensraum, Hilfsfunktionen, Zustand, Abendlogik.

   Der Abend besteht aus Aufgaben, die jeder mit einem Foto nachweist, und
   aus Sidequests, die die Runde selbst vorschlägt. Am Ende bewertet die
   Runde die Nachweise; schlechte Ergebnisse können ungültig gemacht werden.
   ========================================================================== */
window.SS = (function () {
  "use strict";

  /* ── Kurzhelfer ───────────────────────────────────────────────────────── */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === null || v === undefined || v === false) continue;
        if (k === "class") node.className = v;
        else if (k === "text") node.textContent = v;
        else if (k === "html") node.innerHTML = v;
        else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
        else if (k === "dataset") Object.assign(node.dataset, v);
        else if (k === "value" && "value" in node) node.value = v;
        else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? "" : String(v));
      }
    }
    appendChildren(node, children);
    return node;
  }
  function appendChildren(node, children) {
    if (children === null || children === undefined || children === false) return;
    if (Array.isArray(children)) return children.forEach((c) => appendChildren(node, c));
    if (children instanceof Node) return node.appendChild(children);
    node.appendChild(document.createTextNode(String(children)));
  }
  const frag = (children) => {
    const f = document.createDocumentFragment();
    appendChildren(f, children);
    return f;
  };
  const esc = (s) =>
    String(s === undefined || s === null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  /* ── Zufall & Kennungen ───────────────────────────────────────────────── */
  function shuffle(arr, rndFn) {
    const a = arr.slice();
    const r = rndFn || Math.random;
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  // deterministischer Zufall aus Text (für gemeinsames Austeilen im Netzwerk)
  function seededRng(seedStr) {
    let h = 1779033703 ^ String(seedStr).length;
    for (let i = 0; i < String(seedStr).length; i++) {
      h = Math.imul(h ^ String(seedStr).charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    let a = h >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const uid = (n) => {
    const s = "abcdefghijklmnopqrstuvwxyz0123456789";
    let out = "";
    for (let i = 0; i < (n || 8); i++) out += s[Math.floor(Math.random() * s.length)];
    return out;
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pick = (arr, rndFn) => arr[Math.floor((rndFn || Math.random)() * arr.length)];

  /* ── Farben & Abzeichen ───────────────────────────────────────────────── */
  const PALETTE = ["#35507d", "#a4262c", "#2f6b4f", "#c99a3a", "#5b4a86", "#256b6b", "#b2622a", "#7d3f6b", "#3c6e9a", "#8a6a1f"];
  const colorFor = (idx) => PALETTE[idx % PALETTE.length];
  const initial = (name) => (String(name || "?").trim()[0] || "?").toUpperCase();

  /* ── Hinweise (Toast) & Dialog ────────────────────────────────────────── */
  function toast(msg, kind) {
    const root = $("#toastRoot");
    if (!root) return;
    const t = el("div", { class: "toast " + (kind || ""), text: msg });
    root.appendChild(t);
    setTimeout(() => {
      t.style.transition = "opacity .3s ease";
      t.style.opacity = "0";
      setTimeout(() => t.remove(), 320);
    }, kind === "err" ? 4200 : 2900);
  }

  function modal(title, bodyNode, actions) {
    const root = $("#modalRoot");
    root.hidden = false;
    root.innerHTML = "";
    const box = el("div", { class: "modal", role: "dialog", "aria-modal": "true" });
    box.appendChild(el("h2", { text: title }));
    box.appendChild(bodyNode);
    const act = el("div", { class: "modal-actions" });
    (actions || [{ label: "Zumachen" }]).forEach((a) => {
      // Ein fertiger Knopf darf auch direkt übergeben werden — dann kann der
      // Dialog selbst Fortschritt und Sperre daran hängen.
      if (a.node) { act.appendChild(a.node); return; }
      act.appendChild(
        el("button", {
          class: "btn " + (a.kind === "primary" ? "btn-gold" : a.kind === "danger" ? "btn-danger" : "btn-outline"),
          text: a.label,
          onclick: () => { if (!a.onClick || a.onClick() !== false) closeModal(); },
        })
      );
    });
    box.appendChild(act);
    root.appendChild(box);
    const onBackdrop = (e) => { if (e.target === root) closeModal(); };
    root.addEventListener("click", onBackdrop);
    root._cleanup = () => root.removeEventListener("click", onBackdrop);
    return box;
  }
  function closeModal() {
    const root = $("#modalRoot");
    if (root._cleanup) root._cleanup();
    root.hidden = true;
    root.innerHTML = "";
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#modalRoot").hidden) closeModal(); });

  /* ── Zeichenroutine (wird von ui.js gesetzt) ──────────────────────────── */
  let renderFn = function () {};
  const setRenderCurrent = (fn) => { renderFn = fn; };
  const renderCurrent = () => renderFn();

  /* ── Netzwerkschicht (wird von net.js befüllt) ────────────────────────── */
  const net = {
    init: () => Promise.resolve(false),
    sendToHost: () => false,
    broadcastState: () => false,
    broadcast: () => false,
    createGroup: () => Promise.reject(new Error("Netzwerk nicht geladen")),
    joinGroup: () => Promise.reject(new Error("Netzwerk nicht geladen")),
    leave: () => {},
    available: () => false,
    setStatus: () => {},
  };

  /* ── Anwendungszustand ────────────────────────────────────────────────── */
  const state = {
    route: "home",
    // Netzwerk
    mode: "local",            // 'local' | 'online'
    role: "solo",             // 'host' | 'guest' | 'solo'
    code: null,
    connection: "offline",    // 'offline' | 'connecting' | 'online' | 'lost'
    pending: false,
    // Teilnehmer
    players: [],
    hostId: null,
    me: null,
    // Abend
    phase: "lobby",           // 'lobby' | 'running' | 'review' | 'over'
    groupName: "Wirtshausrunde",
    seed: null,
    ring: [],
    assignments: {},
    sidequests: [],
    proposals: [],
    settings: {
      perPlayer: 7,
      modeId: "entspannt",
      maxLevel: 1,
      types: null,            // null = alle Kategorien des Modus
      sidequests: true,
      chat: true,
      review: true,           // Gesamtwertung am Ende
      hostOverride: true,     // Wirt darf Wertung unterbinden
      confirmMode: "self",    // Jeder hakt seine eigene Aufgabe selbst ab.
    },
    reviews: {},              // aid -> { ok:[pid], bad:[pid] }
    endedAt: null,            // wann der Wirt den Abend beendet hat
    log: [],
  };

  const listeners = {};
  const on = (evt, fn) => { (listeners[evt] = listeners[evt] || []).push(fn); };
  const emit = (evt, payload) => {
    if (evt !== "render") (listeners[evt] || []).forEach((f) => f(payload));
    (listeners["*"] || []).forEach((f) => f(evt, payload));
  };

  const player = (pid) => state.players.find((p) => p.id === pid) || null;
  const alive = () => state.players.filter((p) => p.connected !== false);
  const myPid = () => state.me;
  const isHost = () => state.role === "host" || state.role === "solo";
  const connectedCount = () => alive().length;
  const nameOf = (pid) => { const p = player(pid); return p ? p.name : "jemand"; };

  function logLine(text, kind) {
    state.log.push({ t: Date.now(), text: String(text), kind: kind || "" });
    if (state.log.length > 200) state.log.shift();
    emit("log", state.log[state.log.length - 1]);
  }

  /* ── Teilnehmerverwaltung ─────────────────────────────────────────────── */
  function addPlayer(name, opts) {
    opts = opts || {};
    const idx = state.players.length;
    const p = {
      id: opts.id || uid(8),
      name: String(name || "Gast").slice(0, 22),
      color: opts.color || colorFor(idx),
      connected: opts.connected !== false,
      isHost: !!opts.isHost,
      index: idx,
      joinedAt: Date.now(),
    };
    state.players.push(p);
    if (p.isHost) state.hostId = p.id;
    return p;
  }
  function removePlayer(pid) {
    const p = player(pid);
    if (p) p.connected = false;
  }

  /* ══ Der Abend ══════════════════════════════════════════════════════════ */

  const tasksOf = (pid) => state.assignments[pid] || [];
  function findTask(pid, aid) { return tasksOf(pid).find((t) => t.aid === aid) || null; }
  function findTaskAnywhere(aid) {
    for (const pid in state.assignments) {
      const t = tasksOf(pid).find((x) => x.aid === aid);
      if (t) return { pid: pid, task: t };
    }
    return null;
  }

  /**
   * Ist diese Aufgabe ungültig? Das passiert, wenn die Runde sie am Ende
   * mehrheitlich ablehnt und der Wirt die Übersteuerung nicht nutzt.
   */
  const isVoid = (t) => !!t.voided;

  /** Punkte einer Person: gültige Aufgaben plus geschaffte Sidequests. */
  function pointsOf(pid) {
    let n = tasksOf(pid).reduce((sum, t) => sum + (t.confirmed && !isVoid(t) ? t.points : 0), 0);
    (state.sidequests || []).forEach((q) => {
      if (q.done && q.done[pid] && !q.done[pid].voided) n += (q.done[pid].points || 2);
    });
    return n;
  }
  function sidequestsDone(pid) {
    return (state.sidequests || []).filter((q) => q.done && q.done[pid] && !q.done[pid].voided).length;
  }
  function doneCount(pid) {
    const list = tasksOf(pid);
    return {
      done: list.filter((t) => t.confirmed && !isVoid(t)).length,
      open: list.filter((t) => !t.confirmed || isVoid(t)).length,
      total: list.length,
    };
  }

  /**
   * Ein Bild ist angekommen — die Aufgabe gilt damit als nachgewiesen.
   * Läuft auf jedem Gerät: am Absender, am Wirt und bei allen anderen.
   * Bewusst mehrfach aufrufbar, das Bild kann über mehrere Wege eintreffen.
   */
  function notePhoto(pid, aid, meta) {
    meta = meta || {};
    if (String(aid).indexOf("sq:") === 0) {
      const sq = state.sidequests.find((x) => x.id === String(aid).slice(3));
      if (!sq) return false;
      sq.done = sq.done || {};
      if (sq.done[pid]) return true;
      sq.done[pid] = { photo: aid, at: Date.now(), points: sq.points || 2, voided: false };
      if (SS.store) SS.store.addChronicle({
        type: "sidequest", groupCode: state.code || null, group: !!state.code,
        who: nameOf(pid), task: sq.text, points: sq.points || 2, game: state.groupName,
      });
      logLine(nameOf(pid) + " hat eine Sidequest geschafft (+" + (sq.points || 2) + ").", "ok");
      return true;
    }
    const t = findTask(pid, aid);
    if (!t) return false;
    if (t.photo === aid && t.done) return true;
    t.photo = aid;
    t.at = Date.now();
    t.done = true;
    // Neuer Nachweis: alte Bewertungen gelten nicht mehr.
    t.flagBy = []; t.voided = false;
    state.reviews[aid] = { ok: [], bad: [] };
    logLine(nameOf(pid) + " hat einen Nachweis gebracht.", "ok");
    return true;
  }

  const photoFor = (aid) => (SS.store ? SS.store.photoByAid(aid) : null);

  /** Foto zur Aufgabe hinterlegen. Ohne Bild gilt eine Aufgabe nicht. */
  function attachPhoto(pid, aid, data) {
    const t = findTask(pid, aid);
    if (!t) { toast("Die Aufgabe gibt's ned.", "err"); return false; }
    if (t.confirmed) { toast("Is scho abgehakt.", "err"); return false; }
    if (!data) { toast("Ohne Bild geht's ned.", "err"); return false; }
    SS.store.addPhoto({
      aid: aid, pid: pid, data: data, taskId: t.taskId,
      who: nameOf(pid), groupCode: state.code || null, text: t.text,
    });
    notePhoto(pid, aid);
    // Das Bild an die Runde verteilen, damit es im Album aller auftaucht.
    if (SS.net && state.mode === "online") SS.net.sendPhoto(aid, pid, data);
    return true;
  }

  /** Eine Aufgabe abhaken — nur mit Foto. */
  function confirmTask(pid, aid, byHost) {
    const t = findTask(pid, aid);
    if (!t) return false;
    if (t.confirmed) return false;
    if (!t.photo) { toast("Ohne Foto wird des nix.", "err"); return false; }
    t.confirmed = true;
    t.confirmedAt = Date.now();
    t.confirmedBy = byHost ? "wirt" : "selbst";
    if (SS.store) SS.store.addChronicle({
      type: "aufgabe", groupCode: state.code || null, group: !!state.code,
      who: nameOf(pid), task: t.text, points: t.points, game: state.groupName,
    });
    logLine(nameOf(pid) + " hat eine Aufgabe abgehakt (+" + t.points + ").", "ok");
    return true;
  }

  function rejectTask(pid, aid, reason) {
    const t = findTask(pid, aid);
    if (!t) return false;
    const rec = t.photo ? SS.store.album().find((p) => p.id === t.photo) : null;
    if (rec) SS.store.dropPhoto(rec.id);
    t.photo = null; t.done = false; t.at = null;
    logLine("Nachweis von " + nameOf(pid) + " wurde abgelehnt" + (reason ? ": " + reason : "."));
    return true;
  }

  /* ── Sidequests ───────────────────────────────────────────────────────── */
  function takeSidequest(pid, sid) {
    const sq = state.sidequests.find((s) => s.id === sid);
    if (!sq) return false;
    if ((sq.takenBy || []).indexOf(pid) !== -1) return false;
    sq.takenBy = (sq.takenBy || []).concat([pid]);
    logLine(nameOf(pid) + " nimmt sich eine Sidequest.", "ok");
    return true;
  }

  function finishSidequest(pid, sid, data) {
    const sq = state.sidequests.find((s) => s.id === sid);
    if (!sq) return false;
    sq.done = sq.done || {};
    if (sq.done[pid]) { toast("Is scho erledigt.", "err"); return false; }
    if (!data) { toast("Ohne Bild geht's ned.", "err"); return false; }
    const rec = SS.store.addPhoto({
      aid: "sq:" + sid, pid: pid, data: data, who: nameOf(pid),
      groupCode: state.code || null, text: sq.text, sidequest: true,
    });
    sq.done[pid] = { photo: rec.id, at: Date.now(), points: sq.points || 2, voided: false };
    if (SS.store) SS.store.addChronicle({
      type: "sidequest", groupCode: state.code || null, group: !!state.code,
      who: nameOf(pid), task: sq.text, points: sq.points || 2, game: state.groupName,
    });
    logLine(nameOf(pid) + " hat eine Sidequest geschafft (+" + (sq.points || 2) + ").", "ok");
    return true;
  }

  function proposeSidequest(pid, text) {
    const t = String(text || "").trim().slice(0, 140);
    if (t.length < 6) { toast("Des is a bissla kurz.", "err"); return false; }
    state.proposals.push({ id: uid(8), text: t, by: pid, at: Date.now(), status: "offen" });
    logLine(nameOf(pid) + " hat eine Sidequest vorgeschlagen.", "ok");
    return true;
  }

  /** Vorschlag freigeben: wird zur Sidequest und bekommt eine zufällige Person. */
  function approveProposal(id) {
    const i = state.proposals.findIndex((p) => p.id === id);
    if (i === -1) return false;
    const p = state.proposals[i];
    const rng = seededRng((state.seed || "seidla") + ":sq:" + p.id);
    const pool = alive().map((x) => x.id);
    const drawn = pool.length ? pool[Math.floor(rng() * pool.length)] : null;
    state.sidequests.push({
      id: uid(8), text: p.text, points: 2, by: p.by, drawn: drawn,
      takenBy: [], done: {}, at: Date.now(),
    });
    state.proposals[i].status = "freigegeben";
    logLine("Sidequest freigegeben: " + p.text + (drawn ? " — gezogen: " + nameOf(drawn) : ""), "ok");
    return true;
  }
  function rejectProposal(id) {
    const i = state.proposals.findIndex((p) => p.id === id);
    if (i === -1) return false;
    state.proposals[i].status = "abgelehnt";
    return true;
  }

  /** Aufgaben für alle austeilen. Nur der Wirt. */
  function dealTasks() {
    const res = SS.assign.deal(state.players, {
      perPlayer: state.settings.perPlayer,
      modeId: state.settings.modeId,
      maxLevel: state.settings.maxLevel,
      types: state.settings.types,
      seed: state.seed,
    });
    state.assignments = res.byPlayer;
    state.ring = res.ring;
    state.phase = "running";
    state.sidequests = state.sidequests || [];
    state.proposals = [];
    state.reviews = {};
    const lonely = SS.assign.lonelyPlayers(state.players, res.byPlayer);
    if (lonely.length) logLine("Achtung: " + lonely.map(nameOf).join(", ") + " bekommt keinen Besuch ab.", "err");
    const mode = SS.tasks.modeById(state.settings.modeId);
    logLine("Aufgaben ausgeteilt: " + alive().length + " Leut, " + state.settings.perPlayer +
      " pro Person, Modus «" + mode.name + "».", "ok");
    if (SS.store) SS.store.addChronicle({
      type: "abend", groupCode: state.code || null, group: true,
      who: null, game: state.groupName,
      task: "Aufgaben ausgeteilt (" + alive().length + " Leut, " + mode.name + ")",
    });
    // Der neue Stand muss raus, sonst sitzen die Gäste ohne Aufgaben da.
    if (isHost()) {
      sync();
      if (state.mode === "online") net.broadcast({ t: "deal" });
    }
  }

  /* ── Gesamtwertung ────────────────────────────────────────────────────── */
  /**
   * Am Ende bewertet die Runde die Nachweise. Jeder bestätigte Nachweis kann
   * von den Mitspielern als "gilt" oder "gilt nicht" bewertet werden. Kippt
   * die Mehrheit auf "gilt nicht", wird die Aufgabe ungültig und die Punkte
   * sind weg.
   *
   * Der Wirt kann das übersteuern: er kann eine Wertung aussetzen oder eine
   * Aufgabe wieder gültig machen. Damit hängt niemand von einer Laune ab.
   */
  function startReview() {
    state.phase = "review";
    state.reviews = state.reviews || {};
    logLine("Die Gesamtwertung läuft. Jeder bewertet die Nachweise der anderen.", "ok");
    if (isHost()) { sync(); if (state.mode === "online") net.broadcast({ t: "review" }); }
    return true;
  }

  function reviewOf(aid) {
    if (!state.reviews[aid]) state.reviews[aid] = { ok: [], bad: [] };
    return state.reviews[aid];
  }

  /** Bewertung abgeben: ok = gilt, bad = gilt nicht. */
  function rate(pid, aid, verdict) {
    const found = findTaskAnywhere(aid);
    if (!found) return false;
    const t = found.task;
    if (!t.confirmed) { toast("Erst wenn der Nachweis freigegeben ist.", "err"); return false; }
    if (found.pid === pid) { toast("Die eigene Aufgabe bewertet man nicht.", "err"); return false; }
    const r = reviewOf(aid);
    r.ok = r.ok.filter((x) => x !== pid);
    r.bad = r.bad.filter((x) => x !== pid);
    if (verdict === "ok") r.ok.push(pid); else r.bad.push(pid);
    // Schwelle: ein Drittel der Runde, mindestens zwei Stimmen.
    const need = Math.max(2, Math.ceil(alive().length / 3));
    t.flagBy = r.bad;
    t.flagged = r.bad.length;
    if (r.bad.length >= need && !state.settings.hostOverride) {
      t.voided = true;
      logLine("Aufgabe von " + nameOf(found.pid) + " wurde für ungültig erklärt.", "err");
    } else if (r.bad.length >= need) {
      logLine("Aufgabe von " + nameOf(found.pid) + " hat genug Gegenstimmen — der Wirt entscheidet.", "err");
    }
    return true;
  }

  /** Wirt: eine beanstandete Aufgabe für ungültig erklären oder retten. */
  function setVoid(pid, aid, voided) {
    const t = findTask(pid, aid);
    if (!t) return false;
    t.voided = !!voided;
    logLine((voided ? "Der Wirt erklärt eine Aufgabe für ungültig: " : "Der Wirt rettet eine Aufgabe: ") + t.text);
    return true;
  }
  /** Wirt: Wertung komplett aussetzen — nichts wird ungültig. */
  function clearFlags(pid, aid) {
    const t = findTask(pid, aid);
    if (!t) return false;
    t.flagBy = []; t.flagged = 0; t.voided = false;
    state.reviews[aid] = { ok: [], bad: [] };
    logLine("Der Wirt setzt die Beanstandungen zurück.");
    return true;
  }

  /* ── Abend beenden ────────────────────────────────────────────────────── */
  /**
   * Der Wirt beendet den Abend. Das ist mehr als ein Schalter: Der Stand
   * wird eingefroren (damit das Ergebnis feststeht), im Speicher festgehalten
   * und an alle Geräte verteilt. Danach sieht jeder die Abschlussansicht mit
   * Endstand — auch wer erst später wieder Netz hat.
   */
  function endEvening() {
    if (state.phase === "over") return false;
    state.phase = "over";
    state.endedAt = Date.now();
    state.route = "end";
    logLine("Der Wirt hat den Abend beendet.", "ok");
    if (SS.store) SS.store.addChronicle({
      type: "ende", groupCode: state.code || null, group: !!state.code,
      who: null, game: state.groupName,
      task: "Abend beendet (" + alive().length + " Leut, " + allProofs().length + " Nachweise)",
    });
    persist();
    if (isHost()) {
      sync();
      if (state.mode === "online") net.broadcast({ t: "closed", endedAt: state.endedAt });
    }
    return true;
  }

  /** Zurück in den laufenden Abend — falls zu früh beendet wurde. */
  function reopenEvening() {
    if (state.phase !== "over") return false;
    state.phase = "review";
    state.endedAt = null;
    logLine("Der Wirt hat den Abend wieder aufgemacht.", "");
    persist();
    if (isHost()) {
      sync();
      if (state.mode === "online") net.broadcast({ t: "review" });
    }
    return true;
  }

  /** Kennzahlen für die Abschlussansicht. */
  function summary() {
    const r = ranking();
    const tasks = Object.values(state.assignments).reduce((n, a) => n + a.length, 0);
    const confirmed = Object.values(state.assignments).reduce((n, a) => n + a.filter((t) => t.confirmed && !isVoid(t)).length, 0);
    const voided = Object.values(state.assignments).reduce((n, a) => n + a.filter((t) => t.voided).length, 0);
    const sidequests = state.sidequests.filter((q) => Object.keys(q.done || {}).length).length;
    return {
      players: alive().length,
      tasks: tasks,
      confirmed: confirmed,
      voided: voided,
      sidequests: sidequests,
      proofs: allProofs().length,
      best: r[0] || null,
      ranking: r,
      endedAt: state.endedAt,
    };
  }

  /** Die Abschlusszeilen — auch als Text zum Verschicken. */
  function buildSummary() {
    const s = summary();
    const L = [];
    L.push("SEIDLA — Ende des Abends");
    L.push("Runde: " + state.groupName + (state.code ? " (" + state.code + ")" : ""));
    if (s.endedAt) L.push("Beendet: " + new Date(s.endedAt).toLocaleString("de-DE"));
    L.push("");
    L.push(s.players + " Leut · " + s.confirmed + " von " + s.tasks + " Aufgaben erledigt · " + s.proofs + " Nachweise");
    if (s.sidequests) L.push(s.sidequests + " Sidequests geschafft");
    if (s.voided) L.push(s.voided + " Aufgabe(n) für ungültig erklärt");
    L.push("");
    if (s.ranking.length) {
      L.push("ENDSTAND");
      s.ranking.forEach((x, i) => {
        L.push((i + 1) + ". " + x.name + " — " + x.points + " Punkte" + (x.done ? " (" + x.done + "/" + x.total + ")" : ""));
      });
      L.push("");
      L.push("Glückwunsch an " + s.ranking[0].name + "!");
    }
    return L.join("\n");
  }

  /** Welche Aufgaben stehen zur Bewertung? Alles Bestätigte. */
  function reviewable(exceptPid) {
    const out = [];
    Object.keys(state.assignments).forEach((pid) => {
      if (pid === exceptPid) return;
      tasksOf(pid).forEach((t) => { if (t.confirmed) out.push({ pid: pid, task: t }); });
    });
    return out;
  }

  /* ── Chat ─────────────────────────────────────────────────────────────── */
  /**
   * Der Spielchat. Alle Nachrichten laufen über den Wirt, damit auch Gäste
   * untereinander schreiben können. Ohne Netz wandert die Nachricht in den
   * Ausgangskorb und kommt später an.
   */
  function sendChat(text) {
    const msg = String(text || "").trim().slice(0, 200);
    if (!msg) return false;
    const pid = state.mode === "online" ? state.me : (state.players[0] && state.players[0].id);
    const from = nameOf(pid) || "Gast";
    const id = uid(10);
    if (SS.store) SS.store.addChat({ id: id, pid: pid, from: from, text: msg, at: Date.now(), own: true });
    if (state.mode === "online" && state.role === "guest") {
      if (!net.sendToHost({ t: "chat", id: id, text: msg, from: from })) {
        state.pending = true;
        if (SS.store) SS.store.queue({ kind: "chat", text: msg, from: from, id: id, at: Date.now() });
        toast("Kein Netz — die Nachricht geht später raus.", "err");
      }
    } else if (state.mode === "online" && state.role === "host") {
      net.broadcast({ t: "chat", id: id, text: msg, from: from });
    }
    emit("chat");
    return true;
  }
  /** Eingehende Chatzeile (vom Wirt oder von einem Gast) ablegen. */
  function receiveChat(line) {
    if (!SS.store) return;
    SS.store.addChat(line);
    emit("chat");
  }

  /* ── Netzwerkaktionen ─────────────────────────────────────────────────── */
  function act(name, payload) {
    const pid = state.mode === "online" ? state.me : (state.players[0] && state.players[0].id) || null;
    actAs(pid, name, payload);
  }
  function actAs(pid, name, payload) {
    if (!pid) { toast("Kein Teilnehmer angemeldet.", "err"); return; }
    if (state.mode === "online" && state.role === "guest") {
      if (pid !== state.me) { toast("Nur eigene Sachen sind möglich.", "err"); return; }
      // Foto-Aktionen enthalten ein Bild und sind zu groß für eine Nachricht.
      // Sie laufen am Gerät, das Bild geht als eigene Stücke raus (attachPhoto).
      // Der Wirt erfährt davon über die Bildstücke selbst.
      if (payload && payload.data) { applyAction(pid, name, payload); return; }
      if (!net.sendToHost({ t: "act", pid: pid, name: name, payload: payload })) {
        state.pending = true;
        if (SS.store) SS.store.queue({ kind: "aktion", action: name, payload: payload, pid: pid, at: Date.now() });
        // Ohne Netz trotzdem am eigenen Gerät ausführen, damit sofort sichtbar
        // ist, dass es geklappt hat. Beim nächsten Kontakt schickt der Wirt
        // seinen verbindlichen Stand nach und überschreibt das wieder.
        applyAction(pid, name, payload);
        toast("Kein Netz — am Gerät gespeichert, wird nachgereicht.", "err");
      }
    } else {
      applyAction(pid, name, payload);
    }
  }

  /** Die zentralen Abend-Aktionen. */
  function applyAction(pid, name, payload) {
    payload = payload || {};
    let changed = false;
    switch (name) {
      case "photo":
        changed = attachPhoto(payload.pid || pid, payload.aid, payload.data);
        break;
      case "confirm":
        changed = confirmTask(payload.pid, payload.aid, true);
        break;
      case "reject":
        changed = rejectTask(payload.pid, payload.aid, payload.reason);
        break;
      case "sidequest-take":
        changed = takeSidequest(pid, payload.sid);
        break;
      case "sidequest-done":
        changed = finishSidequest(pid, payload.sid, payload.data);
        break;
      case "propose":
        changed = proposeSidequest(pid, payload.text);
        break;
      case "approve":
        changed = approveProposal(payload.id);
        break;
      case "reject-proposal":
        changed = rejectProposal(payload.id);
        break;
      case "rate":
        changed = rate(pid, payload.aid, payload.verdict);
        break;
      case "void":
        changed = setVoid(payload.pid, payload.aid, true);
        break;
      case "rescue":
        changed = setVoid(payload.pid, payload.aid, false);
        break;
      case "clear-flags":
        changed = clearFlags(payload.pid, payload.aid);
        break;
      default:
        console.warn("Unbekannte Aktion", name);
    }
    if (changed) {
      if (isHost()) sync();
      persist();
      renderCurrent();
    }
  }

  function persist() {
    if (!SS.store) return;
    SS.store.saveSession(state);
    if (state.phase !== "running" && state.phase !== "review" && state.phase !== "over") return;
    if (state.mode === "online" && state.role === "guest" && state.connection !== "online") {
      state.pending = true;
    }
  }

  function sync() { net.broadcastState(); renderCurrent(); }

  /* ── Auswertung ───────────────────────────────────────────────────────── */
  function allProofs() { return SS.store ? SS.store.photosOf(state.code || null) : []; }

  function ranking() {
    return alive()
      .map((p) => ({
        pid: p.id, name: p.name, color: p.color,
        points: pointsOf(p.id),
        sidequests: sidequestsDone(p.id),
        voided: tasksOf(p.id).filter((t) => t.confirmed && isVoid(t)).length,
        ...doneCount(p.id),
      }))
      .sort((a, b) => b.points - a.points || b.done - a.done);
  }

  function network() {
    const edges = [];
    Object.keys(state.assignments).forEach((pid) => {
      state.assignments[pid].forEach((t) => {
        if (t.target) edges.push({ from: pid, to: t.target, task: t, confirmed: t.confirmed });
      });
    });
    return edges;
  }

  function buildReport() {
    const L = [];
    const mode = SS.tasks.modeById(state.settings.modeId);
    L.push("SEIDLA — Abendbericht");
    L.push("Runde: " + state.groupName + (state.code ? " (" + state.code + ")" : ""));
    L.push("Modus: " + mode.name);
    L.push("Stand: " + new Date().toLocaleString("de-DE"));
    L.push("Dabei: " + alive().length + " Leut · " + state.settings.perPlayer + " Aufgaben pro Person");
    L.push("");
    const r = ranking();
    if (r.length) {
      L.push("RANGLISTE");
      r.forEach((x, i) => {
        let line = (i + 1) + ". " + x.name + " — " + x.points + " Punkte, " + x.done + " von " + x.total + " Aufgaben";
        if (x.sidequests) line += ", " + x.sidequests + " Sidequests";
        if (x.voided) line += " (" + x.voided + " ungültig)";
        L.push(line);
      });
      L.push("");
    }
    const sq = state.sidequests.filter((s) => Object.keys(s.done || {}).length);
    if (sq.length) {
      L.push("SIDEQUESTS");
      sq.forEach((s) => {
        L.push("- " + s.text);
        Object.keys(s.done).forEach((pid) => L.push("    ✓ " + nameOf(pid) + (s.done[pid].voided ? " (ungültig)" : "")));
      });
      L.push("");
    }
    L.push("WER HAT WEN BESUCHT");
    network().filter((e) => e.confirmed).forEach((e) => {
      L.push("- " + nameOf(e.from) + " → " + nameOf(e.to) + ": " + e.task.text);
    });
    L.push("");
    L.push("Nachweise: " + allProofs().length + " Bilder im Album");
    return L.join("\n");
  }

  return {
    $, $$, el, frag, esc, shuffle, seededRng, uid, clamp, pick,
    PALETTE, colorFor, initial, toast, modal, closeModal,
    state, on, emit, player, nameOf, alive, myPid, isHost, connectedCount,
    logLine, addPlayer, removePlayer,
    // Abend
    tasksOf, myTasks: () => tasksOf(state.mode === "online" ? state.me : (state.players[0] && state.players[0].id)),
    findTask, findTaskAnywhere, pointsOf, sidequestsDone, doneCount, photoFor, notePhoto,
    isVoid,
    attachPhoto, confirmTask, rejectTask,
    takeSidequest, finishSidequest, proposeSidequest, approveProposal, rejectProposal,
    dealTasks, act, actAs, applyAction, applyActionRaw: applyAction,
    // Wertung
    startReview, reviewOf, rate, setVoid, clearFlags, reviewable,
    // Abend beenden
    endEvening, reopenEvening, summary, buildSummary,
    // Chat
    sendChat, receiveChat,
    sync, net, persist, setRenderCurrent, renderCurrent,
    allProofs, ranking, network, buildReport,
  };
})();
