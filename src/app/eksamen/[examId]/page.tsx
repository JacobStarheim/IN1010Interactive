import Link from "next/link";
import { notFound } from "next/navigation";

import { examList, getExamById } from "@/data/exams";
import { ExamQuestionList } from "@/components/exam/exam-question-list";
import { isExamId } from "@/lib/exam-ids";

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
      </section>

      <section className="card">
        <ExamQuestionList examId={exam.id} questions={exam.questions} />
      </section>
    </main>
  );
}

export function generateStaticParams() {
  return examList.map((exam) => ({ examId: exam.id }));
}
