import type { ExamId } from "@/lib/exam-types";

export type Grade = "A" | "B" | "C" | "D" | "E" | "F";

export type SubmissionResult = {
  submittedAt: string;
  gradedQuestions: number;
  totalCorrect: number;
  totalPossible: number;
  points100: number;
  grade: Grade;
};

export type ExamTimerStatus = "idle" | "running" | "paused" | "finished";

export type ExamTimerState = {
  status: ExamTimerStatus;
  durationMs: number;
  remainingMs: number;
  startedAt: string | null;
  endsAt: string | null;
  finishedAt: string | null;
};

export const EXAM_DURATION_MS = 2 * 60 * 60 * 1000;

export const storageKey = (kind: string, examId: string, questionId: string) =>
  `in1010:${kind}:${examId}:${questionId}`;

export const submissionStorageKey = (examId: ExamId) => `in1010:submission:${examId}`;

export const timerStorageKey = (examId: ExamId) => `in1010:timer:${examId}`;

export const getBrowserStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }
  const storage = window.localStorage;
  if (!storage || typeof storage.getItem !== "function") {
    return null;
  }
  return storage;
};

export const readJson = <T,>(storage: Storage, key: string, fallback: T): T => {
  const raw = storage.getItem(key);
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const gradeFromPoints = (points100: number): Grade => {
  if (points100 >= 85) return "A";
  if (points100 >= 75) return "B";
  if (points100 >= 55) return "C";
  if (points100 >= 45) return "D";
  if (points100 >= 30) return "E";
  return "F";
};

export const defaultExamTimerState = (): ExamTimerState => ({
  status: "idle",
  durationMs: EXAM_DURATION_MS,
  remainingMs: EXAM_DURATION_MS,
  startedAt: null,
  endsAt: null,
  finishedAt: null,
});

export const formatDuration = (ms: number) => {
  const safeMs = Math.max(0, Math.floor(ms));
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
};

export const normalizeExamTimerState = (
  value: Partial<ExamTimerState> | null | undefined
): ExamTimerState => {
  const fallback = defaultExamTimerState();
  if (!value) {
    return fallback;
  }

  const status =
    value.status === "running" ||
    value.status === "paused" ||
    value.status === "finished" ||
    value.status === "idle"
      ? value.status
      : fallback.status;

  const durationMs =
    typeof value.durationMs === "number" && Number.isFinite(value.durationMs) && value.durationMs > 0
      ? value.durationMs
      : fallback.durationMs;

  const remainingMs =
    typeof value.remainingMs === "number" && Number.isFinite(value.remainingMs)
      ? Math.max(0, value.remainingMs)
      : durationMs;

  return {
    status,
    durationMs,
    remainingMs,
    startedAt: typeof value.startedAt === "string" ? value.startedAt : null,
    endsAt: typeof value.endsAt === "string" ? value.endsAt : null,
    finishedAt: typeof value.finishedAt === "string" ? value.finishedAt : null,
  };
};

export const resolveExamTimerState = (
  value: Partial<ExamTimerState> | null | undefined,
  nowMs = Date.now()
): ExamTimerState => {
  const timer = normalizeExamTimerState(value);
  if (timer.status !== "running" || !timer.endsAt) {
    return timer;
  }

  const remainingMs = Math.max(0, new Date(timer.endsAt).getTime() - nowMs);
  if (remainingMs > 0) {
    return {
      ...timer,
      remainingMs,
    };
  }

  return {
    ...timer,
    status: "finished",
    remainingMs: 0,
    endsAt: null,
    finishedAt: timer.finishedAt ?? new Date(nowMs).toISOString(),
  };
};
