import Link from "next/link";
import { notFound } from "next/navigation";

import { examList, getExamById } from "@/data/exams";
import { QuestionWorkspace } from "@/components/exam/question-workspace";
import { isExamId } from "@/lib/exam-ids";
import styles from "./page.module.css";

type Props = {
  params: Promise<{ examId: string }>;
};

export default async function ExamPage({ params }: Props) {
  const { examId } = await params;
  if (!isExamId(examId)) {
    notFound();
  }

  const exam = getExamById(examId);

  return (
    <main className="site-shell">
      <Link href="/" className="top-link">
        Tilbake til eksamensoversikt
      </Link>

      <section className="card">
        <h1>{exam.title}</h1>
        <p>
          Oppgavesett: <code>{exam.sourcePromptPdf}</code> · Fasit: <code>{exam.sourceSolutionPdf}</code>
        </p>
        <p className={styles.info}>
          Alle oppgavene vises under i kronologisk rekkefølge. Du kan scrolle eller hoppe direkte.
        </p>
      </section>

      <section className={`card ${styles.jumpCard}`}>
        {exam.questions.map((question) => (
          <a key={question.id} href={`#${question.id}`} className={styles.jumpLink}>
            Oppgave {question.number}
          </a>
        ))}
      </section>

      <div className={styles.stack}>
        {exam.questions.map((question) => (
          <section key={question.id} id={question.id} className="card">
            <QuestionWorkspace examId={exam.id} question={question} />
            <div className={styles.onlyLinkWrap}>
              <Link href={`/eksamen/${exam.id}/oppgave/${question.id}`} className="top-link">
                Åpne kun denne oppgaven
              </Link>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

export function generateStaticParams() {
  return examList.map((exam) => ({ examId: exam.id }));
}
