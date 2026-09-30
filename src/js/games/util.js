/* ==========================================================================
   Schulspiele — gemeinsame Bausteine für Spielmodule
   ========================================================================== */
(function () {
  "use strict";
  const SS = window.SS;
  const { el } = SS;

  /* ── Zug-Logik ────────────────────────────────────────────────────────── */
  function seatOrder(ctx) {
    return ctx.players.filter((p) => p.connected !== false).map((p) => p.id);
  }
  function nextSeat(ctx) {
    const order = seatOrder(ctx);
    if (!order.length) return null;
    const i = order.indexOf(ctx.state.turn);
    return order[(i + 1) % order.length];
  }
  function advance(ctx) { ctx.state.turn = nextSeat(ctx); }
  function nameOf(ctx, pid) {
    const p = ctx.player(pid);
    return p ? p.name : "—";
  }
  function dot(pid, ctx) {
    const p = ctx.player(pid);
    return el("span", { class: "dot", style: { background: p ? p.color : "#999" } });
  }

  /* ── Anzeigeblöcke ────────────────────────────────────────────────────── */
  function turnBanner(ctx, textOverride) {
    const t = ctx.state.turn;
    const who = nameOf(ctx, t);
    const isMe = ctx.canAct(t);
    const text = textOverride || (isMe ? "Du bist am Zug" : "Am Zug: " + who);
    return el("div", { class: "turn-banner" }, [
      dot(t, ctx),
      el("span", { text: text }),
      ctx.canAct(t) ? null : el("span", { class: "muted", text: "· bitte warten" }),
    ]);
  }

  function waitingBanner(ctx) {
    const t = ctx.state.turn;
    return el("div", { class: "banner", text: "Am Zug: " + nameOf(ctx, t) + ". Der Zug passiert auf dem Gerät dieser Person." });
  }

  function canTouch(ctx, pid) {
    return ctx.canAct(pid === undefined ? ctx.state.turn : pid);
  }

  function scoreTable(ctx, opts) {
    opts = opts || {};
    const order = ctx.players.slice().sort((a, b) => (ctx.scores[b.id] || 0) - (ctx.scores[a.id] || 0));
    return el("table", { class: "scoreboard" }, [
      el("thead", {}, el("tr", {}, [
        el("th", { text: "#" }),
        el("th", { text: opts.label || "Haus" }),
        el("th", { text: opts.valueLabel || "Punkte" }),
      ])),
      el("tbody", {}, order.map((p, i) =>
        el("tr", { class: i === 0 && (ctx.scores[p.id] || 0) > 0 ? "lead-row" : "" }, [
          el("td", {}, el("span", { class: "rank", text: (i + 1) + "." })),
          el("td", {}, [
            el("span", { class: "avatar", style: { background: p.color }, text: SS.initial(p.name) }),
            p.name,
            p.id === ctx.state.turn && ctx.state.phase === "playing" ? el("span", { class: "muted", text: "  ◂ am Zug" }) : null,
          ]),
          el("td", { class: "num", text: String(ctx.scores[p.id] || 0) }),
        ])
      )),
    ]);
  }

  /* ── Runden-Abschluss ─────────────────────────────────────────────────── */
  function roundSummary(ctx, title, lines, onNext, nextLabel) {
    return el("div", { class: "center" }, [
      el("h2", { text: title }),
      el("div", { style: { maxWidth: "460px", margin: "0 auto 16px" } }, lines),
      onNext ? el("button", { class: "btn btn-gold", text: nextLabel || "Weiter", onclick: onNext }) : null,
    ]);
  }

  function finalScreen(ctx, title, sub) {
    const order = ctx.players.slice().sort((a, b) => (ctx.scores[b.id] || 0) - (ctx.scores[a.id] || 0));
    const best = order[0];
    const tied = order.filter((p) => (ctx.scores[p.id] || 0) === (ctx.scores[best.id] || 0));
    const headline = tied.length > 1 ? "Unentschieden: " + tied.map((p) => p.name).join(", ") : best.name + " gewinnt";
    return el("div", { class: "center" }, [
      el("div", { class: "eyebrow", text: title || "Endstand" }),
      el("h1", { text: headline }),
      sub ? el("p", { class: "lead", style: { margin: "0 auto 18px" }, text: sub }) : null,
      el("div", { style: { maxWidth: "520px", margin: "0 auto 20px" } }, scoreTable(ctx)),
      ctx.isHost ? el("div", { class: "btn-row", style: { justifyContent: "center" } }, [
        el("button", { class: "btn btn-gold", text: "Nochmal", onclick: () => SS.ui.startGame() }),
        el("button", { class: "btn btn-outline", text: "Zur Lobby", onclick: () => { ctx.state.phase = "lobby"; ctx.sync(); SS.ui.go("lobby"); } }),
      ]) : el("p", { class: "muted", text: "Der Host kann eine neue Partie starten." }),
    ]);
  }

  /* ── Zeitgeber ────────────────────────────────────────────────────────── */
  function now() { return Date.now(); }
  function remaining(deadline) { return Math.max(0, Math.ceil((deadline - now()) / 1000)); }

  function timerBar(seconds) {
    return el("div", { class: "center", style: { marginBottom: "14px" } }, [
      el("div", { class: "eyebrow", text: "Zeit" }),
      el("div", { class: "serif", style: { fontSize: "30px", color: "var(--red)" }, id: "clock", text: String(seconds) }),
    ]);
  }

  /* ── Einfacher Haupt-Ticker für Spielmodule ───────────────────────────── */
  const tickers = {};
  function setTicker(key, fn, ms) {
    clearTicker(key);
    tickers[key] = setInterval(fn, ms || 500);
    return tickers[key];
  }
  function clearTicker(key) {
    if (tickers[key]) { clearInterval(tickers[key]); delete tickers[key]; }
  }
  function clearAllTickers() { Object.keys(tickers).forEach(clearTicker); }

  /* ── Sonstiges ────────────────────────────────────────────────────────── */
  function shuffleInPlace(arr, rnd) { return SS.shuffle(arr, rnd); }

  function pickUnique(ctx, pool, count) { return SS.shuffle(pool).slice(0, count); }

  /** Fragen/Positionen für alle Geräte gleich mischen (Seed aus Runde + Spiel). */
  function sharedShuffle(ctx, arr, salt) {
    return SS.shuffle(arr, ctx.rng(ctx.state.gameId + ":" + ctx.state.round + ":" + (salt || "")));
  }

  SS.util = {
    seatOrder, nextSeat, advance, nameOf, dot,
    turnBanner, waitingBanner, canTouch, scoreTable,
    roundSummary, finalScreen, now, remaining, timerBar,
    setTicker, clearTicker, clearAllTickers, shuffleInPlace,
    pickUnique, sharedShuffle,
  };
})();
