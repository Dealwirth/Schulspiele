/* ==========================================================================
   Schulspiele — Party-, Wort- und Gruppenspiele
   Reaktion · Buchstabensalat · Der Ordnung nach · Wer bin ich?
   Wer bist du? · Grosse Debatte · Fünf-Sieben-Fünf
   ========================================================================== */
(function () {
  "use strict";
  const SS = window.SS;
  const { el } = SS;
  const U = () => SS.util;

  /* Laufzeitzustand je Gerät (nicht Teil des geteilten Spielstands). */
  const local = {
    runId: null,
    startAt: 0,
    goAt: 0,
    goRunId: null,
    tickerKey: null,
  };
  function markRun(runId) {
    if (local.runId !== runId) { local.runId = runId; local.startAt = Date.now(); local.goAt = 0; }
    return local.startAt;
  }
  function elapsedSeconds() { return (Date.now() - local.startAt) / 1000; }

  function stopTick() { if (local.tickerKey) { U().clearTicker(local.tickerKey); local.tickerKey = null; } }
  function startTick(key, fn) {
    const k = "party:" + key;
    local.tickerKey = k;
    U().setTicker(k, fn, 400);
  }

  function dataList() {
    return window.SS_DATA || {};
  }

  /* ══════════════════════════════════════════════════════════════════════
     REAKTION
     ══════════════════════════════════════════════════════════════════════ */
  const reaction = {
    init(ctx) {
      ctx.pub.game = "reaction";
      ctx.pub.rounds = Number(ctx.settings.rounds) || 5;
      ctx.pub.run = 1;
      ctx.pub.runId = SS.uid(6);
      ctx.pub.phase = "idle";    // idle | armed | go | done
      ctx.pub.results = {};      // pid -> ms
      ctx.pub.foul = {};         // pid -> true
      ctx.pub.lastWinner = null;
      ctx.log("Reaktion gestartet. Der Host gibt die Durchgänge frei.");
    },
    action(ctx, pid, name, payload) {
      const pub = ctx.pub;
      if (name === "arm") {
        if (!ctx.isHost && !ctx.isLocal) return;
        if (pub.phase === "armed" || pub.phase === "go") return;
        pub.results = {}; pub.foul = {}; pub.lastWinner = null;
        pub.phase = "armed"; pub.runId = SS.uid(6);
        pub.goAfter = 1200 + Math.floor(Math.random() * 2600);
        pub.armStamp = Date.now();
        const wait = pub.goAfter;
        setTimeout(() => {
          if (ctx.pub.phase !== "armed" || ctx.pub.runId !== pub.runId) return;
          ctx.pub.phase = "go";
          ctx.pub.goStamp = Date.now();
          ctx.sync(); ctx.rerender();
        }, wait);
      } else if (name === "press") {
        if (pub.phase === "armed") {
          pub.foul[pid] = true;
          ctx.log(ctx.player(pid).name + " war zu früh.");
        } else if (pub.phase === "go" && !pub.results[pid] && !pub.foul[pid]) {
          pub.results[pid] = Math.max(0, Math.round(payload.ms));
          resolveReaction(ctx);
        }
      } else if (name === "next") {
        pub.run++;
        if (pub.run > pub.rounds) { ctx.state.phase = "over"; ctx.finish(); return; }
        pub.phase = "idle"; pub.results = {}; pub.foul = {}; pub.lastWinner = null;
        pub.runId = SS.uid(6);
      }
    },
    render(ctx) {
      const pub = ctx.pub;
      if (pub.game !== "reaction" || !pub.rounds) return el("div");
      const wrap = el("div");
      const active = ctx.players.filter((p) => p.connected !== false);
      const allPressed = active.every((p) => pub.results[p.id] !== undefined || pub.foul[p.id]);

      // Laufzeit markieren, damit die Zeitmessung ohne Uhrenabgleich funktioniert
      markRun(pub.runId + ":" + pub.phase);

      if (pub.phase === "go" && !local.goAt) local.goAt = Date.now();
      if (pub.phase !== "go") local.goAt = 0;

      if (ctx.state.phase === "over") {
        wrap.appendChild(U().finalScreen(ctx, "Reaktion beendet", "Gespielte Durchgänge: " + (pub.run - 1)));
        stopTick();
        return wrap;
      }

      wrap.appendChild(el("div", { class: "center", style: { marginBottom: "12px" } }, [
        el("span", { class: "tag", text: "Durchgang " + pub.run + " von " + pub.rounds }),
      ]));

      const big = el("div", {
        class: "turn-banner",
        style: {
          fontSize: "clamp(20px,5vw,30px)", padding: "26px 18px", minHeight: "96px", display: "flex",
          background: pub.phase === "go" ? "linear-gradient(180deg,#4fbf7d,#2f6b4f)" : pub.phase === "armed" ? "linear-gradient(180deg,#c0563f,#8e2f22)" : "var(--paper-2)",
          color: pub.phase === "go" || pub.phase === "armed" ? "#fff" : "inherit",
          border: "1px solid rgba(0,0,0,.25)",
        },
      }, [
        pub.phase === "idle" ? el("span", { text: "Bereit — der Host startet den Durchgang." })
          : pub.phase === "armed" ? el("span", { text: "Warten … noch nicht tippen!" })
          : pub.phase === "go" ? el("span", { style: { fontWeight: "800", letterSpacing: ".06em" }, text: "JETZT!" })
          : el("span", { text: "Durchgang beendet." }),
      ]);
      wrap.appendChild(big);

      const mePlayed = pub.results[ctx.me] !== undefined || pub.foul[ctx.me];
      const canPress = (pub.phase === "armed" || pub.phase === "go") && !mePlayed;
      wrap.appendChild(el("div", { class: "center", style: { marginTop: "18px" } }, [
        el("button", {
          class: "btn " + (canPress ? "btn-gold" : "btn-outline"),
          style: { fontSize: "20px", padding: "20px 44px", minWidth: "220px" },
          disabled: !canPress,
          text: pub.foul[ctx.me] ? "Zu früh!" : mePlayed ? "Getippt" : "Tippen",
          onclick: () => {
            const ms = pub.phase === "go" ? Date.now() - (local.goAt || Date.now()) : 0;
            SS.act("press", { ms: ms });
          },
        }),
      ]));

      // Ergebnisliste
      const rows = active.map((p) => {
        const r = pub.results[p.id];
        const f = pub.foul[p.id];
        return el("tr", {}, [
          el("td", {}, [el("span", { class: "avatar", style: { background: p.color }, text: SS.initial(p.name) }), p.name]),
          el("td", { class: "num", text: f ? "zu früh" : r !== undefined ? r + " ms" : "—" }),
        ]);
      });
      wrap.appendChild(el("div", { style: { maxWidth: "460px", margin: "20px auto 0" } },
        el("table", { class: "scoreboard" }, [
          el("thead", {}, el("tr", {}, [el("th", { text: "Gerät" }), el("th", { text: "Reaktion" })])),
          el("tbody", {}, rows),
        ])));

      wrap.appendChild(el("div", { class: "center", style: { marginTop: "18px" } }, [
        ctx.isHost || ctx.isLocal
          ? (pub.phase === "idle"
            ? el("button", { class: "btn btn-gold", text: "Durchgang starten", onclick: () => SS.act("arm", {}) })
            : allPressed || pub.phase === "done"
            ? el("button", { class: "btn btn-gold", text: pub.run >= pub.rounds ? "Auswertung" : "Nächster Durchgang", onclick: () => SS.act("next", {}) })
            : el("p", { class: "muted", text: "Warte, bis alle getippt haben." }))
          : el("p", { class: "muted", text: "Der Host steuert die Durchgänge." }),
      ]));

      wrap.appendChild(el("div", { style: { marginTop: "18px" } }, U().scoreTable(ctx, { label: "Gerät" })));

      // Ticker nur während der knappen Phasen
      if (pub.phase === "armed" || pub.phase === "go") {
        if (!local.tickerKey) startTick("reaction", () => ctx.rerender());
      } else stopTick();
      return wrap;
    },
  };

  function resolveReaction(ctx) {
    const pub = ctx.pub;
    const active = ctx.players.filter((p) => p.connected !== false);
    if (!active.every((p) => pub.results[p.id] !== undefined || pub.foul[p.id])) return;
    const times = active.filter((p) => pub.results[p.id] !== undefined).sort((a, b) => pub.results[a.id] - pub.results[b.id]);
    if (times.length) {
      const w = times[0];
      pub.lastWinner = w.id;
      ctx.addScore(w.id, 1);
      ctx.log(w.name + " war am schnellsten (" + pub.results[w.id] + " ms).");
    }
    pub.phase = "done";
  }

  /* ══════════════════════════════════════════════════════════════════════
     BUCHSTABENSALAT (Anagramm)
     ══════════════════════════════════════════════════════════════════════ */
  const anagram = {
    init(ctx) {
      ctx.pub.game = "anagram";
      const words = SS.shuffle((dataList().WORDS || ["schulbank", "pausenhof", "taschenrechner", "klassenbuch", "stundenplan", "kreide", "wandertag", "zeugniskonferenz", "hausaufgabe", "bibliothek", "sportplatz", "freundschaft"]).slice());
      ctx.pub.total = Math.min(Number(ctx.settings.rounds) || 10, words.length);
      ctx.pub.words = words.slice(0, ctx.pub.total);
      ctx.pub.run = 0;
      ctx.pub.runId = SS.uid(6);
      ctx.pub.solvedBy = null;
      ctx.pub.attempts = {};
      nextAnagram(ctx);
      ctx.log("Buchstabensalat: " + ctx.pub.total + " Wörter.");
    },
    action(ctx, pid, name, payload) {
      const pub = ctx.pub;
      if (name === "solve") {
        if (pub.solvedBy) return;
        const target = pub.words[pub.run - 1];
        const guess = String(payload.text || "").toLowerCase().trim();
        if (guess === target) {
          pub.solvedBy = pid;
          ctx.addScore(pid, pub.firstBlood ? 2 : 2);
          ctx.log(ctx.player(pid).name + " löst «" + target + "».");
        } else {
          pub.attempts[pid] = (pub.attempts[pid] || 0) + 1;
        }
      } else if (name === "next") {
        pub.run++;
        if (pub.run >= ctx.pub.total) { ctx.state.phase = "over"; ctx.finish(); return; }
        nextAnagram(ctx);
      }
    },
    render(ctx) {
      const pub = ctx.pub;
      if (pub.game !== "anagram" || !pub.total) return el("div");
      if (ctx.state.phase === "over") { stopTick(); return U().finalScreen(ctx, "Buchstabensalat beendet"); }
      const wrap = el("div");
      const word = pub.words[pub.run - 1];
      const scrambled = word.split("").sort(() => 0.5 - Math.random()).join(" ").toUpperCase();

      wrap.appendChild(el("div", { class: "center" }, [
        el("span", { class: "tag", text: "Wort " + pub.run + " von " + pub.total }),
        el("div", { class: "eyebrow", style: { marginTop: "12px" }, text: "Buchstaben" }),
        el("div", { class: "word-view", text: scrambled }),
      ]));

      if (pub.solvedBy) {
        wrap.appendChild(el("div", { class: "turn-banner", style: { marginTop: "18px", borderColor: "var(--green)" } }, [
          U().dot(pub.solvedBy, ctx),
          el("span", { text: "Gelöst: " + ctx.player(pub.solvedBy).name + " — «" + word + "»" }),
        ]));
        wrap.appendChild(el("div", { class: "center", style: { marginTop: "16px" } }, [
          ctx.isHost || ctx.isLocal
            ? el("button", { class: "btn btn-gold", text: pub.run >= pub.total ? "Auswertung" : "Nächstes Wort", onclick: () => SS.act("next", {}) })
            : el("p", { class: "muted", text: "Warte auf den Host." }),
        ]));
      } else {
        const input = el("input", {
          type: "text", placeholder: "Lösung eintippen …", autocapitalize: "none", autocomplete: "off",
          dataset: { persist: "ana" }, style: { maxWidth: "360px", margin: "0 auto", textAlign: "center", fontFamily: "var(--mono)", letterSpacing: ".15em" },
          onkeydown: (e) => { if (e.key === "Enter") submit(); },
        });
        const myAttempts = pub.attempts[ctx.me] || 0;
        const submit = () => {
          const v = input.value.trim();
          if (!v) return;
          SS.act("solve", { text: v });
          input.value = "";
        };
        wrap.appendChild(el("div", { class: "center", style: { marginTop: "20px" } }, [
          el("p", { class: "muted", text: "Alle raten gleichzeitig. Wer zuerst richtig abschickt, bekommt zwei Punkte." }),
          input,
          el("div", { class: "btn-row", style: { justifyContent: "center", marginTop: "12px" } }, [
            el("button", { class: "btn btn-gold", text: "Abschicken", onclick: submit }),
          ]),
          myAttempts ? el("p", { class: "muted", style: { marginTop: "10px" }, text: "Fehlversuche: " + myAttempts }) : null,
        ]));
      }
      wrap.appendChild(el("div", { style: { marginTop: "18px" } }, U().scoreTable(ctx)));
      return wrap;
    },
  };

  function nextAnagram(ctx) {
    ctx.pub.run = ctx.pub.run || 0;
    if (ctx.pub.run === 0) ctx.pub.run = 1;
    ctx.pub.solvedBy = null;
    ctx.pub.attempts = {};
    ctx.pub.runId = SS.uid(6);
  }

  /* ══════════════════════════════════════════════════════════════════════
     DER ORDNUNG NACH (Sortieren)
     ══════════════════════════════════════════════════════════════════════ */
  const sortGame = {
    init(ctx) {
      ctx.pub.game = "sort";
      const sets = (dataList().SORT_SETS || []).slice();
      const shuffled = U().sharedShuffle(ctx, sets, "sets");
      ctx.pub.total = Math.min(Number(ctx.settings.rounds) || 6, shuffled.length);
      ctx.pub.sets = shuffled.slice(0, ctx.pub.total);
      ctx.pub.run = 0;
      newSortRound(ctx);
      ctx.log("Der Ordnung nach: " + ctx.pub.total + " Runden.");
    },
    action(ctx, pid, name, payload) {
      const pub = ctx.pub;
      if (name === "move") {
        if (ctx.turn !== pid) return;
        const order = pub.order;
        const i = order.indexOf(payload.id);
        const j = i + payload.dir;
        if (i < 0 || j < 0 || j >= order.length) return;
        [order[i], order[j]] = [order[j], order[i]];
      } else if (name === "submit") {
        if (ctx.turn !== pid) return;
        pub.checked = true;
        const set = pub.sets[pub.run - 1];
        const correct = set.items.slice().sort((a, b) => a.val - b.val).map((x) => x.label);
        const mine = pub.order.map((id) => set.items.find((x) => x.label === id).label);
        let points = 0;
        mine.forEach((lbl, idx) => { if (lbl === correct[idx]) points++; });
        ctx.addScore(pid, points);
        pub.result = { points: points, outOf: correct.length, mine: mine, correct: correct, pid: pid };
        ctx.log(ctx.player(pid).name + " ordnet " + points + " von " + correct.length + " richtig.");
      } else if (name === "next") {
        pub.run++;
        if (pub.run >= ctx.pub.total) { ctx.state.phase = "over"; ctx.finish(); return; }
        newSortRound(ctx);
      }
    },
    render(ctx) {
      const pub = ctx.pub;
      if (pub.game !== "sort" || !pub.total) return el("div");
      if (ctx.state.phase === "over") return U().finalScreen(ctx, "Der Ordnung nach beendet");
      const set = pub.sets[pub.run - 1];
      const wrap = el("div");
      const myTurn = ctx.myTurn();

      wrap.appendChild(el("div", { class: "center" }, [
        el("span", { class: "tag", text: "Runde " + pub.run + " von " + pub.total }),
        el("p", { class: "lead", style: { marginTop: "10px" }, text: set.question }),
      ]));
      wrap.appendChild(U().turnBanner(ctx, ctx.canAct(ctx.turn) ? "Du ordnest — von klein nach gross" : ctx.player(ctx.turn).name + " ordnet"));

      const area = el("div", { class: "sort-area" });
      pub.order.forEach((id, idx) => {
        const item = set.items.find((x) => x.label === id);
        area.appendChild(el("div", { class: "sort-item" }, [
          el("span", { class: "idx", text: String(idx + 1) }),
          el("span", { text: item.label }),
          myTurn && !pub.checked
            ? el("span", { style: { display: "flex", gap: "2px" } }, [
                el("button", { class: "btn btn-sm btn-outline", text: "↑", title: "nach oben", disabled: idx === 0, onclick: () => SS.act("move", { id: id, dir: -1 }) }),
                el("button", { class: "btn btn-sm btn-outline", text: "↓", title: "nach unten", disabled: idx === pub.order.length - 1, onclick: () => SS.act("move", { id: id, dir: 1 }) }),
              ])
            : null,
        ]));
      });
      wrap.appendChild(area);
      wrap.appendChild(el("p", { class: "muted center", style: { marginTop: "10px" }, text: "Mit ↑ und ↓ verschieben. Besprecht euch kurz — abgegeben wird erst, wenn es passt." }));

      if (pub.checked && pub.result) {
        const r = pub.result;
        wrap.appendChild(el("hr", { class: "rule" }));
        wrap.appendChild(el("div", { class: "center" }, [
          el("h3", { text: "Richtige Reihenfolge" }),
          el("div", { class: "tags", style: { justifyContent: "center" } }, r.correct.map((l) => el("span", { class: "tag sel", text: l }))),
          el("p", { class: "lead", style: { marginTop: "12px" }, text: r.points + " von " + r.outOf + " Stellen richtig." }),
        ]));
        wrap.appendChild(el("div", { class: "center", style: { marginTop: "14px" } }, [
          ctx.isHost || ctx.isLocal
            ? el("button", { class: "btn btn-gold", text: pub.run >= pub.total ? "Auswertung" : "Nächste Runde", onclick: () => SS.act("next", {}) })
            : el("p", { class: "muted", text: "Warte auf den Host." }),
        ]));
      } else if (myTurn) {
        wrap.appendChild(el("div", { class: "center", style: { marginTop: "16px" } }, [
          el("button", { class: "btn btn-gold", text: "Abgeben", onclick: () => SS.act("submit", {}) }),
        ]));
      }

      wrap.appendChild(el("div", { style: { marginTop: "18px" } }, U().scoreTable(ctx)));
      return wrap;
    },
  };

  function newSortRound(ctx) {
    const pub = ctx.pub;
    if (pub.run === 0) pub.run = 1;
    const set = pub.sets[pub.run - 1];
    // Startreihenfolge bewusst gemischt, aber für alle Geräte gleich
    pub.order = U().sharedShuffle(ctx, set.items.map((x) => x.label), "order" + pub.run);
    pub.checked = false;
    pub.result = null;
    ctx.turn = ctx.players[(pub.run - 1) % ctx.players.length].id;
  }

  /* ══════════════════════════════════════════════════════════════════════
     WER BIN ICH?  (Begriff erklären)
     ══════════════════════════════════════════════════════════════════════ */
  const werbinich = {
    init(ctx) {
      ctx.pub.game = "werbinich";
      ctx.pub.seconds = Number(ctx.settings.seconds) || 90;
      ctx.pub.run = 1;
      ctx.pub.runId = SS.uid(6);
      ctx.pub.active = true;
      ctx.pub.guessed = 0;
      ctx.pub.list = [];
      ctx.pub.explainer = ctx.players[0].id;
      ctx.pub.submitted = {};
      newWerRound(ctx);
      ctx.log("Wer bin ich? Erklärt wird reihum.");
    },
    action(ctx, pid, name, payload) {
      const pub = ctx.pub;
      if (name === "assign") {
        if (!ctx.isHost && !ctx.isLocal) return;
        // Begriffe für die erklärende Person bereitstellen
        const pool = SS.shuffle((dataList().EXPLAIN || []).slice());
        const cart = pool.slice(0, 12);
        ctx.state.priv[pid] = Object.assign({}, ctx.state.priv[pid], { cards: cart, used: [], score: 0 });
        pub.list = [];
        pub.submitted[pid] = true;
      } else if (name === "guess") {
        const mine = ctx.state.priv[pid] || {};
        const cards = mine.cards || [];
        const used = mine.used || [];
        const nextCard = cards.find((c) => !used.includes(c));
        if (!nextCard) return;
        used.push(nextCard);
        ctx.state.priv[pid] = Object.assign({}, mine, { used: used, score: (mine.score || 0) + 1 });
        pub.guessed++;
        ctx.addScore(pid, 1);
        pub.list.push(nextCard);
      } else if (name === "finish") {
        pub.active = false;
        pub.run++;
        if (pub.run > ctx.players.length) { ctx.state.phase = "over"; ctx.finish(); return; }
        ctx.pub.explainer = ctx.players[(pub.run - 1) % ctx.players.length].id;
        newWerRound(ctx);
      } else if (name === "next") {
        pub.run = 1;
        ctx.pub.explainer = ctx.players[0].id;
        newWerRound(ctx);
      }
    },
    render(ctx) {
      const pub = ctx.pub;
      if (pub.game !== "werbinich" || !pub.runId) return el("div");
      if (ctx.state.phase === "over") { stopTick(); return U().finalScreen(ctx, "Wer bin ich? beendet"); }
      const wrap = el("div");
      const isExplainer = ctx.me === pub.explainer || (ctx.isLocal && ctx.turn === pub.explainer);
      const expName = ctx.player(pub.explainer).name;

      markRun(pub.runId);
      const remain = Math.max(0, pub.seconds - Math.floor(elapsedSeconds()));

      wrap.appendChild(el("div", { class: "center" }, [
        el("span", { class: "tag", text: "Runde " + pub.run + " von " + ctx.players.length }),
        el("h3", { style: { marginTop: "12px" }, text: "Erklärt: " + expName }),
        el("div", { class: "serif", style: { fontSize: "34px", color: remain <= 10 ? "var(--red)" : "var(--navy)" }, text: remain + " s" }),
      ]));

      if (isExplainer) {
        const mine = ctx.state.priv[ctx.me] || {};
        const cards = mine.cards || [];
        const used = mine.used || [];
        if (!cards.length) {
          wrap.appendChild(el("div", { class: "center", style: { marginTop: "16px" } }, [
            el("p", { class: "muted", text: "Du erklärst. Lass dir Begriffe austeilen." }),
            el("button", { class: "btn btn-gold", text: "Begriffe austeilen", onclick: () => SS.actAs(ctx.me, "assign", {}) }),
          ]));
        } else {
          const nextCard = cards.find((c) => !used.includes(c));
          wrap.appendChild(el("div", { class: "wortrolle", text: nextCard || "Alle Begriffe geschafft!" }));
          wrap.appendChild(el("div", { class: "center", style: { marginTop: "14px" } }, [
            nextCard ? el("button", { class: "btn btn-gold", style: { fontSize: "18px", padding: "16px 32px" }, text: "Erraten — nächster Begriff", onclick: () => SS.actAs(ctx.me, "guess", {}) }) : null,
            pub.list && pub.list.length ? el("p", { class: "muted", text: "Bisher: " + pub.list.join(" · ") }) : null,
          ]));
        }
      } else {
        wrap.appendChild(el("div", { class: "banner", text: expName + " erklärt gerade. Rufe die Lösung laut in die Runde — " + expName + " tippt auf «Erraten», wenn der Begriff gefallen ist." }));
        wrap.appendChild(el("div", { class: "center", style: { marginTop: "14px" } }, [
          el("p", { class: "muted", text: "Bisher erraten: " + (pub.list || []).join(" · ") }),
        ]));
      }

      wrap.appendChild(el("div", { class: "center", style: { marginTop: "18px" } }, [
        (ctx.isHost || ctx.isLocal)
          ? pub.active
            ? el("button", { class: "btn btn-outline", text: "Runde beenden", onclick: () => SS.act("finish", {}) })
            : el("button", { class: "btn btn-gold", text: pub.run > ctx.players.length ? "Auswertung" : "Nächste Person", onclick: () => SS.act("finish", {}) })
          : el("p", { class: "muted", text: "Der Host beendet die Runde." }),
      ]));

      wrap.appendChild(el("div", { style: { marginTop: "18px" } }, U().scoreTable(ctx)));

      if (pub.active) { if (!local.tickerKey) startTick("werbinich", () => ctx.rerender()); } else stopTick();
      return wrap;
    },
  };

  function newWerRound(ctx) {
    ctx.pub.runId = SS.uid(6);
    ctx.pub.active = true;
    ctx.pub.list = [];
    ctx.pub.guessed = 0;
    local.runId = null;
    // Begriffe der erklärenden Person frisch mischen (Host autoritativ)
    const exp = ctx.pub.explainer;
    if (exp) {
      const pool = SS.shuffle((dataList().EXPLAIN || []).slice());
      ctx.state.priv[exp] = Object.assign({}, ctx.state.priv[exp], { cards: pool.slice(0, 12), used: [] });
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     WER BIST DU?  (eigene Figur erraten)
     ══════════════════════════════════════════════════════════════════════ */
  const werbistdu = {
    init(ctx) {
      ctx.pub.game = "werbistdu";
      const region = String(ctx.settings.region || "mix");
      let pool = [];
      const d = dataList();
      if (region === "sport") pool = (d.FIGURES_SPORT || []).slice();
      else if (region === "tech") pool = (d.FIGURES_TECH || []).slice();
      else pool = (d.FIGURES_SPORT || []).concat(d.FIGURES_TECH || []);
      pool = SS.shuffle(pool);
      ctx.state.priv = {};
      ctx.players.forEach((p, i) => { ctx.state.priv[p.id] = { figure: pool[i % pool.length], solved: false, wrong: false }; });
      ctx.pub.solvedBy = null;
      ctx.pub.runId = SS.uid(6);
      ctx.log("Wer bist du? Fragt euch reihum Ja-/Nein-Fragen.");
    },
    action(ctx, pid, name, payload) {
      const priv = ctx.state.priv[pid] || {};
      if (name === "attempt") {
        const guess = String(payload.text || "").toLowerCase().trim();
        const target = String(priv.figure || "").toLowerCase();
        if (!guess) return;
        if (guess === target || target.includes(guess) && guess.length >= 4) {
          priv.solved = true;
          ctx.state.priv[pid] = priv;
          if (!ctx.pub.solvedBy) { ctx.pub.solvedBy = pid; ctx.addScore(pid, 2); }
          else ctx.addScore(pid, 1);
          ctx.log(ctx.player(pid).name + " erkennt sich: " + priv.figure);
        } else {
          priv.wrong = true;
          ctx.addScore(pid, -1);
          ctx.log(ctx.player(pid).name + " liegt daneben.");
          ctx.state.priv[pid] = priv;
        }
      } else if (name === "reveal") {
        priv.solved = true; priv.revealed = true;
        ctx.state.priv[pid] = priv;
      } else if (name === "next") {
        const pool = SS.shuffle((dataList().FIGURES_SPORT || []).concat(dataList().FIGURES_TECH || []));
        ctx.state.priv = {};
        ctx.players.forEach((p, i) => { ctx.state.priv[p.id] = { figure: pool[i % pool.length], solved: false, wrong: false }; });
        ctx.pub.solvedBy = null;
        ctx.pub.runId = SS.uid(6);
        ctx.round++;
      }
    },
    render(ctx) {
      const pub = ctx.pub;
      if (pub.game !== "werbistdu" || !pub.runId) return el("div");
      const wrap = el("div");
      const mine = ctx.state.priv[ctx.me] || {};
      const solvedAll = ctx.players.filter((p) => p.connected !== false).every((p) => (ctx.state.priv[p.id] || {}).solved);

      wrap.appendChild(el("p", { class: "lead center", text: "Jede Person hat heimlich eine berühmte Figur. Stellt euch reihum Fragen, die nur mit ja oder nein zu beantworten sind." }));

      // Eigene Rolle
      const card = el("div", { class: "debate-card", style: { maxWidth: "520px", margin: "0 auto 18px" } }, [
        el("h4", { text: "Deine Figur" }),
        mine.solved
          ? el("div", { class: "wortrolle", text: mine.figure || "—" })
          : el("div", { class: "center" }, [
              el("p", { class: "muted", text: "Verdeckt. Frag dich heran — oder löse auf." }),
              el("button", { class: "btn btn-sm btn-outline", text: "Aufdecken (ohne Wertung)", onclick: () => SS.actAs(ctx.me, "reveal", {}) }),
            ]),
      ]);
      wrap.appendChild(card);

      if (!mine.solved) {
        const input = el("input", {
          type: "text", placeholder: "Ich glaube, ich bin …", dataset: { persist: "wbd" },
          style: { maxWidth: "360px", margin: "0 auto", textAlign: "center" },
          onkeydown: (e) => { if (e.key === "Enter") submit(); },
        });
        const submit = () => { const v = input.value.trim(); if (!v) return; SS.actAs(ctx.me, "attempt", { text: v }); input.value = ""; };
        wrap.appendChild(el("div", { class: "center" }, [
          input,
          el("div", { class: "btn-row", style: { justifyContent: "center", marginTop: "12px" } }, [
            el("button", { class: "btn btn-gold", text: "Auflösen", onclick: submit }),
          ]),
          mine.wrong ? el("p", { class: "muted", style: { marginTop: "8px" }, text: "Ein Fehlversuch kostet einen Punkt." }) : null,
        ]));
      }

      // Stand
      const rows = ctx.players.map((p) => {
        const pr = ctx.state.priv[p.id] || {};
        const show = pr.solved || (ctx.isLocal && false);
        return el("tr", {}, [
          el("td", {}, [el("span", { class: "avatar", style: { background: p.color }, text: SS.initial(p.name) }), p.name]),
          el("td", { class: "num", text: show ? pr.figure : (pr.revealed ? pr.figure : "—") }),
          el("td", { text: pr.solved ? "gelöst" : pr.wrong ? "daneben" : "offen" }),
        ]);
      });
      wrap.appendChild(el("div", { style: { maxWidth: "560px", margin: "18px auto 0" } },
        el("table", { class: "scoreboard" }, [
          el("thead", {}, el("tr", {}, [el("th", { text: "Person" }), el("th", { text: "Figur" }), el("th", { text: "Stand" })])),
          el("tbody", {}, rows),
        ])));

      wrap.appendChild(el("div", { class: "center", style: { marginTop: "16px" } }, [
        (ctx.isHost || ctx.isLocal)
          ? el("button", { class: "btn " + (solvedAll ? "btn-gold" : "btn-outline"), text: solvedAll ? "Alle gelöst — neue Figuren" : "Neue Figuren", onclick: () => SS.act("next", {}) })
          : el("p", { class: "muted", text: "Der Host verteilt neue Figuren." }),
      ]));
      wrap.appendChild(el("div", { style: { marginTop: "18px" } }, U().scoreTable(ctx)));
      return wrap;
    },
  };

  /* ══════════════════════════════════════════════════════════════════════
     GROSSE DEBATTE
     ══════════════════════════════════════════════════════════════════════ */
  const debate = {
    init(ctx) {
      ctx.pub.game = "debate";
      const topics = U().sharedShuffle(ctx, (dataList().THESES || []).slice(), "theses");
      ctx.pub.topics = topics;
      ctx.pub.run = 1;
      ctx.pub.runId = SS.uid(6);
      newDebateRound(ctx);
      ctx.log("Grosse Debatte gestartet.");
    },
    action(ctx, pid, name, payload) {
      const pub = ctx.pub;
      if (name === "side") {
        pub.sides[pid] = payload.side;
      } else if (name === "vote") {
        pub.votes[pid] = payload.side;
        resolveVote(ctx);
      } else if (name === "next") {
        pub.run++;
        if (pub.run > pub.topics.length) { ctx.state.phase = "over"; ctx.finish(); return; }
        newDebateRound(ctx);
      }
    },
    render(ctx) {
      const pub = ctx.pub;
      if (pub.game !== "debate" || !pub.topics) return el("div");
      if (ctx.state.phase === "over") { stopTick(); return U().finalScreen(ctx, "Debatte beendet"); }
      const wrap = el("div");
      const topic = pub.topics[pub.run - 1];
      const seconds = Number(ctx.settings.seconds) || 90;
      markRun(pub.runId);
      const remain = Math.max(0, seconds - Math.floor(elapsedSeconds()));

      wrap.appendChild(el("div", { class: "center" }, [
        el("span", { class: "tag", text: "These " + pub.run + " von " + pub.topics.length }),
        el("h2", { style: { marginTop: "12px", maxWidth: "760px", marginLeft: "auto", marginRight: "auto" }, text: "«" + topic + "»" }),
        el("div", { class: "serif", style: { fontSize: "30px", color: remain <= 10 ? "var(--red)" : "var(--navy)" }, text: remain + " s" }),
      ]));

      const pro = ctx.players.filter((p) => pub.sides[p.id] === "pro");
      const contra = ctx.players.filter((p) => pub.sides[p.id] === "contra");

      wrap.appendChild(el("div", { class: "debate-grid", style: { marginTop: "18px" } }, [
        el("div", { class: "debate-card" }, [
          el("h4", { text: "Dafür (" + pro.length + ")" }),
          el("ul", { class: "debate-list" }, pro.length ? pro.map((p) => el("li", { text: p.name })) : [el("li", { class: "muted", text: "noch niemand" })]),
        ]),
        el("div", { class: "debate-card" }, [
          el("h4", { text: "Dagegen (" + contra.length + ")" }),
          el("ul", { class: "debate-list" }, contra.length ? contra.map((p) => el("li", { text: p.name })) : [el("li", { class: "muted", text: "noch niemand" })]),
        ]),
      ]));

      if (!pub.votes || Object.keys(pub.votes).length === 0 || !pub.resolved) {
        wrap.appendChild(el("div", { class: "center", style: { marginTop: "18px" } }, [
          el("p", { class: "muted", text: "Jede Person wählt eine Seite. Danach tragen die beiden Seiten nacheinander ihre Argumente vor." }),
          el("div", { class: "btn-row", style: { justifyContent: "center" } }, [
            el("button", { class: "btn " + (pub.sides[ctx.me] === "pro" ? "btn-gold" : "btn-outline"), text: "Ich bin dafür", onclick: () => SS.actAs(ctx.me, "side", { side: "pro" }) }),
            el("button", { class: "btn " + (pub.sides[ctx.me] === "contra" ? "btn-gold" : "btn-outline"), text: "Ich bin dagegen", onclick: () => SS.actAs(ctx.me, "side", { side: "contra" }) }),
          ]),
        ]));
      }

      if (pub.resolved) {
        wrap.appendChild(el("hr", { class: "rule" }));
        wrap.appendChild(el("div", { class: "center" }, [
          el("h3", { text: "Abstimmung" }),
          el("p", { class: "lead", text: "Die überzeugendere Seite: " + (pub.winnerSide === "pro" ? "Dafür" : "Dagegen") }),
        ]));
        wrap.appendChild(el("div", { class: "center", style: { marginTop: "14px" } }, [
          (ctx.isHost || ctx.isLocal)
            ? el("button", { class: "btn btn-gold", text: pub.run >= pub.topics.length ? "Auswertung" : "Nächste These", onclick: () => SS.act("next", {}) })
            : el("p", { class: "muted", text: "Warte auf den Host." }),
        ]));
      } else {
        wrap.appendChild(el("div", { class: "center", style: { marginTop: "20px" } }, [
          el("p", { class: "muted", text: "Wenn alle gesprochen haben, wird abgestimmt. Wer zu welcher Seite gehört, ist oben zu sehen." }),
          el("div", { class: "btn-row", style: { justifyContent: "center" } }, [
            el("button", { class: "btn btn-outline", text: "Stimme: Dafür", onclick: () => SS.actAs(ctx.me, "vote", { side: "pro" }) }),
            el("button", { class: "btn btn-outline", text: "Stimme: Dagegen", onclick: () => SS.actAs(ctx.me, "vote", { side: "contra" }) }),
          ]),
        ]));
      }

      wrap.appendChild(el("div", { style: { marginTop: "18px" } }, U().scoreTable(ctx)));

      if (!pub.resolved) { if (!local.tickerKey) startTick("debate", () => ctx.rerender()); } else stopTick();
      return wrap;
    },
  };

  function newDebateRound(ctx) {
    ctx.pub.runId = SS.uid(6);
    ctx.pub.sides = {};
    ctx.pub.votes = {};
    ctx.pub.resolved = false;
    ctx.pub.winnerSide = null;
  }

  function resolveVote(ctx) {
    const pub = ctx.pub;
    const active = ctx.players.filter((p) => p.connected !== false);
    if (!active.every((p) => pub.votes[p.id])) return;
    let pro = 0, contra = 0;
    Object.values(pub.votes).forEach((v) => { if (v === "pro") pro++; else contra++; });
    pub.winnerSide = pro >= contra ? "pro" : "contra";
    pub.resolved = true;
    ctx.players.filter((p) => pub.sides[p.id] === pub.winnerSide).forEach((p) => ctx.addScore(p.id, 1));
    ctx.log("Abstimmung: " + (pub.winnerSide === "pro" ? "Dafür" : "Dagegen") + " gewinnt (" + pro + ":" + contra + ").");
  }

  /* ══════════════════════════════════════════════════════════════════════
     FÜNF-SIEBEN-FÜNF (Haiku)
     ══════════════════════════════════════════════════════════════════════ */
  const haiku = {
    init(ctx) {
      ctx.pub.game = "haiku";
      const themes = U().sharedShuffle(ctx, (dataList().THEMES || []).slice(), "themes");
      ctx.pub.themes = themes.length ? themes : ["Pausenhof", "Klassenfahrt"];
      ctx.pub.run = 1;
      ctx.pub.runId = SS.uid(6);
      newHaikuRound(ctx);
      ctx.log("Fünf-Sieben-Fünf gestartet.");
    },
    action(ctx, pid, name, payload) {
      const pub = ctx.pub;
      if (name === "submit") {
        pub.pieces[pid] = payload.lines;
        resolveHaiku(ctx);
      } else if (name === "vote") {
        if (pid === payload.target) return;
        pub.votes[pid] = payload.target;
        resolveHaiku(ctx);
      } else if (name === "next") {
        pub.run++;
        if (pub.run > pub.themes.length) { ctx.state.phase = "over"; ctx.finish(); return; }
        newHaikuRound(ctx);
      } else if (name === "phase") {
        pub.stage = payload.stage;
      }
    },
    render(ctx) {
      const pub = ctx.pub;
      if (pub.game !== "haiku" || !pub.themes) return el("div");
      if (ctx.state.phase === "over") { stopTick(); return U().finalScreen(ctx, "Fünf-Sieben-Fünf beendet"); }
      const wrap = el("div");
      const theme = pub.themes[(pub.run - 1) % pub.themes.length];
      const seconds = Number(ctx.settings.seconds) || 180;
      markRun(pub.runId);
      const remain = Math.max(0, seconds - Math.floor(elapsedSeconds()));
      const active = ctx.players.filter((p) => p.connected !== false);

      wrap.appendChild(el("div", { class: "center" }, [
        el("span", { class: "tag", text: "Haiku " + pub.run + " von " + pub.themes.length }),
        el("h2", { style: { marginTop: "12px" }, text: "Thema: " + theme }),
      ]));

      if (pub.stage === "write") {
        wrap.appendChild(el("div", { class: "center" }, [
          el("p", { class: "muted", text: "Erste Zeile 5 Silben, zweite 7, dritte 5." }),
          pub.pieces[ctx.me]
            ? el("p", { class: "lead", text: "Abgegeben. Warte auf die anderen." })
            : haikuForm(ctx),
          el("div", { class: "serif", style: { fontSize: "28px", color: remain <= 10 ? "var(--red)" : "var(--navy)", marginTop: "12px" }, text: remain + " s" }),
          el("p", { class: "muted", text: active.filter((p) => pub.pieces[p.id]).length + " von " + active.length + " haben abgegeben." }),
          (ctx.isHost || ctx.isLocal)
            ? el("button", { class: "btn btn-outline", text: "Zur Bewertung", style: { marginTop: "12px" }, onclick: () => SS.act("phase", { stage: "vote" }) })
            : null,
        ]));
        if (!local.tickerKey) startTick("haiku", () => ctx.rerender());
      } else {
        // Vorlesen und bewerten
        const entries = active.filter((p) => pub.pieces[p.id]);
        wrap.appendChild(el("p", { class: "lead center", text: "Alle lesen nacheinander vor. Danach stimmt ihr ab — die eigene darf nicht gewählt werden." }));
        wrap.appendChild(el("div", { class: "debate-grid" }, entries.map((p) =>
          el("div", { class: "debate-card" }, [
            el("h4", {}, [el("span", { class: "avatar", style: { background: p.color }, text: SS.initial(p.name) }), " " + p.name]),
            el("div", { class: "serif", style: { fontSize: "18px", lineHeight: "1.6" } }, pub.pieces[p.id].map((l) => el("div", { text: l || "…" }))),
            el("div", { style: { marginTop: "10px" } }, [
              el("button", {
                class: "btn btn-sm " + (pub.votes[ctx.me] === p.id ? "btn-gold" : "btn-outline"),
                text: pub.votes[ctx.me] === p.id ? "Gewählt" : "Wählen",
                disabled: p.id === ctx.me,
                onclick: () => SS.actAs(ctx.me, "vote", { target: p.id }),
              }),
            ]),
          ])
        )));

        if (pub.winner) {
          const w = ctx.player(pub.winner);
          wrap.appendChild(el("div", { class: "turn-banner", style: { marginTop: "18px", borderColor: "var(--green)" } }, [
            U().dot(pub.winner, ctx), el("span", { text: "Bestes Haiku: " + (w ? w.name : "—") }),
          ]));
          wrap.appendChild(el("div", { class: "center", style: { marginTop: "14px" } }, [
            (ctx.isHost || ctx.isLocal)
              ? el("button", { class: "btn btn-gold", text: pub.run >= pub.themes.length ? "Auswertung" : "Nächstes Thema", onclick: () => SS.act("next", {}) })
              : el("p", { class: "muted", text: "Warte auf den Host." }),
          ]));
        } else {
          wrap.appendChild(el("div", { class: "center", style: { marginTop: "16px" } }, [
            el("p", { class: "muted", text: Object.keys(pub.votes).length + " von " + active.length + " haben abgestimmt." }),
            (ctx.isHost || ctx.isLocal)
              ? el("button", { class: "btn btn-outline", text: "Auswerten", style: { marginTop: "10px" }, onclick: () => resolveHaiku(ctx, true) })
              : null,
          ]));
        }
      }
      return wrap;
    },
  };

  function haikuForm(ctx) {
    const saved = ctx.state.priv[ctx.me] || {};
    const inputs = [0, 1, 2].map((i) =>
      el("input", {
        type: "text", placeholder: (i === 0 ? "5 Silben" : i === 1 ? "7 Silben" : "5 Silben"),
        value: (saved.lines && saved.lines[i]) || "",
        dataset: { persist: "hk" + i },
        style: { maxWidth: "420px", margin: "6px auto", textAlign: "center", fontFamily: "var(--serif)", fontSize: "17px" },
      })
    );
    return el("div", {}, [
      el("div", { class: "center" }, inputs),
      el("div", { class: "btn-row", style: { justifyContent: "center", marginTop: "10px" } }, [
        el("button", {
          class: "btn btn-gold", text: "Haiku abgeben",
          onclick: () => {
            const lines = inputs.map((x) => x.value.trim());
            if (!lines[0] && !lines[1] && !lines[2]) { SS.toast("Schreib zuerst etwas.", "err"); return; }
            ctx.state.priv[ctx.me] = Object.assign({}, ctx.state.priv[ctx.me] || {}, { lines: lines });
            SS.actAs(ctx.me, "submit", { lines: lines });
          },
        }),
      ]),
    ]);
  }

  function newHaikuRound(ctx) {
    ctx.pub.runId = SS.uid(6);
    ctx.pub.stage = "write";
    ctx.pub.pieces = {};
    ctx.pub.votes = {};
    ctx.pub.winner = null;
    local.runId = null;
  }

  function resolveHaiku(ctx, force) {
    const pub = ctx.pub;
    const active = ctx.players.filter((p) => p.connected !== false);
    const voters = active.filter((p) => pub.pieces[p.id]);
    if (!force && !voters.every((p) => pub.votes[p.id])) return;
    if (force && !Object.keys(pub.votes).length) { SS.toast("Noch keine Stimmen abgegeben.", "err"); return; }
    const tally = {};
    Object.values(pub.votes).forEach((t) => { tally[t] = (tally[t] || 0) + 1; });
    let best = null, bestN = -1;
    Object.entries(tally).forEach(([pid, n]) => { if (n > bestN) { bestN = n; best = pid; } });
    if (!best) best = voters[0] ? voters[0].id : null;
    pub.winner = best;
    if (best) ctx.addScore(best, 2);
    active.forEach((p) => { if (p.id !== best && pub.pieces[p.id]) ctx.addScore(p.id, 1); });
    ctx.log("Bestes Haiku: " + (best ? ctx.player(best).name : "—"));
  }

  /* ══════════════════════════════════════════════════════════════════════
     ANMELDUNG
     ══════════════════════════════════════════════════════════════════════ */
  /* Beim Spielwechsel müssen alte Zeitgeber und Laufzeiten zurückgesetzt werden. */
  SS.partyReset = function () {
    stopTick();
    local.runId = null;
    local.startAt = 0;
    local.goAt = 0;
  };

  SS.registerImpl("reaction", reaction);
  SS.registerImpl("anagram", anagram);
  SS.registerImpl("sort", sortGame);
  SS.registerImpl("werbinich", werbinich);
  SS.registerImpl("werbistdu", werbistdu);
  SS.registerImpl("debate", debate);
  SS.registerImpl("haiku", haiku);
})();
