/* ==========================================================================
   Schulspiele — Spielkatalog
   Metadaten aller Spiele. Die Logik liegt in board.js, party.js, trivia.js.
   ========================================================================== */
(function () {
  "use strict";
  const SS = window.SS;

  const games = [
    {
      id: "tictactoe", name: "Tic Tac Toe", glyph: "⨯○", accent: "#35507d",
      tagline: "Drei in einer Reihe. In zehn Sekunden erklärt, in fünf Minuten gespielt.",
      tags: ["schnell", "strategie", "4"], minP: 2, maxP: 4, duration: "2–5 Min",
      settings: [{ key: "board", label: "Feldgrösse", type: "select", default: "3", options: [
        { value: "3", label: "3 × 3 (klassisch)" }, { value: "4", label: "4 × 4 (vier in Reihe, härter)" }] }],
      rules: "Wer zuerst drei (bei 4 × 4 vier) eigene Zeichen in einer waagerechten, senkrechten oder diagonalen Linie hat, gewinnt. Das Feld in der Mitte ist am stärksten.",
      howto: ["Abwechselnd ein freies Feld wählen.", "Wer zuerst die Linie voll hat, bekommt den Punkt.", "Bei vollem Feld ohne Linie: unentschieden."],
    },
    {
      id: "connect4", name: "Vier gewinnt", glyph: "⬤", accent: "#a4262c",
      tagline: "Steine fallen lassen, Reihen bauen, den Gegner blocken.",
      tags: ["schnell", "strategie", "4"], minP: 2, maxP: 4, duration: "5–10 Min",
      settings: [{ key: "cols", label: "Breite", type: "select", default: "7", options: [
        { value: "7", label: "7 Spalten" }, { value: "5", label: "5 Spalten (schnell)" }] }],
      rules: "Ein Stein fällt immer auf die unterste freie Stelle der gewählten Spalte. Wer zuerst vier eigene Steine waagerecht, senkrecht oder diagonal verbindet, gewinnt.",
      howto: ["Ihr spielt abwechselnd.", "Tippe auf die Spalte, in der dein Stein fallen soll.", "Vier in einer Linie gewinnt."],
    },
    {
      id: "memory", name: "Memory", glyph: "❄", accent: "#256b6b",
      tagline: "Paare finden und sich merken, wo was lag.",
      tags: ["ruhig", "schnell", "8"], minP: 2, maxP: 6, duration: "5–10 Min",
      settings: [
        { key: "pairs", label: "Paare", type: "select", default: "8", options: [
          { value: "6", label: "6 Paare" }, { value: "8", label: "8 Paare" }, { value: "10", label: "10 Paare" }, { value: "12", label: "12 Paare" }] },
        { key: "keepTurn", label: "Bei Treffer nochmal", type: "select", default: "true", options: [
          { value: "true", label: "Ja" }, { value: "false", label: "Nein" }] },
      ],
      rules: "Reihum werden zwei Karten aufgedeckt. Passt das Bild, bleibt das Paar offen und es gibt einen Punkt. Passt es nicht, werden beide wieder verdeckt und der Nächste ist dran.",
      howto: ["Tippe zwei Karten.", "Bei einem Paar gibt es einen Punkt.", "Es gewinnt, wer am Ende die meisten Paare hat."],
    },
    {
      id: "nim", name: "Nim", glyph: "●●●", accent: "#5b4a86",
      tagline: "Wer den letzten Stein nimmt, verliert. Reine Kopfsache.",
      tags: ["ruhig", "strategie", "2"], minP: 2, maxP: 2, duration: "3–8 Min",
      settings: [
        { key: "rows", label: "Haufen", type: "select", default: "3", options: [
          { value: "3", label: "3 Haufen" }, { value: "4", label: "4 Haufen" }] },
        { key: "maxTake", label: "Pro Zug höchstens", type: "select", default: "3", options: [
          { value: "3", label: "3 Steine" }, { value: "99", label: "Beliebig viele" }] },
      ],
      rules: "Aus einem Haufen dürfen beliebig viele Steine genommen werden (bis zur eingestellten Grenze), aber immer nur aus einem. Klassisch: Wer den letzten Stein nehmen muss, verliert.",
      howto: ["Wähle einen Haufen und die Anzahl.", "Der Zug geht weiter.", "Wer am Ende den letzten Stein nehmen muss, verliert."],
    },
    {
      id: "reaction", name: "Reaktion", glyph: "⚡", accent: "#b2622a",
      simultaneous: true,
      tagline: "Erst warten, dann schneller sein als alle anderen.",
      tags: ["schnell", "laut", "gross", "8"], minP: 2, maxP: 8, duration: "2–4 Min",
      settings: [{ key: "rounds", label: "Durchgänge", type: "select", default: "5", options: [
        { value: "3", label: "3" }, { value: "5", label: "5" }, { value: "8", label: "8" }] }],
      rules: "Warte auf das Startsignal. Wer zu früh tippt, verliert den Durchgang. Wer am schnellsten tippt, bekommt einen Punkt.",
      howto: ["Alle legen einen Finger auf ihren Knopf, aber tippen noch nicht.", "Nach rot kommt grün — jetzt sofort tippen.", "Die Anzeige zeigt die Zeit bis zur Reaktion."],
    },
    {
      id: "anagram", name: "Buchstabensalat", glyph: "𝔄", accent: "#7d3f6b",
      simultaneous: true,
      tagline: "Buchstaben sortieren, bevor die anderen es tun.",
      tags: ["wort", "wissen", "schnell", "8"], minP: 2, maxP: 8, duration: "5–10 Min",
      settings: [{ key: "rounds", label: "Runden", type: "select", default: "10", options: [
        { value: "6", label: "6" }, { value: "10", label: "10" }, { value: "15", label: "15" }] }],
      rules: "Ein durcheinandergewürfeltes Wort wird gezeigt. Wer es korrekt zusammensetzt und abschickt, bekommt einen Punkt. Alle raten gleichzeitig.",
      howto: ["Lies die Buchstaben.", "Tippe sie in die richtige Reihenfolge.", "Wer zuerst richtig abschickt, punktet."],
    },
    {
      id: "trivia", name: "Quizduell", glyph: "?", accent: "#c99a3a",
      simultaneous: true,
      tagline: "Klassisches Quiz aus Allgemeinwissen, Technik und Alltag.",
      tags: ["wissen", "team", "gross", "8"], minP: 2, maxP: 8, duration: "10–15 Min",
      settings: [
        { key: "rounds", label: "Fragen", type: "select", default: "12", options: [
          { value: "8", label: "8 Fragen" }, { value: "12", label: "12 Fragen" }, { value: "20", label: "20 Fragen" }] },
        { key: "seconds", label: "Antwortzeit", type: "select", default: "20", options: [
          { value: "10", label: "10 Sekunden" }, { value: "20", label: "20 Sekunden" }, { value: "45", label: "45 Sekunden" }] },
      ],
      rules: "Zu jeder Frage gibt es vier Antworten, genau eine stimmt. Wer richtig liegt, bekommt einen Punkt — und bei schnellen Antworten einen Zusatzpunkt.",
      howto: ["Alle antworten gleichzeitig auf ihrem Gerät.", "Nach Ablauf der Zeit wird aufgelöst.", "Richtige Antworten geben Punkte."],
    },
    {
      id: "sort", name: "Der Ordnung nach", glyph: "↕", accent: "#2f6b4f",
      tagline: "Grössen, Jahre, Geschwindigkeiten in die richtige Reihenfolge bringen.",
      tags: ["wissen", "team", "ruhig", "gross"], minP: 2, maxP: 8, duration: "8–12 Min",
      settings: [{ key: "rounds", label: "Runden", type: "select", default: "6", options: [
        { value: "4", label: "4" }, { value: "6", label: "6" }, { value: "10", label: "10" }] }],
      rules: "Eine Liste von Begriffen muss der Grösse nach geordnet werden — von klein nach gross. Die Gruppe berät sich kurz und schiebt die Karten zurecht. Volle Punktzahl nur bei komplett richtiger Reihenfolge.",
      howto: ["Zieht die Karten in die richtige Reihenfolge.", "Besprecht euch kurz, dann abschicken.", "Jede falsche Stelle kostet einen Punkt."],
    },
    {
      id: "werbinich", name: "Wer bin ich?", glyph: "→", accent: "#1d3557",
      tagline: "Begriffe raten, ohne sie zu nennen — in zwei Minuten.",
      tags: ["party", "laut", "team", "gross"], minP: 4, maxP: 10, duration: "10–15 Min",
      settings: [{ key: "seconds", label: "Zeit pro Runde", type: "select", default: "90", options: [
        { value: "60", label: "60 Sekunden" }, { value: "90", label: "90 Sekunden" }, { value: "120", label: "120 Sekunden" }] }],
      rules: "Eine Person erklärt der Gruppe einen Begriff, ohne das Wort selbst oder Teile davon zu sagen. Die anderen raten. Jeder Treffer bringt dem Team einen Punkt.",
      howto: ["Alle sehen die Begriffe, nur nacheinander.", "Erklärt wird mündlich — die App ist nur der Zettel.", "Tippen auf «Erraten» zählt den Punkt."],
    },
    {
      id: "werbistdu", name: "Wer bist du?", glyph: "★", accent: "#a4262c",
      simultaneous: true,
      tagline: "Eine berühmte Figur erraten — mit Ja-und-Nein-Fragen.",
      tags: ["party", "wissen", "gross"], minP: 3, maxP: 10, duration: "10–20 Min",
      settings: [{ key: "region", label: "Figuren", type: "select", default: "mix", options: [
        { value: "mix", label: "Gemischt" }, { value: "sport", label: "Sport" }, { value: "tech", label: "Technik & Wissenschaft" }] }],
      rules: "Jede Person bekommt heimlich eine berühmte Figur zugespielt. Durch Fragen, die nur mit ja oder nein zu beantworten sind, wird die eigene Figur erraten. Wer zuerst richtig liegt, punktet.",
      howto: ["Öffne deine Figur nur, wenn du sie sehen darfst.", "Stellt euch reihum Ja-/Nein-Fragen.", "Tippe «Erraten», wenn du die Figur nennst."],
    },
    {
      id: "debate", name: "Grosse Debatte", glyph: "⚖", accent: "#3c6e9a",
      simultaneous: true,
      tagline: "Zwei Minuten Meinung, dann Punkte per Abstimmung.",
      tags: ["team", "laut", "gross", "ruhig"], minP: 3, maxP: 10, duration: "12–20 Min",
      settings: [{ key: "seconds", label: "Redezeit", type: "select", default: "90", options: [
        { value: "60", label: "60 Sekunden" }, { value: "90", label: "90 Sekunden" }, { value: "150", label: "150 Sekunden" }] }],
      rules: "Eine These wird gezeigt. Zwei Seiten sammeln Argumente und tragen sie nacheinander vor. Danach stimmt die Gruppe ab; die überzeugendere Seite bekommt die Punkte.",
      howto: ["Die These wird gezeigt und die Seiten verteilt.", "Sprecht nacheinander in der vorgegebenen Zeit.", "Zum Schluss abstimmen lassen."],
    },
    {
      id: "haiku", name: "Fünf-Sieben-Fünf", glyph: "文", accent: "#8a6a1f",
      simultaneous: true,
      tagline: "Ein Haiku in drei Zeilen — und die Gruppe bewertet.",
      tags: ["wort", "team", "ruhig", "gross"], minP: 2, maxP: 10, duration: "10–15 Min",
      settings: [{ key: "seconds", label: "Schreibzeit", type: "select", default: "180", options: [
        { value: "120", label: "2 Minuten" }, { value: "180", label: "3 Minuten" }, { value: "300", label: "5 Minuten" }] }],
      rules: "Zu einem vorgegebenen Thema schreibt jede Person ein Haiku mit den Silbenzahlen 5, 7 und 5. Danach lesen alle vor und die Gruppe punktet.",
      howto: ["Thema wird gezeigt.", "Erste Zeile 5 Silben, zweite 7, dritte 5.", "Vorlesen, dann von der Gruppe bewerten lassen."],
    },
  ];

  games.forEach((g) => SS.registerGame(g));
})();
