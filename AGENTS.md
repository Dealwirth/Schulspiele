# Hinweise für die Arbeit an diesem Projekt

## Was das ist

Seidla — ein browserbasiertes Aufgaben-Partyspiel für Erwachsene. Kein
Server, kein Konto. Ein Wirt macht eine Runde auf, die Gäste treten mit
einem vierstelligen Code oder per QR-Scan bei, jeder bekommt 5 bis 10
Aufgaben und weist sie mit einem Foto nach. Am Ende bewertet die Runde die
Nachweise.

## Bauen und prüfen

```bash
node build.js                  # src/ → index.html (ein einziges Bundle)
python3 -m http.server 8765    # zum Ausprobieren
```

`index.html` ist **generiert**. Nie direkt bearbeiten — immer in `src/`
ändern und neu bauen. Wer `index.html` anfasst, verliert die Änderung beim
nächsten Build.

Nach jeder Änderung: `for f in src/js/*.js build.js; do node --check "$f"; done`

## Ladereihenfolge

`app.js` → `tasks.js` → `assign.js` → `proof.js` → `store.js` → `qr.js` →
`net.js` → `ui.js` → `boot.js`. Die Reihenfolge steht in `src/index.html` und
in `build.js` (SCRIPTS) — beide Stellen müssen zusammenpassen.

`app.js` legt `window.SS` an, alles andere hängt sich daran. Jedes Modul ist
eine IIFE im Strict Mode. `store.js` braucht `SS.tasks` und
`SS.assign.render` erst beim Lesen der Kurzform, nicht beim Laden.

## Fallen, in die man hier schon getappt ist

- **`btn()` in ui.js braucht `opts.id`.** Ohne das gibt es kein `#wirtBtn`
  und jeder Test, der darauf klickt, läuft in einen Timeout.
- **Der Wirt-Knopf hängt an `phase !== "lobby" && SS.isHost()`.** `role` ist
  standardmäßig `"solo"`, und `isHost()` ist für `solo` wahr. Ohne die
  Phasenprüfung erscheint der Wirt-Knopf auf der Startseite.
- **`raw()` in store.js gab es mal mit Doppelbedeutung.** `raw(key, null)`
  schrieb `null`, statt zu lesen — dadurch wurde der Geräteschlüssel bei
  jedem Aufruf neu erzeugt und keine Signatur passte mehr. Jetzt gibt es
  getrennte `rawRead` und `rawWrite`. Nie wieder zusammenlegen.
- **Cookies fassen nur rund 4090 Bytes.** Ein Abend-Stand ist schon mit zwei
  Leuten 3 KB roh, URL-kodiert deutlich mehr. Deshalb `compactSession()`
  (Aufgabentexte fallen weg, werden aus Aufgabenkennung + Ziel + Keim neu
  erzeugt) und als letzte Stufe `leanSession()`. **Nach jedem `setCookie`
  zurücklesen und die Signatur vergleichen** — ein still verworfenes Cookie
  darf nicht als gesichert gelten.
- **Der Geräteschlüssel muss aus dem Cookie zurückkommen.** Sonst ist nach
  dem Aufräumen des localStorage jeder Stand ungültig.
- **`actAs` statt `applyAction` in der UI.** `actAs` führt beim Wirt und in
  der lokalen Runde direkt aus und schickt bei Gästen an den Wirt. Beides
  aufzurufen führt jede Aktion doppelt aus.
- **Gast ohne Netz muss lokal ausführen.** `actAs` ruft bei fehlender
  Verbindung `applyAction` am eigenen Gerät auf, sonst sieht der Gast nach
  dem Foto nichts und fotografiert doppelt. Der Wirt-Stand überschreibt das
  später.
- **`dealTasks()` schickt den Stand selbst raus.** Nicht beim Aufrufer noch
  `sync()` oder `broadcast` dranhängen.
- **Ohne-Netz-Test muss `net.sendToHost` kappen.** Nur
  `state.connection = 'lost'` zu setzen reicht nicht — die echte
  WebRTC-Verbindung bleibt offen und die Nachricht geht live durch.
- **Der Modus deckelt die Härte.** `deal()` nimmt `Math.min(mode.level,
  settings.maxLevel)`. Wer das entfernt, kann sich per Konsole Vollsuff-
  Aufgaben in einer entspannten Runde holen.
- **`createGroup` ist synchron und wirft nicht.** Der Code entsteht lokal,
  die Broker-Verbindung läuft im Hintergrund mit `scheduleRetry`. Nie wieder
  ein Promise daraus machen, das auf den Broker wartet — dann blockiert der
  Abend ohne Netz.
- **PeerJS im Test.** `SS.net.available()` vorher prüfen; ohne Broker den
  Online-Teil überspringen statt fehlschlagen zu lassen.

## Speicherformat

`store.js` hat `const V = 4`. Bei Änderungen an `snapshot()`, an
`compactSession()` oder am Session-Format die Version hochsetzen — alte
Stände werden dann verworfen, statt halb kaputt geladen zu werden.

Kurzform und Langform: `compactSession` schreibt `a` (Aufgabenliste) bzw.
`lean`; `normalizeSession` erkennt beides und `expandSession` baut daraus
einen vollen Abend. Wenn dort ein Feld dazukommt, muss es in beide
Richtungen.

## Tests

`_*.mjs` sind Prüfskripte gegen `playwright-core` und `/usr/bin/chromium`.
Sie sind per `.gitignore` ausgenommen und gehören nicht ins Repository.

- `_test.mjs` — 55 Prüfungen am Gerät: Startseite, Code ohne Netz, Modi,
  gezogene Mitspieler, Chat, Wertung inklusive Wirt-Übersteuerung,
  Einstellungen nur für den Wirt, QR-Code, Beitrittslink, Speicher
  (signiert, gefälscht, Cookie-Rettung, Neustart), Layout, 100 Leute.
- `_online.mjs` — 29 Prüfungen im echten Wirt-Gast-Betrieb über PeerJS mit
  zwei Browsern: Beitritt, Aufgaben, Fotonachweis, Freigabe, Chat in beide
  Richtungen, Wertung, Wiedereintritt nach Neustart, Nachreichen ohne Netz,
  und eine Runde mit 100 Leuten, deren Zustand durch den Kanal muss.
- `_photos.mjs` — Fotos zwischen drei Geräten über echtes PeerJS: großer
  Upload, Album bei allen gleich, Nachzügler bekommt alles nach.
- `_repro.mjs` — die beiden gemeldeten Fehler (Gast-Foto kommt nicht an,
  Album zeigt keine Bilder).
- `_live.mjs` — dasselbe gegen GitHub Pages.
- `_dbg.mjs` — Wegwerfskript zum Nachschauen.

## Nachrichten und Bilder

Der Datenkanal nimmt rund 16 KB je Nachricht. Alles darüber — ein Bild, aber
auch der Zustand einer großen Runde — wird in `push()` gestückelt und in
`takeBig()` wieder zusammengesetzt. Wer daran arbeitet: `onData()` fängt die
Stücke ab, bevor sie an die Handler gehen.

Bilder laufen immer über den Wirt, der sie ablegt und an alle ausser den
Absender weiterreicht. Die Aufgabe merkt sich nur die Kennung des Bildes; das
Bild selbst liegt im Album. Deshalb darf eine Aufgabenkarte nie das Bild
mitschicken.

Der QR-Code wird nicht nur auf „sieht aus wie ein QR-Code" geprüft, sondern
mit einem echten Decoder gelesen:

```bash
pip install pyzbar pillow && sudo apt-get install -y libzbar0
python3 -c "from PIL import Image; from pyzbar.pyzbar import decode; print(decode(Image.open('/tmp/qr_check.png'))[0].data)"
```

## Veröffentlichen

Branch `main`, GitHub Pages. Nach dem Push etwa eine Minute warten, dann
`https://dealwirth.github.io/Schulspiele/` prüfen.
