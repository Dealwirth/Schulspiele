/* ==========================================================================
   Seidla — Ansichten
   Beitreten, Lobby, Aufgaben, Sidequests, Chat, Album, Wertung und der
   Wirt-Bereich. Die Einstellungen sieht nur der Wirt — für alle anderen
   gibt es sie schlicht nicht.
   ========================================================================== */
(function () {
  "use strict";
  const SS = window.SS;
  const $ = SS.$, $$ = SS.$$, el = SS.el;

  // Läuft gerade ein Bild-Upload? Verhindert, dass zweimal getippt wird und
  // dasselbe Bild doppelt rausgeht.
  let shooting = false;

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
      style: { background: (p && p.color) || "#8a6a1f" },
      text: SS.initial(p && p.name),
      title: (p && p.name) || "",
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
      el("span", { class: "net-badge", id: "netBadge", text: s.connection === "online" ? "Verbunden" : "Am Gerät" }),
      s.phase !== "lobby" ? btn("Aufgaben", { kind: "ghost", cls: "tiny", onClick: () => go("tasks") }) : null,
      s.phase !== "lobby" && s.settings.review ? btn("Wertung", { kind: "ghost", cls: "tiny", onClick: () => go("review") }) : null,
      s.phase !== "lobby" ? btn("Album", { kind: "ghost", cls: "tiny", onClick: () => go("album") }) : null,
      s.settings.chat !== false ? btn("Chat", { kind: "ghost", cls: "tiny", id: "chatBtn", onClick: () => go("chat") }) : null,
      s.phase !== "lobby" && SS.isHost() ? btn("Wirt", { kind: "ghost", cls: "tiny", id: "wirtBtn", onClick: openWirtPanel }) : null,
    ]);
    const bar = el("header", { class: "topbar" }, [left, right]);
    bar.appendChild(el("div", { class: "outbox-bar", id: "outboxBar", hidden: true }));
    return bar;
  }

  /* ── Startseite ───────────────────────────────────────────────────────── */
  function viewHome() {
    const g = SS.store ? SS.store.loadGroup() : null;
    const body = el("div", { class: "wrap" }, [
      el("section", { class: "hero" }, [
        el("h1", { text: "A Seidla geht immer." }),
        el("p", { class: "lead", text: "Ein Abend, eine Runde, jeder kriegt seine Aufgaben. Beweis ist ein Foto — und die Aufgaben hängen alle aneinander, damit niemand am Rand steht." }),
        el("div", { class: "hero-actions" }, [
          btn("Runde aufmachen", { kind: "primary", onClick: openCreate }),
          btn("Beitreten", { onClick: openJoin }),
        ]),
        g && g.code ? el("p", { class: "muted small", text: "Letzte Runde: " + (g.name || "Wirtshausrunde") + " (" + g.code + ") · " + (g.role === "guest" ? "du warst Gast" : "du warst Wirt") }) : null,
      ]),
      el("section", { class: "cards" }, [
        card("So läuft's", [
          "Der Wirt macht eine Runde auf und bekommt einen Code plus QR-Bild.",
          "Alle treten mit dem Code bei — Name bleibt gespeichert.",
          "Der Wirt wählt Modus und Kategorien, dann teilt er aus: 5 bis 10 pro Person.",
          "Jeder erledigt seine Aufgaben und weist sie mit einem Foto nach.",
          "Wer wen besuchen muss, zieht die Website aus — nicht du.",
        ]),
        card("Die drei Modi", [
          "Entspannt — harmlos, für gemischte Runden.",
          "Hardcore — es wird deutlich derber.",
          "Vollsuff — asozial, inklusive Kotzen. Nur wenn alle wollen.",
          "Der Modus begrenzt, welche Aufgaben überhaupt vorkommen.",
        ]),
        card("Spielchat und Gesamtwertung", [
          "Ein Spielchat für alle — auch Gäste schreiben untereinander.",
          "Am Ende läuft die Gesamtwertung: die Runde bewertet die Nachweise.",
          "Kippt die Mehrheit auf «gilt nicht», ist die Aufgabe ungültig.",
          "Der Wirt kann das unterbinden — niemand hängt an einer Laune.",
        ]),
        card("Ohne Netz", [
          "Der Wirt funktioniert auch ohne Internet.",
          "Fällt das Netz aus, läuft alles am Gerät weiter.",
          "Nachweise und Chat wandern in den Ausgangskorb.",
          "Sobald wieder Netz da ist, geht alles von selbst raus.",
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

  /* ── Runde aufmachen ──────────────────────────────────────────────────── */
  function openCreate() {
    const prof = SS.store.loadProfile();
    const nameIn = el("input", { type: "text", value: prof.name || "", placeholder: "Dein Name", maxlength: 22 });
    const grpIn = el("input", { type: "text", value: SS.state.groupName || "Wirtshausrunde", maxlength: 30 });
    const body = el("div", {}, [
      field("Dein Name", nameIn),
      field("Name der Runde", grpIn),
      el("p", { class: "muted small", text: "Der Code entsteht sofort, auch ohne Internet. Der Abend läuft dann am Gerät; sobald Netz da ist, können die anderen beitreten." }),
    ]);
    SS.modal("Runde aufmachen", body, [
      { label: "Abbrechen" },
      {
        label: "Aufmachen", kind: "primary", onClick: () => {
          const nm = nameIn.value.trim();
          if (!nm) { SS.toast("Wie heißt du?", "err"); return false; }
          SS.store.saveProfile({ name: nm, seen: true });
          SS.state.groupName = grpIn.value.trim() || "Wirtshausrunde";
          SS.state.phase = "lobby";
          SS.net.createGroup(nm).then((r) => {
            if (r.connected) SS.toast("Runde " + r.code + " offen. Jetzt Leut einladen.", "ok");
            else SS.toast("Runde " + r.code + " offen — ohne Netz. Läuft erst mal am Gerät.", "ok");
            go("lobby");
          });
        },
      },
    ]);
  }

  /* ── Beitreten ────────────────────────────────────────────────────────── */
  function openJoin(prefill) {
    const prof = SS.store.loadProfile();
    const nameIn = el("input", { type: "text", value: prof.name || "", placeholder: "Dein Name", maxlength: 22 });
    const codeIn = el("input", { type: "text", value: (prefill || SS.state.code || ""), placeholder: "z. B. K7QP", maxlength: 4, class: "code-input" });
    codeIn.style.textTransform = "uppercase";
    const netOk = SS.net.available();
    const body = el("div", {}, [
      field("Dein Name", nameIn),
      field("Rundencode", codeIn),
      el("p", { class: "muted small", text: netOk
        ? "Der Code steht beim Wirt — oder du scannst dort den QR-Code."
        : "Gerade ist kein Verbindungsdienst erreichbar. Du kannst trotzdem am selben Gerät mitspielen — dann wandert das Handy." }),
    ]);
    SS.modal("Beitreten", body, [
      { label: "Abbrechen" },
      {
        label: netOk ? "Beitreten" : "Am Gerät mitspielen", kind: "primary", onClick: () => {
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
        s.code ? codeBlock(s.code) : null,
      ]),
      el("section", { class: "panel" }, [
        el("div", { class: "panel-head" }, [
          el("h2", { text: "Wer ist da?" }),
          pill(SS.alive().length + " Leut"),
          s.mode === "online" ? pill(SS.net.guestCount ? SS.net.guestCount() + " verbunden" : "", "ghost") : null,
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
      // Die Einstellungen sieht ausschließlich der Wirt.
      host ? el("section", { class: "panel" }, [
        el("div", { class: "panel-head" }, [el("h2", { text: "Aufgaben vorbereiten" }), pill("nur für den Wirt", "ghost")]),
        settingsForm(),
        el("div", { class: "row-actions" }, [
          btn("Aufgaben austeilen", { kind: "primary", onClick: dealNow }),
          btn("Sidequests verwalten", { onClick: () => go("sidequests") }),
        ]),
      ]) : el("section", { class: "panel" }, [
        el("div", { class: "panel-head" }, [el("h2", { text: "Warten auf den Wirt" })]),
        el("p", { class: "muted", text: "Der Wirt stellt gerade ein. Sobald er austeilt, stehen deine Aufgaben hier." }),
      ]),
      SS.state.settings.chat !== false ? chatTeaser() : null,
    ]);
    return el("div", { class: "view view-lobby" }, [topbar(), body, footer()]);
  }

  /** Code groß anzeigen, mit QR-Bild zum Abscannen. */
  function codeBlock(code) {
    const box = el("div", { class: "code-wrap" }, [
      el("div", { class: "code-box" }, [
        el("span", { class: "code-label", text: "Rundencode" }),
        el("span", { class: "code-big", text: code }),
        btn("Kopieren", { cls: "tiny", onClick: () => { copyText(code); SS.toast("Code kopiert.", "ok"); } }),
        btn("Link kopieren", { cls: "tiny", onClick: () => { copyText(SS.qr.joinUrl(code)); SS.toast("Beitrittslink kopiert.", "ok"); } }),
      ]),
      el("div", { class: "qr-panel" }, [
        SS.qr.element(SS.qr.joinUrl(code), { size: 220 }),
        el("p", { class: "muted small", text: "Scannen mit der Kamera — dann ist man direkt drin. Klappt auch ohne Tippen." }),
      ]),
    ]);
    return box;
  }

  /** Einstellungen: Modus und Kategorien. Nur der Wirt. */
  function settingsForm() {
    const s = SS.state.settings;
    const types = SS.tasks.taskTypes();
    if (!s.types) s.types = types.map((t) => t.id);
    const wrap = el("div", { class: "settings" });

    // Modus
    const modeGrid = el("div", { class: "mode-grid" });
    function drawModes() {
      modeGrid.innerHTML = "";
      SS.tasks.modes().forEach((m) => {
        const on = s.modeId === m.id;
        modeGrid.appendChild(el("button", {
          class: "mode-chip" + (on ? " on" : "") + " mode-" + m.id,
          title: m.hint,
          onclick: () => {
            s.modeId = m.id;
            s.maxLevel = m.level;
            // Kategorien, die der Modus nicht erlaubt, fliegen raus.
            s.types = s.types.filter((id) => (SS.tasks.typeById(id) || {}).level <= m.level);
            if (!s.types.length) s.types = types.filter((t) => t.level <= m.level).map((t) => t.id);
            drawModes(); drawTypes(); drawWarn();
          },
        }, [
          el("span", { class: "mode-glyph", text: m.glyph }),
          el("span", { class: "mode-name", text: m.name }),
          el("span", { class: "mode-hint", text: m.hint }),
        ]));
      });
    }

    const warn = el("div", { class: "mode-warn", hidden: true });
    function drawWarn() {
      const m = SS.tasks.modeById(s.modeId);
      warn.hidden = m.level < 3;
      warn.textContent = m.level >= 3
        ? "Vollsuff: Hier kommen absichtlich asoziale und eklige Aufgaben. Nur spielen, wenn wirklich alle am Tisch das ausdrücklich wollen — und niemand mitmacht, der eigentlich nicht mag."
        : "";
    }

    const count = el("input", { type: "range", min: 5, max: 10, value: s.perPlayer });
    const countVal = el("strong", { text: s.perPlayer + " pro Person" });
    count.addEventListener("input", () => {
      s.perPlayer = Number(count.value);
      countVal.textContent = s.perPlayer + " pro Person";
    });
    wrap.appendChild(el("div", { class: "setting-row" }, [
      el("span", { class: "setting-label", text: "Aufgaben pro Person" }), count, countVal,
    ]));

    wrap.appendChild(el("div", { class: "setting-block" }, [
      el("span", { class: "setting-label", text: "Modus" }), modeGrid, warn,
    ]));

    const grid = el("div", { class: "type-grid" });
    function drawTypes() {
      grid.innerHTML = "";
      const mode = SS.tasks.modeById(s.modeId);
      types.forEach((t) => {
        const on = s.types.indexOf(t.id) !== -1;
        const tooHard = t.level > mode.level;
        grid.appendChild(el("button", {
          class: "type-chip" + (on ? " on" : "") + (tooHard ? " dim" : ""),
          title: tooHard ? t.hint + " — im Modus " + mode.name + " nicht dabei." : t.hint,
          disabled: tooHard,
          onclick: () => {
            if (tooHard) return;
            const i = s.types.indexOf(t.id);
            if (i === -1) s.types.push(t.id); else s.types.splice(i, 1);
            if (!s.types.length) { s.types.push(t.id); SS.toast("Mindestens eine Kategorie muss bleiben.", "err"); }
            drawTypes();
          },
        }, [
          el("span", { class: "type-glyph", text: t.glyph }),
          el("span", { class: "type-name", text: t.name }),
          el("span", { class: "type-count", text: String(SS.tasks.tasksOfType(t.id, mode.level).length) }),
        ]));
      });
    }
    drawModes(); drawTypes(); drawWarn();
    wrap.appendChild(el("div", { class: "setting-block" }, [
      el("span", { class: "setting-label", text: "Kategorien (an- und abwählbar)" }), grid,
    ]));

    const sqToggle = el("input", { type: "checkbox", checked: s.sidequests });
    sqToggle.addEventListener("change", () => { s.sidequests = sqToggle.checked; });
    wrap.appendChild(el("label", { class: "setting-row check" }, [
      sqToggle, el("span", { text: "Sidequests erlauben (freiwillige Extra-Aufgaben)" }),
    ]));

    const chatToggle = el("input", { type: "checkbox", checked: s.chat !== false });
    chatToggle.addEventListener("change", () => { s.chat = chatToggle.checked; SS.sync(); SS.renderCurrent(); });
    wrap.appendChild(el("label", { class: "setting-row check" }, [
      chatToggle, el("span", { text: "Spielchat einschalten" }),
    ]));

    const revToggle = el("input", { type: "checkbox", checked: s.review !== false });
    revToggle.addEventListener("change", () => { s.review = revToggle.checked; });
    wrap.appendChild(el("label", { class: "setting-row check" }, [
      revToggle, el("span", { text: "Gesamtwertung am Ende (Runde bewertet die Nachweise)" }),
    ]));

    const ovToggle = el("input", { type: "checkbox", checked: s.hostOverride !== false });
    ovToggle.addEventListener("change", () => { s.hostOverride = ovToggle.checked; });
    wrap.appendChild(el("label", { class: "setting-row check" }, [
      ovToggle, el("span", { text: "Wirt entscheidet bei Gegenstimmen (sonst wird automatisch ungültig)" }),
    ]));

    const confSel = el("select", {}, [
      el("option", { value: "host", text: "Der Wirt gibt frei", selected: s.confirmMode !== "self" }),
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
        el("div", { class: "task-list" }, open.map((t) => taskCard(t, mePid))),
      ]));
    }
    if (done.length) {
      body.appendChild(el("section", { class: "panel done-panel" }, [
        el("div", { class: "panel-head" }, [el("h2", { text: "Abgehakt" }), pill(String(done.length), "gold")]),
        el("div", { class: "task-list" }, done.map((t) => taskCard(t, mePid))),
      ]));
    }
    body.appendChild(sidequestPanel(mePid));
    return el("div", { class: "view" }, [topbar(), body, footer()]);
  }

  /** Eine Aufgabe als Karte mit Foto-Knopf. */
  function taskCard(t, ownerPid) {
    const s = SS.state;
    const mePid = s.mode === "online" ? s.me : (s.players[0] && s.players[0].id);
    const owner = ownerPid || findOwner(t.aid);
    const isMine = owner === mePid;
    const photo = SS.photoFor(t.aid);
    const target = t.target ? SS.player(t.target) : null;

    const card = el("article", {
      class: "task" + (t.confirmed ? " confirmed" : "") + (photo ? " has-photo" : "") + (t.voided ? " voided" : ""),
    });

    card.appendChild(el("div", { class: "task-top" }, [
      typeBadge(t),
      el("span", { class: "task-points", text: "+" + t.points }),
      t.voided ? pill("ungültig", "bad") : t.confirmed ? pill("abgehakt", "gold") : photo ? pill("Nachweis da", "ok") : null,
      (t.flagged || 0) > 0 && !t.voided ? pill((t.flagged) + " dagegen", "warn") : null,
    ]));

    card.appendChild(el("p", { class: "task-text", text: t.text }));

    const meta = el("div", { class: "task-meta" });
    if (target) meta.appendChild(el("span", { class: "task-target" }, [avatar(target, "tiny"), el("span", { text: "geht an " + target.name })]));
    if (!isMine && owner) meta.appendChild(el("span", { class: "muted small", text: "gehört " + SS.nameOf(owner) }));
    card.appendChild(meta);

    if (photo) card.appendChild(el("div", { class: "proof" }, [
      SS.proof.img(photo.data),
      el("span", { class: "muted small", text: "Nachweis vom " + new Date(photo.at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr" }),
    ]));

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

  /**
   * Bild aufnehmen und hochladen. Gibt sofort Rückmeldung, damit am Handy
   * klar ist, dass es geklappt hat — dort sieht man den kleinen Fortschritt
   * am Rand leicht nicht.
   */
  function shootPhoto(pid, aid) {
    if (shooting) { SS.toast("Des Bild is scho unterwegs.", "err"); return; }
    SS.toast("Kamera oder Galerie aufmachen …", "ok");
    SS.proof.pick().then((res) => {
      if (!res) return;
      shooting = true;
      SS.toast("Bild wird hochgeladen …", "ok");
      try {
        SS.actAs(pid, "photo", { pid: pid, aid: aid, data: res.data });
        const kb = Math.max(1, Math.round(res.bytes / 1024));
        SS.toast("Nachweis drin (" + kb + " KB). Der Wirt schaut gleich drüber.", "ok");
      } catch (e) {
        SS.toast("Des hot ned klappt: " + e.message, "err");
      } finally {
        shooting = false;
      }
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
      el("div", { class: "panel-head" }, [el("h2", { text: "Sidequests" }), pill("freiwillig", "ghost")]),
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
      btn("Vorschlagen", { onClick: () => {
        const txt = inp.value.trim();
        if (txt.length < 6) { SS.toast("Des is a bissla kurz.", "err"); return; }
        SS.actAs(mePid, "propose", { text: txt });
        inp.value = "";
        SS.toast("Vorschlag is beim Wirt.", "ok");
      } }),
    ]));
    return panel;
  }

  function sidequestShot(pid, sid) {
    SS.proof.pick().then((res) => {
      if (!res) return;
      SS.actAs(pid, "sidequest-done", { sid: sid, data: res.data });
      SS.toast("Sidequest geschafft!", "ok");
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
              btn("Freigeben", { kind: "primary", onClick: () => { SS.applyAction(SS.state.me || "host", "approve", { id: p.id }); SS.sync(); } }),
              btn("Ablehnen", { kind: "danger", onClick: () => { SS.applyAction(SS.state.me || "host", "reject-proposal", { id: p.id }); SS.sync(); } }),
            ]));
          }
          return c;
        })) : el("p", { class: "muted", text: "Noch keine Vorschläge." }),
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

  /* ── Chat ─────────────────────────────────────────────────────────────── */
  function viewChat() {
    const s = SS.state;
    const lines = SS.store ? SS.store.chat() : [];
    const body = el("div", { class: "wrap" }, [
      el("section", { class: "panel chat-panel" }, [
        el("div", { class: "panel-head" }, [
          el("h2", { text: "Spielchat" }),
          pill(SS.alive().length + " Leut", "ghost"),
          s.connection !== "online" ? pill("ohne Netz", "warn") : null,
        ]),
        el("p", { class: "muted small", text: "Alle im Abend lesen mit. Ohne Netz wandern Nachrichten in den Ausgangskorb und kommen später an." }),
        el("div", { class: "chat-log", id: "chatLog" }, lines.length
          ? lines.map(chatLine)
          : [el("p", { class: "muted small", text: "Noch nichts geschrieben." })]),
      ]),
    ]);
    const inp = el("input", { type: "text", placeholder: "Nachricht schreiben …", maxlength: 200, id: "chatInput" });
    const send = () => {
      const t = inp.value.trim();
      if (!t) return;
      SS.sendChat(t);
      inp.value = "";
      SS.renderCurrent();
      const log = $("#chatLog");
      if (log) log.scrollTop = log.scrollHeight;
    };
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
    body.querySelector(".chat-panel").appendChild(el("div", { class: "row-actions" }, [
      inp, btn("Senden", { kind: "primary", onClick: send }),
    ]));
    body.appendChild(el("div", { class: "row-actions" }, [
      btn("Zurück", { onClick: () => go(SS.state.phase === "lobby" ? "lobby" : "tasks") }),
      btn("Chat leeren", { cls: "tiny", onClick: () => {
        if (!confirm("Chatverlauf auf diesem Gerät löschen?")) return;
        SS.store.clearChat(); SS.renderCurrent();
      } }),
    ]));
    return el("div", { class: "view" }, [topbar(), body, footer()]);
  }

  function chatLine(l) {
    const mePid = SS.state.mode === "online" ? SS.state.me : (SS.state.players[0] && SS.state.players[0].id);
    const own = l.pid === mePid || l.own;
    const p = l.pid ? SS.player(l.pid) : null;
    return el("div", { class: "chat-line" + (own ? " own" : "") }, [
      p ? avatar(p, "tiny") : null,
      el("span", { class: "chat-who", text: l.from || "Gast" }),
      el("span", { class: "chat-text", text: l.text }),
      el("span", { class: "chat-at", text: new Date(l.at || Date.now()).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) }),
    ]);
  }

  function chatTeaser() {
    const lines = SS.store ? SS.store.chat().slice(-3) : [];
    return el("section", { class: "panel" }, [
      el("div", { class: "panel-head" }, [el("h2", { text: "Spielchat" }), pill("alle lesen mit", "ghost")]),
      lines.length ? el("div", { class: "chat-log small" }, lines.map(chatLine))
        : el("p", { class: "muted small", text: "Noch nichts geschrieben." }),
      el("div", { class: "row-actions" }, [btn("Chat öffnen", { onClick: () => go("chat") })]),
    ]);
  }

  /* ── Wertung ──────────────────────────────────────────────────────────── */
  function viewReview() {
    const s = SS.state;
    const mePid = s.mode === "online" ? s.me : (s.players[0] && s.players[0].id);
    const list = SS.reviewable(mePid);
    const body = el("div", { class: "wrap" }, [
      el("section", { class: "task-head" }, [
        el("h1", { text: "Gesamtwertung" }),
        el("p", { class: "muted", text: "Bewertet die Nachweise der anderen. Kippt die Mehrheit auf «gilt nicht», wird die Aufgabe ungültig und die Punkte sind weg." }),
      ]),
    ]);

    if (!s.settings.review) {
      body.appendChild(el("section", { class: "panel" }, [el("p", { class: "muted", text: "Die Wertung ist für diesen Abend abgeschaltet." })]));
    } else if (!list.length) {
      body.appendChild(el("section", { class: "panel" }, [
        el("p", { class: "muted", text: "Es gibt noch nichts zu bewerten. Sobald Nachweise freigegeben sind, stehen sie hier." }),
      ]));
    } else {
      const need = Math.max(2, Math.ceil(SS.alive().length / 3));
      body.appendChild(el("p", { class: "muted small", text: "Für ungültig braucht es " + need + " Gegenstimme(n). Der Wirt kann das übersteuern." }));
      body.appendChild(el("div", { class: "task-list" }, list.map((x) => reviewCard(x, mePid, need))));
    }

    const host = SS.isHost();
    body.appendChild(el("div", { class: "row-actions" }, [
      host && s.phase !== "review" ? btn("Wertung starten", { kind: "primary", onClick: () => { SS.startReview(); go("review"); } }) : null,
      host && s.phase === "review" ? btn("Wertung beenden", { kind: "primary", onClick: () => {
        s.phase = "over";
        SS.logLine("Der Wirt hat die Wertung beendet.", "ok");
        if (s.mode === "online") SS.net.broadcast({ t: "closed" });
        SS.sync();
        SS.toast("Wertung beendet.", "ok");
        go("album");
      } }) : null,
      btn("Album ansehen", { onClick: () => go("album") }),
      btn("Zurück", { onClick: () => go(s.phase === "lobby" ? "lobby" : "tasks") }),
    ]));
    return el("div", { class: "view" }, [topbar(), body, footer()]);
  }

  function reviewCard(x, mePid, need) {
    const t = x.task;
    const photo = SS.photoFor(t.aid);
    const r = SS.reviewOf(t.aid);
    const mineOk = r.ok.indexOf(mePid) !== -1;
    const mineBad = r.bad.indexOf(mePid) !== -1;
    const isOwn = x.pid === mePid;
    const owner = SS.player(x.pid);

    const c = el("article", { class: "task review-card" + (t.voided ? " voided" : "") });
    c.appendChild(el("div", { class: "task-top" }, [
      owner ? avatar(owner, "tiny") : null,
      el("span", { class: "roster-name", text: owner ? owner.name : "Gast" }),
      typeBadge(t),
      el("span", { class: "task-points", text: "+" + t.points }),
      t.voided ? pill("ungültig", "bad") : null,
      (r.bad.length) ? pill(r.bad.length + " dagegen", "warn") : null,
      (r.ok.length) ? pill(r.ok.length + " dafür", "ok") : null,
    ]));
    c.appendChild(el("p", { class: "task-text", text: t.text }));
    if (photo) c.appendChild(el("div", { class: "proof" }, [SS.proof.img(photo.data)]));

    if (isOwn) {
      c.appendChild(el("p", { class: "muted small", text: "Deine eigene Aufgabe — du bewertest sie nicht mit." }));
    } else {
      c.appendChild(el("div", { class: "task-acts" }, [
        btn(mineOk ? "✓ gilt" : "gilt", { kind: mineOk ? "primary" : "outline", onClick: () => { SS.actAs(mePid, "rate", { aid: t.aid, verdict: "ok" }); } }),
        btn(mineBad ? "✗ gilt nicht" : "gilt nicht", { kind: mineBad ? "danger" : "outline", onClick: () => { SS.actAs(mePid, "rate", { aid: t.aid, verdict: "bad" }); } }),
      ]));
    }

    // Der Wirt kann jede Aufgabe retten oder für ungültig erklären.
    if (SS.isHost()) {
      c.appendChild(el("div", { class: "task-acts host-acts" }, [
        t.voided
          ? btn("Wieder gültig", { kind: "primary", cls: "tiny", onClick: () => SS.applyAction(SS.state.me || "host", "rescue", { pid: x.pid, aid: t.aid }) })
          : btn("Für ungültig erklären", { kind: "danger", cls: "tiny", onClick: () => SS.applyAction(SS.state.me || "host", "void", { pid: x.pid, aid: t.aid }) }),
        btn("Stimmen zurücksetzen", { cls: "tiny", onClick: () => SS.applyAction(SS.state.me || "host", "clear-flags", { pid: x.pid, aid: t.aid }) }),
      ]));
    }
    return c;
  }

  /* ── Album ────────────────────────────────────────────────────────────── */
  /** Ein Bild groß anzeigen — Tippen aufs Album-Bild. */
  function openLightbox(photo, all, index) {
    let i = index;
    const wrap = el("div", { class: "lightbox" });
    const img = el("img", { class: "lightbox-img", src: all[i].data, alt: "Nachweis" });
    const cap = el("div", { class: "lightbox-cap" });
    function draw() {
      const p = all[i];
      img.src = p.data;
      cap.innerHTML = "";
      const who = SS.player(p.pid);
      cap.appendChild(el("div", { class: "lightbox-who" }, [
        avatar(who || { name: p.who || "Gast" }, "tiny"),
        el("strong", { text: (who && who.name) || p.who || "Gast" }),
        el("span", { class: "muted small", text: p.at ? new Date(p.at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) + " Uhr" : "" }),
      ]));
      if (p.text) cap.appendChild(el("p", { class: "lightbox-text", text: p.text }));
    }
    draw();
    const close = btn("Zumachen", { kind: "ghost", onClick: () => wrap.remove() });
    const nav = el("div", { class: "lightbox-nav" }, [
      btn("‹", { kind: "ghost", disabled: all.length < 2, onClick: () => { i = (i - 1 + all.length) % all.length; draw(); } }),
      el("span", { class: "muted small", text: "Bild " + (i + 1) + " von " + all.length }),
      btn("›", { kind: "ghost", disabled: all.length < 2, onClick: () => { i = (i + 1) % all.length; draw(); } }),
      close,
    ]);
    wrap.appendChild(img);
    wrap.appendChild(cap);
    wrap.appendChild(nav);
    wrap.addEventListener("click", (e) => { if (e.target === wrap) wrap.remove(); });
    document.body.appendChild(wrap);
  }

  function viewAlbum() {
    const photos = SS.allProofs().filter((p) => p.data);
    const missing = SS.allProofs().filter((p) => !p.data);
    const total = SS.alive().length;
    const withPhoto = new Set(photos.map((p) => p.pid)).size;
    const body = el("div", { class: "wrap" }, [
      el("section", { class: "album-head" }, [
        el("h1", { text: "Album des Abends" }),
        el("p", { class: "muted", text: photos.length + " Bilder · von " + withPhoto + " von " + total + " Leut" }),
      ]),
    ]);
    if (!photos.length) {
      body.appendChild(el("section", { class: "panel" }, [el("p", { class: "muted", text: "Noch kein Bild im Album. Aufgaben brauchen einen Nachweis — dann füllt sich das hier von selbst." })]));
    } else {
      const byPid = {};
      photos.forEach((p) => { (byPid[p.pid] = byPid[p.pid] || []).push(p); });
      Object.keys(byPid).forEach((pid) => {
        const mine = byPid[pid];
        body.appendChild(el("section", { class: "panel" }, [
          el("div", { class: "panel-head" }, [
            avatar(SS.player(pid) || { name: mine[0].who || "Gast" }),
            el("h2", { text: SS.nameOf(pid) }),
            pill(mine.length + (mine.length === 1 ? " Bild" : " Bilder"), "ghost"),
          ]),
          el("div", { class: "album-grid" }, mine.map((p, i) => {
            const t = SS.findTaskAnywhere(p.aid);
            const rev = SS.reviewOf(p.aid);
            const bad = (rev.bad || []).length;
            return el("figure", {
              class: "album-item" + (bad ? " flagged" : ""),
              onclick: () => openLightbox(p, mine, i),
              role: "button",
              tabindex: "0",
            }, [
              SS.proof.img(p.data),
              el("figcaption", {}, [
                el("span", { class: "album-time", text: p.at ? new Date(p.at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr" : "" }),
                t && t.task.voided ? pill("ungültig", "bad") : t && t.task.confirmed ? pill("abgehakt", "gold") : bad ? pill(bad + " dagegen", "warn") : null,
                p.text ? el("span", { class: "album-text", text: p.text }) : null,
              ]),
            ]);
          })),
        ]));
      });
      if (missing.length) {
        body.appendChild(el("section", { class: "panel" }, [
          el("p", { class: "muted small", text: missing.length + " Nachweis(e) sind ohne Bild — die kommen, sobald das Gerät wieder Netz hat." }),
        ]));
      }
    }
    body.appendChild(el("div", { class: "row-actions" }, [
      btn("Bericht anzeigen", { kind: "primary", onClick: openReport }),
      btn("Zurück", { onClick: () => go(SS.state.phase === "lobby" ? "lobby" : "tasks") }),
    ]));
    return el("div", { class: "view" }, [topbar(), body, footer()]);
  }

  /* ── Bericht ──────────────────────────────────────────────────────────── */
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
        el("thead", {}, [el("tr", {}, [el("th", { text: "#" }), el("th", { text: "Name" }), el("th", { text: "Punkte" }), el("th", { text: "Aufgaben" }), el("th", { text: "ungültig" })])]),
        el("tbody", {}, r.map((x, i) => el("tr", {}, [
          el("td", { text: String(i + 1) }), el("td", { text: x.name }),
          el("td", { text: String(x.points) }), el("td", { text: x.done + " / " + x.total }),
          el("td", { text: String(x.voided) }),
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

  /* ── Wirt-Bereich (ohne Passwort — nur der Wirt sieht den Knopf) ───────── */
  function openWirtPanel() {
    const body = el("div", { class: "wirt" }, [
      el("div", { class: "wirt-tabs" }, [
        tab("Übersicht", () => wirtOverview()),
        tab("Teilnehmer", () => wirtPlayers()),
        tab("Sidequests", () => wirtSidequests()),
        tab("Wertung", () => wirtReview()),
        tab("Bericht", () => wirtReport()),
      ]),
    ]);
    const box = SS.modal("Wirt-Bereich", body, [{ label: "Zumachen", kind: "primary" }]);
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
      btn("Wertung starten", { kind: "primary", onClick: () => { SS.startReview(); SS.closeModal(); go("review"); } }),
      btn("Abend abschließen", { onClick: () => {
        s.phase = "over";
        SS.logLine("Der Wirt hat den Abend abgeschlossen.", "ok");
        if (s.mode === "online") SS.net.broadcast({ t: "closed" });
        SS.sync();
        SS.toast("Abend abgeschlossen.", "ok");
      } }),
    ]));
    return box;
  }

  function wirtPlayers() {
    const box = el("div", {});
    box.appendChild(el("div", { class: "roster" }, SS.state.players.map((p) => el("div", { class: "roster-row" }, [
      avatar(p), el("span", { class: "roster-name", text: p.name }),
      p.isHost ? pill("Wirt", "gold") : null,
      p.connected === false ? pill("weg", "ghost") : null,
      el("span", { class: "spacer" }),
      p.connected === false ? btn("Wieder aufnehmen", { cls: "tiny", onClick: () => { p.connected = true; SS.sync(); openWirtPanel(); } }) : null,
      !p.isHost ? btn("Entfernen", { kind: "danger", cls: "tiny", onClick: () => { SS.removePlayer(p.id); SS.sync(); openWirtPanel(); } }) : null,
    ]))));
    const nameIn = el("input", { type: "text", placeholder: "Namen nachtragen …", maxlength: 22 });
    box.appendChild(el("div", { class: "row-actions" }, [
      nameIn,
      btn("Dazuschreiben", { onClick: () => {
        const n = nameIn.value.trim();
        if (!n) return;
        SS.addPlayer(n, {});
        SS.logLine(n + " wurde nachgetragen.");
        SS.sync(); openWirtPanel();
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
      box.appendChild(el("div", { class: "wirt-row" }, [
        el("span", { class: "task-text", text: p.text }),
        el("span", { class: "muted small", text: "von " + SS.nameOf(p.by) + " · " + p.status }),
        p.status === "offen" ? btn("Freigeben", { kind: "primary", cls: "tiny", onClick: () => { SS.approveProposal(p.id); SS.sync(); openWirtPanel(); } }) : null,
        p.status === "offen" ? btn("Ablehnen", { kind: "danger", cls: "tiny", onClick: () => { SS.rejectProposal(p.id); SS.sync(); openWirtPanel(); } }) : null,
      ]));
    });
    box.appendChild(el("h3", { text: "Freigegeben" }));
    if (!s.sidequests.length) box.appendChild(el("p", { class: "muted", text: "Noch keine freigegeben." }));
    s.sidequests.forEach((q) => box.appendChild(el("div", { class: "wirt-row" }, [
      el("span", { class: "task-text", text: q.text }),
      el("span", { class: "muted small", text: "gezogen: " + (q.drawn ? SS.nameOf(q.drawn) : "—") + " · geschafft: " + Object.keys(q.done || {}).length }),
    ])));
    return box;
  }

  function wirtReview() {
    const box = el("div", {});
    box.appendChild(el("p", { class: "muted small", text: "Beanstandete Aufgaben. Du kannst jede retten oder für ungültig erklären — und die Wertung ganz unterbinden." }));
    const flagged = [];
    Object.keys(SS.state.assignments).forEach((pid) => {
      SS.tasksOf(pid).forEach((t) => { if ((t.flagged || 0) > 0 || t.voided) flagged.push({ pid: pid, task: t }); });
    });
    if (!flagged.length) box.appendChild(el("p", { class: "muted", text: "Nichts beanstandet." }));
    flagged.forEach((x) => box.appendChild(el("div", { class: "wirt-row" }, [
      el("span", { class: "roster-name", text: SS.nameOf(x.pid) }),
      el("span", { class: "task-text", text: x.task.text }),
      pill((x.task.flagged || 0) + " dagegen", "warn"),
      x.task.voided ? pill("ungültig", "bad") : null,
      x.task.voided
        ? btn("Wieder gültig", { kind: "primary", cls: "tiny", onClick: () => { SS.setVoid(x.pid, x.task.aid, false); SS.sync(); openWirtPanel(); } })
        : btn("Ungültig", { kind: "danger", cls: "tiny", onClick: () => { SS.setVoid(x.pid, x.task.aid, true); SS.sync(); openWirtPanel(); } }),
      btn("Zurücksetzen", { cls: "tiny", onClick: () => { SS.clearFlags(x.pid, x.task.aid); SS.sync(); openWirtPanel(); } }),
    ])));
    box.appendChild(el("div", { class: "row-actions" }, [
      btn("Alle Stimmen zurücksetzen", { onClick: () => {
        if (!confirm("Alle Beanstandungen zurücksetzen? Keine Aufgabe ist danach ungültig.")) return;
        Object.keys(SS.state.assignments).forEach((pid) => SS.tasksOf(pid).forEach((t) => {
          t.flagBy = []; t.flagged = 0; t.voided = false;
          SS.state.reviews[t.aid] = { ok: [], bad: [] };
        }));
        SS.sync(); SS.toast("Alles zurückgesetzt.", "ok"); openWirtPanel();
      } }),
    ]));
    return box;
  }

  function wirtReport() {
    const box = el("div", {});
    const ta = el("textarea", { class: "report-text", readonly: true, value: SS.buildReport() });
    box.appendChild(ta);
    box.appendChild(el("div", { class: "row-actions" }, [
      btn("Kopieren", { kind: "primary", onClick: () => copyText(ta.value) }),
      btn("Alles löschen (neuer Abend)", { kind: "danger", onClick: () => {
        if (!confirm("Wirklich alles löschen? Namen, Aufgaben, Album, Chat und Chronik sind dann weg.")) return;
        SS.store.wipe();
        SS.state.players = []; SS.state.assignments = {}; SS.state.sidequests = []; SS.state.proposals = [];
        SS.state.reviews = {}; SS.state.phase = "lobby"; SS.state.code = null; SS.state.me = null;
        SS.logLine("Alles gelöscht — neuer Abend.");
        SS.closeModal();
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
  const VIEWS = {
    home: viewHome, lobby: viewLobby, tasks: viewTasks, sidequests: viewSidequests,
    chat: viewChat, review: viewReview, album: viewAlbum,
  };
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
    bar.textContent = n + " Sache(n) warten auf Netz — wird automatisch nachgereicht.";
  }

  /** Ein Beitrittslink mit #join=CODE öffnet direkt den Beitritt. */
  function checkJoinLink() {
    const m = location.hash.match(/#join=([A-Za-z0-9]{4})/);
    if (!m) return false;
    const code = m[1].toUpperCase();
    history.replaceState(null, "", location.pathname + location.search);
    if (SS.state.role === "guest" && SS.state.code === code) return false;
    setTimeout(() => openJoin(code), 300);
    return true;
  }

  function initUI() {
    SS.setRenderCurrent(render);
    SS.on("net", render);
    SS.on("joined", render);
    SS.on("chat", () => { if (SS.state.route === "chat") render(); });
    SS.on("outbox", updateOutbox);
    SS.on("tamper", (key) => {
      SS.logLine("Ein gespeicherter Stand war nicht mehr gültig und wurde verworfen (" + key + ").", "err");
    });
    document.addEventListener("click", (e) => {
      const t = e.target.closest && e.target.closest("#brandBtn");
      if (t) go("home");
    });
    window.addEventListener("hashchange", checkJoinLink);
    render();
  }

  SS.ui = { go, render, initUI, openCreate, openJoin, openReport, openWirtPanel, copyText, checkJoinLink };
})();
