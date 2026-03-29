import type { ExamManifest, ExamId } from "@/lib/exam-types";

import v24Midtveis from "./v24-midtveis.json";
import v24Konte from "./v24-konte.json";
import v24Prove from "./v24-prove.json";
import v25Midtveis from "./v25-midtveis.json";
import v25Konte from "./v25-konte.json";
import v26Midtveis from "./v26-midtveis.json";
import v26Prove from "./v26-prove.json";

const manifests: Record<ExamId, ExamManifest> = {
  "v24-midtveis": v24Midtveis as ExamManifest,
  "v24-konte": v24Konte as ExamManifest,
  "v24-prove": v24Prove as ExamManifest,
  "v25-midtveis": v25Midtveis as ExamManifest,
  "v25-konte": v25Konte as ExamManifest,
  "v26-midtveis": v26Midtveis as ExamManifest,
  "v26-prove": v26Prove as ExamManifest,
};

export const examList = Object.values(manifests);

export function getExamById(examId: ExamId): ExamManifest {
  const exam = manifests[examId];
  if (!exam) {
    throw new Error(`Unknown exam id: ${examId}`);
  }
  return exam;
}

export function getQuestionById(examId: ExamId, questionId: string) {
  const exam = getExamById(examId);
  const question = exam.questions.find((q) => q.id === questionId);
  if (!question) {
    throw new Error(`Unknown question id ${questionId} for exam ${examId}`);
  }

  return question;
}
