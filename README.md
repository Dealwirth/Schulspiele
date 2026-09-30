# Schulspiele

Klassische Spiele fuer die Pause und den Unterricht. Laeuft im Browser auf
iPhone, iPad, Android-Tablet und Laptop — ohne Installation, ohne Konto.

**Spielen:** https://dealwirth.github.io/Schulspiele/

## Zwei Wege zu spielen

**Am selben Gerät.** Das Geraet wandert von Hand zu Hand. Fuer Spiele, bei denen
alle gleichzeitig antworten (Reaktion, Quiz, Buchstabensalat), wird vor jeder
Antwort kurz der eigene Name angetippt, damit die Punkte im richtigen Haus landen.

**Als Gruppe mit Code.** Eine Person oeffnet eine Gruppe und bekommt einen
vierstelligen Code. Alle anderen treten damit ueber ihre eigene Adresse bei und
spielen auf ihrem eigenen Bildschirm. Der Aufbau laeuft ueber WebRTC (PeerJS),
danach reden die Geraete direkt miteinander. Ein Internetzugang wird fuer den
Verbindungsaufbau gebraucht; ein gemeinsames WLAN ist empfehlenswert.

> Reines Bluetooth zwischen iPhone und Android ist im Browser nicht moeglich —
> WebRTC ist der plattformuebergreifende Weg, den iOS und Android beide erlauben.
> Ohne Internet bleibt der Modus "Am selben Geraet".

## Die Spiele

| Spiel | Spieler | Art |
| --- | --- | --- |
| Tic Tac Toe | 2–4 | Brett, 3×3 oder 4×4 |
| Vier gewinnt | 2–4 | Brett |
| Memory | 2–6 | Brett |
| Nim | 2 | Strategie |
| Reaktion | 2–8 | Gleichzeitig |
| Buchstabensalat | 2–8 | Wort, gleichzeitig |
| Quizduell | 2–8 | Wissen, gleichzeitig |
| Der Ordnung nach | 2–8 | Wissen, Team |
| Wer bin ich? | 4–10 | Party |
| Wer bist du? | 3–10 | Party |
| Grosse Debatte | 3–10 | Team |
| Fuenf-Sieben-Fuenf | 2–10 | Wort, Team |

## Aufbau

- `src/` — Quellen: `classic.css`, `js/app.js`, `js/net.js`, `js/ui.js`,
  Spielmodule unter `js/games/`, dazu `vendor/peerjs.min.js`.
- `index.html` — gebaute, vollstaendig eigenstaendige Fassung (CSS und Skripte
  inline). Diese Datei ist die veroeffentlichte Seite.
- `build.js` — erzeugt `index.html` aus `src/`.

```bash
node build.js
```

Danach `index.html` direkt im Browser oeffnen oder auf einen Schulserver legen.
