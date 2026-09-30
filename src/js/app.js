/* ==========================================================================
   Schulspiele — Kern
   Namensraum, Hilfsfunktionen, Zustand, Netzwerkschicht, Ansichten.
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
  // deterministischer Zufall aus Text (fuer gemeinsames Mischen im Netzwerk)
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

  /* ── Speicher ─────────────────────────────────────────────────────────── */
  const LS = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem("seidla:" + key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, val) {
      try { localStorage.setItem("seidla:" + key, JSON.stringify(val)); } catch (e) {}
    },
  };

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
    (actions || [{ label: "Schliessen" }]).forEach((a) => {
      act.appendChild(
        el("button", {
          class: "btn " + (a.kind === "primary" ? "btn-gold" : "btn-outline"),
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

  /* ── Netzwerkschicht (wird von net.js befuellt) ───────────────────────── */
  const net = {
    init: () => Promise.resolve(false),
    sendToHost: () => false,
    broadcastState: () => false,
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
    pending: false,           // es liegt was im Ausgangskorb
    // Teilnehmer
    players: [],              // [{id,name,color,connected,isHost,index}]
    hostId: null,
    me: null,                 // eigene pid (online) / null (lokal)
    seat: null,               // lokaler Modus: wer gerade das Gerät hält
    // Partie
    gameId: null,
    settings: {},
    phase: "lobby",           // 'lobby' | 'playing' | 'over'
    round: 1,
    turn: null,
    scores: {},
    pub: {},                  // oeffentlicher Spielzustand (vom Spielmodul gefuellt)
    priv: {},                 // geheimer Zustand je Spieler (pid -> Objekt)
    log: [],
    lastResult: null,
    syncSeq: 0,               // zählt bestätigte Syncs (für Chronik/Offline-Abgleich)
    syncSeed: null,           // gemeinsamer Zufallskeim einer Partie
  };

  const listeners = {};
  const on = (evt, fn) => { (listeners[evt] = listeners[evt] || []).push(fn); };
  const emit = (evt, payload) => {
    if (evt !== "render") (listeners[evt] || []).forEach((f) => f(payload));
    (listeners["*"] || []).forEach((f) => f(evt, payload));
  };

  const player = (pid) => state.players.find((p) => p.id === pid) || null;
  const me = () => (state.mode === "online" ? player(state.me) : player(state.turn));
  const alive = () => state.players.filter((p) => p.connected !== false);
  const myPid = () => state.me;
  const isHost = () => state.role === "host" || state.role === "solo";
  const connectedCount = () => alive().length;

  function logLine(text, kind) {
    state.log.push({ t: Date.now(), text: String(text), kind: kind || "" });
    if (state.log.length > 200) state.log.shift();
    emit("log", state.log[state.log.length - 1]);
  }

  function addScore(pid, n) {
    state.scores[pid] = (state.scores[pid] || 0) + n;
  }
  function setScore(pid, n) {
    state.scores[pid] = n;
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
    if (!(p.id in state.scores)) state.scores[p.id] = 0;
    if (p.isHost) state.hostId = p.id;
    return p;
  }
  function removePlayer(pid) {
    const p = player(pid);
    if (p) p.connected = false;
  }

  /* ── Aktionsschnittstelle für Spielmodule ─────────────────────────────── */
  /**
   * Spiele rufen SS.act(name, payload) auf.
   *  - lokal  : Aktion wird direkt auf dem lokalen Zustand ausgeführt (Akteur = wer am Zug ist)
   *  - Gast   : Aktion geht an den Host
   *  - Host   : Aktion wird lokal ausgeführt
   */
  function act(name, payload) {
    // Spiele ohne festen Zug (z. B. Flaschendrehen, Turnierbaum) handeln
    // über den Host — dort gibt es keinen aktiven Spieler.
    let pid = activePid();
    if (!pid) pid = state.mode === "online" ? state.me : (state.players[0] && state.players[0].id) || null;
    actAs(pid, name, payload);
  }
  /**
   * Aktion im Namen eines bestimmten Spielers.
   * Nötig für Spiele, in denen alle gleichzeitig handeln (Reaktion, Quiz).
   */
  function actAs(pid, name, payload) {
    if (!pid) { toast("Kein aktiver Spieler.", "err"); return; }
    if (state.mode === "online" && state.role === "guest") {
      if (pid !== state.me) { toast("Nur eigene Züge sind möglich.", "err"); return; }
      net.sendToHost({ t: "act", pid: pid, name: name, payload: payload });
    } else if (state.mode === "online" && state.role === "host") {
      applyAction(pid, name, payload);
    } else {
      applyAction(pid, name, payload);
    }
  }
  function applyAction(pid, name, payload) {
    const game = currentGame();
    if (!game || !game.action) return;
    const ctx = makeCtx();
    try {
      game.action(ctx, pid, name, payload);
    } catch (err) {
      console.error("Aktionsfehler", err);
      toast("Aktion fehlgeschlagen: " + err.message, "err");
    }
    if (isHost()) sync();
    persist();
    renderCurrent();
  }

  /**
   * Zustand nach jeder Aktion sichern. Ohne Netz geht die Aktion zusätzlich
   * in den Ausgangskorb und wird beim nächsten Kontakt nachgereicht.
   */
  function persist() {
    if (!SS.store) return;
    SS.store.saveSession(state);
    if (state.phase === "playing" || state.phase === "over") {
      if (state.mode === "online" && state.role === "guest" && state.connection !== "online") {
        state.pending = true;
        SS.store.queue({ kind: "spielzug", gameId: state.gameId, round: state.round, at: Date.now() });
      }
    }
  }

  function currentGame() {
    const g = IMPL[state.gameId];
    return g || null;
  }

  /** Ist das aktuelle Spiel ein gleichzeitiges Spiel (alle antworten)? */
  function isSimultaneous() {
    const meta = getMeta(state.gameId);
    return !!(meta && meta.simultaneous);
  }
  /** Wer handelt auf diesem Gerät gerade? */
  function activePid() {
    if (state.mode === "online") return state.me;
    // Gleichzeitige Spiele am selben Gerät: ohne gewählten Platz gilt Spieler 1.
    if (isSimultaneous()) {
      const seat = state.seat && state.players.some((p) => p.id === state.seat) ? state.seat : null;
      return seat || (state.players[0] && state.players[0].id) || null;
    }
    return state.turn;
  }

  /** Kontextobjekt, das jedem Spielmodul übergeben wird. */
  function makeCtx() {
    const game = currentGame();
    return {
      state,
      // Getter statt Momentaufnahme: startGame() ersetzt diese Objekte, und
      // Spielmodule halten den Kontext über den gesamten Spielverlauf.
      get pub() { return state.pub; },
      get settings() { return state.settings; },
      get players() { return state.players; },
      get scores() { return state.scores; },
      get round() { return state.round; },
      set round(v) { state.round = v; },
      get phase() { return state.phase; },
      set phase(v) { state.phase = v; },
      get turn() { return state.turn; },
      set turn(v) { state.turn = v; },
      get me() { return activePid(); },
      isHost: isHost(),
      isLocal: state.mode === "local",
      simultaneous: isSimultaneous(),
      player,
      colorFor,
      alive,
      // Darf dieses Geraet fuer pid handeln?
      canAct(pid) {
        pid = pid === undefined ? activePid() : pid;
        if (state.phase !== "playing") return false;
        if (state.mode === "online") return pid === state.me;
        return true; // lokal steuert ein Gerät alle
      },
      myTurn() {
        if (state.mode === "online") return isSimultaneous() ? state.phase === "playing" : state.turn === state.me;
        return true; // gemeinsam genutztes Gerät
      },
      roundOver() { return state.turn === null; },
      addScore, setScore, log: logLine, toast,
      finish(result) {
        state.phase = "over";
        state.lastResult = result || null;
        logLine("Partie beendet.");
        if (SS.store) {
          const meta = getMeta(state.gameId);
          const order = state.players.slice().sort((a, b) => (state.scores[b.id] || 0) - (state.scores[a.id] || 0));
          if (order[0] && (state.scores[order[0].id] || 0) > 0) {
            SS.store.addChronicle({
              type: "sieg", groupCode: state.code || null, group: !!state.code,
              game: meta ? meta.name : "", who: order[0].name, points: state.scores[order[0].id] || 0,
            });
          }
        }
        persist();
      },
      reset() {
        state.phase = "lobby";
        state.round = 1;
        state.turn = null;
        state.pub = {};
        state.priv = {};
        state.lastResult = null;
        Object.keys(state.scores).forEach((k) => (state.scores[k] = 0));
        state.log = [];
      },
      sync() { if (isHost()) sync(); },
      rerender() { renderCurrent(); },
      rng: seededRng,
      random: Math.random,
      shuffle: (a) => shuffle(a),
      setSeat(pid) { if (state.mode === "local" && isSimultaneous()) { state.seat = pid; renderCurrent(); } },
      el, $, $$, esc,
      modal, closeModal,
    };
  }

  function sync() { net.broadcastState(); renderCurrent(); }

  /* ── Spielregistrierung ───────────────────────────────────────────────── */
  const GAMES = [];   // Metadaten (Katalog)
  const IMPL = {};    // Implementierungen
  function registerGame(meta) { GAMES.push(meta); }
  function registerImpl(id, impl) { IMPL[id] = impl; }
  const getMeta = (id) => GAMES.find((g) => g.id === id) || null;

  return {
    $, $$, el, frag, esc, shuffle, seededRng, uid, clamp, pick,
    PALETTE, colorFor, initial, LS, toast, modal, closeModal,
    state, on, emit, player, me, alive, myPid, isHost, connectedCount,
    logLine, addScore, setScore, addPlayer, removePlayer,
    act, actAs, applyAction, applyActionRaw: applyAction, currentGame, makeCtx, sync, net,
    isSimultaneous, activePid, setRenderCurrent, renderCurrent, persist,
    GAMES, IMPL, registerGame, registerImpl, getMeta,
  };
})();
