# Seidla — die fränkische Wirtshausrunde

Ein Abend, eine Runde, jeder kriegt seine Aufgaben. Aufgaben für die Party,
das Fest, den Stammtisch — nachgewiesen mit einem Foto, am Ende von der Runde
bewertet.

**Spielen:** https://dealwirth.github.io/Schulspiele/

Läuft im Browser auf iPhone, iPad, Android-Tablet und Laptop. Keine
Installation, kein Konto, keine Werbung. Für Erwachsene gedacht.

## So läuft der Abend

**Aufmachen.** Der Wirt macht eine Runde auf und bekommt einen vierstelligen
Code. Der entsteht sofort, auch ohne Internet — der Abend ist also nie
blockiert. Dazu gibt es einen QR-Code: wer den scannt, landet direkt im
Beitritt, ohne etwas abzutippen.

**Beitreten.** Alle anderen treten mit dem Code bei. Der eigene Name bleibt
auf dem Gerät gespeichert — beim nächsten Mal steht er schon im Feld.

**Einstellen.** Nur der Wirt sieht die Einstellungen: Modus, Kategorien,
Aufgaben pro Person. Für alle anderen gibt es diese Ansicht gar nicht.

**Aufgaben bekommen.** 5 bis 10 pro Person, jede mit einer Zielperson, die
die Website selbst zieht. Dann teilt der Wirt aus — jeder hat seine Liste.

**Nachweisen.** Eine Aufgabe gilt erst als erledigt, wenn ein Foto da ist.
Das Handy öffnet die Kamera, das Bild wird verkleinert gespeichert.

**Bewerten.** Am Ende läuft die Gesamtwertung: die Runde bewertet die
Nachweise der anderen. Kippt die Mehrheit auf „gilt nicht", wird die Aufgabe
ungültig und die Punkte sind weg. Der Wirt kann das unterbinden.

## Die drei Modi

| Modus | Was drin steckt |
| --- | --- |
| 🌿 Entspannt | Harmlos. Für gemischte Runden, Kollegen, die erste Kirchweih. |
| 🔥 Hardcore | Es wird deutlich derber. Alle sollten wissen, worauf sie sich einlassen. |
| 💀 Vollsuff | Asozial, inklusive Kotzen. Nur für Runden, die das ausdrücklich wollen. |

Der Modus begrenzt, welche Aufgaben überhaupt vorkommen. Was zu hart ist,
lässt sich gar nicht erst anwählen.

## Die Kategorien

Der Wirt kann jede einzeln an- und abwählen:

| Kategorie | Was drin steckt |
| --- | --- |
| 🍻 Anstoßen | Mit einem gezogenen Mitspieler anstoßen |
| 😘 Küssen | Bussi auf Wange oder Stirn — nur wenn alle einverstanden sind |
| 🎩 Trick | Kunststück, Zungenbrecher, Geschicklichkeit |
| 🕺 Tanzen | Bewegen, tanzen, hinstellen |
| 🎤 Singen | Laut und schief |
| 💬 Reden | Gespräch anfangen oder halten |
| 📸 Foto & Pose | Ein Bild stellen |
| 🤝 Kontakt | Leute ansprechen, die man nicht kennt |
| 🔥 Mutprobe | Überwindung — aber harmlos |
| 🤪 Quatsch | Blödsinn mit Ansage |
| 🤮 Kotzen | Widerlich. Gehört zum Vollsuff — nüchtern bitte nicht. |

Über 100 Aufgaben stecken im Katalog. Die Platzhalter werden beim Austeilen
mit echten Namen gefüllt.

## Der Mitspieler wird gezogen, nicht gewählt

Bei Anstoßen, Küssen und allen anderen Aufgaben mit Zielperson bestimmt die
Website, mit wem man es zu tun hat. Man kann sich also nicht die beste
Freundin aussuchen und den Rest des Abends ignorieren. Dazu wird beim
Austeilen ein Ring gelegt: jeder bekommt mindestens eine Aufgabe, die auf
den Nächsten zeigt, ab vier Leuten auch eine auf den Vorherigen. So redet
die ganze Runde miteinander und niemand steht am Rand.

## Der Spielchat

Alle im Abend schreiben miteinander. Nachrichten laufen über den Wirt, damit
auch Gäste untereinander reden können. Ohne Netz wandern sie in den
Ausgangskorb und kommen später an.

## Sidequests

Extra-Aufgaben für zwischendurch. Die Runde schlägt sie selbst vor, der Wirt
gibt frei, dann zieht eine zufällige Person die Sidequest. Sie ist
ausdrücklich freiwillig — wer mitmacht, kassiert Extrapunkte.

## Ohne Netz

Das ist kein Notfallmodus, sondern eingeplant:

- Der Wirt bekommt seinen Code auch ohne Internet. Der Abend läuft am Gerät.
- Fällt die Verbindung mitten im Abend aus, geht alles weiter — Nachweise,
  Chat und Sidequests wandern in den Ausgangskorb.
- Was man ohne Netz macht, sieht man sofort am eigenen Gerät. Sobald wieder
  Empfang ist, schickt der Wirt seinen verbindlichen Stand nach.
- Der Wirt versucht von selbst alle 15 Sekunden, die Runde wieder erreichbar
  zu machen.

## Bleibt alles erhalten

Der Abend überlebt einen Neustart, einen leeren Akku und eine längere Pause:

- Jeder gespeicherte Stand bekommt eine **Signatur** aus einem Geräteschlüssel.
  Wer im Speicher herumpfuscht, ohne den Schlüssel zu kennen, macht den Stand
  ungültig — er wird verworfen statt still geladen.
- Derselbe Stand liegt zusätzlich in einem **Cookie**. Räumt Safari den
  localStorage auf, wird aus dem Cookie wiederhergestellt — und umgekehrt.
- Ein Abend-Stand passt nicht in ein Cookie (nur rund 4 KB). Deshalb wird er
  fürs Cookie eingekürzt: Aufgabentexte fallen weg und werden beim Laden aus
  Aufgabenkennung, Zielperson und Zufallskeim neu erzeugt. Passt selbst das
  nicht, bleiben Runde, Leute, Einstellungen und Keim — damit findet die
  Runde wieder zusammen und die Aufgaben lassen sich identisch neu austeilen.
- Der Wirt öffnet seine Runde beim nächsten Start mit demselben Code wieder.
  Gäste finden über den gespeicherten Code von selbst zurück.

Ehrlich dazugesagt: Das schützt gegen bequemes Beschummeln über die Konsole.
Wer das Gerät in der Hand hat, kann den Schlüssel lesen — dagegen hilft nur,
das Handy nicht aus der Hand zu geben.

## Der Wirt-Bereich

Zugang über „Wirt" in der Kopfzeile — **ohne Passwort**. Den Knopf sieht nur
der Wirt; für alle anderen existiert er nicht. Darin: Zwischenstand,
Teilnehmer verwalten, Aufgaben neu austeilen, Sidequests freigeben, die
Wertung steuern und der Bericht zum Kopieren.

## Was am Ende rauskommt

Eine Rangliste nach Punkten (ungültige Aufgaben zählen nicht), das Album mit
allen Nachweisen und ein Abendbericht zum Kopieren: wer wie viel geschafft
hat, welche Sidequests gelaufen sind und wer wen besucht hat.

## Technik

- **Ein Bundle.** `node build.js` packt HTML, CSS und alle Skripte in eine
  einzige `index.html`. Keine Abhängigkeiten zur Laufzeit.
- **Netzwerk.** PeerJS/WebRTC, Wirt-Gast-Stern. Der Wirt führt den Abend,
  Aktionen gehen über ihn. Der Broker ist nur zum Finden der Geräte nötig —
  er sieht keine Fotos und keine Nachrichten.
- **Speicher.** localStorage plus Cookie, signiert. Profil, Runde, laufender
  Abend, Ausgangskorb, Chat, Album, Chronik.
- **Determinismus.** Aufgaben werden aus einem festen Zufallskeim ausgeteilt.
  Wirt und Gäste sehen dieselbe Liste, ohne dass jede Aufgabe einzeln
  verschickt werden muss.
- **Fotos.** Auf 720 px verkleinert und als JPEG gespeichert. Läuft der
  Speicher voll, werden die ältesten Bilder geopfert statt den Abend zu
  blockieren.
- **QR-Code.** Aus der MIT-lizenzierten Bibliothek `qrcode-generator`,
  als SVG gezeichnet, damit er auf jedem Bildschirm scharf bleibt.
- **Kein Tracking.** Keine Analysedienste, kein Konto, keine fremden Server.

## Selbst bauen

```bash
node build.js                 # erzeugt index.html im Wurzelverzeichnis
python3 -m http.server 8765   # zum Ausprobieren
```

## Dateien

```
src/index.html           Hülle
src/css/seidla.css       Design: Wirtshaus, Kupfer, Bierfilz
src/js/app.js            Zustand, Aufgaben, Punkte, Wertung, Chat
src/js/tasks.js          Aufgabenkatalog, Kategorien, Modi
src/js/assign.js         Austeilen, Mitspieler ziehen, Ring-Vernetzung
src/js/proof.js          Fotonachweis: Aufnahme und Verkleinern
src/js/store.js          Speicher mit Signatur und Cookie, Album, Chat
src/js/qr.js             QR-Code für den Beitritt
src/js/net.js            Runde aufmachen, Beitritt, Sync, Nachreichen
src/js/ui.js             Ansichten: Lobby, Aufgaben, Chat, Wertung, Album, Wirt
src/js/boot.js           Start und Wiederherstellen
src/vendor/              PeerJS und qrcode-generator (MIT)
```

## Hinweis

Gedacht für Erwachsene. Die harten Modi sind ausdrücklich freiwillig — wer
nicht mag, wählt „Entspannt". Keine Aufgabe verlangt, sich zu verletzen oder
etwas gegen den eigenen Willen zu tun; alles geht auch mit Wasser statt
Alkohol. Wer eine Aufgabe nicht machen will, gibt sie weiter — ohne
Punktabzug.
