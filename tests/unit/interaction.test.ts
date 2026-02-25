import { describe, expect, it } from "vitest";

import {
  evaluateChoiceSelection,
  evaluateChoiceZones,
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

describe("evaluateChoiceZones", () => {
  it("evaluates grouped circle zones", () => {
    const zones = [
      { id: "r1-a", kind: "circle", group: "r1", rect: { x: 0, y: 0, w: 0, h: 0 }, correct: true },
      { id: "r1-b", kind: "circle", group: "r1", rect: { x: 0, y: 0, w: 0, h: 0 }, correct: false },
      { id: "r2-a", kind: "circle", group: "r2", rect: { x: 0, y: 0, w: 0, h: 0 }, correct: false },
      { id: "r2-b", kind: "circle", group: "r2", rect: { x: 0, y: 0, w: 0, h: 0 }, correct: true },
    ] as const;

    const result = evaluateChoiceZones(
      {
        "r1-a": true,
        "r1-b": false,
        "r2-a": true,
        "r2-b": false,
      },
      [...zones]
    );

    expect(result.total).toBe(2);
    expect(result.correct).toBe(1);
    expect(result.missing).toBe(0);
    expect(result.wrong).toBe(1);
    expect(result.isPerfect).toBe(false);
  });

  it("evaluates standalone checkboxes and text answers", () => {
    const zones = [
      { id: "z1", kind: "box", rect: { x: 0, y: 0, w: 0, h: 0 }, correct: true },
      { id: "z2", kind: "box", rect: { x: 0, y: 0, w: 0, h: 0 }, correct: false },
      { id: "z3", kind: "text", rect: { x: 0, y: 0, w: 0, h: 0 }, answer: "13" },
      { id: "z4", kind: "text", rect: { x: 0, y: 0, w: 0, h: 0 }, answers: ["DL23145", "DL231"] },
    ] as const;

    const result = evaluateChoiceZones(
      {
        z1: true,
        z2: false,
        z3: "(13)",
        z4: "dl231",
      },
      [...zones]
    );

    expect(result.total).toBe(4);
    expect(result.correct).toBe(4);
    expect(result.missing).toBe(0);
    expect(result.wrong).toBe(0);
    expect(result.isPerfect).toBe(true);
  });
});
