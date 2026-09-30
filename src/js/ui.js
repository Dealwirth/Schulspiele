/* ==========================================================================
   Seidla — Ansichten
   Beitreten, Aufgaben, Sidequests, Album und der Wirt-Bereich. Kein
   Minispielkram: eine Liste Aufgaben pro Person, jede mit Fotonachweis.
   ========================================================================== */
(function () {
  "use strict";
  const SS = window.SS;
  const $ = SS.$, $$ = SS.$$, el = SS.el;

  /* ── Bausteine ────────────────────────────────────────────────────────── */
  function btn(label, opts) {
    opts = opts || {};
    const attrs = {
      class: "btn " + (opts.kind === "primary" ? "btn-gold" : opts.kind === "ghost" ? "btn-ghost" : opts.kind === "danger" ? "btn-danger" : "btn-outline") + (opts.cls ? " " + opts.cls : ""),
      text: label,
      disabled: opts.disabled || false,
      onclick: opts.onClick,
      title: opts.title || null,
    };
    if (opts.id) attrs.id = opts.id;
    return el("button", attrs);
  }
  function field(label, input) {
    return el("label", { class: "field" }, [el("span", { class: "field-label", text: label }), input]);
  }
  function avatar(p, cls) {
    return el("span", {
      class: "avatar " + (cls || ""),
      style: { background: p.color || "#8a6a1f" },
      text: SS.initial(p.name),
      title: p.name,
    });
  }
  const pill = (text, kind) => el("span", { class: "pill " + (kind || ""), text: text });

  function typeBadge(task) {
    const t = SS.tasks.typeById(task.type);
    if (!t) return pill("Aufgabe");
    return el("span", { class: "type-badge lvl-" + task.level, title: t.hint }, [
      el("span", { class: "type-glyph", text: t.glyph }),
      el("span", { text: t.name }),
    ]);
  }

  /* ── Kopfzeile ────────────────────────────────────────────────────────── */
  function topbar() {
    const s = SS.state;
    const left = el("div", { class: "top-left" }, [
      el("button", { class: "brand", id: "brandBtn", text: "Seidla" }),
      el("span", { class: "brand-sub", text: "die fränkische Wirtshausrunde" }),
    ]);
    const right = el("div", { class: "top-right" }, [
      el("span", { class: "net-badge", id: "netBadge", text: s.connection === "online" ? "Verbunden" : "Lokal" }),
      s.phase !== "lobby" ? btn("Aufgaben", { kind: "ghost", cls: "tiny", onClick: () => go("tasks") }) : null,
      s.phase !== "lobby" ? btn("Album", { kind: "ghost", cls: "tiny", onClick: () => go("album") }) : null,
      btn("Wirt", { kind: "ghost", cls: "tiny", id: "wirtBtn", onClick: openWirtGate }),
    ]);
    const bar = el("header", { class: "topbar" }, [left, right]);
    bar.appendChild(el("div", { class: "outbox-bar", id: "outboxBar", hidden: true }));
    return bar;
  }

  /* ── Startseite ───────────────────────────────────────────────────────── */
  function viewHome() {
    const s = SS.state;
    const g = SS.store ? SS.store.loadGroup() : null;
    const body = el("div", { class: "wrap" }, [
      el("section", { class: "hero" }, [
        el("h1", { text: "A Seidla geht immer." }),
        el("p", { class: "lead", text: "Ein Abend, eine Runde, jeder kriegt seine Aufgaben. Beweis ist ein Foto — und die Aufgaben hängen alle aneinander, damit niemand am Rand steht." }),
        el("div", { class: "hero-actions" }, [
          btn("Runde aufmachen", { kind: "primary", onClick: openCreate }),
          btn("Beitreten", { onClick: openJoin }),
        ]),
        g && g.code ? el("p", { class: "muted small", text: "Letzte Runde: " + (g.name || "Wirtshausrunde") + " (" + g.code + ")" }) : null,
      ]),

      el("section", { class: "cards" }, [
        card("So läuft's", [
          "Der Wirt macht eine Runde auf und bekommt einen Code.",
          "Alle treten mit dem Code bei — Name bleibt gespeichert.",
          "Der Wirt wählt Aufgabentypen und teilt aus: 5 bis 10 pro Person.",
          "Jeder erledigt seine Aufgaben und weist sie mit einem Foto nach.",
          "Wer wen besuchen muss, steht in der Aufgabe — so redet die ganze Runde miteinander.",
        ]),
        card("Sidequests", [
          "Extra-Aufgaben, die die Runde selbst vorschlägt.",
          "Der Wirt gibt frei, was in Ordnung geht.",
          "Dann zieht eine zufällige Person die Sidequest.",
          "Sie ist freiwillig — wer mitmacht, kassiert Extrapunkte.",
        ]),
        card("Ohne Netz", [
          "Fällt das Internet aus, geht's am Gerät weiter.",
          "Nachweise wandern in den Ausgangskorb.",
          "Sobald wieder Netz da ist, geht alles von selbst raus.",
          "Der Wirt sieht danach, was in der Zwischenzeit passiert ist.",
        ]),
      ]),
    ]);
    return el("div", { class: "view view-home" }, [topbar(), body, footer()]);
  }

  function card(title, lines) {
    return el("article", { class: "card" }, [
      el("h3", { text: title }),
      el("ul", {}, lines.map((l) => el("li", { text: l }))),
    ]);
  }
  function footer() {
    return el("footer", { class: "foot" }, [
      el("span", { text: "Für Erwachsene gedacht. Kein Konto, keine Werbung, keine Daten auf fremden Servern." }),
    ]);
  }

  /* ── Wirt: Runde aufmachen ────────────────────────────────────────────── */
  function openCreate() {
    const prof = SS.store.loadProfile();
    const nameIn = el("input", { type: "text", value: prof.name || "", placeholder: "Dein Name", maxlength: 22 });
    const grpIn = el("input", { type: "text", value: SS.state.groupName || "Wirtshausrunde", maxlength: 30 });
    const body = el("div", {}, [
      field("Dein Name", nameIn),
      field("Name der Runde", grpIn),
      el("p", { class: "muted small", text: "Der Name bleibt auf dem Gerät gespeichert. Beim nächsten Mal steht er schon da." }),
    ]);
    SS.modal("Runde aufmachen", body, [
      { label: "Abbrechen" },
      {
        label: "Aufmachen", kind: "primary", onClick: () => {
          const nm = nameIn.value.trim();
          if (!nm) { SS.toast("Wie heißt du?", "err"); return false; }
          SS.store.saveProfile({ name: nm, seen: true });
          SS.state.groupName = grpIn.value.trim() || "Wirtshausrunde";
          SS.state.mode = "local"; SS.state.role = "solo"; SS.state.me = null;
          SS.state.players = [];
          SS.addPlayer(nm, { isHost: true });
          SS.state.hostId = SS.state.players[0].id;
          SS.state.seed = "lokal:" + SS.uid(6);
          SS.state.phase = "lobby";
          SS.toast("Runde offen. Jetzt Leut einladen.", "ok");
          go("lobby");
        },
      },
    ]);
  }

  /* ── Beitreten ────────────────────────────────────────────────────────── */
  function openJoin() {
    const prof = SS.store.loadProfile();
    const nameIn = el("input", { type: "text", value: prof.name || "", placeholder: "Dein Name", maxlength: 22 });
    const codeIn = el("input", { type: "text", value: (SS.state.code || ""), placeholder: "z. B. K7QP", maxlength: 4, class: "code-input" });
    codeIn.style.textTransform = "uppercase";
    const netOk = SS.net.available();
    const body = el("div", {}, [
      field("Dein Name", nameIn),
      field("Rundencode", codeIn),
      el("p", { class: "muted small", text: netOk
        ? "Der Code steht beim Wirt auf dem Bildschirm. Vier Buchstaben oder Ziffern."
        : "Gerade ist kein Verbindungsdienst erreichbar. Du kannst trotzdem am selben Gerät mitspielen — dann wandert das Handy." }),
    ]);
    SS.modal("Beitreten", body, [
      { label: "Abbrechen" },
      {
        label: netOk ? "Beitreten" : "Ohne Netz am Gerät", kind: "primary", onClick: () => {
          const nm = nameIn.value.trim();
          if (!nm) { SS.toast("Wie heißt du?", "err"); return false; }
          SS.store.saveProfile({ name: nm, seen: true });
          if (!netOk) { joinLocal(nm); return; }
          const code = codeIn.value.trim().toUpperCase();
          if (code.length !== 4) { SS.toast("Der Code hat vier Zeichen.", "err"); return false; }
          joinOnline(code, nm);
          return false;
        },
      },
    ]);
  }

  function joinLocal(name) {
    SS.state.mode = "local"; SS.state.role = "solo";
    if (!SS.state.players.length) { SS.addPlayer(name, { isHost: true }); SS.state.hostId = SS.state.players[0].id; }
    else SS.addPlayer(name, {});
    SS.toast("Am Gerät dabei. Aufgaben kommen, sobald der Wirt austeilt.", "ok");
    go("lobby");
  }

  function joinOnline(code, name) {
    SS.state.mode = "online"; SS.state.code = code; SS.state.role = "guest";
    SS.toast("Verbinde mit Runde " + code + " …");
    SS.net.joinGroup(code, name).then(() => {
      SS.toast("Du bist dabei!", "ok");
      go(SS.state.phase === "running" ? "tasks" : "lobby");
    }).catch((e) => {
      SS.toast(e.message, "err");
    });
  }

  /* ── Lobby ────────────────────────────────────────────────────────────── */
  function viewLobby() {
    const s = SS.state;
    const host = SS.isHost();
    const body = el("div", { class: "wrap" }, [
      el("section", { class: "lobby-head" }, [
        el("h1", { text: s.groupName || "Wirtshausrunde" }),
        s.code ? el("div", { class: "code-box" }, [
          el("span", { class: "code-label", text: "Rundencode" }),
          el("span", { class: "code-big", text: s.code }),
          el("button", { class: "btn btn-outline tiny", text: "Kopieren", onclick: () => copyText(s.code) }),
        ]) : el("p", { class: "muted", text: "Diese Runde läuft am selben Gerät. Für getrennte Bildschirme beim Wirt eine Runde mit Code aufmachen." }),
      ]),
      el("section", { class: "panel" }, [
        el("div", { class: "panel-head" }, [
          el("h2", { text: "Wer ist da?" }),
          el("span", { class: "pill", text: SS.alive().length + " Leut" }),
        ]),
        el("div", { class: "roster" }, SS.alive().map((p) => el("div", { class: "roster-row" }, [
          avatar(p), el("span", { class: "roster-name", text: p.name }),
          p.isHost ? pill("Wirt", "gold") : null,
          !host ? null : el("span", { class: "spacer" }),
          !host || p.isHost ? null : el("button", {
            class: "btn btn-ghost tiny", text: "Entfernen",
            onclick: () => { SS.removePlayer(p.id); SS.logLine(p.name + " wurde rausgesetzt."); SS.sync(); },
          }),
        ]))),
      ]),
      host ? el("section", { class: "panel" }, [
        el("div", { class: "panel-head" }, [el("h2", { text: "Aufgaben vorbereiten" })]),
        settingsForm(),
        el("div", { class: "row-actions" }, [
          btn("Aufgaben austeilen", { kind: "primary", onClick: dealNow }),
          btn("Sidequests verwalten", { onClick: () => go("sidequests") }),
        ]),
        el("p", { class: "muted small", text: "Nach dem Austeilen bekommt jeder seine Liste. Bis dahin kann alles noch geändert werden." }),
      ]) : el("section", { class: "panel" }, [
        el("div", { class: "panel-head" }, [el("h2", { text: "Warten auf den Wirt" })]),
        el("p", { class: "muted", text: "Sobald der Wirt austeilt, stehen deine Aufgaben hier." }),
      ]),
    ]);
    return el("div", { class: "view view-lobby" }, [topbar(), body, footer()]);
  }

  /** Einstellungen: Aufgabentypen an- und abwählen. */
  function settingsForm() {
    const s = SS.state.settings;
    const types = SS.tasks.taskTypes();
    if (!s.types) s.types = types.map((t) => t.id);
    const wrap = el("div", { class: "settings" });

    const count = el("input", { type: "range", min: 5, max: 10, value: s.perPlayer });
    const countVal = el("strong", { text: s.perPlayer + " pro Person" });
    count.addEventListener("input", () => {
      s.perPlayer = Number(count.value);
      countVal.textContent = s.perPlayer + " pro Person";
    });
    wrap.appendChild(el("div", { class: "setting-row" }, [
      el("span", { class: "setting-label", text: "Aufgaben pro Person" }), count, countVal,
    ]));

    const lvl = el("input", { type: "range", min: 1, max: 3, value: s.maxLevel });
    const lvlVal = el("strong", { text: ["", "nur harmlos", "bis ordentlich", "bis wild"][s.maxLevel] });
    lvl.addEventListener("input", () => {
      s.maxLevel = Number(lvl.value);
      lvlVal.textContent = ["", "nur harmlos", "bis ordentlich", "bis wild"][s.maxLevel];
      refresh();
    });
    wrap.appendChild(el("div", { class: "setting-row" }, [
      el("span", { class: "setting-label", text: "Wie derb darf's sein?" }), lvl, lvlVal,
    ]));

    const grid = el("div", { class: "type-grid" });
    function refresh() {
      grid.innerHTML = "";
      types.forEach((t) => {
        const on = s.types.indexOf(t.id) !== -1;
        const tooHard = t.level > s.maxLevel;
        const b = el("button", {
          class: "type-chip" + (on ? " on" : "") + (tooHard ? " dim" : ""),
          title: t.hint,
          onclick: () => {
            const i = s.types.indexOf(t.id);
            if (i === -1) s.types.push(t.id); else s.types.splice(i, 1);
            if (!s.types.length) { s.types.push(t.id); SS.toast("Mindestens ein Typ muss bleiben.", "err"); }
            refresh();
          },
        }, [
          el("span", { class: "type-glyph", text: t.glyph }),
          el("span", { class: "type-name", text: t.name }),
          el("span", { class: "type-count", text: String(SS.tasks.tasksOfType(t.id).length) }),
        ]);
        grid.appendChild(b);
      });
    }
    refresh();
    wrap.appendChild(el("div", { class: "setting-block" }, [
      el("span", { class: "setting-label", text: "Aufgabentypen (an- und abwählbar)" }), grid,
    ]));

    const sqToggle = el("input", { type: "checkbox", checked: s.sidequests });
    sqToggle.addEventListener("change", () => { s.sidequests = sqToggle.checked; });
    wrap.appendChild(el("label", { class: "setting-row check" }, [
      sqToggle, el("span", { text: "Sidequests erlauben (freiwillige Extra-Aufgaben)" }),
    ]));

    const confSel = el("select", {}, [
      el("option", { value: "host", text: "Der Wirt hakt ab", selected: s.confirmMode === "host" }),
      el("option", { value: "self", text: "Jeder hakt selbst ab", selected: s.confirmMode === "self" }),
    ]);
    confSel.addEventListener("change", () => { s.confirmMode = confSel.value; });
    wrap.appendChild(el("label", { class: "setting-row" }, [
      el("span", { class: "setting-label", text: "Wer gibt Aufgaben frei?" }), confSel,
    ]));

    return wrap;
  }

  function dealNow() {
    const s = SS.state;
    if (SS.alive().length < 1) { SS.toast("Erst muss jemand da sein.", "err"); return; }
    if (!s.seed) s.seed = (s.code || "lokal") + ":" + SS.uid(6);
    SS.dealTasks();
    SS.toast("Aufgaben sind ausgeteilt!", "ok");
    go("tasks");
  }

  /* ── Meine Aufgaben ───────────────────────────────────────────────────── */
  function viewTasks() {
    const s = SS.state;
    const mePid = s.mode === "online" ? s.me : (s.players[0] && s.players[0].id);
    const my = SS.tasksOf(mePid);
    const body = el("div", { class: "wrap" });

    if (!my.length) {
      body.appendChild(el("section", { class: "panel" }, [
        el("h2", { text: "Noch keine Aufgaben" }),
        el("p", { class: "muted", text: SS.isHost() ? "Teile die Aufgaben aus, sobald alle da sind." : "Der Wirt hat noch nicht ausgeteilt." }),
        SS.isHost() ? btn("Aufgaben austeilen", { kind: "primary", onClick: dealNow }) : null,
      ]));
      return el("div", { class: "view" }, [topbar(), body, footer()]);
    }

    const c = SS.doneCount(mePid);
    body.appendChild(el("section", { class: "task-head" }, [
      el("h1", { text: "Deine Aufgaben" }),
      el("p", { class: "muted", text: c.done + " von " + c.total + " erledigt · " + SS.pointsOf(mePid) + " Punkte" }),
      el("div", { class: "progress" }, [el("div", { class: "progress-fill", style: { width: Math.round((c.done / Math.max(1, c.total)) * 100) + "%" } })]),
    ]));

    const open = my.filter((t) => !t.confirmed);
    const done = my.filter((t) => t.confirmed);
    if (open.length) {
      body.appendChild(el("section", { class: "panel" }, [
        el("div", { class: "panel-head" }, [el("h2", { text: "Noch offen" }), pill(String(open.length))]),
        el("div", { class: "task-list" }, open.map(taskCard)),
      ]));
    }
    if (done.length) {
      body.appendChild(el("section", { class: "panel done-panel" }, [
        el("div", { class: "panel-head" }, [el("h2", { text: "Abgehakt" }), pill(String(done.length), "gold")]),
        el("div", { class: "task-list" }, done.map(taskCard)),
      ]));
    }
    body.appendChild(sidequestPanel(mePid));
    return el("div", { class: "view" }, [topbar(), body, footer()]);
  }

  /** Eine Aufgabe als Karte mit Foto-Knopf. */
  function taskCard(t) {
    const s = SS.state;
    const mePid = s.mode === "online" ? s.me : (s.players[0] && s.players[0].id);
    const owner = findOwner(t.aid);
    const isMine = owner === mePid;
    const photo = SS.photoFor(t.aid);
    const target = t.target ? SS.player(t.target) : null;

    const card = el("article", { class: "task" + (t.confirmed ? " confirmed" : "") + (photo ? " has-photo" : "") });

    card.appendChild(el("div", { class: "task-top" }, [
      typeBadge(t),
      el("span", { class: "task-points", text: "+" + t.points }),
      t.confirmed ? pill("abgehakt", "gold") : photo ? pill("Nachweis da", "ok") : null,
    ]));

    card.appendChild(el("p", { class: "task-text", text: t.text }));

    const meta = el("div", { class: "task-meta" });
    if (target) meta.appendChild(el("span", { class: "task-target" }, [avatar(target, "tiny"), el("span", { text: "geht an " + target.name })]));
    if (!isMine && owner) meta.appendChild(el("span", { class: "muted small", text: "gehört " + SS.nameOf(owner) }));
    card.appendChild(meta);

    if (photo) card.appendChild(el("div", { class: "proof" }, [SS.proof.img(photo.data), el("span", { class: "muted small", text: "Nachweis vom " + new Date(photo.at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr" })]));

    const acts = el("div", { class: "task-acts" });
    if (isMine && !t.confirmed) {
      acts.appendChild(btn(photo ? "Neues Foto" : "Foto als Beweis", {
        kind: photo ? "outline" : "primary",
        onClick: () => shootPhoto(owner, t.aid),
      }));
    }
    if (photo && !t.confirmed && SS.isHost()) {
      acts.appendChild(btn("Freigeben", { kind: "primary", onClick: () => hostConfirm(owner, t.aid) }));
      acts.appendChild(btn("Ablehnen", { kind: "danger", onClick: () => hostReject(owner, t.aid) }));
    }
    if (photo && !t.confirmed && !SS.isHost() && SS.state.settings.confirmMode === "self") {
      acts.appendChild(btn("Selbst abhaken", { kind: "primary", onClick: () => selfConfirm(owner, t.aid) }));
    }
    if (acts.children.length) card.appendChild(acts);
    return card;
  }

  function findOwner(aid) {
    for (const pid in SS.state.assignments) {
      if (SS.state.assignments[pid].some((t) => t.aid === aid)) return pid;
    }
    return null;
  }

  function shootPhoto(pid, aid) {
    SS.proof.pick().then((res) => {
      if (!res) return;
      // actAs erledigt alles: Wirt und lokale Runde führen direkt aus,
      // Gäste schicken an den Wirt (und ohne Netz in den Ausgangskorb).
      SS.actAs(pid, "photo", { pid: pid, aid: aid, data: res.data });
      SS.toast("Nachweis gespeichert. Der Wirt schaut gleich drüber.", "ok");
    });
  }
  function hostConfirm(pid, aid) { SS.actAs(pid, "confirm", { pid: pid, aid: aid }); SS.toast("Freigegeben.", "ok"); }
  function hostReject(pid, aid) { SS.actAs(pid, "reject", { pid: pid, aid: aid }); SS.toast("Abgelehnt — nochmal versuchen.", "err"); }
  function selfConfirm(pid, aid) { SS.actAs(pid, "confirm", { pid: pid, aid: aid }); }

  /* ── Sidequests ───────────────────────────────────────────────────────── */
  function sidequestPanel(mePid) {
    const s = SS.state;
    if (!s.settings.sidequests) return el("div");
    const open = s.sidequests.filter((q) => !(q.done || {})[mePid]);
    const mine = s.sidequests.filter((q) => (q.done || {})[mePid]);
    const panel = el("section", { class: "panel sidequest-panel" }, [
      el("div", { class: "panel-head" }, [
        el("h2", { text: "Sidequests" }),
        pill("freiwillig", "ghost"),
      ]),
      el("p", { class: "muted small", text: "Extra-Aufgaben von der Runde. Wer mitmacht, kassiert Extrapunkte — wer nicht, auch kein Drama." }),
    ]);

    if (open.length) {
      panel.appendChild(el("div", { class: "task-list" }, open.map((q) => {
        const drawnMe = q.drawn === mePid;
        const c = el("article", { class: "task sidequest" + (drawnMe ? " drawn" : "") });
        c.appendChild(el("div", { class: "task-top" }, [
          pill("Sidequest", "ghost"),
          el("span", { class: "task-points", text: "+" + (q.points || 2) }),
          drawnMe ? pill("dir gezogen", "gold") : null,
        ]));
        c.appendChild(el("p", { class: "task-text", text: q.text }));
        if (q.by) c.appendChild(el("p", { class: "muted small", text: "Vorschlag von " + SS.nameOf(q.by) }));
        c.appendChild(el("div", { class: "task-acts" }, [
          btn("Annehmen", { kind: drawnMe ? "primary" : "outline", onClick: () => SS.actAs(mePid, "sidequest-take", { sid: q.id }) }),
          btn("Mit Foto abschließen", { onClick: () => sidequestShot(mePid, q.id) }),
        ]));
        return c;
      })));
    }
    if (mine.length) {
      panel.appendChild(el("h3", { text: "Geschafft" }));
      panel.appendChild(el("div", { class: "task-list" }, mine.map((q) => {
        const c = el("article", { class: "task confirmed" });
        c.appendChild(el("p", { class: "task-text", text: q.text }));
        const ph = SS.store.album().find((p) => p.aid === "sq:" + q.id && p.pid === mePid);
        if (ph) c.appendChild(el("div", { class: "proof" }, [SS.proof.img(ph.data)]));
        return c;
      })));
    }

    // Vorschlag einreichen
    const inp = el("input", { type: "text", placeholder: "Eigene Sidequest vorschlagen …", maxlength: 140 });
    panel.appendChild(el("div", { class: "row-actions" }, [
      inp,
      btn("Vorschlagen", {
        onClick: () => {
          const txt = inp.value.trim();
          if (txt.length < 6) { SS.toast("Ein bisschen mehr darf's sein.", "err"); return; }
          SS.actAs(mePid, "propose", { text: txt });
          inp.value = "";
          SS.toast("Vorschlag liegt beim Wirt.", "ok");
          SS.renderCurrent();
        },
      }),
    ]));
    if (s.proposals.filter((p) => p.by === mePid).length) {
      panel.appendChild(el("p", { class: "muted small", text: "Deine Vorschläge liegen beim Wirt zur Freigabe." }));
    }
    return panel;
  }

  function sidequestShot(pid, sid) {
    SS.proof.pick().then((res) => {
      if (!res) return;
      SS.actAs(pid, "sidequest-done", { sid: sid, data: res.data });
      SS.toast("Sidequest geschafft!", "ok");
      SS.renderCurrent();
    });
  }

  /* ── Sidequest-Verwaltung (Wirt) ──────────────────────────────────────── */
  function viewSidequests() {
    const s = SS.state;
    const body = el("div", { class: "wrap" }, [
      el("section", { class: "panel" }, [
        el("div", { class: "panel-head" }, [el("h2", { text: "Vorschläge aus der Runde" }), pill(String(s.proposals.filter((p) => p.status === "offen").length) + " offen")]),
        s.proposals.length ? el("div", { class: "task-list" }, s.proposals.map((p) => {
          const c = el("article", { class: "task proposal " + p.status });
          c.appendChild(el("p", { class: "task-text", text: p.text }));
          c.appendChild(el("p", { class: "muted small", text: "von " + SS.nameOf(p.by) + " · " + p.status }));
          if (p.status === "offen") {
            c.appendChild(el("div", { class: "task-acts" }, [
              btn("Freigeben", { kind: "primary", onClick: () => { SS.applyAction(SS.state.me || "host", "approve", { id: p.id }); SS.sync(); SS.renderCurrent(); } }),
              btn("Ablehnen", { kind: "danger", onClick: () => { SS.applyAction(SS.state.me || "host", "reject-proposal", { id: p.id }); SS.sync(); SS.renderCurrent(); } }),
            ]));
          }
          return c;
        })) : el("p", { class: "muted", text: "Noch keine Vorschläge. Die Runde kann unter «Aufgaben» welche einreichen." }),
      ]),
      el("section", { class: "panel" }, [
        el("div", { class: "panel-head" }, [el("h2", { text: "Freigegebene Sidequests" }), pill(String(s.sidequests.length))]),
        s.sidequests.length ? el("div", { class: "task-list" }, s.sidequests.map((q) => {
          const c = el("article", { class: "task sidequest" });
          c.appendChild(el("p", { class: "task-text", text: q.text }));
          c.appendChild(el("p", { class: "muted small", text: "gezogen: " + (q.drawn ? SS.nameOf(q.drawn) : "niemand") + " · geschafft: " + Object.keys(q.done || {}).length }));
          return c;
        })) : el("p", { class: "muted", text: "Noch keine freigegeben." }),
      ]),
      el("div", { class: "row-actions" }, [btn("Zurück zur Lobby", { onClick: () => go("lobby") })]),
    ]);
    return el("div", { class: "view" }, [topbar(), body, footer()]);
  }

  /* ── Album ────────────────────────────────────────────────────────────── */
  function viewAlbum() {
    const s = SS.state;
    const photos = SS.allProofs();
    const body = el("div", { class: "wrap" }, [
      el("section", { class: "album-head" }, [
        el("h1", { text: "Album des Abends" }),
        el("p", { class: "muted", text: photos.length + " Nachweise · " + SS.alive().length + " Leut" }),
      ]),
    ]);
    if (!photos.length) {
      body.appendChild(el("section", { class: "panel" }, [el("p", { class: "muted", text: "Noch kein Bild im Album. Aufgaben brauchen einen Nachweis — dann füllt sich das hier von selbst." })]));
    } else {
      const byPid = {};
      photos.forEach((p) => { (byPid[p.pid] = byPid[p.pid] || []).push(p); });
      Object.keys(byPid).forEach((pid) => {
        body.appendChild(el("section", { class: "panel" }, [
          el("div", { class: "panel-head" }, [avatar(SS.player(pid) || { name: "Gast", color: "#8a6a1f" }), el("h2", { text: SS.nameOf(pid) }), pill(String(byPid[pid].length) + " Bilder")]),
          el("div", { class: "album-grid" }, byPid[pid].map((p) => el("figure", { class: "album-item" }, [
            SS.proof.img(p.data),
            el("figcaption", { class: "muted small", text: p.text || "" }),
          ]))),
        ]));
      });
    }
    body.appendChild(el("div", { class: "row-actions" }, [
      btn("Bericht anzeigen", { kind: "primary", onClick: openReport }),
      btn("Zurück", { onClick: () => go(SS.state.phase === "lobby" ? "lobby" : "tasks") }),
    ]));
    return el("div", { class: "view" }, [topbar(), body, footer()]);
  }

  /* ── Auswertung / Bericht ─────────────────────────────────────────────── */
  function openReport() {
    const r = SS.ranking();
    const body = el("div", { class: "report" });
    if (r.length) {
      const top = el("div", { class: "podium" });
      r.slice(0, 3).forEach((x, i) => top.appendChild(el("div", { class: "podium-item rank-" + (i + 1) }, [
        avatar(SS.player(x.pid) || { name: x.name, color: x.color }, "big"),
        el("strong", { text: x.name }),
        el("span", { class: "muted small", text: x.points + " Punkte · " + x.done + "/" + x.total }),
      ])));
      body.appendChild(top);
      body.appendChild(el("table", { class: "rank-table" }, [
        el("thead", {}, [el("tr", {}, [el("th", { text: "#" }), el("th", { text: "Name" }), el("th", { text: "Punkte" }), el("th", { text: "Aufgaben" })])]),
        el("tbody", {}, r.map((x, i) => el("tr", {}, [
          el("td", { text: String(i + 1) }), el("td", { text: x.name }),
          el("td", { text: String(x.points) }), el("td", { text: x.done + " / " + x.total }),
        ]))),
      ]));
    }
    const report = SS.buildReport();
    body.appendChild(el("textarea", { class: "report-text", readonly: true, value: report }));
    body.appendChild(el("p", { class: "muted small", text: "Alles markieren und kopieren — passt in jede Gruppennachricht." }));
    SS.modal("Abendbericht", body, [
      { label: "Kopieren", onClick: () => { copyText(report); SS.toast("Bericht kopiert.", "ok"); return false; } },
      { label: "Zumachen", kind: "primary" },
    ]);
  }

  function copyText(t) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(() => SS.toast("Kopiert.", "ok"), () => fallback());
      } else fallback();
    } catch (e) { fallback(); }
    function fallback() {
      const ta = el("textarea", { value: t });
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); SS.toast("Kopiert.", "ok"); } catch (e) { SS.toast("Bitte von Hand markieren.", "err"); }
      ta.remove();
    }
  }

  /* ── Wirt-Bereich ─────────────────────────────────────────────────────── */
  const WIRT_KEY = "135LowLap";
  let wirtOpen = false;

  function openWirtGate() {
    if (wirtOpen) { openWirtPanel(); return; }
    const inp = el("input", { type: "password", placeholder: "Schlüssel" });
    const body = el("div", {}, [
      field("Wirt-Schlüssel", inp),
      el("p", { class: "muted small", text: "Damit kommt man an die Abendverwaltung. Steht im Quelltext — es soll nur verhindern, dass jemand versehentlich im Management landet." }),
    ]);
    SS.modal("Wirt-Bereich", body, [
      { label: "Abbrechen" },
      {
        label: "Aufsperren", kind: "primary", onClick: () => {
          if (inp.value.trim() !== WIRT_KEY) { SS.toast("Falscher Schlüssel.", "err"); return false; }
          wirtOpen = true;
          SS.toast("Wirt-Bereich offen.", "ok");
          openWirtPanel();
          return false;
        },
      },
    ]);
  }

  function openWirtPanel() {
    const s = SS.state;
    const body = el("div", { class: "wirt" }, [
      el("div", { class: "wirt-tabs" }, [
        tab("Übersicht", () => wirtOverview()),
        tab("Teilnehmer", () => wirtPlayers()),
        tab("Sidequests", () => wirtSidequests()),
        tab("Abendbericht", () => wirtReport()),
      ]),
    ]);
    const box = SS.modal("Wirt-Bereich", body, [{ label: "Zumachen", kind: "primary" }]);
    body._tabs = body.querySelectorAll(".wirt-tab");
    function tab(label, render) {
      const b = el("button", { class: "wirt-tab", text: label, onclick: () => {
        $$(".wirt-tab", body).forEach((x) => x.classList.remove("on"));
        b.classList.add("on");
        const host = body.querySelector(".wirt-body");
        host.innerHTML = "";
        host.appendChild(render());
      } });
      return b;
    }
    const host = el("div", { class: "wirt-body" });
    body.appendChild(host);
    host.appendChild(wirtOverview());
    body.querySelector(".wirt-tab").classList.add("on");
    return box;
  }

  function wirtOverview() {
    const s = SS.state;
    const r = SS.ranking();
    const box = el("div", {});
    box.appendChild(el("div", { class: "stat-row" }, [
      stat("Dabei", String(SS.alive().length)),
      stat("Aufgaben", String(Object.values(s.assignments).reduce((n, a) => n + a.length, 0))),
      stat("Nachweise", String(SS.allProofs().length)),
      stat("Sidequests", String(s.sidequests.length)),
    ]));
    box.appendChild(el("h3", { text: "Zwischenstand" }));
    box.appendChild(el("table", { class: "rank-table" }, [
      el("thead", {}, [el("tr", {}, [el("th", { text: "Name" }), el("th", { text: "Punkte" }), el("th", { text: "offen" }), el("th", { text: "warten" })])]),
      el("tbody", {}, r.map((x) => {
        const waiting = SS.tasksOf(x.pid).filter((t) => t.done && !t.confirmed).length;
        return el("tr", {}, [
          el("td", { text: x.name }), el("td", { text: String(x.points) }),
          el("td", { text: String(x.open) }), el("td", { text: String(waiting) }),
        ]);
      })),
    ]));
    box.appendChild(el("div", { class: "row-actions" }, [
      btn("Aufgaben neu austeilen", { onClick: () => { SS.dealTasks(); SS.toast("Neu ausgeteilt.", "ok"); SS.renderCurrent(); } }),
      btn("Abend abschließen", { kind: "primary", onClick: () => {
        SS.state.phase = "over";
        SS.logLine("Der Wirt hat den Abend abgeschlossen.", "ok");
        if (SS.state.mode === "online") SS.net.broadcast({ t: "closed" });
        SS.sync();
        SS.toast("Abend abgeschlossen.", "ok");
      } }),
    ]));
    return box;
  }

  function wirtPlayers() {
    const s = SS.state;
    const box = el("div", {});
    box.appendChild(el("div", { class: "roster" }, SS.state.players.map((p) => el("div", { class: "roster-row" }, [
      avatar(p), el("span", { class: "roster-name", text: p.name }),
      p.isHost ? pill("Wirt", "gold") : null,
      p.connected === false ? pill("weg", "ghost") : null,
      el("span", { class: "spacer" }),
      p.connected === false ? btn("Wieder aufnehmen", { cls: "tiny", onClick: () => { p.connected = true; SS.sync(); SS.renderCurrent(); } }) : null,
      !p.isHost ? btn("Entfernen", { kind: "danger", cls: "tiny", onClick: () => { SS.removePlayer(p.id); SS.sync(); SS.renderCurrent(); } }) : null,
    ]))));
    const nameIn = el("input", { type: "text", placeholder: "Namen nachtragen …", maxlength: 22 });
    box.appendChild(el("div", { class: "row-actions" }, [
      nameIn,
      btn("Dazuschreiben", { onClick: () => {
        const n = nameIn.value.trim();
        if (!n) return;
        SS.addPlayer(n, {});
        SS.logLine(n + " wurde nachgetragen.");
        SS.sync(); nameIn.value = ""; SS.renderCurrent();
      } }),
    ]));
    box.appendChild(el("p", { class: "muted small", text: "Namen bleiben auf jedem Gerät gespeichert — auch nach einem Neustart." }));
    return box;
  }

  function wirtSidequests() {
    const s = SS.state;
    const box = el("div", {});
    box.appendChild(el("h3", { text: "Vorschläge" }));
    if (!s.proposals.length) box.appendChild(el("p", { class: "muted", text: "Noch keine Vorschläge." }));
    s.proposals.forEach((p) => {
      const row = el("div", { class: "wirt-row" }, [
        el("span", { class: "task-text", text: p.text }),
        el("span", { class: "muted small", text: "von " + SS.nameOf(p.by) + " · " + p.status }),
        p.status === "offen" ? btn("Freigeben", { kind: "primary", cls: "tiny", onClick: () => { SS.approveProposal(p.id); SS.sync(); openWirtPanel(); } }) : null,
        p.status === "offen" ? btn("Ablehnen", { kind: "danger", cls: "tiny", onClick: () => { SS.rejectProposal(p.id); SS.sync(); openWirtPanel(); } }) : null,
      ]);
      box.appendChild(row);
    });
    box.appendChild(el("h3", { text: "Freigegeben" }));
    if (!s.sidequests.length) box.appendChild(el("p", { class: "muted", text: "Noch keine freigegeben." }));
    s.sidequests.forEach((q) => box.appendChild(el("div", { class: "wirt-row" }, [
      el("span", { class: "task-text", text: q.text }),
      el("span", { class: "muted small", text: "gezogen: " + (q.drawn ? SS.nameOf(q.drawn) : "—") + " · geschafft: " + Object.keys(q.done || {}).length }),
    ])));
    return box;
  }

  function wirtReport() {
    const box = el("div", {});
    const ta = el("textarea", { class: "report-text", readonly: true, value: SS.buildReport() });
    box.appendChild(ta);
    box.appendChild(el("div", { class: "row-actions" }, [
      btn("Kopieren", { kind: "primary", onClick: () => copyText(ta.value) }),
      btn("Alles löschen (neuer Abend)", { kind: "danger", onClick: () => {
        if (!confirm("Wirklich alles löschen? Namen, Aufgaben, Album und Chronik sind dann weg.")) return;
        SS.store.wipe();
        SS.state.players = []; SS.state.assignments = {}; SS.state.sidequests = []; SS.state.proposals = [];
        SS.state.phase = "lobby"; SS.state.code = null; SS.state.me = null;
        SS.logLine("Alles gelöscht — neuer Abend.");
        SS.renderCurrent();
        SS.toast("Frisch für den nächsten Abend.", "ok");
      } }),
    ]));
    return box;
  }
  function stat(label, val) {
    return el("div", { class: "stat" }, [el("strong", { text: val }), el("span", { class: "muted small", text: label })]);
  }

  /* ── Navigation ───────────────────────────────────────────────────────── */
  const VIEWS = { home: viewHome, lobby: viewLobby, tasks: viewTasks, sidequests: viewSidequests, album: viewAlbum };
  function go(route) {
    SS.state.route = route;
    SS.renderCurrent();
    window.scrollTo(0, 0);
  }

  function render() {
    const root = $("#app");
    const route = SS.state.route || "home";
    const view = VIEWS[route] || viewHome;
    root.innerHTML = "";
    root.appendChild(view());
    updateOutbox();
  }

  function updateOutbox() {
    const bar = $("#outboxBar");
    if (!bar || !SS.store) return;
    const n = SS.store.outboxCount();
    if (!n) { bar.hidden = true; bar.textContent = ""; return; }
    bar.hidden = false;
    bar.textContent = n + " Sache(n) warten auf Netz — wird automatisch nachgreicht.";
  }

  function initUI() {
    SS.setRenderCurrent(render);
    SS.on("net", render);
    SS.on("joined", render);
    SS.on("outbox", updateOutbox);
    document.addEventListener("click", (e) => {
      const t = e.target.closest && e.target.closest("#brandBtn");
      if (t) go("home");
    });
    render();
  }

  SS.ui = { go, render, initUI, openCreate, openJoin, openReport, openWirtGate, copyText };
})();
