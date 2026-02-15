/* eslint-disable @next/next/no-img-element */

"use client";

import { useEffect, useMemo, useState } from "react";

import { PageImageStack } from "@/components/exam/page-image-stack";
import type { DragAssignments, DragCheckResult } from "@/lib/interaction";
import {
  evaluateChoiceSelection,
  evaluateDragAssignments,
} from "@/lib/interaction";
import type { QuestionManifest } from "@/lib/exam-types";
import styles from "@/components/exam/question-workspace.module.css";

type Props = {
  examId: string;
  question: QuestionManifest;
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

export function QuestionWorkspace({ examId, question }: Props) {
  const [showSolution, setShowSolution] = useState(false);
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<DragAssignments>({});
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [manualNotes, setManualNotes] = useState("");
  const [codeText, setCodeText] = useState(question.interaction?.codeTemplate ?? "");
  const [feedback, setFeedback] = useState<string>("");
  const [zoneStatus, setZoneStatus] = useState<Record<string, "correct" | "wrong" | "empty">>(
    {}
  );

  const options = useMemo(() => question.interaction?.options ?? [], [question.interaction?.options]);
  const allowMultiple = question.interaction?.allowMultiple ?? true;
  const dropZones = useMemo(
    () => question.interaction?.dropZones ?? [],
    [question.interaction?.dropZones]
  );
  const draggableItems = useMemo(
    () => question.interaction?.draggableItems ?? [],
    [question.interaction?.draggableItems]
  );
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

    const savedChoices = storage.getItem(storageKey("choices", examId, question.id));
    if (savedChoices) {
      try {
        setSelectedChoices(JSON.parse(savedChoices) as string[]);
      } catch {
        // Ignore invalid persisted values.
      }
    }

    const savedAssignments = storage.getItem(storageKey("drag", examId, question.id));
    if (savedAssignments) {
      try {
        setAssignments(JSON.parse(savedAssignments) as DragAssignments);
      } catch {
        // Ignore invalid persisted values.
      }
    } else if (dropZones.length > 0) {
      const emptyState = Object.fromEntries(dropZones.map((zone) => [zone.id, null]));
      setAssignments(emptyState);
    }

    const savedManual = storage.getItem(storageKey("manual", examId, question.id));
    if (savedManual) {
      setManualNotes(savedManual);
    }

    const savedCode = storage.getItem(storageKey("code", examId, question.id));
    if (savedCode) {
      setCodeText(savedCode);
    }
  }, [dropZones, examId, question.id]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage) {
      return;
    }
    storage.setItem(
      storageKey("choices", examId, question.id),
      JSON.stringify(selectedChoices)
    );
  }, [selectedChoices, examId, question.id]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage) {
      return;
    }
    storage.setItem(storageKey("drag", examId, question.id), JSON.stringify(assignments));
  }, [assignments, examId, question.id]);

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
    storage.setItem(storageKey("code", examId, question.id), codeText);
  }, [codeText, examId, question.id]);

  const assignedItemIds = useMemo(() => {
    return new Set(Object.values(assignments).filter(Boolean));
  }, [assignments]);

  const placeItem = (zoneId: string, itemId: string) => {
    setZoneStatus({});
    setFeedback("");
    setAssignments((current) => {
      const updated = { ...current };
      Object.keys(updated).forEach((key) => {
        if (updated[key] === itemId) {
          updated[key] = null;
        }
      });
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

          return (
            <figure key={`${page}-${pageIndex}`} className={styles.overlayFigure}>
              <img
                src={page}
                alt={`Oppgaveside ${pageIndex + 1}`}
                className={styles.overlayImage}
                loading={pageIndex === 0 ? "eager" : "lazy"}
              />
              <div className={styles.overlayLayer}>
                {zonesOnPage.map((zone, zoneIndex) => {
                  const rect = zone.rect ?? getAutoRectForZone(zoneIndex, zonesOnPage.length);
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
                        left: `${rect.x * 100}%`,
                        top: `${rect.y * 100}%`,
                        width: `${rect.w * 100}%`,
                        height: `${rect.h * 100}%`,
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const item = event.dataTransfer.getData("text/plain");
                        if (item) {
                          placeItem(zone.id, item);
                          setActiveItemId(null);
                        }
                      }}
                      onClick={() => {
                        if (activeItemId) {
                          placeItem(zone.id, activeItemId);
                          setActiveItemId(null);
                        }
                      }}
                    >
                      {itemLabel ? (
                        <>
                          <span className={styles.overlayText}>{itemLabel}</span>
                          <button
                            className={styles.overlayClear}
                            onClick={(event) => {
                              event.stopPropagation();
                              setAssignments((current) => ({ ...current, [zone.id]: null }));
                              setZoneStatus({});
                              setFeedback("");
                            }}
                            aria-label={`Fjern brikke fra ${zone.label}`}
                          >
                            ×
                          </button>
                        </>
                      ) : (
                        <span className={styles.overlayPlaceholder}>{zone.label}</span>
                      )}
                    </div>
                  );
                })}
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
      if (options.length === 0) {
        return (
          <div className={styles.manualBlock}>
            <p className={styles.note}>{question.interaction?.instructions}</p>
            <label className={styles.label} htmlFor="manual-notes">
              Egne notater
            </label>
            <textarea
              id="manual-notes"
              className={styles.textarea}
              value={manualNotes}
              onChange={(event) => setManualNotes(event.target.value)}
              placeholder="Skriv din vurdering her..."
            />
            <div className={styles.actions}>
              <button className={styles.secondaryButton} onClick={() => setManualNotes("")}>Nullstill notater</button>
            </div>
          </div>
        );
      }

      return (
        <div>
          <p className={styles.note}>{question.interaction?.instructions}</p>
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
        <div>
          <p className={styles.note}>{question.interaction?.instructions}</p>
          <p className={styles.subtle}>
            Dra brikker direkte inn i oppgaven. Du kan også klikke en brikke og så klikke plassering.
          </p>
          <div className={styles.dragLayout}>
            <div className={styles.panel}>
              <h3>Brikker</h3>
              <div className={styles.tokenList}>
                {draggableItems.map((item) => {
                  const used = assignedItemIds.has(item.id);
                  return (
                    <button
                      key={item.id}
                      className={`${styles.token} ${activeItemId === item.id ? styles.tokenActive : ""} ${
                        used ? styles.tokenUsed : ""
                      }`}
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
          <p className={styles.subtitle}>Type: {question.type}</p>
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
            : (
              <PageImageStack
                pages={showSolution ? question.solutionPages : question.promptPages}
                label={showSolution ? "Fasitside" : "Oppgaveside"}
              />
            )}
        </section>

        <aside className={styles.sidebar}>
          <h2>Interaktiv øving</h2>
          {renderInteraction()}
          {feedback ? <p className={styles.feedback}>{feedback}</p> : null}
          <p className={styles.hint}>
            Offisiell løsning vises alltid med knappen <strong>Vis fasit</strong>.
          </p>
        </aside>
      </div>
    </div>
  );
}
