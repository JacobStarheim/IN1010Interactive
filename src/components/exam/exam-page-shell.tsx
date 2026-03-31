"use client";

import Link from "next/link";

import { ExamSession } from "@/components/exam/exam-session";
import { useLocale } from "@/components/i18n/locale-provider";
import type { ExamManifest } from "@/lib/exam-types";
import { formatExamTitle } from "@/lib/i18n";
import styles from "@/app/eksamen/[examId]/page.module.css";

export function ExamPageShell({ exam }: { exam: ExamManifest }) {
  const { locale } = useLocale();
  const isEnglish = locale === "en";

  return (
    <main className="site-shell">
      <Link href="/" className="top-link">
        {isEnglish ? "Back to exam overview" : "Tilbake til eksamensoversikt"}
      </Link>

      <section className="card">
        <h1>{formatExamTitle(exam.id, locale)}</h1>
        <p>
          {isEnglish ? "Question set:" : "Oppgavesett:"} <code>{exam.sourcePromptPdf}</code> ·{" "}
          {isEnglish ? "Answer key:" : "Fasit:"} <code>{exam.sourceSolutionPdf}</code>
        </p>
        <p className={styles.info}>
          {isEnglish
            ? "All questions are shown below in chronological order. You can scroll or jump directly."
            : "Alle oppgavene vises under i kronologisk rekkefølge. Du kan scrolle eller hoppe direkte."}
        </p>
      </section>

      <ExamSession exam={exam} />
    </main>
  );
}
