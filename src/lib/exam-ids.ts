import type { ExamId } from "@/lib/exam-types";

export const EXAM_IDS: ExamId[] = [
  "v24-midtveis",
  "v24-konte",
  "v24-prove",
  "v25-midtveis",
  "v25-konte",
];

export function isExamId(value: string): value is ExamId {
  return EXAM_IDS.includes(value as ExamId);
}
