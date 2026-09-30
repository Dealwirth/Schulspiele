# Seidla — die fränkische Wirtshausrunde

Ein Abend, eine Runde, jeder kriegt seine Aufgaben. Kein Minispielkram:
Aufgaben für die Party, das Fest, den Stammtisch — nachgewiesen mit einem Foto.

**Spielen:** https://dealwirth.github.io/Schulspiele/

Läuft im Browser auf iPhone, iPad, Android-Tablet und Laptop. Keine
Installation, kein Konto, keine Werbung. Für Erwachsene gedacht.

## So läuft der Abend

**Beitreten.** Der Wirt macht eine Runde auf und bekommt einen vierstelligen
Code. Alle anderen treten mit dem Code bei. Der eigene Name bleibt auf dem
Gerät gespeichert — beim nächsten Mal steht er schon im Feld.

**Aufgaben bekommen.** Der Wirt wählt aus, welche Aufgabentypen in Frage
kommen, wie derb es werden darf und wie viele Aufgaben jeder bekommt
(5 bis 10). Dann teilt er aus — jeder hat seine eigene Liste.

**Nachweisen.** Eine Aufgabe gilt erst als erledigt, wenn ein Foto da ist.
Das Handy öffnet die Kamera, das Bild wird verkleinert gespeichert. Der Wirt
gibt frei oder lehnt ab.

**Vernetzt.** Die meisten Aufgaben hängen an einer anderen Person: *„Stoß mit
Resi an"*, *„Bring Kalle dazu, mit dir zu tanzen"*. Beim Austeilen wird ein
Ring gelegt, damit jeder mindestens einmal besucht wird — so redet die ganze
Runde miteinander und niemand steht am Rand.

## Die Aufgabentypen

Der Wirt kann jeden Typ einzeln an- und abwählen:

| Typ | Was drin steckt |
| --- | --- |
| 🍻 Anstoßen | Mit jemandem anstoßen, Beweisfoto |
| 🥤 Trinken | Ein Schluck auf Kommando |
| 💬 Reden | Ein Gespräch anfangen oder halten |
| 🕺 Bewegung | Tanzen, hüpfen, hinstellen |
| 📸 Foto & Pose | Ein Bild stellen |
| 🎤 Singen | Laut und schief |
| 🤝 Kontakt | Leute ansprechen, die man nicht kennt |
| 🔥 Mut | Überwindung, aber harmlos |
| 🤪 Quatsch | Blödsinn mit Ansage |
| 💥 Wild | Für die, die es wissen wollen |

Dazu ein Schieberegler für die Härte: nur harmlos, bis ordentlich oder bis
wild. Über 80 Aufgaben stecken im Katalog, jede mit Platzhaltern, die beim
Austeilen mit echten Namen gefüllt werden.

## Sidequests

Extra-Aufgaben für zwischendurch. Die Runde schlägt sie selbst vor, der Wirt
gibt frei, was in Ordnung geht. Dann zieht eine zufällige Person die Sidequest.
Sie ist ausdrücklich freiwillig — wer mitmacht, kassiert Extrapunkte, wer nicht,
auch kein Drama.

## Ohne Netz

Fällt die Verbindung aus, geht der Abend am Gerät weiter. Nachweise und
Sidequests wandern in einen Ausgangskorb und gehen automatisch raus, sobald
wieder Empfang da ist. Der Wirt sieht danach, was in der Zwischenzeit passiert
ist. Nach einem Neustart findet ein Gast über den gespeicherten Code von selbst
zurück in die Runde.

## Der Wirt-Bereich

Zugang über „Wirt" in der Kopfzeile mit dem Schlüssel `135LowLap`. Darin:
Zwischenstand, Teilnehmer verwalten, Aufgaben neu austeilen, Sidequests
freigeben, Abend abschließen und der Bericht zum Kopieren.

Ehrlich gesagt: Das ist ein Wirtshaus-Schlüssel, kein Banktresor. Die Seite
läuft ohne Server im Browser, also steht der Schlüssel im Quelltext. Er hält
die Runde davon ab, versehentlich im Management zu landen — mehr soll er nicht.

## Was am Ende rauskommt

Eine Rangliste nach Punkten, das Album mit allen Nachweisen des Abends und ein
Abendbericht zum Kopieren: wer wie viel geschafft hat, welche Sidequests
gelaufen sind und wer wen besucht hat.

## Technik

- **Ein Bundle.** `node build.js` packt HTML, CSS und alle Skripte in eine
  einzige `index.html`. Keine Abhängigkeiten zur Laufzeit.
- **Netzwerk.** PeerJS/WebRTC, Wirt-Gast-Stern. Der Wirt führt den Abend,
  Aktionen gehen über ihn.
- **Speicher.** localStorage: Profil, Runde, laufender Abend, Ausgangskorb,
  Album. Alles überlebt einen Neustart.
- **Determinismus.** Aufgaben werden aus einem festen Zufallskeim ausgeteilt.
  Wirt und Gäste sehen dieselbe Liste, ohne dass jede Aufgabe einzeln
  verschickt werden muss.
- **Fotos.** Auf 720 px verkleinert und als JPEG gespeichert. Läuft der
  Speicher voll, werden die ältesten Bilder geopfert statt den Abend zu
  blockieren.
- **Kein Tracking.** Keine Cookies, keine Analysedienste, kein Konto.

## Selbst bauen

```bash
node build.js          # erzeugt index.html im Wurzelverzeichnis
python3 -m http.server 8765   # zum Ausprobieren
```

## Dateien

```
src/index.html           Hülle
src/css/seidla.css       Design: Wirtshaus, Kupfer, Bierfilz
src/js/app.js            Zustand, Aufgaben, Punkte, Auswertung
src/js/tasks.js          Aufgabenkatalog und Typen
src/js/assign.js         Austeilen und Ring-Vernetzung
src/js/proof.js          Fotonachweis: Aufnahme und Verkleinern
src/js/store.js          Speicher, Ausgangskorb, Album, Chronik
src/js/net.js            Runde aufmachen, Beitritt, Sync, Nachreichen
src/js/ui.js             Ansichten: Beitreten, Aufgaben, Sidequests, Album, Wirt
src/js/boot.js           Start und Wiederherstellen
```

## Hinweis

Gedacht für Erwachsene. Es gibt einen Wasser-Modus für alle, die nichts
trinken. Jede Aufgabe darf an eine Vertrauensperson weitergegeben werden —
niemand wird bloßgestellt.
