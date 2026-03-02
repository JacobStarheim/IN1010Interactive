/* eslint-disable @next/next/no-img-element */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { PageImageStack } from "@/components/exam/page-image-stack";
import type { DragAssignments, DragCheckResult } from "@/lib/interaction";
import {
  evaluateChoiceZones,
  evaluateChoiceSelection,
  evaluateDragAssignments,
} from "@/lib/interaction";
import type { ChoiceZone, QuestionManifest, Rect } from "@/lib/exam-types";
import { getEffectivePageBottom, getPageCrop, mapRectToCroppedPage } from "@/lib/page-crops";
import styles from "@/components/exam/question-workspace.module.css";

type Props = {
  examId: string;
  question: QuestionManifest;
};

type ChoiceMarkKind = "text" | "circle";

type ChoiceMark = {
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

type ChoiceZoneValues = Record<string, string | boolean>;

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

export function QuestionWorkspace({ examId, question }: Props) {
  const [showSolution, setShowSolution] = useState(false);
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<DragAssignments>({});
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [manualNotes, setManualNotes] = useState("");
  const [notesOpen, setNotesOpen] = useState<boolean>(() => defaultNotesOpenForViewport());
  const [codeText, setCodeText] = useState(question.interaction?.codeTemplate ?? "");
  const [feedback, setFeedback] = useState<string>("");
  const [zoneStatus, setZoneStatus] = useState<Record<string, "correct" | "wrong" | "empty">>(
    {}
  );
  const [choiceTool, setChoiceTool] = useState<"none" | "text" | "circle">("none");
  const [choiceMarks, setChoiceMarks] = useState<ChoiceMark[]>([]);
  const [choiceZoneValues, setChoiceZoneValues] = useState<ChoiceZoneValues>({});
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
  const allowItemReuse = question.interaction?.allowItemReuse ?? false;
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
    const perPage: Record<number, typeof tokenZones> = {};
    tokenZones.forEach((zone) => {
      const pageIndex = zone.pageIndex ?? 0;
      if (!perPage[pageIndex]) {
        perPage[pageIndex] = [];
      }
      perPage[pageIndex].push(zone);
    });
    return perPage;
  }, [tokenZones]);
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
    tokenZones.length > 0 &&
    tokenZones.length === draggableItems.length;

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
    const effectiveBottom = getEffectivePageBottom(pagePath, requiredBottom);
    return mapRectToCroppedPage(rect, effectiveBottom);
  };

  useEffect(() => {
    const storage = getStorage();
    if (!storage) {
      return;
    }

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

    setSelectedChoices([]);
    setFeedback("");
    setZoneStatus({});
    if (dropZones.length > 0) {
      const emptyState = Object.fromEntries(dropZones.map((zone) => [zone.id, null]));
      setAssignments(emptyState);
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

    setChoiceMarks([]);
    choiceMarkIdRef.current = 0;
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
  }, [choiceZones, dropZones, examId, question.id, question.interaction?.codeTemplate]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage) {
      return;
    }
    storage.setItem(storageKey("manual", examId, question.id), manualNotes);
  }, [manualNotes, examId, question.id]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage) {
      return;
    }
    storage.setItem(storageKey("notes-open", examId, question.id), notesOpen ? "1" : "0");
  }, [notesOpen, examId, question.id]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage) {
      return;
    }
    storage.setItem(storageKey("code", examId, question.id), codeText);
  }, [codeText, examId, question.id]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage || choiceZones.length === 0) {
      return;
    }
    storage.setItem(
      storageKey("choice-zones", examId, question.id),
      JSON.stringify(choiceZoneValues)
    );
  }, [choiceZoneValues, choiceZones.length, examId, question.id]);

  const assignedItemIds = useMemo(() => {
    if (allowItemReuse) {
      return new Set<string>();
    }
    return new Set(Object.values(assignments).filter(Boolean));
  }, [allowItemReuse, assignments]);
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
    setChoiceZoneValues((current) => ({ ...current, [zoneId]: value }));
  };

  const toggleChoiceZoneCircle = (zoneId: string, group?: string) => {
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
      setFeedback(`Riktig: ${result.correct}/${result.total}`);
      return;
    }

    const missing = result.missing.length;
    const incorrect = result.incorrect.length;
    setFeedback(
      `Delvis riktig: ${result.correct}/${result.total}. Mangler: ${missing}, feil valgt: ${incorrect}.`
    );
  };

  const checkChoiceZones = () => {
    const result = evaluateChoiceZones(choiceZoneValues, choiceZones);
    if (result.total === 0) {
      setFeedback("Denne oppgaven har ikke sjekkbar fasit ennå.");
      return;
    }

    if (result.isPerfect) {
      setFeedback(`Riktig: ${result.correct}/${result.total}`);
      return;
    }

    setFeedback(
      `Delvis riktig: ${result.correct}/${result.total}. Mangler: ${result.missing}, feil: ${result.wrong}.`
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
      setFeedback(`Riktig plassering: ${result.correct}/${result.total}`);
      return;
    }
    setFeedback(
      `Delvis riktig: ${result.correct}/${result.total}. Tomme: ${result.empty.length}, feil: ${result.wrong.length}.`
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

  const renderOverlayViewer = () => {
    return (
      <div className={styles.overlayStack}>
        {question.promptPages.map((page, pageIndex) => {
          const zonesOnPage = dropZonesByPage[pageIndex] ?? [];
          const tokenZonesOnPage = tokenZonesByPage[pageIndex] ?? [];
          const requiredBottom = requiredDragBottomByPage[pageIndex] ?? 0;
          const effectiveBottom = getEffectivePageBottom(page, requiredBottom);
          const crop = getPageCrop(page);

          return (
            <figure key={`${page}-${pageIndex}`} className={styles.overlayFigure}>
              <div
                className={styles.cropFrame}
                style={{
                  aspectRatio: `${crop.width} / ${crop.height * effectiveBottom}`,
                }}
              >
                <img
                  src={page}
                  alt={`Oppgaveside ${pageIndex + 1}`}
                  className={styles.overlayImage}
                  loading={pageIndex === 0 ? "eager" : "lazy"}
                />
                <div className={styles.overlayLayer}>
                  {tokenZonesOnPage.map((zone) => {
                    const mappedRect = mapRectForPage(zone.rect, page, requiredBottom);
                    const item = draggableItems.find((entry) => entry.id === zone.itemId);
                    if (!item) return null;
                    const used = assignedItemIds.has(item.id);
                    if (!allowItemReuse && used) {
                      return null;
                    }

                    return (
                      <button
                        key={zone.id}
                        className={`${styles.inCanvasToken} ${
                          activeItemId === item.id ? styles.inCanvasTokenActive : ""
                        } ${used ? styles.inCanvasTokenUsed : ""}`}
                        style={{
                          left: `${mappedRect.x * 100}%`,
                          top: `${mappedRect.y * 100}%`,
                          width: `${mappedRect.w * 100}%`,
                          minHeight: `${mappedRect.h * 100}%`,
                        }}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", item.id);
                        }}
                        onClick={() => setActiveItemId(item.id)}
                        title={item.label}
                        aria-label={`Brikke ${item.label}`}
                      >
                        <span className={styles.inCanvasTokenText}>{item.label}</span>
                      </button>
                    );
                  })}
                  {zonesOnPage.map((zone, zoneIndex) => {
                    const rect = zone.rect ?? getAutoRectForZone(zoneIndex, zonesOnPage.length);
                    const mappedRect = mapRectForPage(rect, page, requiredBottom);
                    const itemId = assignments[zone.id];
                    const itemLabel = draggableItems.find((item) => item.id === itemId)?.label;
                    const status = zoneStatus[zone.id];
                    const statusClass =
                      status === "correct"
                        ? styles.overlayZoneCorrect
                        : status === "wrong"
                        ? styles.overlayZoneWrong
                        : status === "empty"
                        ? styles.overlayZoneEmpty
                        : "";

                    return (
                      <div
                        key={zone.id}
                        className={`${styles.overlayZone} ${statusClass}`}
                        style={{
                          left: `${mappedRect.x * 100}%`,
                          top: `${mappedRect.y * 100}%`,
                          width: `${mappedRect.w * 100}%`,
                          height: `${mappedRect.h * 100}%`,
                        }}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          const item = event.dataTransfer.getData("text/plain");
                          const sourceZoneId = event.dataTransfer.getData("application/x-source-zone");
                          if (item) {
                            placeItem(zone.id, item, sourceZoneId || undefined);
                            setActiveItemId(null);
                          }
                        }}
                        onClick={() => {
                          if (activeItemId) {
                            placeItem(zone.id, activeItemId);
                            setActiveItemId(null);
                          }
                        }}
                        onDoubleClick={() => {
                          if (itemId) {
                            clearZoneAssignment(zone.id);
                          }
                        }}
                        draggable={Boolean(itemId)}
                        onDragStart={(event) => {
                          if (!itemId) return;
                          event.dataTransfer.setData("text/plain", itemId);
                          event.dataTransfer.setData("application/x-source-zone", zone.id);
                          event.dataTransfer.effectAllowed = allowItemReuse ? "copyMove" : "move";
                        }}
                        title={itemLabel ?? undefined}
                      >
                        {itemLabel ? (
                          <>
                            <span className={styles.overlayText} title={itemLabel}>
                              {itemLabel}
                            </span>
                            <button
                              className={styles.overlayClear}
                              onClick={(event) => {
                                event.stopPropagation();
                                clearZoneAssignment(zone.id);
                              }}
                              aria-label={`Fjern brikke fra ${zone.label}`}
                            >
                              ×
                            </button>
                          </>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </figure>
          );
        })}
      </div>
    );
  };

  const renderChoiceOverlayViewer = () => {
    if (hasPresetChoiceZones) {
      return (
        <div className={styles.overlayStack}>
          {question.promptPages.map((page, pageIndex) => {
            const zonesOnPage = choiceZonesByPage[pageIndex] ?? [];
            const requiredBottom = requiredChoiceBottomByPage[pageIndex] ?? 0;
            const effectiveBottom = getEffectivePageBottom(page, requiredBottom);
            const crop = getPageCrop(page);

            return (
              <figure key={`${page}-${pageIndex}`} className={styles.overlayFigure}>
                <div
                  className={styles.cropFrame}
                  style={{
                    aspectRatio: `${crop.width} / ${crop.height * effectiveBottom}`,
                  }}
                >
                  <img
                    src={page}
                    alt={`Oppgaveside ${pageIndex + 1}`}
                    className={styles.overlayImage}
                    loading={pageIndex === 0 ? "eager" : "lazy"}
                  />
                  <div className={`${styles.overlayLayer} ${styles.choiceOverlayLayer}`}>
                    {zonesOnPage.map((zone) => {
                      const mappedRect = mapRectForPage(zone.rect, page, requiredBottom);
                      return (
                        <div
                          key={zone.id}
                          className={styles.choiceZone}
                          style={{
                            left: `${mappedRect.x * 100}%`,
                            top: `${mappedRect.y * 100}%`,
                            width: `${mappedRect.w * 100}%`,
                            height: `${mappedRect.h * 100}%`,
                          }}
                        >
                          {zone.kind === "text" ? (
                            <input
                              type="text"
                              className={styles.choiceZoneInput}
                              value={(choiceZoneValues[zone.id] as string) ?? ""}
                              placeholder={zone.placeholder ?? ""}
                              onChange={(event) => updateChoiceZoneText(zone.id, event.target.value)}
                              aria-label={`Svarfelt ${zone.id}`}
                            />
                          ) : (
                            <button
                              type="button"
                              className={
                                zone.kind === "box"
                                  ? `${styles.choiceZoneBox} ${
                                      Boolean(choiceZoneValues[zone.id])
                                        ? styles.choiceZoneBoxActive
                                        : ""
                                    }`
                                  : `${styles.choiceZoneCircle} ${
                                      Boolean(choiceZoneValues[zone.id])
                                        ? styles.choiceZoneCircleActive
                                        : ""
                                    }`
                              }
                              onClick={() => toggleChoiceZoneCircle(zone.id, zone.group)}
                              aria-label={Boolean(choiceZoneValues[zone.id]) ? "Fjern markering" : "Marker"}
                            >
                              {zone.kind === "box" && Boolean(choiceZoneValues[zone.id]) ? "✓" : ""}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </figure>
            );
          })}
        </div>
      );
    }

    return (
      <div className={styles.overlayStack}>
        {question.promptPages.map((page, pageIndex) => {
          const marksOnPage = choiceMarksByPage[pageIndex] ?? [];
          const effectiveBottom = getEffectivePageBottom(page, 0);
          const crop = getPageCrop(page);

          return (
            <figure key={`${page}-${pageIndex}`} className={styles.overlayFigure}>
              <div
                className={styles.cropFrame}
                style={{
                  aspectRatio: `${crop.width} / ${crop.height * effectiveBottom}`,
                }}
              >
                <img
                  src={page}
                  alt={`Oppgaveside ${pageIndex + 1}`}
                  className={styles.overlayImage}
                  loading={pageIndex === 0 ? "eager" : "lazy"}
                />
                <div
                  className={`${styles.overlayLayer} ${styles.choiceOverlayLayer} ${
                    choiceTool !== "none" ? styles.choiceOverlayLayerActiveTool : ""
                  }`}
                  onClick={(event) => {
                    if (choiceTool === "none") {
                      return;
                    }
                    const bounds = event.currentTarget.getBoundingClientRect();
                    const x = (event.clientX - bounds.left) / bounds.width;
                    const y = (event.clientY - bounds.top) / bounds.height;
                    addChoiceMarkAt(pageIndex, x, y);
                  }}
                >
                  {marksOnPage.map((mark) => {
                    if (mark.kind === "text") {
                      return (
                        <div
                          key={mark.id}
                          className={styles.choiceMarkText}
                          style={{
                            left: `${mark.x * 100}%`,
                            top: `${mark.y * 100}%`,
                            width: `${mark.w * 100}%`,
                            height: `${mark.h * 100}%`,
                          }}
                        >
                          <input
                            type="text"
                            className={styles.choiceMarkInput}
                            value={mark.text}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => updateChoiceMarkText(mark.id, event.target.value)}
                            placeholder="Skriv..."
                            aria-label="Tekstfelt i oppgave"
                          />
                          <button
                            type="button"
                            className={styles.choiceMarkRemove}
                            onClick={(event) => {
                              event.stopPropagation();
                              removeChoiceMark(mark.id);
                            }}
                            aria-label="Fjern tekstfelt"
                          >
                            ×
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={mark.id}
                        className={styles.choiceMarkCircleWrap}
                        style={{
                          left: `${mark.x * 100}%`,
                          top: `${mark.y * 100}%`,
                          width: `${mark.w * 100}%`,
                          height: `${mark.h * 100}%`,
                        }}
                      >
                        <button
                          type="button"
                          className={`${styles.choiceMarkCircle} ${
                            mark.checked ? styles.choiceMarkCircleActive : ""
                          }`}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleChoiceCircle(mark.id);
                          }}
                          aria-label={mark.checked ? "Fjern markering" : "Marker sirkel"}
                        />
                        <button
                          type="button"
                          className={styles.choiceMarkRemoveMini}
                          onClick={(event) => {
                            event.stopPropagation();
                            removeChoiceMark(mark.id);
                          }}
                          aria-label="Fjern sirkel"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </figure>
          );
        })}
      </div>
    );
  };

  const renderInteraction = () => {
    if (question.type === "official-only") {
      return (
        <p className={styles.note}>
          Denne oppgaven vises i originalformat. Bruk <strong>Vis fasit</strong> for svar.
        </p>
      );
    }

    if (question.type === "choice-grid") {
      const hasZoneValues = Object.values(choiceZoneValues).some((value) =>
        typeof value === "boolean" ? value : value.trim().length > 0
      );

      if (hasPresetChoiceZones) {
        return (
          <div className={styles.manualBlock}>
            <div className={styles.actions}>
              {hasAutoChoiceZones ? (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={checkChoiceZones}
                >
                  Sjekk svar
                </button>
              ) : null}
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={clearChoiceZones}
                disabled={!hasZoneValues}
              >
                Nullstill
              </button>
            </div>
          </div>
        );
      }

      if (options.length > 0) {
        return (
          <div className={styles.manualBlock}>
            <div className={styles.choiceList}>
              {options.map((option) => {
                const checked = selectedChoices.includes(option.id);
                return (
                  <label key={option.id} className={styles.choiceRow}>
                    <input
                      type={allowMultiple ? "checkbox" : "radio"}
                      name={`choice-${question.id}`}
                      checked={checked}
                      onChange={() => onChoiceToggle(option.id)}
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
            <div className={styles.actions}>
              <button
                className={styles.primaryButton}
                disabled={!hasAutoChoice}
                onClick={checkChoice}
              >
                Sjekk svar
              </button>
              <button className={styles.secondaryButton} onClick={resetChoices}>
                Nullstill
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className={styles.manualBlock}>
          <div className={styles.choiceToolRow}>
            <button
              type="button"
              className={`${styles.choiceToolButton} ${
                choiceTool === "text" ? styles.choiceToolButtonActive : ""
              }`}
              onClick={() => setChoiceTool("text")}
            >
              Tekstboks
            </button>
            <button
              type="button"
              className={`${styles.choiceToolButton} ${
                choiceTool === "circle" ? styles.choiceToolButtonActive : ""
              }`}
              onClick={() => setChoiceTool("circle")}
            >
              Sirkel
            </button>
            <button
              type="button"
              className={`${styles.choiceToolButton} ${
                choiceTool === "none" ? styles.choiceToolButtonActive : ""
              }`}
              onClick={() => setChoiceTool("none")}
            >
              Peker
            </button>
            <button
              type="button"
              className={styles.choiceToolButton}
              onClick={undoChoiceMark}
              disabled={choiceMarks.length === 0}
            >
              Angre
            </button>
            <button
              type="button"
              className={styles.choiceToolButton}
              onClick={clearChoiceMarks}
              disabled={choiceMarks.length === 0}
            >
              Nullstill markeringer
            </button>
          </div>
        </div>
      );
    }

    if (question.type === "drag-drop") {
      if (draggableItems.length === 0 || dropZones.length === 0) {
        return (
          <div className={styles.manualBlock}>
            <p className={styles.note}>{question.interaction?.instructions}</p>
            <p className={styles.note}>
              Interaktiv drag/drop for denne oppgaven er ikke spesifisert fullt ut i manifestet ennå.
            </p>
          </div>
        );
      }

      return (
        <div className={styles.manualBlock}>
          <p className={styles.subtle}>
            {hasInCanvasTokenBank
              ? "Brikkene ligger i oppgaven. Klikk en brikke og trykk i feltet, eller dra direkte."
              : "Klikk en brikke og trykk i feltet, eller dra direkte inn i feltet."}
          </p>
          <div className={styles.actions}>
            <button className={styles.primaryButton} disabled={!hasAutoDrag} onClick={checkDrag}>
              Sjekk svar
            </button>
            <button className={styles.secondaryButton} onClick={clearDrag}>
              Nullstill
            </button>
          </div>
        </div>
      );
    }

    if (question.type === "code-editor") {
      return (
        <div>
          <p className={styles.note}>{question.interaction?.instructions}</p>
          <textarea
            className={styles.codeArea}
            value={codeText}
            onChange={(event) => setCodeText(event.target.value)}
            spellCheck={false}
          />
          <div className={styles.actions}>
            <button className={styles.secondaryButton} onClick={resetCode}>
              Nullstill kodefelt
            </button>
          </div>
          {showSolution && question.interaction?.solutionText ? (
            <pre className={styles.solutionText}>{question.interaction.solutionText}</pre>
          ) : null}
        </div>
      );
    }

    return null;
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.title}>
            Oppgave {question.number}: {question.title}
          </h1>
        </div>
        <button
          className={styles.toggleButton}
          onClick={() => {
            setShowSolution((value) => !value);
            setFeedback("");
          }}
        >
          {showSolution ? "Skjul fasit" : "Vis fasit"}
        </button>
      </div>

      <div className={styles.content}>
        <section className={styles.viewer}>
          {question.type === "drag-drop" && !showSolution && dropZones.length > 0
            ? renderOverlayViewer()
            : useChoiceOverlayViewer
            ? renderChoiceOverlayViewer()
            : (
              <PageImageStack
                pages={showSolution ? question.solutionPages : question.promptPages}
                label={showSolution ? "Fasitside" : "Oppgaveside"}
              />
            )}
          {question.type === "drag-drop" &&
          !showSolution &&
          dropZones.length > 0 &&
          !hasInCanvasTokenBank ? (
            <div className={styles.dragDock}>
              <div className={styles.panel}>
                <h3>Brikker</h3>
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
          {renderInteraction()}
          <div className={styles.notesToggleRow}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setNotesOpen((current) => !current)}
            >
              {notesOpen ? "Skjul notatblokk" : "Vis notatblokk"}
            </button>
          </div>
          {notesOpen ? (
            <div className={styles.notesPanel}>
              <label className={styles.label} htmlFor="manual-notes">
                Notatblokk
              </label>
              <textarea
                id="manual-notes"
                className={styles.textarea}
                value={manualNotes}
                onChange={(event) => setManualNotes(event.target.value)}
                placeholder="Skriv notater her..."
              />
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setManualNotes("")}
                  disabled={manualNotes.trim().length === 0}
                >
                  Tøm notater
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
