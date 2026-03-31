import { ExamOverviewGrid } from "@/components/home/exam-overview-grid";
import { examList } from "@/data/exams";
import styles from "@/app/page.module.css";

export default function HomePage() {
  return (
    <main className="site-shell">
      <section className="card">
        <h1>IN1010 Interactive</h1>
        <p>
          Øv på alle tilgjengelige midtveissett med original oppgavevisning, per-oppgave
          fasit-toggle og interaktive øvingspaneler.
        </p>
      </section>

      <ExamOverviewGrid exams={examList} />

      <section className={`card ${styles.openSource}`}>
        <p>
          Dette prosjektet er åpen kildekode. Vil du bidra eller bli contributor?
        </p>
        <a
          href="https://github.com/JacobStarheim/IN1010Interactive"
          target="_blank"
          rel="noreferrer"
          className={styles.openSourceLink}
        >
          GitHub-repo: IN1010Interactive
        </a>
      </section>
    </main>
  );
}
