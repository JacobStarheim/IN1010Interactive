import { notFound } from "next/navigation";

import { examList, getExamById } from "@/data/exams";
import { ExamPageShell } from "@/components/exam/exam-page-shell";
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

  return <ExamPageShell exam={exam} />;
}

export function generateStaticParams() {
  return examList.map((exam) => ({ examId: exam.id }));
}
