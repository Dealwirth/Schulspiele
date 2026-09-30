/* ==========================================================================
   Seidla — Wirtshausrunde
   Ich hab noch nie · Wer würde eher · Wahrheit oder Pflicht · Flaschendrehen
   ========================================================================== */
(function () {
  "use strict";
  const SS = window.SS;
  const C = SS.content;
  const U = () => SS.util;

  const wer = (pid, ctx) => { const p = ctx.player(pid); return p ? p.name : "—"; };
  const av = (pid, ctx) => { const p = ctx.player(pid); return SS.el("span", { class: "avatar", style: { background: p ? p.color : "#999" }, text: SS.initial(p ? p.name : "?") }); };
  const living = (ctx) => ctx.players.filter((x) => x.connected !== false);

  /** Rotierende Liste, damit bei vielen Leuten nicht immer dieselben drankommen. */
  function rotation(ctx, seed, count) {
    const pool = SS.shuffle(living(ctx).map((x) => x.id), ctx.rng("rot:" + (ctx.state.syncSeed || ctx.state.code || "lokal") + ":" + seed));
    return pool.slice(0, Math.max(1, count || 1));
  }

  /* Der Host hält den Vorrat an Karten; alle Geräte sehen dieselbe Reihenfolge. */
  function deck(ctx, pool) {
    const key = ctx.state.gameId + ":deck";
    const seed = ctx.state.syncSeed || String(ctx.state.code || "lokal");
    const order = SS.shuffle(pool.map((_, i) => i), ctx.rng(seed + key));
    return order;
  }

  function draw(ctx, pool) {
    if (!ctx.pub.order || ctx.pub.order.length !== pool.length) ctx.pub.order = deck(ctx, pool);
    if (ctx.pub.idx === undefined) ctx.pub.idx = 0;
    const i = ctx.pub.order[ctx.pub.idx % pool.length];
    return pool[i];
  }

  function nextCard(ctx, pool, extra) {
    ctx.pub.idx = (ctx.pub.idx === undefined ? 0 : ctx.pub.idx) + 1;
    ctx.pub.stage = "prompt";
    ctx.pub.answers = {};
    ctx.pub.revealed = false;
    if (extra) Object.assign(ctx.pub, extra);
    ctx.pub.card = draw(ctx, pool);
    ctx.sync();
  }

  /** Nach so vielen Karten ist Schluss und es gibt einen Endstand. */
  function cardLimit(ctx) {
    return Number((ctx.settings && ctx.settings.karten) || 12);
  }

  function finishOrNext(ctx, pool) {
    if ((ctx.pub.idx || 0) + 1 >= cardLimit(ctx)) {
      ctx.finish({ title: "Runde beendet" });
      return;
    }
    nextCard(ctx, pool);
  }

  function runde(done, ctx, opts) {
    // Rundenende protokollieren und Punkte/Schlucke verteilen
    const meta = SS.getMeta(ctx.state.gameId);
    ctx.log("Runde " + ctx.state.round + " · " + meta.name);
    SS.store.addChronicle({
      type: "runde", groupCode: ctx.state.code || null, game: meta.name,
      round: ctx.state.round, who: (opts && opts.who) || null,
    });
    if (ctx.isHost) { ctx.state.round++; }
  }

  /* ══ Ich hab noch nie ═══════════════════════════════════════════════════ */
  SS.registerImpl("ichhabnochnie", {
    init(ctx) {
      ctx.pub.game = "ichhabnochnie";
      ctx.pub.drinks = {};
      nextCard(ctx, C.ICH_NOCH_NIE);
    },
    render(ctx) {
      const p = ctx.pub;
      const all = living(ctx);
      const order = all.length > 14 ? all.slice(0, 14) : all;
      const box = SS.el("div");
      box.appendChild(SS.el("div", { class: "eyebrow center", text: "Runde " + ctx.round }));

      if (p.stage === "prompt") {
        const me = SS.activePid();
        const mine = p.answers[me];
        const row = SS.el("div", { class: "btn-row", style: { justifyContent: "center", gap: "14px" } }, [
          SS.el("button", {
            class: "btn btn-gold btn-lg" + (mine === "scho" ? " chosen" : ""),
            text: "Hab i scho · " + SS.ui.penaltyWord().replace("trinkt ", "").replace("erfüllt ", ""),
            disabled: !ctx.canAct(me),
            onclick: () => SS.actAs(me, "answer", { v: "scho" }),
          }),
          SS.el("button", {
            class: "btn btn-outline btn-lg" + (mine === "nie" ? " chosen" : ""),
            text: "Noch nie",
            disabled: !ctx.canAct(me),
            onclick: () => SS.actAs(me, "answer", { v: "nie" }),
          }),
        ]);

        // In großer Runde wartet man nicht auf alle — wer will, antwortet.
        if (all.length > 14) {
          box.appendChild(SS.el("div", { class: "big-prompt small", text: "Tippt, was auf euch zutrifft." }));
          box.appendChild(row);
          box.appendChild(SS.el("div", { class: "roster", style: { justifyContent: "center" } },
            all.map((x) => SS.el("span", { class: "pill" + (p.answers[x.id] ? " done" : ""), text: x.name }))));
        } else {
          box.appendChild(SS.el("div", { class: "big-prompt small", text: p.card }));
          box.appendChild(row);
          const open = all.filter((x) => !p.answers[x.id]).map((x) => x.name);
          box.appendChild(SS.el("div", { class: "roster", style: { justifyContent: "center" } },
            all.map((x) => SS.el("span", { class: "pill" + (p.answers[x.id] ? " done" : ""), text: x.name }))));
          if (open.length) box.appendChild(SS.el("p", { class: "muted center", text: "Fehlt noch: " + open.join(", ") }));
        }

        if (ctx.isHost) box.appendChild(SS.el("div", { class: "btn-row", style: { justifyContent: "center", marginTop: "16px" } }, [
          SS.el("button", { class: "btn btn-red", text: "Auflösen", onclick: () => SS.act("reveal", {}) }),
        ]));
      } else {
        box.appendChild(SS.el("div", { class: "big-prompt small", text: p.card }));
        const drinkers = Object.keys(p.answers).filter((k) => p.answers[k] === "scho");
        box.appendChild(SS.el("h2", { class: "center", text: drinkers.length + " Leut trifft's" }));
        const list = SS.el("div", { class: "roster", style: { justifyContent: "center" } });
        if (drinkers.length) drinkers.forEach((pid) => list.appendChild(SS.el("span", { class: "pill done", text: wer(pid, ctx) })));
        else list.appendChild(SS.el("span", { class: "pill", text: "Keiner — a saubere Runde!" }));
        box.appendChild(list);
        box.appendChild(SS.el("p", { class: "muted center", text: "Strafe: " + SS.ui.penaltyWord() + "." }));
        if (ctx.isHost) box.appendChild(SS.el("div", { class: "btn-row", style: { justifyContent: "center", marginTop: "16px" } }, [
          SS.el("button", { class: "btn btn-gold btn-lg", text: (ctx.pub.idx + 1 >= cardLimit(ctx) ? "Endstand zeigen" : "Nächste Karte"), onclick: () => { runde(true, ctx); SS.act("next", {}); } }),
        ]));
      }
      return box;
    },
    action(ctx, pid, name, payload) {
      const p = ctx.pub;
      if (name === "answer") {
        p.answers[pid] = payload.v;
        if (payload.v === "scho") {
          ctx.addScore(pid, 1);
          SS.store.addChronicle({ type: "schluck", groupCode: ctx.state.code || null, who: wer(pid, ctx), points: 1, game: SS.getMeta(ctx.state.gameId).name });
        }
      } else if (name === "reveal") {
        p.stage = "result";
      } else if (name === "next") {
        finishOrNext(ctx, C.ICH_NOCH_NIE);
      }
    },
  });

  /* ══ Wer würde eher ═════════════════════════════════════════════════════ */
  SS.registerImpl("werwuerdeeher", {
    init(ctx) {
      ctx.pub.game = "werwuerdeeher";
      ctx.pub.tally = {};
      nextCard(ctx, C.WER_WUERDE);
    },
    render(ctx) {
      const p = ctx.pub;
      const box = SS.el("div");
      box.appendChild(SS.el("div", { class: "eyebrow center", text: "Runde " + ctx.round }));
      box.appendChild(SS.el("div", { class: "big-prompt small", text: p.card }));

      if (p.stage === "prompt") {
        const me = SS.activePid();
        const mine = p.answers[me];
        const grid = SS.el("div", { class: "vote-grid", style: { maxWidth: "780px", margin: "0 auto" } });
        ctx.players.filter((x) => x.connected !== false).forEach((x) => {
          grid.appendChild(SS.el("button", {
            class: "vote-btn" + (mine === x.id ? " chosen" : ""),
            disabled: !ctx.canAct(me),
            onclick: () => SS.actAs(me, "vote", { target: x.id }),
          }, [av(x.id, ctx), SS.el("span", { class: "nm", text: x.name }), x.id === me ? SS.el("span", { class: "yours", text: "du" }) : null]));
        });
        box.appendChild(grid);
        const open = ctx.players.filter((x) => x.connected !== false && !p.answers[x.id]).map((x) => x.name);
        if (open.length) box.appendChild(SS.el("p", { class: "muted center", style: { marginTop: "12px" }, text: "Fehlt noch: " + open.join(", ") }));
        if (ctx.isHost) box.appendChild(SS.el("div", { class: "btn-row", style: { justifyContent: "center", marginTop: "16px" } }, [
          SS.el("button", { class: "btn btn-red", text: "Stimmen zeigen", onclick: () => SS.act("reveal", {}) }),
        ]));
      } else {
        const counts = {};
        Object.keys(p.answers).forEach((pid) => { const t = p.answers[pid]; counts[t] = (counts[t] || 0) + 1; });
        const max = Math.max(1, ...Object.values(counts));
        const order = ctx.players.slice().sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0));
        const wrap = SS.el("div", { style: { maxWidth: "700px", margin: "0 auto" } });
        order.forEach((x) => {
          const n = counts[x.id] || 0;
          wrap.appendChild(SS.el("div", { class: "poll-row" + (n === max && n > 0 ? " winner" : "") }, [
            SS.el("span", { class: "nm", text: x.name }),
            SS.el("span", { class: "poll-track" }, SS.el("span", { class: "poll-bar", style: { width: Math.round((n / max) * 100) + "%", background: x.color } })),
            SS.el("span", { class: "n", text: String(n) }),
          ]));
        });
        box.appendChild(wrap);
        const top = order.filter((x) => (counts[x.id] || 0) === max && max > 0);
        if (top.length) box.appendChild(SS.el("div", { class: "banner gold center", text: "Gewählt: " + top.map((x) => x.name).join(", ") + " — ein Schluck!" }));
        if (ctx.isHost) box.appendChild(SS.el("div", { class: "btn-row", style: { justifyContent: "center", marginTop: "16px" } }, [
          SS.el("button", { class: "btn btn-gold btn-lg", text: (ctx.pub.idx + 1 >= cardLimit(ctx) ? "Endstand zeigen" : "Nächste Frage"), onclick: () => { runde(true, ctx); SS.act("next", {}); } }),
        ]));
      }
      return box;
    },
    action(ctx, pid, name, payload) {
      const p = ctx.pub;
      if (name === "vote") {
        p.answers[pid] = payload.target;
        ctx.pub.tally[payload.target] = (ctx.pub.tally[payload.target] || 0) + 1;
      } else if (name === "reveal") {
        p.stage = "result";
        const counts = {};
        Object.keys(p.answers).forEach((k) => { const t = p.answers[k]; counts[t] = (counts[t] || 0) + 1; });
        const max = Math.max(0, ...Object.values(counts));
        Object.keys(counts).forEach((t) => {
          if (counts[t] === max && max > 0) {
            ctx.addScore(t, 1);
            SS.store.addChronicle({ type: "schluck", groupCode: ctx.state.code || null, who: wer(t, ctx), points: 1, game: "Wer würde eher" });
          }
        });
      } else if (name === "next") {
        finishOrNext(ctx, C.WER_WUERDE);
      }
    },
  });

  /* ══ Wahrheit oder Pflicht ══════════════════════════════════════════════ */
  SS.registerImpl("wahrheitpflicht", {
    init(ctx) {
      ctx.pub.game = "wahrheitpflicht";
      ctx.pub.stage = "choose";
      ctx.state.turn = (ctx.players[0] || {}).id || null;
    },
    render(ctx) {
      const p = ctx.pub;
      const box = SS.el("div");
      const order = ctx.players.filter((x) => x.connected !== false);
      if (!order.length) return SS.el("p", { class: "muted", text: "Keine Spieler." });
      const cur = ctx.state.turn && order.some((x) => x.id === ctx.state.turn) ? ctx.state.turn : order[0].id;

      box.appendChild(SS.el("div", { class: "turn-banner" }, [av(cur, ctx),
        SS.el("span", { text: ctx.canAct(cur) ? "Du bist dran" : "Dran: " + wer(cur, ctx) })]));

      if (p.stage === "choose") {
        box.appendChild(SS.el("div", { class: "big-prompt", text: "Wahrheit oder Pflicht?" }));
        box.appendChild(SS.el("div", { class: "btn-row", style: { justifyContent: "center", gap: "16px" } }, [
          SS.el("button", { class: "btn btn-outline btn-lg", text: "Wahrheit", disabled: !ctx.canAct(cur), onclick: () => SS.actAs(cur, "pick", { kind: "wahrheit" }) }),
          SS.el("button", { class: "btn btn-red btn-lg", text: "Pflicht", disabled: !ctx.canAct(cur), onclick: () => SS.actAs(cur, "pick", { kind: "pflicht" }) }),
        ]));
      } else {
        const pool = p.kind === "pflicht" ? C.PFLICHT : C.WAHRHEIT;
        box.appendChild(SS.el("div", { class: "dare-card" }, [
          SS.el("div", { class: "kicker", text: p.kind === "pflicht" ? "Pflicht" : "Wahrheit" }),
          av(cur, ctx),
          SS.el("div", { class: "text", text: p.text }),
        ]));
        if (ctx.canAct(cur) || ctx.isHost) {
          box.appendChild(SS.el("div", { class: "btn-row", style: { justifyContent: "center", marginTop: "16px" } }, [
            SS.el("button", { class: "btn btn-gold", text: "Erledigt — weiter", onclick: () => SS.actAs(cur, "done", {}) }),
            SS.el("button", { class: "btn btn-ghost", text: "Andere Karte", onclick: () => SS.actAs(cur, "redraw", {}) }),
          ]));
        }
      }
      box.appendChild(SS.el("div", { class: "roster", style: { justifyContent: "center", marginTop: "14px" } },
        order.map((x) => SS.el("span", { class: "pill" + (x.id === cur ? " done" : ""), text: x.name }))));
      return box;
    },
    action(ctx, pid, name, payload) {
      const p = ctx.pub;
      if (name === "pick") {
        p.kind = payload.kind;
        p.text = SS.pick(payload.kind === "pflicht" ? C.PFLICHT : C.WAHRHEIT);
        p.stage = "card";
      } else if (name === "redraw") {
        p.text = SS.pick(p.kind === "pflicht" ? C.PFLICHT : C.WAHRHEIT);
      } else if (name === "done") {
        const meta = SS.getMeta(ctx.state.gameId);
        ctx.log(wer(pid, ctx) + " hat " + (p.kind === "pflicht" ? "die Pflicht" : "die Wahrheit") + " erledigt.");
        SS.store.addChronicle({ type: "runde", groupCode: ctx.state.code || null, game: meta.name, round: ctx.state.round, who: wer(pid, ctx) });
        p.stage = "choose";
        p.kind = null; p.text = null;
        ctx.state.round++;
        ctx.state.turn = U().nextSeat(ctx);
        ctx.sync();
      }
    },
  });

  /* ══ Flaschendrehen ═════════════════════════════════════════════════════ */
  SS.registerImpl("flaschendrehen", {
    init(ctx) {
      ctx.pub.game = "flaschendrehen";
      ctx.pub.stage = "spin";
      ctx.pub.spins = 0;
    },
    render(ctx) {
      const p = ctx.pub;
      const order = ctx.players.filter((x) => x.connected !== false);
      const box = SS.el("div");
      box.appendChild(SS.el("div", { class: "eyebrow center", text: "Flaschendrehen" }));

      const wheel = SS.el("div", { class: "wheel-wrap" });
      wheel.appendChild(SS.el("div", { class: "bomb", text: "🍾" }));
      if (p.stage === "result" && p.target) {
        wheel.appendChild(SS.el("div", { class: "wheel-name", text: wer(p.target, ctx) }));
        wheel.appendChild(SS.el("p", { class: "muted", text: "Die Flasche zeigt auf " + wer(p.target, ctx) + "." }));
      } else {
        wheel.appendChild(SS.el("div", { class: "wheel-name", text: "…" }));
      }
      box.appendChild(wheel);

      if (p.stage === "spin") {
        box.appendChild(SS.el("div", { class: "btn-row", style: { justifyContent: "center" } }, [
          SS.el("button", { class: "btn btn-gold btn-lg", text: "Flasche drehen", disabled: !ctx.isHost, onclick: () => SS.act("spin", {}) }),
        ]));
        if (!ctx.isHost) box.appendChild(SS.el("p", { class: "muted center", text: "Der Wirt dreht die Flasche." }));
      } else {
        box.appendChild(SS.el("div", { class: "dare-card" }, [
          SS.el("div", { class: "kicker", text: p.card && p.card.label }),
          av(p.target, ctx),
          SS.el("div", { class: "text", text: p.card ? p.card.text : "" }),
        ]));
        box.appendChild(SS.el("div", { class: "btn-row", style: { justifyContent: "center", marginTop: "16px" } }, [
          SS.el("button", { class: "btn btn-gold", text: "Erledigt", onclick: () => SS.act("resolve", {}) }),
          SS.el("button", { class: "btn btn-ghost", text: "Neue Karte", onclick: () => SS.act("redraw", {}) }),
        ]));
        box.appendChild(SS.el("p", { class: "muted center", text: "Alternativ: " + SS.content.trinkspruch() }));
      }
      box.appendChild(SS.el("div", { class: "roster", style: { justifyContent: "center", marginTop: "14px" } },
        living(ctx).slice(0, 40).map((x) => SS.el("span", { class: "pill" + (x.id === p.target ? " done" : ""), text: x.name }))));
      return box;
    },
    action(ctx, pid, name, payload) {
      const p = ctx.pub;
      if (name === "spin") {
        p.spins = (p.spins || 0) + 1;
        // Deterministisch aus dem Zugzähler, damit alle Geräte dasselbe zeigen.
        const rnd = ctx.rng("flasche:" + (ctx.state.syncSeed || ctx.state.code || "lokal") + ":" + p.spins);
        const pick = rotation(ctx, "flasche:" + p.spins, 1)[0];
        p.target = pick || null;
        p.card = SS.pick(C.FLASCHE, rnd);
        p.stage = "result";
      } else if (name === "redraw") {
        p.card = SS.pick(C.FLASCHE);
      } else if (name === "resolve") {
        const meta = SS.getMeta(ctx.state.gameId);
        if (p.target) SS.store.addChronicle({ type: "runde", groupCode: ctx.state.code || null, game: meta.name, round: ctx.state.round, who: wer(p.target, ctx) });
        ctx.log(wer(p.target, ctx) + ": " + (p.card ? p.card.label : "Aufgabe") + " erledigt.");
        ctx.state.round++;
        p.stage = "spin"; p.target = null; p.card = null;
        ctx.sync();
      }
    },
  });
})();
