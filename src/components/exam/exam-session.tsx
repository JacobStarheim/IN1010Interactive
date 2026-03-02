"use client";

import { useEffect, useMemo, useState } from "react";

import { QuestionWorkspace } from "@/components/exam/question-workspace";
import type { ChoiceZone, ExamManifest } from "@/lib/exam-types";
import {
  evaluateChoiceSelection,
  evaluateChoiceZones,
  evaluateDragAssignments,
  type ChoiceZoneValues,
  type DragAssignments,
} from "@/lib/interaction";
import styles from "@/components/exam/exam-session.module.css";

type Props = {
  exam: ExamManifest;
};

type Grade = "A" | "B" | "C" | "D" | "E" | "F";

type SubmissionResult = {
  submittedAt: string;
  gradedQuestions: number;
  totalCorrect: number;
  totalPossible: number;
  points100: number;
  grade: Grade;
};

const storageKey = (kind: string, examId: string, questionId: string) =>
  `in1010:${kind}:${examId}:${questionId}`;

const submissionStorageKey = (examId: string) => `in1010:submission:${examId}`;

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

const hasChoiceZoneAnswerKey = (choiceZones: ChoiceZone[]) =>
  choiceZones.some(
    (zone) =>
      typeof zone.correct === "boolean" ||
      typeof zone.answer === "string" ||
      (zone.answers?.length ?? 0) > 0
  );

const gradeFromPoints = (points100: number): Grade => {
  if (points100 >= 85) return "A";
  if (points100 >= 75) return "B";
  if (points100 >= 55) return "C";
  if (points100 >= 45) return "D";
  if (points100 >= 30) return "E";
  return "F";
};

const readJson = <T,>(storage: Storage, key: string, fallback: T): T => {
  const raw = storage.getItem(key);
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export function ExamSession({ exam }: Props) {
  const [resetToken, setResetToken] = useState(0);
  const [submission, setSubmission] = useState<SubmissionResult | null>(null);

  useEffect(() => {
    const storage = getStorage();
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
    const storage = getStorage();
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
      if (key === `in1010:visited:${exam.id}` || key === submissionStorageKey(exam.id)) {
        keysToDelete.push(key);
        continue;
      }
      if (key.startsWith("in1010:") && key.includes(`:${exam.id}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => storage.removeItem(key));
    setSubmission(null);
    setResetToken((current) => current + 1);
  };

  const handleSubmitExam = () => {
    const storage = getStorage();
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

  return (
    <>
      <section className={`card ${styles.controlsCard}`}>
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
