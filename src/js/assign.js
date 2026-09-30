/* ==========================================================================
   Seidla — Aufgaben austeilen
   Jeder bekommt für den Abend eine Handvoll Aufgaben. Aufgaben, die an einer
   anderen Person hängen ("{ziel}"), bekommen ihren Mitspieler von hier
   zugeteilt — nicht von der Person gewählt. So landet jeder auch mal bei
   jemandem, den er sonst den ganzen Abend nicht ansprechen würde.

   Damit niemand am Rand steht, wird zusätzlich ein Ring gelegt: Jeder
   bekommt mindestens eine Aufgabe, die auf den Nächsten im Ring zeigt, und
   ab vier Leuten auch eine auf den Vorherigen.

   Alles läuft über einen festen Zufallskeim, damit Wirt und Gäste dieselben
   Aufgaben sehen, ohne dass jede Aufgabe einzeln verschickt werden muss.
   ========================================================================== */
(function () {
  "use strict";
  const SS = window.SS;
  const T = () => SS.tasks;

  const POINTS_BY_LEVEL = { 1: 1, 2: 2, 3: 3 };
  const pointsFor = (level) => POINTS_BY_LEVEL[level] || 1;

  const hasZiel = (text) => /\{ziel\}/.test(text);

  /** Aufgabe in lesbaren Text verwandeln: {ziel} und {zahl} einsetzen. */
  function render(text, targetName, rng) {
    let out = String(text);
    out = out.replace(/\{ziel\}/g, targetName || "jemand aus der Runde");
    out = out.replace(/\{zahl\}/g, () => String(2 + Math.floor((rng ? rng() : Math.random()) * 4)));
    return out;
  }

  /**
   * Aufgaben für einen Abend austeilen.
   *
   * players  : [{id,name,...}]
   * settings : { perPlayer, modeId, maxLevel, types:[...], seed }
   * Rückgabe : { ring:[pid], byPlayer:{ pid:[aufgabe] } }
   */
  function deal(players, settings) {
    settings = settings || {};
    const list = players.filter((p) => p.connected !== false);
    const ids = list.map((p) => p.id);
    const nameOf = (id) => { const p = list.find((x) => x.id === id); return p ? p.name : "jemand"; };
    const rng = SS.seededRng(settings.seed || "seidla");
    const byPlayer = {};
    ids.forEach((id) => (byPlayer[id] = []));
    if (!ids.length) return { ring: [], byPlayer: byPlayer };

    const wanted = SS.clamp(Number(settings.perPlayer) || 7, 5, 10);
    // Der Modus setzt die Härtegrenze. Ein Modus kann nur verschärfen, nie
    // über sich hinaus: bei "entspannt" bleibt es harmlos, auch wenn jemand
    // per Hand etwas anderes in die Einstellungen schreibt.
    const mode = T().modeById(settings.modeId || "entspannt");
    const maxLevel = Math.min(mode.level, Number(settings.maxLevel) || mode.level);
    const types = (settings.types && settings.types.length) ? settings.types : T().TYPES.map((t) => t.id);

    // Vorrat: nur gewählte Kategorien, nur bis zur Härtegrenze.
    let pool = T().TASKS.filter((t) => types.indexOf(t.type) !== -1 && t.level <= maxLevel);
    // Ganz kleine Runden: Aufgaben mit Mitspieler fallen weg, sonst wird's sinnlos.
    if (ids.length < 2) pool = pool.filter((t) => !hasZiel(t.text));
    if (!pool.length) pool = T().TASKS.filter((t) => t.level <= maxLevel && !hasZiel(t.text));
    if (!pool.length) pool = T().TASKS.filter((t) => !hasZiel(t.text));

    const withZiel = pool.filter((t) => hasZiel(t.text));
    const withoutZiel = pool.filter((t) => !hasZiel(t.text));

    // Ring legen — der rote Faden des Abends.
    const ring = SS.shuffle(ids, rng);
    // Nachfolger und Vorgänger aus dem Ring ableiten. Wichtig: die Position im
    // Ring hat nichts mit der Position in ids zu tun, sonst zeigt eine Aufgabe
    // auf den Verfasser selbst.
    const succOf = {};
    const predOf = {};
    ring.forEach((pid, k) => {
      succOf[pid] = ring[(k + 1) % ring.length];
      predOf[pid] = ring[(k - 1 + ring.length) % ring.length];
    });

    const usedGlobal = {};
    const takeOnce = (arr) => {
      const fresh = arr.filter((t) => !usedGlobal[t.id]);
      if (fresh.length) { const t = fresh[Math.floor(rng() * fresh.length)]; usedGlobal[t.id] = true; return t; }
      // Vorrat erschöpft: Wiederholung bei anderen Personen ist verkraftbar.
      if (!arr.length) return null;
      return arr[Math.floor(rng() * arr.length)];
    };

    /** Eine andere Person als pid — hier wird der Mitspieler gezogen. */
    const otherThan = (pid) => {
      if (ids.length < 2) return null;
      const others = ids.filter((x) => x !== pid);
      return others[Math.floor(rng() * others.length)];
    };

    const make = (task, targetId) => ({
      aid: SS.uid(8),
      taskId: task.id,
      type: task.type,
      level: task.level,
      target: targetId || null,
      points: pointsFor(task.level),
      text: render(task.text, targetId ? nameOf(targetId) : null, rng),
      done: false,
      at: null,
      photo: null,          // Foto liegt im Album, hier nur die Kennung
      confirmed: false,
      flagged: 0,           // Stimmen gegen diese Aufgabe (siehe Wertung)
      flagBy: [],
    });

    ids.forEach((pid) => {
      // Der Ring zuerst: je eine Aufgabe auf Nachfolger und Vorgänger.
      if (ids.length >= 2 && withZiel.length) {
        const succ = succOf[pid];
        const t = takeOnce(withZiel);
        if (t) byPlayer[pid].push(make(t, succ));
        if (ids.length >= 4 && wanted >= 5 && withZiel.length > 1) {
          const pred = predOf[pid];
          if (pred !== succ) {
            const t2 = takeOnce(withZiel);
            if (t2) byPlayer[pid].push(make(t2, pred));
          }
        }
      }
      // Rest auffüllen. Aufgaben mit Mitspieler sind der Kern des Abends,
      // deshalb bekommen sie hier den Vorzug.
      let guard = 0;
      while (byPlayer[pid].length < wanted && guard++ < wanted * 8) {
        const needsTargetSoon = byPlayer[pid].length < 2 && ids.length >= 2;
        if (ids.length >= 2 && withZiel.length && (needsTargetSoon || rng() < 0.6)) {
          const task = takeOnce(withZiel);
          if (task) { byPlayer[pid].push(make(task, otherThan(pid))); continue; }
        }
        const task = takeOnce(withoutZiel.length ? withoutZiel : pool);
        if (task) {
          byPlayer[pid].push(make(task, hasZiel(task.text) ? otherThan(pid) : null));
        } else break;
      }
    });

    return { ring: ring, byPlayer: byPlayer };
  }

  /** Wie viele Aufgaben hängen an einer Person? (für die Netz-Anzeige) */
  function targetsOf(byPlayer) {
    const incoming = {};
    Object.keys(byPlayer).forEach((pid) => {
      byPlayer[pid].forEach((a) => { if (a.target) incoming[a.target] = (incoming[a.target] || 0) + 1; });
    });
    return incoming;
  }

  /** Wurde jemand von keinem einzigen Auftrag besucht? Dann stimmt was nicht. */
  function lonelyPlayers(players, byPlayer) {
    const incoming = targetsOf(byPlayer);
    return players.filter((p) => p.connected !== false && !incoming[p.id]).map((p) => p.id);
  }

  SS.assign = { deal, render, pointsFor, targetsOf, lonelyPlayers, hasZiel };
})();
