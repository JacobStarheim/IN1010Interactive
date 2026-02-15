import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = "/Users/jacob/IN1010-web/src/data/exams";

const pagePath = (examId, variant, page) =>
  `/assets/exams/${examId}/${variant}/page-${String(page).padStart(2, "0")}.png`;

const exams = [
  {
    id: "v24-midtveis",
    title: "IN1010 Midtveis V24",
    sourcePromptPdf: "midtveis-v24.pdf",
    sourceSolutionPdf: "fasit-midtveis-v24.pdf",
    questionPages: {
      1: { prompt: [2], solution: [2] },
      2: { prompt: [3], solution: [3] },
      3: { prompt: [4], solution: [4] },
      4: { prompt: [5], solution: [5] },
      5: { prompt: [6, 7], solution: [6, 7] },
      6: { prompt: [8, 9, 10], solution: [8, 9, 10] },
      7: { prompt: [11], solution: [11] },
      8: { prompt: [12, 13], solution: [12, 13] },
      9: { prompt: [14, 15], solution: [14, 15] },
      10: { prompt: [16, 17], solution: [16, 17] },
    },
    titles: {
      1: "Enkel-programmering",
      2: "Arv+komposisjon",
      3: "Enkel-lesing",
      4: "Person-objekter",
      5: "Pekersjonglering",
      6: "Katt+mus+ost",
      7: "Frekvensteller",
      8: "Rekursiv-utskrift",
      9: "Polymorfe-metoder",
      10: "Referansetilordning",
    },
    types: {
      1: "drag-drop",
      2: "choice-grid",
      3: "drag-drop",
      4: "choice-grid",
      5: "choice-grid",
      6: "choice-grid",
      7: "choice-grid",
      8: "drag-drop",
      9: "choice-grid",
      10: "choice-grid",
    },
    interactions: {
      1: {
        checkMode: "auto",
        instructions:
          "Dra kodebitene til riktig plass i rekkefølge for å lage et gyldig og kjørbart program.",
        draggableItems: [
          { id: "q1_main", label: "public static void main (String[] args) {" },
          { id: "q1_decl", label: "Pakke min, din;" },
          { id: "q1_new", label: "min = new Pakke(5);" },
          { id: "q1_assign", label: "din = min;" },
          { id: "q1_read", label: "int vekten = din.vekt;" },
          { id: "q1_print", label: "System.out.println(vekten);" },
        ],
        dropZones: [
          {
            id: "q1_slot_1",
            label: "Plass 1",
            accepts: ["q1_main"],
            pageIndex: 0,
            rect: { x: 0.13, y: 0.318, w: 0.293, h: 0.028 },
          },
          {
            id: "q1_slot_2",
            label: "Plass 2",
            accepts: ["q1_decl"],
            pageIndex: 0,
            rect: { x: 0.166, y: 0.354, w: 0.293, h: 0.028 },
          },
          {
            id: "q1_slot_3",
            label: "Plass 3",
            accepts: ["q1_new"],
            pageIndex: 0,
            rect: { x: 0.166, y: 0.389, w: 0.293, h: 0.028 },
          },
          {
            id: "q1_slot_4",
            label: "Plass 4",
            accepts: ["q1_assign"],
            pageIndex: 0,
            rect: { x: 0.166, y: 0.425, w: 0.293, h: 0.028 },
          },
          {
            id: "q1_slot_5",
            label: "Plass 5",
            accepts: ["q1_read"],
            pageIndex: 0,
            rect: { x: 0.166, y: 0.461, w: 0.293, h: 0.028 },
          },
          {
            id: "q1_slot_6",
            label: "Plass 6",
            accepts: ["q1_print"],
            pageIndex: 0,
            rect: { x: 0.166, y: 0.496, w: 0.293, h: 0.028 },
          },
        ],
      },
    },
  },
  {
    id: "v24-konte",
    title: "IN1010 Midtveis V24 Konte",
    sourcePromptPdf: "midtveis-v24-konte.pdf",
    sourceSolutionPdf: "midtveis-v24-konte-fasit.pdf",
    questionPages: {
      1: { prompt: [2], solution: [2] },
      2: { prompt: [3], solution: [3] },
      3: { prompt: [4, 5], solution: [4, 5] },
      4: { prompt: [6, 7], solution: [6, 7] },
      5: { prompt: [8], solution: [8] },
      6: { prompt: [9, 10], solution: [9, 10] },
      7: { prompt: [11, 12], solution: [11, 12] },
      8: { prompt: [13], solution: [13] },
      9: { prompt: [14, 15], solution: [14, 15] },
      10: { prompt: [16, 17], solution: [16, 17] },
      11: { prompt: [18, 19], solution: [18, 19] },
    },
    titles: {
      1: "Sett inn verdi i array",
      2: "Brev-vekt program",
      3: "Les og skriv ut tall",
      4: "Finn hesteeiere",
      5: "Rekursiv arraysum",
      6: "Dobbeltliste-metoder",
      7: "Kaninbeholder",
      8: "Utskrift av fem tall",
      9: "Bilkø-metoder",
      10: "Bokpriser",
      11: "Typer og casting",
    },
    types: {
      1: "choice-grid",
      2: "drag-drop",
      3: "drag-drop",
      4: "choice-grid",
      5: "drag-drop",
      6: "drag-drop",
      7: "drag-drop",
      8: "choice-grid",
      9: "drag-drop",
      10: "choice-grid",
      11: "choice-grid",
    },
  },
  {
    id: "v24-prove",
    title: "IN1010 Midtveis V24 Prøve",
    sourcePromptPdf: "midtveis-v24-prove.pdf",
    sourceSolutionPdf: "midtveis-v24-prove-fasit.pdf",
    questionPages: {
      1: { prompt: [1], solution: [1] },
      2: { prompt: [2], solution: [2] },
      3: { prompt: [3, 4], solution: [3, 4] },
      4: { prompt: [5], solution: [5] },
    },
    titles: {
      1: "IN1010-test-1",
      2: "IN1010-test-4",
      3: "IN1010-test-2",
      4: "IN1010-test-3",
    },
    types: {
      1: "choice-grid",
      2: "choice-grid",
      3: "choice-grid",
      4: "drag-drop",
    },
    interactions: {
      1: {
        checkMode: "auto",
        instructions: "Velg alle uttrykk som sammenligner string-innhold korrekt i Java.",
        allowMultiple: true,
        options: [
          { id: "q1_a", label: "a <> b", correct: false },
          { id: "q1_b", label: "a = b", correct: false },
          { id: "q1_c", label: "a == b", correct: false },
          { id: "q1_d", label: "a.equals(b)", correct: true },
          { id: "q1_e", label: "b.equals(a)", correct: true },
          { id: "q1_f", label: "a.length() == b.length()", correct: false },
          { id: "q1_g", label: "a eq b", correct: false },
          { id: "q1_h", label: "a.compareTo(b) == 0", correct: true },
        ],
      },
      2: {
        checkMode: "manual",
        instructions:
          "Bruk denne som øvingstabell. For fasit vises offisiell fasitside med avkryssing per relasjon.",
      },
      3: {
        checkMode: "auto",
        instructions: "Velg tallet programmet skriver ut.",
        allowMultiple: false,
        options: [
          { id: "q3_21", label: "21", correct: true },
          { id: "q3_8", label: "8", correct: false },
          { id: "q3_0", label: "0", correct: false },
          { id: "q3_13", label: "13", correct: false },
          { id: "q3_5", label: "5", correct: false },
          { id: "q3_4", label: "4", correct: false },
          { id: "q3_1", label: "1", correct: false },
          { id: "q3_3", label: "3", correct: false },
          { id: "q3_2", label: "2", correct: false },
        ],
      },
      4: {
        checkMode: "auto",
        instructions: "Dra kodebitene inn i riktig hull i programmet.",
        draggableItems: [
          { id: "new_scanner", label: "new Scanner(System.in)" },
          { id: "prompt", label: "\"Gi karakter 1-6: \"" },
          { id: "next_int", label: "tastatur.nextInt()" },
          { id: "valid_if", label: "1 <= svar && svar <= 6" },
          { id: "ok", label: "\"OK\"" },
          { id: "fail", label: "\"FEIL\"" },
          { id: "wrong_or", label: "1 <= svar || svar <= 6" },
          { id: "wrong_chain", label: "1 <= svar <= 6" },
          { id: "wrong_four", label: "4" },
          { id: "wrong_system_in", label: "System.in" },
        ],
        dropZones: [
          { id: "slot_scanner", label: "Scanner tastatur = ...", accepts: ["new_scanner"] },
          { id: "slot_prompt", label: "System.out.print(...)", accepts: ["prompt"] },
          { id: "slot_read", label: "int svar = ...", accepts: ["next_int"] },
          { id: "slot_if", label: "if (...)", accepts: ["valid_if"] },
          { id: "slot_true", label: "println i if-gren", accepts: ["ok"] },
          { id: "slot_false", label: "println i else-gren", accepts: ["fail"] },
        ],
      },
    },
  },
  {
    id: "v25-midtveis",
    title: "IN1010 Midtveis V25",
    sourcePromptPdf: "in1010-v25-midtveis.pdf",
    sourceSolutionPdf: "in1010-v25-midtveis-fasit.pdf",
    questionPages: {
      1: { prompt: [1, 2], solution: [1, 2] },
      2: { prompt: [3], solution: [3] },
      3: { prompt: [4], solution: [4] },
      4: { prompt: [5], solution: [5] },
      5: { prompt: [6, 7], solution: [6, 7] },
      6: { prompt: [8], solution: [8] },
      7: { prompt: [9, 10], solution: [9, 10] },
      8: { prompt: [11, 12], solution: [11, 12] },
      9: { prompt: [13], solution: [13] },
      10: { prompt: [14, 15], solution: [14, 15] },
      11: { prompt: [16, 17], solution: [16, 17] },
    },
    titles: {
      1: "Tallutskrift",
      2: "Arv eller komposisjon",
      3: "Fil-lesing",
      4: "Hundeglam",
      5: "Bileiere",
      6: "Generisk lenkeliste",
      7: "Kanin-sortering",
      8: "Statiske variabler",
      9: "Dobbeltlenket Bil-liste",
      10: "Typer og interfaces",
      11: "Flybilletter",
    },
    types: {
      1: "choice-grid",
      2: "choice-grid",
      3: "drag-drop",
      4: "drag-drop",
      5: "choice-grid",
      6: "choice-grid",
      7: "choice-grid",
      8: "choice-grid",
      9: "drag-drop",
      10: "choice-grid",
      11: "choice-grid",
    },
  },
  {
    id: "v25-konte",
    title: "IN1010 Midtveis V25 Konte",
    sourcePromptPdf: "in1010-v25-midt-konte-uten-svar.pdf",
    sourceSolutionPdf: "in1010-v25-midt-konte-med-svar.pdf",
    questionPages: {
      1: { prompt: [2], solution: [2] },
      2: { prompt: [3], solution: [3] },
      3: { prompt: [4, 5], solution: [4, 5] },
      4: { prompt: [6], solution: [6, 7] },
      5: { prompt: [7, 8], solution: [8, 9] },
      6: { prompt: [9], solution: [10] },
      7: { prompt: [10], solution: [11] },
      8: { prompt: [11, 12], solution: [12, 13] },
      9: { prompt: [13, 14], solution: [14] },
      10: { prompt: [14], solution: [15] },
      11: { prompt: [15], solution: [16] },
    },
    titles: {
      1: "Sett inn i array",
      2: "Bil-liste",
      3: "8 tall",
      4: "Kompilerer/kjører",
      5: "Les strenger til liste",
      6: "To array-metoder",
      7: "EnVeisBeholder",
      8: "Casting-linje",
      9: "Gamlefela / Litago",
      10: "Arv eller komposisjon",
      11: "Iterator baklengs",
    },
    types: {
      1: "choice-grid",
      2: "drag-drop",
      3: "choice-grid",
      4: "choice-grid",
      5: "code-editor",
      6: "drag-drop",
      7: "drag-drop",
      8: "choice-grid",
      9: "drag-drop",
      10: "choice-grid",
      11: "drag-drop",
    },
    interactions: {
      5: {
        checkMode: "manual",
        instructions: "Skriv løsning i editoren og sammenlign med fasit med knappen over.",
        codeTemplate:
          "import java.util.*;\n\nclass Oppgave5 {\n  // Skriv metoden her\n}\n",
        solutionText: "Bruk Vis fasit for den offisielle løsningsvarianten.",
      },
    },
  },
];

function buildExamManifest(def) {
  const questionNumbers = Object.keys(def.questionPages)
    .map((n) => Number(n))
    .sort((a, b) => a - b);

  const questions = questionNumbers.map((number) => {
    const qId = `q${String(number).padStart(2, "0")}`;
    const pages = def.questionPages[number];
    const interaction = def.interactions?.[number] ?? {
      checkMode: "manual",
      instructions:
        "Interaktiv versjon av denne oppgaven er ikke fullstendig modellert enda. Bruk Vis fasit for offisiell løsning.",
    };

    const type = def.types[number];

    return {
      id: qId,
      number,
      title: def.titles[number] ?? `Oppgave ${number}`,
      type,
      promptPages: pages.prompt.map((p) => pagePath(def.id, "prompt", p)),
      solutionPages: pages.solution.map((p) => pagePath(def.id, "solution", p)),
      interaction:
        type === "official-only"
          ? undefined
          : type === "code-editor"
          ? interaction
          : interaction,
    };
  });

  return {
    id: def.id,
    title: def.title,
    sourcePromptPdf: def.sourcePromptPdf,
    sourceSolutionPdf: def.sourceSolutionPdf,
    questionOrder: questions.map((q) => q.id),
    questions,
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const index = [];

  for (const def of exams) {
    const manifest = buildExamManifest(def);
    const fileName = `${def.id}.json`;
    const outPath = path.join(OUT_DIR, fileName);
    await writeFile(outPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
    index.push({ id: def.id, file: `./${fileName}` });
    console.log(`Wrote ${outPath}`);
  }

  await writeFile(
    path.join(OUT_DIR, "index.json"),
    JSON.stringify(index, null, 2) + "\n",
    "utf8"
  );

  console.log("Generated all manifest files.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
