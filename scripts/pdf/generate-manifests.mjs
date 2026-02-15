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
      3: {
        checkMode: "auto",
        instructions: "Dra kodebitene til de tomme feltene i riktig rekkefølge.",
        draggableItems: [
          { id: "q3_cls", label: "MinstAv5" },
          { id: "q3_min0", label: "min = 0" },
          { id: "q3_for", label: "int i = 1; i <= 5; i++" },
          { id: "q3_read", label: "int v = tastatur.nextInt();" },
          { id: "q3_if", label: "i == 1 || v < min" },
          { id: "q3_set", label: "min = v" },
          { id: "q3_out", label: "min" },
        ],
        dropZones: [
          { id: "q3_slot_1", label: "Plass 1", accepts: ["q3_cls"] },
          { id: "q3_slot_2", label: "Plass 2", accepts: ["q3_min0"] },
          { id: "q3_slot_3", label: "Plass 3", accepts: ["q3_for"] },
          { id: "q3_slot_4", label: "Plass 4", accepts: ["q3_read"] },
          { id: "q3_slot_5", label: "Plass 5", accepts: ["q3_if"] },
          { id: "q3_slot_6", label: "Plass 6", accepts: ["q3_set"] },
          { id: "q3_slot_7", label: "Plass 7", accepts: ["q3_out"] },
        ],
      },
      8: {
        checkMode: "auto",
        instructions: "Dra riktig kodebit inn i hvert tomme felt i rekursjonsoppgaven.",
        draggableItems: [
          { id: "q8_if", label: "neste != null" },
          { id: "q8_rec", label: "neste.skrivRekursivt()" },
          { id: "q8_print", label: "System.out.println(data.toString())" },
          { id: "q8_start_if", label: "start != null" },
          { id: "q8_start_rec", label: "start.skrivRekursivt()" },
        ],
        dropZones: [
          { id: "q8_slot_1", label: "Plass 1", accepts: ["q8_if"] },
          { id: "q8_slot_2", label: "Plass 2", accepts: ["q8_rec"] },
          { id: "q8_slot_3", label: "Plass 3", accepts: ["q8_print"] },
          { id: "q8_slot_4", label: "Plass 4", accepts: ["q8_start_if"] },
          { id: "q8_slot_5", label: "Plass 5", accepts: ["q8_start_rec"] },
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
    interactions: {
      2: {
        checkMode: "auto",
        instructions: "Dra kodebitene til riktige tomrom i programmet.",
        draggableItems: [
          { id: "q2_new", label: "new Brev(19)" },
          { id: "q2_assign", label: "b2 = b1" },
          { id: "q2_print", label: "b2.finnVekt()" },
          { id: "q2_ctor", label: "vekt = v" },
          { id: "q2_ret", label: "vekt" },
        ],
        dropZones: [
          { id: "q2_slot_1", label: "Plass 1", accepts: ["q2_new"] },
          { id: "q2_slot_2", label: "Plass 2", accepts: ["q2_assign"] },
          { id: "q2_slot_3", label: "Plass 3", accepts: ["q2_print"] },
          { id: "q2_slot_4", label: "Plass 4", accepts: ["q2_ctor"] },
          { id: "q2_slot_5", label: "Plass 5", accepts: ["q2_ret"] },
        ],
      },
      3: {
        checkMode: "auto",
        instructions: "Dra kodebitene inn i riktig rekkefølge.",
        draggableItems: [
          { id: "q3_arr", label: "new int[10]" },
          { id: "q3_zero", label: "0" },
          { id: "q3_while", label: "antallTall < 10" },
          { id: "q3_read", label: "tastatur.nextInt()" },
          { id: "q3_break", label: "v < 0" },
          { id: "q3_store", label: "tallene[antallTall] = v" },
          { id: "q3_inc", label: "antallTall = antallTall + 1" },
          { id: "q3_for", label: "int i = antallTall-1; i >= 0; i--" },
          { id: "q3_print", label: "System.out.println" },
          { id: "q3_val", label: "tallene[i]" },
        ],
        dropZones: [
          { id: "q3_slot_1", label: "Plass 1", accepts: ["q3_arr"] },
          { id: "q3_slot_2", label: "Plass 2", accepts: ["q3_zero"] },
          { id: "q3_slot_3", label: "Plass 3", accepts: ["q3_while"] },
          { id: "q3_slot_4", label: "Plass 4", accepts: ["q3_read"] },
          { id: "q3_slot_5", label: "Plass 5", accepts: ["q3_break"] },
          { id: "q3_slot_6", label: "Plass 6", accepts: ["q3_store"] },
          { id: "q3_slot_7", label: "Plass 7", accepts: ["q3_inc"] },
          { id: "q3_slot_8", label: "Plass 8", accepts: ["q3_for"] },
          { id: "q3_slot_9", label: "Plass 9", accepts: ["q3_print"] },
          { id: "q3_slot_10", label: "Plass 10", accepts: ["q3_val"] },
        ],
      },
      5: {
        checkMode: "auto",
        instructions: "Fyll inn de to manglende bitene i den rekursive summen.",
        draggableItems: [
          { id: "q5_zero", label: "0" },
          { id: "q5_rec", label: "finnSum(start+1,a)" },
        ],
        dropZones: [
          { id: "q5_slot_1", label: "Plass 1", accepts: ["q5_zero"] },
          { id: "q5_slot_2", label: "Plass 2", accepts: ["q5_rec"] },
        ],
      },
      6: {
        checkMode: "auto",
        instructions: "Sett inn riktig kode i hver metode.",
        draggableItems: [
          { id: "q6_first_a", label: "første" },
          { id: "q6_move_first", label: "første = første.neste" },
          { id: "q6_ret_a", label: "resP.data" },
          { id: "q6_last", label: "siste" },
          { id: "q6_move_last", label: "siste = siste.forrige" },
          { id: "q6_ret_b", label: "resP.data" },
          { id: "q6_first_b", label: "første" },
          { id: "q6_loop", label: "nodeP = nodeP.neste" },
          { id: "q6_ret_c", label: "nodeP.data" },
        ],
        dropZones: [
          { id: "q6_slot_1", label: "Plass 1", accepts: ["q6_first_a"] },
          { id: "q6_slot_2", label: "Plass 2", accepts: ["q6_move_first"] },
          { id: "q6_slot_3", label: "Plass 3", accepts: ["q6_ret_a"] },
          { id: "q6_slot_4", label: "Plass 4", accepts: ["q6_last"] },
          { id: "q6_slot_5", label: "Plass 5", accepts: ["q6_move_last"] },
          { id: "q6_slot_6", label: "Plass 6", accepts: ["q6_ret_b"] },
          { id: "q6_slot_7", label: "Plass 7", accepts: ["q6_first_b"] },
          { id: "q6_slot_8", label: "Plass 8", accepts: ["q6_loop"] },
          { id: "q6_slot_9", label: "Plass 9", accepts: ["q6_ret_c"] },
        ],
      },
      7: {
        checkMode: "auto",
        instructions: "Dra kodebitene så programmet finner eldste kanin korrekt.",
        draggableItems: [
          { id: "q7_find", label: "første.letEtterEldste()" },
          { id: "q7_ctor", label: "alder = a" },
          { id: "q7_this", label: "this" },
          { id: "q7_if", label: "neste != null" },
          { id: "q7_old", label: "neste.letEtterEldste()" },
          { id: "q7_cmp", label: "gammel.alder > alder" },
          { id: "q7_set", label: "resultat = gammel" },
          { id: "q7_ret", label: "resultat" },
        ],
        dropZones: [
          { id: "q7_slot_1", label: "Plass 1", accepts: ["q7_find"] },
          { id: "q7_slot_2", label: "Plass 2", accepts: ["q7_ctor"] },
          { id: "q7_slot_3", label: "Plass 3", accepts: ["q7_this"] },
          { id: "q7_slot_4", label: "Plass 4", accepts: ["q7_if"] },
          { id: "q7_slot_5", label: "Plass 5", accepts: ["q7_old"] },
          { id: "q7_slot_6", label: "Plass 6", accepts: ["q7_cmp"] },
          { id: "q7_slot_7", label: "Plass 7", accepts: ["q7_set"] },
          { id: "q7_slot_8", label: "Plass 8", accepts: ["q7_ret"] },
        ],
      },
      9: {
        checkMode: "auto",
        instructions: "Sett inn riktige kodelinjer i Bilkø-metodene.",
        draggableItems: [
          { id: "q9_unlink", label: "b.forrige.neste = b.neste; b.neste.forrige = b.forrige;" },
          { id: "q9_nulls", label: "b.neste = null; b.forrige = null;" },
          { id: "q9_if", label: "første == null" },
          { id: "q9_first", label: "første = b;" },
          { id: "q9_link", label: "b.forrige = siste; siste.neste = b;" },
          { id: "q9_last", label: "siste = b;" },
        ],
        dropZones: [
          { id: "q9_slot_1", label: "Plass 1", accepts: ["q9_unlink"] },
          { id: "q9_slot_2", label: "Plass 2", accepts: ["q9_nulls"] },
          { id: "q9_slot_3", label: "Plass 3", accepts: ["q9_if"] },
          { id: "q9_slot_4", label: "Plass 4", accepts: ["q9_first"] },
          { id: "q9_slot_5", label: "Plass 5", accepts: ["q9_link"] },
          { id: "q9_slot_6", label: "Plass 6", accepts: ["q9_last"] },
        ],
      },
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
    interactions: {
      3: {
        checkMode: "auto",
        instructions: "Dra riktig kodebit inn i hvert tomme felt.",
        draggableItems: [
          { id: "q3_import", label: "java.util.Scanner" },
          { id: "q3_try", label: "try" },
          { id: "q3_scanner", label: "Scanner" },
          { id: "q3_file", label: "File" },
          { id: "q3_name", label: "\"data.txt\"" },
          { id: "q3_catch", label: "catch" },
          { id: "q3_exit", label: "exit" },
          { id: "q3_line", label: "s.nextLine()" },
        ],
        dropZones: [
          { id: "q3_slot_1", label: "Plass 1", accepts: ["q3_import"] },
          { id: "q3_slot_2", label: "Plass 2", accepts: ["q3_try"] },
          { id: "q3_slot_3", label: "Plass 3", accepts: ["q3_scanner"] },
          { id: "q3_slot_4", label: "Plass 4", accepts: ["q3_file"] },
          { id: "q3_slot_5", label: "Plass 5", accepts: ["q3_name"] },
          { id: "q3_slot_6", label: "Plass 6", accepts: ["q3_catch"] },
          { id: "q3_slot_7", label: "Plass 7", accepts: ["q3_exit"] },
          { id: "q3_slot_8", label: "Plass 8", accepts: ["q3_line"] },
        ],
      },
      4: {
        checkMode: "auto",
        instructions: "Dra linjene til riktig plass for å skrive ut Voff-voff.",
        draggableItems: [
          { id: "q4_decl", label: "Hund h1, h2, h3" },
          { id: "q4_new1", label: "new Hund(\"Voff-voff\")" },
          { id: "q4_new2", label: "new Hund(\"Bjeff-bjeff\");" },
          { id: "q4_copy", label: "h3 = h2;" },
          { id: "q4_call", label: "h3.bjeff();" },
          { id: "q4_ctor", label: "voff = bjeff" },
          { id: "q4_print", label: "voff" },
        ],
        dropZones: [
          { id: "q4_slot_1", label: "Plass 1", accepts: ["q4_decl"] },
          { id: "q4_slot_2", label: "Plass 2", accepts: ["q4_new1"] },
          { id: "q4_slot_3", label: "Plass 3", accepts: ["q4_new2"] },
          { id: "q4_slot_4", label: "Plass 4", accepts: ["q4_copy"] },
          { id: "q4_slot_5", label: "Plass 5", accepts: ["q4_call"] },
          { id: "q4_slot_6", label: "Plass 6", accepts: ["q4_ctor"] },
          { id: "q4_slot_7", label: "Plass 7", accepts: ["q4_print"] },
        ],
      },
      9: {
        checkMode: "auto",
        instructions: "Sett inn alle ni kodebitene på riktig plass.",
        draggableItems: [
          { id: "q9_next", label: "Bil neste" },
          { id: "q9_fields", label: "Bil første, siste" },
          { id: "q9_params", label: "Bil ny, Bil erILista" },
          { id: "q9_empty", label: "første = ny; siste = ny;" },
          { id: "q9_always", label: "ny.neste = erILista" },
          { id: "q9_first_prev", label: "første.forrige = ny" },
          { id: "q9_first_new", label: "første = ny" },
          { id: "q9_mid_prev", label: "ny.forrige = erILista.forrige" },
          { id: "q9_link_back", label: "erILista.forrige = ny" },
        ],
        dropZones: [
          { id: "q9_slot_1", label: "Plass 1", accepts: ["q9_next"] },
          { id: "q9_slot_2", label: "Plass 2", accepts: ["q9_fields"] },
          { id: "q9_slot_3", label: "Plass 3", accepts: ["q9_params"] },
          { id: "q9_slot_4", label: "Plass 4", accepts: ["q9_empty"] },
          { id: "q9_slot_5", label: "Plass 5", accepts: ["q9_always"] },
          { id: "q9_slot_6", label: "Plass 6", accepts: ["q9_first_prev"] },
          { id: "q9_slot_7", label: "Plass 7", accepts: ["q9_first_new"] },
          { id: "q9_slot_8", label: "Plass 8", accepts: ["q9_mid_prev"] },
          { id: "q9_slot_9", label: "Plass 9", accepts: ["q9_link_back"] },
        ],
      },
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
      2: {
        checkMode: "auto",
        instructions: "Dra kodebitene på plass i enkeltlenket liste.",
        draggableItems: [
          { id: "q2_next", label: "Bil neste" },
          { id: "q2_last", label: "Bil siste = new Bil()" },
          { id: "q2_init", label: "første.neste = siste" },
          { id: "q2_param", label: "Bil ny" },
          { id: "q2_store", label: "ny.neste = erILista.neste" },
          { id: "q2_link", label: "erILista.neste = ny" },
        ],
        dropZones: [
          { id: "q2_slot_1", label: "Plass 1", accepts: ["q2_next"] },
          { id: "q2_slot_2", label: "Plass 2", accepts: ["q2_last"] },
          { id: "q2_slot_3", label: "Plass 3", accepts: ["q2_init"] },
          { id: "q2_slot_4", label: "Plass 4", accepts: ["q2_param"] },
          { id: "q2_slot_5", label: "Plass 5", accepts: ["q2_store"] },
          { id: "q2_slot_6", label: "Plass 6", accepts: ["q2_link"] },
        ],
      },
      5: {
        checkMode: "manual",
        instructions: "Skriv løsning i editoren og sammenlign med fasit med knappen over.",
        codeTemplate:
          "import java.util.*;\n\nclass Oppgave5 {\n  // Skriv metoden her\n}\n",
        solutionText: "Bruk Vis fasit for den offisielle løsningsvarianten.",
      },
      6: {
        checkMode: "auto",
        instructions: "Dra kodebitene til riktig plass i de to array-metodene.",
        draggableItems: [
          { id: "q6_name_void", label: "settInnIArray" },
          { id: "q6_if", label: "ix >= 0 && ix < a.length" },
          { id: "q6_set", label: "a[ix] = v" },
          { id: "q6_name_int", label: "hentFraArray" },
          { id: "q6_zero", label: "0" },
          { id: "q6_len", label: "a.length" },
          { id: "q6_high", label: "a[a.length-1]" },
          { id: "q6_mid", label: "a[ix]" },
        ],
        dropZones: [
          { id: "q6_slot_1", label: "Plass 1", accepts: ["q6_name_void"] },
          { id: "q6_slot_2", label: "Plass 2", accepts: ["q6_if"] },
          { id: "q6_slot_3", label: "Plass 3", accepts: ["q6_set"] },
          { id: "q6_slot_4", label: "Plass 4", accepts: ["q6_name_int"] },
          { id: "q6_slot_5", label: "Plass 5", accepts: ["q6_zero"] },
          { id: "q6_slot_6", label: "Plass 6", accepts: ["q6_len"] },
          { id: "q6_slot_7", label: "Plass 7", accepts: ["q6_high"] },
          { id: "q6_slot_8", label: "Plass 8", accepts: ["q6_mid"] },
        ],
      },
      7: {
        checkMode: "auto",
        instructions: "Fyll inn kodebitene i EnVeisBeholder.",
        draggableItems: [
          { id: "q7_next", label: "EnVeis neste" },
          { id: "q7_generic", label: "E extends EnVeis" },
          { id: "q7_fields", label: "private E første, siste" },
          { id: "q7_param", label: "E ny" },
          { id: "q7_empty_add", label: "første = ny; siste = ny;" },
          { id: "q7_nonempty_add", label: "siste.neste = ny; siste = ny;" },
          { id: "q7_empty_take", label: "return null;" },
          { id: "q7_clear", label: "første = null; siste = null;" },
          { id: "q7_shift", label: "første = (E) første.neste;" },
          { id: "q7_return", label: "return ut;" },
        ],
        dropZones: [
          { id: "q7_slot_1", label: "Plass 1", accepts: ["q7_next"] },
          { id: "q7_slot_2", label: "Plass 2", accepts: ["q7_generic"] },
          { id: "q7_slot_3", label: "Plass 3", accepts: ["q7_fields"] },
          { id: "q7_slot_4", label: "Plass 4", accepts: ["q7_param"] },
          { id: "q7_slot_5", label: "Plass 5", accepts: ["q7_empty_add"] },
          { id: "q7_slot_6", label: "Plass 6", accepts: ["q7_nonempty_add"] },
          { id: "q7_slot_7", label: "Plass 7", accepts: ["q7_empty_take"] },
          { id: "q7_slot_8", label: "Plass 8", accepts: ["q7_clear"] },
          { id: "q7_slot_9", label: "Plass 9", accepts: ["q7_shift"] },
          { id: "q7_slot_10", label: "Plass 10", accepts: ["q7_return"] },
        ],
      },
      9: {
        checkMode: "auto",
        instructions: "Dra kodebitene inn slik at programmet skriver ut de to riktige linjene.",
        draggableItems: [
          { id: "q9_verdi_ctor", label: "Verdi(String n) {navn = n;}" },
          { id: "q9_verdi_print", label: "skriv() {System.out.println(navn);}" },
          { id: "q9_ku_ctor", label: "Ku(String n) {super(n);}" },
          { id: "q9_fele_ctor", label: "Fele(String n) {super(n);}" },
          { id: "q9_field", label: "KanEies min" },
          { id: "q9_temp", label: "KanEies temp = min" },
          { id: "q9_swap_1", label: "min = andre.min" },
          { id: "q9_swap_2", label: "andre.min = temp" },
          { id: "q9_init", label: "min = start" },
          { id: "q9_print", label: "min.skriv()" },
        ],
        dropZones: [
          { id: "q9_slot_1", label: "Plass 1", accepts: ["q9_verdi_ctor"] },
          { id: "q9_slot_2", label: "Plass 2", accepts: ["q9_verdi_print"] },
          { id: "q9_slot_3", label: "Plass 3", accepts: ["q9_ku_ctor"] },
          { id: "q9_slot_4", label: "Plass 4", accepts: ["q9_fele_ctor"] },
          { id: "q9_slot_5", label: "Plass 5", accepts: ["q9_field"] },
          { id: "q9_slot_6", label: "Plass 6", accepts: ["q9_temp"] },
          { id: "q9_slot_7", label: "Plass 7", accepts: ["q9_swap_1"] },
          { id: "q9_slot_8", label: "Plass 8", accepts: ["q9_swap_2"] },
          { id: "q9_slot_9", label: "Plass 9", accepts: ["q9_init"] },
          { id: "q9_slot_10", label: "Plass 10", accepts: ["q9_print"] },
        ],
      },
      11: {
        checkMode: "auto",
        instructions: "Fyll inn iterator-koden for baklengs gjennomgang.",
        draggableItems: [
          { id: "q11_iterable", label: "Iterable <String>" },
          { id: "q11_signature", label: "Iterator <String> iterator" },
          { id: "q11_new_iter", label: "new LagerIterator ()" },
          { id: "q11_inner", label: "Iterator <String>" },
          { id: "q11_start_ix", label: "innhold.length - 1" },
          { id: "q11_has_next", label: "ix >= 0" },
          { id: "q11_get", label: "innhold[ix]" },
          { id: "q11_dec", label: "ix = ix - 1" },
        ],
        dropZones: [
          { id: "q11_slot_1", label: "Plass 1", accepts: ["q11_iterable"] },
          { id: "q11_slot_2", label: "Plass 2", accepts: ["q11_signature"] },
          { id: "q11_slot_3", label: "Plass 3", accepts: ["q11_new_iter"] },
          { id: "q11_slot_4", label: "Plass 4", accepts: ["q11_inner"] },
          { id: "q11_slot_5", label: "Plass 5", accepts: ["q11_start_ix"] },
          { id: "q11_slot_6", label: "Plass 6", accepts: ["q11_has_next"] },
          { id: "q11_slot_7", label: "Plass 7", accepts: ["q11_get"] },
          { id: "q11_slot_8", label: "Plass 8", accepts: ["q11_dec"] },
        ],
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
