import type { ChoiceOption, DropZone } from "@/lib/exam-types";

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
