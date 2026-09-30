/* ==========================================================================
   Seidla — Oberfläche
   Startseite, Katalog, Runden-Lobby, Spielansicht, Wirtshaus-Chronik.
   ========================================================================== */
(function () {
  "use strict";
  const SS = window.SS;
  const { el, frag } = SS;

  const TAGS = {
    schnell: "Schnell", laut: "Laut", ruhig: "Ruhig", gross: "Große Runde",
    party: "Party", action: "Action", wissen: "Wissen", wort: "Wort",
    team: "Team", klassisch: "Klassisch", wettkampf: "Wettkampf", einstieg: "Einstieg",
  };
  const PENALTIES = [
    { key: "flüssig", label: "Flüssig", hint: "Ein Schluck Bier, Radler oder Spezi." },
    { key: "frech", label: "Frech", hint: "Eine Aufgabe aus der Runde erfüllen." },
    { key: "wasser", label: "Wasser", hint: "Ein Glas Wasser — für die Vernunft." },
  ];

  const penalty = () => (SS.store ? SS.store.loadProfile().penalty : "flüssig");
  const penaltyWord = () => ({ flüssig: "trinkt einen Schluck", frech: "erfüllt eine Aufgabe", wasser: "trinkt ein Glas Wasser" }[penalty()] || "trinkt einen Schluck");

  /* ══ Routenwechsel ══════════════════════════════════════════════════════ */
  function go(route) {
    SS.state.route = route;
    render();
    window.scrollTo({ top: 0, behavior: SS.LS.get("reducedMotion", false) ? "auto" : "smooth" });
  }

  /* ══ Fokus bewahren ═════════════════════════════════════════════════════ */
  function captureFocus() {
    const a = document.activeElement;
    if (!a || !a.dataset || !a.dataset.persist) return null;
    return { key: a.dataset.persist, start: a.selectionStart, end: a.selectionEnd };
  }
  function restoreFocus(snap) {
    if (!snap) return;
    const node = document.querySelector('[data-persist="' + snap.key + '"]');
    if (!node) return;
    node.focus();
    if (typeof node.setSelectionRange === "function" && snap.start !== null && snap.start !== undefined) {
      try { node.setSelectionRange(snap.start, snap.end); } catch (e) {}
    }
  }

  /* ══ Zeichnen ═══════════════════════════════════════════════════════════ */
  function render() {
    const snap = captureFocus();
    const view = SS.$("#view");
    view.innerHTML = "";
    let node;
    switch (SS.state.route) {
      case "catalog": node = viewCatalog(); break;
      case "lobby": node = viewLobby(); break;
      case "game": node = viewGame(); break;
      case "chronik": node = viewChronicle(); break;
      default: node = viewHome();
    }
    view.appendChild(node);
    renderMechanik();
    updateStatusbar();
    restoreFocus(snap);
  }

  function renderCurrentGame() {
    if (SS.state.route !== "game") { render(); return; }
    const snap = captureFocus();
    const stage = SS.$("#stageHost");
    if (stage) { stage.innerHTML = ""; stage.appendChild(buildStage()); }
    renderMechanik();
    updateStatusbar();
    restoreFocus(snap);
  }

  /* ══ Punkte-Leiste ══════════════════════════════════════════════════════ */
  function renderMechanik() {
    const bar = SS.$("#mechanik");
    const active = SS.state.phase === "playing" && SS.state.gameId;
    if (!active) { bar.hidden = true; bar.innerHTML = ""; return; }
    bar.hidden = false; bar.innerHTML = "";

    const inner = el("div", { class: "mechanik-inner" });
    inner.appendChild(el("h4", { text: "Punkte" }));
    const houses = el("div", { class: "mk-houses" });
    SS.state.players.slice().sort((a, b) => (SS.state.scores[b.id] || 0) - (SS.state.scores[a.id] || 0)).forEach((p) => {
      houses.appendChild(el("span", { class: "mk-house", style: { opacity: p.connected === false ? ".45" : "1" } }, [
        el("span", { class: "avatar", style: { background: p.color }, text: SS.initial(p.name) }),
        el("span", { text: p.name }),
        el("span", { class: "pts", text: String(SS.state.scores[p.id] || 0) }),
      ]));
    });
    inner.appendChild(houses);
    inner.appendChild(el("div", { class: "mk-spacer" }));
    inner.appendChild(el("div", { class: "mk-round" }, [
      "Runde ", el("strong", { text: String(SS.state.round) }),
      SS.state.mode === "online" ? el("span", { text: "  ·  Runde " + SS.state.code }) : el("span", { text: "  ·  am Gerät" }),
    ]));
    inner.appendChild(el("button", { class: "btn btn-sm btn-gold", text: "Punktestand", onclick: showScoreboard }));
    bar.appendChild(inner);
  }

  function showScoreboard() {
    const order = SS.state.players.slice().sort((a, b) => (SS.state.scores[b.id] || 0) - (SS.state.scores[a.id] || 0));
    const table = el("table", { class: "scoreboard" }, [
      el("thead", {}, el("tr", {}, [el("th", { text: "#" }), el("th", { text: "Name" }), el("th", { text: "Punkte" })])),
      el("tbody", {}, order.map((p, i) => el("tr", { class: i === 0 && (SS.state.scores[p.id] || 0) > 0 ? "lead-row" : "" }, [
        el("td", {}, el("span", { class: "rank", text: (i + 1) + "." })),
        el("td", {}, [el("span", { class: "avatar", style: { background: p.color }, text: SS.initial(p.name) }), p.name,
          p.connected === false ? el("span", { class: "muted", text: "  (weg)" }) : null]),
        el("td", { class: "num", text: String(SS.state.scores[p.id] || 0) }),
      ]))),
    ]);
    SS.modal("Punktestand", frag([table, el("p", { class: "muted", style: { marginTop: "12px" }, text: "Punkte laufen über alle Runden weiter." })]), [{ label: "Weiter", kind: "primary" }]);
  }

  /* ══ Statuszeile ════════════════════════════════════════════════════════ */
  function updateStatusbar() {
    const t = SS.$("#statusText"), r = SS.$("#statusRight");
    if (!t) return;
    const mode = SS.state.mode === "online" ? "Runde " + (SS.state.code || "—") : "Am selben Gerät";
    const role = SS.state.role === "host" ? "Wirt" : SS.state.role === "guest" ? "Gast" : "Lokal";
    t.textContent =
      SS.state.phase === "playing" ? "Läuft · " + mode
      : SS.state.phase === "over" ? "Fertig · " + mode
      : "Bereit · " + mode;
    const net = SS.state.connection === "online" ? "verbunden" : SS.state.connection === "connecting" ? "verbindet" : "offline";
    const pend = SS.state.pending || (SS.store && SS.store.outboxCount() > 0);
    r.textContent = role + " · " + SS.connectedCount() + " Leut · " + net + (pend ? " · Ausgangskorb" : "");
  }

  /* ══ Startseite ═════════════════════════════════════════════════════════ */
  function viewHome() {
    const prof = SS.store ? SS.store.loadProfile() : { name: "", penalty: "flüssig" };
    const wrap = el("div");

    wrap.appendChild(el("section", { class: "hero" }, [
      el("div", { class: "hero-main" }, [
        el("div", { class: "eyebrow", text: "Für den Samstagabend, den Stammtisch und die ganze Wirtshausrunde" }),
        el("h1", { text: "A Seidla geht immer." }),
        el("p", { class: "lead", text: "Die fränkische Wirtshausrunde für 2 bis 100 Leut. Ein Gerät macht die Runde auf und zeigt einen Code, alle anderen tippen ihn ein — iPhone, iPad, Android, Laptop, alles durcheinander. Keine Anmeldung, keine Werbung, kein Download." }),
        el("div", { class: "btn-row", style: { marginTop: "18px" } }, [
          el("button", { class: "btn btn-gold btn-lg", text: "Runde aufmachen", onclick: openCreateDialog }),
          el("button", { class: "btn btn-outline btn-lg", text: "Mit Code nei", onclick: () => openJoinDialog() }),
          el("button", { class: "btn btn-ghost btn-lg", text: "Am selben Gerät", onclick: () => startLocalFlow() }),
        ]),
      ]),
      el("div", { class: "hero-side" }, [
        stat("1", "Runde aufmachen", "Der Wirt öffnet die Runde. Der Code steht groß auf dem Schirm."),
        stat("2", "Alle tippen den Code ein", "Name wählen, fertig. Bis zu 100 Geräte in einer Runde."),
        stat(SS.GAMES.length + "", "Spiele bereit", "Von «Ich hab noch nie» bis Turnierbaum und Franken-Quiz."),
      ]),
    ]));

    // Offline-Banner, wenn was im Ausgangskorb liegt
    const ob = SS.store ? SS.store.outboxCount() : 0;
    if (ob > 0 || (SS.state.pending && SS.state.role === "guest")) {
      wrap.appendChild(el("div", { class: "sync-strip" }, [
        el("span", { class: "count", text: String(ob) }),
        el("span", {}, [el("strong", { text: "Einträge im Ausgangskorb. " }), "Die gehen raus, sobald wieder Netz da is."]),
        el("button", { class: "btn btn-sm btn-outline", text: "Jetzt versuchen", onclick: () => { SS.net.flushOutbox(); render(); } }),
      ]));
    }

    // Fortsetzen
    if (SS.state.lastSession) {
      const s = SS.state.lastSession;
      const meta = SS.getMeta(s.gameId);
      wrap.appendChild(el("div", { class: "card", style: { marginBottom: "18px" } }, [
        el("div", { class: "eyebrow", text: "Da war doch was" }),
        el("h3", { text: "Letzte Runde fortsetzen" }),
        el("p", { class: "muted", text: (meta ? meta.name : s.gameId) + " · Runde " + s.round + " · " + (s.players || []).length + " Leut · " + fmtWhen(s.at) }),
        el("div", { class: "btn-row" }, [
          el("button", { class: "btn btn-gold", text: "Fortsetzen", onclick: () => resumeSession(s) }),
          el("button", { class: "btn btn-outline", text: "Verwerfen", onclick: () => { SS.store.clearSession(); SS.state.lastSession = null; render(); } }),
        ]),
      ]));
    }

    // Person & Strafen-Modus
    const nameCard = el("div", { class: "card" }, [
      el("h3", { text: "Erst kurz der Name" }),
      el("p", { class: "muted", text: "Der Name steht bei den anderen in der Runde." }),
      el("label", { class: "field", style: { maxWidth: "380px" } }, [
        el("span", { text: "Dein Name" }),
        el("input", { type: "text", placeholder: "z. B. Sepp, Resi, Kalle …", value: prof.name, maxlength: "22",
          dataset: { persist: "homeName" }, oninput: (e) => { SS.store.saveProfile({ name: e.target.value }); SS.LS.set("name", e.target.value); } }),
      ]),
      el("div", { class: "eyebrow", style: { marginTop: "6px" }, text: "Was passiert bei einer Strafe?" }),
      el("div", { class: "btn-row" }, PENALTIES.map((p) =>
        el("button", { class: "btn btn-sm " + (prof.penalty === p.key ? "btn-gold" : "btn-outline"), text: p.label,
          onclick: () => { SS.store.saveProfile({ penalty: p.key }); render(); } })
      )),
      el("p", { class: "muted", style: { marginTop: "8px" }, text: (PENALTIES.find((p) => p.key === prof.penalty) || PENALTIES[0]).hint }),
    ]);
    wrap.appendChild(nameCard);

    // Katalog
    wrap.appendChild(el("div", { style: { marginTop: "26px" } }, [
      el("div", { class: "eyebrow", text: "Spiele" }),
      el("h2", { text: "Was spiel ma heut?" }),
      el("p", { class: "lead", text: "Klassiker zum Einstieg, Action für zwischendurch und ein paar Sachen für die ganze Runde. Läuft alles im Browser." }),
      el("div", { class: "grid", style: { marginTop: "16px" } }, SS.GAMES.slice(0, 6).map(gameCard)),
      el("div", { class: "btn-row", style: { marginTop: "18px" } }, [
        el("button", { class: "btn btn-outline", text: "Alle " + SS.GAMES.length + " Spiele", onclick: () => go("catalog") }),
        el("button", { class: "btn btn-ghost", text: "Wirtshaus-Chronik", onclick: () => go("chronik") }),
      ]),
    ]));

    wrap.appendChild(el("div", { class: "footnote" }, [
      el("strong", { text: "Wegen dem Netz. " }),
      "Eine Runde verbindet die Geräte direkt über WebRTC; dafür braucht's einmalig einen Vermittlungsdienst im Internet. Fällt das Netz aus, spielt's trotzdem weiter — was passiert is, wandert in den Ausgangskorb und wird später nachgereicht. Reines Bluetooth zwischen iPhone und Android geht im Browser leider ned, dazu bräucht's a App.",
    ]));

    return wrap;
  }

  function stat(big, title, text) {
    return el("div", { class: "stat-card" }, [
      el("div", { class: "big", text: big }),
      el("div", {}, [el("h3", { text: title }), el("p", { text: text })]),
    ]);
  }

  function fmtWhen(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) + ", " + d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  }

  function resumeSession(s) {
    SS.state.gameId = s.gameId;
    SS.state.settings = s.settings || {};
    SS.state.round = s.round || 1;
    SS.state.players = s.players || SS.state.players;
    SS.state.scores = s.scores || {};
    SS.state.pub = s.pub || {};
    SS.state.phase = "playing";
    SS.state.lastSession = null;
    SS.state.mode = "local";
    SS.state.role = "solo";
    SS.net.setStatus("offline");
    go("game");
  }

  /* ══ Katalog ════════════════════════════════════════════════════════════ */
  let catalogFilter = { tag: "alle", q: "" };

  function viewCatalog() {
    const tags = ["alle", "einstieg", "party", "action", "wissen", "wort", "team", "wettkampf", "ruhig"];
    const chips = tags.map((t) => el("button", {
      class: "chip", "aria-pressed": catalogFilter.tag === t ? "true" : "false",
      text: t === "alle" ? "Alle" : TAGS[t] || t,
      onclick: () => { catalogFilter.tag = t; render(); },
    }));
    const search = el("input", { class: "search", type: "search", placeholder: "Suchen …", value: catalogFilter.q,
      dataset: { persist: "search" }, oninput: (e) => { catalogFilter.q = e.target.value.toLowerCase(); softFilter(); } });
    const listHost = el("div", { class: "grid", id: "catalogGrid" });
    fillCatalog(listHost);
    return el("div", {}, [
      el("div", { class: "eyebrow", text: "Katalog" }),
      el("h1", { text: "Alle Spiele" }),
      el("p", { class: "lead", text: "Wähle ein Spiel. Danach legst du fest, ob's online in der Runde oder am selben Gerät läuft." }),
      el("div", { class: "filters" }, [chips, search]),
      listHost,
    ]);
  }

  function fillCatalog(host) {
    host.innerHTML = "";
    const q = catalogFilter.q, tag = catalogFilter.tag;
    const list = SS.GAMES.filter((g) => {
      if (tag !== "alle" && !(g.tags || []).includes(tag)) return false;
      if (q && !((g.name + " " + g.tagline + " " + (g.tags || []).map((t) => TAGS[t] || t).join(" ")).toLowerCase().includes(q))) return false;
      return true;
    });
    if (!list.length) { host.appendChild(el("div", { class: "card center muted", text: "Nix passt zu der Auswahl." })); return; }
    list.forEach((g) => host.appendChild(gameCard(g)));
  }
  function softFilter() { const grid = SS.$("#catalogGrid"); if (grid) fillCatalog(grid); }

  function gameCard(g) {
    return el("button", { class: "game-card", onclick: () => openGame(g.id) }, [
      el("div", { class: "thumb", style: { "--accent": g.accent || "#3a5f86" } }, [
        el("span", { class: "glyph", text: g.glyph || "★" }),
        el("span", { class: "n", text: (g.minP || 2) + "–" + (g.maxP || 100) + " Leut" }),
      ]),
      el("div", { class: "body" }, [
        el("h3", { text: g.name }),
        el("p", { text: g.tagline }),
        el("div", { class: "tags" }, (g.tags || []).map((t) => el("span", { class: "tag", text: TAGS[t] || t }))),
        el("div", { class: "meta" }, [el("span", { text: g.duration || "" }), el("span", { text: "Regeln →" })]),
      ]),
    ]);
  }

  /* ══ Runden-Lobby ═══════════════════════════════════════════════════════ */
  function viewLobby() {
    const isHost = SS.isHost();
    const guestView = SS.state.mode === "online" && !isHost;
    const wrap = el("div");

    wrap.appendChild(el("div", { class: "eyebrow", text: isHost ? "Runde offen" : guestView ? "Du bist dabei" : "Am selben Gerät" }));
    wrap.appendChild(el("h1", { text: SS.state.mode === "online" ? (isHost ? "Wer kommt alles mit?" : "Du bist dabei") : "Wer spielt mit?" }));

    const pend = SS.store ? SS.store.outboxCount() : 0;
    if (pend > 0 || SS.state.connection === "lost") {
      wrap.appendChild(el("div", { class: "sync-strip" }, [
        el("span", { class: "count", text: String(pend) }),
        el("span", {}, [el("strong", { text: SS.state.connection === "lost" ? "Kein Kontakt zur Runde. " : "Ausgangskorb: " }),
          SS.state.connection === "lost" ? "Es geht am Gerät weiter — nachgereicht wird, sobald's wieder geht." : "Wird nachgereicht, sobald Netz da is."]),
        el("button", { class: "btn btn-sm btn-outline", text: "Jetzt versuchen", onclick: () => { SS.net.flushOutbox(); render(); } }),
      ]));
    }

    const grid = el("div", { class: "lobby-grid" });
    const codeChip = el("div", { class: "code-chip" }, [
      el("div", {}, [el("div", { class: "eyebrow", style: { marginBottom: "2px" }, text: "Rundencode" }), el("div", { class: "val", text: SS.state.code || "----" })]),
      el("button", { class: "btn btn-sm btn-gold", text: "Code kopieren", onclick: () => copy(SS.state.code, "Code kopiert") }),
    ]);
    const link = location.origin + location.pathname + "?code=" + (SS.state.code || "");
    const joinBox = el("div", {}, [
      el("p", { class: "muted", style: { marginTop: "12px" }, text: "Diesen Link kannst in die Gruppe schicken — er füllt den Code auf den anderen Geräten von allein aus." }),
      el("div", { class: "join-link", text: link }),
      el("div", { class: "btn-row", style: { marginTop: "10px" } }, [
        el("button", { class: "btn btn-sm btn-outline", text: "Link kopieren", onclick: () => copy(link, "Link kopiert") }),
      ]),
    ]);

    const left = SS.state.mode === "online"
      ? el("div", { class: "card" }, [
          el("h3", { text: "Wie kommt ma nei" }),
          codeChip, joinBox,
          el("hr", { class: "rule" }),
          el("ol", { class: "net-steps" }, [
            li("num", "1", "Der Code oben wird auf den anderen Geräten unter «Mit Code nei» eingetippt."),
            li("num", "2", "Kurz Internet zum Beitreten, danach reden die Geräte direkt miteinander."),
            li("num", "3", isHost ? "Du wählst unten das Spiel und startest." : "Der Wirt wählt das Spiel und startet."),
          ]),
        ])
      : el("div", { class: "card" }, [
          el("h3", { text: "Ein Gerät, alle dran" }),
          el("p", { class: "lead", text: "Ihr spielt nacheinander an diesem Schirm. Trag unten alle ein, die mitspielen." }),
          el("div", { class: "btn-row" }, [
            el("button", { class: "btn btn-gold", text: "Person dazu", onclick: addLocalPlayerDialog }),
            el("button", { class: "btn btn-outline", text: "In der Runde spielen", onclick: openCreateDialog }),
          ]),
          el("hr", { class: "rule" }),
          el("div", { class: "banner", text: "Tipp: Unter «Punktestand» siehst jederzeit, wer führt. Punkte laufen über alle Runden weiter." }),
        ]);

    const plist = el("ul", { class: "player-list" });
    SS.state.players.forEach((p) => {
      const badges = [];
      if (p.id === SS.state.hostId) badges.push(el("span", { class: "badge host", text: "Wirt" }));
      if (SS.state.mode === "online" && p.id === SS.state.me) badges.push(el("span", { class: "badge you", text: "Du" }));
      if (p.connected === false) badges.push(el("span", { class: "badge gone", text: "weg" }));
      plist.appendChild(el("li", {}, [
        el("span", { class: "avatar", style: { background: p.color }, text: SS.initial(p.name) }),
        el("span", { class: "nm", text: p.name }), badges,
      ]));
    });

    const right = el("div", { class: "card" }, [
      el("h3", { text: "In der Runde (" + SS.connectedCount() + ")" }),
      el("p", { class: "muted", text: SS.state.mode === "online" ? "Bis zu 100 Geräte. Neue Beitritte tauchen von allein auf." : "Am selben Gerät wird abwechselnd gespielt." }),
      plist,
      el("hr", { class: "rule" }),
      el("div", { class: "btn-row" }, [
        el("button", { class: "btn btn-sm btn-outline", text: "Namen dazu", onclick: addLocalPlayerDialog }),
        SS.state.mode === "online" && isHost ? el("button", { class: "btn btn-sm btn-outline", text: "Runde schließen", onclick: () => { SS.net.leave(); toHome(); } }) : null,
        guestView ? el("button", { class: "btn btn-sm btn-outline", text: "Runde verlassen", onclick: () => { SS.net.leave(); toHome(); } }) : null,
      ]),
    ]);

    grid.appendChild(left); grid.appendChild(right);
    wrap.appendChild(grid);

    // Spielwahl
    const picker = el("div", { class: "card", style: { marginTop: "18px" } });
    if (isHost) {
      picker.appendChild(el("h3", { text: "Spiel wählen" }));
      picker.appendChild(el("div", { class: "grid" }, SS.GAMES.map((g) =>
        el("button", { class: "game-card", style: SS.state.gameId === g.id ? { boxShadow: "0 0 0 3px var(--gold), var(--shadow)" } : null,
          onclick: () => { selectGame(g.id); render(); } }, [
          el("div", { class: "thumb", style: { "--accent": g.accent || "#3a5f86", height: "58px" } }, [
            el("span", { class: "glyph", text: g.glyph }), el("span", { class: "n", text: g.name }),
          ]),
        ])
      )));
      const meta = SS.getMeta(SS.state.gameId);
      if (meta) {
        picker.appendChild(el("hr", { class: "rule" }));
        picker.appendChild(el("h3", { text: "Einstellungen · " + meta.name }));
        picker.appendChild(el("p", { class: "muted", text: meta.tagline }));
        picker.appendChild(settingsForm(meta));
        picker.appendChild(el("div", { class: "banner", text: "Regeln: " + meta.rules }));
      }
    } else {
      const meta = SS.getMeta(SS.state.gameId);
      picker.appendChild(el("h3", { text: "Gewähltes Spiel" }));
      picker.appendChild(el("p", { class: "lead", text: meta ? meta.glyph + "  " + meta.name + " — " + meta.tagline : "Der Wirt wählt grad a Spiel." }));
      if (meta) picker.appendChild(el("div", { class: "banner", text: "Regeln: " + meta.rules }));
    }
    wrap.appendChild(picker);

    if (isHost) {
      const enough = SS.connectedCount() >= (SS.getMeta(SS.state.gameId) || { minP: 2 }).minP;
      wrap.appendChild(el("div", { class: "card center", style: { marginTop: "18px" } }, [
        SS.state.gameId
          ? el("button", { class: "btn btn-gold btn-lg", disabled: !enough, text: "Los geht's", onclick: startGame })
          : el("p", { class: "muted", text: "Wähle zuerst oben a Spiel." }),
        !enough && SS.state.gameId ? el("p", { class: "muted", style: { marginTop: "10px" }, text: "Für das Spiel braucht's mindestens " + SS.getMeta(SS.state.gameId).minP + " Leut." }) : null,
      ]));
    } else {
      wrap.appendChild(el("div", { class: "banner green", style: { marginTop: "18px" }, text: "Alles bereit. Sobald der Wirt startet, geht's von allein los." }));
    }
    return wrap;
  }

  function li(cls, num, text) { return el("li", {}, [el("span", { class: cls, text: num }), el("span", { text: text })]); }

  function settingsForm(meta) {
    const box = el("div");
    const defs = meta.settings || [];
    if (!defs.length) { box.appendChild(el("p", { class: "muted", text: "Für das Spiel braucht's keine Einstellungen." })); return box; }
    const row = el("div", { class: "inline-form" });
    defs.forEach((d) => {
      const cur = SS.state.settings[d.key] !== undefined ? SS.state.settings[d.key] : d.default;
      let input;
      if (d.type === "select") {
        input = el("select", { onchange: (e) => setSetting(d.key, e.target.value) },
          (d.options || []).map((o) => el("option", { value: o.value, selected: String(cur) === String(o.value) ? true : null, text: o.label })));
      } else if (d.type === "number") {
        input = el("input", { type: "number", min: d.min, max: d.max, value: cur, onchange: (e) => setSetting(d.key, Number(e.target.value)) });
      } else {
        input = el("select", { onchange: (e) => setSetting(d.key, e.target.value === "true") }, [
          el("option", { value: "true", selected: cur === true || cur === "true" ? true : null, text: "Ja" }),
          el("option", { value: "false", selected: cur === false || cur === "false" ? true : null, text: "Nein" }),
        ]);
      }
      row.appendChild(el("label", { class: "field" }, [el("span", { text: d.label }), input]));
    });
    box.appendChild(row);
    return box;
  }

  function setSetting(key, value) {
    SS.state.settings[key] = value;
    SS.LS.set("settings:" + SS.state.gameId, SS.state.settings);
    if (SS.isHost()) SS.sync();
  }

  function selectGame(id) {
    SS.state.gameId = id;
    SS.state.settings = SS.LS.get("settings:" + id, {});
    const meta = SS.getMeta(id);
    (meta.settings || []).forEach((d) => { if (SS.state.settings[d.key] === undefined) SS.state.settings[d.key] = d.default; });
    if (SS.isHost()) SS.sync();
  }

  /* ══ Spielansicht ═══════════════════════════════════════════════════════ */
  function viewGame() {
    const meta = SS.getMeta(SS.state.gameId) || { name: "Spiel", glyph: "★", tagline: "" };
    const head = el("div", { class: "game-head" }, [
      el("div", { class: "icon", text: meta.glyph || "★" }),
      el("div", { class: "titles" }, [
        el("h1", { text: meta.name }),
        el("p", { class: "sub", text: meta.tagline + (SS.state.mode === "online" ? "  ·  Runde " + SS.state.code : "  ·  am Gerät") }),
      ]),
      el("div", { class: "btn-row" }, [
        el("button", { class: "btn btn-sm btn-outline", text: "Regeln", onclick: () => rulesDialog(meta) }),
        SS.isHost() ? el("button", { class: "btn btn-sm btn-outline", text: "Neue Runde", onclick: restartGame }) : null,
        el("button", { class: "btn btn-sm btn-outline", text: "Verlassen", onclick: leaveGame }),
      ]),
    ]);
    const seatBar = seatSwitcher();
    const stage = el("div", { class: "stage", id: "stageHost" }, buildStage());
    return frag([head, seatBar, stage]);
  }

  /** Lokaler Modus, gleichzeitige Spiele: wer hält grad das Gerät? */
  function seatSwitcher() {
    if (SS.state.mode !== "local" || !SS.isSimultaneous() || SS.state.phase !== "playing") return null;
    return el("div", { class: "card seat-switcher", style: { marginBottom: "16px", padding: "14px 16px" } }, [
      el("div", { class: "eyebrow", text: "Wer hält grad das Gerät?" }),
      el("div", { class: "btn-row" }, SS.state.players.map((p) =>
        el("button", { class: "btn btn-sm " + (SS.state.seat === p.id ? "btn-gold active" : "btn-outline"), text: p.name,
          onclick: () => { SS.state.seat = p.id; renderCurrentGame(); } })
      )),
      el("p", { class: "muted", style: { margin: "8px 0 0", fontSize: "13px" }, text: "Tippt euren Namen an, bevor ihr antwortet. So landen die Punkte im richtigen Haus." }),
    ]);
  }

  function buildStage() {
    const impl = SS.IMPL[SS.state.gameId];
    if (!impl) return el("p", { class: "muted", text: "Das Spiel is ned geladen." });
    const ctx = SS.makeCtx();
    // Partie vorbei: Endstand mit Auswertung zeigen.
    if (SS.state.phase === "over") {
      const title = (SS.state.lastResult && SS.state.lastResult.title) || "Endstand";
      try { return SS.util.finalScreen(ctx, title, "Gut Schluck — und bis zum nächsten Mal."); }
      catch (e) { console.error(e); return el("div", { class: "banner red", text: "Fehler beim Endstand: " + e.message }); }
    }
    if (SS.state.phase === "playing" && SS.state.pub && SS.state.pub.game && SS.state.pub.game !== SS.state.gameId) {
      return el("div", { class: "center muted", style: { padding: "40px 0" }, text: "Die Runde wird vorbereitet …" });
    }
    try { return impl.render(ctx) || el("div"); }
    catch (e) { console.error(e); return el("div", { class: "banner red", text: "Fehler beim Zeichnen: " + e.message }); }
  }

  /* ══ Chronik ════════════════════════════════════════════════════════════ */
  function viewChronicle() {
    const entries = SS.store ? SS.store.chronicle() : [];
    const tally = SS.store ? SS.store.tally() : [];
    const wrap = el("div");
    wrap.appendChild(el("div", { class: "eyebrow", text: "Wirtshausbuch" }));
    wrap.appendChild(el("h1", { text: "Chronik" }));
    wrap.appendChild(el("p", { class: "lead", text: "Was im Wirtshaus halt so passiert. Bleibt im Gerät stehen — auch die Zeit, in der kein Netz da war." }));

    const usage = SS.store ? SS.store.usage() : { kb: 0 };
    const ob = SS.store ? SS.store.outboxCount() : 0;
    wrap.appendChild(el("div", { class: "sync-strip" }, [
      el("span", {}, [el("strong", { text: entries.length + " Einträge " }), "· " + usage.kb + " kB belegt"]),
      ob ? el("span", {}, [el("strong", { text: ob + " im Ausgangskorb" })]) : el("span", { class: "muted", text: "Ausgangskorb leer" }),
      el("button", { class: "btn btn-sm btn-outline", text: "Ausgangskorb leeren", onclick: () => { SS.store.clearOutbox(); SS.state.pending = false; render(); } }),
      el("button", { class: "btn btn-sm btn-outline", text: "Chronik leeren", onclick: confirmWipeChronicle }),
    ]));

    if (tally.length) {
      wrap.appendChild(el("div", { class: "card", style: { marginBottom: "18px" } }, [
        el("h3", { text: "Wer war am fleißigsten" }),
        el("table", { class: "scoreboard" }, [
          el("thead", {}, el("tr", {}, [el("th", { text: "#" }), el("th", { text: "Name" }), el("th", { text: "Siege" }), el("th", { text: "Schlucke" }), el("th", { text: "Punkte" })])),
          el("tbody", {}, tally.slice(0, 20).map((t, i) => el("tr", { class: i === 0 ? "lead-row" : "" }, [
            el("td", {}, el("span", { class: "rank", text: (i + 1) + "." })),
            el("td", { text: t.name }),
            el("td", { class: "num", text: String(t.wins) }),
            el("td", { class: "num", text: String(t.drinks) }),
            el("td", { class: "num", text: String(t.points) }),
          ]))),
        ]),
      ]));
    }

    if (!entries.length) {
      wrap.appendChild(el("div", { class: "card center muted", text: "Noch nix drin. Spielt a Runde, dann füllt sich das Buch." }));
    } else {
      const ul = el("ul", { class: "chronicle" });
      entries.slice(0, 200).forEach((e) => {
        ul.appendChild(el("li", {}, [
          el("span", { class: "when", text: fmtWhen(e.at) }),
          el("span", { class: "what" }, [
            el("span", { class: "who", text: e.who || "Runde" }), " ",
            e.type === "sieg" ? "hat gewonnen" : e.type === "schluck" ? "hat einen Schluck kassiert" : "hat eine Runde gespielt",
            e.game ? " · " + e.game : "",
            e.offline ? " · offline nachgreicht" : "",
          ]),
          el("span", { class: "tag-mini", text: e.type || "runde" }),
        ]));
      });
      wrap.appendChild(el("div", { class: "card" }, ul));
    }
    return wrap;
  }

  function confirmWipeChronicle() {
    SS.modal("Chronik leeren?", frag([el("p", { text: "Alles, was im Buch steht, wird gelöscht. Des kommt nimmer zurück." })]), [
      { label: "Behalten" },
      { label: "Leeren", kind: "primary", onClick: () => { SS.store.clearChronicle(); render(); return true; } },
    ]);
  }

  /* ══ Wirt-Bereich ═══════════════════════════════════════════════════════ */
  /**
   * Zugang für die Person, die den Abend leitet: Runde verwalten, Leut
   * entfernen, Punkte zurücksetzen und am Ende den Abendbericht zusammenstellen.
   *
   * Ehrlicher Hinweis: Das ist ein Wirtshaus-Schlüssel, kein Banktresor. Die
   * Seite läuft ohne Server im Browser, also kann jeder, der sich auskennt,
   * den Schlüssel im Quelltext finden. Er hält die Runde davon ab, versehentlich
   * im Management herumzupfuschen — mehr soll er nicht.
   */
  const WIRT_KEY = "135LowLap";

  const isWirt = () => !!(SS.store && SS.store.loadProfile().wirt);
  const isWirtHost = () => isWirt() && SS.isHost();

  function openWirtDialog() {
    if (isWirt()) return wirtPanel();
    const input = el("input", { type: "password", placeholder: "Wirtsschlüssel", dataset: { persist: "wirtKey" }, autocomplete: "off" });
    SS.modal("Wirt-Bereich", frag([
      el("p", { class: "lead", text: "Der Wirt leitet den Abend: Runde verwalten, Leut entfernen, Punkte zurücksetzen und am Schluss den Bericht zusammenstellen." }),
      el("label", { class: "field" }, [el("span", { text: "Wirtsschlüssel" }), input]),
      el("div", { class: "banner", text: "Der Schlüssel steht im Quelltext — er hält nur davon ab, versehentlich im Management zu landen." }),
    ]), [
      { label: "Abbrechen" },
      { label: "Aufsperren", kind: "primary", onClick: () => {
          if ((input.value || "").trim() !== WIRT_KEY) { SS.toast("Des is ned der Schlüssel.", "err"); return false; }
          SS.store.saveProfile({ wirt: true });
          SS.toast("Wirt-Bereich offen.", "ok");
          setTimeout(wirtPanel, 60);
          return true;
        } },
    ]);
    setTimeout(() => input.focus(), 60);
  }

  function wirtPanel() {
    const grp = SS.store.loadGroup() || {};
    const nameInput = el("input", { type: "text", value: grp.name || "Wirtshausrunde", maxlength: "30", dataset: { persist: "grpName" } });
    const body = frag([
      el("p", { class: "lead", text: "Runde: " + (SS.state.code || grp.code || "am selben Gerät") + " · " + SS.connectedCount() + " Leut dabei" }),
      el("label", { class: "field" }, [el("span", { text: "Name der Runde" }), nameInput]),
      el("div", { class: "btn-row" }, [
        el("button", { class: "btn btn-sm btn-gold", text: "Namen speichern", onclick: () => {
          const n = (nameInput.value || "").trim() || "Wirtshausrunde";
          const g = SS.store.loadGroup();
          if (g) SS.store.saveGroup(Object.assign({}, g, { name: n }));
          SS.toast("Runde heißt jetzt «" + n + "».", "ok");
        } }),
        el("button", { class: "btn btn-sm btn-outline", text: "Punkte zurücksetzen", onclick: resetScores }),
        el("button", { class: "btn btn-sm btn-outline", text: "Teilnehmer verwalten", onclick: managePlayers }),
      ]),
      el("hr", { class: "rule" }),
      el("h3", { text: "Abendbericht" }),
      el("p", { class: "muted", text: "Fasst die ganze Nacht zusammen: wer dabei war, wer gewonnen hat, wer wie oft einen Schluck kassiert hat. Zum Kopieren und in die Gruppe schicken." }),
      el("div", { class: "btn-row" }, [
        el("button", { class: "btn btn-gold", text: "Bericht kopieren", onclick: () => copy(buildReport(), "Bericht kopiert") }),
        el("button", { class: "btn btn-outline", text: "Vorschau", onclick: () => SS.modal("Abendbericht", frag([
          el("textarea", { readonly: true, style: { minHeight: "300px" }, value: buildReport() }),
        ]), [{ label: "Zumachen", kind: "primary" }]) }),
      ]),
      el("hr", { class: "rule" }),
      el("div", { class: "btn-row" }, [
        el("button", { class: "btn btn-sm btn-outline", text: "Wirt-Bereich sperren", onclick: () => { SS.store.saveProfile({ wirt: false }); SS.toast("Wirt-Bereich gesperrt."); } }),
        el("button", { class: "btn btn-sm btn-outline", text: "Alles zurücksetzen", onclick: confirmWipeAll }),
      ]),
      el("p", { class: "muted", style: { marginTop: "10px", fontSize: "13px" }, text: "Belegt: " + SS.store.usage().kb + " kB im Gerät · Chronik: " + SS.store.chronicle().length + " Einträge" }),
    ]);
    SS.modal("Wirt-Bereich", body, [{ label: "Fertig", kind: "primary" }]);
  }

  function resetScores() {
    SS.modal("Punkte zurücksetzen?", frag([el("p", { text: "Alle Punkte gehen auf null. Die Chronik bleibt stehen." })]), [
      { label: "Abbrechen" },
      { label: "Zurücksetzen", kind: "primary", onClick: () => {
          Object.keys(SS.state.scores).forEach((k) => (SS.state.scores[k] = 0));
          if (SS.isHost()) SS.sync();
          render(); return true;
        } },
    ]);
  }

  function managePlayers() {
    const list = el("div");
    if (!SS.state.players.length) list.appendChild(el("p", { class: "muted", text: "Keine Teilnehmer eingetragen." }));
    SS.state.players.forEach((p) => {
      list.appendChild(el("div", { class: "btn-row", style: { marginBottom: "8px", justifyContent: "space-between" } }, [
        el("span", {}, [el("span", { class: "avatar", style: { background: p.color }, text: SS.initial(p.name) }), " " + p.name + (p.connected === false ? " (weg)" : "")]),
        el("button", { class: "btn btn-sm btn-outline", text: "Entfernen", onclick: () => {
          if (SS.state.mode === "online" && SS.isHost()) SS.net.sendTo(p.id, { t: "kick", reason: "Der Wirt hat dich aus der Runde genommen." });
          SS.removePlayer(p.id);
          if (SS.isHost()) SS.sync();
          SS.modal("Teilnehmer verwalten", frag([manageList()]), [{ label: "Fertig", kind: "primary" }]);
          return true;
        } }),
      ]));
    });
    SS.modal("Teilnehmer verwalten", list, [{ label: "Fertig", kind: "primary" }]);
  }
  function manageList() {
    const d = el("div");
    SS.state.players.forEach((p) => d.appendChild(el("p", { text: p.name + (p.connected === false ? " (weg)" : "") })));
    return d;
  }

  /** Der Abendbericht — alles aus der Chronik, menschenlesbar zusammengefasst. */
  function buildReport() {
    const grp = SS.store.loadGroup() || {};
    const entries = SS.store.chronicle();
    const t = SS.store.tally();
    const L = [];
    L.push("SEIDLA — Abendbericht");
    L.push("Runde: " + (grp.name || "Wirtshausrunde") + (grp.code ? " (" + grp.code + ")" : ""));
    L.push("Stand: " + new Date().toLocaleString("de-DE"));
    L.push("Einträge: " + entries.length);
    L.push("");
    if (t.length) {
      L.push("WER WAR AM FLEISSIGSTEN");
      t.slice(0, 15).forEach((x, i) => {
        L.push((i + 1) + ". " + x.name + " — " + x.points + " Punkte, " + x.wins + (x.wins === 1 ? " Sieg" : " Siege") + ", " + x.drinks + (x.drinks === 1 ? " Schluck" : " Schlucke"));
      });
      L.push("");
    }
    const games = {};
    entries.forEach((e) => { if (e.game) games[e.game] = (games[e.game] || 0) + 1; });
    if (Object.keys(games).length) {
      L.push("GESPIELT");
      Object.keys(games).sort((a, b) => games[b] - games[a]).forEach((g) => L.push("- " + g + ": " + games[g] + " Runden"));
      L.push("");
    }
    const offline = entries.filter((e) => e.offline).length;
    if (offline) { L.push(offline + " Einträge wurden nachgereicht (ohne Netz gespielt)."); L.push(""); }
    L.push("VERLAUF");
    entries.slice(0, 60).forEach((e) => {
      const d = new Date(e.at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
      L.push(d + "  " + (e.who || "Runde") + " — " + (e.type === "sieg" ? "gewonnen" : e.type === "schluck" ? "Schluck" : "Runde") + (e.game ? " (" + e.game + ")" : ""));
    });
    return L.join("\n");
  }

  function confirmWipeAll() {
    SS.modal("Wirklich alles löschen?", frag([el("p", { text: "Chronik, Ausgangskorb und die gespeicherte Runde werden gelöscht. Des kommt nimmer zurück." })]), [
      { label: "Behalten" },
      { label: "Alles löschen", kind: "primary", onClick: () => { SS.store.wipe(); SS.state.pending = false; SS.state.lastSession = null; render(); return true; } },
    ]);
  }

  /* ══ Abläufe ════════════════════════════════════════════════════════════ */
  function getName() {
    const n = (SS.LS.get("name", "") || (SS.store ? SS.store.loadProfile().name : "") || "").trim();
    return n || "Gast " + Math.floor(Math.random() * 90 + 10);
  }

  function openCreateDialog() {
    const nameInput = el("input", { type: "text", value: getName(), maxlength: "22", placeholder: "Dein Name", dataset: { persist: "dlgName" } });
    const body = frag([
      el("p", { class: "lead", text: "Dein Gerät wird der Wirt. Danach steht ein vierstelliger Code auf dem Schirm, den die anderen eintippen." }),
      el("label", { class: "field" }, [el("span", { text: "Dein Name" }), nameInput]),
      el("div", { class: "banner", text: "Alle Geräte brauchen zum Beitreten kurz Internet. Danach läuft der Datenverkehr direkt zwischen den Geräten." }),
    ]);
    SS.modal("Runde aufmachen", body, [
      { label: "Abbrechen" },
      { label: "Aufmachen", kind: "primary", onClick: () => {
          const nm = (nameInput.value || "").trim() || getName();
          SS.LS.set("name", nm);
          if (SS.store) SS.store.saveProfile({ name: nm });
          createGroup(nm);
          return true;
        } },
    ]);
  }

  function createGroup(nm) {
    SS.toast("Runde wird aufgemacht …");
    SS.net.createGroup(nm)
      .then(() => { SS.LS.set("lastCode", SS.state.code); go("lobby"); SS.toast("Runde offen. Code: " + SS.state.code, "ok"); })
      .catch((err) => {
        SS.toast(err.message, "err");
        SS.modal("Runde geht ned auf", frag([
          el("p", { text: err.message }),
          el("div", { class: "banner", text: "Tipp: Wenn im Netz keine WebRTC-Verbindungen erlaubt sind, spielt's am selben Gerät weiter. Alles geht auch ohne Runde." }),
        ]), [
          { label: "Am selben Gerät", kind: "primary", onClick: () => { startLocalFlow(nm); return true; } },
          { label: "Nochmal probieren", onClick: () => { createGroup(nm); return true; } },
          { label: "Zumachen" },
        ]);
      });
  }

  function openJoinDialog(prefill) {
    const codeInput = el("input", { class: "code-input", type: "text", inputmode: "latin", autocapitalize: "characters", autocomplete: "off", maxlength: "4", value: prefill || "", placeholder: "----" });
    const nameInput = el("input", { type: "text", value: getName(), maxlength: "22", placeholder: "Dein Name", dataset: { persist: "dlgJoinName" } });
    const body = frag([
      el("p", { class: "lead", text: "Gib den Code ein, den der Wirt zeigt." }),
      el("label", { class: "field" }, [el("span", { text: "Rundencode" }), codeInput]),
      el("label", { class: "field" }, [el("span", { text: "Dein Name" }), nameInput]),
      el("div", { class: "banner", text: "Groß- und Kleinschreibung is wurscht — der Code wird von allein groß." }),
    ]);
    const box = SS.modal("Mit Code nei", body, [
      { label: "Abbrechen" },
      { label: "Nei", kind: "primary", onClick: () => {
          const code = codeInput.value.trim().toUpperCase();
          const nm = (nameInput.value || "").trim() || getName();
          SS.LS.set("name", nm);
          if (SS.store) SS.store.saveProfile({ name: nm });
          joinGroup(code, nm);
          return true;
        } },
    ]);
    setTimeout(() => { if (!prefill) codeInput.focus(); }, 60);
    return box;
  }

  function joinGroup(code, nm) {
    SS.toast("Verbindung wird aufgebaut …");
    SS.net.joinGroup(code, nm)
      .then(() => { SS.LS.set("lastCode", code); go("lobby"); SS.toast("Dabei: Runde " + SS.state.code, "ok"); })
      .catch((err) => {
        SS.toast(err.message, "err");
        SS.modal("Beitritt geht ned", frag([
          el("p", { text: err.message }),
          el("ul", {}, [
            el("li", { text: "Is der Code richtig abtippt?" }),
            el("li", { text: "Is die Runde am Wirt-Gerät noch offen?" }),
            el("li", { text: "Haben beide Geräte Internet?" }),
          ]),
        ]), [
          { label: "Nochmal", kind: "primary", onClick: () => { openJoinDialog(code); return true; } },
          { label: "Zumachen" },
        ]);
      });
  }

  function startLocalFlow(name) {
    if (name) SS.LS.set("name", name);
    SS.state.mode = "local";
    SS.state.role = "solo";
    SS.state.code = null;
    SS.state.players = [];
    SS.state.scores = {};
    SS.state.priv = {};
    SS.state.pending = false;
    SS.addPlayer(SS.LS.get("name", "") || "Spieler 1", { id: "p1", isHost: true });
    SS.addPlayer("Spieler 2", { id: "p2" });
    SS.state.me = null;
    SS.net.setStatus("offline");
    go("lobby");
  }

  function addLocalPlayerDialog() {
    const input = el("input", { type: "text", maxlength: "22", placeholder: "Name", dataset: { persist: "addP" } });
    SS.modal("Wer noch?", frag([
      el("label", { class: "field" }, [el("span", { text: "Name" }), input]),
      el("p", { class: "muted", text: "Am selben Gerät kannst zusätzliche Leut anlegen, die sich den Schirm teilen." }),
    ]), [
      { label: "Abbrechen" },
      { label: "Dazu", kind: "primary", onClick: () => {
          const n = (input.value || "").trim(); if (!n) return false;
          SS.addPlayer(n, {});
          if (SS.isHost()) SS.sync();
          render(); return true;
        } },
    ]);
    setTimeout(() => input.focus(), 60);
  }

  function openGame(id) {
    const meta = SS.getMeta(id);
    if (!meta) return;
    if (SS.state.mode === "local" && !SS.state.players.length) {
      SS.addPlayer(SS.LS.get("name", "") || "Spieler 1", { id: "p1", isHost: true });
      const min = Math.max(meta.minP || 2, 2);
      for (let i = 2; i <= min; i++) SS.addPlayer("Spieler " + i, { id: "p" + i });
      SS.state.me = null;
    }
    selectGame(id);

    const body = frag([
      el("p", { class: "lead", text: meta.glyph + "  " + meta.tagline }),
      el("div", { class: "tags", style: { marginBottom: "12px" } }, (meta.tags || []).map((t) => el("span", { class: "tag", text: TAGS[t] || t }))),
      el("div", { class: "banner", text: "Regeln: " + meta.rules }),
      meta.howto && meta.howto.length ? el("div", {}, [el("h3", { text: "So läuft's" }), el("ol", {}, meta.howto.map((h) => el("li", { text: h })))]) : null,
    ]);

    SS.modal(meta.name, body, [
      { label: "Zumachen" },
      { label: "Am selben Gerät", onClick: () => { startLocalFlow(); selectGame(id); return true; } },
      { label: "In der Runde", kind: "primary", onClick: () => {
          if (SS.state.mode === "online" && SS.state.role === "host") { selectGame(id); go("lobby"); return true; }
          if (SS.state.mode === "online" && SS.state.role === "guest") { SS.toast("Der Wirt wählt das Spiel.", "err"); return true; }
          window.__pendingGame = id;
          openCreateDialog();
          return true;
        } },
    ]);
  }

  function startGame() {
    const meta = SS.getMeta(SS.state.gameId);
    if (!meta) return;
    const ctx = SS.makeCtx();
    SS.state.scores = {};
    SS.state.players.forEach((p) => (SS.state.scores[p.id] = 0));
    SS.state.priv = {};
    SS.state.phase = "playing";
    SS.state.round = 1;
    SS.state.lastResult = null;
    SS.state.pub = {};
    SS.state.syncSeed = SS.state.syncSeed || (SS.state.code || "lokal") + ":" + SS.uid(6);
    SS.state.players.forEach((p) => (SS.state.priv[p.id] = {}));
    SS.logLine("Los geht's: " + meta.name, "ok");
    const impl = SS.IMPL[SS.state.gameId];
    if (impl && impl.init) { try { impl.init(ctx); } catch (e) { console.error(e); SS.toast("Startfehler: " + e.message, "err"); } }
    if (SS.isHost()) SS.sync();
    if (SS.state.mode === "online" && SS.isHost()) SS.net.broadcast({ t: "start" });
    go("game");
    if (SS.state.mode === "online" && SS.state.role === "guest") SS.net.sendToHost({ t: "req" });
    SS.persist();
  }

  function restartGame() {
    SS.modal("Neue Runde?", frag([el("p", { text: "Der Punktestand wird auf null gesetzt und alles neu gemischt." })]), [
      { label: "Abbrechen" },
      { label: "Neu starten", kind: "primary", onClick: () => { SS.state.syncSeed = null; startGame(); return true; } },
    ]);
  }

  function leaveGame() {
    SS.modal("Runde verlassen?", frag([el("p", { text: "Ihr kommt zurück in die Lobby. Die Runde bleibt bestehen." })]), [
      { label: "Weiterspielen" },
      { label: "Verlassen", kind: "primary", onClick: () => {
          SS.state.phase = "lobby"; SS.state.turn = null; SS.state.pub = {}; SS.state.priv = {};
          if (SS.isHost()) SS.sync();
          go("lobby"); return true;
        } },
    ]);
  }

  function toHome() {
    SS.state.mode = "local";
    SS.state.role = "solo";
    SS.state.code = null;
    SS.state.connection = "offline";
    SS.state.phase = "lobby";
    go("home");
  }

  function rulesDialog(meta) {
    SS.modal(meta.name + " — Regeln", frag([
      el("div", { class: "banner", text: meta.rules }),
      meta.howto && meta.howto.length ? el("div", {}, [el("h3", { text: "Ablauf" }), el("ol", {}, meta.howto.map((h) => el("li", { text: h })))]) : null,
    ]), [{ label: "Passt", kind: "primary" }]);
  }

  /* ══ Hilfe ══════════════════════════════════════════════════════════════ */
  function helpDialog() {
    SS.modal("Kurze Anleitung", frag([
      el("h3", { text: "Runde aufmachen" }),
      el("ol", {}, [
        el("li", { text: "Ein Gerät wählt «Runde aufmachen» und wird der Wirt." }),
        el("li", { text: "Es zeigt einen vierstelligen Code, zum Beispiel K7QP." }),
        el("li", { text: "Alle anderen tippen den Code ein — bis zu 100 Leut." }),
      ]),
      el("h3", { text: "Wenn's Netz weg is" }),
      el("p", { text: "Für den Beitritt braucht's kurz Internet: Die Geräte finden sich über einen Vermittlungsdienst und reden danach direkt miteinander (WebRTC). Reißt die Verbindung ab, spielt's trotzdem weiter — jede Runde wandert in den Ausgangskorb und wird nachgereicht, sobald wieder Netz da is." }),
      el("p", { text: "Reines Bluetooth zwischen iPhone und Android geht im Browser ned. Des kann die Seite ned leisten, ohne dass ihr a App installiert." }),
      el("h3", { text: "Am selben Gerät" }),
      el("p", { text: "Wähle «Am selben Gerät». Zwei bis hundert Leut spielen nacheinander an einem Schirm. Bei Spielen, wo alle gleichzeitig antworten, tippt jeder vorher seinen Namen an." }),
      el("h3", { text: "Strafen" }),
      el("p", { text: "Auf der Startseite stellst ein, was bei einer Strafe passiert: ein Schluck, eine Aufgabe oder ein Glas Wasser. Dann spielt's jeder so, wie er mag." }),
      el("h3", { text: "Kurzbefehle" }),
      el("p", {}, [el("span", { class: "kbd", text: "Esc" }), " schließt Dialoge."]),
    ]), [{ label: "Passt", kind: "primary" }]);
  }

  /* ══ Kleinkram ══════════════════════════════════════════════════════════ */
  function copy(text, okMsg) {
    if (!text) return;
    const done = () => SS.toast(okMsg || "Kopiert", "ok");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else fallbackCopy(text, done);
  }
  function fallbackCopy(text, done) {
    const ta = el("textarea", { style: { position: "fixed", opacity: "0" } });
    ta.value = text;
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { SS.toast("Kopieren geht ned. Bitte abschreiben.", "err"); }
    ta.remove();
  }

  /* ══ Start ══════════════════════════════════════════════════════════════ */
  function initUI() {
    SS.$("#brandBtn").addEventListener("click", () => { if (SS.state.phase === "playing") leaveGame(); else go("home"); });
    SS.$("#helpBtn").addEventListener("click", helpDialog);
    const cb = SS.$("#chronikBtn");
    if (cb) cb.addEventListener("click", () => go("chronik"));
    const wb = SS.$("#wirtBtn");
    if (wb) wb.addEventListener("click", openWirtDialog);

    SS.on("net", () => {
      if (SS.state.route === "lobby" || SS.state.route === "game") render();
      else { renderMechanik(); updateStatusbar(); }
      if (window.__pendingGame && SS.state.role === "host") { selectGame(window.__pendingGame); window.__pendingGame = null; render(); }
    });
    SS.on("outbox", updateStatusbar);
    SS.on("chronicle", () => { if (SS.state.route === "chronik") render(); });

    setInterval(() => { updateStatusbar(); }, 2500);
    render();
  }

  SS.setRenderCurrent(renderCurrentGame);
  SS.ui = {
    render, renderCurrent: renderCurrentGame, go, initUI, showScoreboard,
    copy, helpDialog, selectGame, startGame, openJoinDialog, openCreateDialog,
    viewChronicle, penalty, penaltyWord,
  };
})();
