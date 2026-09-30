/* ==========================================================================
   Seidla — Inhalte
   Fränkische Sprüche, Aufgaben, Fragen. Alles für einen zünftigen Abend
   im Wirtshaus — mit Humor, ohne dass es unter die Gürtellinie rutscht.
   ========================================================================== */
(function () {
  "use strict";
  const SS = window.SS;

  /* ── Sprüche für zwischendurch (werden als Toast gestreut) ─────────────── */
  const SPRUECH = [
    "A Seidla geht immer.",
    "Wärschd, wärschd — nur a Seidla hält die Waad zamm.",
    "Der Franke is fei ned bedeppert.",
    "Basd scho, aber geh her.",
    "Is des a Hetz!",
    "Nu ned hudla.",
    "Des is fei a Gschmarri.",
    "Mir homm scho ganz anders überstandn.",
    "Geh, hald dei Gosch.",
    "A Brotzeit is ka Zache.",
    "Dou hosd fei a Glück ghabt.",
    "Wos hostn du für a Glumb?",
    "Des passt scho widder.",
    "I bi ned auf der Brennsuppn dahergschwumma.",
    "Medschgers, lass da fei Zeit.",
    "Ach du heiliger Bimbam.",
    "Des geht ja gar ned.",
    "Wart, i hald der's.",
    "Des is a Gschänk, dou sogg i ned na.",
    "Herrschaftszeiten, des is glamm.",
    "Des is fei arg zeidn.",
    "Ja mei, dou kannschd nix machn.",
    "Gscheidhaferl.",
    "Dou ka i grad au ned helfa.",
  ];

  /* ── Ich hab noch nie ─────────────────────────────────────────────────── */
  const ICH_NOCH_NIE = [
    "Ich hab noch nie ein Bier ausgetrunken, das mir ned geschmeckt hat.",
    "Ich hab noch nie auf einem Wirtshaustisch getanzt.",
    "Ich hab noch nie beim Schafkopf gewonnen und trotzdem verlorn.",
    "Ich hab noch nie eine Kerze angesteckt und dabei das Gebet vergessen.",
    "Ich hab noch nie einen Karpfen ganz allein verdrückt.",
    "Ich hab noch nie beim Kirchweih-Schießen daneben geschossen.",
    "Ich hab noch nie ein Bier verschüttet und es heimlich weggewischt.",
    "Ich hab noch nie bei der Blasmusik mitgesungen, ohne den Text zu kennen.",
    "Ich hab noch nie ein Seidla stehen lassen.",
    "Ich hab noch nie eine Brotzeit bei jemandem anderen stibitzt.",
    "Ich hab noch nie beim Maibaum-Aufstellen mitgeholfen und mich dabei blamiert.",
    "Ich hab noch nie einen Berg bestiegen und oben ein Bier aufgemacht.",
    "Ich hab noch nie im Fasching so getanzt, dass ich den Tag drauf nichts mehr wusste.",
    "Ich hab noch nie in einem Biergarten die Bedienung dreimal gerufen.",
    "Ich hab noch nie beim Radlfoahn einen Umweg gemacht, nur um zum Wirtshaus zu kommen.",
    "Ich hab noch nie eine Runde ausgegeben und dann die Rechnung bereut.",
    "Ich hab noch nie einem Gast ein Bier ausgegeben, das ich nicht kannte.",
    "Ich hab noch nie beim Feuerwehrfest das Los gezogen und verloren.",
    "Ich hab noch nie eine Bratwurst doppelt bestellt und so getan, als wär sie für jemand anderen.",
    "Ich hab noch nie beim Kartenspiel gemogelt und es geleugnet.",
    "Ich hab noch nie einen Krapfen gegessen, ohne zu wissen, ob Krepp drin ist.",
    "Ich hab noch nie beim Wandern die falsche Abzweigung genommen.",
    "Ich hab noch nie im Winter ohne Handschuhe ein Bier geholt.",
    "Ich hab noch nie beim Dorffest ein Lied gewünscht, das keiner mag.",
    "Ich hab noch nie einem Freund sein Bier ausgetrunken, weil er kurz weg war.",
  ];

  /* ── Wer würde eher ───────────────────────────────────────────────────── */
  const WER_WUERDE = [
    "Wer würde eher beim Kirchweihumzug aus Versehen mitlaufen?",
    "Wer würde eher um zwei Uhr nachts noch eine Bratwurst bestellen?",
    "Wer würde eher beim Schafkopf heimlich in die Karten schauen?",
    "Wer würde eher ein Bier nach dem anderen schaffen, ohne einmal aufs Klohaus zu gehen?",
    "Wer würde eher beim Fasching alle Preise abräumen?",
    "Wer würde eher bei der Blasmusik weinen?",
    "Wer würde eher eine ganze Kerchweih durchfeiern und dann zum Dienst gehen?",
    "Wer würde eher beim Bierkrug-Stemmen gewinnen?",
    "Wer würde eher einen Wildfremden zum Bier einladen?",
    "Wer würde eher beim Dorffest die falsche Person ansprechen?",
    "Wer würde eher im Winter mit dem Radl zum Wirtshaus fahren?",
    "Wer würde eher beim Kartenspiel mit einem Witz den ganzen Tisch ablenken?",
    "Wer würde eher beim Karpfenessen eine Gräte verschlucken?",
    "Wer würde eher sagen: «Des lern i nia», und es dann doch tun?",
    "Wer würde eher die Brotzeit für die ganze Runde mitbringen?",
    "Wer würde eher einen Krapfen mit Senf erwischen und es nicht merken?",
    "Wer würde eher beim Wandern die Karte falsch herum halten?",
    "Wer würde eher einen Streit am Stammtisch anfangen?",
    "Wer würde eher die ganze Nacht über ein altes Lied reden?",
    "Wer würde eher beim Schießen ins Schwarze treffen, ohne zu zielen?",
    "Wer würde eher sein letztes Bier weggeben?",
    "Wer würde eher beim Maibaum-Aufstellen den Nagel verfehlen?",
    "Wer würde eher eine Stunde auf der Toilette verschwinden?",
    "Wer würde eher einen Kater haben und es allen erzählen?",
    "Wer würde eher beim Fußball im Dorfverein ein Eigentor schießen?",
    "Wer würde eher zu einem Lied singen, das gar nicht läuft?",
    "Wer würde eher beim Rummel im Karussell einschlafen?",
    "Wer würde eher einen ganzen Kasten Bier allein kaufen und so tun, als wär er für die Gruppe?",
  ];

  /* ── Wahrheit ─────────────────────────────────────────────────────────── */
  const WAHRHEIT = [
    "Was war dein peinlichstes Erlebnis beim Kirchweih?",
    "Wie viele Bier hast du schon an einem Abend geschafft?",
    "Wem in dieser Runde traust du am wenigsten beim Kartenspiel?",
    "Was ist die größte Lüge, die du deinen Eltern erzählt hast?",
    "Welche Person aus dieser Runde würdest du auf eine einsame Insel mitnehmen?",
    "Wann hast du zuletzt geweint — und warum?",
    "Was war dein schlechtester Kauf im vergangenen Jahr?",
    "Wie sieht dein idealer Sonntag aus?",
    "Was war die dümmste Ausrede, mit der du davongekommen bist?",
    "Wie alt warst du, als du das erste Bier getrunken hast?",
    "Wer war dein erster Schwarm?",
    "Was war dein größter Blödsinn, den du im Wirtshaus gemacht hast?",
    "Hast du schon mal was geklaut — und was?",
    "Was ist die größte Summe, die du schon verspielt hast?",
    "Wie oft lügst du in der Woche?",
    "Was war dein schlimmster Kater?",
    "Wen aus deiner Familie würdest du am liebsten zum Schafkopf mitnehmen?",
    "Was machst du, wenn keiner hinschaut?",
    "Welches Lied hörst du heimlich, das dich keiner erwischen darf?",
    "Wie viele Leute in deinem Handy würdest du löschen, wenn man dich ließe?",
    "Was ist dein größter Neid auf jemanden in dieser Runde?",
    "Wann hast du das letzte Mal etwas absichtlich kaputtgemacht?",
    "Was ist die größte Lüge in deinem Lebenslauf?",
    "Wann hast du zuletzt gelogen und es genossen?",
    "Was war dein peinlichster Moment vor einer großen Gruppe?",
    "Wie viel Geld hast du diese Woche für Unsinn ausgegeben?",
  ];

  /* ── Pflicht ──────────────────────────────────────────────────────────── */
  const PFLICHT = [
    "Erzähl die nächste Runde lang mit falschem fränkischem Dialekt.",
    "Singe die erste Strophe eines beliebigen Liedes laut vor.",
    "Sprich für zwei Minuten nur in Reimen.",
    "Imitiere den Host der Runde so gut du kannst.",
    "Rufe einen beliebigen Namen aus dem Handy an und singe «Happy Birthday».",
    "Sprich die nächsten fünf Minuten nur in der dritten Person.",
    "Halte dich für eine Runde an der Schulter deines linken Nachbarn fest.",
    "Erzähle drei wahre Dinge und eine Lüge über dich.",
    "Lach über alles, was gesagt wird — eine ganze Runde lang.",
    "Flüstere alles, was du sagst, für zwei Runden.",
    "Mache 15 Liegestütze, ohne zu murren.",
    "Beschreibe deinen letzten Urlaub in genau zehn Wörtern.",
    "Singe den Refrain eines Liedes als Opernsänger.",
    "Sprich die nächste Frage doppelt so schnell aus, wie du sie denkst.",
    "Erkläre einem Gegenstand im Raum, warum er dein bester Freund ist.",
    "Erzähle einen Witz — wenn keiner lacht, trink einen Schluck.",
    "Zeige der Runde dein ältestes Foto auf dem Handy.",
    "Tanze zehn Sekunden, als wäre es dein letzter Tanz.",
    "Sprich mit einem Gegenstand in der Hand als wäre es dein Haustier.",
    "Lies die letzten drei Nachrichten aus deinem Chat laut vor, die nichts Peinliches verraten.",
    "Erzähle deine schlechteste Anmach-Lüge aus der Jugend.",
    "Sprich bis zur nächsten Runde nur mit Handzeichen.",
    "Mach drei Komplimente, die ganz ehrlich gemeint sind.",
    "Erzähle die Handlung deines Lieblingsfilms in 20 Sekunden.",
    "Verrät den Runde deinen größten Zeitvertreib auf dem Handy.",
    "Sprich die nächste Antwort im Singsang.",
  ];

  /* ── Bomben-Wörter (Bumm) ─────────────────────────────────────────────── */
  const BUMM_WOERTER = [
    "Kirchweih", "Bratwurst", "Schafkopf", "Maibaum", "Bierkrug", "Karpfen", "Zwetschgen",
    "Blasmusik", "Brotzeit", "Fasching", "Stammtisch", "Wirtshaus", "Radeberger", "Kellerbier",
    "Obatzda", "Presssack", "Weisswurst", "Seidla", "Krug", "Bierdeckel", "Kartenhaus",
    "Feuerwehrfest", "Dorffest", "Kirwa", "Schützenfest", "Rummel", "Kerze", "Dompfaff",
    "Biergarten", "Zwiebelkuchen", "Küchle", "Krapfen", "Wiesn", "Fassanstich", "Gaudiwurm",
  ];

  /* ── Quizfragen ───────────────────────────────────────────────────────── */
  const QUIZ = [
    { q: "Wie heißt eine Halbe Bier in Franken üblicherweise?", a: ["Seidla", "Pfiff", "Rugel", "Krügel"], c: 0, t: "Franken" },
    { q: "Was ist ein «Obatzda»?", a: ["Ein Käse-Gericht", "Ein Kartenspiel", "Ein Bierzelt", "Ein Maibaum"], c: 0, t: "Essen" },
    { q: "Welcher Fluss fließt durch Nürnberg?", a: ["Pegnitz", "Isar", "Donau", "Main"], c: 0, t: "Franken" },
    { q: "Was ist «Schafkopf»?", a: ["Ein Kartenspiel", "Ein Getränk", "Ein Tanz", "Ein Berg"], c: 0, t: "Franken" },
    { q: "Wo steht der Fränkische Schweiz? Welcher Ort ist ihr Ausgangspunkt?", a: ["Muggendorf", "Rothenburg", "Coburg", "Hof"], c: 0, t: "Franken" },
    { q: "Welche Biersorte ist in Bayern zum Frühstück üblich?", a: ["Weissbier", "Pils", "Alt", "Kölsch"], c: 0, t: "Bier" },
    { q: "Was ist ein «Küchla»?", a: ["Ein Siedegebäck", "Ein Kuchen", "Ein Bier", "Ein Spiel"], c: 0, t: "Essen" },
    { q: "Wie viele Karten hat ein Schafkopf-Blatt?", a: ["32", "24", "36", "48"], c: 0, t: "Spiele" },
    { q: "Welches Fest heißt in Franken «Kirwa»?", a: ["Kirchweih", "Karneval", "Erntedank", "Oktoberfest"], c: 0, t: "Franken" },
    { q: "Was bedeutet «ned hudla»?", a: ["Nicht hetzen", "Nicht lügen", "Nicht trinken", "Nicht singen"], c: 0, t: "Dialekt" },
    { q: "Welche Stadt ist für Bratwürste berühmt?", a: ["Nürnberg", "München", "Regensburg", "Passau"], c: 0, t: "Franken" },
    { q: "Wie heißt ein großes Bierglas mit Henkel?", a: ["Krug", "Seidla", "Schnaps", "Kelch"], c: 0, t: "Bier" },
    { q: "Was ist ein «Presssack»?", a: ["Eine Wurstsorte", "Ein Getränk", "Ein Tanz", "Ein Hut"], c: 0, t: "Essen" },
    { q: "Welche Farbe hat ein klassisches Bier meist?", a: ["Goldgelb", "Blau", "Grün", "Schwarz"], c: 0, t: "Bier" },
    { q: "Wie viel Prozent hat ein Bier meist?", a: ["rund 5 %", "rund 15 %", "rund 1 %", "rund 25 %"], c: 0, t: "Bier" },
    { q: "Was ist ein «Gradl»?", a: ["Ein Maß Bier", "Ein Kuchen", "Ein Lied", "Ein Kartenspiel"], c: 0, t: "Bier" },
    { q: "Wofür steht «Fränkische Schweiz»?", a: ["Eine Region", "Ein Berg", "Ein Fluss", "Ein Bier"], c: 0, t: "Franken" },
    { q: "Was ist der «Fasching»?", a: ["Die Karnevalszeit", "Ein Essen", "Ein Kartenspiel", "Ein Bier"], c: 0, t: "Franken" },
    { q: "Welches Getränk trinkt man zu einem «Seidla»?", a: ["Bier", "Wein", "Schnaps", "Kaffee"], c: 0, t: "Bier" },
    { q: "Was ist ein «Bierdeckel»?", a: ["Ein Untersetzer", "Ein Deckel fürs Glas", "Ein Kuchen", "Ein Spiel"], c: 0, t: "Bier" },
    { q: "Wie nennt man das Anstechen eines Fasses?", a: ["Fassanstich", "Fassbier", "Anzapfen", "Krug"], c: 0, t: "Bier" },
    { q: "Was ist ein «Stammtisch»?", a: ["Ein fester Tisch im Wirtshaus", "Ein Bier", "Ein Spiel", "Ein Tanz"], c: 0, t: "Franken" },
    { q: "Was heißt «Brotzeit»?", a: ["Eine Zwischenmahlzeit", "Ein Bier", "Ein Tanz", "Ein Lied"], c: 0, t: "Essen" },
    { q: "Wie viele Spieler braucht Schafkopf üblicherweise?", a: ["4", "2", "8", "6"], c: 0, t: "Spiele" },
    { q: "Was ist ein «Dompfaff»?", a: ["Ein Vogel", "Ein Bier", "Ein Kuchen", "Ein Berg"], c: 0, t: "Natur" },
    { q: "Was ist typisch fränkisch zum Bier?", a: ["Obatzda und Brot", "Sushi", "Pizza", "Currywurst"], c: 0, t: "Essen" },
    { q: "Was bedeutet «geh her»?", a: ["Komm her", "Geh weg", "Setz dich", "Trink aus"], c: 0, t: "Dialekt" },
    { q: "Wie heißt es, wenn man zu schnell trinkt?", a: ["Saufen", "Nippen", "Kosten", "Anstoßen"], c: 0, t: "Bier" },
    { q: "Was ist ein «Gaudi»?", a: ["Ein Spaß", "Ein Bier", "Ein Kuchen", "Ein Tanz"], c: 0, t: "Dialekt" },
    { q: "Wann ist in Franken die Kirchweih üblicherweise?", a: ["Im Herbst", "Im Januar", "Im Mai", "Im Juli"], c: 0, t: "Franken" },
  ];

  /* ── Zungenbrecher ────────────────────────────────────────────────────── */
  const ZUNGENBRECHER = [
    "Zehn zache Zecher zechten zehn zache Zecher zechten zügig.",
    "Fischers Fritz fischt frische Fische, frische Fische fischt Fischers Fritz.",
    "Bier, Bier, Bier, bald brauch i wieder Bier.",
    "Es klapperten die Klapperschlangen, bis ihre Klappern schlapper klangen.",
    "Schneiders Schere schneidet scharf, scharf schneidet Schneiders Schere.",
    "Brautkleid bleibt Brautkleid, Blaukraut bleibt Blaukraut.",
    "Der Whiskymixer mixt Whisky, der Whisky mixt der Whiskymixer.",
    "Sieben süße Söhne saßen sieben süße Suppen.",
    "Wenn Fliegen hinter Fliegen fliegen, fliegen Fliegen Fliegen nach.",
    "Ein Seidla ohne Schaum is wia a Kirwa ohne Blasmusik.",
    "Rund um den Rum rum rennen runde Runden.",
    "Mit Bier im Bauch lässt sich's besser fluchen, als mit leerem Bauch.",
  ];

  /* ── Flaschendrehen: Aktionen ─────────────────────────────────────────── */
  const FLASCHE = [
    { label: "Mundart", text: "Sprich bis zu deinem nächsten Zug nur im breitesten Fränkisch." },
    { label: "Reim", text: "Dichte einen Zweizeiler über die Person zu deiner Rechten." },
    { label: "Geständnis", text: "Erzähle eine Sache, die du noch niemandem erzählt hast." },
    { label: "Frage", text: "Stelle deinem Gegenüber eine Frage, die es ehrlich beantworten muss." },
    { label: "Botengang", text: "Hol der Runde drei Dinge aus einem anderen Zimmer." },
    { label: "Werbung", text: "Mach eine zehnsekündige Werbung für ein Getränk deiner Wahl." },
    { label: "Stimme", text: "Sprich die nächsten zwei Runden mit der Stimme einer bekannten Person." },
    { label: "Blickkontakt", text: "Halte eine Minute lang Blickkontakt mit der Person, die du wählst." },
    { label: "Kompliment", text: "Mach der ganzen Runde der Reihe nach ein ehrliches Kompliment." },
    { label: "Bild", text: "Erkläre ein Bild auf deinem Handy, ohne es zu zeigen." },
    { label: "Tanz", text: "Tanze zehn Sekunden, als wäre es dein letzter Tanz." },
    { label: "Lied", text: "Singe den Refrain deines Lieblingsliedes." },
    { label: "Strafe", text: "Verteile zwei Schlucke an beliebige Personen." },
    { label: "Gruppe", text: "Alle, die schon einmal in Franken waren, trinken einen Schluck." },
    { label: "Wahrheit", text: "Beantworte eine Frage, die dir die Runde stellt." },
    { label: "Gedächtnis", text: "Nenne fünf Biersorten in zehn Sekunden." },
    { label: "Nachbarn", text: "Tausche für eine Runde den Platz mit deinem Nachbarn." },
    { label: "Namen", text: "Nenne drei Personen in der Runde mit ihrem vollen Namen." },
  ];

  /* ── Reaktionsduell: Signal-Zeremonie ─────────────────────────────────── */
  const SIGNALE = [
    "Aufs Bierdeckel-Schlagen", "Wenn die Kerz ausgeht", "Beim Fassanstich",
    "Wenn die Blasmusik anfängt", "Beim Kirwa-Umzug", "Wenn der Krug voll ist",
  ];

  /* ── Trinksprüche (Toast-Varianten) ───────────────────────────────────── */
  const TRINKSPRUECHE = [
    "Auf uns und die Kurven dieser Nacht!",
    "A Seidla auf die Rund!",
    "Prost, und ned hudla!",
    "Hoch die Krüge!",
    "Auf dass ma's überstehn!",
    "Gut Schluck — es is ja für die Gesundheit!",
  ];

  /* ── Turnierbaum: Feld-Kampfnamen ─────────────────────────────────────── */
  const DUELLE = [
    { name: "Bierkrug-Stemmen", icon: "🍺" },
    { name: "Schere, Stein, Papier", icon: "✊" },
    { name: "Karten-Merken", icon: "🃏" },
    { name: "Blickduell", icon: "👀" },
    { name: "Reimschlagen", icon: "🎤" },
    { name: "Zahlenraten", icon: "🔢" },
  ];

  SS.content = {
    SPRUECH,
    ICH_NOCH_NIE,
    WER_WUERDE,
    WAHRHEIT,
    PFLICHT,
    BUMM_WOERTER,
    QUIZ,
    ZUNGENBRECHER,
    FLASCHE,
    SIGNALE,
    TRINKSPRUECHE,
    DUELLE,
    spruch: () => SS.pick(SPRUECH),
    trinkspruch: () => SS.pick(TRINKSPRUECHE),
  };
})();
