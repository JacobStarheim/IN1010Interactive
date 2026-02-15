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
            Dra brikker inn i slottene, eller klikk en brikke og deretter en slot.
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
                      className={`${styles.token} ${activeItemId === item.id ? styles.tokenActive : ""}`}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", item.id);
                      }}
                      onClick={() => setActiveItemId(item.id)}
                      disabled={used}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className={styles.panel}>
              <h3>Slots</h3>
              <div className={styles.slotList}>
                {dropZones.map((zone) => {
                  const itemId = assignments[zone.id];
                  const itemLabel = draggableItems.find((item) => item.id === itemId)?.label;
                  return (
                    <div
                      key={zone.id}
                      className={styles.slot}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const item = event.dataTransfer.getData("text/plain");
                        if (item) {
                          placeItem(zone.id, item);
                          setFeedback("");
                        }
                      }}
                      onClick={() => {
                        if (activeItemId) {
                          placeItem(zone.id, activeItemId);
                          setActiveItemId(null);
                          setFeedback("");
                        }
                      }}
                    >
                      <div className={styles.slotLabel}>{zone.label}</div>
                      <div className={styles.slotValue}>{itemLabel ?? "(tom)"}</div>
                      {itemId ? (
                        <button
                          className={styles.inlineClear}
                          onClick={(event) => {
                            event.stopPropagation();
                            setAssignments((current) => ({ ...current, [zone.id]: null }));
                            setFeedback("");
                          }}
                        >
                          Fjern
                        </button>
                      ) : null}
                    </div>
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
          <PageImageStack
            pages={showSolution ? question.solutionPages : question.promptPages}
            label={showSolution ? "Fasitside" : "Oppgaveside"}
          />
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
