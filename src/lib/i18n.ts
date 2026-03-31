import type { ExamId, QuestionType } from "@/lib/exam-types";

export type Locale = "nb" | "en";

export const DEFAULT_LOCALE: Locale = "nb";
export const LOCALE_STORAGE_KEY = "in1010:locale";
export const LOCALE_COOKIE_NAME = "in1010-locale";

export const isLocale = (value: string | null | undefined): value is Locale =>
  value === "nb" || value === "en";

export const resolveLocale = (value: string | null | undefined): Locale =>
  isLocale(value) ? value : DEFAULT_LOCALE;

export const getLocaleTag = (locale: Locale) => (locale === "en" ? "en-US" : "nb-NO");
export const getHtmlLang = (locale: Locale) => (locale === "en" ? "en" : "nb");

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

export const getSiteTitle = () => "IN1010 Interactive";

export const getSiteDescription = (locale: Locale) =>
  locale === "en"
    ? "Interactive practice for IN1010 midterm exams with answer toggles, per-user progress, and realistic exam simulation."
    : "Interaktiv øving for IN1010 midtveiseksamener med fasit-toggle, brukerlagret progresjon og realistisk eksamenssimulering.";

export const getHomeTitle = (locale: Locale) =>
  locale === "en" ? "IN1010 Interactive | Midterm Practice" : "IN1010 Interactive | Midtveisøving";

export const getExamTitle = (examId: ExamId, locale: Locale) =>
  `${formatExamTitle(examId, locale)} | ${getSiteTitle()}`;

export const getExamDescription = (examId: ExamId, locale: Locale) =>
  locale === "en"
    ? `Practice ${formatExamTitle(examId, locale)} with interactive questions, answer-key toggle, notes, and timer.`
    : `Øv på ${formatExamTitle(examId, locale)} med interaktive oppgaver, fasit-toggle, notater og timer.`;

export const getQuestionPageTitle = (
  examId: ExamId,
  questionNumber: number,
  questionTitle: string,
  locale: Locale
) => `${formatQuestionHeading(questionNumber, questionTitle, locale)} | ${formatExamTitle(examId, locale)}`;

export const getQuestionPageDescription = (
  examId: ExamId,
  questionNumber: number,
  locale: Locale
) =>
  locale === "en"
    ? `Work on question ${questionNumber} in ${formatExamTitle(examId, locale)} with notes, answer toggle, and interactive inputs.`
    : `Arbeid med oppgave ${questionNumber} i ${formatExamTitle(examId, locale)} med notater, fasit-toggle og interaktive felter.`;
