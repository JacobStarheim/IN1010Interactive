import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { examList, getExamById } from "@/data/exams";
import { ExamPageShell } from "@/components/exam/exam-page-shell";
import { isExamId } from "@/lib/exam-ids";
import {
  getExamDescription,
  getExamTitle,
  LOCALE_COOKIE_NAME,
  resolveLocale,
} from "@/lib/i18n";

type Props = {
  params: Promise<{ examId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { examId } = await params;
  if (!isExamId(examId)) {
    return {};
  }

  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);

  return {
    title: getExamTitle(examId, locale),
    description: getExamDescription(examId, locale),
  };
}

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
