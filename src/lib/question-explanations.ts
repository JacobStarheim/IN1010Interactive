import type { QuestionManifest, QuestionType } from "@/lib/exam-types";
import type { Locale } from "@/lib/i18n";

export type QuestionExplanation = {
  title: string;
  steps: string[];
};

const containsAny = (value: string, tokens: string[]) => tokens.some((token) => value.includes(token));

const baseStepsByType: Record<Locale, Record<QuestionType, string[]>> = {
  nb: {
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
  },
  en: {
    "official-only": [
      "Read the entire prompt first and mark what the question actually asks you to answer.",
      "Note which concepts or rules the task is testing before you start solving.",
      "Work it out on scratch first, then use the answer key only as a final check.",
    ],
    "code-editor": [
      "Start with a short plan for input, processing, and output before writing code.",
      "Write a minimal correct solution first, then extend it step by step.",
      "Check edge cases (empty input, null, boundaries) before comparing with the answer key.",
    ],
    "drag-drop": [
      "Place the clearest lines first (signature, declarations, base case).",
      "Fill in the control flow (`if`/`for`/`while`/recursion) so the blocks and indentation make sense.",
      "Place the remaining lines by matching types, variable names, and data flow.",
      "Read the code top to bottom and simulate one run to confirm everything fits together.",
    ],
    "choice-grid": [
      "Read one row at a time and decide what that row is really asking before you answer.",
      "Apply the rule for that row only (for example type compatibility, inheritance/composition, or output tracing).",
      "Mark the answer and move on without mixing in other rows.",
      "Do one quick final pass across all rows before checking the answer.",
    ],
  },
};

const fallbackDomainSteps: Record<Locale, string[]> = {
  nb: [
    "Marker nøkkelordene i oppgaven som bestemmer hvilke regler du må bruke.",
    "Løs del for del og kontroller hver del før du går videre.",
    "Bruk fasit til å forstå eventuelle avvik etter at du har prøvd selv.",
  ],
  en: [
    "Mark the keywords that tell you which rules or concepts to apply.",
    "Solve the task step by step and verify each part before moving on.",
    "Use the answer key to understand any mismatch only after you have tried it yourself.",
  ],
};

const domainSteps = (title: string, locale: Locale): string[] => {
  const normalized = title.toLowerCase();

  if (containsAny(normalized, ["arv", "komposisjon"])) {
    return locale === "en"
      ? [
          "Ask whether this is an ‘is-a’ relationship (inheritance) or a ‘has-a/part-of’ relationship (composition).",
          "Check whether the object can exist without the whole; if yes, composition is often the better fit.",
          "Avoid inheritance when the relation is only about usage or collaboration and not a real subtype.",
        ]
      : [
          "Spør: er dette en «er-en» relasjon (arv) eller «har-en/del-av» (komposisjon)?",
          "Sjekk om objektet kan eksistere uten helheten; hvis ja er komposisjon ofte riktigere.",
          "Unngå arv når relasjonen bare beskriver bruk/samarbeid og ikke en ekte subtype.",
        ];
  }

  if (containsAny(normalized, ["casting", "typer", "interface", "referanse"])) {
    return locale === "en"
      ? [
          "Check the static type on the left-hand side and the actual runtime type on the right-hand side first.",
          "Upcasting is normally legal without a cast; downcasting needs both a cast and the correct runtime type.",
          "Separate compile-time errors from runtime errors before choosing an answer.",
        ]
      : [
          "Sjekk først statisk type på venstresiden og faktisk objekttype på høyresiden.",
          "Oppcasting er normalt lov uten cast; nedcasting krever cast og korrekt runtime-type.",
          "Skille mellom kompileringsfeil og runtime-feil før du velger svar.",
        ];
  }

  if (containsAny(normalized, ["rekursiv"])) {
    return locale === "en"
      ? [
          "Identify the base case first; it must stop the recursion safely.",
          "Check that the recursive call moves toward the base case and uses the correct reference.",
          "Simulate 2-3 levels manually to confirm the print/return order.",
        ]
      : [
          "Identifiser base case først; den må stoppe rekursjonen sikkert.",
          "Sjekk rekursivt kall: det må gå mot base case og bruke riktig referanse.",
          "Simuler 2-3 nivåer manuelt for å bekrefte rekkefølgen på utskrift/retur.",
        ];
  }

  if (containsAny(normalized, ["statisk"])) {
    return locale === "en"
      ? [
          "Keep class variables (`static`) and object variables separate in your notes.",
          "Update the values line by line in execution order after each call.",
          "Check the final values on every reference before filling in the answer boxes.",
        ]
      : [
          "Hold separat oversikt over klassevariabler (static) og objektvariabler.",
          "Oppdater verdier linje for linje i kjørerekkefølge og noter etter hvert kall.",
          "Kontroller sluttverdiene på alle referanser før du fyller inn svar.",
        ];
  }

  if (containsAny(normalized, ["polymorf", "overrid", "metoder"])) {
    return locale === "en"
      ? [
          "Find which method implementation is actually called at runtime (dynamic dispatch).",
          "Separate field access from method calls; fields are not polymorphic in the same way.",
          "Follow the print order exactly and fill in one value at a time.",
        ]
      : [
          "Finn hvilken metodeimplementasjon som faktisk kalles ved runtime (dynamisk binding).",
          "Skille mellom felt-tilgang og metodekall; felter er ikke polymorfe på samme måte.",
          "Følg utskriftsrekkefølgen nøyaktig og fyll inn en verdi av gangen.",
        ];
  }

  if (containsAny(normalized, ["iterator"])) {
    return locale === "en"
      ? [
          "Check that the iterator type and return type match the interface being implemented.",
          "Verify the start index, stop condition (`hasNext`), and update step in `next`.",
          "Simulate the first few calls manually to confirm the order.",
        ]
      : [
          "Sjekk at iterator og returtype samsvarer med grensesnittet som implementeres.",
          "Verifiser startindeks, stoppbetingelse (`hasNext`) og oppdatering i `next`.",
          "Simuler de første kallene manuelt for å bekrefte riktig rekkefølge.",
        ];
  }

  if (containsAny(normalized, ["fil", "lesing", "scanner"])) {
    return locale === "en"
      ? [
          "Identify the input source and what gets read in each iteration.",
          "Check the loop condition and how variables change step by step.",
          "Validate the final output by tracing a small example by hand.",
        ]
      : [
          "Identifiser inputkilde og hva som leses i hver iterasjon.",
          "Sjekk løkkebetingelse og oppdatering av variabler for hvert steg.",
          "Valider sluttutskrift ved å kjøre et lite eksempel for hånd.",
        ];
  }

  if (containsAny(normalized, ["array", "tall", "utskrift", "frekvens"])) {
    return locale === "en"
      ? [
          "Track indices carefully: start, stop, and whether the boundary is inclusive or exclusive.",
          "Update the array or counter values step by step in a small table.",
          "Check that each print statement uses the correct variable at the correct time.",
        ]
      : [
          "Spor indekser nøye: start, stopp og om grensen er inklusiv/eksklusiv.",
          "Oppdater array- eller tellerverdier steg for steg i en liten tabell.",
          "Kontroller at hver utskrift bruker riktig variabel på riktig tidspunkt.",
        ];
  }

  if (containsAny(normalized, ["lenkeliste", "liste", "bil-liste", "beholder"])) {
    return locale === "en"
      ? [
          "Draw the nodes and references first (`first`, `last`, `next`, `previous`) before choosing lines.",
          "Check that every pointer update preserves the structure without losing references.",
          "Verify the result by traversing the structure after the operation.",
        ]
      : [
          "Tegn nodene/referansene først (første, siste, neste, forrige) før du velger linjer.",
          "Sjekk at alle pekeroppdateringer bevarer struktur uten å miste referanser.",
          "Verifiser resultatet ved å traversere strukturen etter operasjonen.",
        ];
  }

  return fallbackDomainSteps[locale];
};

export function getQuestionExplanation(
  locale: Locale,
  _examId: string,
  question: QuestionManifest
): QuestionExplanation {
  const title = question.title;
  const steps = [...baseStepsByType[locale][question.type], ...domainSteps(title, locale)];

  return {
    title: locale === "en" ? `How to solve ${title}` : `Slik kan du løse ${title}`,
    steps,
  };
}
