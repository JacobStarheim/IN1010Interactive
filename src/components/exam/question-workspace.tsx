"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { PageImageStack } from "@/components/exam/page-image-stack";
import {
  ChoiceOverlayViewer,
  DragOverlayViewer,
  QuestionInteractionPanel,
} from "@/components/exam/question-workspace-renderers";
import {
  type ChoiceMark,
  type ChoiceMarkKind,
  type ChoiceZoneValues,
  type ValidationStatus,
} from "@/components/exam/question-workspace-shared";
import { useLocale } from "@/components/i18n/locale-provider";
import type { DragAssignments, DragCheckResult } from "@/lib/interaction";
import {
  evaluateChoiceZones,
  evaluateChoiceSelection,
  evaluateDragAssignments,
} from "@/lib/interaction";
import type { ChoiceZone, QuestionManifest, Rect, TokenZone } from "@/lib/exam-types";
import {
  formatQuestionHeading,
} from "@/lib/i18n";
import { getEffectivePageCrop, mapRectToCroppedPage } from "@/lib/page-crops";
import styles from "@/components/exam/question-workspace.module.css";

type Props = {
  examId: string;
  question: QuestionManifest;
  resetToken?: number;
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

export function QuestionWorkspace({ examId, question, resetToken = 0 }: Props) {
  const { locale } = useLocale();
  const isEnglish = locale === "en";
  const [showSolution, setShowSolution] = useState(false);
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<DragAssignments>({});
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [manualNotes, setManualNotes] = useState("");
  const [notesOpen, setNotesOpen] = useState<boolean>(() => defaultNotesOpenForViewport());
  const [codeText, setCodeText] = useState(question.interaction?.codeTemplate ?? "");
  const [feedback, setFeedback] = useState<string>("");
  const [zoneStatus, setZoneStatus] = useState<Record<string, ValidationStatus>>({});
  const [choiceZoneStatus, setChoiceZoneStatus] = useState<Record<string, ValidationStatus>>({});
  const [choiceTool, setChoiceTool] = useState<"none" | "text" | "circle">("none");
  const [choiceMarks, setChoiceMarks] = useState<ChoiceMark[]>([]);
  const [choiceZoneValues, setChoiceZoneValues] = useState<ChoiceZoneValues>({});
  const [isHydratedFromStorage, setIsHydratedFromStorage] = useState(false);
  const choiceMarkIdRef = useRef(0);

  const options = useMemo(() => question.interaction?.options ?? [], [question.interaction?.options]);
  const allowMultiple = question.interaction?.allowMultiple ?? true;
  const dropZones = useMemo(
    () => question.interaction?.dropZones ?? [],
    [question.interaction?.dropZones]
  );
  const tokenZones = useMemo(
    () => question.interaction?.tokenZones ?? [],
    [question.interaction?.tokenZones]
  );
  const choiceZones = useMemo(
    () => question.interaction?.choiceZones ?? [],
    [question.interaction?.choiceZones]
  );
  const draggableItems = useMemo(
    () => question.interaction?.draggableItems ?? [],
    [question.interaction?.draggableItems]
  );
  const normalizedTokenZones = useMemo(() => {
    if (tokenZones.length === 0 || draggableItems.length === 0) {
      return tokenZones;
    }

    const validItemIds = new Set(draggableItems.map((item) => item.id));
    const seen = new Set<string>();
    const duplicateOrInvalidIndexes: number[] = [];
    const presentIds = new Set<string>();

    tokenZones.forEach((zone, index) => {
      if (!validItemIds.has(zone.itemId)) {
        duplicateOrInvalidIndexes.push(index);
        return;
      }
      presentIds.add(zone.itemId);
      if (seen.has(zone.itemId)) {
        duplicateOrInvalidIndexes.push(index);
      } else {
        seen.add(zone.itemId);
      }
    });

    const missingIds = draggableItems
      .map((item) => item.id)
      .filter((itemId) => !presentIds.has(itemId));

    if (duplicateOrInvalidIndexes.length === 0 || missingIds.length === 0) {
      return tokenZones;
    }

    const patched: TokenZone[] = tokenZones.map((zone) => ({ ...zone }));
    duplicateOrInvalidIndexes.forEach((zoneIndex, index) => {
      const replacementId = missingIds[index];
      if (!replacementId) {
        return;
      }
      patched[zoneIndex] = {
        ...patched[zoneIndex],
        itemId: replacementId,
      };
    });

    return patched;
  }, [draggableItems, tokenZones]);
  const allowItemReuse = question.type === "drag-drop";
  const hasPresetChoiceZones = choiceZones.length > 0;
  const hasAutoChoice = question.interaction?.checkMode === "auto" && options.length > 0;
  const hasAutoDrag =
    question.interaction?.checkMode === "auto" &&
    draggableItems.length > 0 &&
    dropZones.length > 0;
  const dropZonesByPage = useMemo(() => {
    const perPage: Record<number, typeof dropZones> = {};
    dropZones.forEach((zone) => {
      const pageIndex = zone.pageIndex ?? 0;
      if (!perPage[pageIndex]) {
        perPage[pageIndex] = [];
      }
      perPage[pageIndex].push(zone);
    });
    return perPage;
  }, [dropZones]);
  const tokenZonesByPage = useMemo(() => {
    const perPage: Record<number, typeof normalizedTokenZones> = {};
    normalizedTokenZones.forEach((zone) => {
      const pageIndex = zone.pageIndex ?? 0;
      if (!perPage[pageIndex]) {
        perPage[pageIndex] = [];
      }
      perPage[pageIndex].push(zone);
    });
    return perPage;
  }, [normalizedTokenZones]);
  const choiceZonesByPage = useMemo(() => {
    const perPage: Record<number, ChoiceZone[]> = {};
    choiceZones.forEach((zone) => {
      const pageIndex = zone.pageIndex ?? 0;
      if (!perPage[pageIndex]) {
        perPage[pageIndex] = [];
      }
      perPage[pageIndex].push(zone);
    });
    return perPage;
  }, [choiceZones]);
  const requiredDragBottomByPage = useMemo(() => {
    const fallbackRect = (zoneIndex: number, total: number) => {
      const columns = total > 8 ? 2 : 1;
      const rowsPerColumn = Math.ceil(total / columns);
      const column = columns === 1 ? 0 : Math.floor(zoneIndex / rowsPerColumn);
      const row = columns === 1 ? zoneIndex : zoneIndex % rowsPerColumn;
      const x = columns === 1 ? 0.14 : 0.12 + column * 0.36;
      const y = 0.29 + row * 0.043;
      const w = columns === 1 ? 0.33 : 0.32;
      const h = 0.032;
      return { x, y, w, h };
    };

    const perPage: Record<number, number> = {};
    Object.entries(dropZonesByPage).forEach(([rawPageIndex, zones]) => {
      const pageIndex = Number(rawPageIndex);
      const maxBottom = zones.reduce((max, zone, index) => {
        const rect = zone.rect ?? fallbackRect(index, zones.length);
        return Math.max(max, rect.y + rect.h);
      }, 0);
      perPage[pageIndex] = Math.min(1, maxBottom + 0.02);
    });
    Object.entries(tokenZonesByPage).forEach(([rawPageIndex, zones]) => {
      const pageIndex = Number(rawPageIndex);
      const maxBottom = zones.reduce((max, zone) => Math.max(max, zone.rect.y + zone.rect.h), 0);
      perPage[pageIndex] = Math.min(1, Math.max(perPage[pageIndex] ?? 0, maxBottom + 0.02));
    });
    return perPage;
  }, [dropZonesByPage, tokenZonesByPage]);
  const requiredChoiceBottomByPage = useMemo(() => {
    const perPage: Record<number, number> = {};
    Object.entries(choiceZonesByPage).forEach(([rawPageIndex, zones]) => {
      const pageIndex = Number(rawPageIndex);
      const maxBottom = zones.reduce((max, zone) => Math.max(max, zone.rect.y + zone.rect.h), 0);
      perPage[pageIndex] = Math.min(1, maxBottom + 0.02);
    });
    return perPage;
  }, [choiceZonesByPage]);
  const requiredTopByPage = useMemo(() => {
    const perPage: Record<number, number> = {};
    const registerRect = (pageIndex: number, rect: Rect) => {
      const candidate = Math.max(0, rect.y - 0.015);
      perPage[pageIndex] = perPage[pageIndex] === undefined ? candidate : Math.min(perPage[pageIndex], candidate);
    };

    Object.entries(dropZonesByPage).forEach(([rawPageIndex, zones]) => {
      const pageIndex = Number(rawPageIndex);
      zones.forEach((zone, index) => registerRect(pageIndex, zone.rect ?? getAutoRectForZone(index, zones.length)));
    });
    Object.entries(tokenZonesByPage).forEach(([rawPageIndex, zones]) => {
      const pageIndex = Number(rawPageIndex);
      zones.forEach((zone) => registerRect(pageIndex, zone.rect));
    });
    Object.entries(choiceZonesByPage).forEach(([rawPageIndex, zones]) => {
      const pageIndex = Number(rawPageIndex);
      zones.forEach((zone) => registerRect(pageIndex, zone.rect));
    });

    return perPage;
  }, [choiceZonesByPage, dropZonesByPage, tokenZonesByPage]);
  const choiceZonesByGroup = useMemo(() => {
    const grouped: Record<string, string[]> = {};
    choiceZones.forEach((zone) => {
      if (!zone.group) {
        return;
      }
      if (!grouped[zone.group]) {
        grouped[zone.group] = [];
      }
      grouped[zone.group].push(zone.id);
    });
    return grouped;
  }, [choiceZones]);
  const hasChoiceZoneAnswerKey = useMemo(
    () =>
      choiceZones.some(
        (zone) =>
          typeof zone.correct === "boolean" ||
          typeof zone.answer === "string" ||
          (zone.answers?.length ?? 0) > 0
      ),
    [choiceZones]
  );
  const hasAutoChoiceZones =
    hasPresetChoiceZones &&
    question.interaction?.checkMode === "auto" &&
    hasChoiceZoneAnswerKey;
  const useChoiceOverlayViewer =
    question.type === "choice-grid" &&
    !showSolution &&
    (hasPresetChoiceZones || options.length === 0);
  const hasInCanvasTokenBank =
    question.type === "drag-drop" &&
    normalizedTokenZones.length > 0 &&
    normalizedTokenZones.length === draggableItems.length;

  const buildDefaultChoiceZoneValues = (zones: ChoiceZone[]) => {
    return zones.reduce<ChoiceZoneValues>((acc, zone) => {
      acc[zone.id] = zone.kind === "text" ? "" : false;
      return acc;
    }, {});
  };

  const getAutoRectForZone = (zoneIndex: number, total: number) => {
    const columns = total > 8 ? 2 : 1;
    const rowsPerColumn = Math.ceil(total / columns);
    const column = columns === 1 ? 0 : Math.floor(zoneIndex / rowsPerColumn);
    const row = columns === 1 ? zoneIndex : zoneIndex % rowsPerColumn;

    const x = columns === 1 ? 0.14 : 0.12 + column * 0.36;
    const y = 0.29 + row * 0.043;
    const w = columns === 1 ? 0.33 : 0.32;
    const h = 0.032;

    return { x, y, w, h };
  };

  const mapRectForPage = (rect: Rect, pagePath: string, requiredBottom = 0) => {
    const pageIndex = question.promptPages.indexOf(pagePath);
    const effectiveCrop = getEffectivePageCrop(
      pagePath,
      pageIndex >= 0 ? (requiredTopByPage[pageIndex] ?? 1) : 1,
      requiredBottom
    );
    return mapRectToCroppedPage(rect, effectiveCrop.top, effectiveCrop.bottom);
  };

  useEffect(() => {
    const storage = getStorage();
    if (!storage) {
      return;
    }

    setIsHydratedFromStorage(false);

    const visitedKey = `in1010:visited:${examId}`;
    const current = JSON.parse(storage.getItem(visitedKey) ?? "[]") as string[];
    if (!current.includes(question.id)) {
      storage.setItem(visitedKey, JSON.stringify([...current, question.id]));
    }
  }, [examId, question.id]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage) {
      return;
    }

    if (options.length > 0) {
      const optionIdSet = new Set(options.map((option) => option.id));
      const savedSelectedChoices = storage.getItem(storageKey("choice", examId, question.id));
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
    setFeedback("");
    setZoneStatus({});
    setChoiceZoneStatus({});
    if (dropZones.length > 0) {
      const emptyState = Object.fromEntries(dropZones.map((zone) => [zone.id, null])) as DragAssignments;
      const draggableItemIdSet = new Set(draggableItems.map((item) => item.id));
      const savedAssignments = storage.getItem(storageKey("drag", examId, question.id));

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
    } else {
      setAssignments({});
    }

    const savedManual = storage.getItem(storageKey("manual", examId, question.id));
    if (savedManual) {
      setManualNotes(savedManual);
    } else {
      setManualNotes("");
    }
    const savedNotesOpen = storage.getItem(storageKey("notes-open", examId, question.id));
    if (savedNotesOpen === "1" || savedNotesOpen === "0") {
      setNotesOpen(savedNotesOpen === "1");
    } else {
      setNotesOpen(defaultNotesOpenForViewport());
    }
    setCodeText(question.interaction?.codeTemplate ?? "");
    const savedCode = storage.getItem(storageKey("code", examId, question.id));
    if (savedCode) {
      setCodeText(savedCode);
    }

    const savedChoiceMarks = storage.getItem(storageKey("choice-marks", examId, question.id));
    if (savedChoiceMarks) {
      try {
        const parsed = JSON.parse(savedChoiceMarks) as ChoiceMark[];
        const sanitized = parsed.filter((mark) => {
          const validKind = mark.kind === "text" || mark.kind === "circle";
          const validNumbers =
            Number.isFinite(mark.pageIndex) &&
            Number.isFinite(mark.x) &&
            Number.isFinite(mark.y) &&
            Number.isFinite(mark.w) &&
            Number.isFinite(mark.h);
          return Boolean(mark.id) && validKind && validNumbers;
        });
        setChoiceMarks(sanitized);
        const maxId = sanitized.reduce((max, mark) => {
          const numeric = Number(mark.id.replace("mark-", ""));
          return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
        }, 0);
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
    } else {
      const savedChoiceZoneValues = storage.getItem(
        storageKey("choice-zones", examId, question.id)
      );
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
    }
    setIsHydratedFromStorage(true);
  }, [
    choiceZones,
    dropZones,
    draggableItems,
    examId,
    options,
    question.id,
    question.interaction?.codeTemplate,
    resetToken,
  ]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage || !isHydratedFromStorage || options.length === 0) {
      return;
    }
    storage.setItem(storageKey("choice", examId, question.id), JSON.stringify(selectedChoices));
  }, [examId, isHydratedFromStorage, options.length, question.id, selectedChoices]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage || !isHydratedFromStorage || dropZones.length === 0) {
      return;
    }
    storage.setItem(storageKey("drag", examId, question.id), JSON.stringify(assignments));
  }, [assignments, dropZones.length, examId, isHydratedFromStorage, question.id]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage || !isHydratedFromStorage) {
      return;
    }
    storage.setItem(storageKey("manual", examId, question.id), manualNotes);
  }, [manualNotes, examId, isHydratedFromStorage, question.id]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage || !isHydratedFromStorage) {
      return;
    }
    storage.setItem(storageKey("notes-open", examId, question.id), notesOpen ? "1" : "0");
  }, [notesOpen, examId, isHydratedFromStorage, question.id]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage || !isHydratedFromStorage) {
      return;
    }
    storage.setItem(storageKey("code", examId, question.id), codeText);
  }, [codeText, examId, isHydratedFromStorage, question.id]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage || !isHydratedFromStorage || choiceZones.length === 0) {
      return;
    }
    storage.setItem(
      storageKey("choice-zones", examId, question.id),
      JSON.stringify(choiceZoneValues)
    );
  }, [choiceZoneValues, choiceZones.length, examId, isHydratedFromStorage, question.id]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage || !isHydratedFromStorage) {
      return;
    }
    storage.setItem(storageKey("choice-marks", examId, question.id), JSON.stringify(choiceMarks));
  }, [choiceMarks, examId, isHydratedFromStorage, question.id]);

  const assignedItemIds = useMemo(() => {
    if (allowItemReuse) {
      return new Set<string>();
    }
    return new Set(
      Object.values(assignments).filter((value): value is string => typeof value === "string")
    );
  }, [allowItemReuse, assignments]);
  const draggableItemsById = useMemo(
    () => new Map(draggableItems.map((item) => [item.id, item])),
    [draggableItems]
  );
  const choiceMarksByPage = useMemo(() => {
    const grouped: Record<number, ChoiceMark[]> = {};
    choiceMarks.forEach((mark) => {
      if (!grouped[mark.pageIndex]) {
        grouped[mark.pageIndex] = [];
      }
      grouped[mark.pageIndex].push(mark);
    });
    return grouped;
  }, [choiceMarks]);

  const clamp = (value: number, min: number, max: number) => {
    if (value < min) {
      return min;
    }
    if (value > max) {
      return max;
    }
    return value;
  };

  const createChoiceMark = (pageIndex: number, x: number, y: number, kind: ChoiceMarkKind) => {
    choiceMarkIdRef.current += 1;
    const id = `mark-${choiceMarkIdRef.current}`;

    if (kind === "text") {
      const w = 0.17;
      const h = 0.042;
      return {
        id,
        pageIndex,
        kind,
        x: clamp(x - w / 2, 0, 1 - w),
        y: clamp(y - h / 2, 0, 1 - h),
        w,
        h,
        text: "",
        checked: false,
      } satisfies ChoiceMark;
    }

    const w = 0.03;
    const h = 0.03;
    return {
      id,
      pageIndex,
      kind,
      x: clamp(x - w / 2, 0, 1 - w),
      y: clamp(y - h / 2, 0, 1 - h),
      w,
      h,
      text: "",
      checked: true,
    } satisfies ChoiceMark;
  };

  const addChoiceMarkAt = (pageIndex: number, x: number, y: number) => {
    if (choiceTool === "none") {
      return;
    }
    const newMark = createChoiceMark(pageIndex, x, y, choiceTool);
    setChoiceMarks((current) => [...current, newMark]);
    setFeedback("");
  };

  const updateChoiceMarkText = (id: string, text: string) => {
    setChoiceMarks((current) =>
      current.map((mark) => (mark.id === id ? { ...mark, text } : mark))
    );
  };

  const toggleChoiceCircle = (id: string) => {
    setChoiceMarks((current) =>
      current.map((mark) =>
        mark.id === id && mark.kind === "circle"
          ? { ...mark, checked: !mark.checked }
          : mark
      )
    );
  };

  const removeChoiceMark = (id: string) => {
    setChoiceMarks((current) => current.filter((mark) => mark.id !== id));
  };

  const clearChoiceMarks = () => {
    setChoiceMarks([]);
    setFeedback("");
  };

  const undoChoiceMark = () => {
    setChoiceMarks((current) => current.slice(0, -1));
  };

  const updateChoiceZoneText = (zoneId: string, value: string) => {
    setChoiceZoneStatus({});
    setFeedback("");
    setChoiceZoneValues((current) => ({ ...current, [zoneId]: value }));
  };

  const toggleChoiceZoneCircle = (zoneId: string, group?: string) => {
    setChoiceZoneStatus({});
    setFeedback("");
    setChoiceZoneValues((current) => {
      if (!group) {
        return { ...current, [zoneId]: !Boolean(current[zoneId]) };
      }

      const inGroup = choiceZonesByGroup[group] ?? [];
      const isChecked = Boolean(current[zoneId]);
      const next = { ...current };

      if (isChecked) {
        next[zoneId] = false;
        return next;
      }

      inGroup.forEach((id) => {
        next[id] = false;
      });
      next[zoneId] = true;
      return next;
    });
  };

  const clearChoiceZones = () => {
    setChoiceZoneValues(buildDefaultChoiceZoneValues(choiceZones));
    setChoiceZoneStatus({});
    setFeedback("");
  };

  const placeItem = (zoneId: string, itemId: string, sourceZoneId?: string) => {
    setZoneStatus({});
    setFeedback("");
    setAssignments((current) => {
      const updated = { ...current };
      // Dragging from one filled zone to another should duplicate the tile
      // when reuse is allowed, and move it otherwise.
      if (!allowItemReuse && sourceZoneId && sourceZoneId !== zoneId) {
        updated[sourceZoneId] = null;
      }
      if (!allowItemReuse) {
        Object.keys(updated).forEach((key) => {
          if (updated[key] === itemId) {
            updated[key] = null;
          }
        });
      }
      updated[zoneId] = itemId;
      return updated;
    });
  };

  const clearDrag = () => {
    const emptyState = Object.fromEntries(dropZones.map((zone) => [zone.id, null]));
    setAssignments(emptyState);
    setFeedback("");
    setActiveItemId(null);
    setZoneStatus({});
  };

  const clearZoneAssignment = (zoneId: string) => {
    setAssignments((current) => ({ ...current, [zoneId]: null }));
    setZoneStatus({});
    setFeedback("");
  };

  const resetChoices = () => {
    setSelectedChoices([]);
    setFeedback("");
  };

  const resetCode = () => {
    setCodeText(question.interaction?.codeTemplate ?? "");
    setFeedback("");
  };

  const checkChoice = () => {
    const result = evaluateChoiceSelection(selectedChoices, options);
    if (result.isPerfect) {
      setFeedback(
        isEnglish ? `Correct: ${result.correct}/${result.total}` : `Riktig: ${result.correct}/${result.total}`
      );
      return;
    }

    const missing = result.missing.length;
    const incorrect = result.incorrect.length;
    setFeedback(
      isEnglish
        ? `Partly correct: ${result.correct}/${result.total}. Missing: ${missing}, incorrect selections: ${incorrect}.`
        : `Delvis riktig: ${result.correct}/${result.total}. Mangler: ${missing}, feil valgt: ${incorrect}.`
    );
  };

  const checkChoiceZones = () => {
    const result = evaluateChoiceZones(choiceZoneValues, choiceZones);
    const statusMap: Record<string, ValidationStatus> = {};
    const zonesById = Object.fromEntries(choiceZones.map((zone) => [zone.id, zone]));
    choiceZones.forEach((zone) => {
      if (zone.kind !== "text") {
        return;
      }

      const rawValue = String(choiceZoneValues[zone.id] ?? "").trim();
      const expectedValues = [
        typeof zone.answer === "string" ? zone.answer : null,
        ...(zone.answers ?? []),
      ].filter((value): value is string => Boolean(value));

      if (expectedValues.length === 0) {
        return;
      }

      if (rawValue.length === 0) {
        statusMap[zone.id] = "empty";
        return;
      }

      const normalize = (value: string) =>
        value.trim().toLowerCase().replace(/[()]/g, "").replace(/\s+/g, "");
      const expectedSet = new Set(expectedValues.map(normalize));
      statusMap[zone.id] = expectedSet.has(normalize(rawValue)) ? "correct" : "wrong";
    });

    Object.values(choiceZonesByGroup).forEach((zoneIds) => {
      const expectedId = zoneIds.find((zoneId) => zonesById[zoneId]?.correct === true);
      if (!expectedId) {
        return;
      }

      const selectedIds = zoneIds.filter((zoneId) => Boolean(choiceZoneValues[zoneId]));

      if (selectedIds.length === 0) {
        zoneIds.forEach((zoneId) => {
          statusMap[zoneId] = "empty";
        });
        return;
      }

      zoneIds.forEach((zoneId) => {
        if (zoneId === expectedId) {
          statusMap[zoneId] = "correct";
        }
      });

      selectedIds.forEach((zoneId) => {
        if (zoneId !== expectedId) {
          statusMap[zoneId] = "wrong";
        }
      });
    });

    choiceZones
      .filter((zone) => zone.kind !== "text" && !zone.group && typeof zone.correct === "boolean")
      .forEach((zone) => {
        const selected = Boolean(choiceZoneValues[zone.id]);
        const expected = Boolean(zone.correct);

        if (!selected && expected) {
          statusMap[zone.id] = "empty";
          return;
        }

        if (selected && expected) {
          statusMap[zone.id] = "correct";
          return;
        }

        if (selected && !expected) {
          statusMap[zone.id] = "wrong";
        }
      });
    setChoiceZoneStatus(statusMap);

    if (result.total === 0) {
      setFeedback(
        isEnglish
          ? "This question does not have a checkable answer key yet."
          : "Denne oppgaven har ikke sjekkbar fasit ennå."
      );
      return;
    }

    if (result.isPerfect) {
      setFeedback(
        isEnglish ? `Correct: ${result.correct}/${result.total}` : `Riktig: ${result.correct}/${result.total}`
      );
      return;
    }

    setFeedback(
      isEnglish
        ? `Partly correct: ${result.correct}/${result.total}. Missing: ${result.missing}, wrong: ${result.wrong}.`
        : `Delvis riktig: ${result.correct}/${result.total}. Mangler: ${result.missing}, feil: ${result.wrong}.`
    );
  };

  const checkDrag = () => {
    const result: DragCheckResult = evaluateDragAssignments(assignments, dropZones);
    const statusMap: Record<string, "correct" | "wrong" | "empty"> = {};
    dropZones.forEach((zone) => {
      const assigned = assignments[zone.id];
      if (!assigned) {
        statusMap[zone.id] = "empty";
      } else if (zone.accepts.includes(assigned)) {
        statusMap[zone.id] = "correct";
      } else {
        statusMap[zone.id] = "wrong";
      }
    });
    setZoneStatus(statusMap);

    if (result.isPerfect) {
      setFeedback(
        isEnglish
          ? `Correct placement: ${result.correct}/${result.total}`
          : `Riktig plassering: ${result.correct}/${result.total}`
      );
      return;
    }
    setFeedback(
      isEnglish
        ? `Partly correct: ${result.correct}/${result.total}. Empty: ${result.empty.length}, wrong: ${result.wrong.length}.`
        : `Delvis riktig: ${result.correct}/${result.total}. Tomme: ${result.empty.length}, feil: ${result.wrong.length}.`
    );
  };

  const onChoiceToggle = (optionId: string) => {
    setFeedback("");
    setSelectedChoices((current) => {
      if (allowMultiple) {
        return current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
      }

      if (current.includes(optionId)) {
        return [];
      }
      return [optionId];
    });
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.title}>
            {formatQuestionHeading(question.number, question.title, locale)}
          </h1>
        </div>
        <button
          className={styles.toggleButton}
          onClick={() => {
            setShowSolution((value) => !value);
            setFeedback("");
          }}
        >
          {showSolution
            ? isEnglish
              ? "Hide answer key"
              : "Skjul fasit"
            : isEnglish
              ? "Show answer key"
              : "Vis fasit"}
        </button>
      </div>

      <div className={styles.content}>
        <section className={styles.viewer}>
          {question.type === "drag-drop" && !showSolution && dropZones.length > 0
            ? (
              <DragOverlayViewer
                promptPages={question.promptPages}
                locale={locale}
                isEnglish={isEnglish}
                dropZonesByPage={dropZonesByPage}
                tokenZonesByPage={tokenZonesByPage}
                requiredDragBottomByPage={requiredDragBottomByPage}
                requiredTopByPage={requiredTopByPage}
                mapRectForPage={mapRectForPage}
                getAutoRectForZone={getAutoRectForZone}
                draggableItemsById={draggableItemsById}
                assignedItemIds={assignedItemIds}
                allowItemReuse={allowItemReuse}
                activeItemId={activeItemId}
                setActiveItemId={setActiveItemId}
                assignments={assignments}
                zoneStatus={zoneStatus}
                placeItem={placeItem}
                clearZoneAssignment={clearZoneAssignment}
              />
            )
            : useChoiceOverlayViewer
            ? (
              <ChoiceOverlayViewer
                promptPages={question.promptPages}
                locale={locale}
                isEnglish={isEnglish}
                hasPresetChoiceZones={hasPresetChoiceZones}
                choiceZonesByPage={choiceZonesByPage}
                requiredChoiceBottomByPage={requiredChoiceBottomByPage}
                requiredTopByPage={requiredTopByPage}
                mapRectForPage={mapRectForPage}
                choiceZoneStatus={choiceZoneStatus}
                choiceZoneValues={choiceZoneValues}
                updateChoiceZoneText={updateChoiceZoneText}
                toggleChoiceZoneCircle={toggleChoiceZoneCircle}
                choiceMarksByPage={choiceMarksByPage}
                choiceTool={choiceTool}
                addChoiceMarkAt={addChoiceMarkAt}
                updateChoiceMarkText={updateChoiceMarkText}
                removeChoiceMark={removeChoiceMark}
                toggleChoiceCircle={toggleChoiceCircle}
              />
            )
            : (
              <PageImageStack
                pages={showSolution ? question.solutionPages : question.promptPages}
                label={
                  showSolution
                    ? isEnglish
                      ? "Answer key page"
                      : "Fasitside"
                    : isEnglish
                      ? "Question page"
                      : "Oppgaveside"
                }
              />
            )}
          {question.type === "drag-drop" &&
          !showSolution &&
          dropZones.length > 0 &&
          !hasInCanvasTokenBank ? (
            <div className={styles.dragDock}>
              <div className={styles.panel}>
                <h3>{isEnglish ? "Tiles" : "Brikker"}</h3>
                <div className={styles.tokenList}>
                  {draggableItems.map((item) => {
                    const used = assignedItemIds.has(item.id);
                    return (
                      <button
                        key={item.id}
                        className={`${styles.token} ${
                          activeItemId === item.id ? styles.tokenActive : ""
                        } ${used ? styles.tokenUsed : ""}`}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", item.id);
                        }}
                        onClick={() => setActiveItemId(item.id)}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <aside className={styles.sidebar}>
          <QuestionInteractionPanel
            question={question}
            isEnglish={isEnglish}
            showSolution={showSolution}
            hasPresetChoiceZones={hasPresetChoiceZones}
            hasAutoChoiceZones={hasAutoChoiceZones}
            choiceZoneValues={choiceZoneValues}
            clearChoiceZones={clearChoiceZones}
            checkChoiceZones={checkChoiceZones}
            options={options}
            allowMultiple={allowMultiple}
            selectedChoices={selectedChoices}
            onChoiceToggle={onChoiceToggle}
            hasAutoChoice={hasAutoChoice}
            checkChoice={checkChoice}
            resetChoices={resetChoices}
            choiceTool={choiceTool}
            setChoiceTool={setChoiceTool}
            undoChoiceMark={undoChoiceMark}
            clearChoiceMarks={clearChoiceMarks}
            choiceMarksCount={choiceMarks.length}
            draggableItems={draggableItems}
            dropZones={dropZones}
            hasInCanvasTokenBank={hasInCanvasTokenBank}
            hasAutoDrag={hasAutoDrag}
            checkDrag={checkDrag}
            clearDrag={clearDrag}
            codeText={codeText}
            setCodeText={setCodeText}
            resetCode={resetCode}
          />
          <div className={styles.notesToggleRow}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setNotesOpen((current) => !current)}
            >
              {notesOpen
                ? isEnglish
                  ? "Hide notes"
                  : "Skjul notatblokk"
                : isEnglish
                  ? "Show notes"
                  : "Vis notatblokk"}
            </button>
          </div>
          {notesOpen ? (
            <div className={styles.notesPanel}>
              <label className={styles.label} htmlFor="manual-notes">
                {isEnglish ? "Notes" : "Notatblokk"}
              </label>
              <textarea
                id="manual-notes"
                className={styles.textarea}
                value={manualNotes}
                onChange={(event) => setManualNotes(event.target.value)}
                placeholder={isEnglish ? "Write notes here..." : "Skriv notater her..."}
              />
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setManualNotes("")}
                  disabled={manualNotes.trim().length === 0}
                >
                  {isEnglish ? "Clear notes" : "Tøm notater"}
                </button>
              </div>
            </div>
          ) : null}
          {feedback ? <p className={styles.feedback}>{feedback}</p> : null}
        </aside>
      </div>
    </div>
  );
}
