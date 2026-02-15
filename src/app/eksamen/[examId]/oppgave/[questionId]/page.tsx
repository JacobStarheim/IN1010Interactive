import Link from "next/link";
import { notFound } from "next/navigation";

import { examList, getExamById, getQuestionById } from "@/data/exams";
import { QuestionWorkspace } from "@/components/exam/question-workspace";
import { isExamId } from "@/lib/exam-ids";

type Props = {
  params: Promise<{ examId: string; questionId: string }>;
};

export default async function QuestionPage({ params }: Props) {
  const { examId, questionId } = await params;
  if (!isExamId(examId)) {
    notFound();
  }

  const exam = getExamById(examId);
  const question = exam.questions.find((item) => item.id === questionId);
  if (!question) {
    notFound();
  }

  const currentIndex = exam.questionOrder.indexOf(question.id);
  const prevId = currentIndex > 0 ? exam.questionOrder[currentIndex - 1] : null;
  const nextId =
    currentIndex >= 0 && currentIndex < exam.questionOrder.length - 1
      ? exam.questionOrder[currentIndex + 1]
      : null;

  return (
    <main className="site-shell">
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <Link href="/" className="top-link">
          Eksamensoversikt
        </Link>
        <Link href={`/eksamen/${examId}`} className="top-link">
          Til {exam.title}
        </Link>
        {prevId ? (
          <Link href={`/eksamen/${examId}/oppgave/${prevId}`} className="top-link">
            Forrige oppgave
          </Link>
        ) : null}
        {nextId ? (
          <Link href={`/eksamen/${examId}/oppgave/${nextId}`} className="top-link">
            Neste oppgave
          </Link>
        ) : null}
      </div>

      <section className="card">
        <QuestionWorkspace examId={examId} question={getQuestionById(examId, questionId)} />
      </section>
    </main>
  );
}

export function generateStaticParams() {
  const params: { examId: string; questionId: string }[] = [];

  for (const exam of examList) {
    for (const questionId of exam.questionOrder) {
      params.push({ examId: exam.id, questionId });
    }
  }

  return params;
}
