"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";

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
  const [isEditingTimer, setIsEditingTimer] = useState(false);
  const [timerDraft, setTimerDraft] = useState({
    hours: "2",
    minutes: "00",
    seconds: "00",
  });

  const syncTimerDraftFromState = useCallback((state: ExamTimerState) => {
    const totalSeconds = Math.max(0, Math.floor(state.remainingMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    setTimerDraft({
      hours: String(hours),
      minutes: String(minutes).padStart(2, "0"),
      seconds: String(seconds).padStart(2, "0"),
    });
  }, []);

  const persistTimerState = useCallback(
    (next: ExamTimerState) => {
      const storage = getBrowserStorage();
      if (!storage) {
        return;
      }

      const isDefaultIdle =
        next.status === "idle" &&
        next.durationMs === EXAM_DURATION_MS &&
        next.remainingMs === EXAM_DURATION_MS &&
        !next.startedAt &&
        !next.endsAt &&
        !next.finishedAt;

      if (isDefaultIdle) {
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
    syncTimerDraftFromState(resolved);

    if (saved && JSON.stringify(saved) !== JSON.stringify(resolved)) {
      storage.setItem(timerStorageKey(exam.id), JSON.stringify(resolved));
    }
  }, [exam.id, syncTimerDraftFromState]);

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
    const resetTimer = defaultExamTimerState();
    setTimerState(resetTimer);
    syncTimerDraftFromState(resetTimer);
    setIsEditingTimer(false);
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

  const handleTimerDraftChange =
    (field: "hours" | "minutes" | "seconds") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const digitsOnly = event.target.value.replace(/\D/g, "");
      setTimerDraft((current) => ({
        ...current,
        [field]: digitsOnly,
      }));
    };

  const handleOpenTimerEditor = () => {
    syncTimerDraftFromState(timerState);
    setIsEditingTimer(true);
  };

  const handleCancelTimerEditor = () => {
    syncTimerDraftFromState(timerState);
    setIsEditingTimer(false);
  };

  const handleApplyTimerDraft = () => {
    const hours = Number(timerDraft.hours || "0");
    const minutes = Number(timerDraft.minutes || "0");
    const seconds = Number(timerDraft.seconds || "0");
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;

    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
      window.alert("Velg en tid som er større enn 0 sekunder.");
      return;
    }

    const nextDurationMs = totalSeconds * 1000;
    const now = Date.now();
    const next: ExamTimerState =
      timerState.status === "running"
        ? {
            status: "running",
            durationMs: nextDurationMs,
            remainingMs: nextDurationMs,
            startedAt: new Date(now).toISOString(),
            endsAt: new Date(now + nextDurationMs).toISOString(),
            finishedAt: null,
          }
        : {
            status: timerState.status === "paused" ? "paused" : "idle",
            durationMs: nextDurationMs,
            remainingMs: nextDurationMs,
            startedAt: null,
            endsAt: null,
            finishedAt: null,
          };

    setTimerState(next);
    persistTimerState(next);
    syncTimerDraftFromState(next);
    setIsEditingTimer(false);
  };

  const handleStartTimer = () => {
    const now = Date.now();
    const next: ExamTimerState = {
      status: "running",
      durationMs: timerState.durationMs || EXAM_DURATION_MS,
      remainingMs: timerState.durationMs || EXAM_DURATION_MS,
      startedAt: new Date(now).toISOString(),
      endsAt: new Date(now + (timerState.durationMs || EXAM_DURATION_MS)).toISOString(),
      finishedAt: null,
    };
    setTimerState(next);
    persistTimerState(next);
    setIsEditingTimer(false);
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
      syncTimerDraftFromState(next);
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
      setIsEditingTimer(false);
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
    syncTimerDraftFromState(next);
    setIsEditingTimer(false);
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
          : timerState.durationMs === EXAM_DURATION_MS
            ? "Klar for 2 timers simulering"
            : "Klar for tilpasset simulering";
  const startButtonLabel =
    timerState.durationMs === EXAM_DURATION_MS ? "Start 2t timer" : "Start timer";

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

            <button
              type="button"
              className={styles.timerValueButton}
              onClick={handleOpenTimerEditor}
              aria-label="Endre tid på eksamenstimeren"
            >
              <span className={styles.timerValue}>{formatDuration(timerState.remainingMs)}</span>
              <span className={styles.timerValueHint}>Trykk for å endre tid</span>
            </button>

            {isEditingTimer ? (
              <div className={styles.timerEditor}>
                <div className={styles.timerInputs}>
                  <label className={styles.timerField}>
                    <span>Timer</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={timerDraft.hours}
                      onChange={handleTimerDraftChange("hours")}
                    />
                  </label>
                  <label className={styles.timerField}>
                    <span>Min</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={timerDraft.minutes}
                      onChange={handleTimerDraftChange("minutes")}
                    />
                  </label>
                  <label className={styles.timerField}>
                    <span>Sek</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={timerDraft.seconds}
                      onChange={handleTimerDraftChange("seconds")}
                    />
                  </label>
                </div>
                <div className={styles.timerEditorActions}>
                  <button type="button" className={styles.primaryButton} onClick={handleApplyTimerDraft}>
                    Lagre tid
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={handleCancelTimerEditor}
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            ) : null}

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
              {!isEditingTimer ? (
                <button type="button" className={styles.secondaryButton} onClick={handleOpenTimerEditor}>
                  Endre tid
                </button>
              ) : null}

              {timerState.status === "idle" ? (
                <button type="button" className={styles.primaryButton} onClick={handleStartTimer}>
                  {startButtonLabel}
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
