/* ==========================================================================
   Schulspiele — Quizduell
   Alle antworten gleichzeitig. Der Host löst auf und verteilt die Punkte.
   ========================================================================== */
(function () {
  "use strict";
  const SS = window.SS;
  const { el } = SS;
  const U = () => SS.util;

  const local = { runId: null, deadline: 0, ticker: null };

  const trivia = {
    init(ctx) {
      ctx.pub.game = "trivia";
      const qs = U().sharedShuffle(ctx, (window.SS_DATA.QUESTIONS || []).slice(), "trivia");
      const n = Math.min(Number(ctx.settings.rounds) || 12, qs.length);
      ctx.pub.questions = qs.slice(0, n);
      ctx.pub.total = n;
      ctx.pub.seconds = Number(ctx.settings.seconds) || 20;
      ctx.pub.run = 1;
      ctx.pub.resolved = false;
      ctx.pub.answers = {};
      ctx.pub.reveal = true;
      ctx.turn = null; // kein Zugwechsel — alle gleichzeitig
      nextQuestion(ctx);
      ctx.log("Quizduell: " + n + " Fragen.");
    },
    action(ctx, pid, name, payload) {
      const pub = ctx.pub;
      if (name === "answer") {
        if (pub.resolved) return;
        if (pub.answers[pid] !== undefined) return;
        pub.answers[pid] = payload.i;
        pub.times = pub.times || {};
        pub.times[pid] = Date.now();
      } else if (name === "resolve") {
        if (pub.resolved) return;
        resolve(ctx);
      } else if (name === "next") {
        pub.run++;
        if (pub.run >= ctx.pub.total) { ctx.state.phase = "over"; ctx.finish(); return; }
        nextQuestion(ctx);
      }
    },
    render(ctx) {
      const pub = ctx.pub;
      if (pub.game !== "trivia" || !pub.total) return el("div");
      if (ctx.state.phase === "over") { stopTriviaTick(); return U().finalScreen(ctx, "Quizduell beendet"); }
      const wrap = el("div");
      const q = pub.questions[pub.run - 1];
      const active = ctx.players.filter((p) => p.connected !== false);
      const answered = active.filter((p) => pub.answers[p.id] !== undefined).length;

      // Zeitmarke setzen
      if (local.runId !== pub.runId) { local.runId = pub.runId; local.deadline = Date.now() + pub.seconds * 1000; }
      const remain = Math.max(0, Math.ceil((local.deadline - Date.now()) / 1000));
      if (remain === 0 && !pub.resolved && ctx.isHost) resolve(ctx, true);

      wrap.appendChild(el("div", { class: "q-card" }, [
        el("div", { class: "tags", style: { justifyContent: "space-between" } }, [
          el("span", { class: "tag", text: q.cat || "Wissen" }),
          el("span", { class: "tag", text: "Frage " + pub.run + " von " + pub.total }),
        ]),
        el("div", { class: "q-text", text: q.q }),
        el("div", { class: "center", style: { marginBottom: "14px" } }, [
          el("span", { class: "serif", style: { fontSize: "26px", color: remain <= 5 ? "var(--red)" : "var(--navy)" }, text: remain + " s" }),
          el("span", { class: "muted", style: { marginLeft: "12px" }, text: answered + " von " + active.length + " haben geantwortet" }),
        ]),
        el("div", { class: "answers" }, q.a.map((text, i) => {
          const mine = pub.answers[ctx.me] === i;
          let cls = "answer";
          if (pub.resolved) {
            if (i === q.c) cls += " right";
            else if (mine) cls += " wrong";
          } else if (mine) {
            cls += "";
            cls = "answer";
          }
          return el("button", {
            class: cls,
            "aria-pressed": mine ? "true" : "false",
            disabled: pub.resolved || ctx.state.phase !== "playing" || mine,
            onclick: () => SS.actAs(ctx.me, "answer", { i: i }),
          }, [
            el("span", { class: "key", text: String.fromCharCode(65 + i) }),
            el("span", { text: text }),
          ]);
        })),
      ]));

      if (pub.resolved) {
        const correct = q.a[q.c];
        wrap.appendChild(el("div", { class: "center", style: { marginTop: "18px" } }, [
          el("p", { class: "lead", text: "Richtig: " + correct }),
          (ctx.isHost || ctx.isLocal)
            ? el("button", { class: "btn btn-gold", text: pub.run >= pub.total ? "Endstand" : "Nächste Frage", onclick: () => SS.act("next", {}) })
            : el("p", { class: "muted", text: "Warte auf die nächste Frage." }),
        ]));
      } else if (ctx.isHost || ctx.isLocal) {
        wrap.appendChild(el("div", { class: "center", style: { marginTop: "18px" } }, [
          el("button", { class: "btn btn-outline", text: "Auflösen", onclick: () => SS.act("resolve", {}) }),
        ]));
      }

      wrap.appendChild(el("div", { style: { marginTop: "20px" } }, U().scoreTable(ctx)));

      if (!pub.resolved) {
        if (!local.ticker) local.ticker = setInterval(() => ctx.rerender(), 500);
        local.tickerKey = "trivia";
      } else stopTriviaTick();
      return wrap;
    },
  };

  function stopTriviaTick() {
    if (local.ticker) { clearInterval(local.ticker); local.ticker = null; }
  }

  function nextQuestion(ctx) {
    ctx.pub.runId = SS.uid(6);
    ctx.pub.answers = {};
    ctx.pub.resolved = false;
    local.runId = null;
    local.deadline = 0;
  }

  function resolve(ctx) {
    const pub = ctx.pub;
    if (pub.resolved) return;
    const q = pub.questions[pub.run - 1];
    const active = ctx.players.filter((p) => p.connected !== false);
    const sound = active.filter((p) => pub.answers[p.id] === q.c);
    sound.forEach((p) => ctx.addScore(p.id, 1));
    // Zusatzpunkt für die schnellste richtige Antwort dieser Runde.
    const speeders = sound
      .filter((p) => pub.times && pub.times[p.id] !== undefined)
      .sort((a, b) => pub.times[a.id] - pub.times[b.id]);
    if (speeders.length) {
      ctx.addScore(speeders[0].id, 1);
      ctx.log(speeders[0].name + " war am schnellsten und bekommt einen Zusatzpunkt.");
    }
    pub.resolved = true;
    ctx.log("Frage " + pub.run + ": " + sound.length + " von " + active.length + " richtig.");
    stopTriviaTick();
  }

  SS.triviaReset = function () { stopTriviaTick(); local.runId = null; local.deadline = 0; };

  SS.registerImpl("trivia", trivia);
})();
