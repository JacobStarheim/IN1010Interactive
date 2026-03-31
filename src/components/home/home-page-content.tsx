"use client";

import styles from "@/app/page.module.css";
import { ExamOverviewGrid } from "@/components/home/exam-overview-grid";
import { useLocale } from "@/components/i18n/locale-provider";
import { examList } from "@/data/exams";

export function HomePageContent() {
  const { locale } = useLocale();
  const isEnglish = locale === "en";

  return (
    <main className="site-shell">
      <section className="card">
        <h1>IN1010 Interactive</h1>
        <p>
          {isEnglish
            ? "Practice every available IN1010 midterm set with the original exam visuals, per-question answer toggles, and interactive solving tools."
            : "Øv på alle tilgjengelige midtveissett med original oppgavevisning, per-oppgave fasit-toggle og interaktive øvingspaneler."}
        </p>
      </section>

      <ExamOverviewGrid exams={examList} />

      <section className={`card ${styles.openSource}`}>
        <p>
          {isEnglish
            ? "This project is open source. Want to contribute or become a contributor?"
            : "Dette prosjektet er åpen kildekode. Vil du bidra eller bli contributor?"}
        </p>
        <a
          href="https://github.com/JacobStarheim/IN1010Interactive"
          target="_blank"
          rel="noreferrer"
          className={styles.openSourceLink}
        >
          {isEnglish ? "GitHub repo: IN1010Interactive" : "GitHub-repo: IN1010Interactive"}
        </a>
      </section>
    </main>
  );
}
