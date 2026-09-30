/* ==========================================================================
   Seidla — Action & Wettkampf
   Bumm · Reaktionsduell · Franken-Quiz · Zungenbrecher · Turnierbaum
   Skaliert von der Handvoll Leute bis zur vollen Wirtshausrunde.
   ========================================================================== */
(function () {
  "use strict";
  const SS = window.SS;
  const C = SS.content;
  const U = () => SS.util;

  const wer = (pid, ctx) => { const p = ctx.player(pid); return p ? p.name : "—"; };
  const av = (pid, ctx) => { const p = ctx.player(pid); return SS.el("span", { class: "avatar", style: { background: p ? p.color : "#999" }, text: SS.initial(p ? p.name : "?") }); };
  const living = (ctx) => ctx.players.filter((x) => x.connected !== false);

  /** Rotierende Liste, damit bei 100 Leuten nicht immer dieselben drankommen. */
  function rotation(ctx, seed, count) {
    const pool = SS.shuffle(living(ctx).map((x) => x.id), ctx.rng("rot:" + (ctx.state.syncSeed || ctx.state.code || "lokal") + ":" + seed));
    return pool.slice(0, Math.max(1, count || 1));
  }

  function chronicle(ctx, type, who, points) {
    const meta = SS.getMeta(ctx.state.gameId);
    SS.store.addChronicle({ type: type, groupCode: ctx.state.code || null, game: meta ? meta.name : "", round: ctx.state.round, who: who, points: points || 0 });
  }

  /* ══ Bumm — die wandernde Bombe ═════════════════════════════════════════ */
  SS.registerImpl("bumm", {
    init(ctx) {
      ctx.pub.game = "bumm";
      ctx.pub.stage = "ready";
      ctx.pub.passes = 0;
      ctx.pub.holders = {};
      if (!ctx.pub.fuse) ctx.pub.fuse = 6 + Math.floor(Math.random() * 9);
    },
    render(ctx) {
      const p = ctx.pub;
      const order = living(ctx);
      const box = SS.el("div");
      box.appendChild(SS.el("div", { class: "eyebrow center", text: "Bumm · Runde " + ctx.round }));

      const mode = ctx.settings.mode || "zufall";
      box.appendChild(SS.el("div", { class: "bomb" + (p.stage === "tick" ? " ticking" : ""), text: p.stage === "boom" ? "💥" : "🧨" }));

      if (p.stage === "ready") {
        box.appendChild(SS.el("p", { class: "lead center", text: mode === "zufall"
          ? "Der Zünder ist versteckt. Wer am Ende dran ist, trinkt. Der Host startet die Bombe — dann tippt jeder auf seinen Namen, wenn er sie hat."
          : "In der Runde herumgeben: Jeder sagt der Reihe nach das Wort und gibt weiter. Der Host startet die Bombe." }));
        if (ctx.isHost) box.appendChild(SS.el("div", { class: "btn-row", style: { justifyContent: "center" } }, [
          SS.el("button", { class: "btn btn-red btn-lg", text: "Bombe zünden", onclick: () => SS.act("start", {}) }),
        ]));
        else box.appendChild(SS.el("p", { class: "muted center", text: "Warte auf den Host." }));
      } else if (p.stage === "tick") {
        box.appendChild(SS.el("div", { class: "timer-ring urgent" }, [SS.el("div", { class: "clock", id: "bummClock", text: String(p.left) })]));
        if (mode === "zufall") {
          box.appendChild(SS.el("div", { class: "big-prompt small", text: "Weitergeben — tipp den Namen an, bei dem sie gerade is!" }));
          const grid = SS.el("div", { class: "vote-grid", style: { maxWidth: "780px", margin: "0 auto" } });
          order.forEach((x) => grid.appendChild(SS.el("button", {
            class: "vote-btn" + (p.current === x.id ? " chosen" : ""),
            onclick: () => SS.actAs(SS.activePid(), "pass", { to: x.id }),
          }, [av(x.id, ctx), SS.el("span", { class: "nm", text: x.name }), x.id === p.current ? SS.el("span", { class: "yours", text: "hat sie" }) : null])));
          box.appendChild(grid);
        } else {
          box.appendChild(SS.el("div", { class: "big-prompt small", text: p.word || "…" }));
          box.appendChild(SS.el("div", { class: "btn-row", style: { justifyContent: "center" } }, [
            SS.el("button", { class: "btn btn-gold", text: "Weitergeben", onclick: () => SS.act("passTick", {}) }),
          ]));
        }
      } else {
        const victim = p.victim;
        box.appendChild(SS.el("h1", { class: "center", style: { color: "var(--red-2)" }, text: "BUMM!" }));
        box.appendChild(SS.el("div", { class: "big-prompt small", text: p.word }));
        if (victim) {
          box.appendChild(SS.el("div", { class: "dare-card" }, [
            SS.el("div", { class: "kicker", text: "Die Bombe is bei dir" }),
            av(victim, ctx),
            SS.el("div", { class: "text", text: wer(victim, ctx) + " trinkt!" }),
          ]));
        }
        box.appendChild(SS.el("p", { class: "muted center", text: "Und jetzt sagt der ganze Tisch das Wort dreimal schnell — sonst trinkt ihr alle." }));
        if (ctx.isHost) box.appendChild(SS.el("div", { class: "btn-row", style: { justifyContent: "center", marginTop: "14px" } }, [
          SS.el("button", { class: "btn btn-gold btn-lg", text: "Nochmoi!", onclick: () => SS.act("again", {}) }),
        ]));
      }
      return box;
    },
    action(ctx, pid, name, payload) {
      const p = ctx.pub;
      const order = living(ctx);
      if (name === "start") {
        p.stage = "tick";
        p.startedAt = Date.now();
        p.word = SS.pick(C.BUMM_WOERTER, ctx.rng("bumm:" + (ctx.state.syncSeed || ctx.state.code || "lokal") + ":" + ctx.round));
        p.current = order[Math.floor(ctx.rng("bummwho:" + ctx.round)() * order.length)].id;
        p.fuse = 6 + Math.floor(ctx.rng("fuse:" + ctx.round)() * 9);
        p.dueAt = Date.now() + p.fuse * 1000;
        p.left = p.fuse;
        if (p._tick) clearInterval(p._tick);
        startTicking(ctx);
      } else if (name === "pass") {
        if (payload.to) p.current = payload.to;
        SS.emit("syncBoard");
      } else if (name === "passTick") {
        p.word = p.word; // Wort bleibt
      } else if (name === "explode") {
        p.stage = "boom";
        p.victim = p.current;
        if (p.victim) {
          ctx.addScore(p.victim, -1);
          chronicle(ctx, "schluck", wer(p.victim, ctx), -1);
          ctx.log("BUMM! Die Bombe war bei " + wer(p.victim, ctx) + ".");
        }
        if (p._tick) { clearInterval(p._tick); p._tick = null; }
      } else if (name === "again") {
        p.stage = "ready"; p.victim = null; p.word = null;
        if (p._tick) { clearInterval(p._tick); p._tick = null; }
        ctx.state.round++;
        ctx.sync();
      }
    },
  });

  /* Host-zentrierter Zünder: läuft auf allen Geräten, explodiert aber der Host. */
  function startTicking(ctx) {
    const p = ctx.pub;
    if (p._tick) clearInterval(p._tick);
    p._tick = setInterval(() => {
      if (ctx.state.phase !== "playing" || ctx.pub.game !== "bumm" || ctx.pub.stage !== "tick") {
        clearInterval(p._tick); p._tick = null; return;
      }
      const left = Math.max(0, Math.ceil((p.dueAt - Date.now()) / 1000));
      if (left !== p.left) { p.left = left; SS.emit("syncBoard"); }
      if (left <= 0) { clearInterval(p._tick); p._tick = null; if (ctx.isHost) SS.applyActionRaw("host", "explode", {}); }
    }, 300);
  }
  SS.on("syncBoard", () => { if (SS.state.route === "game") SS.renderCurrent(); });

  /* ══ Reaktionsduell ═════════════════════════════════════════════════════ */
  SS.registerImpl("reaktionsduell", {
    init(ctx) {
      ctx.pub.game = "reaktionsduell";
      ctx.pub.stage = "wait";
      ctx.pub.presses = {};
    },
    render(ctx) {
      const p = ctx.pub;
      const box = SS.el("div");
      box.appendChild(SS.el("div", { class: "eyebrow center", text: "Reaktionsduell · Runde " + ctx.round }));

      if (p.stage === "wait" || p.stage === "armed") {
        box.appendChild(SS.el("div", { class: "bomb", text: p.stage === "wait" ? "🍺" : "⚡" }));
        box.appendChild(SS.el("div", { class: "big-prompt", text: p.stage === "wait" ? "Wartn …" : "JETZT!" }));
        box.appendChild(SS.el("div", { class: "vote-grid", style: { maxWidth: "820px", margin: "0 auto" } }, living(ctx).map((x) => {
          const mine = p.presses[x.id];
          return SS.el("button", {
            class: "vote-btn" + (mine !== undefined ? " chosen" : ""),
            disabled: p.stage === "wait" || !ctx.canAct(x.id),
            onclick: () => SS.actAs(x.id, "press", {}),
          }, [av(x.id, ctx), SS.el("span", { class: "nm", text: x.name }),
            mine !== undefined ? SS.el("span", { class: "yours", text: mine.t < 0 ? "zu früh" : mine.t + " ms" }) : null]);
        })));
        if (ctx.isHost && p.stage === "armed") box.appendChild(SS.el("div", { class: "btn-row", style: { justifyContent: "center", marginTop: "14px" } }, [
          SS.el("button", { class: "btn btn-red", text: "Jetzt auswerten", onclick: () => SS.act("resolve", {}) }),
        ]));
      } else {
        const rows = living(ctx).map((x) => ({ x: x, r: p.presses[x.id] })).filter((e) => e.r !== undefined)
          .sort((a, b) => (a.r.t < 0 ? 1 : 0) - (b.r.t < 0 ? 1 : 0) || a.r.t - b.r.t);
        box.appendChild(SS.el("h2", { class: "center", text: rows.length ? "Schnellster: " + rows[0].x.name : "Keiner war schnell genug" }));
        rows.forEach((e, i) => box.appendChild(SS.el("div", { class: "poll-row" + (i === 0 && e.r.t >= 0 ? " winner" : "") }, [
          SS.el("span", { class: "nm", text: e.x.name }),
          SS.el("span", { class: "poll-track" }, SS.el("span", { class: "poll-bar", style: { width: e.r.t < 0 ? "100%" : Math.max(8, 100 - Math.min(e.r.t, 900) / 9) + "%", background: e.r.t < 0 ? "var(--red)" : e.x.color } })),
          SS.el("span", { class: "n", text: e.r.t < 0 ? "früh" : e.r.t + "ms" }),
        ])));
        box.appendChild(SS.el("p", { class: "muted center", text: "Wer zu früh tippt, trinkt einen Schluck." }));
        if (ctx.isHost) box.appendChild(SS.el("div", { class: "btn-row", style: { justifyContent: "center", marginTop: "14px" } }, [
          SS.el("button", { class: "btn btn-gold btn-lg", text: "Nächste Runde", onclick: () => SS.act("again", {}) }),
        ]));
      }
      return box;
    },
    action(ctx, pid, name, payload) {
      const p = ctx.pub;
      if (name === "arm") {
        p.stage = "armed";
        p.armedAt = Date.now();
        p.presses = {};
        if (p._arm) clearTimeout(p._arm);
        // Kurzes Zeitfenster im lokalen Modus, damit der Host nicht immer gewinnt.
        if (ctx.isLocal) p._arm = setTimeout(() => {}, 10);
      } else if (name === "press") {
        if (p.presses[pid] !== undefined) return;
        const t = p.stage === "wait" ? -1 : Date.now() - (p.armedAt || Date.now());
        p.presses[pid] = { t: t };
        if (t < 0) {
          ctx.addScore(pid, -1);
          chronicle(ctx, "schluck", wer(pid, ctx), -1);
        }
      } else if (name === "resolve") {
        p.stage = "result";
        const rows = Object.keys(p.presses).filter((k) => p.presses[k].t >= 0);
        if (rows.length) {
          rows.sort((a, b) => p.presses[a].t - p.presses[b].t);
          ctx.addScore(rows[0], 1);
          chronicle(ctx, "sieg", wer(rows[0], ctx), 1);
          ctx.log(wer(rows[0], ctx) + " war schneller.");
        }
      } else if (name === "again") {
        p.stage = "wait"; p.presses = {}; p.armedAt = null;
        ctx.state.round++;
        if (ctx.isHost) {
          setTimeout(() => { if (SS.state.gameId === "reaktionsduell" && SS.state.pub.stage === "wait") SS.applyActionRaw("host", "arm", {}); }, 1500 + Math.random() * 2500);
        }
        ctx.sync();
      }
    },
  });

  /* ══ Franken-Quiz ═══════════════════════════════════════════════════════ */
  SS.registerImpl("quiz", {
    init(ctx) {
      ctx.pub.game = "quiz";
      ctx.pub.stage = "ask";
      const pool = ctx.settings.themen && ctx.settings.themen !== "alle"
        ? C.QUIZ.filter((q) => q.t === ctx.settings.themen) : C.QUIZ.slice();
      ctx.pub.questions = shufflePool(ctx, pool);
      ctx.pub.idx = 0;
      ctx.pub.answers = {};
      ctx.pub.q = ctx.pub.questions[0];
    },
    render(ctx) {
      const p = ctx.pub;
      const box = SS.el("div");
      const q = p.q || (p.questions && p.questions[p.idx]);
      box.appendChild(SS.el("div", { class: "eyebrow center", text: "Frage " + (p.idx + 1) + " von " + p.questions.length + " · " + (q ? q.t : "") }));

      if (p.stage === "ask") {
        box.appendChild(SS.el("div", { class: "big-prompt small", text: q ? q.q : "" }));
        const me = SS.activePid();
        const mine = p.answers[me];
        const grid = SS.el("div", { class: "vote-grid", style: { maxWidth: "820px", margin: "0 auto" } });
        (q ? q.a : []).forEach((ans, i) => grid.appendChild(SS.el("button", {
          class: "vote-btn" + (mine === i ? " chosen" : ""),
          disabled: !ctx.canAct(me) || mine !== undefined,
          onclick: () => SS.actAs(me, "answer", { i: i }),
        }, [SS.el("span", { class: "avatar", style: { background: ctx.colorFor(i) }, text: String.fromCharCode(65 + i) }), SS.el("span", { class: "nm", text: ans })])));
        box.appendChild(grid);
        const open = living(ctx).filter((x) => !p.answers[x.id]).map((x) => x.name);
        box.appendChild(SS.el("div", { class: "roster", style: { justifyContent: "center", marginTop: "12px" } }, living(ctx).map((x) =>
          SS.el("span", { class: "pill" + (p.answers[x.id] !== undefined ? " done" : ""), text: x.name }))));
        if (open.length) box.appendChild(SS.el("p", { class: "muted center", text: "Fehlt noch: " + open.join(", ") }));
        if (ctx.isHost) box.appendChild(SS.el("div", { class: "btn-row", style: { justifyContent: "center", marginTop: "14px" } }, [
          SS.el("button", { class: "btn btn-red", text: "Auflösen", onclick: () => SS.act("resolve", {}) }),
        ]));
      } else {
        const correct = q.c;
        (q ? q.a : []).forEach((ans, i) => box.appendChild(SS.el("div", { class: "poll-row" + (i === correct ? " winner" : "") }, [
          SS.el("span", { class: "nm", text: String.fromCharCode(65 + i) + ": " + ans }),
          SS.el("span", { class: "poll-track" }, SS.el("span", { class: "poll-bar", style: { width: (i === correct ? "100" : "22") + "%", background: i === correct ? "var(--green)" : "var(--red)" } })),
          SS.el("span", { class: "n", text: countAnswers(p, i) + "" }),
        ])));
        const right = SS.el("div", { class: "roster", style: { justifyContent: "center", marginTop: "12px" } });
        Object.keys(p.answers).forEach((pid) => {
          if (p.answers[pid] === correct) right.appendChild(SS.el("span", { class: "pill done", text: wer(pid, ctx) + " ✓" }));
        });
        box.appendChild(right);
        if (ctx.isHost) {
          const last = p.idx >= p.questions.length - 1;
          box.appendChild(SS.el("div", { class: "btn-row", style: { justifyContent: "center", marginTop: "14px" } }, [
            last
              ? SS.el("button", { class: "btn btn-gold btn-lg", text: "Endstand zeigen", onclick: () => SS.act("finish", {}) })
              : SS.el("button", { class: "btn btn-gold btn-lg", text: "Nächste Frage", onclick: () => SS.act("next", {}) }),
          ]));
        }
      }
      return box;
    },
    action(ctx, pid, name, payload) {
      const p = ctx.pub;
      const q = p.q;
      if (name === "answer") {
        if (p.answers[pid] !== undefined) return;
        p.answers[pid] = payload.i;
      } else if (name === "resolve") {
        p.stage = "result";
        let best = null;
        Object.keys(p.answers).forEach((k) => {
          if (p.answers[k] === q.c) {
            ctx.addScore(k, 1);
            chronicle(ctx, "sieg", wer(k, ctx), 1);
            if (!best) best = k;
          }
        });
        ctx.log(q.q + " → " + q.a[q.c] + (best ? " (" + wer(best, ctx) + ")" : " (keiner)"));
      } else if (name === "next") {
        p.idx++;
        p.q = p.questions[p.idx];
        p.answers = {};
        p.stage = "ask";
        ctx.state.round++;
        ctx.sync();
      } else if (name === "finish") {
        ctx.finish({ title: "Quiz beendet" });
      }
    },
  });

  function shufflePool(ctx, pool) {
    const seed = (ctx.state.syncSeed || ctx.state.code || "lokal") + ":" + ctx.state.round;
    return SS.shuffle(pool, ctx.rng(seed));
  }
  function countAnswers(p, i) {
    return Object.keys(p.answers).filter((k) => p.answers[k] === i).length;
  }

  /* ══ Zungenbrecher ══════════════════════════════════════════════════════ */
  SS.registerImpl("zungenbrecher", {
    init(ctx) {
      ctx.pub.game = "zungenbrecher";
      ctx.pub.stage = "ready";
      ctx.pub.done = {};
      ctx.pub.twister = SS.pick(C.ZUNGENBRECHER, ctx.rng((ctx.state.syncSeed || "lokal") + ":zt:" + ctx.round));
    },
    render(ctx) {
      const p = ctx.pub;
      const box = SS.el("div");
      box.appendChild(SS.el("div", { class: "eyebrow center", text: "Zungenbrecher · Runde " + ctx.round }));
      box.appendChild(SS.el("div", { class: "big-prompt small", text: p.twister }));

      if (p.stage === "ready") {
        box.appendChild(SS.el("p", { class: "lead center", text: "Der Host startet die Uhr. Jeder sagt's dreimal schnell vor sich hin — wer fertig is, tippt auf seinen Namen." }));
        const dec = SS.el("div", { class: "btn-row", style: { justifyContent: "center" } }, living(ctx).map((x) => SS.el("button", {
          class: "vote-btn" + (p.done[x.id] ? " chosen" : ""),
          onclick: () => SS.actAs(x.id, "done", {}),
        }, [av(x.id, ctx), SS.el("span", { class: "nm", text: x.name })])));
        box.appendChild(dec);
        if (ctx.isHost) box.appendChild(SS.el("div", { class: "btn-row", style: { justifyContent: "center", marginTop: "12px" } }, [
          SS.el("button", { class: "btn btn-red", text: "Uhr starten", onclick: () => SS.act("start", {}) }),
        ]));
      } else if (p.stage === "run") {
        box.appendChild(SS.el("div", { class: "timer-ring " + (p.left <= 5 ? "urgent" : "") }, [SS.el("div", { class: "clock", id: "ztClock", text: String(p.left) })]));
        box.appendChild(SS.el("div", { class: "btn-row", style: { justifyContent: "center" } }, living(ctx).map((x) => SS.el("button", {
          class: "vote-btn" + (p.done[x.id] ? " chosen" : ""),
          disabled: p.done[x.id],
          onclick: () => SS.actAs(x.id, "done", {}),
        }, [av(x.id, ctx), SS.el("span", { class: "nm", text: x.name }), p.done[x.id] ? SS.el("span", { class: "yours", text: "gschafft" }) : null]))));
      } else {
        const done = Object.keys(p.done);
        box.appendChild(SS.el("h2", { class: "center", text: done.length + " von " + living(ctx).length + " habn's gschafft" }));
        box.appendChild(SS.el("div", { class: "roster", style: { justifyContent: "center" } }, living(ctx).map((x) =>
          SS.el("span", { class: "pill" + (p.done[x.id] ? " done" : ""), text: x.name + (p.done[x.id] ? " ✓" : " ✗") }))));
        box.appendChild(SS.el("p", { class: "muted center", text: "Wer's ned gschafft hat, " + SS.ui.penaltyWord() + "." }));
        if (ctx.isHost) box.appendChild(SS.el("div", { class: "btn-row", style: { justifyContent: "center", marginTop: "12px" } }, [
          SS.el("button", { class: "btn btn-gold btn-lg", text: ((ctx.pub.idx || 0) + 1 >= Number(ctx.settings.runden || 6) ? "Endstand zeigen" : "Nächster Zungenbrecher"), onclick: () => SS.act("next", {}) }),
        ]));
      }
      return box;
    },
    action(ctx, pid, name, payload) {
      const p = ctx.pub;
      if (name === "start") {
        p.stage = "run";
        p.startedAt = Date.now();
        p.seconds = 20;
        p.left = p.seconds;
        if (p._tick) clearInterval(p._tick);
        startZT(ctx);
      } else if (name === "done") {
        if (!p.done[pid]) {
          p.done[pid] = true;
          ctx.addScore(pid, 1);
          chronicle(ctx, "sieg", wer(pid, ctx), 1);
        }
      } else if (name === "resolve") {
        p.stage = "result";
      } else if (name === "next") {
        const limit = Number(ctx.settings.runden || 6);
        if ((p.idx || 0) + 1 >= limit) { ctx.finish({ title: "Zungenbrecher beendet" }); return; }
        p.idx = (p.idx || 0) + 1;
        p.stage = "ready";
        p.done = {};
        p.twister = SS.pick(C.ZUNGENBRECHER, ctx.rng((ctx.state.syncSeed || "lokal") + ":zt:" + (ctx.state.round + 1)));
        ctx.state.round++;
        ctx.sync();
      }
    },
  });

  function startZT(ctx) {
    const p = ctx.pub;
    p._tick = setInterval(() => {
      if (ctx.state.phase !== "playing" || ctx.pub.game !== "zungenbrecher" || ctx.pub.stage !== "run") {
        clearInterval(p._tick); p._tick = null; return;
      }
      p.left = Math.max(0, Math.ceil((p.startedAt + p.seconds * 1000 - Date.now()) / 1000));
      SS.emit("syncBoard");
      if (p.left <= 0) { clearInterval(p._tick); p._tick = null; if (ctx.isHost) SS.applyActionRaw("host", "resolve", {}); }
    }, 400);
  }

  /* ══ Turnierbaum ════════════════════════════════════════════════════════ */
  function buildBracket(ctx) {
    const pool = SS.shuffle(living(ctx).map((x) => x.id), ctx.rng("bracket:" + (ctx.state.syncSeed || ctx.state.code || "lokal")));
    const matches = [];
    for (let i = 0; i < pool.length; i += 2) matches.push({ a: pool[i], b: pool[i + 1] || null, win: null });
    return { rounds: [matches], round: 0 };
  }
  SS.registerImpl("turnierbaum", {
    init(ctx) {
      ctx.pub.game = "turnierbaum";
      ctx.pub.bracket = buildBracket(ctx);
      ctx.pub.duell = SS.pick(C.DUELLE);
      ctx.pub.champion = null;
    },
    render(ctx) {
      const p = ctx.pub;
      const box = SS.el("div");
      box.appendChild(SS.el("div", { class: "eyebrow center", text: "Turnierbaum · " + (p.duell ? p.duell.icon + " " + p.duell.name : "") }));

      if (p.champion) {
        box.appendChild(SS.el("div", { class: "eyebrow center", text: "Sieger" }));
        box.appendChild(SS.el("div", { class: "big-prompt", text: wer(p.champion, ctx) }));
        box.appendChild(SS.el("p", { class: "muted center", text: "Der Sieger darf austeilen — zwei Schlucke an wen er will." }));
        if (ctx.isHost) box.appendChild(SS.el("div", { class: "btn-row", style: { justifyContent: "center" } }, [
          SS.el("button", { class: "btn btn-gold btn-lg", text: "Neues Turnier", onclick: () => SS.act("again", {}) }),
        ]));
        return box;
      }

      const br = el("div", { class: "bracket" });
      br.rows = null;
      p.bracket.rounds.forEach((ms, ri) => {
        const col = SS.el("div", { class: "bracket-round" }, [SS.el("h4", { text: ri === 0 ? "Erste Runde" : (ms.length * 2) + "er-Runde" })]);
        ms.forEach((m, mi) => {
          const node = SS.el("div", { class: "match" });
          [[m.a, "a"], [m.b, "b"]].forEach((pair) => {
            const pid = pair[0], side = pair[1];
            if (!pid) { node.appendChild(SS.el("div", { class: "side open", text: "Freilos" })); return; }
            const isWin = m.win === pid;
            const clickable = p.bracket.round === ri && !m.win && ctx.isHost;
            node.appendChild(SS.el("div", {
              class: "side" + (isWin ? " win" : ""),
              style: clickable ? { cursor: "pointer" } : null,
              onclick: clickable ? () => SS.act("win", { r: ri, m: mi, pid: pid }) : null,
            }, [av(pid, ctx), SS.el("span", { text: wer(pid, ctx) })]));
          });
          col.appendChild(node);
        });
        br.appendChild(col);
      });
      box.appendChild(br);
      if (!ctx.isHost) box.appendChild(SS.el("p", { class: "muted center", text: "Der Host tippt die Sieger an." }));
      else box.appendChild(SS.el("p", { class: "muted center", text: "Tippe den Sieger eines Paares an. Bei Freilos geht's automatisch weiter." }));
      return box;
    },
    action(ctx, pid, name, payload) {
      const p = ctx.pub;
      if (name === "win") {
        const ms = p.bracket.rounds[payload.r];
        const m = ms[payload.m];
        if (!m || m.win) return;
        m.win = payload.pid;
        if (ms.every((x) => x.win || !x.b)) advanceBracket(ctx);
      } else if (name === "again") {
        p.bracket = buildBracket(ctx);
        p.duell = SS.pick(C.DUELLE);
        p.champion = null;
        ctx.state.round++;
        ctx.sync();
      }
    },
  });
  function el(tag, attrs, ch) { return SS.el(tag, attrs, ch); }

  function advanceBracket(ctx) {
    const p = ctx.pub;
    const cur = p.bracket.rounds[p.bracket.round];
    const winners = cur.map((m) => m.win).filter(Boolean);
    if (winners.length <= 1) {
      p.champion = winners[0] || null;
      if (p.champion) { ctx.addScore(p.champion, 2); chronicle(ctx, "sieg", wer(p.champion, ctx), 2); }
      ctx.sync();
      return;
    }
    const next = [];
    for (let i = 0; i < winners.length; i += 2) next.push({ a: winners[i], b: winners[i + 1] || null, win: null });
    p.bracket.rounds.push(next);
    p.bracket.round++;
    ctx.sync();
  }
})();
