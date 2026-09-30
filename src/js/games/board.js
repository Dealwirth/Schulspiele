/* ==========================================================================
   Schulspiele — Brett- und Denkspiele
   Tic Tac Toe · Vier gewinnt · Memory · Nim
   ========================================================================== */
(function () {
  "use strict";
  const SS = window.SS;
  const { el } = SS;
  const U = () => SS.util;

  const emojiRule = "Am Zug ist immer genau eine Person. Das Gerät zeigt euch, wer dran ist.";

  // Bis zu vier Zeichen, damit auch Dreier- und Vierergruppen spielen können.
  const MARKS = ["x", "o", "star", "triangle"];
  const MARK_SYMBOL = { x: "✕", o: "○", star: "★", triangle: "△" };
  const C4_NAMES = ["rot", "gelb", "grün", "blau"];

  /* ══════════════════════════════════════════════════════════════════════
     TIC TAC TOE
     ══════════════════════════════════════════════════════════════════════ */
  const ttt = {
    init(ctx) {
      const n = String(ctx.settings.board) === "4" ? 4 : 3;
      const seats = ctx.players.map((p) => p.id);
      ctx.pub.game = "tictactoe";
      ctx.pub.n = n;
      ctx.pub.win = n; // benötigte Länge
      ctx.pub.cells = new Array(n * n).fill(null);
      ctx.pub.marks = {};
      seats.forEach((id, i) => { ctx.pub.marks[id] = MARKS[i % MARKS.length]; });
      ctx.pub.winner = null;
      ctx.pub.line = null;
      ctx.pub.draw = false;
      ctx.turn = seats[0];
      ctx.log("Tic Tac Toe: " + ctx.player(seats[0]).name + " beginnt mit " + MARK_SYMBOL[ctx.pub.marks[seats[0]]] + ".");
    },
    action(ctx, pid, name, payload) {
      const pub = ctx.pub;
      if (name === "place") {
        if (ctx.turn !== pid || pub.winner || pub.draw) return;
        const i = payload.i;
        if (i < 0 || i >= pub.cells.length || pub.cells[i]) return;
        pub.cells[i] = pub.marks[pid];
        const line = findLine(pub.cells, pub.n, pub.win);
        if (line) {
          pub.winner = pid; pub.line = line;
          ctx.addScore(pid, 1);
          ctx.turn = null;
          ctx.log(ctx.player(pid).name + " gewinnt die Runde.");
        } else if (pub.cells.every((c) => c)) {
          pub.draw = true; ctx.turn = null;
          ctx.log("Unentschieden — das Feld ist voll.");
        } else {
          ctx.turn = U().nextSeat(ctx);
        }
      } else if (name === "next") {
        resetTtt(ctx);
      }
    },
    render(ctx) {
      const pub = ctx.pub;
      if (pub.game !== "tictactoe" || !pub.cells) return el("div");
      const n = pub.n;
      const wrap = el("div");
      const meta = ctx.players.find((p) => p.id === ctx.turn);

      if (pub.winner) {
        wrap.appendChild(el("div", { class: "turn-banner", style: { borderColor: "var(--green)" } }, [
          U().dot(pub.winner, ctx),
          el("span", { text: ctx.player(pub.winner).name + " gewinnt diese Runde!" }),
        ]));
      } else if (pub.draw) {
        wrap.appendChild(el("div", { class: "turn-banner" }, [el("span", { text: "Unentschieden." })]));
      } else if (meta) {
        wrap.appendChild(U().turnBanner(ctx));
      }

      const grid = el("div", { class: "ttt", style: n === 4 ? { width: "min(430px,92vw)" } : null });
      pub.cells.forEach((c, i) => {
        const isWin = pub.line && pub.line.includes(i);
        const btn = el("button", {
          class: "cell " + (c || "") + (isWin ? " win" : ""),
          text: c ? MARK_SYMBOL[c] : "",
          "aria-label": "Feld " + (i + 1),
          disabled: !!c || !!pub.winner || !!pub.draw || !ctx.myTurn() || ctx.phase !== "playing",
          onclick: () => SS.act("place", { i: i }),
        });
        grid.appendChild(btn);
      });
      wrap.appendChild(el("div", { class: "board-wrap" }, grid));

      wrap.appendChild(el("div", { class: "center", style: { marginTop: "16px" } }, [
        (pub.winner || pub.draw)
          ? (ctx.isHost ? el("button", { class: "btn btn-gold", text: "Nächste Runde", onclick: () => SS.act("next", {}) }) : el("p", { class: "muted", text: "Der Host startet die nächste Runde." }))
          : el("p", { class: "muted", text: n === 4 ? "Vier in einer Reihe gewinnt." : "Drei in einer Reihe gewinnt." }),
      ]));

      wrap.appendChild(el("div", { style: { marginTop: "16px" } }, U().scoreTable(ctx)));
      return wrap;
    },
  };

  function findLine(cells, n, need) {
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const v = cells[r * n + c];
        if (!v) continue;
        for (const [dr, dc] of dirs) {
          const line = [r * n + c];
          for (let k = 1; k < need; k++) {
            const rr = r + dr * k, cc = c + dc * k;
            if (rr < 0 || rr >= n || cc < 0 || cc >= n) { line.length = 0; break; }
            if (cells[rr * n + cc] !== v) { line.length = 0; break; }
            line.push(rr * n + cc);
          }
          if (line.length === need) return line;
        }
      }
    }
    return null;
  }

  function resetTtt(ctx) {
    const n = ctx.pub.n;
    const seats = ctx.players.map((p) => p.id);
    ctx.pub.cells = new Array(n * n).fill(null);
    ctx.pub.winner = null; ctx.pub.line = null; ctx.pub.draw = false;
    // Verlierer beginnt, damit es abwechselt
    const starter = seats.find((s) => s !== seats[(seats.indexOf(ctx.state.turn || seats[0]) + 1) % seats.length]) || seats[0];
    ctx.turn = seats[1] || seats[0];
    ctx.round++;
    ctx.log("Neue Runde. " + ctx.player(ctx.turn).name + " beginnt.");
  }

  /* ══════════════════════════════════════════════════════════════════════
     VIER GEWINNT
     ══════════════════════════════════════════════════════════════════════ */
  const c4 = {
    init(ctx) {
      ctx.pub.game = "connect4";
      const cols = Number(ctx.settings.cols) === 5 ? 5 : 7;
      const rows = 6;
      ctx.pub.cols = cols; ctx.pub.rows = rows;
      ctx.pub.cells = new Array(cols * rows).fill(0);
      ctx.pub.slot = {};
      const seats = ctx.players.map((p) => p.id);
      seats.forEach((id, i) => { ctx.pub.slot[id] = i + 1; });
      ctx.pub.winner = null; ctx.pub.line = null; ctx.pub.draw = false;
      ctx.pub.last = null;
      ctx.turn = seats[0];
      ctx.log("Vier gewinnt: " + ctx.player(seats[0]).name + " beginnt.");
    },
    action(ctx, pid, name, payload) {
      const pub = ctx.pub;
      if (name === "drop") {
        if (ctx.turn !== pid || pub.winner || pub.draw) return;
        const col = payload.col;
        if (col < 0 || col >= pub.cols) return;
        let row = -1;
        for (let r = pub.rows - 1; r >= 0; r--) if (!pub.cells[r * pub.cols + col]) { row = r; break; }
        if (row < 0) return;
        const idx = row * pub.cols + col;
        pub.cells[idx] = pub.slot[pid];
        pub.last = idx;
        const line = c4Line(pub.cells, pub.cols, pub.rows, row, col, pub.slot[pid]);
        if (line) {
          pub.winner = pid; pub.line = line;
          ctx.addScore(pid, 1);
          ctx.turn = null;
          ctx.log(ctx.player(pid).name + " verbindet vier und gewinnt.");
        } else if (pub.cells.every((v) => v)) {
          pub.draw = true; ctx.turn = null;
        } else {
          ctx.turn = U().nextSeat(ctx);
        }
      } else if (name === "next") {
        resetC4(ctx);
      }
    },
    render(ctx) {
      const pub = ctx.pub;
      if (pub.game !== "connect4" || !pub.cells) return el("div");
      const wrap = el("div");

      if (pub.winner) {
        wrap.appendChild(el("div", { class: "turn-banner", style: { borderColor: "var(--green)" } }, [
          U().dot(pub.winner, ctx), el("span", { text: ctx.player(pub.winner).name + " gewinnt die Runde!" }),
        ]));
      } else if (pub.draw) {
        wrap.appendChild(el("div", { class: "turn-banner" }, [el("span", { text: "Feld voll — unentschieden." })]));
      } else {
        wrap.appendChild(U().turnBanner(ctx));
      }

      const canPlay = ctx.myTurn() && !pub.winner && !pub.draw && ctx.phase === "playing";
      const hints = el("div", { class: "col-hint", style: { gridTemplateColumns: "repeat(" + pub.cols + ",1fr)" } });
      for (let c = 0; c < pub.cols; c++) {
        const full = pub.cells[c] !== 0;
        hints.appendChild(el("button", { text: "▼", disabled: !canPlay || full, title: "Spalte " + (c + 1), onclick: () => SS.act("drop", { col: c }) }));
      }
      wrap.appendChild(hints);

      const grid = el("div", { class: "c4", style: { gridTemplateColumns: "repeat(" + pub.cols + ",1fr)" } });
      for (let r = 0; r < pub.rows; r++) {
        for (let c = 0; c < pub.cols; c++) {
          const i = r * pub.cols + c;
          const v = pub.cells[i];
          const isWin = pub.line && pub.line.includes(i);
          grid.appendChild(el("button", {
            class: "slot" + (isWin ? " win" : ""),
            dataset: v ? { p: String(v) } : {},
            disabled: !canPlay,
            "aria-label": v ? (C4_NAMES[v - 1] || "Stein") : "leer",
            onclick: () => { if (!v) SS.act("drop", { col: c }); },
          }));
        }
      }
      wrap.appendChild(el("div", { class: "board-wrap" }, grid));

      wrap.appendChild(el("div", { class: "center", style: { marginTop: "16px" } }, [
        (pub.winner || pub.draw)
          ? (ctx.isHost ? el("button", { class: "btn btn-gold", text: "Nächste Runde", onclick: () => SS.act("next", {}) }) : el("p", { class: "muted", text: "Der Host startet die nächste Runde." }))
          : el("p", { class: "muted", text: "Vier eigene Steine in einer Linie gewinnen." }),
      ]));
      wrap.appendChild(el("div", { style: { marginTop: "16px" } }, U().scoreTable(ctx)));
      return wrap;
    },
  };

  function c4Line(cells, cols, rows, r, c, v) {
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dr, dc] of dirs) {
      const line = [r * cols + c];
      for (const s of [1, -1]) {
        for (let k = 1; k < 4; k++) {
          const rr = r + dr * k * s, cc = c + dc * k * s;
          if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) break;
          if (cells[rr * cols + cc] !== v) break;
          line.push(rr * cols + cc);
        }
      }
      if (line.length >= 4) return line.slice(0, 4);
    }
    return null;
  }

  function resetC4(ctx) {
    const cols = ctx.pub.cols, rows = ctx.pub.rows;
    const seats = ctx.players.map((p) => p.id);
    ctx.pub.cells = new Array(cols * rows).fill(0);
    ctx.pub.winner = null; ctx.pub.line = null; ctx.pub.draw = false; ctx.pub.last = null;
    ctx.turn = seats[1] || seats[0];
    ctx.round++;
    ctx.log("Neue Runde. " + ctx.player(ctx.turn).name + " beginnt.");
  }

  /* ══════════════════════════════════════════════════════════════════════
     MEMORY
     ══════════════════════════════════════════════════════════════════════ */
  const MEM_SYMBOLS = ["♠", "♥", "♦", "♣", "★", "✦", "☘", "⚓", "⚙", "✈", "☂", "⌛", "❖", "◆", "▲", "✿"];

  const memory = {
    init(ctx) {
      ctx.pub.game = "memory";
      const pairs = Number(ctx.settings.pairs) || 8;
      const syms = SS.shuffle(MEM_SYMBOLS.slice()).slice(0, pairs);
      let deck = [];
      syms.forEach((s, i) => { deck.push({ s: s, pair: i }, { s: s, pair: i }); });
      deck = U().sharedShuffle(ctx, deck, "deck");
      ctx.pub.cards = deck.map((d) => ({ s: d.s, pair: d.pair, open: false, done: false }));
      ctx.pub.flipped = [];
      ctx.pub.lock = false;
      ctx.pub.keepTurn = String(ctx.settings.keepTurn) !== "false";
      ctx.pub.found = {};
      ctx.players.forEach((p) => (ctx.pub.found[p.id] = 0));
      ctx.pub.finished = false;
      ctx.turn = ctx.players[0].id;
      ctx.log("Memory gestartet — " + pairs + " Paare.");
    },
    action(ctx, pid, name, payload) {
      const pub = ctx.pub;
      if (name === "flip") {
        if (ctx.turn !== pid || pub.lock || pub.finished) return;
        const i = payload.i;
        const card = pub.cards[i];
        if (!card || card.done || pub.flipped.includes(i)) return;
        pub.flipped.push(i);
        if (pub.flipped.length === 2) {
          const [a, b] = pub.flipped;
          if (pub.cards[a].pair === pub.cards[b].pair) {
            pub.cards[a].done = true; pub.cards[b].done = true;
            pub.cards[a].open = pub.cards[b].open = false;
            pub.found[pid] = (pub.found[pid] || 0) + 1;
            ctx.addScore(pid, 1);
            pub.flipped = [];
            if (!pub.keepTurn) ctx.turn = U().nextSeat(ctx);
            if (pub.cards.every((c) => c.done)) {
              pub.finished = true; ctx.turn = null;
              ctx.log("Alle Paare gefunden.");
            }
          } else {
            pub.lock = true;
            // Nur der Host (bzw. das lokale Gerät) löst die Aufdeckung wieder auf
            setTimeout(() => {
              ctx.pub.flipped = [];
              ctx.pub.lock = false;
              ctx.turn = U().nextSeat(ctx);
              ctx.sync();
              ctx.rerender();
            }, 900);
          }
        }
      } else if (name === "next") {
        initMemory(ctx);
      }
    },
    render(ctx) {
      const pub = ctx.pub;
      if (pub.game !== "memory" || !pub.cards) return el("div");
      const wrap = el("div");

      if (pub.finished) {
        const best = ctx.players.slice().sort((a, b) => (ctx.scores[b.id] || 0) - (ctx.scores[a.id] || 0))[0];
        wrap.appendChild(el("div", { class: "turn-banner", style: { borderColor: "var(--green)" } }, [
          el("span", { text: "Alle Paare gefunden — " + best.name + " liegt vorn." }),
        ]));
      } else {
        wrap.appendChild(U().turnBanner(ctx, ctx.myTurn() ? "Du deckst auf" : ctx.player(ctx.turn).name + " deckt auf"));
      }

      const total = pub.cards.length;
      const cols = total <= 12 ? 4 : total <= 16 ? 4 : total <= 20 ? 5 : 6;
      const grid = el("div", { class: "mem-grid", style: { "--cols": String(cols) } });
      pub.cards.forEach((c, i) => {
        const open = c.done || pub.flipped.includes(i);
        grid.appendChild(el("button", {
          class: "mcard" + (open ? " flipped" : "") + (c.done ? " done" : ""),
          disabled: pub.lock || c.done || !ctx.myTurn() || pub.finished,
          "aria-label": "Karte " + (i + 1),
          onclick: () => SS.act("flip", { i: i }),
        }, el("span", { class: "inner" }, [
          el("span", { class: "face front", text: "❄" }),
          el("span", { class: "face back", text: c.s }),
        ])));
      });
      wrap.appendChild(el("div", {}, grid));

      const found = ctx.players.map((p) => el("span", { class: "tag", text: p.name + ": " + (pub.found[p.id] || 0) + " Paare" }));
      wrap.appendChild(el("div", { class: "tags center", style: { justifyContent: "center", marginTop: "16px" } }, found));

      wrap.appendChild(el("div", { class: "center", style: { marginTop: "14px" } }, [
        pub.finished
          ? (ctx.isHost ? el("button", { class: "btn btn-gold", text: "Nochmal", onclick: () => SS.act("next", {}) }) : null)
          : el("p", { class: "muted", text: pub.keepTurn ? "Bei einem Treffer darfst du gleich nochmal." : "Nach jedem Versuch ist die nächste Person dran." }),
      ]));
      wrap.appendChild(el("div", { style: { marginTop: "16px" } }, U().scoreTable(ctx)));
      return wrap;
    },
  };

  function initMemory(ctx) {
    const pairs = Number(ctx.settings.pairs) || 8;
    const syms = SS.shuffle(MEM_SYMBOLS.slice()).slice(0, pairs);
    let deck = [];
    syms.forEach((s, i) => { deck.push({ s: s, pair: i }, { s: s, pair: i }); });
    deck = SS.shuffle(deck);
    ctx.pub.cards = deck.map((d) => ({ s: d.s, pair: d.pair, open: false, done: false }));
    ctx.pub.flipped = []; ctx.pub.lock = false; ctx.pub.finished = false;
    ctx.pub.found = {}; ctx.players.forEach((p) => (ctx.pub.found[p.id] = 0));
    ctx.round++;
    ctx.turn = ctx.players[0].id;
    ctx.log("Neue Runde Memory.");
  }

  /* ══════════════════════════════════════════════════════════════════════
     NIM
     ══════════════════════════════════════════════════════════════════════ */
  const nim = {
    init(ctx) {
      ctx.pub.game = "nim";
      const rows = Number(ctx.settings.rows) === 4 ? 4 : 3;
      const base = rows === 4 ? [3, 4, 5, 6] : [3, 4, 5];
      ctx.pub.piles = base.slice();
      ctx.pub.maxTake = Number(ctx.settings.maxTake) || 3;
      ctx.pub.pending = null; // {pile, n} lokale Auswahl
      ctx.pub.loser = null; ctx.pub.winner = null;
      ctx.turn = ctx.players[0].id;
      ctx.log("Nim: Wer den letzten Stein nimmt, verliert.");
    },
    action(ctx, pid, name, payload) {
      const pub = ctx.pub;
      if (name === "take") {
        if (ctx.turn !== pid || pub.winner) return;
        const { pile, n } = payload;
        if (!pub.piles[pile] || n < 1 || n > pub.piles[pile] || n > pub.maxTake) return;
        pub.piles[pile] -= n;
        pub.pending = null;
        const empty = pub.piles.every((p) => p === 0);
        if (empty) {
          pub.loser = pid;
          const winner = ctx.players.find((p) => p.id !== pid);
          pub.winner = winner ? winner.id : null;
          if (winner) ctx.addScore(winner.id, 1);
          ctx.turn = null;
          ctx.log(ctx.player(pid).name + " nimmt den letzten Stein und verliert.");
        } else {
          ctx.turn = U().nextSeat(ctx);
        }
      } else if (name === "select") {
        // nur lokale Anzeige — keine Punktewirkung, aber über den Host synchronisiert
        pub.pending = payload;
      } else if (name === "next") {
        initNim(ctx);
      }
    },
    render(ctx) {
      const pub = ctx.pub;
      if (pub.game !== "nim" || !pub.piles) return el("div");
      const wrap = el("div");
      const canPlay = ctx.myTurn() && !pub.winner && ctx.phase === "playing";

      if (pub.winner) {
        wrap.appendChild(el("div", { class: "turn-banner", style: { borderColor: "var(--green)" } }, [
          U().dot(pub.winner, ctx),
          el("span", { text: ctx.player(pub.winner).name + " gewinnt — " + ctx.player(pub.loser).name + " musste den letzten Stein nehmen." }),
        ]));
      } else {
        wrap.appendChild(U().turnBanner(ctx));
      }

      const piles = el("div", { class: "piles" });
      pub.piles.forEach((count, pi) => {
        const stones = el("div", { class: "stones" });
        for (let i = 0; i < count; i++) stones.appendChild(el("span", { class: "stone" }));
        const btns = el("div", { class: "btn-row", style: { justifyContent: "center" } });
        const max = Math.min(count, pub.maxTake);
        for (let n = 1; n <= max; n++) {
          btns.appendChild(el("button", {
            class: "btn btn-sm " + (pub.pending && pub.pending.pile === pi && pub.pending.n === n ? "btn-gold" : "btn-outline"),
            text: "-" + n, disabled: !canPlay, title: n + " Stein(e) nehmen",
            onclick: () => SS.act("take", { pile: pi, n: n }),
          }));
        }
        piles.appendChild(el("div", { class: "pile" }, [
          el("div", { class: "muted", style: { fontSize: "12px", marginBottom: "4px" }, text: "Haufen " + (pi + 1) }),
          stones,
          el("div", { class: "muted", style: { fontFamily: "var(--mono)", fontSize: "13px", marginBottom: "8px" }, text: count + " übrig" }),
          btns,
        ]));
      });
      wrap.appendChild(piles);

      wrap.appendChild(el("div", { class: "center" }, [
        el("p", { class: "muted", text: "Pro Zug höchstens " + (pub.maxTake >= 99 ? "beliebig viele" : pub.maxTake) + " Steine, immer aus einem Haufen." }),
        pub.winner
          ? (ctx.isHost ? el("button", { class: "btn btn-gold", text: "Nächste Runde", onclick: () => SS.act("next", {}) }) : null)
          : (canPlay ? null : el("p", { class: "muted", text: ctx.player(ctx.turn).name + " ist am Zug." })),
      ]));

      wrap.appendChild(el("div", { style: { marginTop: "16px" } }, U().scoreTable(ctx)));
      return wrap;
    },
  };

  function initNim(ctx) {
    const rows = Number(ctx.settings.rows) === 4 ? 4 : 3;
    const base = rows === 4 ? [3, 4, 5, 6] : [3, 4, 5];
    ctx.pub.piles = base.slice();
    ctx.pub.winner = null; ctx.pub.loser = null; ctx.pub.pending = null;
    ctx.round++;
    ctx.turn = ctx.players[1] ? ctx.players[1].id : ctx.players[0].id;
    ctx.log("Neue Runde Nim.");
  }

  SS.registerImpl("tictactoe", ttt);
  SS.registerImpl("connect4", c4);
  SS.registerImpl("memory", memory);
  SS.registerImpl("nim", nim);
})();
