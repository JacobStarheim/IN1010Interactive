import type { ExamId, QuestionType } from "@/lib/exam-types";

export type Locale = "nb" | "en";

export const DEFAULT_LOCALE: Locale = "nb";
export const LOCALE_STORAGE_KEY = "in1010:locale";

export const isLocale = (value: string | null | undefined): value is Locale =>
  value === "nb" || value === "en";

export const getLocaleTag = (locale: Locale) => (locale === "en" ? "en-US" : "nb-NO");

export const getLocaleLabel = (locale: Locale, value: Locale) => {
  if (value === "en") {
    return locale === "en" ? "English" : "Engelsk";
  }
  return locale === "en" ? "Norwegian" : "Norsk";
};

export const formatExamTitle = (examId: ExamId, locale: Locale) => {
  const [, yearSuffix, variant] = examId.match(/^v(\d{2})-(.+)$/) ?? [];
  const year = yearSuffix ? `20${yearSuffix}` : examId;
  const midterm = locale === "en" ? "Midterm" : "Midtveis";
  const resit = locale === "en" ? "Resit" : "Konte";
  const practice = locale === "en" ? "Practice" : "Prøve";

  if (variant === "midtveis") {
    return `${year} ${midterm}`;
  }
  if (variant === "konte") {
    return `${year} ${midterm} ${resit}`;
  }
  if (variant === "prove") {
    return `${year} ${midterm} ${practice}`;
  }

  return examId;
};

export const formatQuestionHeading = (number: number, title: string, locale: Locale) =>
  locale === "en" ? `Question ${number}: ${title}` : `Oppgave ${number}: ${title}`;

export const formatPageAlt = (pageIndex: number, locale: Locale) =>
  locale === "en" ? `Question page ${pageIndex + 1}` : `Oppgaveside ${pageIndex + 1}`;

export const getQuestionTypeLabel = (type: QuestionType, locale: Locale) => {
  const map: Record<QuestionType, string> =
    locale === "en"
      ? {
          "official-only": "Original view",
          "drag-drop": "Drag and drop",
          "choice-grid": "Choice grid",
          "code-editor": "Code editor",
        }
      : {
          "official-only": "Originalvisning",
          "drag-drop": "Dra og slipp",
          "choice-grid": "Svarrutenett",
          "code-editor": "Kodefelt",
        };

  return map[type];
};

export const formatDateTime = (value: string, locale: Locale) =>
  new Intl.DateTimeFormat(getLocaleTag(locale), {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));

export const formatTime = (value: string, locale: Locale) =>
  new Intl.DateTimeFormat(getLocaleTag(locale), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const instructionTranslations: Record<string, string> = {
  "Dra hestenavnene inn i feltene og trykk Sjekk svar.": "Drag the horse names into the fields and press Check answer.",
  "Dra kodebitene inn i riktig rekkefølge.": "Drag the code pieces into the correct order.",
  "Dra kodebitene så programmet finner eldste kanin korrekt.": "Drag the code pieces so the program finds the oldest rabbit correctly.",
  "Dra kodebitene til riktige tomrom i programmet.": "Drag the code pieces into the correct blanks in the program.",
  "Dra riktig kodelinje inn i hvert tomrom og trykk Sjekk svar.": "Drag the correct line of code into each blank and press Check answer.",
  "Fyll inn de to manglende bitene i den rekursive summen.": "Fill in the two missing parts in the recursive sum.",
  "Marker OK eller Feil per linje og trykk Sjekk svar.": "Mark OK or Error for each line and press Check answer.",
  "Sett inn riktig kode i hver metode.": "Insert the correct code in each method.",
  "Sett inn riktige kodelinjer i Bilkø-metodene.": "Insert the correct lines of code in the queue methods.",
  "Skriv internprisene i feltene og trykk Sjekk svar.": "Write the internal prices in the fields and press Check answer.",
  "Skriv tallene i feltene og trykk Sjekk svar.": "Write the numbers in the fields and press Check answer.",
  "Dra kodebitene til de tomme feltene i riktig rekkefølge.": "Drag the code pieces into the empty fields in the correct order.",
  "Dra kodebitene til riktig plass i rekkefølge for å lage et gyldig og kjørbart program.": "Drag the code pieces into the correct places to create a valid and runnable program.",
  "Dra riktig kodebit inn i hvert tomme felt i rekursjonsoppgaven.": "Drag the correct code piece into each blank in the recursion task.",
  "Klikk i tabellen for hver rad og trykk Sjekk svar.": "Click in the table for each row and press Check answer.",
  "Marker riktig navn for hver rad og trykk Sjekk svar.": "Mark the correct name for each row and press Check answer.",
  "Skriv de åtte verdiene i feltene og trykk Sjekk svar.": "Write the eight values in the fields and press Check answer.",
  "Skriv svarene i feltene og trykk Sjekk svar.": "Write the answers in the fields and press Check answer.",
  "Skriv tallverdiene i feltene og trykk Sjekk svar.": "Write the numeric values in the fields and press Check answer.",
  "Dra kodebitene inn i riktig hull i programmet.": "Drag the code pieces into the correct blanks in the program.",
  "Velg alle uttrykk som sammenligner string-innhold korrekt i Java.": "Select all expressions that compare string contents correctly in Java.",
  "Velg tallet programmet skriver ut.": "Select the number the program prints.",
  "Dra kodebitene inn slik at programmet skriver ut de to riktige linjene.": "Drag the code pieces so the program prints the two correct lines.",
  "Dra kodebitene på plass i enkeltlenket liste.": "Drag the code pieces into place in the singly linked list.",
  "Dra kodebitene til riktig plass i de to array-metodene.": "Drag the code pieces into the correct places in the two array methods.",
  "Fyll inn iterator-koden for baklengs gjennomgang.": "Fill in the iterator code for reverse traversal.",
  "Fyll inn kodebitene i EnVeisBeholder.": "Fill in the code pieces in EnVeisBeholder.",
  "Marker OK eller Vil gi feil per linje og trykk Sjekk svar.": "Mark OK or Will fail for each line and press Check answer.",
  "Marker riktig kolonne for hver kodelinje og trykk Sjekk svar.": "Mark the correct column for each line of code and press Check answer.",
  "Skriv de åtte utskriftene i feltene og trykk Sjekk svar.": "Write the eight outputs in the fields and press Check answer.",
  "Skriv løsning i editoren og sammenlign med fasit med knappen over.": "Write your solution in the editor and compare it with the answer key using the button above.",
  "Dra linjene til riktig plass for å skrive ut Voff-voff.": "Drag the lines into the correct places to print Voff-voff.",
  "Dra navnene inn i feltene og trykk Sjekk svar.": "Drag the names into the fields and press Check answer.",
  "Dra registreringsnumrene inn i feltene og trykk Sjekk svar.": "Drag the registration numbers into the fields and press Check answer.",
  "Dra riktig kodebit inn i hvert tomme felt.": "Drag the correct code piece into each empty field.",
  "Marker linjene som inneholder feil og trykk Sjekk svar.": "Mark the lines that contain errors and press Check answer.",
  "Marker om linjen er lovlig eller ikke og trykk Sjekk svar.": "Mark whether the line is legal or not and press Check answer.",
  "Sett inn alle ni kodebitene på riktig plass.": "Insert all nine code pieces into the correct places.",
  "Skriv de åtte tallene i feltene og trykk Sjekk svar.": "Write the eight numbers in the fields and press Check answer.",
  "Skriv pris/lengde-verdiene i feltene og trykk Sjekk svar.": "Write the price/length values in the fields and press Check answer.",
  "Skriv verdiene i feltene og trykk Sjekk svar.": "Write the values in the fields and press Check answer.",
  "Dra riktig kodebit inn i hvert tomrom og trykk Sjekk svar.": "Drag the correct code piece into each blank and press Check answer.",
  "Marker om tilordningen er tillatt eller ikke og trykk Sjekk svar.": "Mark whether the assignment is allowed or not and press Check answer.",
  "Velg ett alternativ og trykk Sjekk svar.": "Choose one option and press Check answer.",
  "Marker riktig kolonne for hver linje og trykk Sjekk svar.": "Mark the correct column for each line and press Check answer.",
};

export const translateInteractionInstruction = (instruction: string | undefined, locale: Locale) => {
  if (!instruction) {
    return instruction;
  }
  if (locale === "nb") {
    return instruction;
  }
  return instructionTranslations[instruction] ?? instruction;
};
