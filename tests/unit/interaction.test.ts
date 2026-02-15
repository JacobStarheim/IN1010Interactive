import { describe, expect, it } from "vitest";

import {
  evaluateChoiceSelection,
  evaluateDragAssignments,
} from "@/lib/interaction";

describe("evaluateChoiceSelection", () => {
  const options = [
    { id: "a", label: "A", correct: true },
    { id: "b", label: "B", correct: false },
    { id: "c", label: "C", correct: true },
  ];

  it("returns perfect result for exact correct set", () => {
    const result = evaluateChoiceSelection(["a", "c"], options);
    expect(result.isPerfect).toBe(true);
    expect(result.correct).toBe(2);
    expect(result.missing).toEqual([]);
    expect(result.incorrect).toEqual([]);
  });

  it("reports missing and incorrect choices", () => {
    const result = evaluateChoiceSelection(["a", "b"], options);
    expect(result.isPerfect).toBe(false);
    expect(result.correct).toBe(1);
    expect(result.missing).toEqual(["c"]);
    expect(result.incorrect).toEqual(["b"]);
  });
});

describe("evaluateDragAssignments", () => {
  const zones = [
    { id: "s1", label: "Slot 1", accepts: ["a"] },
    { id: "s2", label: "Slot 2", accepts: ["b"] },
    { id: "s3", label: "Slot 3", accepts: ["c"] },
  ];

  it("returns perfect result when all slots are correct", () => {
    const result = evaluateDragAssignments(
      { s1: "a", s2: "b", s3: "c" },
      zones
    );

    expect(result.isPerfect).toBe(true);
    expect(result.correct).toBe(3);
    expect(result.wrong).toEqual([]);
    expect(result.empty).toEqual([]);
  });

  it("reports wrong and empty slots", () => {
    const result = evaluateDragAssignments(
      { s1: "a", s2: "x", s3: null },
      zones
    );

    expect(result.isPerfect).toBe(false);
    expect(result.correct).toBe(1);
    expect(result.wrong).toEqual(["s2"]);
    expect(result.empty).toEqual(["s3"]);
  });
});
