/* ==========================================================================
   Seidla — Aufgabenkatalog
   Jeder bekommt für den Abend eine Handvoll Aufgaben und weist sie mit einem
   Foto nach. Viele Aufgaben hängen an einer anderen Person — "{ziel}" wird
   beim Austeilen durch einen Namen ersetzt. Dadurch zieht sich ein Netz durch
   die ganze Runde.

   Drei Modi dosieren den Abend:
     entspannt  — harmlos, jeder kann mit
     hardcore   — es wird deutlich derber
     vollsuff   — asozial. Nur für Runden, die das ausdrücklich wollen.

   Wichtig: Keine Aufgabe zwingt jemanden, sich zu verletzen, etwas zu tun,
   was er nicht will, oder gegen seinen Willen fotografiert zu werden. Wer
   nicht mag, gibt an eine Vertrauensperson ab — ohne Punktabzug.
   ========================================================================== */
(function () {
  "use strict";
  const SS = window.SS;

  /* ── Kategorien ───────────────────────────────────────────────────────────
     Der Wirt wählt vor dem Austeilen aus, was in Frage kommt. Jede Kategorie
     hat eine Härte (1 = harmlos, 3 = asozial). Der Modus begrenzt sie. */
  const TYPES = [
    { id: "anstossen", name: "Anstoßen", glyph: "🍻", level: 1, hint: "Mit jemandem anstoßen — die Website sucht den Mitspieler aus." },
    { id: "kuessen", name: "Küssen", glyph: "😘", level: 1, hint: "Bussi auf Wange oder Stirn. Nur wenn alle einverstanden sind." },
    { id: "trick", name: "Trick", glyph: "🎩", level: 1, hint: "Kunststück, Zungenbrecher, Geschicklichkeit." },
    { id: "tanzen", name: "Tanzen", glyph: "🕺", level: 1, hint: "Bewegen, tanzen, hinstellen." },
    { id: "singen", name: "Singen", glyph: "🎤", level: 2, hint: "Laut und schief." },
    { id: "reden", name: "Reden", glyph: "💬", level: 1, hint: "Gespräch anfangen oder halten." },
    { id: "foto", name: "Foto & Pose", glyph: "📸", level: 1, hint: "Ein Bild stellen." },
    { id: "kontakt", name: "Kontakt", glyph: "🤝", level: 2, hint: "Leute ansprechen, die man nicht kennt." },
    { id: "mutprobe", name: "Mutprobe", glyph: "🔥", level: 2, hint: "Überwindung — aber harmlos." },
    { id: "quatsch", name: "Quatsch", glyph: "🤪", level: 2, hint: "Blödsinn mit Ansage." },
    { id: "kotzen", name: "Kotzen", glyph: "🤮", level: 3, hint: "Widerlich. Gehört zum Vollsuff — nüchtern bitte nicht." },
  ];
  const typeById = (id) => TYPES.find((t) => t.id === id) || null;

  /* ── Modi ─────────────────────────────────────────────────────────────────
     Ein Modus setzt die Härtegrenze und schaltet Kategorien frei. */
  const MODES = [
    { id: "entspannt", name: "Entspannt", level: 1, glyph: "🌿",
      hint: "Harmlos. Für gemischte Runden, Kollegen, die erste Kirchweih." },
    { id: "hardcore", name: "Hardcore", level: 2, glyph: "🔥",
      hint: "Es wird derber. Alle sollten wissen, worauf sie sich einlassen." },
    { id: "vollsuff", name: "Vollsuff", level: 3, glyph: "💀",
      hint: "Asozial. Kotzen, Grenzen, kein Anstand. Nur für Runden, die das ausdrücklich wollen." },
  ];
  const modeById = (id) => MODES.find((m) => m.id === id) || MODES[0];

  /* ── Aufgaben ─────────────────────────────────────────────────────────────
     {ziel} = eine andere Person aus der Runde (wird zufällig gezogen).
     {zahl} = wird beim Austeilen durch eine sinnvolle Zahl ersetzt.

     Aufgaben mit {ziel} in den Kategorien anstossen und kuessen sind
     "gerichtet": das Ziel wird von der Website gezogen, nicht gewählt.     */
  const TASKS = [
    /* ══ Anstoßen ═════════════════════════════════════════════════════════ */
    { id: "as1", type: "anstossen", level: 1, text: "Stoß mit {ziel} an und schau dabei tief in die Augen. Foto!" },
    { id: "as2", type: "anstossen", level: 1, text: "Such {ziel}, stoß an und sag laut «Auf uns, die Deppen vom Dienst»." },
    { id: "as3", type: "anstossen", level: 1, text: "Stoß mit {ziel} an, ohne dabei zu grinsen. Wenn du grinst, nochmal." },
    { id: "as4", type: "anstossen", level: 1, text: "Stoß mit {ziel} an und behaupte laut, ihr seid verwandt. Foto!" },
    { id: "as5", type: "anstossen", level: 1, text: "Stoß mit {ziel} an — aber jeder mit dem Glas des anderen." },
    { id: "as6", type: "anstossen", level: 1, text: "Geh zu {ziel} und stoß an, während du auf einem Bein stehst. Foto!" },
    { id: "as7", type: "anstossen", level: 1, text: "Lass dir von {ziel} das Glas halten und stoß mit einem Dritten an. Wer war's?" },
    { id: "as8", type: "anstossen", level: 1, text: "Stoß mit {ziel} an und trink dabei gleichzeitig aus dem Glas des anderen." },
    { id: "as9", type: "anstossen", level: 2, text: "Stoß mit {ziel} an, sag drei Komplimente hintereinander und trink nach jedem." },
    { id: "as10", type: "anstossen", level: 2, text: "Lass {ziel} entscheiden, wie oft ihr anstößt. Jedes Mal wird getrunken." },
    { id: "as11", type: "anstossen", level: 3, text: "Stoß mit {ziel} an und lass {ziel} bestimmen, wie viel du trinkst. Foto!" },
    { id: "as12", type: "anstossen", level: 3, text: "Stoß mit {ziel} an und trink aus jedem Glas in Reichweite einen Schluck. Foto!" },

    /* ══ Küssen ═══════════════════════════════════════════════════════════ */
    { id: "ku1", type: "kuessen", level: 1, text: "Gib {ziel} ein Bussi auf die Wange. Foto als Beweis." },
    { id: "ku2", type: "kuessen", level: 1, text: "Gib {ziel} einen Kuss auf die Stirn und sag dabei etwas Nettes." },
    { id: "ku3", type: "kuessen", level: 1, text: "Mach mit {ziel} ein Foto, auf dem ihr euch Wangenküsschen gebt." },
    { id: "ku4", type: "kuessen", level: 1, text: "Frag {ziel}, wo er geküsst werden möchte, und tu es dort — Wange oder Stirn. Foto!" },
    { id: "ku5", type: "kuessen", level: 1, text: "Gib {ziel} einen Handkuss und verneige dich dabei. Foto!" },
    { id: "ku6", type: "kuessen", level: 2, text: "Gib {ziel} einen Kuss auf die Wange und lass dir einen zurückgeben. Foto!" },
    { id: "ku7", type: "kuessen", level: 2, text: "Küss {ziel} auf die Stirn und flüster dabei ein Geheimnis." },
    { id: "ku8", type: "kuessen", level: 2, text: "Mach mit {ziel} ein Foto wie bei einem Filmkuss — ohne dass sich die Lippen berühren." },
    { id: "ku9", type: "kuessen", level: 3, text: "Küss {ziel} auf den Hals. Nur wenn {ziel} ausdrücklich Ja sagt. Foto!" },
    { id: "ku10", type: "kuessen", level: 3, text: "Lass {ziel} entscheiden, wohin der Kuss geht — Wange, Stirn oder Hals. Foto!" },

    /* ══ Trick ════════════════════════════════════════════════════════════ */
    { id: "tr1", type: "trick", level: 1, text: "Zerbrich dir die Zunge an «Fischers Fritz fischt frische Fische» — dreimal. Foto!" },
    { id: "tr2", type: "trick", level: 1, text: "Balancier ein Glas {zahl} Sekunden auf dem Handrücken. {ziel} zählt. Foto!" },
    { id: "tr3", type: "trick", level: 1, text: "Wirf {zahl} Bierfilz in den Becher von {ziel}, ohne dass er es merkt. Foto!" },
    { id: "tr4", type: "trick", level: 1, text: "Mach einen Knoten in einen Strohhalm, ohne ihn zu knicken. Foto!" },
    { id: "tr5", type: "trick", level: 1, text: "Erzähl {ziel} einen Kartentrick und lass ihn nicht draufkommen. Foto!" },
    { id: "tr6", type: "trick", level: 1, text: "Stell ein volles Glas auf den Kopf und geh {zahl} Schritte. {ziel} macht das Foto." },
    { id: "tr7", type: "trick", level: 2, text: "Öffne eine Flasche ohne Öffner. Foto als Beweis." },
    { id: "tr8", type: "trick", level: 2, text: "Trink ein Glas in einem Zug aus, ohne abzusetzen, und {ziel} zählt die Sekunden. Foto!" },
    { id: "tr9", type: "trick", level: 2, text: "Lass {ziel} eine Zahl zwischen 1 und 6 sagen und balancier so viele gefüllte Gläser. Foto!" },
    { id: "tr10", type: "trick", level: 3, text: "Bau mit {zahl} Gläsern einen Turm und trink ihn danach ab. Foto!" },
    { id: "tr11", type: "trick", level: 3, text: "Fang ein Glas, das {ziel} dir zuwirft, ohne es fallen zu lassen. Foto!" },

    /* ══ Tanzen ═══════════════════════════════════════════════════════════ */
    { id: "ta1", type: "tanzen", level: 1, text: "Bring {ziel} dazu, mit dir eine Minute zu tanzen. Foto beim Tanzen." },
    { id: "ta2", type: "tanzen", level: 1, text: "Tanz mit {ziel} zehn Sekunden wie bei der Kirchweih. Foto!" },
    { id: "ta3", type: "tanzen", level: 1, text: "Geh mit {ziel} eine Runde durch den Raum, ohne den Boden zu berühren, wenn er's tut." },
    { id: "ta4", type: "tanzen", level: 1, text: "Mach mit {ziel} ein Standbild wie bei einem Pokalfoto. Foto!" },
    { id: "ta5", type: "tanzen", level: 1, text: "Trag {ziel} auf dem Rücken drei Schritte weit. Foto!" },
    { id: "ta6", type: "tanzen", level: 1, text: "Stell dich mit {ziel} Rücken an Rücken und schaut, wer größer ist. Foto!" },
    { id: "ta7", type: "tanzen", level: 2, text: "Lass {ziel} eine Bewegung vorgeben und mach sie nach, bis er aufhört. Foto!" },
    { id: "ta8", type: "tanzen", level: 2, text: "Übernimm eine Minute die Musik und bring die Runde zum Tanzen. Foto!" },
    { id: "ta9", type: "tanzen", level: 2, text: "Tanz auf einem Stuhl, ohne runterzufallen. {ziel} filmt es. Foto!" },
    { id: "ta10", type: "tanzen", level: 3, text: "Tanz mit {ziel} {zahl} Sekunden eng umschlungen. Foto!" },
    { id: "ta11", type: "tanzen", level: 3, text: "Bring drei Leut dazu, mit dir gleichzeitig zu tanzen. Foto!" },

    /* ══ Singen ═══════════════════════════════════════════════════════════ */
    { id: "si1", type: "singen", level: 2, text: "Sing {ziel} ein Ständchen. Laut. Foto als Beweis." },
    { id: "si2", type: "singen", level: 2, text: "Sing mit {ziel} im Duett ein Wirtshauslied, das {ziel} aussucht." },
    { id: "si3", type: "singen", level: 2, text: "Sing dem Wirt ein Lied vor. Der Wirt macht das Foto." },
    { id: "si4", type: "singen", level: 2, text: "Sing einen Schlager falsch und lass {ziel} raten, welcher es war. Foto!" },
    { id: "si5", type: "singen", level: 2, text: "Bring {ziel} dazu, mit dir den Refrain zu brüllen. Foto!" },
    { id: "si6", type: "singen", level: 2, text: "Sing {zahl} Sekunden lang ein Lied, das nur aus «Seidla» besteht. Foto!" },
    { id: "si7", type: "singen", level: 3, text: "Stell dich auf einen Tisch und sing die ganze Strophe. Foto!" },

    /* ══ Reden ════════════════════════════════════════════════════════════ */
    { id: "re1", type: "reden", level: 1, text: "Führ mit {ziel} ein Gespräch über ein Thema, das {ziel} aussucht. Eine Minute." },
    { id: "re2", type: "reden", level: 1, text: "Erzähl {ziel} von deinem peinlichsten Moment. Es muss genickt und «kenn i» gesagt werden." },
    { id: "re3", type: "reden", level: 1, text: "Lob {ziel} dreißig Sekunden lang, ohne dass es gelogen klingt." },
    { id: "re4", type: "reden", level: 1, text: "Frag {ziel} nach einem Geheimnis, das noch nie erzählt wurde." },
    { id: "re5", type: "reden", level: 1, text: "Führ mit {ziel} ein Gespräch, in dem jeder Satz mit «Des is a Frechheit» endet." },
    { id: "re6", type: "reden", level: 1, text: "Erzähl {ziel} die Handlung deines Lieblingsfilms — als wär's im Wirtshaus passiert." },
    { id: "re7", type: "reden", level: 1, text: "Red mit {ziel} nur in Fragen. Wer eine Antwort gibt, hat verloren. Foto!" },
    { id: "re8", type: "reden", level: 2, text: "Überzeuge {ziel} in einer Minute, dass er dir sein Getränk geben soll." },
    { id: "re9", type: "reden", level: 2, text: "Sag {ziel} drei Dinge, die du noch niemandem gesagt hast. Foto!" },
    { id: "re10", type: "reden", level: 2, text: "Erzähl {ziel} laut, was du über ihn denkst — nur Nettes, aber ehrlich." },
    { id: "re11", type: "reden", level: 3, text: "Erzähl der Runde eine Geschichte, in der {ziel} vorkommt, und {ziel} muss mitspielen. Foto!" },
    { id: "re12", type: "reden", level: 3, text: "Beichte {ziel} etwas, das du noch nie zugegeben hast. Foto als Beweis." },

    /* ══ Foto & Pose ══════════════════════════════════════════════════════ */
    { id: "fo1", type: "foto", level: 1, text: "Mach mit {ziel} ein Selfie, bei dem keiner ins Bild schaut." },
    { id: "fo2", type: "foto", level: 1, text: "Stell dich mit {ziel} hin, als wärt ihr ein Brautpaar. Foto!" },
    { id: "fo3", type: "foto", level: 1, text: "Finde {ziel} und mach ein Foto, das überrascht aussieht." },
    { id: "fo4", type: "foto", level: 1, text: "Posier mit {ziel} als wärt ihr Verbrecher auf dem Fahndungsfoto." },
    { id: "fo5", type: "foto", level: 1, text: "Mach ein Foto mit {ziel}, auf dem ihr beide die Zunge rausstreckt." },
    { id: "fo6", type: "foto", level: 1, text: "Lass {ziel} das Foto von dir machen — die Pose wird bestimmt, nicht verhandelt." },
    { id: "fo7", type: "foto", level: 1, text: "Mach mit {ziel} ein Foto, als wärt ihr im Wirtshaus eingeschlafen." },
    { id: "fo8", type: "foto", level: 2, text: "Stell dich mit {ziel} hinter die Bar oder auf etwas Erhöhtes. Foto!" },
    { id: "fo9", type: "foto", level: 2, text: "Mach ein Foto, auf dem {ziel} dich trägt. Foto!" },
    { id: "fo10", type: "foto", level: 3, text: "Stell mit {ziel} die peinlichste Pose nach, die euch einfällt. Foto!" },

    /* ══ Kontakt ══════════════════════════════════════════════════════════ */
    { id: "ko1", type: "kontakt", level: 2, text: "Red mit jemandem, den du heute noch nicht gesprochen hast. Foto!" },
    { id: "ko2", type: "kontakt", level: 2, text: "Finde zwei Leute, die sich nicht kennen, und stell sie einander vor. Foto!" },
    { id: "ko3", type: "kontakt", level: 2, text: "Erzähl einem Fremden einen Witz. Ob gelacht wird oder nicht — Foto!" },
    { id: "ko4", type: "kontakt", level: 2, text: "Frag drei Leute nach ihrem Lieblingsgetränk und merk dir alle. Foto!" },
    { id: "ko5", type: "kontakt", level: 2, text: "Setz dich zu Leuten, bei denen kein Platz ist, und red mit. Foto!" },
    { id: "ko6", type: "kontakt", level: 2, text: "Bekomm von jemandem Fremden einen Schluck aus dem Glas. Foto!" },
    { id: "ko7", type: "kontakt", level: 3, text: "Bring einen Fremden dazu, mit dir ein Foto zu machen. Foto!" },
    { id: "ko8", type: "kontakt", level: 3, text: "Lass dir von einem Fremden einen Trinkspruch beibringen und sag ihn der Runde. Foto!" },

    /* ══ Mutprobe ═════════════════════════════════════════════════════════ */
    { id: "mu1", type: "mutprobe", level: 2, text: "Halt eine einminütige Rede auf {ziel}. Alle müssen zuhören. Foto!" },
    { id: "mu2", type: "mutprobe", level: 2, text: "Sag {ziel} drei Komplimente, die du noch niemandem gesagt hast." },
    { id: "mu3", type: "mutprobe", level: 2, text: "Erzähl der ganzen Runde laut, was {ziel} vor fünf Minuten gemacht hat." },
    { id: "mu4", type: "mutprobe", level: 2, text: "Frag den Wirt nach einem Gratisgetränk. Foto beim Fragen." },
    { id: "mu5", type: "mutprobe", level: 2, text: "Übernimm eine Minute die Musik und such etwas, zu dem alle tanzen sollen. Foto!" },
    { id: "mu6", type: "mutprobe", level: 2, text: "Lass dir von der ganzen Runde ein Kompliment geben und bedank dich bei jedem. Foto!" },
    { id: "mu7", type: "mutprobe", level: 3, text: "Ruf laut «Seidla!» und bring die halbe Wirtschaft dazu, zurückzurufen. Foto!" },
    { id: "mu8", type: "mutprobe", level: 3, text: "Frag fünf Leute, ob sie dich heiraten würden. Foto mit einem Nein." },

    /* ══ Quatsch ══════════════════════════════════════════════════════════ */
    { id: "qu1", type: "quatsch", level: 2, text: "Sprich {zahl} Minuten lang nur im Dialekt mit {ziel}. Foto als Beweis." },
    { id: "qu2", type: "quatsch", level: 2, text: "Erfinde einen Spitznamen für {ziel} und benutz ihn bis zum Ende des Abends." },
    { id: "qu3", type: "quatsch", level: 2, text: "Mach mit {ziel} einen Handschlag aus, an den man sich morgen erinnert. Foto!" },
    { id: "qu4", type: "quatsch", level: 2, text: "Flüster {ziel} etwas ins Ohr, das alle anderen hören können. Foto!" },
    { id: "qu5", type: "quatsch", level: 2, text: "Nenn {ziel} für den Rest des Abends «Herr Wachtmeister». Foto als Beweis." },
    { id: "qu6", type: "quatsch", level: 2, text: "Erfinde eine Regel für den Abend und verkünde sie laut. Foto!" },
    { id: "qu7", type: "quatsch", level: 2, text: "Zieh dir irgendwas Verkehrtes an und trag es bis zum Ende des Abends. Foto!" },
    { id: "qu8", type: "quatsch", level: 3, text: "Sprich {zahl} Minuten nur in der dritten Person über dich. Foto!" },
    { id: "qu9", type: "quatsch", level: 3, text: "Lass {ziel} dein Handy-Sperrbild für den Rest des Abends bestimmen. Foto!" },

    /* ══ Kotzen ═══════════════════════════════════════════════════════════
       Widerlich, aber niemand wird zum Trinken gezwungen: alles geht auch
       mit Wasser, Milch oder Ketchup. Und niemand muss wirklich erbrechen. */
    { id: "kt1", type: "kotzen", level: 3, text: "Trink einen Schluck Wasser, Milch und Ketchup gemischt. Foto beim Gesicht!" },
    { id: "kt2", type: "kotzen", level: 3, text: "Lass dir von {ziel} ein Getränk mischen und nimm einen Schluck davon. Foto beim Gesicht!" },
    { id: "kt3", type: "kotzen", level: 3, text: "Iss einen Löffel von etwas, das nicht auf die Karte gehört. Foto!" },
    { id: "kt4", type: "kotzen", level: 3, text: "Trink aus dem Glas von {ziel}, ohne dass er weiß, dass du es warst. Foto!" },
    { id: "kt5", type: "kotzen", level: 3, text: "Mach ein Foto von dir, als hättest du gerade {zahl} Kurze getrunken. Alle müssen mitspielen." },
    { id: "kt6", type: "kotzen", level: 3, text: "Lass dir von der Runde ein «Kotzgetränk» zusammenstellen und nimm einen Schluck. Foto!" },
    { id: "kt7", type: "kotzen", level: 3, text: "Lass dir von {ziel} mit verbundenen Augen etwas Essbares in den Mund legen und rat, was es ist. Foto!" },
    { id: "kt8", type: "kotzen", level: 3, text: "Trink einen Schluck aus jedem Glas am Tisch. Foto als Beweis." },
    { id: "kt9", type: "kotzen", level: 3, text: "Mach ein Foto, als hättest du dich gerade übergeben — mit vollem Theater. Foto!" },

    /* ══ Ohne Zielperson (kleine Runden, oder wenn kein Ziel übrig ist) ══ */
    { id: "x1", type: "foto", level: 1, text: "Mach ein Foto von deinem Getränk an einem Ort, wo es nicht hingehört." },
    { id: "x2", type: "tanzen", level: 1, text: "Stell dich auf etwas, das kein Stuhl ist, und lass dich fotografieren." },
    { id: "x3", type: "trick", level: 1, text: "Balancier einen Bierfilz auf deiner Nase. Foto!" },
    { id: "x4", type: "foto", level: 1, text: "Mach ein Foto, auf dem du aussiehst, als hättest du gerade gewonnen." },
    { id: "x5", type: "reden", level: 1, text: "Erzähl der Runde einen Witz, den noch keiner kennt. Foto!" },
    { id: "x6", type: "trick", level: 1, text: "Wirf einen Bierfilz von der Schulter und fang ihn hinter dem Rücken. Foto!" },
    { id: "x7", type: "quatsch", level: 2, text: "Sitz fünf Minuten auf dem Boden statt auf dem Stuhl. Foto!" },
    { id: "x8", type: "mutprobe", level: 2, text: "Bestell beim Wirt etwas, das nicht auf der Karte steht. Foto!" },
  ];

  /* ── Aufgaben, die zwingend eine andere Person brauchen ──────────────────
     Hier zieht die Website den Mitspieler. Wer nicht will, gibt ab. */
  const NEEDS_PARTNER = ["anstossen", "kuessen"];

  /* ── Sidequests (freiwillig, aus der Runde vorgeschlagen) ────────────────
     Der Wirt gibt frei, dann zieht eine zufällige Person die Aufgabe. */
  const SIDE_QUESTS = [
    { id: "sq1", level: 1, text: "Bring drei Leute dazu, mit dir gleichzeitig anzustoßen. Foto!" },
    { id: "sq2", level: 1, text: "Sammle ein Selfie mit fünf verschiedenen Leuten." },
    { id: "sq3", level: 1, text: "Bring die halbe Runde dazu, etwas gleichzeitig zu machen. Foto!" },
    { id: "sq4", level: 1, text: "Finde den längsten Bart oder die längsten Haare und mach ein Foto." },
    { id: "sq5", level: 2, text: "Bekomm ein Getränk ausgegeben, ohne zu fragen. Foto!" },
    { id: "sq6", level: 1, text: "Bring jemanden dazu, dir ein Kompliment zu machen. Foto als Beweis." },
    { id: "sq7", level: 2, text: "Stell dich zu einer Gruppe, die du nicht kennst, und mach ein Foto mit ihnen." },
    { id: "sq8", level: 1, text: "Bring zwei Leute dazu, die Plätze zu tauschen. Foto!" },
    { id: "sq9", level: 1, text: "Lass dich von drei Leuten gleichzeitig fotografieren." },
    { id: "sq10", level: 1, text: "Bring die Runde dazu, für dich zu klatschen. Foto!" },
    { id: "sq11", level: 1, text: "Erfinde einen Trinkspruch und bring ihn der Runde bei. Foto!" },
    { id: "sq12", level: 2, text: "Finde heraus, wer am längsten dabei ist, und mach ein Foto mit ihm." },
    { id: "sq13", level: 2, text: "Bring {zahl} Leute dazu, gleichzeitig auf einem Bein zu stehen. Foto!" },
    { id: "sq14", level: 3, text: "Bring die ganze Runde dazu, mit dir ein Foto auf dem Boden zu machen. Foto!" },
  ];

  const sideById = (id) => SIDE_QUESTS.find((s) => s.id === id) || null;
  const taskById = (id) => TASKS.find((t) => t.id === id) || null;

  /** Aufgaben einer Kategorie, optional nach Härte gefiltert. */
  const tasksOfType = (typeId, maxLevel) =>
    TASKS.filter((t) => t.type === typeId && (maxLevel === undefined || t.level <= maxLevel));

  const taskTypes = () => TYPES.slice();
  const modes = () => MODES.slice();
  const maxLevelOf = (typeId) => tasksOfType(typeId).reduce((m, t) => Math.max(m, t.level), 0);

  /** Braucht diese Aufgabe zwingend einen Mitspieler? */
  const needsPartner = (task) => NEEDS_PARTNER.indexOf(task.type) !== -1 || /\{ziel\}/.test(task.text);

  SS.tasks = {
    TYPES, TASKS, MODES, SIDE_QUESTS, NEEDS_PARTNER,
    typeById, modeById, taskById, sideById,
    tasksOfType, taskTypes, modes, maxLevelOf, needsPartner,
  };
})();
