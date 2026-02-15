import Link from "next/link";

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

      <section className={`card ${styles.grid}`}>
        {examList.map((exam) => (
          <Link key={exam.id} href={`/eksamen/${exam.id}`} className={styles.examCard}>
            <h2>{exam.title}</h2>
            <p>
              {exam.questions.length} oppgaver · {exam.sourcePromptPdf}
            </p>
            <span className={styles.open}>Åpne eksamen</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
