"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  buildDefaultChoiceZoneValues,
  type ChoiceMark,
  type ChoiceZoneValues,
  type ValidationStatus,
} from "@/components/exam/question-workspace-shared";
import type { ChoiceOption, ChoiceZone, DragItem, DropZone } from "@/lib/exam-types";
import type { DragAssignments } from "@/lib/interaction";

type Args = {
  examId: string;
  questionId: string;
  codeTemplate: string;
  options: ChoiceOption[];
  dropZones: DropZone[];
  draggableItems: DragItem[];
  choiceZones: ChoiceZone[];
  resetToken: number;
};

const storageKey = (kind: string, examId: string, questionId: string) =>
  `in1010:${kind}:${examId}:${questionId}`;

const getStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const storage = window.localStorage;
  if (!storage || typeof storage.getItem !== "function") {
    return null;
  }

  return storage;
};

const defaultNotesOpenForViewport = () => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return true;
  }
  return !window.matchMedia("(max-width: 1080px)").matches;
};

const sanitizeChoiceMarks = (raw: ChoiceMark[]) => {
  const sanitized = raw.filter((mark) => {
    const validKind = mark.kind === "text" || mark.kind === "circle";
    const validNumbers =
      Number.isFinite(mark.pageIndex) &&
      Number.isFinite(mark.x) &&
      Number.isFinite(mark.y) &&
      Number.isFinite(mark.w) &&
      Number.isFinite(mark.h);

    return Boolean(mark.id) && validKind && validNumbers;
  });

  const maxId = sanitized.reduce((max, mark) => {
    const numeric = Number(mark.id.replace("mark-", ""));
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
  }, 0);

  return { sanitized, maxId };
};

const sanitizeValidationStatusMap = (
  raw: unknown,
  validIds: Set<string>
): Record<string, ValidationStatus> => {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const result: Record<string, ValidationStatus> = {};
  Object.entries(raw as Record<string, unknown>).forEach(([id, value]) => {
    if (!validIds.has(id)) {
      return;
    }

    if (value === "correct" || value === "wrong" || value === "empty") {
      result[id] = value;
    }
  });

  return result;
};

export function useQuestionWorkspaceState({
  examId,
  questionId,
  codeTemplate,
  options,
  dropZones,
  draggableItems,
  choiceZones,
  resetToken,
}: Args) {
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<DragAssignments>({});
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [manualNotes, setManualNotes] = useState("");
  const [notesOpen, setNotesOpen] = useState<boolean>(() => defaultNotesOpenForViewport());
  const [codeText, setCodeText] = useState(codeTemplate);
  const [feedback, setFeedback] = useState<string>("");
  const [zoneStatus, setZoneStatus] = useState<Record<string, ValidationStatus>>({});
  const [choiceZoneStatus, setChoiceZoneStatus] = useState<Record<string, ValidationStatus>>({});
  const [choiceTool, setChoiceTool] = useState<"none" | "text" | "circle">("none");
  const [choiceMarks, setChoiceMarks] = useState<ChoiceMark[]>([]);
  const [choiceZoneValues, setChoiceZoneValues] = useState<ChoiceZoneValues>({});
  const [isHydratedFromStorage, setIsHydratedFromStorage] = useState(false);
  const choiceMarkIdRef = useRef(0);

  useEffect(() => {
    const storage = getStorage();
    if (!storage) {
      return;
    }

    setIsHydratedFromStorage(false);

    const visitedKey = `in1010:visited:${examId}`;
    const current = JSON.parse(storage.getItem(visitedKey) ?? "[]") as string[];
    if (!current.includes(questionId)) {
      storage.setItem(visitedKey, JSON.stringify([...current, questionId]));
    }
  }, [examId, questionId]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage) {
      return;
    }

    if (options.length > 0) {
      const optionIdSet = new Set(options.map((option) => option.id));
      const savedSelectedChoices = storage.getItem(storageKey("choice", examId, questionId));
      if (savedSelectedChoices) {
        try {
          const parsed = JSON.parse(savedSelectedChoices) as string[];
          const filtered = parsed.filter((id) => optionIdSet.has(id));
          setSelectedChoices(filtered);
        } catch {
          setSelectedChoices([]);
        }
      } else {
        setSelectedChoices([]);
      }
    } else {
      setSelectedChoices([]);
    }

    const savedFeedback = storage.getItem(storageKey("feedback", examId, questionId));
    setFeedback(savedFeedback ?? "");

    if (dropZones.length > 0) {
      const emptyState = Object.fromEntries(dropZones.map((zone) => [zone.id, null])) as DragAssignments;
      const draggableItemIdSet = new Set(draggableItems.map((item) => item.id));
      const savedAssignments = storage.getItem(storageKey("drag", examId, questionId));

      if (savedAssignments) {
        try {
          const parsed = JSON.parse(savedAssignments) as Record<string, string | null>;
          const merged: DragAssignments = { ...emptyState };
          dropZones.forEach((zone) => {
            const value = parsed[zone.id];
            if (typeof value === "string" && draggableItemIdSet.has(value)) {
              merged[zone.id] = value;
            }
          });
          setAssignments(merged);
        } catch {
          setAssignments(emptyState);
        }
      } else {
        setAssignments(emptyState);
      }

      const savedZoneStatus = storage.getItem(storageKey("zone-status", examId, questionId));
      if (savedZoneStatus) {
        try {
          const parsed = JSON.parse(savedZoneStatus) as Record<string, unknown>;
          setZoneStatus(
            sanitizeValidationStatusMap(
              parsed,
              new Set(dropZones.map((zone) => zone.id))
            )
          );
        } catch {
          setZoneStatus({});
        }
      } else {
        setZoneStatus({});
      }
    } else {
      setAssignments({});
      setZoneStatus({});
    }

    const savedManual = storage.getItem(storageKey("manual", examId, questionId));
    setManualNotes(savedManual ?? "");

    const savedNotesOpen = storage.getItem(storageKey("notes-open", examId, questionId));
    if (savedNotesOpen === "1" || savedNotesOpen === "0") {
      setNotesOpen(savedNotesOpen === "1");
    } else {
      setNotesOpen(defaultNotesOpenForViewport());
    }

    setCodeText(codeTemplate);
    const savedCode = storage.getItem(storageKey("code", examId, questionId));
    if (savedCode) {
      setCodeText(savedCode);
    }

    const savedChoiceMarks = storage.getItem(storageKey("choice-marks", examId, questionId));
    if (savedChoiceMarks) {
      try {
        const parsed = JSON.parse(savedChoiceMarks) as ChoiceMark[];
        const { sanitized, maxId } = sanitizeChoiceMarks(parsed);
        setChoiceMarks(sanitized);
        choiceMarkIdRef.current = maxId;
      } catch {
        setChoiceMarks([]);
        choiceMarkIdRef.current = 0;
      }
    } else {
      setChoiceMarks([]);
      choiceMarkIdRef.current = 0;
    }

    setChoiceTool("none");

    const defaultChoiceZoneValues = buildDefaultChoiceZoneValues(choiceZones);
    if (choiceZones.length === 0) {
      setChoiceZoneValues({});
      setChoiceZoneStatus({});
    } else {
      const savedChoiceZoneValues = storage.getItem(storageKey("choice-zones", examId, questionId));
      if (savedChoiceZoneValues) {
        try {
          const parsed = JSON.parse(savedChoiceZoneValues) as ChoiceZoneValues;
          const merged: ChoiceZoneValues = { ...defaultChoiceZoneValues };
          choiceZones.forEach((zone) => {
            const value = parsed[zone.id];
            if (zone.kind !== "text" && typeof value === "boolean") {
              merged[zone.id] = value;
            }
            if (zone.kind === "text" && typeof value === "string") {
              merged[zone.id] = value;
            }
          });
          setChoiceZoneValues(merged);
        } catch {
          setChoiceZoneValues(defaultChoiceZoneValues);
        }
      } else {
        setChoiceZoneValues(defaultChoiceZoneValues);
      }

      const savedChoiceZoneStatus = storage.getItem(
        storageKey("choice-zone-status", examId, questionId)
      );
      if (savedChoiceZoneStatus) {
        try {
          const parsed = JSON.parse(savedChoiceZoneStatus) as Record<string, unknown>;
          setChoiceZoneStatus(
            sanitizeValidationStatusMap(
              parsed,
              new Set(choiceZones.map((zone) => zone.id))
            )
          );
        } catch {
          setChoiceZoneStatus({});
        }
      } else {
        setChoiceZoneStatus({});
      }
    }

    setActiveItemId(null);
    setIsHydratedFromStorage(true);
  }, [
    choiceZones,
    codeTemplate,
    draggableItems,
    dropZones,
    examId,
    options,
    questionId,
    resetToken,
  ]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage || !isHydratedFromStorage || options.length === 0) {
      return;
    }
    storage.setItem(storageKey("choice", examId, questionId), JSON.stringify(selectedChoices));
  }, [examId, isHydratedFromStorage, options.length, questionId, selectedChoices]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage || !isHydratedFromStorage || dropZones.length === 0) {
      return;
    }
    storage.setItem(storageKey("drag", examId, questionId), JSON.stringify(assignments));
  }, [assignments, dropZones.length, examId, isHydratedFromStorage, questionId]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage || !isHydratedFromStorage) {
      return;
    }
    storage.setItem(storageKey("manual", examId, questionId), manualNotes);
  }, [examId, isHydratedFromStorage, manualNotes, questionId]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage || !isHydratedFromStorage) {
      return;
    }

    if (feedback.length === 0) {
      storage.removeItem(storageKey("feedback", examId, questionId));
      return;
    }

    storage.setItem(storageKey("feedback", examId, questionId), feedback);
  }, [examId, feedback, isHydratedFromStorage, questionId]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage || !isHydratedFromStorage) {
      return;
    }
    storage.setItem(storageKey("notes-open", examId, questionId), notesOpen ? "1" : "0");
  }, [examId, isHydratedFromStorage, notesOpen, questionId]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage || !isHydratedFromStorage) {
      return;
    }
    storage.setItem(storageKey("code", examId, questionId), codeText);
  }, [codeText, examId, isHydratedFromStorage, questionId]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage || !isHydratedFromStorage || choiceZones.length === 0) {
      return;
    }
    storage.setItem(
      storageKey("choice-zones", examId, questionId),
      JSON.stringify(choiceZoneValues)
    );
  }, [choiceZoneValues, choiceZones.length, examId, isHydratedFromStorage, questionId]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage || !isHydratedFromStorage) {
      return;
    }

    if (Object.keys(zoneStatus).length === 0) {
      storage.removeItem(storageKey("zone-status", examId, questionId));
      return;
    }

    storage.setItem(storageKey("zone-status", examId, questionId), JSON.stringify(zoneStatus));
  }, [examId, isHydratedFromStorage, questionId, zoneStatus]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage || !isHydratedFromStorage) {
      return;
    }

    if (Object.keys(choiceZoneStatus).length === 0) {
      storage.removeItem(storageKey("choice-zone-status", examId, questionId));
      return;
    }

    storage.setItem(
      storageKey("choice-zone-status", examId, questionId),
      JSON.stringify(choiceZoneStatus)
    );
  }, [choiceZoneStatus, examId, isHydratedFromStorage, questionId]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage || !isHydratedFromStorage) {
      return;
    }
    storage.setItem(storageKey("choice-marks", examId, questionId), JSON.stringify(choiceMarks));
  }, [choiceMarks, examId, isHydratedFromStorage, questionId]);

  const nextChoiceMarkId = useCallback(() => {
    choiceMarkIdRef.current += 1;
    return `mark-${choiceMarkIdRef.current}`;
  }, []);

  return {
    selectedChoices,
    setSelectedChoices,
    assignments,
    setAssignments,
    activeItemId,
    setActiveItemId,
    manualNotes,
    setManualNotes,
    notesOpen,
    setNotesOpen,
    codeText,
    setCodeText,
    feedback,
    setFeedback,
    zoneStatus,
    setZoneStatus,
    choiceZoneStatus,
    setChoiceZoneStatus,
    choiceTool,
    setChoiceTool,
    choiceMarks,
    setChoiceMarks,
    choiceZoneValues,
    setChoiceZoneValues,
    isHydratedFromStorage,
    nextChoiceMarkId,
  };
}
