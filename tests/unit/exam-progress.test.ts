import { describe, expect, it } from "vitest";

import {
  EXAM_DURATION_MS,
  formatDuration,
  gradeFromPoints,
  resolveExamTimerState,
} from "@/lib/exam-progress";

describe("exam progress helpers", () => {
  it("maps grade thresholds correctly", () => {
    expect(gradeFromPoints(85)).toBe("A");
    expect(gradeFromPoints(75)).toBe("B");
    expect(gradeFromPoints(55)).toBe("C");
    expect(gradeFromPoints(45)).toBe("D");
    expect(gradeFromPoints(30)).toBe("E");
    expect(gradeFromPoints(29.9)).toBe("F");
  });

  it("formats timer values as hh:mm:ss", () => {
    expect(formatDuration(EXAM_DURATION_MS)).toBe("02:00:00");
    expect(formatDuration(65_000)).toBe("00:01:05");
  });

  it("marks a running timer as finished when the deadline passes", () => {
    const startedAt = "2026-03-31T10:00:00.000Z";
    const endsAt = "2026-03-31T12:00:00.000Z";

    const timer = resolveExamTimerState(
      {
        status: "running",
        durationMs: EXAM_DURATION_MS,
        remainingMs: EXAM_DURATION_MS,
        startedAt,
        endsAt,
        finishedAt: null,
      },
      new Date("2026-03-31T12:00:01.000Z").getTime()
    );

    expect(timer.status).toBe("finished");
    expect(timer.remainingMs).toBe(0);
    expect(timer.endsAt).toBeNull();
    expect(timer.finishedAt).toBeTruthy();
  });
});
