/* ==========================================================================
   Seidla — Spielkatalog
   Metadaten aller Spiele. Logik liegt in party.js und action.js.
   ========================================================================== */
(function () {
  "use strict";
  const SS = window.SS;

  const games = [
    {
      id: "ichhabnochnie", name: "Ich hab noch nie", glyph: "🙈", accent: "#8f2b26",
      simultaneous: true,
      tagline: "Der Klassiker. Wer's schon gemacht hat, trinkt.",
      tags: ["schnell", "laut", "gross", "einstieg"], minP: 2, maxP: 100, duration: "10–30 Min",
      settings: [{ key: "karten", label: "Karten pro Spiel", type: "select", default: "12", options: [
        { value: "6", label: "6 Karten" }, { value: "12", label: "12 Karten" }, { value: "20", label: "20 Karten" }, { value: "999", label: "Bis der Wirt aufhört" }] }],
      rules: "Eine Aussage wird vorgelesen. Wer sie schon erlebt hat, trinkt einen Schluck (oder erzählt die Geschichte — das ist die bessere Variante). Wer noch nie, bleibt trocken.",
      howto: ["Die Karte wird gezeigt.", "Jeder tippt ehrlich: scho oder noch nie.", "Es trinken alle, bei denen's zutrifft."],
    },
    {
      id: "werwuerdeeher", name: "Wer würde eher…", glyph: "👉", accent: "#3a5f86",
      simultaneous: true,
      tagline: "Die Runde zeigt auf den, dem sowas zuzutrauen ist.",
      tags: ["schnell", "laut", "gross", "einstieg"], minP: 3, maxP: 100, duration: "10–25 Min",
      settings: [{ key: "karten", label: "Karten pro Spiel", type: "select", default: "12", options: [
        { value: "6", label: "6 Karten" }, { value: "12", label: "12 Karten" }, { value: "20", label: "20 Karten" }, { value: "999", label: "Bis der Wirt aufhört" }] }],
      rules: "Eine Frage wie «Wer würde eher …» wird gestellt. Alle stimmen gleichzeitig für eine Person ab. Wer die meisten Stimmen bekommt, trinkt einen Schluck.",
      howto: ["Die Frage erscheint.", "Alle wählen heimlich eine Person.", "Die Stimmen werden ausgezählt — die Meistgewählte trinkt."],
    },
    {
      id: "wahrheitpflicht", name: "Wahrheit oder Pflicht", glyph: "🎲", accent: "#5b4a86",
      tagline: "Reihum: ehrlich reden oder Blödsinn machen.",
      tags: ["klassisch", "gross", "party"], minP: 2, maxP: 100, duration: "20–60 Min",
      settings: [],
      rules: "Wer dran ist, wählt Wahrheit oder Pflicht. Bei Wahrheit muss ehrlich geantwortet werden, bei Pflicht wird die Aufgabe erledigt. Beides lässt sich vorlesen oder nur zeigen.",
      howto: ["Der Name oben zeigt, wer dran ist.", "Wähle Wahrheit oder Pflicht.", "Aufgabe erfüllen, dann «Erledigt» tippen."],
    },
    {
      id: "flaschendrehen", name: "Flaschendrehen", glyph: "🍾", accent: "#4f7a3a",
      tagline: "Die Flasche sucht sich einen aus.",
      tags: ["klassisch", "party", "gross"], minP: 3, maxP: 100, duration: "15–40 Min",
      settings: [],
      rules: "Der Host dreht die Flasche. Sie bleibt bei einer Person stehen, die eine Aufgabe aus dem Wirtshaus-Vorrat bekommt. Pflicht erfüllen oder einen Schluck trinken.",
      howto: ["Der Host dreht die Flasche.", "Die Flasche wählt eine Person.", "Aufgabe erledigen oder trinken."],
    },
    {
      id: "bumm", name: "Bumm", glyph: "🧨", accent: "#c8462f",
      simultaneous: true,
      tagline: "Die Bombe wandert — wer sie am Ende hat, trinkt.",
      tags: ["action", "laut", "gross"], minP: 3, maxP: 100, duration: "10–25 Min",
      settings: [{ key: "mode", label: "Weitergabe", type: "select", default: "zufall", options: [
        { value: "zufall", label: "Zufall (antippen)" },
        { value: "runde", label: "Reihum (Wort sagen)" }] }],
      rules: "Ein Zünder läuft mit versteckter Länge. Die Bombe wandert weiter — entweder durch Antippen oder reihum mit dem Wort. Wenn's knallt, hat der letzte Halter die Bombe und trinkt.",
      howto: ["Der Host zündet die Bombe.", "Die Bombe weitergeben, zügig!", "Wer sie beim Knall hat, trinkt."],
    },
    {
      id: "reaktionsduell", name: "Reaktionsduell", glyph: "⚡", accent: "#b5722a",
      simultaneous: true,
      tagline: "Erst warten, dann als Erster tippen.",
      tags: ["action", "schnell", "gross"], minP: 2, maxP: 100, duration: "5–15 Min",
      settings: [],
      rules: "Alle legen den Finger auf ihren Namen. Beim Signal «JETZT!» tippt jeder so schnell wie möglich. Der Schnellste bekommt einen Punkt, wer zu früh tippt, trinkt.",
      howto: ["Finger bereit, aber noch nicht tippen.", "Warten, bis JETZT erscheint.", "Sofort tippen — die Zeit wird gemessen."],
    },
    {
      id: "quiz", name: "Franken-Quiz", glyph: "?", accent: "#d9a521",
      simultaneous: true,
      tagline: "Bier, Dialekt und Lokalkolorit — was weiß die Runde?",
      tags: ["wissen", "gross", "team"], minP: 2, maxP: 100, duration: "15–40 Min",
      settings: [{ key: "themen", label: "Thema", type: "select", default: "alle", options: [
        { value: "alle", label: "Gemischt" }, { value: "Franken", label: "Franken" },
        { value: "Bier", label: "Bier" }, { value: "Essen", label: "Essen" }, { value: "Dialekt", label: "Dialekt" }] }],
      rules: "Zu jeder Frage gibt es vier Antworten, genau eine stimmt. Alle antworten gleichzeitig auf ihrem Gerät. Richtige Antworten geben einen Punkt.",
      howto: ["Frage lesen.", "Antwort wählen.", "Auflösen — jedes richtige Gerät punktet."],
    },
    {
      id: "zungenbrecher", name: "Zungenbrecher", glyph: "🗣️", accent: "#256b6b",
      simultaneous: true,
      tagline: "Dreimal schnell sagen, ohne sich zu verhaspeln.",
      tags: ["wort", "laut", "action", "gross"], minP: 2, maxP: 100, duration: "10–25 Min",
      settings: [{ key: "runden", label: "Zungenbrecher", type: "select", default: "6", options: [
        { value: "4", label: "4 Stück" }, { value: "6", label: "6 Stück" }, { value: "10", label: "10 Stück" }, { value: "999", label: "Bis der Wirt aufhört" }] }],
      rules: "Ein Zungenbrecher wird 20 Sekunden lang gezeigt. Wer ihn dreimal schnell und fehlerfrei sagt und auf seinen Namen tippt, bekommt einen Punkt. Wer's nicht schafft, trinkt.",
      howto: ["Zungenbrecher laut vorlesen.", "Dreimal schnell sagen.", "Auf den eigenen Namen tippen, wenn's geklappt hat."],
    },
    {
      id: "turnierbaum", name: "Turnierbaum", glyph: "🏆", accent: "#7d3f6b",
      tagline: "Alle gegen alle, bis einer übrig bleibt.",
      tags: ["wettkampf", "gross", "team"], minP: 4, maxP: 100, duration: "20–60 Min",
      settings: [],
      rules: "Alle Teilnehmenden werden zufällig in ein Turnierbaum-Los gesetzt. Zwei treten in einer Disziplin gegeneinander an, die Runde entscheidet den Sieger. Wer das Finale gewinnt, ist Wirtshaus-Champion.",
      howto: ["Der Baum wird ausgelost.", "Paarweise antreten, der Host tippt den Sieger.", "Der Sieger des Finales gewinnt."],
    },
    {
      id: "chronik", name: "Wirtshaus-Chronik", glyph: "📜", accent: "#8a6510",
      tagline: "Das Buch der Nacht: wer war dabei, wer hat gewonnen.",
      tags: ["ruhig", "gross"], minP: 1, maxP: 100, duration: "—",
      settings: [],
      rules: "Kein Spiel, sondern das Gedächtnis der Runde. Jede Runde, jeder Sieg und jeder Schluck wird eingetragen — auch wenn das Netz weg war. So bleibt jede Nacht in Erinnerung.",
      howto: ["Jeder Eintrag bekommt Datum und Namen.", "Die Auswertung zeigt, wer am meisten Punkte und Schlucke gesammelt hat.", "Nichts geht verloren, auch offline nicht."],
    },
  ];

  games.forEach((g) => SS.registerGame(g));
})();
