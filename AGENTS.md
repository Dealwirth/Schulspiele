# Hinweise für die Arbeit an diesem Projekt

## Was das ist

Seidla — ein browserbasiertes Aufgaben-Partyspiel für Erwachsene. Kein
Server, kein Konto. Ein Wirt macht eine Runde auf, die Gäste treten mit
einem vierstelligen Code bei, jeder bekommt 5 bis 10 Aufgaben und weist
sie mit einem Foto nach.

## Bauen und prüfen

```bash
node build.js                  # src/ → index.html (ein einziges Bundle)
python3 -m http.server 8765    # zum Ausprobieren
```

`index.html` ist **generiert**. Nie direkt bearbeiten — immer in `src/`
ändern und neu bauen. Wer `index.html` anfasst, verliert die Änderung
beim nächsten Build.

Nach jeder Änderung: `for f in src/js/*.js build.js; do node --check "$f"; done`

## Ladereihenfolge

`app.js` → `tasks.js` → `assign.js` → `proof.js` → `store.js` → `net.js`
→ `ui.js` → `boot.js`. Die Reihenfolge steht in `src/index.html` und in
`build.js` (SCRIPTS) — beide Stellen müssen zusammenpassen.

`app.js` legt `window.SS` an, alles andere hängt sich daran. Jedes Modul
ist eine IIFE im Strict Mode.

## Fallen, in die man hier schon getappt ist

- **`btn()` in ui.js braucht `opts.id`.** Ohne das gibt es kein
  `#wirtBtn` und jeder Test, der darauf klickt, läuft in einen Timeout.
- **Ringindex ≠ Position in `ids`.** `assign.js` legt `succOf`/`predOf`
  getrennt vom gemischten Ring. Wer beides vermischt, baut Aufgaben, bei
  denen jemand sich selbst besuchen muss.
- **`actAs` statt `applyAction` in der UI.** `actAs` führt beim Wirt und
  in der lokalen Runde direkt aus und schickt bei Gästen an den Wirt.
  Beides aufzurufen führt jede Aktion doppelt aus.
- **`dealTasks()` schickt den Stand selbst raus.** Nicht beim Aufrufer
  nochmal `sync()` oder `broadcast` dranhängen.
- **Ohne-Netz-Test muss `net.sendToHost` kappen.** Nur
  `state.connection = 'lost'` zu setzen reicht nicht — die echte
  WebRTC-Verbindung bleibt offen und die Nachricht geht live durch.
- **PeerJS im Test.** `SS.net.available()` vorher prüfen; ohne Broker
  den Online-Teil überspringen statt fehlschlagen zu lassen.

## Speicherformat

`store.js` hat `const V = 3`. Bei Änderungen an `snapshot()` oder am
Session-Format die Version hochsetzen — alte Stände werden dann
verworfen, statt halb kaputt geladen zu werden.

## Tests

`_*.mjs` sind Prüfskripte gegen `playwright-core` und `/usr/bin/chromium`.
Sie sind per `.gitignore` ausgenommen und gehören nicht ins Repository.
Brauchbar sind: `_test.mjs` (40 Prüfungen am Gerät), `_online.mjs` (echter
Wirt-Gast-Betrieb über PeerJS), `_live.mjs` (gegen GitHub Pages).

Der Wirt-Schlüssel ist `135LowLap`. Er steht bewusst im Quelltext: die
Seite läuft ohne Server, also gibt es nichts, wo man ihn verstecken
könnte. Er soll nur verhindern, dass jemand versehentlich im
Verwaltungsbereich landet.

## Veröffentlichen

Branch `main`, GitHub Pages. Nach dem Push etwa eine Minute warten, dann
`https://dealwirth.github.io/Schulspiele/` prüfen.
