import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { examList, getExamById, getQuestionById } from "@/data/exams";
import { QuestionWorkspace } from "@/components/exam/question-workspace";
import { isExamId } from "@/lib/exam-ids";
import {
  formatExamTitle,
  getQuestionPageDescription,
  getQuestionPageTitle,
  LOCALE_COOKIE_NAME,
  resolveLocale,
} from "@/lib/i18n";

type Props = {
  params: Promise<{ examId: string; questionId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { examId, questionId } = await params;
  if (!isExamId(examId)) {
    return {};
  }

  const exam = getExamById(examId);
  const question = exam.questions.find((item) => item.id === questionId);
  if (!question) {
    return {};
  }

  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);

  return {
    title: getQuestionPageTitle(exam.id, question.number, question.title, locale),
    description: getQuestionPageDescription(exam.id, question.number, locale),
  };
}

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
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
  const isEnglish = locale === "en";

  return (
    <main className="site-shell">
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <Link href="/" className="top-link">
          {isEnglish ? "Exam overview" : "Eksamensoversikt"}
        </Link>
        <Link href={`/eksamen/${examId}`} className="top-link">
          {isEnglish ? "To" : "Til"} {formatExamTitle(exam.id, locale)}
        </Link>
        {prevId ? (
          <Link href={`/eksamen/${examId}/oppgave/${prevId}`} className="top-link">
            {isEnglish ? "Previous question" : "Forrige oppgave"}
          </Link>
        ) : null}
        {nextId ? (
          <Link href={`/eksamen/${examId}/oppgave/${nextId}`} className="top-link">
            {isEnglish ? "Next question" : "Neste oppgave"}
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
