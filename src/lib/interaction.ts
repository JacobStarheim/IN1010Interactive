import type { ChoiceOption, ChoiceZone, DropZone } from "@/lib/exam-types";

export type ChoiceCheckResult = {
  total: number;
  correct: number;
  missing: string[];
  incorrect: string[];
  isPerfect: boolean;
};

export function evaluateChoiceSelection(
  selectedIds: string[],
  options: ChoiceOption[]
): ChoiceCheckResult {
  const selected = new Set(selectedIds);
  const correctIds = options.filter((opt) => opt.correct).map((opt) => opt.id);
  const correctSet = new Set(correctIds);

  const missing = correctIds.filter((id) => !selected.has(id));
  const incorrect = selectedIds.filter((id) => !correctSet.has(id));
  const correct = correctIds.length - missing.length;

  return {
    total: correctIds.length,
    correct,
    missing,
    incorrect,
    isPerfect: missing.length === 0 && incorrect.length === 0,
  };
}

export type ChoiceZoneValues = Record<string, string | boolean>;

export type ChoiceZoneCheckResult = {
  total: number;
  correct: number;
  missing: number;
  wrong: number;
  isPerfect: boolean;
};

const normalizeTextAnswer = (value: string) =>
  value.trim().toLowerCase().replace(/[()]/g, "").replace(/\s+/g, "");

export function evaluateChoiceZones(
  values: ChoiceZoneValues,
  choiceZones: ChoiceZone[]
): ChoiceZoneCheckResult {
  const byId = Object.fromEntries(choiceZones.map((zone) => [zone.id, zone]));
  const groups: Record<string, string[]> = {};

  choiceZones.forEach((zone) => {
    if (!zone.group) {
      return;
    }
    if (!groups[zone.group]) {
      groups[zone.group] = [];
    }
    groups[zone.group].push(zone.id);
  });

  let total = 0;
  let correct = 0;
  let missing = 0;
  let wrong = 0;

  Object.values(groups).forEach((zoneIds) => {
    const expected = zoneIds.find((zoneId) => byId[zoneId]?.correct === true);
    if (!expected) {
      return;
    }

    total += 1;
    const selected = zoneIds.filter((zoneId) => Boolean(values[zoneId]));

    if (selected.length === 0) {
      missing += 1;
      return;
    }

    if (selected.length === 1 && selected[0] === expected) {
      correct += 1;
      return;
    }

    wrong += 1;
  });

  choiceZones
    .filter((zone) => zone.kind !== "text" && !zone.group && typeof zone.correct === "boolean")
    .forEach((zone) => {
      total += 1;
      const selected = Boolean(values[zone.id]);
      const expected = Boolean(zone.correct);

      if (!selected && expected) {
        missing += 1;
        return;
      }

      if (selected === expected) {
        correct += 1;
        return;
      }

      wrong += 1;
    });

  choiceZones
    .filter(
      (zone) =>
        zone.kind === "text" &&
        (typeof zone.answer === "string" || (zone.answers?.length ?? 0) > 0)
    )
    .forEach((zone) => {
      total += 1;
      const raw = String(values[zone.id] ?? "").trim();
      if (raw.length === 0) {
        missing += 1;
        return;
      }

      const expectedRaw = [
        typeof zone.answer === "string" ? zone.answer : null,
        ...(zone.answers ?? []),
      ].filter((answer): answer is string => Boolean(answer));

      const expectedSet = new Set(expectedRaw.map(normalizeTextAnswer));
      if (expectedSet.has(normalizeTextAnswer(raw))) {
        correct += 1;
        return;
      }

      wrong += 1;
    });

  return {
    total,
    correct,
    missing,
    wrong,
    isPerfect: total > 0 && correct === total,
  };
}

export type DragAssignments = Record<string, string | null>;

export type DragCheckResult = {
  total: number;
  correct: number;
  wrong: string[];
  empty: string[];
  isPerfect: boolean;
};

export function evaluateDragAssignments(
  assignments: DragAssignments,
  dropZones: DropZone[]
): DragCheckResult {
  const wrong: string[] = [];
  const empty: string[] = [];

  dropZones.forEach((zone) => {
    const itemId = assignments[zone.id];
    if (!itemId) {
      empty.push(zone.id);
      return;
    }

    if (!zone.accepts.includes(itemId)) {
      wrong.push(zone.id);
    }
  });

  const total = dropZones.length;
  const correct = total - wrong.length - empty.length;

  return {
    total,
    correct,
    wrong,
    empty,
    isPerfect: wrong.length === 0 && empty.length === 0,
  };
}
