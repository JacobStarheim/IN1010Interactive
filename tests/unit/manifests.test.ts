import { describe, expect, it } from "vitest";

import { examList } from "@/data/exams";

describe("exam manifests", () => {
  it("contains all 5 exam sets and exactly 47 questions", () => {
    expect(examList).toHaveLength(5);
    const total = examList.reduce((sum, exam) => sum + exam.questions.length, 0);
    expect(total).toBe(47);
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
});
