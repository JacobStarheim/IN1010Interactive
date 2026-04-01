"use client";

import { useEffect, useMemo, useState } from "react";

import { QuestionWorkspace } from "@/components/exam/question-workspace";
import { useExamTimer } from "@/components/exam/use-exam-timer";
import { useLocale } from "@/components/i18n/locale-provider";
import type { ExamManifest } from "@/lib/exam-types";
import {
  EXAM_DURATION_MS,
  formatDuration,
  getBrowserStorage,
  readJson,
  submissionStorageKey,
  type SubmissionResult,
} from "@/lib/exam-progress";
import { clearExamProgress, gradeExamSubmission } from "@/lib/exam-submission";
import { formatDateTime, formatTime } from "@/lib/i18n";
import styles from "@/components/exam/exam-session.module.css";

type Props = {
  exam: ExamManifest;
};

export function ExamSession({ exam }: Props) {
  const { locale } = useLocale();
  const isEnglish = locale === "en";
  const [resetToken, setResetToken] = useState(0);
  const [submission, setSubmission] = useState<SubmissionResult | null>(null);
  const {
    timerState,
    isEditingTimer,
    timerDraft,
    timerProgress,
    handleTimerDraftChange,
    handleOpenTimerEditor,
    handleCancelTimerEditor,
    handleApplyTimerDraft,
    handleStartTimer,
    handlePauseTimer,
    handleResumeTimer,
    handleResetTimer,
    resetTimerState,
  } = useExamTimer({ examId: exam.id, isEnglish });

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
      isEnglish
        ? "Reset the entire exam? This deletes all saved answers and notes for this exam."
        : "Nullstille hele eksamen? Dette sletter alle lagrede svar og notater for denne eksamenen."
    );
    if (!approved) {
      return;
    }

    clearExamProgress(exam.id, storage);
    setSubmission(null);
    resetTimerState();
    setResetToken((current) => current + 1);
  };

  const handleSubmitExam = () => {
    const storage = getBrowserStorage();
    if (!storage) {
      return;
    }

    const result = gradeExamSubmission(exam, storage);
    if (!result) {
      setSubmission(null);
      return;
    }

    storage.setItem(submissionStorageKey(exam.id), JSON.stringify(result));
    setSubmission(result);
  };
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
      ? isEnglish
        ? "Time is up"
        : "Tiden er ute"
      : timerState.status === "paused"
        ? isEnglish
          ? "Timer paused"
          : "Timer pauset"
        : timerState.status === "running"
          ? isEnglish
            ? "Exam mode running"
            : "Eksamensmodus pågår"
          : timerState.durationMs === EXAM_DURATION_MS
            ? isEnglish
              ? "Ready for a 2-hour simulation"
              : "Klar for 2 timers simulering"
            : isEnglish
              ? "Ready for a custom simulation"
              : "Klar for tilpasset simulering";
  const startButtonLabel =
    timerState.durationMs === EXAM_DURATION_MS
      ? isEnglish
        ? "Start 2h timer"
        : "Start 2t timer"
      : isEnglish
        ? "Start timer"
        : "Start timer";

  return (
    <>
      <section className={`card ${styles.controlsCard}`}>
        <div className={styles.controlsLayout}>
          <div className={styles.controlPanel}>
            <div className={styles.buttonRow}>
              <button type="button" className={styles.primaryButton} onClick={handleSubmitExam}>
                {isEnglish ? "Submit exam" : "Lever eksamen"}
              </button>
              <button type="button" className={styles.secondaryButton} onClick={handleResetExam}>
                {isEnglish ? "Reset entire exam" : "Nullstill hele eksamen"}
              </button>
            </div>

            {submission ? (
              <div className={styles.resultCard}>
                <p className={styles.resultGrade}>
                  {isEnglish ? "Grade:" : "Karakter:"} <strong>{submission.grade}</strong>
                </p>
                <p>
                  {isEnglish ? "Points (0-100):" : "Poeng (0-100):"}{" "}
                  <strong>{submission.points100.toFixed(1)}</strong>
                </p>
                <p>
                  {isEnglish ? "Correct answers:" : "Riktige svar:"} {submission.totalCorrect} /{" "}
                  {submission.totalPossible} (
                  {submission.gradedQuestions}{" "}
                  {isEnglish ? "auto-graded questions" : "autovurderte oppgaver"})
                </p>
                <p className={styles.resultMeta}>
                  {isEnglish
                    ? "Grade boundaries used: A 85+, B 75+, C 55+, D 45+, E 30+, F below 30."
                    : "Karaktergrenser brukt: A 85+, B 75+, C 55+, D 45+, E 30+, F under 30."}
                </p>
                <p className={styles.resultMeta}>
                  {isEnglish ? "Submitted:" : "Tidspunkt:"}{" "}
                  {formatDateTime(submission.submittedAt, locale)}
                </p>
                <p className={styles.resultDisclaimer}>
                  {isEnglish
                    ? "Note: only questions with machine-readable answer keys are auto-graded."
                    : "Merk: kun oppgaver med maskinlesbar fasit blir autovurdert."}
                </p>
              </div>
            ) : (
              <p className={styles.resultMeta}>
                {isEnglish
                  ? "Submit the exam to get an auto-graded result and grade."
                  : "Lever eksamen for å få autovurdering og karakter."}
              </p>
            )}
          </div>

          <aside className={`${styles.timerCard} ${timerToneClass}`}>
            <div className={styles.timerHeader}>
              <p className={styles.timerEyebrow}>{isEnglish ? "Exam mode" : "Eksamensmodus"}</p>
              <strong className={styles.timerLabel}>{timerLabel}</strong>
            </div>

            <button
              type="button"
              className={styles.timerValueButton}
              onClick={handleOpenTimerEditor}
              aria-label={
                isEnglish ? "Change the time on the exam timer" : "Endre tid på eksamenstimeren"
              }
            >
              <span className={styles.timerValue}>{formatDuration(timerState.remainingMs)}</span>
              <span className={styles.timerValueHint}>
                {isEnglish ? "Tap to change time" : "Trykk for å endre tid"}
              </span>
            </button>

            {isEditingTimer ? (
              <div className={styles.timerEditor}>
                <div className={styles.timerInputs}>
                  <label className={styles.timerField}>
                    <span>{isEnglish ? "Hours" : "Timer"}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={timerDraft.hours}
                      onChange={handleTimerDraftChange("hours")}
                    />
                  </label>
                  <label className={styles.timerField}>
                    <span>{isEnglish ? "Min" : "Min"}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={timerDraft.minutes}
                      onChange={handleTimerDraftChange("minutes")}
                    />
                  </label>
                  <label className={styles.timerField}>
                    <span>{isEnglish ? "Sec" : "Sek"}</span>
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
                    {isEnglish ? "Save time" : "Lagre tid"}
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={handleCancelTimerEditor}
                  >
                    {isEnglish ? "Cancel" : "Avbryt"}
                  </button>
                </div>
              </div>
            ) : null}

            <div className={styles.timerTrack} aria-hidden="true">
              <div className={styles.timerFill} style={{ width: `${timerProgress}%` }} />
            </div>

            <p className={styles.timerMeta}>
              {timerState.startedAt
                ? `${isEnglish ? "Started" : "Startet"} ${formatTime(timerState.startedAt, locale)}`
                : isEnglish
                  ? "Press start when you want to run a full timed exam simulation."
                  : "Trykk start når du vil kjøre en full 2-timers simulering."}
            </p>

            <div className={styles.timerActions}>
              {!isEditingTimer ? (
                <button type="button" className={styles.secondaryButton} onClick={handleOpenTimerEditor}>
                  {isEnglish ? "Change time" : "Endre tid"}
                </button>
              ) : null}

              {timerState.status === "idle" ? (
                <button type="button" className={styles.primaryButton} onClick={handleStartTimer}>
                  {startButtonLabel}
                </button>
              ) : null}

              {timerState.status === "running" ? (
                <button type="button" className={styles.secondaryButton} onClick={handlePauseTimer}>
                  {isEnglish ? "Pause" : "Pause"}
                </button>
              ) : null}

              {timerState.status === "paused" ? (
                <button type="button" className={styles.primaryButton} onClick={handleResumeTimer}>
                  {isEnglish ? "Resume" : "Fortsett"}
                </button>
              ) : null}

              {timerState.status === "finished" ? (
                <button type="button" className={styles.primaryButton} onClick={handleStartTimer}>
                  {isEnglish ? "Start new 2h timer" : "Start ny 2t timer"}
                </button>
              ) : null}

              {timerState.status !== "idle" ? (
                <button type="button" className={styles.secondaryButton} onClick={handleResetTimer}>
                  {isEnglish ? "Reset timer" : "Nullstill timer"}
                </button>
              ) : null}
            </div>
          </aside>
        </div>
      </section>

      <section className={`card ${styles.jumpCard}`}>
        {jumpTargets.map((target) => (
          <a key={target.id} href={`#${target.id}`} className={styles.jumpLink}>
            {isEnglish ? "Question" : "Oppgave"} {target.number}
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
