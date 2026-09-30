/* ==========================================================================
   Seidla — Aufgabenkatalog
   Kein Minispielkram: Jeder bekommt für den Abend eine Handvoll Aufgaben,
   die er mit einem Foto nachweisen muss. Viele Aufgaben hängen an einer
   anderen Person — "{ziel}" wird beim Austeilen durch einen Namen ersetzt.
   Dadurch zieht sich ein Netz durch die ganze Runde.

   Die Texte sind absichtlich derb-fränkisch, aber niemand wird bloßgestellt:
   die Aufgabe darf immer an eine Vertrauensperson weitergegeben werden.
   ========================================================================== */
(function () {
  "use strict";
  const SS = window.SS;

  /* ── Aufgabentypen ────────────────────────────────────────────────────────
     Der Wirt wählt vor dem Austeilen aus, was in Frage kommt. Jeder Typ hat
     eine Härte (1 = harmlos, 3 = wild), damit man den Abend dosieren kann. */
  const TYPES = [
    { id: "anstoßen", name: "Anstoßen", glyph: "🍻", level: 1, hint: "Mit jemandem anstoßen und Beweisfoto." },
    { id: "trinken", name: "Trinken", glyph: "🥤", level: 1, hint: "Ein Schluck auf Kommando." },
    { id: "reden", name: "Reden", glyph: "💬", level: 1, hint: "Ein Gespräch anfangen oder halten." },
    { id: "bewegung", name: "Bewegung", glyph: "🕺", level: 1, hint: "Tanzen, hüpfen, hinstellen." },
    { id: "foto", name: "Foto & Pose", glyph: "📸", level: 1, hint: "Ein Bild stellen." },
    { id: "singen", name: "Singen", glyph: "🎤", level: 2, hint: "Laut und schief." },
    { id: "kontakt", name: "Kontakt", glyph: "🤝", level: 2, hint: "Leute ansprechen, die man nicht kennt." },
    { id: "mut", name: "Mut", glyph: "🔥", level: 2, hint: "Überwindung, aber harmlos." },
    { id: "quatsch", name: "Quatsch", glyph: "🤪", level: 2, hint: "Blödsinn mit Ansage." },
    { id: "wild", name: "Wild", glyph: "💥", level: 3, hint: "Für die, die es wissen wollen." },
  ];
  const typeById = (id) => TYPES.find((t) => t.id === id) || null;

  /* ── Aufgaben ─────────────────────────────────────────────────────────────
     {ziel} = eine andere Person aus der Runde.
     {zahl} = wird zur Laufzeit durch eine sinnvolle Zahl ersetzt.            */
  const TASKS = [
    /* ── Anstoßen ── */
    { id: "a1", type: "anstoßen", level: 1, text: "Stoß mit {ziel} an und schau dabei tief in die Augen. Foto!" },
    { id: "a2", type: "anstoßen", level: 1, text: "Finde {ziel}, stoß an und sag laut «Auf uns, die Deppen vom Dienst»." },
    { id: "a3", type: "anstoßen", level: 1, text: "Stoß mit {ziel} an, ohne dabei zu grinsen. Wenn du grinst, nochmal." },
    { id: "a4", type: "anstoßen", level: 1, text: "Such {ziel}, stoß an und erzähl dabei eine Lüge, die offensichtlich eine ist." },
    { id: "a5", type: "anstoßen", level: 1, text: "Stoß mit {ziel} an und behaupte laut, ihr seid verwandt. Foto als Beweis." },
    { id: "a6", type: "anstoßen", level: 1, text: "Lass dir von {ziel} den Becher halten und stoß mit einem Dritten an. Wer war's?" },
    { id: "a7", type: "anstoßen", level: 1, text: "Stoß mit {ziel} an — aber jeder mit dem Becher des anderen." },
    { id: "a8", type: "anstoßen", level: 1, text: "Geh zu {ziel} und stoß an, während du auf einem Bein stehst." },

    /* ── Trinken ── */
    { id: "t1", type: "trinken", level: 1, text: "Trink einen Schluck, während {ziel} laut zählt. Foto beim Zählen." },
    { id: "t2", type: "trinken", level: 1, text: "Trink {zahl} Schlucke hintereinander, ohne abzusetzen. {ziel} schaut zu." },
    { id: "t3", type: "trinken", level: 1, text: "Lass {ziel} deinen Becher halten und trink daraus. Foto!" },
    { id: "t4", type: "trinken", level: 1, text: "Bring {ziel} ein Getränk mit, ohne zu fragen, was gewünscht ist. Getrunken wird trotzdem." },
    { id: "t5", type: "trinken", level: 1, text: "Trink auf das Wohl von {ziel} und nenne dabei drei gute Eigenschaften." },
    { id: "t6", type: "trinken", level: 2, text: "Trink {zahl} Schlucke und lass dir von {ziel} dabei die Ohren zuhalten." },
    { id: "t7", type: "trinken", level: 1, text: "Finde heraus, was {ziel} trinkt, und trink einen Schluck davon. Foto!" },
    { id: "t8", type: "trinken", level: 1, text: "Trink mit {ziel} gleichzeitig — aber ohne anzustoßen und ohne euch anzusehen." },

    /* ── Reden ── */
    { id: "r1", type: "reden", level: 1, text: "Führ mit {ziel} ein Gespräch über ein Thema, das {ziel} aussucht. Mindestens eine Minute." },
    { id: "r2", type: "reden", level: 1, text: "Erzähl {ziel} von deinem peinlichsten Moment. Es muss genickt und «kenn i» gesagt werden." },
    { id: "r3", type: "reden", level: 1, text: "Lob {ziel} dreißig Sekunden lang, ohne dass es gelogen klingt." },
    { id: "r4", type: "reden", level: 1, text: "Frag {ziel} nach einem Geheimnis, das noch nie erzählt wurde." },
    { id: "r5", type: "reden", level: 1, text: "Führ mit {ziel} ein Gespräch, in dem jeder Satz mit «Des is a Frechheit» endet." },
    { id: "r6", type: "reden", level: 2, text: "Überzeuge {ziel} in einer Minute, dass er dir sein Getränk geben soll." },
    { id: "r7", type: "reden", level: 1, text: "Erzähl {ziel} die Handlung deines Lieblingsfilms — als wär's im Wirtshaus passiert." },
    { id: "r8", type: "reden", level: 1, text: "Red mit {ziel} nur in Fragen. Wer eine Antwort gibt, hat verloren. Foto!" },

    /* ── Bewegung ── */
    { id: "b1", type: "bewegung", level: 1, text: "Bring {ziel} dazu, mit dir eine Minute zu tanzen. Foto beim Tanzen." },
    { id: "b2", type: "bewegung", level: 1, text: "Hüpf {zahl} Mal auf einem Bein und lass {ziel} laut mitzählen. Foto!" },
    { id: "b3", type: "bewegung", level: 1, text: "Geh mit {ziel} eine Runde um den Raum, ohne den Boden zu berühren, wenn er's tut." },
    { id: "b4", type: "bewegung", level: 1, text: "Mach mit {ziel} ein Standbild wie bei einem Pokalfoto. Foto!" },
    { id: "b5", type: "bewegung", level: 2, text: "Tanz mit {ziel} zehn Sekunden wie bei der Kirchweih. Foto als Beweis." },
    { id: "b6", type: "bewegung", level: 1, text: "Trag {ziel} auf dem Rücken drei Schritte weit. Foto!" },
    { id: "b7", type: "bewegung", level: 1, text: "Stell dich mit {ziel} Rücken an Rücken und messen wer größer ist. Foto." },
    { id: "b8", type: "bewegung", level: 2, text: "Lass {ziel} eine Bewegung vorgeben und mach sie nach, bis er aufhört. Foto!" },

    /* ── Foto & Pose ── */
    { id: "f1", type: "foto", level: 1, text: "Mach mit {ziel} ein Selfie, bei dem keiner ins Bild schaut." },
    { id: "f2", type: "foto", level: 1, text: "Stell dich mit {ziel} hin, als wärt ihr ein Brautpaar. Foto!" },
    { id: "f3", type: "foto", level: 1, text: "Finde {ziel} und mach ein Foto, das überrascht aussieht." },
    { id: "f4", type: "foto", level: 1, text: "Posier mit {ziel} als wärt ihr Verbrecher auf dem Fahndungsfoto." },
    { id: "f5", type: "foto", level: 1, text: "Mach ein Foto mit {ziel}, auf dem ihr beide die Zunge rausstreckt." },
    { id: "f6", type: "foto", level: 1, text: "Lass {ziel} das Foto von dir machen — die Pose wird bestimmt, nicht verhandelt." },
    { id: "f7", type: "foto", level: 1, text: "Mach mit {ziel} ein Foto, auf dem ihr so tut, als wärt ihr im Wirtshaus eingeschlafen." },
    { id: "f8", type: "foto", level: 2, text: "Stell dich mit {ziel} hinter die Bar oder auf etwas Erhöhtes. Foto!" },

    /* ── Singen ── */
    { id: "s1", type: "singen", level: 2, text: "Sing {ziel} ein Ständchen. Laut. Foto als Beweis." },
    { id: "s2", type: "singen", level: 2, text: "Sing mit {ziel} im Duett ein Wirtshauslied, das {ziel} aussucht." },
    { id: "s3", type: "singen", level: 2, text: "Sing dem Wirt ein Lied vor. Der Wirt macht das Foto." },
    { id: "s4", type: "singen", level: 2, text: "Sing einen Schlager falsch und lass {ziel} raten, welcher es war. Foto!" },
    { id: "s5", type: "singen", level: 2, text: "Bring {ziel} dazu, mit dir den Refrain zu brüllen. Foto!" },

    /* ── Kontakt ── */
    { id: "k1", type: "kontakt", level: 2, text: "Red mit jemandem, den du heute noch nicht gesprochen hast, über sein Getränk. Foto!" },
    { id: "k2", type: "kontakt", level: 2, text: "Finde zwei Leute, die sich nicht kennen, und stell sie einander vor. Foto!" },
    { id: "k3", type: "kontakt", level: 2, text: "Erzähl einem Fremden einen Witz. Ob gelacht wird oder nicht — Foto!" },
    { id: "k4", type: "kontakt", level: 2, text: "Frag drei Leute nach ihrem Lieblingsgetränk und merk dir alle. Foto mit einem davon." },
    { id: "k5", type: "kontakt", level: 2, text: "Setz dich zu Leuten, bei denen kein Platz ist, und red mit. Foto!" },
    { id: "k6", type: "kontakt", level: 2, text: "Bekomm von jemandem Fremden einen Schluck aus dem Glas. Foto!" },

    /* ── Mut ── */
    { id: "m1", type: "mut", level: 2, text: "Halt eine einminütige Rede auf {ziel}. Alle müssen zuhören. Foto!" },
    { id: "m2", type: "mut", level: 2, text: "Sag {ziel} drei Komplimente, die du noch niemandem gesagt hast." },
    { id: "m3", type: "mut", level: 2, text: "Erzähl der ganzen Runde laut, was {ziel} vor fünf Minuten gemacht hat." },
    { id: "m4", type: "mut", level: 2, text: "Frag den Wirt nach einem Gratisgetränk. Foto beim Fragen." },
    { id: "m5", type: "mut", level: 2, text: "Übernimm eine Minute die Musik und such etwas aus, zu dem alle tanzen sollen. Foto!" },
    { id: "m6", type: "mut", level: 3, text: "Lass dir von der ganzen Runde ein Kompliment geben und bedanke dich bei jedem einzeln. Foto!" },

    /* ── Quatsch ── */
    { id: "q1", type: "quatsch", level: 2, text: "Sprich {zahl} Minuten lang nur im Dialekt mit {ziel}. Foto als Beweis." },
    { id: "q2", type: "quatsch", level: 2, text: "Erfinde einen Spitznamen für {ziel} und benutz ihn bis zum Ende des Abends." },
    { id: "q3", type: "quatsch", level: 2, text: "Mach mit {ziel} einen Handschlag aus, an den man sich morgen noch erinnert. Foto!" },
    { id: "q4", type: "quatsch", level: 2, text: "Flüster {ziel} etwas ins Ohr, das alle anderen hören können. Foto!" },
    { id: "q5", type: "quatsch", level: 2, text: "Nenn {ziel} für den Rest des Abends «Herr Wachtmeister». Foto als Beweis." },
    { id: "q6", type: "quatsch", level: 2, text: "Erfinde eine Regel für den Abend und verkünde sie laut. Foto!" },

    /* ── Wild ── */
    { id: "w1", type: "wild", level: 3, text: "Bekomm von {ziel} ein Getränk ausgegeben, ohne zu fragen. Foto!" },
    { id: "w2", type: "wild", level: 3, text: "Tausch mit {ziel} für den Rest des Abends die Plätze. Foto als Beweis." },
    { id: "w3", type: "wild", level: 3, text: "Lass {ziel} entscheiden, was du die nächsten zehn Minuten trinkst. Foto!" },
    { id: "w4", type: "wild", level: 3, text: "Mach mit {ziel} einen Deal: wer zuerst lacht, zahlt die nächste Runde. Foto beim Deal." },
    { id: "w5", type: "wild", level: 3, text: "Halt mit {ziel} fünf Sekunden lang die Hände, ohne dass es komisch wird. Foto!" },
    { id: "w6", type: "wild", level: 3, text: "Sag der Runde, was du von {ziel} wirklich hältst — nur Nettes. Foto!" },

    /* ── Aufgaben ohne Zielperson (für ganz kleine Runden) ── */
    { id: "x1", type: "foto", level: 1, text: "Mach ein Foto von deinem Getränk an einem Ort, wo es nicht hingehört." },
    { id: "x2", type: "bewegung", level: 1, text: "Stell dich auf etwas, das kein Stuhl ist, und lass dich dabei fotografieren." },
    { id: "x3", type: "quatsch", level: 2, text: "Zieh dir irgendwas Verkehrtes an und trag es bis zum Ende des Abends. Foto!" },
    { id: "x4", type: "foto", level: 1, text: "Mach ein Foto, auf dem du aussiehst, als hättest du gerade gewonnen." },
    { id: "x5", type: "trinken", level: 1, text: "Trink einen Schluck mit der falschen Hand. Foto als Beweis." },
  ];

  /* ── Vorschläge, die die Runde selbst einbringen kann ────────────────────
     Der Wirt muss sie freigeben, dann landen sie im Vorrat. */
  const SIDE_IDEAS = [
    "Anstoßen mit {ziel} und dabei ein Kompliment machen.",
    "Bring {ziel} zum Lachen, ohne ein Wort zu sagen.",
    "Hol {ziel} ein Getränk und sag dabei keinen Ton.",
    "Finde mit {ziel} drei Gemeinsamkeiten in einer Minute.",
    "Mach mit {ziel} ein Foto, als wärt ihr auf einem Fahndungsplakat.",
    "Erzähl {ziel} einen Witz, den er noch nicht kennt.",
    "Lass dir von {ziel} eine Aufgabe geben und mach sie sofort.",
    "Trink mit {ziel} gleichzeitig, ohne euch anzusehen.",
    "Tanz mit {ziel} eine halbe Minute, egal was läuft.",
    "Frag {ziel}, was er heute bereut — und tröst ihn mit einem Schluck.",
  ];

  /* ── Vorschläge für die Sidequest (optional, freiwillig) ─────────────────
     Sidequests sind Extra-Aufgaben für zwischendurch. Sie sind ausdrücklich
     freiwillig und geben Extrapunkte. Jemand reicht einen Vorschlag ein,
     der Wirt gibt ihn frei, dann bekommt ihn eine zufällige Person. */
  const SIDE_QUESTS = [
    { id: "sq1", text: "Bring drei Leute dazu, mit dir gleichzeitig anzustoßen. Foto!" },
    { id: "sq2", text: "Sammle ein Selfie mit fünf verschiedenen Leuten." },
    { id: "sq3", text: "Bring die halbe Runde dazu, etwas gleichzeitig zu machen. Foto!" },
    { id: "sq4", text: "Finde den längsten Bart oder die längsten Haare und mach ein Foto." },
    { id: "sq5", text: "Bekomm ein Getränk ausgegeben, ohne zu fragen. Foto!" },
    { id: "sq6", text: "Bring jemanden dazu, dir ein Kompliment zu machen. Foto als Beweis." },
    { id: "sq7", text: "Stell dich zu einer Gruppe, die du nicht kennst, und mach ein Foto mit ihnen." },
    { id: "sq8", text: "Bring zwei Leute dazu, die Plätze zu tauschen. Foto!" },
    { id: "sq9", text: "Lass dich von drei Leuten gleichzeitig fotografieren." },
    { id: "sq10", text: "Bring die Runde dazu, für dich zu klatschen. Foto!" },
    { id: "sq11", text: "Erfinde einen Trinkspruch und bring ihn der Runde bei. Foto!" },
    { id: "sq12", text: "Finde heraus, wer am längsten dabei ist, und mach ein Foto mit ihm." },
  ];

  const sideById = (id) => SIDE_QUESTS.find((s) => s.id === id) || null;
  const taskById = (id) => TASKS.find((t) => t.id === id) || null;

  /** Aufgaben eines Typs, optional nach Härte gefiltert. */
  const tasksOfType = (typeId, maxLevel) =>
    TASKS.filter((t) => t.type === typeId && (maxLevel === undefined || t.level <= maxLevel));

  const taskTypes = () => TYPES.slice();
  const maxLevelOf = (typeId) => {
    const list = tasksOfType(typeId);
    return list.reduce((m, t) => Math.max(m, t.level), 0);
  };

  SS.tasks = {
    TYPES, TASKS, SIDE_QUESTS, SIDE_IDEAS,
    typeById, taskById, sideById, tasksOfType, taskTypes, maxLevelOf,
  };
})();
