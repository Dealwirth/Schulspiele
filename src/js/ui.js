/* ==========================================================================
   Schulspiele — Oberfläche
   Startseite, Spielkatalog, Gruppen-Lobby, Spielansicht, Mechanik-Leiste.
   ========================================================================== */
(function () {
  "use strict";
  const SS = window.SS;
  const { el, frag, esc } = SS;

  const TAGS = {
    schnell: "Schnell",
    strategie: "Strategie",
    party: "Party",
    wissen: "Wissen",
    wort: "Wort",
    team: "Team",
    "2": "2 Spieler",
    "3": "3–4",
    "8": "bis 8",
    gross: "Grosse Gruppe",
    ruhig: "Ruhig",
    laut: "Laut",
  };

  /* ══ Routenwechsel ══════════════════════════════════════════════════════ */
  function go(route) {
    SS.state.route = route;
    render();
    window.scrollTo({ top: 0, behavior: SS.LS.get("reducedMotion", false) ? "auto" : "smooth" });
  }

  /* ══ Fokus bewahren (Eingabefelder bleiben aktiv) ═══════════════════════ */
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

  /* ══ Zentrale Zeichenroutine ════════════════════════════════════════════ */
  function render() {
    const snap = captureFocus();
    const view = SS.$("#view");
    view.innerHTML = "";
    let node;
    switch (SS.state.route) {
      case "catalog": node = viewCatalog(); break;
      case "lobby": node = viewLobby(); break;
      case "game": node = viewGame(); break;
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
    if (stage) {
      stage.innerHTML = "";
      stage.appendChild(buildStage());
    }
    renderMechanik();
    updateStatusbar();
    restoreFocus(snap);
  }

  /* ══ Mechanik-Leiste ════════════════════════════════════════════════════ */
  function renderMechanik() {
    const bar = SS.$("#mechanik");
    const active = SS.state.phase === "playing" && SS.state.gameId;
    if (!active) { bar.hidden = true; bar.innerHTML = ""; return; }
    bar.hidden = false;
    bar.innerHTML = "";

    const inner = el("div", { class: "mechanik-inner" });
    inner.appendChild(el("h4", { text: "Häuser" }));

    const houses = el("div", { class: "mk-houses" });
    const order = SS.state.players.slice().sort((a, b) => (SS.state.scores[b.id] || 0) - (SS.state.scores[a.id] || 0));
    order.forEach((p) => {
      houses.appendChild(
        el("span", { class: "mk-house", style: { opacity: p.connected === false ? ".45" : "1" } }, [
          el("span", { class: "avatar", style: { background: p.color }, text: SS.initial(p.name) }),
          el("span", { text: p.name }),
          el("span", { class: "pts", text: String(SS.state.scores[p.id] || 0) }),
        ])
      );
    });
    inner.appendChild(houses);

    inner.appendChild(el("div", { class: "mk-spacer" }));
    inner.appendChild(
      el("div", { class: "mk-round" }, [
        "Runde ",
        el("strong", { text: String(SS.state.round) }),
        SS.state.mode === "online"
          ? el("span", { text: "  ·  Gruppe " + SS.state.code })
          : el("span", { text: "  ·  am selben Gerät" }),
      ])
    );
    inner.appendChild(
      el("button", { class: "btn btn-sm btn-gold", text: "Punktestand", onclick: showScoreboard })
    );
    bar.appendChild(inner);
  }

  function showScoreboard() {
    const order = SS.state.players.slice().sort((a, b) => (SS.state.scores[b.id] || 0) - (SS.state.scores[a.id] || 0));
    const rows = order.map((p, i) =>
      el("tr", { class: i === 0 && (SS.state.scores[p.id] || 0) > 0 ? "lead-row" : "" }, [
        el("td", {}, el("span", { class: "rank", text: (i + 1) + "." })),
        el("td", {}, [
          el("span", { class: "avatar", style: { background: p.color }, text: SS.initial(p.name) }),
          p.name,
          p.connected === false ? el("span", { class: "muted", text: "  (offline)" }) : null,
        ]),
        el("td", { class: "num", text: String(SS.state.scores[p.id] || 0) }),
      ])
    );
    const table = el("table", { class: "scoreboard" }, [
      el("thead", {}, el("tr", {}, [el("th", { text: "#" }), el("th", { text: "Haus" }), el("th", { text: "Punkte" })])),
      el("tbody", {}, rows),
    ]);
    SS.modal("Punktestand", frag([table, el("p", { class: "muted", style: { marginTop: "12px" }, text: "Punkte bleiben über alle Runden erhalten." })]), [{ label: "Weiter", kind: "primary" }]);
  }

  /* ══ Statuszeile ════════════════════════════════════════════════════════ */
  function updateStatusbar() {
    const t = SS.$("#statusText"), r = SS.$("#statusRight");
    const mode = SS.state.mode === "online" ? "Gruppe " + (SS.state.code || "—") : "Am selben Gerät";
    const role = SS.state.role === "host" ? "Host" : SS.state.role === "guest" ? "Gast" : "Lokal";
    t.textContent =
      SS.state.phase === "playing"
        ? "Partie läuft · " + mode
        : SS.state.phase === "over"
        ? "Partie beendet · " + mode
        : "Bereit · " + mode;
    r.textContent = role + " · " + SS.connectedCount() + " Spieler · " +
      (SS.state.connection === "online" ? "verbunden" : SS.state.connection === "connecting" ? "verbindet" : "lokal");
  }

  /* ══ Startseite ═════════════════════════════════════════════════════════ */
  function viewHome() {
    const name = SS.LS.get("name", "");
    const wrap = el("div");

    wrap.appendChild(
      el("section", { class: "hero" }, [
        el("div", { class: "hero-main" }, [
          el("div", { class: "eyebrow", text: "Für die Pause, den Vertretungsunterricht und den letzten Stundenblock" }),
          el("h1", { text: "Klassiker, die zu zweit oder in der Gruppe sofort laufen." }),
          el("p", {
            text:
              "Ein Gerät öffnet eine Gruppe und zeigt einen Code. Alle anderen treten mit diesem Code bei — ob iPad, Android-Tablet, iPhone oder Laptop. Keine Anmeldung, keine Konten, keine Werbung.",
          }),
          el("div", { class: "btn-row", style: { marginTop: "18px" } }, [
            el("button", { class: "btn btn-gold", text: "Gruppe öffnen", onclick: () => openCreateDialog() }),
            el("button", { class: "btn btn-ghost", text: "Mit Code beitreten", onclick: () => openJoinDialog() }),
            el("button", { class: "btn btn-ghost", text: "Am selben Gerät", onclick: () => startLocalFlow() }),
          ]),
        ]),
        el("div", { class: "hero-side" }, [
          stat("1", "Gerät startet", "Der Host öffnet eine Gruppe. Der Code steht gross auf dem Bildschirm."),
          stat("2", "Alle treten bei", "Code eintippen, Name wählen, fertig. Bis zu 10 Geräte."),
          stat(SS.GAMES.length + "", "Spiele bereit", "Von Tic Tac Toe bis Vier gewinnt, Memory und Quizduell."),
        ]),
      ])
    );

    // Namensfeld
    const nameCard = el("div", { class: "card" }, [
      el("h3", { text: "Erst kurz der Name" }),
      el("p", { class: "muted", text: "Der Name erscheint bei den anderen in der Gruppe." }),
      el("label", { class: "field", style: { maxWidth: "380px" } }, [
        el("span", { text: "Dein Name" }),
        el("input", {
          type: "text", placeholder: "z. B. Lea, Jonas, Gruppe 4B …", value: name, maxlength: "22",
          dataset: { persist: "homeName" },
          oninput: (e) => { SS.LS.set("name", e.target.value); },
        }),
      ]),
    ]);
    wrap.appendChild(nameCard);

    // Katalog-Ausblick
    wrap.appendChild(
      el("div", { style: { marginTop: "26px" } }, [
        el("div", { class: "eyebrow", text: "Spiele" }),
        el("h2", { text: "Der Katalog" }),
        el("p", { class: "lead", text: "Ausgewählte Klassiker und ein paar komplexere Spiele für längere Phasen. Alles läuft direkt im Browser." }),
        el("div", { class: "grid", style: { marginTop: "16px" } }, SS.GAMES.slice(0, 6).map(gameCard)),
        el("div", { class: "btn-row", style: { marginTop: "18px" } }, [
          el("button", { class: "btn btn-outline", text: "Alle " + SS.GAMES.length + " Spiele ansehen", onclick: () => go("catalog") }),
        ]),
      ])
    );

    wrap.appendChild(
      el("div", { class: "footnote" }, [
        el("strong", { text: "Ein Wort zur Verbindung. " }),
        "Eine Gruppe verbindet Geräte direkt über WebRTC; dafür wird einmalig ein Verbindungsdienst im Internet gebraucht. " +
          "Bist du ganz offline — etwa im Flugmodus oder in einem WLAN ohne Internet — läuft trotzdem alles, nur eben als Übergabe von Gerät zu Gerät. " +
          "Bluetooth allein reicht im Browser für Gruppenspiele nicht aus, dazu müssten sich die Geräte über eine App koppeln.",
      ])
    );

    return wrap;
  }

  function stat(big, title, text) {
    return el("div", { class: "stat-card" }, [
      el("div", { class: "big", text: big }),
      el("div", {}, [el("h3", { text: title }), el("p", { text: text })]),
    ]);
  }

  /* ══ Spielkatalog ═══════════════════════════════════════════════════════ */
  let catalogFilter = { tag: "alle", q: "" };

  function viewCatalog() {
    const tags = ["alle", "schnell", "strategie", "party", "wissen", "wort", "team", "gross"];
    const chips = tags.map((t) =>
      el("button", {
        class: "chip", "aria-pressed": catalogFilter.tag === t ? "true" : "false",
        text: t === "alle" ? "Alle" : TAGS[t] || t,
        onclick: () => { catalogFilter.tag = t; render(); },
      })
    );
    const search = el("input", {
      class: "search", type: "search", placeholder: "Suchen …", value: catalogFilter.q,
      dataset: { persist: "search" },
      oninput: (e) => { catalogFilter.q = e.target.value.toLowerCase(); softFilter(); },
    });

    const listHost = el("div", { class: "grid", id: "catalogGrid" });
    fillCatalog(listHost);

    return el("div", {}, [
      el("div", { class: "eyebrow", text: "Katalog" }),
      el("h1", { text: "Alle Spiele" }),
      el("p", { class: "lead", text: "Wähle ein Spiel. Danach legst du fest, ob es online in einer Gruppe oder am selben Gerät gespielt wird." }),
      el("div", { class: "filters" }, [chips, search]),
      listHost,
    ]);
  }

  function fillCatalog(host) {
    host.innerHTML = "";
    const q = catalogFilter.q;
    const tag = catalogFilter.tag;
    const list = SS.GAMES.filter((g) => {
      if (tag !== "alle" && !(g.tags || []).includes(tag)) return false;
      if (q && !((g.name + " " + g.tagline + " " + (g.tags || []).map((t) => TAGS[t] || t).join(" ")).toLowerCase().includes(q))) return false;
      return true;
    });
    if (!list.length) {
      host.appendChild(el("div", { class: "card center muted", text: "Kein Spiel passt zu dieser Auswahl." }));
      return;
    }
    list.forEach((g) => host.appendChild(gameCard(g)));
  }
  function softFilter() {
    const grid = SS.$("#catalogGrid");
    if (grid) fillCatalog(grid);
  }

  function gameCard(g) {
    return el("button", { class: "game-card", onclick: () => openGame(g.id) }, [
      el("div", { class: "thumb", style: { "--accent": g.accent || "#1d3557" } }, [
        el("span", { class: "glyph", text: g.glyph || "★" }),
        el("span", { class: "n", text: (g.minP || 2) + "–" + (g.maxP || 8) + " Spieler" }),
      ]),
      el("div", { class: "body" }, [
        el("h3", { text: g.name }),
        el("p", { text: g.tagline }),
        el("div", { class: "tags" }, (g.tags || []).map((t) => el("span", { class: "tag", text: TAGS[t] || t }))),
        el("div", { class: "meta" }, [el("span", { text: g.duration || "" }), el("span", { text: "Regeln ansehen →" })]),
      ]),
    ]);
  }

  /* ══ Lobby ══════════════════════════════════════════════════════════════ */
  function viewLobby() {
    const isHost = SS.isHost();
    const guestView = SS.state.mode === "online" && !isHost;
    const wrap = el("div");

    wrap.appendChild(el("div", { class: "eyebrow", text: isHost ? "Gruppe geöffnet" : guestView ? "Gruppe beigetreten" : "Am selben Gerät" }));
    wrap.appendChild(el("h1", { text: SS.state.mode === "online" ? (isHost ? "Warte auf deine Gruppe" : "Du bist dabei") : "Wer spielt mit?" }));

    const grid = el("div", { class: "lobby-grid" });

    // ── Links: Code & Beitritt
    const codeChip = el("div", { class: "code-chip" }, [
      el("div", {}, [el("div", { class: "eyebrow", style: { marginBottom: "2px" }, text: "Gruppencode" }), el("div", { class: "val", text: SS.state.code || "----" })]),
      el("button", { class: "btn btn-sm btn-gold", text: "Code kopieren", onclick: () => copy(SS.state.code, "Code kopiert") }),
    ]);
    const link = location.origin + location.pathname + "?code=" + (SS.state.code || "");
    const joinBox = el("div", {}, [
      el("p", { class: "muted", style: { marginTop: "12px" }, text: "Diesen Link kannst du im Klassenchat teilen — er füllt den Code auf den anderen Geräten automatisch aus." }),
      el("div", { class: "join-link", text: link }),
      el("div", { class: "btn-row", style: { marginTop: "10px" } }, [
        el("button", { class: "btn btn-sm btn-outline", text: "Link kopieren", onclick: () => copy(link, "Link kopiert") }),
      ]),
    ]);

    const steps = el("ol", { class: "net-steps" }, [
      li("num", "1", "Der Code oben wird auf den anderen Geräten unter «Mit Code beitreten» eingetippt."),
      li("num", "2", "Alle Geräte müssen im selben WLAN sein oder Internet haben."),
      li("num", "3", isHost ? "Du wählst unten das Spiel und startest die Partie." : "Der Host wählt das Spiel und startet die Partie."),
    ]);

    const left = SS.state.mode === "online"
      ? el("div", { class: "card" }, [
          el("h3", { text: "Beitritt" }),
          codeChip,
          joinBox,
          el("hr", { class: "rule" }),
          steps,
        ])
      : el("div", { class: "card" }, [
          el("h3", { text: "Gemeinsam genutztes Gerät" }),
          el("p", { class: "lead", text: "Ihr spielt nacheinander an diesem Bildschirm. Trage unten alle Personen ein, die mitspielen." }),
          el("div", { class: "btn-row" }, [
            el("button", { class: "btn btn-gold", text: "Person hinzufügen", onclick: addLocalPlayerDialog }),
            el("button", { class: "btn btn-outline", text: "In Gruppe spielen", onclick: openCreateDialog }),
          ]),
          el("hr", { class: "rule" }),
          el("div", { class: "banner", text: "Tipp: Im Statuspunkt «Punkte» siehst du jederzeit, wer führt. Die Punkte laufen über alle Runden weiter." }),
        ]);

    // ── Rechts: Spielerliste
    const plist = el("ul", { class: "player-list" });
    SS.state.players.forEach((p) => {
      const badges = [];
      if (p.id === SS.state.hostId) badges.push(el("span", { class: "badge host", text: "Host" }));
      if (SS.state.mode === "online" && p.id === SS.state.me) badges.push(el("span", { class: "badge you", text: "Du" }));
      if (p.connected === false) badges.push(el("span", { class: "badge gone", text: "weg" }));
      plist.appendChild(
        el("li", {}, [
          el("span", { class: "avatar", style: { background: p.color }, text: SS.initial(p.name) }),
          el("span", { class: "nm", text: p.name }),
          badges,
        ])
      );
    });

    const right = el("div", { class: "card" }, [
      el("h3", { text: "In der Gruppe (" + SS.connectedCount() + ")" }),
      SS.state.mode === "online"
        ? el("p", { class: "muted", text: "Bis zu 10 Geräte. Neue Beitritte erscheinen automatisch." })
        : el("p", { class: "muted", text: "Am selben Gerät wird abwechselnd gespielt." }),
      plist,
      el("hr", { class: "rule" }),
      el("div", { class: "btn-row" }, [
        el("button", { class: "btn btn-sm btn-outline", text: "Namen hinzufügen", onclick: addLocalPlayerDialog }),
        SS.state.mode === "online" && isHost
          ? el("button", { class: "btn btn-sm btn-outline", text: "Gruppe schliessen", onclick: () => { SS.net.leave(); toHome(); } })
          : null,
        guestView
          ? el("button", { class: "btn btn-sm btn-outline", text: "Gruppe verlassen", onclick: () => { SS.net.leave(); toHome(); } })
          : null,
      ]),
    ]);

    grid.appendChild(left);
    grid.appendChild(right);
    wrap.appendChild(grid);

    // ── Spielwahl
    const picker = el("div", { class: "card", style: { marginTop: "18px" } });
    if (isHost) {
      picker.appendChild(el("h3", { text: "Spiel wählen" }));
      const tiles = SS.GAMES.map((g) =>
        el("button", {
          class: "game-card",
          style: SS.state.gameId === g.id ? { boxShadow: "0 0 0 3px var(--gold-2), var(--shadow)" } : null,
          onclick: () => { selectGame(g.id); render(); },
        }, [
          el("div", { class: "thumb", style: { "--accent": g.accent || "#1d3557", height: "58px" } }, [
            el("span", { class: "glyph", text: g.glyph }),
            el("span", { class: "n", text: g.name }),
          ]),
        ])
      );
      picker.appendChild(el("div", { class: "grid" }, tiles));

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
      picker.appendChild(
        el("p", { class: "lead", text: meta ? meta.glyph + "  " + meta.name + " — " + meta.tagline : "Der Host wählt gerade ein Spiel." })
      );
      if (meta) picker.appendChild(el("div", { class: "banner", text: "Regeln: " + meta.rules }));
    }
    wrap.appendChild(picker);

    // ── Start
    if (isHost) {
      const enough = SS.connectedCount() >= (SS.getMeta(SS.state.gameId) || { minP: 2 }).minP;
      wrap.appendChild(
        el("div", { class: "card center", style: { marginTop: "18px" } }, [
          SS.state.gameId
            ? el("button", {
                class: "btn btn-gold", disabled: !enough, style: { fontSize: "18px", padding: "15px 34px" },
                text: "Partie starten",
                onclick: startGame,
              })
            : el("p", { class: "muted", text: "Wähle zuerst oben ein Spiel." }),
          !enough && SS.state.gameId
            ? el("p", { class: "muted", style: { marginTop: "10px" }, text: "Für dieses Spiel werden mindestens " + (SS.getMeta(SS.state.gameId).minP) + " Spieler gebraucht." })
            : null,
        ])
      );
    } else {
      wrap.appendChild(
        el("div", { class: "banner green", style: { marginTop: "18px" }, text: "Alles bereit. Sobald der Host startet, geht es automatisch los." })
      );
    }

    return wrap;
  }

  function li(cls, num, text) {
    return el("li", {}, [el("span", { class: cls, text: num }), el("span", { text: text })]);
  }

  function settingsForm(meta) {
    const box = el("div");
    const defs = meta.settings || [];
    if (!defs.length) { box.appendChild(el("p", { class: "muted", text: "Für dieses Spiel sind keine Einstellungen nötig." })); return box; }
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
    if (SS.state.gameId !== id) {
      if (SS.partyReset) SS.partyReset();
      if (SS.triviaReset) SS.triviaReset();
    }
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
        el("p", { class: "sub", text: meta.tagline + (SS.state.mode === "online" ? "  ·  Gruppe " + SS.state.code : "  ·  am selben Gerät") }),
      ]),
      el("div", { class: "btn-row" }, [
        el("button", { class: "btn btn-sm btn-outline", text: "Regeln", onclick: () => rulesDialog(meta) }),
        SS.isHost()
          ? el("button", { class: "btn btn-sm btn-outline", text: "Neue Partie", onclick: restartGame })
          : null,
        el("button", { class: "btn btn-sm btn-outline", text: "Verlassen", onclick: leaveGame }),
      ]),
    ]);
    const stage = el("div", { class: "stage", id: "stageHost" }, buildStage());
    const seatBar = seatSwitcher();
    return frag([head, seatBar, stage]);
  }

  /** Lokaler Modus, gleichzeitige Spiele: wessen Antwort wird gerade abgegeben? */
  function seatSwitcher() {
    if (SS.state.mode !== "local" || !SS.isSimultaneous() || SS.state.phase !== "playing") return null;
    const row = el("div", { class: "card", style: { marginBottom: "16px", padding: "14px 16px" } }, [
      el("div", { class: "eyebrow", text: "Wer hält gerade das Gerät?" }),
      el("div", { class: "btn-row" }, SS.state.players.map((p) =>
        el("button", {
          class: "btn btn-sm " + (SS.state.seat === p.id ? "btn-gold" : "btn-outline"),
          text: p.name,
          onclick: () => { SS.state.seat = p.id; renderCurrentGame(); },
        })
      )),
      el("p", { class: "muted", style: { margin: "8px 0 0", fontSize: "13px" }, text: "Tippt euren Namen an, bevor ihr antwortet. So landen die Punkte im richtigen Haus." }),
    ]);
    return row;
  }

  function buildStage() {
    const impl = SS.IMPL[SS.state.gameId];
    if (!impl) return el("p", { class: "muted", text: "Dieses Spiel ist nicht geladen." });
    // Der geteilte Zustand gehört noch zu einem anderen Spiel — nicht zeichnen.
    if (SS.state.phase === "playing" && SS.state.pub && SS.state.pub.game !== SS.state.gameId) {
      return el("div", { class: "center muted", style: { padding: "40px 0" }, text: "Die Runde wird vorbereitet …" });
    }
    const ctx = SS.makeCtx();
    try {
      const node = impl.render(ctx);
      return node || el("div");
    } catch (e) {
      console.error(e);
      return el("div", { class: "banner red", text: "Fehler beim Zeichnen des Spiels: " + e.message });
    }
  }

  /* ══ Abläufe ════════════════════════════════════════════════════════════ */
  function getName() {
    const n = (SS.LS.get("name", "") || "").trim();
    return n || "Spieler " + Math.floor(Math.random() * 90 + 10);
  }

  function openCreateDialog() {
    const nameInput = el("input", { type: "text", value: SS.LS.get("name", ""), maxlength: "22", placeholder: "Dein Name", dataset: { persist: "dlgName" } });
    const body = frag([
      el("p", { class: "lead", text: "Dein Gerät wird zum Host. Danach erscheint ein vierstelliger Code, den die anderen eintippen." }),
      el("label", { class: "field" }, [el("span", { text: "Dein Name" }), nameInput]),
      el("div", { class: "banner", text: "Alle Geräte brauchen für den Beitritt kurz eine Internetverbindung. Danach läuft der Datenverkehr direkt zwischen den Geräten." }),
    ]);
    SS.modal("Gruppe öffnen", body, [
      { label: "Abbrechen" },
      {
        label: "Gruppe öffnen", kind: "primary",
        onClick: () => {
          const nm = (nameInput.value || "").trim() || getName();
          SS.LS.set("name", nm);
          createGroup(nm);
          return true;
        },
      },
    ]);
  }

  function createGroup(nm) {
    SS.toast("Gruppe wird geöffnet …");
    SS.net.createGroup(nm)
      .then(() => { SS.LS.set("lastCode", SS.state.code); go("lobby"); SS.toast("Gruppe geöffnet. Code: " + SS.state.code, "ok"); })
      .catch((err) => {
        SS.toast(err.message, "err");
        SS.modal("Gruppe konnte nicht geöffnet werden", frag([
          el("p", { text: err.message }),
          el("div", { class: "banner", text: "Tipp: Wenn im Schulnetz keine WebRTC-Verbindungen erlaubt sind, spielt ihr einfach am selben Gerät. Alles funktioniert auch ohne Gruppe." }),
        ]), [
          { label: "Am selben Gerät spielen", kind: "primary", onClick: () => { startLocalFlow(nm); return true; } },
          { label: "Erneut versuchen", onClick: () => { createGroup(nm); return true; } },
          { label: "Schliessen" },
        ]);
      });
  }

  function openJoinDialog(prefill) {
    const codeInput = el("input", { class: "code-input", type: "text", inputmode: "latin", autocapitalize: "characters", autocomplete: "off", maxlength: "4", value: prefill || "", placeholder: "----" });
    const nameInput = el("input", { type: "text", value: SS.LS.get("name", ""), maxlength: "22", placeholder: "Dein Name", dataset: { persist: "dlgJoinName" } });
    const body = frag([
      el("p", { class: "lead", text: "Gib den Code ein, den der Host zeigt." }),
      el("label", { class: "field" }, [el("span", { text: "Gruppencode" }), codeInput]),
      el("label", { class: "field" }, [el("span", { text: "Dein Name" }), nameInput]),
      el("div", { class: "banner", text: "Achte auf Gross- und Kleinschreibung nicht — der Code wird automatisch gross geschrieben." }),
    ]);
    const box = SS.modal(SS.state.connection === "offline" ? "Mit Code beitreten" : "Mit Code beitreten", body, [
      { label: "Abbrechen" },
      {
        label: "Beitreten", kind: "primary",
        onClick: () => {
          const code = codeInput.value.trim().toUpperCase();
          const nm = (nameInput.value || "").trim() || getName();
          SS.LS.set("name", nm);
          joinGroup(code, nm);
          return true;
        },
      },
    ]);
    setTimeout(() => { if (!prefill) codeInput.focus(); }, 60);
    return box;
  }

  function joinGroup(code, nm) {
    SS.toast("Verbindung wird aufgebaut …");
    SS.net.joinGroup(code, nm)
      .then(() => { SS.LS.set("lastCode", code); go("lobby"); SS.toast("Beigetreten: Gruppe " + SS.state.code, "ok"); })
      .catch((err) => {
        SS.toast(err.message, "err");
        SS.modal("Beitritt nicht möglich", frag([
          el("p", { text: err.message }),
          el("ul", {}, [
            el("li", { text: "Ist der Code richtig abgetippt?" }),
            el("li", { text: "Ist die Gruppe am Host-Gerät noch offen?" }),
            el("li", { text: "Haben beide Geräte Internet?" }),
          ]),
        ]), [
          { label: "Nochmal", kind: "primary", onClick: () => { openJoinDialog(code); return true; } },
          { label: "Schliessen" },
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
    SS.addPlayer(SS.LS.get("name", "") || "Spieler 1", { id: "p1", isHost: true });
    SS.addPlayer("Spieler 2", { id: "p2" });
    SS.state.me = null;
    SS.net.setStatus("offline");
    go("lobby");
  }

  function addLocalPlayerDialog() {
    const input = el("input", { type: "text", maxlength: "22", placeholder: "Name", dataset: { persist: "addP" } });
    SS.modal("Spieler hinzufügen", frag([
      el("label", { class: "field" }, [el("span", { text: "Name" }), input]),
      el("p", { class: "muted", text: SS.state.mode === "online" ? "Am selben Gerät kannst du zusätzliche Spieler anlegen, die sich das Gerät teilen." : "" }),
    ]), [
      { label: "Abbrechen" },
      { label: "Hinzufügen", kind: "primary", onClick: () => {
          const n = (input.value || "").trim(); if (!n) return false;
          SS.addPlayer(n, {});
          if (SS.isHost()) SS.sync();
          render();
          return true;
        } },
    ]);
    setTimeout(() => input.focus(), 60);
  }

  function openGame(id) {
    const meta = SS.getMeta(id);
    if (!meta) return;
    if (SS.state.mode === "local" && !SS.state.players.length) {
      // Spielerzahl aus Meta ableiten
      SS.addPlayer(SS.LS.get("name", "") || "Spieler 1", { id: "p1", isHost: true });
      const min = Math.max(meta.minP || 2, 2);
      for (let i = 2; i <= min; i++) SS.addPlayer("Spieler " + i, { id: "p" + i });
      SS.state.me = null;
    }
    if (!SS.state.gameId) selectGame(id);
    else selectGame(id);

    const body = frag([
      el("p", { class: "lead", text: meta.glyph + "  " + meta.tagline }),
      el("div", { class: "tags", style: { marginBottom: "12px" } }, (meta.tags || []).map((t) => el("span", { class: "tag", text: TAGS[t] || t }))),
      el("div", { class: "banner", text: "Regeln: " + meta.rules }),
      meta.howto && meta.howto.length ? el("div", {}, [el("h3", { text: "So läuft es" }), el("ol", {}, meta.howto.map((h) => el("li", { text: h })))]) : null,
    ]);

    SS.modal(meta.name, body, [
      { label: "Schliessen" },
      { label: "Am selben Gerät", onClick: () => { startLocalFlow(); selectGame(id); return true; } },
      { label: "In Gruppe spielen", kind: "primary", onClick: () => {
          if (SS.state.mode === "online" && SS.state.role === "host") { selectGame(id); go("lobby"); return true; }
          if (SS.state.mode === "online" && SS.state.role === "guest") { SS.toast("Der Host wählt das Spiel.", "err"); return true; }
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
    SS.state.players.forEach((p) => (SS.state.priv[p.id] = {}));
    SS.logLine("Partie gestartet: " + meta.name, "ok");
    const impl = SS.IMPL[SS.state.gameId];
    if (impl && impl.init) { try { impl.init(ctx); } catch (e) { console.error(e); SS.toast("Startfehler: " + e.message, "err"); } }
    if (SS.isHost()) SS.sync();
    // Gäste müssen in die Spielansicht wechseln — der Zustand allein reicht nicht.
    if (SS.state.mode === "online" && SS.isHost()) SS.net.broadcast({ t: "start" });
    go("game");
    if (SS.state.mode === "online" && SS.state.role === "guest") SS.net.sendToHost({ t: "req" });
  }

  function restartGame() {
    SS.modal("Neue Partie?", frag([el("p", { text: "Der aktuelle Punktestand wird auf null gesetzt und das Spiel neu gemischt." })]), [
      { label: "Abbrechen" },
      { label: "Neu starten", kind: "primary", onClick: () => { startGame(); return true; } },
    ]);
  }

  function leaveGame() {
    SS.modal("Partie verlassen?", frag([
      el("p", { text: "Ihr kommt zurück in die Lobby. Die Gruppe bleibt bestehen." }),
    ]), [
      { label: "Weiter spielen" },
      { label: "Verlassen", kind: "primary", onClick: () => {
          SS.state.phase = "lobby";
          SS.state.turn = null;
          SS.state.pub = {};
          SS.state.priv = {};
          if (SS.isHost()) SS.sync();
          go("lobby");
          return true;
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
    ]), [{ label: "Verstanden", kind: "primary" }]);
  }

  /* ══ Hilfe ══════════════════════════════════════════════════════════════ */
  function helpDialog() {
    SS.modal("Anleitung", frag([
      el("h3", { text: "Gruppe eröffnen" }),
      el("ol", {}, [
        el("li", { text: "Ein Gerät wählt «Gruppe öffnen» und wird zum Host." }),
        el("li", { text: "Es zeigt einen vierstelligen Code, zum Beispiel K7QP." }),
        el("li", { text: "Alle anderen öffnen dieselbe Seite und tippen den Code ein." }),
      ]),
      el("h3", { text: "Ehrliche Antwort zur Verbindung" }),
      el("p", { text: "Für den Verbindungsaufbau braucht es kurz Internet: Die Geräte finden sich über einen öffentlichen Vermittlungsdienst und sprechen danach direkt miteinander (WebRTC). Ohne Internet — etwa im Flugmodus oder in einem WLAN ohne Uplink — könnt ihr trotzdem alles spielen, dann wird das Gerät einfach weitergereicht." }),
      el("p", { text: "Reines Bluetooth zwischen iPad und Android-Tablet ist im Browser leider nicht möglich. Das kann diese Seite nicht leisten, ohne dass ihr eine App installiert." }),
      el("h3", { text: "Ohne Internet, ohne Gruppe" }),
      el("p", { text: "Wähle «Am selben Gerät». Zwei bis zehn Personen spielen nacheinander an einem Bildschirm. Die Häuser zeigen, wer wie viele Punkte hat." }),
      el("h3", { text: "Kurzbefehle" }),
      el("p", {}, [el("span", { class: "kbd", text: "Esc" }), " schliesst Dialoge. ", el("span", { class: "kbd", text: "1" }), "–", el("span", { class: "kbd", text: "4" }), " wählt im Quiz eine Antwort."]),
    ]), [{ label: "Schliessen", kind: "primary" }]);
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
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { SS.toast("Kopieren nicht möglich. Bitte manuell abschreiben.", "err"); }
    ta.remove();
  }

  /* ══ Start ══════════════════════════════════════════════════════════════ */
  function initUI() {
    SS.$("#brandBtn").addEventListener("click", () => { if (SS.state.phase === "playing") leaveGame(); else go("home"); });
    SS.$("#helpBtn").addEventListener("click", helpDialog);

    SS.on("net", () => {
      // Bei Zustandswechsel in der Gruppe: Lobby oder Spiel neu zeichnen
      if (SS.state.route === "lobby" || SS.state.route === "game") render();
      else { renderMechanik(); updateStatusbar(); }
      if (window.__pendingGame && SS.state.role === "host") {
        selectGame(window.__pendingGame); window.__pendingGame = null; render();
      }
    });

    SS.on("log", () => {});

    // Kleiner Takt: bei online laufender Partie Ansicht aktualisieren
    setInterval(() => {
      if (SS.state.route === "game" && SS.state.phase === "playing") { /* Spiele zeichnen selbst */ }
      updateStatusbar();
    }, 2500);

    render();
  }

  /* Export */
  SS.setRenderCurrent(renderCurrentGame);
  SS.ui = {
    render, renderCurrent: renderCurrentGame, go, initUI, showScoreboard,
    copy, helpDialog, selectGame, startGame, openJoinDialog, openCreateDialog,
  };
})();
