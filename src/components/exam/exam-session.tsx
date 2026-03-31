"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { QuestionWorkspace } from "@/components/exam/question-workspace";
import type { ChoiceZone, ExamManifest } from "@/lib/exam-types";
import {
  evaluateChoiceSelection,
  evaluateChoiceZones,
  evaluateDragAssignments,
  type ChoiceZoneValues,
  type DragAssignments,
} from "@/lib/interaction";
import {
  EXAM_DURATION_MS,
  defaultExamTimerState,
  formatDuration,
  gradeFromPoints,
  getBrowserStorage,
  readJson,
  resolveExamTimerState,
  storageKey,
  submissionStorageKey,
  timerStorageKey,
  type ExamTimerState,
  type SubmissionResult,
} from "@/lib/exam-progress";
import styles from "@/components/exam/exam-session.module.css";

type Props = {
  exam: ExamManifest;
};

const hasChoiceZoneAnswerKey = (choiceZones: ChoiceZone[]) =>
  choiceZones.some(
    (zone) =>
      typeof zone.correct === "boolean" ||
      typeof zone.answer === "string" ||
      (zone.answers?.length ?? 0) > 0
  );

export function ExamSession({ exam }: Props) {
  const [resetToken, setResetToken] = useState(0);
  const [submission, setSubmission] = useState<SubmissionResult | null>(null);
  const [timerState, setTimerState] = useState<ExamTimerState>(defaultExamTimerState);

  const persistTimerState = useCallback(
    (next: ExamTimerState) => {
      const storage = getBrowserStorage();
      if (!storage) {
        return;
      }

      if (next.status === "idle") {
        storage.removeItem(timerStorageKey(exam.id));
        return;
      }

      storage.setItem(timerStorageKey(exam.id), JSON.stringify(next));
    },
    [exam.id]
  );

  useEffect(() => {
    const storage = getBrowserStorage();
    if (!storage) {
      return;
    }
    const saved = readJson<SubmissionResult | null>(
      storage,
      submissionStorageKey(exam.id),
      null
    );
    setSubmission(saved);
  }, [exam.id]);

  useEffect(() => {
    const storage = getBrowserStorage();
    if (!storage) {
      return;
    }

    const saved = readJson<ExamTimerState | null>(storage, timerStorageKey(exam.id), null);
    const resolved = resolveExamTimerState(saved);
    setTimerState(resolved);

    if (saved && JSON.stringify(saved) !== JSON.stringify(resolved)) {
      storage.setItem(timerStorageKey(exam.id), JSON.stringify(resolved));
    }
  }, [exam.id]);

  useEffect(() => {
    if (timerState.status !== "running") {
      return;
    }

    const intervalId = window.setInterval(() => {
      setTimerState((current) => {
        const next = resolveExamTimerState(current, Date.now());
        if (next.status !== current.status || next.remainingMs !== current.remainingMs) {
          if (next.status === "finished") {
            persistTimerState(next);
          }
          return next;
        }
        return current;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [persistTimerState, timerState.status]);

  const jumpTargets = useMemo(
    () =>
      exam.questions.map((question) => ({
        id: question.id,
        number: question.number,
      })),
    [exam.questions]
  );

  const handleResetExam = () => {
    const storage = getBrowserStorage();
    if (!storage) {
      return;
    }

    const approved = window.confirm(
      "Nullstille hele eksamen? Dette sletter alle lagrede svar og notater for denne eksamenen."
    );
    if (!approved) {
      return;
    }

    const keysToDelete: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key) {
        continue;
      }
      if (
        key === `in1010:visited:${exam.id}` ||
        key === submissionStorageKey(exam.id) ||
        key === timerStorageKey(exam.id)
      ) {
        keysToDelete.push(key);
        continue;
      }
      if (key.startsWith("in1010:") && key.includes(`:${exam.id}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => storage.removeItem(key));
    setSubmission(null);
    setTimerState(defaultExamTimerState());
    setResetToken((current) => current + 1);
  };

  const handleSubmitExam = () => {
    const storage = getBrowserStorage();
    if (!storage) {
      return;
    }

    let totalCorrect = 0;
    let totalPossible = 0;
    let gradedQuestions = 0;

    exam.questions.forEach((question) => {
      const interaction = question.interaction;
      if (!interaction) {
        return;
      }

      const dropZones = interaction.dropZones ?? [];
      const draggableItems = interaction.draggableItems ?? [];
      if (question.type === "drag-drop" && dropZones.length > 0 && draggableItems.length > 0) {
        const emptyAssignments = Object.fromEntries(
          dropZones.map((zone) => [zone.id, null])
        ) as DragAssignments;
        const savedAssignments = readJson<DragAssignments>(
          storage,
          storageKey("drag", exam.id, question.id),
          emptyAssignments
        );
        const result = evaluateDragAssignments(savedAssignments, dropZones);
        gradedQuestions += 1;
        totalCorrect += result.correct;
        totalPossible += result.total;
        return;
      }

      const choiceZones = interaction.choiceZones ?? [];
      if (
        question.type === "choice-grid" &&
        choiceZones.length > 0 &&
        hasChoiceZoneAnswerKey(choiceZones)
      ) {
        const defaultValues = choiceZones.reduce<ChoiceZoneValues>((acc, zone) => {
          acc[zone.id] = zone.kind === "text" ? "" : false;
          return acc;
        }, {});
        const savedValues = readJson<ChoiceZoneValues>(
          storage,
          storageKey("choice-zones", exam.id, question.id),
          defaultValues
        );
        const result = evaluateChoiceZones(savedValues, choiceZones);
        if (result.total > 0) {
          gradedQuestions += 1;
          totalCorrect += result.correct;
          totalPossible += result.total;
        }
        return;
      }

      const options = interaction.options ?? [];
      if (question.type === "choice-grid" && options.length > 0) {
        const validOptionIds = new Set(options.map((option) => option.id));
        const savedSelected = readJson<string[]>(
          storage,
          storageKey("choice", exam.id, question.id),
          []
        ).filter((id) => validOptionIds.has(id));
        const result = evaluateChoiceSelection(savedSelected, options);
        if (result.total > 0) {
          gradedQuestions += 1;
          totalCorrect += result.correct;
          totalPossible += result.total;
        }
      }
    });

    if (totalPossible === 0) {
      setSubmission(null);
      return;
    }

    const points100 = Number(((totalCorrect / totalPossible) * 100).toFixed(1));
    const result: SubmissionResult = {
      submittedAt: new Date().toISOString(),
      gradedQuestions,
      totalCorrect,
      totalPossible,
      points100,
      grade: gradeFromPoints(points100),
    };

    storage.setItem(submissionStorageKey(exam.id), JSON.stringify(result));
    setSubmission(result);
  };

  const handleStartTimer = () => {
    const now = Date.now();
    const next: ExamTimerState = {
      status: "running",
      durationMs: EXAM_DURATION_MS,
      remainingMs: EXAM_DURATION_MS,
      startedAt: new Date(now).toISOString(),
      endsAt: new Date(now + EXAM_DURATION_MS).toISOString(),
      finishedAt: null,
    };
    setTimerState(next);
    persistTimerState(next);
  };

  const handlePauseTimer = () => {
    setTimerState((current) => {
      const running = resolveExamTimerState(current, Date.now());
      if (running.status !== "running") {
        return current;
      }

      const next: ExamTimerState = {
        ...running,
        status: "paused",
        endsAt: null,
      };
      persistTimerState(next);
      return next;
    });
  };

  const handleResumeTimer = () => {
    const now = Date.now();
    setTimerState((current) => {
      if (current.status !== "paused") {
        return current;
      }

      const next: ExamTimerState = {
        ...current,
        status: "running",
        endsAt: new Date(now + current.remainingMs).toISOString(),
        startedAt: current.startedAt ?? new Date(now).toISOString(),
        finishedAt: null,
      };
      persistTimerState(next);
      return next;
    });
  };

  const handleResetTimer = () => {
    const approved = window.confirm("Nullstille 2-timers timeren for denne eksamenen?");
    if (!approved) {
      return;
    }

    const next = defaultExamTimerState();
    setTimerState(next);
    persistTimerState(next);
  };

  const timerProgress = Math.max(
    0,
    Math.min(100, (timerState.remainingMs / timerState.durationMs) * 100)
  );
  const timerToneClass =
    timerState.status === "finished"
      ? styles.timerFinished
      : timerState.status === "paused"
        ? styles.timerPaused
        : timerState.status === "running"
          ? styles.timerRunning
          : styles.timerIdle;
  const timerLabel =
    timerState.status === "finished"
      ? "Tiden er ute"
      : timerState.status === "paused"
        ? "Timer pauset"
        : timerState.status === "running"
          ? "Eksamensmodus pågår"
          : "Klar for 2 timers simulering";

  return (
    <>
      <section className={`card ${styles.controlsCard}`}>
        <div className={styles.controlsLayout}>
          <div className={styles.controlPanel}>
            <div className={styles.buttonRow}>
              <button type="button" className={styles.primaryButton} onClick={handleSubmitExam}>
                Lever eksamen
              </button>
              <button type="button" className={styles.secondaryButton} onClick={handleResetExam}>
                Nullstill hele eksamen
              </button>
            </div>

            {submission ? (
              <div className={styles.resultCard}>
                <p className={styles.resultGrade}>
                  Karakter: <strong>{submission.grade}</strong>
                </p>
                <p>
                  Poeng (0-100): <strong>{submission.points100.toFixed(1)}</strong>
                </p>
                <p>
                  Riktige svar: {submission.totalCorrect} / {submission.totalPossible} (
                  {submission.gradedQuestions} autovurderte oppgaver)
                </p>
                <p className={styles.resultMeta}>
                  Karaktergrenser brukt: A 85+, B 75+, C 55+, D 45+, E 30+, F under 30.
                </p>
                <p className={styles.resultMeta}>
                  Tidspunkt: {new Date(submission.submittedAt).toLocaleString("nb-NO")}
                </p>
                <p className={styles.resultDisclaimer}>
                  Merk: kun oppgaver med maskinlesbar fasit blir autovurdert.
                </p>
              </div>
            ) : (
              <p className={styles.resultMeta}>
                Lever eksamen for å få autovurdering og karakter.
              </p>
            )}
          </div>

          <aside className={`${styles.timerCard} ${timerToneClass}`}>
            <div className={styles.timerHeader}>
              <p className={styles.timerEyebrow}>Eksamensmodus</p>
              <strong className={styles.timerLabel}>{timerLabel}</strong>
            </div>

            <p className={styles.timerValue}>{formatDuration(timerState.remainingMs)}</p>

            <div className={styles.timerTrack} aria-hidden="true">
              <div className={styles.timerFill} style={{ width: `${timerProgress}%` }} />
            </div>

            <p className={styles.timerMeta}>
              {timerState.startedAt
                ? `Startet ${new Date(timerState.startedAt).toLocaleTimeString("nb-NO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Trykk start når du vil kjøre en full 2-timers simulering."}
            </p>

            <div className={styles.timerActions}>
              {timerState.status === "idle" ? (
                <button type="button" className={styles.primaryButton} onClick={handleStartTimer}>
                  Start 2t timer
                </button>
              ) : null}

              {timerState.status === "running" ? (
                <button type="button" className={styles.secondaryButton} onClick={handlePauseTimer}>
                  Pause
                </button>
              ) : null}

              {timerState.status === "paused" ? (
                <button type="button" className={styles.primaryButton} onClick={handleResumeTimer}>
                  Fortsett
                </button>
              ) : null}

              {timerState.status === "finished" ? (
                <button type="button" className={styles.primaryButton} onClick={handleStartTimer}>
                  Start ny 2t timer
                </button>
              ) : null}

              {timerState.status !== "idle" ? (
                <button type="button" className={styles.secondaryButton} onClick={handleResetTimer}>
                  Nullstill timer
                </button>
              ) : null}
            </div>
          </aside>
        </div>
      </section>

      <section className={`card ${styles.jumpCard}`}>
        {jumpTargets.map((target) => (
          <a key={target.id} href={`#${target.id}`} className={styles.jumpLink}>
            Oppgave {target.number}
          </a>
        ))}
      </section>

      <div className={styles.stack}>
        {exam.questions.map((question) => (
          <section key={question.id} id={question.id} className="card">
            <QuestionWorkspace examId={exam.id} question={question} resetToken={resetToken} />
          </section>
        ))}
      </div>
    </>
  );
}
