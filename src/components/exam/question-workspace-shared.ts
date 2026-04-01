import type { ChoiceZone } from "@/lib/exam-types";

export type ChoiceMarkKind = "text" | "circle";

export type ChoiceMark = {
  id: string;
  pageIndex: number;
  kind: ChoiceMarkKind;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  checked: boolean;
};

export type ChoiceZoneValues = Record<string, string | boolean>;

export type ValidationStatus = "correct" | "wrong" | "empty";

export const buildDefaultChoiceZoneValues = (zones: ChoiceZone[]) =>
  zones.reduce<ChoiceZoneValues>((acc, zone) => {
    acc[zone.id] = zone.kind === "text" ? "" : false;
    return acc;
  }, {});

export const isNumericChoiceZone = (zone: ChoiceZone) => {
  const answers = [zone.answer, ...(zone.answers ?? [])].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0
  );

  return answers.length > 0 && answers.every((value) => /^-?\d+$/.test(value.trim()));
};

export const moveCaretToEnd = (input: HTMLInputElement) => {
  const end = input.value.length;
  window.requestAnimationFrame(() => {
    try {
      input.focus();
      input.setSelectionRange(end, end);
      input.scrollLeft = input.scrollWidth;
    } catch {
      // Some mobile browsers can reject selection updates on certain input states.
    }
  });
};
