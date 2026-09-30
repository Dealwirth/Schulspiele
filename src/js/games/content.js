/* ==========================================================================
   Schulspiele — Inhalte
   Wortlisten, Begriffskarten und der Quizfragen-Pool.
   Alle Inhalte sind bewusst für die Oberstufe (etwa ab 16 Jahren) gewählt.
   ========================================================================== */
window.SS_DATA = (function () {
  "use strict";

  const WORDS = [
    "stundenplan", "pausenhof", "klassenbuch", "taschenrechner", "wandertag",
    "bibliothek", "sportplatz", "hausaufgabe", "kreide", "freundschaft",
    "zeugniskonferenz", "schulbank", "klassenfahrt", "aufsatz", "vokabeln",
    "mensa", "vertretung", "schulhof", "abschluss", "mathematik",
    "geschichtsbuch", "chemieunterricht", "naturwissenschaft", "studienfahrt",
    "pruefung", "note", "lehrplan", "stundentafel", "wandkarte", "tafelbild",
  ];

  /* Begriffe zum Erklären (Wer bin ich?) */
  const EXPLAIN = [
    "Weltall", "Kompass", "Kaktus", "Schallplatte", "Gewitter", "Zahnbürste",
    "Fußballplatz", "Kühlschrank", "Bienenstock", "Teleskop", "Sanduhr",
    "Vulkan", "Klavier", "Eiffelturm", "Regenbogen", "Bibliothek", "Bumerang",
    "Skelett", "Bergsteiger", "Wasserfall", "Uhrwerk", "Wüste", "Sonnenblume",
    "Mikroskop", "Kaffee", "Fallschirm", "Wetterstation", "Papierflieger",
    "Schneemann", "Fernrohr", "Anker", "Leuchtturm", "Brieftasche", "Sinfonie",
    "Gletscher", "Löwenzahn", "Buchdruck", "Dampfmaschine", "Fallschirmspringen",
    "Schachbrett", "Fahrradkette", "Treibhaus", "Zirkuszelt", "Morsezeichen",
    "Regenschirm", "Bienenwabe", "Windrad", "Kochbuch", "Tagebuch",
    "Hochsprung", "Klettergerüst", "Bühnenbild", "Wappendrache", "Komet",
    "Spiegelkabinett", "Wasserwaage", "Taschenlampe", "Zauberwürfel", "Gong",
  ];

  const FIGURES_SPORT = [
    "Michael Jordan", "Serena Williams", "Muhammad Ali", "Lionel Messi",
    "Steffi Graf", "Pelé", "Usain Bolt", "Roger Federer", "Marta",
    "Simone Biles", "Diego Maradona", "Nadia Comaneci", "Dirk Nowitzki",
    "Cristiano Ronaldo", "Jesse Owens", "Martina Navratilova", "Tom Brady",
    "Katarina Witt", "Ayrton Senna", "Babe Ruth",
  ];

  const FIGURES_TECH = [
    "Ada Lovelace", "Albert Einstein", "Marie Curie", "Alan Turing",
    "Nikola Tesla", "Rosalind Franklin", "Isaac Newton", "Katherine Johnson",
    "Charles Darwin", "Grace Hopper", "Johannes Gutenberg", "Alexander von Humboldt",
    "Lise Meitner", "Tim Berners-Lee", "Steve Jobs", "Margaret Hamilton",
    "Galileo Galilei", "Emmy Noether", "James Watt", "Nicolaus Copernicus",
  ];

  /* Sortierspiele: items werden nach val aufsteigend geordnet */
  const SORT_SETS = [
    {
      question: "Ordne die Planeten nach ihrem Abstand zur Sonne — der Sonne am nächsten zuerst.",
      items: [
        { label: "Merkur", val: 1 }, { label: "Venus", val: 2 }, { label: "Erde", val: 3 },
        { label: "Mars", val: 4 }, { label: "Jupiter", val: 5 }, { label: "Saturn", val: 6 },
      ],
    },
    {
      question: "Ordne die Tiere nach ihrer durchschnittlichen Körperlänge — klein zuerst.",
      items: [
        { label: "Maus", val: 1 }, { label: "Katze", val: 2 }, { label: "Wolf", val: 3 },
        { label: "Pferd", val: 4 }, { label: "Elefant", val: 5 }, { label: "Blauwal", val: 6 },
      ],
    },
    {
      question: "Ordne die Bauwerke nach ihrer Höhe — niedrig zuerst.",
      items: [
        { label: "Brandenburger Tor", val: 1 }, { label: "Kölner Dom", val: 2 },
        { label: "Eiffelturm", val: 3 }, { label: "Empire State Building", val: 4 },
        { label: "Burj Khalifa", val: 5 },
      ],
    },
    {
      question: "Ordne die Ereignisse zeitlich — früh zuerst.",
      items: [
        { label: "Erfindung des Buchdrucks", val: 1440 }, { label: "Französische Revolution", val: 1789 },
        { label: "Erste Mondlandung", val: 1969 }, { label: "Fall der Berliner Mauer", val: 1989 },
        { label: "Erstes iPhone", val: 2007 },
      ],
    },
    {
      question: "Ordne die Geschwindigkeiten — langsam zuerst.",
      items: [
        { label: "Fußgänger (5 km/h)", val: 5 }, { label: "Radfahrer (20 km/h)", val: 20 },
        { label: "Auto auf der Autobahn (130 km/h)", val: 130 },
        { label: "Schall in Luft (1235 km/h)", val: 1235 },
        { label: "Licht (1,08 Mrd. km/h)", val: 1080000000 },
      ],
    },
    {
      question: "Ordne die Flüsse nach ihrer Länge — kurz zuerst.",
      items: [
        { label: "Elbe", val: 1094 }, { label: "Donau", val: 2850 },
        { label: "Nil", val: 6650 }, { label: "Amazonas", val: 6992 },
      ],
    },
    {
      question: "Ordne die Speichergrössen — klein zuerst.",
      items: [
        { label: "Kilobyte (KB)", val: 1 }, { label: "Megabyte (MB)", val: 2 },
        { label: "Gigabyte (GB)", val: 3 }, { label: "Terabyte (TB)", val: 4 },
        { label: "Petabyte (PB)", val: 5 },
      ],
    },
    {
      question: "Ordne die Temperaturen — kalt zuerst.",
      items: [
        { label: "Zimmertemperatur (21 °C)", val: 21 }, { label: "Körpertemperatur (37 °C)", val: 37 },
        { label: "Wasser kocht (100 °C)", val: 100 }, { label: "Holz brennt (300 °C)", val: 300 },
        { label: "Sonnenoberfläche (5500 °C)", val: 5500 },
      ],
    },
    {
      question: "Ordne die chemischen Elemente nach ihrer Ordnungszahl — klein zuerst.",
      items: [
        { label: "Wasserstoff (H)", val: 1 }, { label: "Kohlenstoff (C)", val: 6 },
        { label: "Sauerstoff (O)", val: 8 }, { label: "Eisen (Fe)", val: 26 },
        { label: "Gold (Au)", val: 79 }, { label: "Uran (U)", val: 92 },
      ],
    },
    {
      question: "Ordne die Länder nach Fläche — klein zuerst.",
      items: [
        { label: "Schweiz", val: 41285 }, { label: "Österreich", val: 83879 },
        { label: "Deutschland", val: 357588 }, { label: "Indien", val: 3287263 },
        { label: "Russland", val: 17098246 },
      ],
    },
  ];

  const THESES = [
    "Handys sollten im Unterricht komplett verboten sein.",
    "Hausaufgaben bringen mehr, als sie kosten.",
    "Noten sagen nichts darüber aus, was jemand kann.",
    "Wer in der Schule eine Fremdsprache lernt, sollte damit früh beginnen.",
    "Künstliche Intelligenz sollte bei Hausarbeiten erlaubt sein.",
    "Ein Freiwilligenjahr nach dem Abschluss sollte Pflicht werden.",
    "Schulessen sollte für alle kostenlos sein.",
    "Sportunterricht sollte benotet werden wie jedes andere Fach.",
    "Jeder sollte programmieren lernen.",
    "Soziale Medien richten mehr Schaden an als Nutzen.",
    "Unterricht sollte erst um zehn Uhr beginnen.",
    "Wer die Klasse wiederholt, sollte das selbst entscheiden dürfen.",
  ];

  const THEMES = [
    "Pausenhof", "Klassenfahrt", "Der letzte Schultag", "Nachmittag im Park",
    "Erste Stunde", "Bibliothek", "Sommerregen", "Winterschlaf", "Fahrradtour",
    "Prüfungsangst", "Freundschaft", "Stille Stadt",
  ];

  /* Quizfragen: c = Index der richtigen Antwort */
  const QUESTIONS = [
    { q: "Welcher Planet ist der Sonne am nächsten?", a: ["Venus", "Merkur", "Mars", "Erde"], c: 1, cat: "Natur" },
    { q: "Wie viele Bundesländer hat Deutschland?", a: ["14", "15", "16", "17"], c: 2, cat: "Geografie" },
    { q: "Welches chemische Symbol steht für Gold?", a: ["Go", "Gd", "Au", "Ag"], c: 2, cat: "Chemie" },
    { q: "Wer entwickelte die Relativitätstheorie?", a: ["Isaac Newton", "Albert Einstein", "Nikola Tesla", "Max Planck"], c: 1, cat: "Physik" },
    { q: "Wie heisst die Hauptstadt von Australien?", a: ["Sydney", "Melbourne", "Canberra", "Perth"], c: 2, cat: "Geografie" },
    { q: "Wie viele Saiten hat eine klassische Gitarre?", a: ["4", "5", "6", "7"], c: 2, cat: "Musik" },
    { q: "Welcher Ozean ist der grösste?", a: ["Atlantik", "Indischer Ozean", "Pazifik", "Arktischer Ozean"], c: 2, cat: "Geografie" },
    { q: "Wer schrieb «Faust»?", a: ["Friedrich Schiller", "Johann Wolfgang von Goethe", "Heinrich Heine", "Bertolt Brecht"], c: 1, cat: "Literatur" },
    { q: "Wie viele Minuten hat ein Tag?", a: ["1200", "1440", "1680", "960"], c: 1, cat: "Alltag" },
    { q: "Welche Einheit misst die elektrische Spannung?", a: ["Ampere", "Volt", "Watt", "Ohm"], c: 1, cat: "Physik" },
    { q: "Aus welchem Land stammt die Pizza?", a: ["Griechenland", "Frankreich", "Italien", "Spanien"], c: 2, cat: "Alltag" },
    { q: "Wie heisst der längste Fluss Afrikas?", a: ["Kongo", "Niger", "Nil", "Sambesi"], c: 2, cat: "Geografie" },
    { q: "Welches Tier ist das grösste lebende Landtier?", a: ["Giraffe", "Afrikanischer Elefant", "Nashorn", "Flusspferd"], c: 1, cat: "Natur" },
    { q: "Wer malte die «Mona Lisa»?", a: ["Michelangelo", "Raffael", "Leonardo da Vinci", "Vincent van Gogh"], c: 2, cat: "Kunst" },
    { q: "Wie viele Buchstaben hat das moderne deutsche Alphabet ohne Umlaute?", a: ["24", "25", "26", "27"], c: 2, cat: "Sprache" },
    { q: "Was ist die chemische Formel von Wasser?", a: ["CO2", "H2O", "O2", "NaCl"], c: 1, cat: "Chemie" },
    { q: "In welchem Jahr fiel die Berliner Mauer?", a: ["1987", "1989", "1991", "1990"], c: 1, cat: "Geschichte" },
    { q: "Welcher Kontinent hat die meisten Länder?", a: ["Asien", "Europa", "Afrika", "Südamerika"], c: 2, cat: "Geografie" },
    { q: "Wie schnell ist Licht im Vakuum ungefähr?", a: ["300.000 km/s", "30.000 km/s", "3.000 km/s", "3 Mio. km/s"], c: 0, cat: "Physik" },
    { q: "Wer erfand den Buchdruck mit beweglichen Lettern in Europa?", a: ["Leonardo da Vinci", "Johannes Gutenberg", "Galileo Galilei", "Martin Luther"], c: 1, cat: "Geschichte" },
    { q: "Wie viele Herzkammern hat das menschliche Herz?", a: ["Zwei", "Drei", "Vier", "Fünf"], c: 2, cat: "Biologie" },
    { q: "Welches ist das kleinste Bundesland Deutschlands?", a: ["Saarland", "Hamburg", "Bremen", "Berlin"], c: 2, cat: "Geografie" },
    { q: "Wie nennt man den Vorgang, bei dem Pflanzen Licht in Energie umwandeln?", a: ["Atmung", "Photosynthese", "Gärung", "Oxidation"], c: 1, cat: "Biologie" },
    { q: "Welche Programmiersprache wurde von Guido van Rossum entwickelt?", a: ["Java", "Python", "Ruby", "C++"], c: 1, cat: "Technik" },
    { q: "Wie viele Grad hat ein rechter Winkel?", a: ["45", "90", "180", "360"], c: 1, cat: "Mathematik" },
    { q: "Welcher Komponist schrieb die «Zauberflöte»?", a: ["Beethoven", "Mozart", "Bach", "Haydn"], c: 1, cat: "Musik" },
    { q: "Wie heisst der höchste Berg der Erde?", a: ["K2", "Mount Everest", "Kilimandscharo", "Mont Blanc"], c: 1, cat: "Geografie" },
    { q: "Was bedeutet die Abkürzung «KI»?", a: ["Künstliche Intelligenz", "Kleine Interaktion", "Kreativer Input", "Kontrollierte Information"], c: 0, cat: "Technik" },
    { q: "Wie viele Spieler stehen bei einer Fussballmannschaft auf dem Feld?", a: ["9", "10", "11", "12"], c: 2, cat: "Sport" },
    { q: "Welches Land hat die grösste Bevölkerung?", a: ["USA", "China", "Indien", "Indonesien"], c: 2, cat: "Geografie" },
    { q: "Aus wie vielen Knochen besteht der erwachsene menschliche Körper ungefähr?", a: ["106", "206", "306", "406"], c: 1, cat: "Biologie" },
    { q: "Wer schrieb «1984»?", a: ["Aldous Huxley", "George Orwell", "Ray Bradbury", "Franz Kafka"], c: 1, cat: "Literatur" },
    { q: "Welche Farbe entsteht, wenn man Blau und Gelb mischt?", a: ["Orange", "Violett", "Grün", "Braun"], c: 2, cat: "Kunst" },
    { q: "Wie heisst die kleinste Einheit eines chemischen Elements?", a: ["Molekül", "Atom", "Zelle", "Ion"], c: 1, cat: "Chemie" },
    { q: "In welchem Land wurde die Demokratie begründet?", a: ["Rom", "Griechenland", "Ägypten", "Persien"], c: 1, cat: "Geschichte" },
    { q: "Was misst man mit einem Barometer?", a: ["Temperatur", "Luftdruck", "Windstärke", "Luftfeuchtigkeit"], c: 1, cat: "Physik" },
    { q: "Wie viele Sekunden hat eine Stunde?", a: ["3000", "3600", "6000", "7200"], c: 1, cat: "Alltag" },
    { q: "Welches Instrument hat Pedale, Saiten und Hämmer?", a: ["Gitarre", "Klavier", "Harfe", "Geige"], c: 1, cat: "Musik" },
    { q: "Wie heisst das grösste Korallenriff der Welt?", a: ["Barriereriff", "Great Barrier Reef", "Rotes Riff", "Malediven-Riff"], c: 1, cat: "Natur" },
    { q: "Welche Zahl ist keine Primzahl?", a: ["2", "7", "9", "11"], c: 2, cat: "Mathematik" },
    { q: "Wer war der erste Mensch auf dem Mond?", a: ["Buzz Aldrin", "Neil Armstrong", "Juri Gagarin", "Michael Collins"], c: 1, cat: "Geschichte" },
    { q: "Wie heisst die Sprache, die in Brasilien gesprochen wird?", a: ["Spanisch", "Portugiesisch", "Französisch", "Italienisch"], c: 1, cat: "Sprache" },
    { q: "Welcher Stoff leitet elektrischen Strom am besten?", a: ["Holz", "Kupfer", "Glas", "Gummi"], c: 1, cat: "Physik" },
    { q: "Wie viele Kontinente gibt es üblicherweise?", a: ["5", "6", "7", "8"], c: 2, cat: "Geografie" },
    { q: "Was ist die Hauptstadt von Kanada?", a: ["Toronto", "Vancouver", "Ottawa", "Montreal"], c: 2, cat: "Geografie" },
    { q: "Wer schrieb die «Ode an die Freude», die Beethoven vertonte?", a: ["Goethe", "Schiller", "Heine", "Lessing"], c: 1, cat: "Literatur" },
    { q: "Wie nennt man ein Dreieck mit drei gleich langen Seiten?", a: ["Rechtwinklig", "Gleichseitig", "Gleichschenklig", "Stumpf"], c: 1, cat: "Mathematik" },
    { q: "Welches Gas atmen Pflanzen beim Wachsen auf?", a: ["Sauerstoff", "Kohlendioxid", "Stickstoff", "Helium"], c: 1, cat: "Biologie" },
    { q: "In welchem Jahr begann der Erste Weltkrieg?", a: ["1912", "1914", "1918", "1939"], c: 1, cat: "Geschichte" },
    { q: "Wie heisst das Betriebssystem von Google für Smartphones?", a: ["iOS", "Android", "Windows Phone", "Symbian"], c: 1, cat: "Technik" },
    { q: "Wie viele Zähne hat ein erwachsener Mensch normalerweise?", a: ["28", "30", "32", "34"], c: 2, cat: "Biologie" },
    { q: "Welches Metall ist bei Raumtemperatur flüssig?", a: ["Eisen", "Quecksilber", "Aluminium", "Zink"], c: 1, cat: "Chemie" },
    { q: "Wer gilt als Begründer der modernen Physik mit dem Gravitationsgesetz?", a: ["Einstein", "Newton", "Kepler", "Galilei"], c: 1, cat: "Physik" },
    { q: "Was ist die Hauptstadt von Neuseeland?", a: ["Auckland", "Wellington", "Christchurch", "Dunedin"], c: 1, cat: "Geografie" },
    { q: "Wie nennt man die Kunstform mit geprägtem Papier auf Leinwand?", a: ["Collage", "Mosaik", "Fresko", "Skulptur"], c: 0, cat: "Kunst" },
    { q: "Wie viele Himmelsrichtungen gibt es auf dem Kompass?", a: ["2", "4", "8", "16"], c: 2, cat: "Alltag" },
    { q: "Welche Pflanze produziert die grössten Blüten?", a: ["Sonnenblume", "Rafflesia", "Rose", "Tulpe"], c: 1, cat: "Natur" },
    { q: "Wie heisst der Prozess, bei dem Gestein durch Wetter zerfällt?", a: ["Erosion", "Vulkanismus", "Metamorphose", "Sedimentation"], c: 0, cat: "Natur" },
    { q: "Welche Sprache hat die meisten Muttersprachler?", a: ["Englisch", "Chinesisch (Mandarin)", "Spanisch", "Hindi"], c: 1, cat: "Sprache" },
    { q: "Wie viele Bytes hat ein Kilobyte nach üblicher Computerangabe (gerundet)?", a: ["10", "100", "1000", "1024"], c: 3, cat: "Technik" },
    { q: "Wer war Bundeskanzler, als Deutschland 1990 wiedervereinigt wurde?", a: ["Willy Brandt", "Helmut Kohl", "Gerhard Schröder", "Helmut Schmidt"], c: 1, cat: "Geschichte" },
    { q: "Welcher Anteil der Erdoberfläche ist von Wasser bedeckt (gerundet)?", a: ["50 %", "60 %", "71 %", "85 %"], c: 2, cat: "Geografie" },
    { q: "Was bedeutet «Halbwertszeit» bei radioaktivem Zerfall?", a: ["Zeit bis zur Hälfte des Materials", "Zeit bis zum Siedepunkt", "Hälfte der Energie", "Zeit in Jahren"], c: 0, cat: "Physik" },
  ];

  return {
    WORDS: WORDS,
    EXPLAIN: EXPLAIN,
    FIGURES_SPORT: FIGURES_SPORT,
    FIGURES_TECH: FIGURES_TECH,
    SORT_SETS: SORT_SETS,
    THESES: THESES,
    THEMES: THEMES,
    QUESTIONS: QUESTIONS,
  };
})();
