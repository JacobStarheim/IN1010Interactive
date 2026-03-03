import type { QuestionManifest, QuestionType } from "@/lib/exam-types";

export type QuestionExplanation = {
  title: string;
  steps: string[];
};

const containsAny = (value: string, tokens: string[]) => tokens.some((token) => value.includes(token));

const baseStepsByType: Record<QuestionType, string[]> = {
  "official-only": [
    "Les oppgaveteksten helt ferdig og marker hva som faktisk skal besvares.",
    "Noter hvilke begreper/formler oppgaven tester før du begynner å svare.",
    "Løs oppgaven på kladd først, og bruk fasit til kontroll til slutt.",
  ],
  "code-editor": [
    "Lag først en kort plan for input, behandling og output før du skriver kode.",
    "Skriv en minimal korrekt løsning, og utvid deretter stegvis.",
    "Sjekk kanttilfeller (tom input, null, grenser) før du sammenligner med fasit.",
  ],
  "drag-drop": [
    "Start med å plassere de mest tydelige linjene først (signatur, deklarasjoner, base case).",
    "Fyll inn kontrollflyt (if/for/while/rekursjon) slik at blokker og innrykk blir logiske.",
    "Plasser resten av linjene ved å matche typer, variabelnavn og dataflyt.",
    "Les koden fra topp til bunn og simuler én kjøring for å kontrollere at alt henger sammen.",
  ],
  "choice-grid": [
    "Les én rad av gangen og avgjør hva raden faktisk spør om før du velger.",
    "Bruk fagregelen for raden (f.eks. typekompatibilitet, arv/komposisjon, output-simulering).",
    "Marker svaret og gå videre uten å blande inn andre rader.",
    "Ta en rask sluttkontroll av alle rader før du sjekker svar.",
  ],
};

const domainSteps = (title: string): string[] => {
  const normalized = title.toLowerCase();

  if (containsAny(normalized, ["arv", "komposisjon"])) {
    return [
      "Spør: er dette en «er-en» relasjon (arv) eller «har-en/del-av» (komposisjon)?",
      "Sjekk om objektet kan eksistere uten helheten; hvis ja er komposisjon ofte riktigere.",
      "Unngå arv når relasjonen bare beskriver bruk/samarbeid og ikke en ekte subtype.",
    ];
  }

  if (containsAny(normalized, ["casting", "typer", "interface", "referanse"])) {
    return [
      "Sjekk først statisk type på venstresiden og faktisk objekttype på høyresiden.",
      "Oppcasting er normalt lov uten cast; nedcasting krever cast og korrekt runtime-type.",
      "Skille mellom kompileringsfeil og runtime-feil før du velger svar.",
    ];
  }

  if (containsAny(normalized, ["rekursiv"])) {
    return [
      "Identifiser base case først; den må stoppe rekursjonen sikkert.",
      "Sjekk rekursivt kall: det må gå mot base case og bruke riktig referanse.",
      "Simuler 2-3 nivåer manuelt for å bekrefte rekkefølgen på utskrift/retur.",
    ];
  }

  if (containsAny(normalized, ["statisk"])) {
    return [
      "Hold separat oversikt over klassevariabler (static) og objektvariabler.",
      "Oppdater verdier linje for linje i kjørerekkefølge og noter etter hvert kall.",
      "Kontroller sluttverdiene på alle referanser før du fyller inn svar.",
    ];
  }

  if (containsAny(normalized, ["polymorf", "overrid", "metoder"])) {
    return [
      "Finn hvilken metodeimplementasjon som faktisk kalles ved runtime (dynamisk binding).",
      "Skille mellom felt-tilgang og metodekall; felter er ikke polymorfe på samme måte.",
      "Følg utskriftsrekkefølgen nøyaktig og fyll inn en verdi av gangen.",
    ];
  }

  if (containsAny(normalized, ["iterator"])) {
    return [
      "Sjekk at iterator og returtype samsvarer med grensesnittet som implementeres.",
      "Verifiser startindeks, stoppbetingelse (`hasNext`) og oppdatering i `next`.",
      "Simuler de første kallene manuelt for å bekrefte riktig rekkefølge.",
    ];
  }

  if (containsAny(normalized, ["fil", "lesing", "scanner"])) {
    return [
      "Identifiser inputkilde og hva som leses i hver iterasjon.",
      "Sjekk løkkebetingelse og oppdatering av variabler for hvert steg.",
      "Valider sluttutskrift ved å kjøre et lite eksempel for hånd.",
    ];
  }

  if (containsAny(normalized, ["array", "tall", "utskrift", "frekvens"])) {
    return [
      "Spor indekser nøye: start, stopp og om grensen er inklusiv/eksklusiv.",
      "Oppdater array- eller tellerverdier steg for steg i en liten tabell.",
      "Kontroller at hver utskrift bruker riktig variabel på riktig tidspunkt.",
    ];
  }

  if (containsAny(normalized, ["lenkeliste", "liste", "bil-liste", "beholder"])) {
    return [
      "Tegn nodene/referansene først (første, siste, neste, forrige) før du velger linjer.",
      "Sjekk at alle pekeroppdateringer bevarer struktur uten å miste referanser.",
      "Verifiser resultatet ved å traversere strukturen etter operasjonen.",
    ];
  }

  return [
    "Marker nøkkelordene i oppgaven som bestemmer hvilke regler du må bruke.",
    "Løs del for del og kontroller hver del før du går videre.",
    "Bruk fasit til å forstå eventuelle avvik etter at du har prøvd selv.",
  ];
};

export function getQuestionExplanation(_examId: string, question: QuestionManifest): QuestionExplanation {
  const title = question.title;
  const steps = [...baseStepsByType[question.type], ...domainSteps(title)];

  return {
    title: `Slik kan du løse ${title}`,
    steps,
  };
}
