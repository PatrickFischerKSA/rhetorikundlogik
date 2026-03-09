import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";
import { randomBytes } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = normalize(join(__filename, ".."));
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

const AXES = [
  { id: "wahrheit", title: "Wahrheit vs. Relativismus", short: "Wahrheit", description: "Bernwards Absolutheitsdenken trifft auf Konstruktion, Zweifel und alternative Fakten." },
  { id: "aktion", title: "Theorie vs. Handlung", short: "Handlung", description: "Brigitte beschleunigt Entscheidungen, bevor Theorie sie einholen kann." },
  { id: "technik", title: "Technik vs. Ideologie", short: "Technik", description: "Die Chirurgin prueft, wie funktionale Loesungen moralische Verantwortung verschieben." },
  { id: "beobachtung", title: "Beobachtung vs. Teilnahme", short: "Beobachtung", description: "Byproxy steht zwischen Zeugenschaft, Erzaehlung und Manipulation." },
  { id: "loyalitaet", title: "Loyalitaet vs. Selbstschutz", short: "Loyalitaet", description: "Paul versucht, das Kollektiv zusammenzuhalten, ohne daran selbst zu zerbrechen." },
  { id: "kontrolle", title: "Institution vs. Freiheit", short: "Kontrolle", description: "Frau M., Polizei und Gericht markieren Macht von aussen." }
];

const FIGURES = [
  {
    id: "byproxy",
    name: "Byproxy / Petra Bretschneider",
    role: "Erzaehlerin, Spieleentwicklerin, strategische Beobachterin",
    mindset: "Analytisch, narrativ sensibel, machtbewusst; will verstehen und zugleich ihre Position sichern.",
    axis: "beobachtung",
    function: "Sie zeigt, dass Erzaehlen nie neutral ist.",
    mission: {
      title: "Byproxy-Protokoll",
      goal: "Halte Realitaetsdruck und Ambiguitaet zwischen 35 und 72 und erreiche mindestens 16 Enthuellungspunkte.",
      blindSpot: "Zu viel Klarheit ist fuer dich verdachtiger als produktiver Zweifel."
    }
  },
  {
    id: "paul",
    name: "Paul",
    role: "Vermittler, Drucker, logistisches Scharnier",
    mindset: "Loyal, konfliktscheu, stabilisierend; sucht Sicherheit und schiebt Eskalation hinaus.",
    axis: "loyalitaet",
    function: "Er ist die fragile Verbindung zwischen Ideologie, Aktion und Alltag.",
    mission: {
      title: "Paul-Protokoll",
      goal: "Beende die Partie mit mindestens 56 Vertrauen und ohne Systemkollaps.",
      blindSpot: "Zu viel Harmonie ohne Aufklaerung kann selbst zur Verdeckung werden."
    }
  },
  {
    id: "bernward",
    name: "Bernward",
    role: "Ideologischer Kopf der Gruppe",
    mindset: "Dogmatisch-philosophisch, anti-relativistisch, theoriegetrieben und realitaetsfern.",
    axis: "wahrheit",
    function: "Er radikalisiert den Wahrheitsbegriff bis an die Grenze autoritaerer Reinheit.",
    mission: {
      title: "Bernward-Protokoll",
      goal: "Setze mindestens zwei Doktrinen der Familie Absolutheit und halte den Realitaetsdruck am Ende ueber 55.",
      blindSpot: "Reinheit kippt schnell in Zwang."
    }
  },
  {
    id: "brigitte",
    name: "Brigitte",
    role: "Radikale Aktivistin",
    mindset: "Impulsiv, militant, handlungsorientiert; verachtet reine Theorie.",
    axis: "aktion",
    function: "Sie testet, ob Wahrheit ohne Risiko nur Pose bleibt.",
    mission: {
      title: "Brigitte-Protokoll",
      goal: "Setze mindestens zwei Aktionsdoktrinen und markiere in drei Runden den richtigen Schattenakteur.",
      blindSpot: "Tempo zerlegt leicht Vertrauen."
    }
  },
  {
    id: "chirurgin",
    name: "Die Chirurgin",
    role: "Bombenbauerin und technische Spezialistin",
    mindset: "Pragmatisch, distanziert, zynisch; denkt in Umsetzbarkeit statt in Reinheit.",
    axis: "technik",
    function: "Sie entlarvt die Illusion, Technik koenne moralisch neutral sein.",
    mission: {
      title: "Chirurgin-Protokoll",
      goal: "Setze mindestens eine Aktions- und eine Nebeldoktrin, ohne dass Ambiguitaet 79 uebersteigt.",
      blindSpot: "Praezision kann ebenfalls verschleiern."
    }
  },
  {
    id: "bayer",
    name: "Bayer",
    role: "Anwalt der Gruppe",
    mindset: "Juristisch-strategisch, rhetorisch kontrolliert, zynischer Realist.",
    axis: "kontrolle",
    function: "Er zeigt, dass Wahrheit vor Gericht immer auch Form und Auswahl ist."
  },
  {
    id: "dorothee",
    name: "Dorothee",
    role: "Kindheitsfreundin und ethischer Gegenblick",
    mindset: "Vorsichtig, konventionell, moralisch stabil; Gegenpol zur Gruppendynamik.",
    axis: "loyalitaet",
    function: "Sie bringt eine Aussenmoral gegen Aletheias Selbstlogik in Stellung."
  },
  {
    id: "omar",
    name: "Omar Haj'Yahia",
    role: "Mitbewohner mit institutioneller Sprengkraft",
    mindset: "Nebenfigur, an der Macht, Ordnung und Fremdzuschreibung sichtbar werden.",
    axis: "kontrolle",
    function: "Er macht sichtbar, wie Institutionen Koerper und Fremdheit verknuepfen."
  },
  {
    id: "frau_m",
    name: "Frau M.",
    role: "Aufseherin im betreuten Wohnen",
    mindset: "Autoritaer, kontrollorientiert, kleinbuergerlich und ordnungsliebend.",
    axis: "kontrolle",
    function: "Sie verkoerpert alltaegliche Macht und Reglementierung."
  }
];

const CORE_FIGURES = ["byproxy", "paul", "bernward", "brigitte", "chirurgin"];

const DOSSIERS = [
  {
    id: "manifestkeller",
    title: "Manifest im Keller",
    teaser: "Aletheia schreibt an der Behauptung, dass nur absolute Wahrheit eine verwirrte Gesellschaft retten kann.",
    stakes: "Die Sprache selbst wird zur Waffe.",
    tags: ["wahrheit", "dogma", "balance"],
    figures: ["bernward", "byproxy", "paul"],
    shift: { druck: 6, ambig: -2, vertrauen: -1, revelation: 0 }
  },
  {
    id: "buecherbarriere",
    title: "Buecherbarriere",
    teaser: "Alltag, Koerper und Theorie kollidieren in einem Raum, der fuer manche offen und fuer andere blockiert ist.",
    stakes: "Das Setting zeigt, dass Wahrheit immer auch raeumlich und koerperlich organisiert wird.",
    tags: ["beobachtung", "loyalitaet", "bruch"],
    figures: ["byproxy", "paul", "frau_m"],
    shift: { druck: 1, ambig: 3, vertrauen: -5, revelation: 0 }
  },
  {
    id: "druckerei",
    title: "Flugblattmaschine",
    teaser: "Texte werden vervielfaeltigt, waehrend unklar bleibt, ob Aufklaerung oder Propaganda produziert wird.",
    stakes: "Medien machen nicht nur sichtbar, sie formen das Sichtbare.",
    tags: ["aktion", "wahrheit", "nebel"],
    figures: ["paul", "bernward", "brigitte"],
    shift: { druck: 4, ambig: 4, vertrauen: -1, revelation: 1 }
  },
  {
    id: "bombenlogik",
    title: "Bombenlogik",
    teaser: "Technische Umsetzbarkeit ersetzt schrittweise die moralische Frage.",
    stakes: "Funktionalitaet wird zum Alibi.",
    tags: ["technik", "aktion", "dogma"],
    figures: ["chirurgin", "brigitte", "bernward"],
    shift: { druck: 7, ambig: 1, vertrauen: -4, revelation: 0 }
  },
  {
    id: "dorothee",
    title: "Dorothees Gegenblick",
    teaser: "Eine Aussenfigur fragt, ob Wahrheitsrede hier nicht nur neue Gewalt maskiert.",
    stakes: "Aletheia wird ethisch gespiegelt.",
    tags: ["loyalitaet", "beobachtung", "balance"],
    figures: ["dorothee", "byproxy", "paul"],
    shift: { druck: -2, ambig: 2, vertrauen: 4, revelation: 1 }
  },
  {
    id: "institution",
    title: "Institutioneller Zugriff",
    teaser: "Regeln, Koerperkontrolle und Polizei dringen in die Gruppendynamik ein.",
    stakes: "Nicht nur was wahr ist, sondern wer bestimmen darf, wird verhandelt.",
    tags: ["kontrolle", "bruch", "dogma"],
    figures: ["frau_m", "omar", "bayer"],
    shift: { druck: 4, ambig: 2, vertrauen: -3, revelation: 0 }
  },
  {
    id: "gerichtsprobe",
    title: "Gericht und Narrativ",
    teaser: "Bayer formt das Geschehen in eine juristisch brauchbare Geschichte um.",
    stakes: "Recht erzeugt eine besondere Form von Wirklichkeit.",
    tags: ["kontrolle", "beobachtung", "nebel"],
    figures: ["bayer", "byproxy", "bernward"],
    shift: { druck: 1, ambig: 5, vertrauen: -1, revelation: 1 }
  },
  {
    id: "posttruthfeed",
    title: "Paralleler Feed",
    teaser: "Geruechte, Gegenwahrheiten und alternative Fakten diffundieren in alle Richtungen.",
    stakes: "Zu viel Relativierung zerfrisst Handlungsfaehigkeit.",
    tags: ["wahrheit", "nebel", "bruch"],
    figures: ["bernward", "byproxy", "bayer"],
    shift: { druck: -3, ambig: 7, vertrauen: -3, revelation: 0 }
  },
  {
    id: "teilnahme",
    title: "Erzaehlte Teilnahme",
    teaser: "Byproxy muss entscheiden, ob sie beobachtet oder aktiv in die Dynamik eingreift.",
    stakes: "Zeugenschaft wird zur Handlung.",
    tags: ["beobachtung", "aktion", "balance"],
    figures: ["byproxy", "brigitte", "paul"],
    shift: { druck: 2, ambig: 3, vertrauen: 1, revelation: 2 }
  },
  {
    id: "spaltung",
    title: "Spaltung im Kollektiv",
    teaser: "Jede Figur behauptet, die eigentliche Rettungsidee zu verkoerpern.",
    stakes: "Aletheia droht an ihren eigenen Rollen zu zerbrechen.",
    tags: ["loyalitaet", "aktion", "bruch"],
    figures: ["bernward", "brigitte", "paul", "chirurgin"],
    shift: { druck: 3, ambig: 3, vertrauen: -7, revelation: 0 }
  }
];

const FRAGMENTS = [
  { id: "f1", title: "Der Spiegel mit Haarriss", text: "Eine Wahrheit spiegelt alles, aber jeder Riss erzeugt eine zweite Lesart.", axes: ["wahrheit", "beobachtung"], figures: ["bernward", "byproxy"], effect: { druck: 3, ambig: 1, vertrauen: 0, revelation: 2 } },
  { id: "f2", title: "Der Rollweg zwischen Buechern", text: "Ein Raum behauptet Neutralitaet und offenbart im gleichen Augenblick seine Ausschluesse.", axes: ["beobachtung", "kontrolle"], figures: ["byproxy", "frau_m"], effect: { druck: 1, ambig: 2, vertrauen: -1, revelation: 2 } },
  { id: "f3", title: "Die matte Druckerschwaerze", text: "Was gedruckt ist, sieht endgueltig aus, auch wenn es nur beschleunigter Zweifel ist.", axes: ["wahrheit", "aktion"], figures: ["paul", "bernward"], effect: { druck: 2, ambig: 3, vertrauen: 0, revelation: 1 } },
  { id: "f4", title: "Das kalte Werkzeug", text: "Eine technische Loesung entlastet nie ganz von Verantwortung.", axes: ["technik", "aktion"], figures: ["chirurgin", "brigitte"], effect: { druck: 3, ambig: 0, vertrauen: -1, revelation: 1 } },
  { id: "f5", title: "Die ausweichende Hand", text: "Jemand vermittelt so lange, bis niemand mehr weiss, wer begonnen hat.", axes: ["loyalitaet", "beobachtung"], figures: ["paul", "byproxy"], effect: { druck: -1, ambig: 2, vertrauen: 3, revelation: 0 } },
  { id: "f6", title: "Das Banner ohne Boden", text: "Ein grosser Begriff schwebt ueber allen und beruehrt nirgends den Alltag.", axes: ["wahrheit", "aktion"], figures: ["bernward", "brigitte"], effect: { druck: 4, ambig: 1, vertrauen: -1, revelation: 1 } },
  { id: "f7", title: "Das Tribunal aus Fluesterstimmen", text: "Nicht das Urteil ist gefaehrlich, sondern die Vorentscheidung im Hintergrund.", axes: ["kontrolle", "beobachtung"], figures: ["bayer", "frau_m"], effect: { druck: 2, ambig: 2, vertrauen: -1, revelation: 2 } },
  { id: "f8", title: "Die Salzspur", text: "Eine Erinnerung fragt, ob Ideologie nur fruehere Wunden verkleidet.", axes: ["beobachtung", "loyalitaet"], figures: ["byproxy", "dorothee"], effect: { druck: -2, ambig: 2, vertrauen: 2, revelation: 1 } },
  { id: "f9", title: "Der Gehoerschutz", text: "Wer nichts hoeren will, kann behaupten, er habe nur gehandelt.", axes: ["technik", "kontrolle"], figures: ["chirurgin", "frau_m"], effect: { druck: 2, ambig: 1, vertrauen: -2, revelation: 1 } },
  { id: "f10", title: "Die Nebenfigur im Protokoll", text: "Erst wenn eine Institution reagiert, merkt man, wer bisher nie gemeint war.", axes: ["kontrolle", "loyalitaet"], figures: ["omar", "frau_m"], effect: { druck: 1, ambig: 2, vertrauen: -1, revelation: 2 } },
  { id: "f11", title: "Das perfekte Verteidigungsnarrativ", text: "Eine plausible Geschichte kann zugleich Schutz und Verformung sein.", axes: ["kontrolle", "wahrheit"], figures: ["bayer", "bernward"], effect: { druck: 1, ambig: 3, vertrauen: 0, revelation: 2 } },
  { id: "f12", title: "Die abrufbare Pose", text: "Militanz hat ein Tempo, das Nachdenken selten mitgehen kann.", axes: ["aktion", "loyalitaet"], figures: ["brigitte", "paul"], effect: { druck: 3, ambig: 0, vertrauen: -3, revelation: 0 } },
  { id: "f13", title: "Die kontrollierte Rampe", text: "Barrierefreiheit kann als Hilfe erscheinen und zugleich als Regime auftreten.", axes: ["kontrolle", "beobachtung"], figures: ["frau_m", "byproxy"], effect: { druck: 1, ambig: 1, vertrauen: -1, revelation: 2 } },
  { id: "f14", title: "Die weisse Handschuhlogik", text: "Saubere Technik ist oft nur die elegante Sprache fuer schmutzige Entscheidungen.", axes: ["technik", "wahrheit"], figures: ["chirurgin", "bernward"], effect: { druck: 3, ambig: -1, vertrauen: -1, revelation: 1 } },
  { id: "f15", title: "Der Restzweifel", text: "Eine kleine Unsicherheit kann die einzige Rettung vor totaler Sicherheit sein.", axes: ["wahrheit", "loyalitaet"], figures: ["dorothee", "paul"], effect: { druck: -2, ambig: 2, vertrauen: 2, revelation: 1 } },
  { id: "f16", title: "Die beobachtende Kamera", text: "Wer dokumentiert, entscheidet spaeter ueber das Wirkliche.", axes: ["beobachtung", "wahrheit"], figures: ["byproxy", "bayer"], effect: { druck: 1, ambig: 2, vertrauen: 1, revelation: 2 } },
  { id: "f17", title: "Der stille Helfer", text: "Loyalitaet bleibt unsichtbar, bis sie im entscheidenden Moment fehlt.", axes: ["loyalitaet", "aktion"], figures: ["paul", "brigitte"], effect: { druck: 0, ambig: 0, vertrauen: 3, revelation: 1 } },
  { id: "f18", title: "Die versiegelte Kiste", text: "Wenn niemand mehr nach dem Inhalt fragt, wird das Verfahren selbst zur Wahrheit.", axes: ["technik", "kontrolle"], figures: ["chirurgin", "bayer"], effect: { druck: 2, ambig: 1, vertrauen: -1, revelation: 2 } }
];

const DOCTRINES = [
  { id: "d1", family: "absolut", title: "Manifest der Eindeutigkeit", text: "Mehr Wahrheit durch haertere Begriffe und klare Fronten.", publicEffect: { druck: 8, ambig: -4, vertrauen: -2, revelation: 1 }, shadowEffect: { druck: 2, ambig: 0, vertrauen: -1, revelation: 0 } },
  { id: "d2", family: "absolut", title: "Saeuberung der Mehrdeutigkeit", text: "Widerspruch gilt als Defekt, nicht als Erkenntnischance.", publicEffect: { druck: 7, ambig: -3, vertrauen: -3, revelation: 0 }, shadowEffect: { druck: 2, ambig: -1, vertrauen: -1, revelation: 0 } },
  { id: "d3", family: "absolut", title: "Autoritaet des Begriffs", text: "Wer definiert, besitzt die Deutungsmacht.", publicEffect: { druck: 6, ambig: -2, vertrauen: -2, revelation: 1 }, shadowEffect: { druck: 1, ambig: 0, vertrauen: 0, revelation: 0 } },
  { id: "d4", family: "nebel", title: "Strategische Luege", text: "Eine Verzerrung soll das groessere Ziel retten.", publicEffect: { druck: -1, ambig: 9, vertrauen: -5, revelation: 0 }, shadowEffect: { druck: 0, ambig: 3, vertrauen: -2, revelation: 0 } },
  { id: "d5", family: "nebel", title: "Paralleler Feed", text: "Viele Versionen zugleich untergraben jede feste Bezugsflaeche.", publicEffect: { druck: -2, ambig: 8, vertrauen: -4, revelation: 0 }, shadowEffect: { druck: 0, ambig: 3, vertrauen: -1, revelation: 0 } },
  { id: "d6", family: "nebel", title: "Maskierte Zeugenschaft", text: "Beobachtung tarnt verdeckte Intervention.", publicEffect: { druck: 0, ambig: 7, vertrauen: -3, revelation: 1 }, shadowEffect: { druck: 1, ambig: 3, vertrauen: -1, revelation: 0 } },
  { id: "d7", family: "vermittlung", title: "Pauls Aufschub", text: "Tempo wird gesenkt, damit Beziehung vor Eskalation geschuetzt bleibt.", publicEffect: { druck: -4, ambig: 1, vertrauen: 8, revelation: 1 }, shadowEffect: { druck: -1, ambig: 0, vertrauen: 3, revelation: 0 } },
  { id: "d8", family: "vermittlung", title: "Dorothees Gegenfrage", text: "Die Aussenperspektive zwingt das Kollektiv zur Selbstpruefung.", publicEffect: { druck: -3, ambig: 2, vertrauen: 7, revelation: 2 }, shadowEffect: { druck: -1, ambig: 1, vertrauen: 2, revelation: 0 } },
  { id: "d9", family: "vermittlung", title: "Fuersorge vor Reinheit", text: "Koerper und Beziehungen zaehlen mehr als begriffliche Sauberkeit.", publicEffect: { druck: -5, ambig: 0, vertrauen: 9, revelation: 0 }, shadowEffect: { druck: -1, ambig: 0, vertrauen: 3, revelation: 0 } },
  { id: "d10", family: "aktion", title: "Brigittes Eskalation", text: "Handeln soll den Begriffsraum ueberholen.", publicEffect: { druck: 5, ambig: 1, vertrauen: -4, revelation: 2 }, shadowEffect: { druck: 2, ambig: 0, vertrauen: -2, revelation: 0 } },
  { id: "d11", family: "aktion", title: "Chirurgische Loesung", text: "Technische Intervention verspricht Praezision und verengt den Blick.", publicEffect: { druck: 4, ambig: -1, vertrauen: -2, revelation: 1 }, shadowEffect: { druck: 1, ambig: 0, vertrauen: -1, revelation: 0 } },
  { id: "d12", family: "aktion", title: "Bayers Narrativschub", text: "Das Ereignis wird sofort in eine strategische Form gegossen.", publicEffect: { druck: 2, ambig: 3, vertrauen: -1, revelation: 2 }, shadowEffect: { druck: 1, ambig: 1, vertrauen: 0, revelation: 0 } }
];

const RESPONSE_MOVES = [
  { id: "m1", family: "expose", title: "Manifest veroeffentlichen", text: "Aletheia geht mit maximaler Klarheit an die Oeffentlichkeit.", tags: ["wahrheit", "dogma"], effect: { druck: 4, ambig: -1, vertrauen: -1, revelation: 3 } },
  { id: "m2", family: "shield", title: "Verletzliche Figur schuetzen", text: "Das Paar priorisiert Koerper und Beziehung ueber Programmatik.", tags: ["loyalitaet", "balance"], effect: { druck: -2, ambig: 0, vertrauen: 5, revelation: 1 } },
  { id: "m3", family: "accelerate", title: "Aktion beschleunigen", text: "Handeln geht vor Klaerung.", tags: ["aktion"], effect: { druck: 5, ambig: 1, vertrauen: -3, revelation: 1 } },
  { id: "m4", family: "archive", title: "Alles dokumentieren", text: "Die Szene wird protokolliert, auch auf Kosten des Moments.", tags: ["beobachtung"], effect: { druck: 0, ambig: 1, vertrauen: 1, revelation: 4 } },
  { id: "m5", family: "launder", title: "Juristisch umcodieren", text: "Das Ereignis wird sofort in ein Verteidigungsnarrativ uebersetzt.", tags: ["kontrolle", "nebel"], effect: { druck: 1, ambig: 3, vertrauen: -1, revelation: 2 } },
  { id: "m6", family: "mask", title: "Spuren verwischen", text: "Fuer kurzfristige Sicherheit wird die Lage undeutlicher gemacht.", tags: ["nebel"], effect: { druck: -1, ambig: 5, vertrauen: -3, revelation: 0 } },
  { id: "m7", family: "countervoice", title: "Gegenstimme einladen", text: "Eine externe Stimme wird zugelassen, um Reinheit zu unterbrechen.", tags: ["balance", "loyalitaet"], effect: { druck: -2, ambig: 2, vertrauen: 4, revelation: 2 } },
  { id: "m8", family: "prototype", title: "Technischen Prototyp testen", text: "Umsetzbarkeit wird ueber Sinn priorisiert.", tags: ["technik", "aktion"], effect: { druck: 3, ambig: 0, vertrauen: -2, revelation: 1 } },
  { id: "m9", family: "split", title: "Interne Spaltung ausspielen", text: "Das Paar nutzt die Konflikte im Kollektiv strategisch.", tags: ["bruch", "aktion"], effect: { druck: 2, ambig: 2, vertrauen: -4, revelation: 2 } }
];

const MECHANICS = [
  { title: "Synchronisierte Mehrgeraete-Partie", text: "Ein Host oder beliebiges Startgeraet legt den Raum an. Zwei Endgeraete treten als Spieler*in A und B bei. Ein optionaler Board-Modus zeigt die gemeinsame Lage auf einem Beamer." },
  { title: "Fragmentphase", text: "Beide Spielenden erhalten unterschiedliche poetische Fragmente und senden verdeckt ihre Deutungsspur. Erst danach werden Hinweise freigeschaltet." },
  { title: "Doktrinphase", text: "Spieler*in A verwirft eine Doktrinkarte, Spieler*in B setzt eine der beiden uebrigen. Die dritte Karte wirkt als Schatteneffekt weiter." },
  { title: "Systemeingriffe", text: "Die Engine reagiert auf Metriken mit Purge-, Nebel-, Vertrauens- oder Gegenzeugen-Ereignissen und schreibt dadurch neue private und oeffentliche Informationen in die Partie." },
  { title: "Verdacht und Intervention", text: "Beide Spielenden markieren privat den Schattenakteur, benennen eine vertrauenswuerdige Figur und waehlen eine Intervention." }
];

const TEACHER_NOTES = [
  { title: "Unterrichtsmodus", text: "Geeignet fuer 30 bis 50 Minuten Spielzeit plus 15 Minuten Auswertung. Der Board-Modus kann projiziert werden, waehrend die privaten Rollen auf den Endgeraeten bleiben." },
  { title: "Auswertung", text: "Vergleicht die exportierten Protokolle danach nicht nach Sieg oder Niederlage, sondern nach der Frage, welche Form von Wahrheit die Teams hergestellt haben." },
  { title: "Didaktische Vertiefung", text: "Lasst die Lernenden die Endurteile mit mindestens zwei Figurenachsen und einer Szene aus dem Roman rueckbinden." },
  { title: "Differenzierung", text: "Schwaechere Gruppen koennen auf vier Runden begrenzen. Leistungsstarke Gruppen begruenden jede Intervention mit einem expliziten Interpretationsbegriff." }
];

const PHASES = {
  lobby: { title: "Lobby", text: "Raum vorbereiten, Endgeraete verbinden, Rollen sichern.", seconds: 0 },
  "fragment-submit": { title: "Fragmentphase", text: "Beide waehlen ein Fragment und geben einen metaphorischen Hinweis.", seconds: 75 },
  "fragment-guess": { title: "Deutungsphase", text: "Nun ordnet ihr den Hinweis des Gegenuebers einer Achse zu.", seconds: 45 },
  "doctrine-discard": { title: "Doktrinphase I", text: "Spieler*in A verwirft eine Doktrinkarte.", seconds: 40 },
  "doctrine-enact": { title: "Doktrinphase II", text: "Spieler*in B setzt eine der verbleibenden Doktrinen.", seconds: 40 },
  response: { title: "Verdacht und Intervention", text: "Schattenakteur markieren, Vertrauen benennen, Eingriff waehlen.", seconds: 75 },
  reflection: { title: "Reflexion", text: "Kurze Deutung des Rundenausgangs formulieren.", seconds: 90 },
  interlude: { title: "Zwischenrunde", text: "Zusammenfassung lesen und die naechste Runde ausloesen.", seconds: 0 },
  finished: { title: "Abschluss", text: "Die Partie ist ausgewertet.", seconds: 0 }
};

const ROOMS = new Map();

function randomId(length = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(length);
  let result = "";
  for (let index = 0; index < length; index += 1) {
    result += alphabet[bytes[index] % alphabet.length];
  }
  return result;
}

function nowIso() {
  return new Date().toISOString();
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function shuffle(list) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function sample(list, count = 1) {
  return shuffle(list).slice(0, count);
}

function weightedPick(weighted) {
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.item;
    }
  }
  return weighted[weighted.length - 1].item;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString("utf8");
      if (body.length > 1_000_000) {
        reject(new Error("Body too large"));
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

function setPhase(room, phase) {
  room.phase = phase;
  room.status = phase === "finished" ? "finished" : phase === "interlude" ? "interlude" : room.status === "lobby" ? "active" : room.status;
  room.phaseStartedAt = Date.now();
  const seconds = PHASES[phase]?.seconds || 0;
  room.phaseDeadline = seconds ? room.phaseStartedAt + seconds * 1000 : null;
}

function appendFeed(room, scope, title, text, tone = "system") {
  const entry = {
    id: randomId(10),
    title,
    text,
    tone,
    createdAt: nowIso()
  };
  if (scope === "public") {
    room.feed.push(entry);
    room.feed = room.feed.slice(-24);
  } else {
    room.privateFeed[scope].push(entry);
    room.privateFeed[scope] = room.privateFeed[scope].slice(-14);
  }
  return entry;
}

function applyDelta(metrics, delta) {
  metrics.druck = clamp(metrics.druck + (delta.druck || 0));
  metrics.ambig = clamp(metrics.ambig + (delta.ambig || 0));
  metrics.vertrauen = clamp(metrics.vertrauen + (delta.vertrauen || 0));
  metrics.revelation = clamp(metrics.revelation + (delta.revelation || 0));
}

function buildRoom(data = {}) {
  const roomId = randomId(5);
  const hostToken = randomId(18);
  const mode = data.mode === "solo" ? "solo" : "multi";
  const room = {
    id: roomId,
    hostToken,
    mode,
    createdAt: nowIso(),
    teamName: (data.teamName || "Aletheia-Team").trim(),
    className: (data.className || "").trim(),
    roundLimit: clamp(Number(data.roundLimit || 6), 4, 8),
    status: "lobby",
    phase: "lobby",
    phaseStartedAt: Date.now(),
    phaseDeadline: null,
    round: 0,
    seats: {
      A: { name: "", token: "", missionId: null, joinedAt: null },
      B: { name: "", token: "", missionId: null, joinedAt: null }
    },
    metrics: { druck: 42, ambig: 36, vertrauen: 58, revelation: 0 },
    doctrineTracks: { absolut: 0, nebel: 0, vermittlung: 0, aktion: 0 },
    stats: { correctSuspicion: 0, correctGuesses: 0 },
    currentRound: null,
    history: [],
    feed: [],
    privateFeed: { A: [], B: [] },
    outcome: null,
    streams: new Set()
  };
  if (mode === "solo") {
    room.seats.A.name = (data.playerName || "Solo-Spieler*in").trim() || "Solo-Spieler*in";
    room.seats.A.token = hostToken;
    room.seats.A.joinedAt = nowIso();
    room.seats.B.name = "Systempartner";
    room.seats.B.token = "SYSTEM";
    room.seats.B.joinedAt = nowIso();
    appendFeed(room, "public", "Solo-Partie angelegt", "Die Solo-Partie ist bereit. Der Systempartner wird automatisch reagieren.", "system");
    resetGame(room);
  } else {
    appendFeed(room, "public", "Raum angelegt", "Der Spielraum ist bereit. Zwei Endgeraete koennen jetzt als Spieler*in A und B beitreten.", "system");
  }
  return room;
}

function roomNeedsBothSeats(room) {
  if (room.mode === "solo") {
    return Boolean(room.seats.A.token);
  }
  return Boolean(room.seats.A.token && room.seats.B.token);
}

function validateViewer(room, viewer) {
  if (viewer.mode === "board") {
    return true;
  }
  if (viewer.mode === "host") {
    return viewer.token && viewer.token === room.hostToken;
  }
  if (viewer.mode === "player") {
    return viewer.seat && viewer.token && room.seats[viewer.seat]?.token === viewer.token;
  }
  if (viewer.mode === "solo") {
    return room.mode === "solo" && viewer.token && viewer.token === room.hostToken;
  }
  return false;
}

function canControlRoom(room, viewer) {
  if (viewer.mode === "host" && validateViewer(room, viewer)) {
    return true;
  }
  if (viewer.mode === "player" && validateViewer(room, viewer)) {
    return true;
  }
  if (viewer.mode === "solo" && validateViewer(room, viewer)) {
    return true;
  }
  return false;
}

function canDirectRoom(room, viewer) {
  return (viewer.mode === "host" || viewer.mode === "solo") && validateViewer(room, viewer);
}

function clueForFragment(fragment) {
  const axis = fragment.axes[0];
  const map = {
    wahrheit: "zu glatt, um neutral zu sein",
    beobachtung: "jemand sieht mehr, als gesagt wird",
    aktion: "zu schnell fuer reine Theorie",
    technik: "sauber und trotzdem gefaehrlich",
    loyalitaet: "hinter der Geste steckt Bindung",
    kontrolle: "es riecht nach Regel und Zugriff"
  };
  return map[axis] || "mehr als bloss Oberfläche";
}

function chooseSoloFragment(room) {
  const round = room.currentRound;
  const dossier = DOSSIERS.find((entry) => entry.id === round.dossierId);
  const hand = round.fragmentHands.B.map((id) => FRAGMENTS.find((entry) => entry.id === id));
  const weighted = hand.map((fragment) => {
    let weight = 2;
    if (fragment.axes.some((axis) => dossier.tags.includes(axis))) {
      weight += 3;
    }
    if (fragment.figures.includes(round.shadowFigureId)) {
      weight += 2;
    }
    return { item: fragment, weight };
  });
  const fragment = weightedPick(weighted);
  return {
    fragmentId: fragment.id,
    clue: clueForFragment(fragment)
  };
}

function chooseSoloGuess(fragmentId) {
  const fragment = FRAGMENTS.find((entry) => entry.id === fragmentId);
  if (Math.random() < 0.72) {
    return fragment.axes[0];
  }
  const otherAxes = AXES.map((axis) => axis.id).filter((axisId) => !fragment.axes.includes(axisId));
  return sample(otherAxes, 1)[0];
}

function chooseSoloDoctrine(room) {
  const round = room.currentRound;
  const remaining = round.doctrineHand.filter((id) => id !== round.doctrineDiscard).map((id) => DOCTRINES.find((entry) => entry.id === id));
  const dossier = DOSSIERS.find((entry) => entry.id === round.dossierId);
  const weighted = remaining.map((card) => {
    let weight = 2;
    if (card.family === "vermittlung" && room.metrics.vertrauen < 46) {
      weight += 4;
    }
    if (card.family === "absolut" && dossier.tags.includes("dogma")) {
      weight += 3;
    }
    if (card.family === "nebel" && room.metrics.ambig < 60 && dossier.tags.includes("nebel")) {
      weight += 2;
    }
    if (card.family === "aktion" && dossier.tags.includes("aktion")) {
      weight += 2;
    }
    return { item: card, weight };
  });
  return weightedPick(weighted).id;
}

function chooseSoloResponse(room) {
  const round = room.currentRound;
  const suspectId = Math.random() < 0.68
    ? round.shadowFigureId
    : sample(FIGURES.map((entry) => entry.id).filter((id) => id !== round.shadowFigureId), 1)[0];
  const trustPool = FIGURES.filter((entry) => ["loyalitaet", "beobachtung"].includes(entry.axis));
  const trustFigureId = weightedPick(trustPool.map((entry) => ({
    item: entry.id,
    weight: entry.axis === "loyalitaet" && room.metrics.vertrauen < 52 ? 5 : 2
  })));
  const moves = round.responseOptions.map((id) => RESPONSE_MOVES.find((entry) => entry.id === id));
  const moveId = weightedPick(moves.map((move) => {
    let weight = 2;
    if (move.family === "shield" && room.metrics.vertrauen < 48) {
      weight += 4;
    }
    if (move.family === "countervoice" && room.metrics.druck > 62) {
      weight += 3;
    }
    if (move.family === "launder" && room.metrics.ambig < 64) {
      weight += 2;
    }
    return { item: move.id, weight };
  }));
  return {
    suspectId,
    trustFigureId,
    moveId,
    accusePartner: false
  };
}

function buildSoloReflection(room) {
  const round = room.currentRound;
  const dossier = DOSSIERS.find((entry) => entry.id === round.dossierId);
  const doctrine = DOCTRINES.find((entry) => entry.id === round.doctrineEnacted);
  return `Der Systempartner liest ${dossier.title} vor allem als Konflikt aus ${doctrine.family} und verdeckter Machtverschiebung.`;
}

function advanceSoloRoom(room) {
  if (room.mode !== "solo" || !room.currentRound) {
    return;
  }
  const round = room.currentRound;
  if (room.phase === "fragment-submit" && round.fragmentSelections.A && !round.fragmentSelections.B) {
    round.fragmentSelections.B = chooseSoloFragment(room);
    appendFeed(room, "public", "Systempartner reagiert", "Der Systempartner hat sein Fragmentsignal verdeckt gesetzt.", "system");
    setPhase(room, "fragment-guess");
    return;
  }
  if (room.phase === "fragment-guess" && round.fragmentGuesses.A && !round.fragmentGuesses.B) {
    round.fragmentGuesses.B = chooseSoloGuess(round.fragmentSelections.A.fragmentId);
    resolveFragments(room);
    return;
  }
  if (room.phase === "doctrine-discard" && round.doctrineDiscard && !round.doctrineEnacted) {
    round.doctrineEnacted = chooseSoloDoctrine(room);
    resolveDoctrine(room);
    return;
  }
  if (room.phase === "response" && round.responseSelections.A && !round.responseSelections.B) {
    round.responseSelections.B = chooseSoloResponse(room);
    appendFeed(room, "public", "Systempartner interveniert", "Der Systempartner hat Verdacht und Gegenmassnahme eingetragen.", "system");
    resolveResponses(room);
    return;
  }
  if (room.phase === "reflection" && round.reflections.A && !round.reflections.B) {
    round.reflections.B = buildSoloReflection(room);
    closeRound(room);
  }
}

function dominantDoctrine(room) {
  const ordered = Object.entries(room.doctrineTracks).sort((left, right) => right[1] - left[1]);
  return ordered[0]?.[1] ? ordered[0][0] : null;
}

function pickDossier(room) {
  const recentIds = room.history.slice(0, 2).map((entry) => entry.dossierId);
  const dominant = dominantDoctrine(room);
  const weighted = DOSSIERS.map((dossier) => {
    let weight = recentIds.includes(dossier.id) ? 0.4 : 2;
    if (room.metrics.druck > 60 && dossier.tags.includes("dogma")) {
      weight += 3;
    }
    if (room.metrics.ambig > 58 && dossier.tags.includes("nebel")) {
      weight += 3;
    }
    if (room.metrics.vertrauen < 42 && dossier.tags.includes("bruch")) {
      weight += 3;
    }
    if (dominant === "absolut" && dossier.tags.includes("dogma")) {
      weight += 2;
    }
    if (dominant === "nebel" && dossier.tags.includes("nebel")) {
      weight += 2;
    }
    if (dominant === "vermittlung" && dossier.tags.includes("balance")) {
      weight += 2;
    }
    if (dominant === "aktion" && dossier.tags.includes("aktion")) {
      weight += 2;
    }
    return { item: dossier, weight };
  });
  return weightedPick(weighted);
}

function pickShadowFigure(room, dossier) {
  const weighted = dossier.figures.map((figureId) => {
    const figure = FIGURES.find((entry) => entry.id === figureId);
    let weight = 2;
    if (figure?.axis === "wahrheit" && room.metrics.druck > 55) {
      weight += 3;
    }
    if (figure?.axis === "beobachtung" && room.metrics.ambig > 50) {
      weight += 2;
    }
    if (figure?.axis === "kontrolle" && room.metrics.vertrauen < 50) {
      weight += 2;
    }
    return { item: figure, weight };
  });
  return weightedPick(weighted);
}

function computeNightShift(room, dossier, shadowFigure) {
  const shift = { ...dossier.shift };
  const dominant = dominantDoctrine(room);
  if (dominant === "absolut") {
    shift.druck += 3;
  }
  if (dominant === "nebel") {
    shift.ambig += 3;
  }
  if (dominant === "vermittlung") {
    shift.vertrauen += 3;
  }
  if (dominant === "aktion") {
    shift.druck += 2;
    shift.vertrauen -= 2;
  }
  if (shadowFigure.axis === "kontrolle") {
    shift.vertrauen -= 1;
  }
  if (shadowFigure.axis === "beobachtung") {
    shift.ambig += 1;
  }
  if (shadowFigure.axis === "wahrheit") {
    shift.druck += 1;
  }
  return shift;
}

function buildFragmentHands(dossier) {
  const preferred = FRAGMENTS.filter((fragment) => fragment.axes.some((axis) => dossier.tags.includes(axis)) || fragment.figures.some((figureId) => dossier.figures.includes(figureId)));
  const pool = preferred.length >= 8 ? preferred : FRAGMENTS;
  const handA = sample(pool, 4);
  const remaining = FRAGMENTS.filter((fragment) => !handA.some((picked) => picked.id === fragment.id));
  const handBPool = remaining.length >= 4 ? remaining : FRAGMENTS;
  const handB = sample(handBPool, 4);
  return {
    A: handA.map((entry) => entry.id),
    B: handB.map((entry) => entry.id)
  };
}

function buildDoctrineHand(dossier) {
  const weighted = DOCTRINES.map((doctrine) => {
    let weight = 2;
    if (doctrine.family === "absolut" && dossier.tags.includes("dogma")) {
      weight += 2;
    }
    if (doctrine.family === "nebel" && dossier.tags.includes("nebel")) {
      weight += 2;
    }
    if (doctrine.family === "vermittlung" && dossier.tags.includes("balance")) {
      weight += 2;
    }
    if (doctrine.family === "aktion" && dossier.tags.includes("aktion")) {
      weight += 2;
    }
    return { item: doctrine, weight };
  });
  const chosen = [];
  while (chosen.length < 3) {
    const doctrine = weightedPick(weighted.filter((entry) => !chosen.includes(entry.item.id))).id;
    chosen.push(doctrine);
  }
  return chosen;
}

function buildResponseOptions(dossier) {
  const weighted = RESPONSE_MOVES.map((move) => {
    let weight = 2;
    if (move.tags.some((tag) => dossier.tags.includes(tag))) {
      weight += 3;
    }
    return { item: move, weight };
  });
  const chosen = [];
  while (chosen.length < 3) {
    const move = weightedPick(weighted.filter((entry) => !chosen.includes(entry.item.id))).id;
    chosen.push(move);
  }
  return chosen;
}

function playerMissionFigure(room, seat) {
  return FIGURES.find((entry) => entry.id === room.seats[seat].missionId);
}

function buildPrivateWhisper(room, seat, dossier, shadowFigure) {
  const missionFigure = playerMissionFigure(room, seat);
  if (!missionFigure?.mission) {
    return "Halte deinen Auftrag im Blick und lies die Szene gegen ihre eigene Oberflaeche.";
  }
  if (missionFigure.id === "byproxy") {
    return `Systemsignal: In ${dossier.title} ist Restzweifel wertvoll. Beobachte besonders, ob ${shadowFigure.name} die Erzaehlung heimlich lenkt.`;
  }
  if (missionFigure.id === "paul") {
    return `Systemsignal: Diese Runde bedroht die Beziehungsstatik. Suche eine Intervention, die Vertrauen nicht vollstaendig opfert.`;
  }
  if (missionFigure.id === "bernward") {
    return `Systemsignal: Der Begriffsraum ist offen genug, um nach Haerte zu verlangen. Achte auf jede Gelegenheit zur Eindeutigkeit.`;
  }
  if (missionFigure.id === "brigitte") {
    return `Systemsignal: Tempo erzeugt Erkenntnisdruck. Wenn ${dossier.title} zu langsam gelesen wird, verliert deine Position.`;
  }
  if (missionFigure.id === "chirurgin") {
    return `Systemsignal: Funktionalitaet kann diese Runde Wirkung entfalten. Suche nach einer Loesung, die sauber aussieht und dennoch etwas verschiebt.`;
  }
  return `Systemsignal: ${dossier.title} verlangt ein stilles Gegengewicht gegen ${shadowFigure.name}.`;
}

function startRound(room) {
  const dossier = pickDossier(room);
  const shadowFigure = pickShadowFigure(room, dossier);
  const nightShift = computeNightShift(room, dossier, shadowFigure);
  applyDelta(room.metrics, nightShift);
  room.round += 1;
  room.currentRound = {
    dossierId: dossier.id,
    shadowFigureId: shadowFigure.id,
    nightShift,
    fragmentHands: buildFragmentHands(dossier),
    fragmentSelections: { A: null, B: null },
    fragmentGuesses: { A: "", B: "" },
    fragmentResolution: null,
    doctrineHand: buildDoctrineHand(dossier),
    doctrineDiscard: "",
    doctrineEnacted: "",
    doctrineResidual: "",
    doctrineResolution: null,
    responseOptions: buildResponseOptions(dossier),
    responseSelections: { A: null, B: null },
    responseResolution: null,
    interrupt: null,
    reflectionPrompt: sample([
      "Wann kippt in dieser Runde Wahrheit in Gewalt?",
      "Welche Figur oder Haltung steuert die Szene staerker, als sie vorgibt?",
      "Wie verhaelt sich diese Runde zu Edelbauers Konflikt zwischen Theorie und Handlung?",
      "Welche Rolle spielt Beobachtung hier: Aufklaerung, Manipulation oder Schutz?",
      "Wo wird Technik zum moralischen Ersatz?"
    ], 1)[0],
    reflections: { A: "", B: "" }
  };
  room.status = "active";
  setPhase(room, "fragment-submit");
  appendFeed(room, "public", `Runde ${room.round}: ${dossier.title}`, `${dossier.teaser} Die Engine hat die Lage veraendert und wartet auf ${room.mode === "solo" ? "dein" : "zwei private"} Fragmentsignal${room.mode === "solo" ? "" : "e"}.`, "system");
  appendFeed(room, "A", "Private Zuschrift", buildPrivateWhisper(room, "A", dossier, shadowFigure), "private");
  if (room.mode !== "solo") {
    appendFeed(room, "B", "Private Zuschrift", buildPrivateWhisper(room, "B", dossier, shadowFigure), "private");
  }
}

function resetGame(room) {
  room.round = 0;
  room.status = "active";
  room.phase = "lobby";
  room.metrics = { druck: 42, ambig: 36, vertrauen: 58, revelation: 0 };
  room.doctrineTracks = { absolut: 0, nebel: 0, vermittlung: 0, aktion: 0 };
  room.stats = { correctSuspicion: 0, correctGuesses: 0 };
  room.history = [];
  room.outcome = null;
  room.currentRound = null;
  room.feed = [];
  room.privateFeed = { A: [], B: [] };
  const missions = sample(CORE_FIGURES, 2);
  room.seats.A.missionId = missions[0];
  room.seats.B.missionId = missions[1];
  appendFeed(room, "public", "Partie reinitialisiert", "Die Engine wurde zurueckgesetzt. Die geheimen Auftraege wurden neu verteilt.", "system");
  startRound(room);
}

function isCollapsed(room) {
  return room.metrics.druck >= 85 || room.metrics.ambig >= 85 || room.metrics.vertrauen <= 15;
}

function resolveFragments(room) {
  const round = room.currentRound;
  const fragmentA = FRAGMENTS.find((entry) => entry.id === round.fragmentSelections.A.fragmentId);
  const fragmentB = FRAGMENTS.find((entry) => entry.id === round.fragmentSelections.B.fragmentId);
  applyDelta(room.metrics, fragmentA.effect);
  applyDelta(room.metrics, fragmentB.effect);
  const guessA = fragmentB.axes.includes(round.fragmentGuesses.A);
  const guessB = fragmentA.axes.includes(round.fragmentGuesses.B);
  const delta = { druck: 0, ambig: 0, vertrauen: 0, revelation: 0 };
  if (guessA) {
    delta.vertrauen += 5;
    delta.revelation += 2;
    room.stats.correctGuesses += 1;
  } else {
    delta.ambig += 4;
    delta.vertrauen -= 3;
  }
  if (guessB) {
    delta.vertrauen += 5;
    delta.revelation += 2;
    room.stats.correctGuesses += 1;
  } else {
    delta.ambig += 4;
    delta.vertrauen -= 3;
  }
  if (fragmentA.axes.some((axis) => fragmentB.axes.includes(axis))) {
    delta.revelation += 1;
  }
  applyDelta(room.metrics, delta);
  round.fragmentResolution = {
    correctA: guessA,
    correctB: guessB,
    fragmentA: fragmentA.title,
    fragmentB: fragmentB.title,
    delta
  };
  appendFeed(room, "public", "Fragmentauswertung", guessA && guessB ? "Beide Deutungen haben eine tragfaehige Achse getroffen. Die Engine verzeichnet Erkenntnisgewinn." : "Mindestens eine Deutung blieb schief. Ambiguitaet dringt tiefer in die Partie ein.", guessA && guessB ? "positive" : "warning");
  setPhase(room, "doctrine-discard");
}

function buildInterrupt(room) {
  if (room.metrics.druck >= 74) {
    return {
      id: "purge",
      title: "Saeuberungsprotokoll",
      text: "Die Gruppe verlangt begriffliche Reinheit. Alle Unschaerfe wird als Verrat gelesen.",
      effect: { druck: 3, vertrauen: -4, ambig: -1, revelation: 0 },
      whisperA: "Privatsignal: Jede Geste wirkt jetzt strenger als beabsichtigt.",
      whisperB: "Privatsignal: Ein einziger falscher Begriff kann als Sabotage gelesen werden."
    };
  }
  if (room.metrics.ambig >= 70) {
    return {
      id: "fog",
      title: "Nebelmaschine",
      text: "Parallele Versionen der Szene geraten in Umlauf. Was eben noch sicher schien, wird poroes.",
      effect: { druck: 0, vertrauen: -2, ambig: 4, revelation: 0 },
      whisperA: "Privatsignal: Vertraue keinem klaren Oberflaecheneindruck zu schnell.",
      whisperB: "Privatsignal: Diese Runde lohnt sich ein zweiter Blick auf den scheinbar harmlosen Akteur."
    };
  }
  if (room.metrics.vertrauen <= 42) {
    return {
      id: "fracture",
      title: "Spaltungsmatrix",
      text: "Misstrauen sickert zwischen die Rollen. Das Kollektiv liest jede Handlung sofort gegen die Loyalitaet.",
      effect: { druck: 1, vertrauen: -4, ambig: 1, revelation: 0 },
      whisperA: "Privatsignal: Deine naechste Wahl wird sofort als Aussage ueber Loyalitaet gelesen.",
      whisperB: "Privatsignal: Schutz kann in dieser Lage wie Vertuschung wirken."
    };
  }
  if (room.metrics.revelation >= 12 && room.round < room.roundLimit) {
    return {
      id: "counterwitness",
      title: "Gegenzeugin",
      text: "Ein Gegenblick taucht auf und bestaetigt, dass Beobachtung nicht folgenlos bleibt.",
      effect: { druck: -1, vertrauen: 2, ambig: 0, revelation: 3 },
      whisperA: "Privatsignal: Eine bislang stille Figur wird ploetzlich relevant.",
      whisperB: "Privatsignal: Der Schattenakteur arbeitet nicht mehr ungestoert."
    };
  }
  return null;
}

function resolveDoctrine(room) {
  const round = room.currentRound;
  const enacted = DOCTRINES.find((entry) => entry.id === round.doctrineEnacted);
  const residualId = round.doctrineHand.find((id) => id !== round.doctrineDiscard && id !== round.doctrineEnacted);
  const residual = DOCTRINES.find((entry) => entry.id === residualId);
  round.doctrineResidual = residual.id;
  applyDelta(room.metrics, enacted.publicEffect);
  applyDelta(room.metrics, residual.shadowEffect);
  room.doctrineTracks[enacted.family] += 1;
  round.doctrineResolution = {
    enactedTitle: enacted.title,
    enactedFamily: enacted.family,
    residualTitle: residual.title
  };
  appendFeed(room, "public", "Doktrin gesetzt", `${enacted.title} wirkt offen. ${residual.title} bleibt als Schattenwirkung im System.`, "system");
  const interrupt = buildInterrupt(room);
  if (interrupt) {
    round.interrupt = interrupt;
    applyDelta(room.metrics, interrupt.effect);
    appendFeed(room, "public", interrupt.title, interrupt.text, "warning");
    appendFeed(room, "A", interrupt.title, interrupt.whisperA, "private");
    appendFeed(room, "B", interrupt.title, interrupt.whisperB, "private");
  }
  setPhase(room, "response");
}

function resolveResponses(room) {
  const round = room.currentRound;
  const responseA = round.responseSelections.A;
  const responseB = round.responseSelections.B;
  const moveA = RESPONSE_MOVES.find((entry) => entry.id === responseA.moveId);
  const moveB = RESPONSE_MOVES.find((entry) => entry.id === responseB.moveId);
  const shadowId = round.shadowFigureId;
  const correctA = responseA.suspectId === shadowId;
  const correctB = responseB.suspectId === shadowId;
  const delta = { druck: 0, ambig: 0, vertrauen: 0, revelation: 0 };

  if (correctA) {
    delta.revelation += 4;
    room.stats.correctSuspicion += 1;
  } else {
    delta.ambig += 2;
  }
  if (correctB) {
    delta.revelation += 4;
    room.stats.correctSuspicion += 1;
  } else {
    delta.ambig += 2;
  }
  if (responseA.trustFigureId === responseB.trustFigureId) {
    delta.vertrauen += 2;
  }
  if (responseA.accusePartner) {
    delta.vertrauen -= 4;
  }
  if (responseB.accusePartner) {
    delta.vertrauen -= 4;
  }
  applyDelta(room.metrics, moveA.effect);
  applyDelta(room.metrics, moveB.effect);
  applyDelta(room.metrics, delta);

  if (moveA.family === moveB.family) {
    if (["shield", "countervoice", "archive"].includes(moveA.family)) {
      applyDelta(room.metrics, { vertrauen: 2, revelation: 1, druck: 0, ambig: 0 });
    }
    if (["accelerate", "split", "mask"].includes(moveA.family)) {
      applyDelta(room.metrics, { vertrauen: -2, druck: 2, ambig: 1, revelation: 0 });
    }
  }

  round.responseResolution = {
    correctA,
    correctB,
    moveA: moveA.title,
    moveB: moveB.title,
    trustMatch: responseA.trustFigureId === responseB.trustFigureId
  };
  appendFeed(
    room,
    "public",
    "Intervention ausgewertet",
    correctA && correctB
      ? `Beide Schattenmarkierungen lagen auf derselben Faehrte. Die gewaehlten Interventionen waren ${moveA.title} und ${moveB.title}.`
      : `Die Szene blieb umstritten. Interventionen: ${moveA.title} und ${moveB.title}.`,
    correctA && correctB ? "positive" : "warning"
  );
  setPhase(room, "reflection");
}

function evaluateMission(room, missionId) {
  switch (missionId) {
    case "byproxy":
      return room.metrics.druck >= 35 && room.metrics.druck <= 72 && room.metrics.ambig >= 35 && room.metrics.ambig <= 72 && room.metrics.revelation >= 16;
    case "paul":
      return room.metrics.vertrauen >= 56 && !isCollapsed(room);
    case "bernward":
      return room.doctrineTracks.absolut >= 2 && room.metrics.druck > 55;
    case "brigitte":
      return room.doctrineTracks.aktion >= 2 && room.stats.correctSuspicion >= 3;
    case "chirurgin":
      return room.doctrineTracks.aktion >= 1 && room.doctrineTracks.nebel >= 1 && room.metrics.ambig < 79;
    default:
      return false;
  }
}

function evaluateOutcome(room) {
  let headline = "Verantwortete Mehrdeutigkeit";
  let verdict = "Das Paar hat Widerspruch ausgehalten, ohne Wahrheit in Besitz oder Nebel zu verwandeln.";
  if (room.metrics.druck >= 85) {
    headline = "Autoritaere Wahrheit";
    verdict = "Der Wahrheitsbegriff wurde so verengt, dass Kontrolle ueber Erkenntnis dominierte.";
  } else if (room.metrics.ambig >= 85) {
    headline = "Simulationskollaps";
    verdict = "Zu viele Parallelversionen haben Wirklichkeit in konkurrierende Oberflaechen zerlegt.";
  } else if (room.metrics.vertrauen <= 15) {
    headline = "Zerfall des Kollektivs";
    verdict = "Misstrauen wurde zum eigentlichen Motor der Partie.";
  } else if (room.metrics.revelation < 12) {
    headline = "Unentschiedene Wirklichkeit";
    verdict = "Es blieb Bewegung, aber zu wenig echte Aufklaerung.";
  }
  const missionA = playerMissionFigure(room, "A");
  const missionB = playerMissionFigure(room, "B");
  return {
    headline,
    verdict,
    missionA: { title: missionA.mission.title, success: evaluateMission(room, missionA.id) },
    missionB: { title: missionB.mission.title, success: evaluateMission(room, missionB.id) }
  };
}

function closeRound(room) {
  const round = room.currentRound;
  const dossier = DOSSIERS.find((entry) => entry.id === round.dossierId);
  const shadow = FIGURES.find((entry) => entry.id === round.shadowFigureId);
  room.history.unshift({
    round: room.round,
    dossierId: dossier.id,
    title: dossier.title,
    doctrine: round.doctrineResolution.enactedTitle,
    shadowFigure: shadow.name,
    summary: round.responseResolution.correctA && round.responseResolution.correctB
      ? room.mode === "solo"
        ? "Du und der Systempartner habt dieselbe Spur getroffen."
        : "Beide Spielenden haben den Schatten korrekt markiert."
      : room.mode === "solo"
        ? "Deine Lesart und die Systemreaktion blieben gegeneinander versetzt."
        : "Die Runde blieb strittig und asymmetrisch gelesen.",
    reflectionA: round.reflections.A,
    reflectionB: round.reflections.B,
    metricsAfter: { ...room.metrics }
  });
  room.history = room.history.slice(0, 12);
  room.currentRound = null;
  if (room.round >= room.roundLimit || isCollapsed(room)) {
    room.status = "finished";
    setPhase(room, "finished");
    room.outcome = evaluateOutcome(room);
    appendFeed(room, "public", room.outcome.headline, room.outcome.verdict, "system");
  } else {
    setPhase(room, "interlude");
    appendFeed(room, "public", "Zwischenrunde", "Die Runde wurde archiviert. Eine neue Szene kann gestartet werden.", "system");
  }
}

function buildPlayerTask(room, seat) {
  const round = room.currentRound;
  if (room.phase === "lobby") {
    return {
      type: "lobby",
      title: "Warten auf Spielstart",
      text: room.mode === "solo"
        ? "Die Solo-Partie kann direkt gestartet werden."
        : roomNeedsBothSeats(room)
          ? "Beide Sitze sind belegt. Die Partie startet automatisch."
          : "Sobald beide Sitze belegt sind, startet die Partie automatisch."
    };
  }
  if (room.phase === "finished") {
    return {
      type: "finished",
      title: "Partie abgeschlossen",
      text: room.outcome?.verdict || ""
    };
  }
  if (room.phase === "interlude") {
    return {
      type: "interlude",
      title: "Zwischenrunde",
      text: "Die Runde ist archiviert. Lest die Zusammenfassung und startet die naechste Szene."
    };
  }
  if (!round) {
    return {
      type: "waiting",
      title: "System wartet",
      text: "Die Engine bereitet die naechste Szene vor."
    };
  }
  if (room.phase === "fragment-submit") {
    return {
      type: "fragment-submit",
      title: "Fragment waehlen",
      text: "Waehle ein Fragment und gib einen metaphorischen Hinweis. Nennt nicht direkt die Figur.",
      hand: round.fragmentHands[seat].map((id) => FRAGMENTS.find((entry) => entry.id === id)),
      selection: round.fragmentSelections[seat]
    };
  }
  if (room.phase === "fragment-guess") {
    const otherSeat = seat === "A" ? "B" : "A";
    const otherSelection = round.fragmentSelections[otherSeat];
    return {
      type: "fragment-guess",
      title: "Achse deuten",
      text: "Ordne den Hinweis des Gegenuebers einer Achse zu.",
      opponentFragment: FRAGMENTS.find((entry) => entry.id === otherSelection.fragmentId),
      clue: otherSelection.clue,
      guessAxis: round.fragmentGuesses[seat],
      axisOptions: AXES
    };
  }
  if (room.phase === "doctrine-discard") {
    if (seat === "A") {
      return {
        type: "doctrine-discard",
        title: "Doktrin verwerfen",
        text: "Verwirf eine Karte. Die anderen beiden gehen an Spieler*in B.",
        hand: round.doctrineHand.map((id) => DOCTRINES.find((entry) => entry.id === id)),
        chosen: round.doctrineDiscard
      };
    }
    return {
      type: "waiting",
      title: "Warten auf Verwerfung",
      text: "Spieler*in A waehlt gerade, welche Doktrin aus dem Spiel verschwindet."
    };
  }
  if (room.phase === "doctrine-enact") {
    if (seat === "B") {
      return {
        type: "doctrine-enact",
        title: "Doktrin setzen",
        text: "Waehle eine der verbleibenden Doktrinen. Die dritte wird als Schatteneffekt gespeichert.",
        hand: round.doctrineHand.filter((id) => id !== round.doctrineDiscard).map((id) => DOCTRINES.find((entry) => entry.id === id)),
        chosen: round.doctrineEnacted
      };
    }
    return {
      type: "waiting",
      title: "Warten auf Setzung",
      text: "Spieler*in B setzt gerade die offene Doktrin."
    };
  }
  if (room.phase === "response") {
    return {
      type: "response",
      title: "Verdacht und Intervention",
      text: "Markiere den Schattenakteur, benenne eine vertrauenswuerdige Figur und entscheide dich fuer eine Intervention.",
      suspectOptions: FIGURES,
      trustOptions: FIGURES,
      moveOptions: round.responseOptions.map((id) => RESPONSE_MOVES.find((entry) => entry.id === id)),
      selection: round.responseSelections[seat]
    };
  }
  if (room.phase === "reflection") {
    return {
      type: "reflection",
      title: "Reflexion",
      text: round.reflectionPrompt,
      value: round.reflections[seat]
    };
  }
  return {
    type: "waiting",
    title: "Bitte warten",
    text: "Die andere Seite arbeitet noch."
  };
}

function buildSharedView(room) {
  if (room.phase === "lobby") {
    return {
      title: "Raum in Vorbereitung",
      teaser: "Sobald zwei Endgeraete verbunden sind, startet das Wirklichkeitslabor.",
      stakes: "Die privaten Briefings erscheinen erst mit dem Spielstart.",
      tags: ["Lobby"],
      phaseTitle: PHASES.lobby.title,
      phaseText: PHASES.lobby.text,
      deadline: room.phaseDeadline,
      interrupt: null
    };
  }
  if (room.phase === "interlude") {
    return {
      title: "Runde archiviert",
      teaser: room.history[0]?.summary || "Die letzte Runde wurde abgeschlossen.",
      stakes: "Die Engine wartet auf die naechste Szene.",
      tags: ["Zwischenrunde"],
      phaseTitle: PHASES.interlude.title,
      phaseText: PHASES.interlude.text,
      deadline: room.phaseDeadline,
      interrupt: null
    };
  }
  if (room.phase === "finished") {
    return {
      title: room.outcome?.headline || "Partie beendet",
      teaser: room.outcome?.verdict || "",
      stakes: "Jetzt ist die Auswertung entscheidend.",
      tags: ["Abschluss"],
      phaseTitle: PHASES.finished.title,
      phaseText: PHASES.finished.text,
      deadline: null,
      interrupt: null
    };
  }
  const round = room.currentRound;
  const dossier = DOSSIERS.find((entry) => entry.id === round.dossierId);
  return {
    title: dossier.title,
    teaser: dossier.teaser,
    stakes: dossier.stakes,
    tags: dossier.tags.map((tag) => AXES.find((axis) => axis.id === tag)?.short || tag),
    phaseTitle: PHASES[room.phase].title,
    phaseText: PHASES[room.phase].text,
    deadline: room.phaseDeadline,
    interrupt: round.interrupt ? { title: round.interrupt.title, text: round.interrupt.text } : null
  };
}

function buildHostHidden(room) {
  if (!room.currentRound) {
    return null;
  }
  const round = room.currentRound;
  const shadow = FIGURES.find((entry) => entry.id === round.shadowFigureId);
  return {
    shadowFigure: shadow.name,
    nightShift: round.nightShift,
    doctrineHand: round.doctrineHand.map((id) => DOCTRINES.find((entry) => entry.id === id)),
    responseOptions: round.responseOptions.map((id) => RESPONSE_MOVES.find((entry) => entry.id === id)),
    fragmentSubmitted: {
      A: Boolean(round.fragmentSelections.A),
      B: Boolean(round.fragmentSelections.B)
    },
    responsesSubmitted: {
      A: Boolean(round.responseSelections.A),
      B: Boolean(round.responseSelections.B)
    },
    reflectionsSubmitted: {
      A: Boolean(round.reflections.A),
      B: Boolean(round.reflections.B)
    }
  };
}

function snapshotFor(room, viewer) {
  const base = {
    roomId: room.id,
    teamName: room.teamName,
    className: room.className,
    round: room.round,
    roundLimit: room.roundLimit,
    status: room.status,
    phase: room.phase,
    seats: {
      A: { name: room.seats.A.name || "Spieler*in A", joined: Boolean(room.seats.A.token) },
      B: { name: room.seats.B.name || "Spieler*in B", joined: Boolean(room.seats.B.token) }
    },
    metrics: room.metrics,
    doctrineTracks: room.doctrineTracks,
    shared: buildSharedView(room),
    feed: [...room.feed].reverse(),
    history: room.history,
    outcome: room.outcome,
    canStart: roomNeedsBothSeats(room) && room.phase === "lobby",
    canNextRound: room.phase === "interlude",
    canRestart: room.phase === "finished" || room.phase === "interlude",
    library: {
      axes: AXES,
      figures: FIGURES.map(({ mission, ...figure }) => figure),
      mechanics: MECHANICS,
      teacher: TEACHER_NOTES
    }
  };
  if (viewer.mode === "player" && validateViewer(room, viewer)) {
    const missionFigure = playerMissionFigure(room, viewer.seat);
    return {
      ...base,
      actor: {
        mode: "player",
        seat: viewer.seat,
        name: room.seats[viewer.seat].name,
        mission: missionFigure?.mission ? {
          title: missionFigure.mission.title,
          role: missionFigure.role,
          goal: missionFigure.mission.goal,
          blindSpot: missionFigure.mission.blindSpot
        } : null,
        privateFeed: [...room.privateFeed[viewer.seat]].reverse(),
        task: buildPlayerTask(room, viewer.seat)
      }
    };
  }
  if (viewer.mode === "solo" && validateViewer(room, viewer)) {
    const missionFigure = playerMissionFigure(room, "A");
    return {
      ...base,
      actor: {
        mode: "solo",
        seat: "A",
        name: room.seats.A.name,
        mission: missionFigure?.mission ? {
          title: missionFigure.mission.title,
          role: missionFigure.role,
          goal: missionFigure.mission.goal,
          blindSpot: missionFigure.mission.blindSpot
        } : null,
        systemPartner: room.seats.B.name,
        privateFeed: [...room.privateFeed.A].reverse(),
        task: buildPlayerTask(room, "A")
      }
    };
  }
  if (viewer.mode === "host" && validateViewer(room, viewer)) {
    return {
      ...base,
      actor: {
        mode: "host",
        hidden: buildHostHidden(room)
      }
    };
  }
  return base;
}

function broadcastRoom(room) {
  for (const client of [...room.streams]) {
    if (!validateViewer(room, client.viewer)) {
      client.res.end();
      room.streams.delete(client);
      continue;
    }
    try {
      client.res.write(`data: ${JSON.stringify(snapshotFor(room, client.viewer))}\n\n`);
    } catch (error) {
      room.streams.delete(client);
    }
  }
}

function handleRoomAction(room, viewer, type, payload = {}) {
  if (!canControlRoom(room, viewer)) {
    throw new Error("Aktion nicht erlaubt.");
  }

  if (type === "start-game") {
    if (!canDirectRoom(room, viewer)) {
      throw new Error("Nur Host oder Solo-Modus koennen die Partie steuern.");
    }
    if (!roomNeedsBothSeats(room)) {
      throw new Error("Beide Sitze muessen verbunden sein.");
    }
    room.phase = "lobby";
    resetGame(room);
    return;
  }

  if (type === "next-round") {
    if (!canDirectRoom(room, viewer)) {
      throw new Error("Nur Host oder Solo-Modus koennen die Partie steuern.");
    }
    if (room.phase !== "interlude") {
      throw new Error("Naechste Runde ist noch nicht freigeschaltet.");
    }
    startRound(room);
    return;
  }

  if (type === "restart-game") {
    if (!canDirectRoom(room, viewer)) {
      throw new Error("Nur Host oder Solo-Modus koennen die Partie resetten.");
    }
    room.phase = "lobby";
    resetGame(room);
    return;
  }

  const seat = viewer.mode === "player" ? viewer.seat : payload.seat;
  const resolvedSeat = viewer.mode === "solo" ? "A" : seat;
  if (!resolvedSeat || !room.seats[resolvedSeat]) {
    throw new Error("Ungueltiger Sitz.");
  }

  const round = room.currentRound;
  if (!round) {
    throw new Error("Es gibt aktuell keine laufende Runde.");
  }

  if (type === "fragment-submit") {
    if (room.phase !== "fragment-submit") {
      throw new Error("Fragmentphase ist bereits vorbei.");
    }
    const fragment = FRAGMENTS.find((entry) => entry.id === payload.fragmentId);
    if (!fragment) {
      throw new Error("Fragment nicht gefunden.");
    }
    round.fragmentSelections[resolvedSeat] = {
      fragmentId: fragment.id,
      clue: String(payload.clue || "").trim().slice(0, 160)
    };
    appendFeed(room, "public", "Verdeckte Eingabe", `${room.seats[resolvedSeat].name || `Spieler*in ${resolvedSeat}`} hat ein Fragmentsignal an die Engine uebergeben.`, "system");
    if (room.mode === "solo") {
      advanceSoloRoom(room);
    } else if (round.fragmentSelections.A && round.fragmentSelections.B) {
      setPhase(room, "fragment-guess");
      appendFeed(room, "public", "Hinweise freigegeben", "Die metaphorischen Spuren liegen offen. Jetzt muessen Achsen gelesen werden.", "system");
    }
    return;
  }

  if (type === "fragment-guess") {
    if (room.phase !== "fragment-guess") {
      throw new Error("Deutungsphase ist nicht aktiv.");
    }
    if (!AXES.some((axis) => axis.id === payload.axisId)) {
      throw new Error("Achse nicht gefunden.");
    }
    round.fragmentGuesses[resolvedSeat] = payload.axisId;
    if (room.mode === "solo") {
      advanceSoloRoom(room);
    } else if (round.fragmentGuesses.A && round.fragmentGuesses.B) {
      resolveFragments(room);
    }
    return;
  }

  if (type === "doctrine-discard") {
    if (room.phase !== "doctrine-discard" || resolvedSeat !== "A") {
      throw new Error("Nur Spieler*in A kann jetzt verwerfen.");
    }
    if (!round.doctrineHand.includes(payload.cardId)) {
      throw new Error("Doktrin nicht in der Hand.");
    }
    round.doctrineDiscard = payload.cardId;
    if (room.mode === "solo") {
      appendFeed(room, "public", "Doktrin reduziert", "Die sichtbare Auswahl wurde verkleinert. Der Systempartner setzt sofort das Gegengesetz.", "system");
      advanceSoloRoom(room);
    } else {
      setPhase(room, "doctrine-enact");
      appendFeed(room, "public", "Doktrin reduziert", "Eine Karte ist aus dem sichtbaren Spiel entfernt worden. Spieler*in B setzt jetzt das Gesetz.", "system");
    }
    return;
  }

  if (type === "doctrine-enact") {
    if (room.phase !== "doctrine-enact" || seat !== "B") {
      throw new Error("Nur Spieler*in B kann jetzt setzen.");
    }
    const allowed = round.doctrineHand.filter((id) => id !== round.doctrineDiscard);
    if (!allowed.includes(payload.cardId)) {
      throw new Error("Diese Doktrin ist nicht mehr verfuegbar.");
    }
    round.doctrineEnacted = payload.cardId;
    resolveDoctrine(room);
    return;
  }

  if (type === "response-submit") {
    if (room.phase !== "response") {
      throw new Error("Die Interventionsphase ist nicht offen.");
    }
    if (!FIGURES.some((entry) => entry.id === payload.suspectId)) {
      throw new Error("Verdachtsfigur nicht gefunden.");
    }
    if (!FIGURES.some((entry) => entry.id === payload.trustFigureId)) {
      throw new Error("Vertrauensfigur nicht gefunden.");
    }
    if (!round.responseOptions.includes(payload.moveId)) {
      throw new Error("Intervention nicht verfuegbar.");
    }
    round.responseSelections[resolvedSeat] = {
      suspectId: payload.suspectId,
      trustFigureId: payload.trustFigureId,
      moveId: payload.moveId,
      accusePartner: Boolean(payload.accusePartner)
    };
    appendFeed(room, "public", "Private Intervention", `${room.seats[resolvedSeat].name || `Spieler*in ${resolvedSeat}`} hat Verdacht und Eingriff ans System gemeldet.`, "system");
    if (room.mode === "solo") {
      advanceSoloRoom(room);
    } else if (round.responseSelections.A && round.responseSelections.B) {
      resolveResponses(room);
    }
    return;
  }

  if (type === "reflection-submit") {
    if (room.phase !== "reflection") {
      throw new Error("Reflexion ist noch nicht offen.");
    }
    round.reflections[resolvedSeat] = String(payload.text || "").trim().slice(0, 650);
    if (room.mode === "solo") {
      advanceSoloRoom(room);
    } else if (round.reflections.A && round.reflections.B) {
      closeRound(room);
    }
    return;
  }

  throw new Error("Unbekannter Aktionstyp.");
}

function extractViewer(url) {
  const mode = url.searchParams.get("viewer") || "board";
  return {
    mode,
    seat: url.searchParams.get("seat") || "",
    token: url.searchParams.get("token") || ""
  };
}

async function serveStatic(req, res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = normalize(join(ROOT, safePath));
  if (!filePath.startsWith(ROOT)) {
    sendError(res, 403, "Forbidden");
    return;
  }
  try {
    const file = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(file);
  } catch {
    sendError(res, 404, "Not found");
  }
}

function logNetworkHints(port) {
  const nets = networkInterfaces();
  console.log(`Aletheia Wirklichkeitslabor laeuft auf http://localhost:${port}`);
  for (const addresses of Object.values(nets)) {
    for (const info of addresses || []) {
      if (info.family === "IPv4" && !info.internal) {
        console.log(`Im WLAN/LAN: http://${info.address}:${port}`);
      }
    }
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (req.method === "GET" && pathname === "/api/health") {
    sendJson(res, 200, { ok: true, time: nowIso() });
    return;
  }

  if (req.method === "POST" && pathname === "/api/rooms") {
    try {
      const body = await parseBody(req);
      const room = buildRoom(body);
      ROOMS.set(room.id, room);
      sendJson(res, 201, {
        roomId: room.id,
        hostToken: room.hostToken,
        mode: room.mode
      });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  const roomMatch = pathname.match(/^\/api\/rooms\/([A-Z0-9]+)$/);
  if (req.method === "GET" && roomMatch) {
    const room = ROOMS.get(roomMatch[1]);
    if (!room) {
      sendError(res, 404, "Raum nicht gefunden.");
      return;
    }
    const viewer = extractViewer(url);
    if (!validateViewer(room, viewer)) {
      sendError(res, 403, "Ungueltige Raumansicht.");
      return;
    }
    sendJson(res, 200, snapshotFor(room, viewer));
    return;
  }

  const joinMatch = pathname.match(/^\/api\/rooms\/([A-Z0-9]+)\/join$/);
  if (req.method === "POST" && joinMatch) {
    const room = ROOMS.get(joinMatch[1]);
    if (!room) {
      sendError(res, 404, "Raum nicht gefunden.");
      return;
    }
    try {
      const body = await parseBody(req);
      const seat = body.seat === "B" ? "B" : "A";
      room.seats[seat].name = String(body.name || `Spieler*in ${seat}`).trim().slice(0, 48) || `Spieler*in ${seat}`;
      room.seats[seat].token = room.seats[seat].token || randomId(18);
      room.seats[seat].joinedAt = nowIso();
      appendFeed(room, "public", "Endgeraet verbunden", `${room.seats[seat].name} ist auf Sitz ${seat} beigetreten.`, "positive");
      if (room.mode === "multi" && room.phase === "lobby" && !room.currentRound && roomNeedsBothSeats(room)) {
        resetGame(room);
      }
      broadcastRoom(room);
      sendJson(res, 200, {
        roomId: room.id,
        seat,
        token: room.seats[seat].token
      });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  const actionMatch = pathname.match(/^\/api\/rooms\/([A-Z0-9]+)\/action$/);
  if (req.method === "POST" && actionMatch) {
    const room = ROOMS.get(actionMatch[1]);
    if (!room) {
      sendError(res, 404, "Raum nicht gefunden.");
      return;
    }
    try {
      const body = await parseBody(req);
      const viewer = {
        mode: body.viewer?.mode || "board",
        seat: body.viewer?.seat || "",
        token: body.viewer?.token || ""
      };
      if (!validateViewer(room, viewer)) {
        sendError(res, 403, "Aktionskontext ungueltig.");
        return;
      }
      handleRoomAction(room, viewer, body.type, body.payload || {});
      broadcastRoom(room);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  const streamMatch = pathname.match(/^\/api\/rooms\/([A-Z0-9]+)\/stream$/);
  if (req.method === "GET" && streamMatch) {
    const room = ROOMS.get(streamMatch[1]);
    if (!room) {
      sendError(res, 404, "Raum nicht gefunden.");
      return;
    }
    const viewer = extractViewer(url);
    if (!validateViewer(room, viewer)) {
      sendError(res, 403, "Stream nicht erlaubt.");
      return;
    }
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      Connection: "keep-alive"
    });
    const client = { res, viewer };
    room.streams.add(client);
    res.write(`data: ${JSON.stringify(snapshotFor(room, viewer))}\n\n`);
    req.on("close", () => {
      room.streams.delete(client);
    });
    return;
  }

  serveStatic(req, res, pathname);
});

const portArgIndex = process.argv.findIndex((arg) => arg === "--port");
const hostArgIndex = process.argv.findIndex((arg) => arg === "--host");
const PORT = portArgIndex >= 0
  ? Number(process.argv[portArgIndex + 1])
  : Number(process.env.PORT || 8787);
const HOST = hostArgIndex >= 0
  ? String(process.argv[hostArgIndex + 1])
  : String(process.env.HOST || "0.0.0.0");

server.listen(PORT, HOST, () => {
  logNetworkHints(PORT);
});
