import { describe, expect, it } from "vitest";

import { examList } from "@/data/exams";

describe("exam manifests", () => {
  it("contains all 7 exam sets and exactly 67 questions", () => {
    expect(examList).toHaveLength(7);
    const total = examList.reduce((sum, exam) => sum + exam.questions.length, 0);
    expect(total).toBe(67);
  });

  it("ensures every question has prompt and solution pages", () => {
    for (const exam of examList) {
      for (const question of exam.questions) {
        expect(question.promptPages.length).toBeGreaterThan(0);
        expect(question.solutionPages.length).toBeGreaterThan(0);
      }
    }
  });

  it("has mapped 2025 konte question ids in full range", () => {
    const konte = examList.find((exam) => exam.id === "v25-konte");
    expect(konte).toBeTruthy();
    expect(konte?.questionOrder).toEqual([
      "q01",
      "q02",
      "q03",
      "q04",
      "q05",
      "q06",
      "q07",
      "q08",
      "q09",
      "q10",
      "q11",
    ]);
  });

  it("has mapped 2026 exam question ids in full range", () => {
    const midtveis2026 = examList.find((exam) => exam.id === "v26-midtveis");
    const prove2026 = examList.find((exam) => exam.id === "v26-prove");

    expect(midtveis2026?.questionOrder).toEqual([
      "q01",
      "q02",
      "q03",
      "q04",
      "q05",
      "q06",
      "q07",
      "q08",
      "q09",
      "q10",
    ]);

    expect(prove2026?.questionOrder).toEqual([
      "q01",
      "q02",
      "q03",
      "q04",
      "q05",
      "q06",
      "q07",
      "q08",
      "q09",
      "q10",
    ]);
  });
});
