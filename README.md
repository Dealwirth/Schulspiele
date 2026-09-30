# Seidla — die fränkische Wirtshausrunde

A Partyspiel-Sammlung für den Samstagabend, den Stammtisch und die ganze
Wirtshausrunde. Läuft im Browser auf iPhone, iPad, Android-Tablet und Laptop —
ohne Installation, ohne Konto, ohne Werbung.

**Spielen:** https://dealwirth.github.io/Schulspiele/

Zwei bis hundert Leut, zehn Spiele, ein Abend. Für 18 Jahre und älter gedacht.

## Drei Wege zu spielen

**Runde aufmachen (online).** Ein Gerät wird der Wirt und zeigt einen
vierstelligen Code, zum Beispiel `K7QP`. Alle anderen tippen den Code unter
„Mit Code nei" ein und spielen auf ihrem eigenen Bildschirm. Der Aufbau läuft
über WebRTC (PeerJS), danach reden die Geräte direkt miteinander. Ein
Internetzugang ist für den Verbindungsaufbau nötig.

**Am selben Gerät.** Das Gerät wandert von Hand zu Hand. Bei Spielen, wo alle
gleichzeitig antworten, tippt jeder vorher seinen Namen an, damit die Punkte im
richtigen Haus landen.

**Ohne Netz weiterspielen.** Reißt die Verbindung ab, läuft der Abend trotzdem
weiter. Was passiert ist, wandert in den Ausgangskorb und wird automatisch
nachgereicht, sobald wieder Netz da ist — der Wirt sieht dann in der Chronik,
was in der Zwischenzeit gespielt wurde.

> Reines Bluetooth zwischen iPhone und Android ist im Browser nicht möglich.
> WebRTC ist der plattformübergreifende Weg, den iOS und Android beide erlauben.
> Ohne Internet bleibt der Modus „Am selben Gerät".

## Die Spiele

| Spiel | Leut | Art |
| --- | --- | --- |
| Ich hab noch nie | 2–100 | Klassiker zum Einstieg |
| Wer würde eher | 3–100 | Abstimmung, große Runde |
| Wahrheit oder Pflicht | 2–100 | Klassiker |
| Flaschendrehen | 3–100 | Aufgabe für eine Person |
| Bumm (Bombenspiel) | 3–100 | Action, alle gleichzeitig |
| Reaktionsduell | 2–100 | Wer war zuerst |
| Franken-Quiz | 2–100 | Wissen, Dialekt und Bräuche |
| Zungenbrecher | 2–100 | Wort, laut |
| Turnierbaum | 4–64 | Wettkampf bis zum Sieger |
| Chronik | — | Wirtshausbuch mit Auswertung |

Dazu im Hintergrund: Punkte über alle Runden, Schluck- oder Aufgabenstrafen
(einstellbar), ein Abendbericht zum Kopieren und die Wirtshaus-Chronik.

## Der Wirt-Bereich

Der Wirt leitet den Abend. Zugang über „Wirt" in der Kopfzeile mit dem
Schlüssel `135LowLap`. Damit lässt sich die Runde umbenennen, der Punktestand
zurücksetzen, Teilnehmer entfernen und am Schluss der Abendbericht
zusammenstellen.

Ehrlich gesagt: Das ist ein Wirtshaus-Schlüssel, kein Banktresor. Die Seite
läuft ohne Server im Browser, also findet jeder, der sich auskennt, den
Schlüssel im Quelltext. Er hält die Runde davon ab, versehentlich im Management
zu landen — mehr soll er nicht.

## Was am Ende rauskommt

Die Chronik sammelt jeden Abend: wer gewonnen hat, wer wie oft einen Schluck
kassiert hat, welche Spiele liefen. Daraus entsteht der Abendbericht — eine
Textzusammenfassung zum Kopieren und in die Gruppe schicken.

Eine Bilderbuch- oder KI-Auswertung ist bewusst noch nicht drin. Die Chronik
ist so gebaut, dass sie sich später anhängen lässt.

## Technik

- **Ein Bundle.** `node build.js` packt HTML, CSS und alle Skripte in eine
  einzige `index.html` im Wurzelverzeichnis. Keine Abhängigkeiten zur Laufzeit.
- **Netzwerk.** PeerJS/WebRTC, Wirt-Gast-Stern. Spielzustand läuft über den Wirt.
- **Speicher.** localStorage: Profil, Runde, laufende Sitzung, Ausgangskorb,
  Chronik. Der Ausgangskorb überlebt Neustarts.
- **Determinismus.** Karten, Würfe und Auslosungen hängen an einem Seed, damit
  alle Geräte dasselbe sehen, ohne jede Aktion zu übertragen.
- **Kein Tracking.** Keine Cookies, keine Analysedienste, kein Konto.

## Selbst bauen

```bash
node build.js          # erzeugt index.html im Wurzelverzeichnis
```

Zum Ausprobieren genügt ein statischer Server im Wurzelverzeichnis:

```bash
python3 -m http.server 8765
```

## Dateien

```
src/index.html           Hülle (Kopfzeile, Ansichten, Dialoge)
src/css/seidla.css       Design: Wirtshaus, Kupfer, Bierfilz
src/js/app.js            Zustand, Punkte, Aktionen, Dialoge, Hilfsfunktionen
src/js/store.js          Speicher, Ausgangskorb, Chronik, Auswertung
src/js/net.js            Runde aufmachen, Beitritt, Sync, Nachreichen
src/js/ui.js             Ansichten, Katalog, Lobby, Spielansicht, Wirt-Bereich
src/js/boot.js           Start, Wiederherstellen, automatisches Nachreichen
src/js/games/content.js  Texte, Karten, Fragen
src/js/games/registry.js Katalog und Einstellungen
src/js/games/party.js    Ich hab noch nie, Wer würde eher, Wahrheit/Pflicht, Flaschendrehen
src/js/games/action.js   Bumm, Reaktionsduell, Franken-Quiz, Zungenbrecher, Turnierbaum
src/js/games/util.js     Hilfen für die Spielmodule
```

## Hinweis

Gedacht für Erwachsene. Es gibt einen Wasser-Modus für alle, die nichts
trinken — die Strafen sind auf der Startseite umstellbar.
