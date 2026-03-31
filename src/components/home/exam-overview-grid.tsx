"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";
import { LOCAL_PROGRESS_CHANGE_EVENT } from "@/lib/cloud-progress";
import type { ExamManifest, ExamId } from "@/lib/exam-types";
import {
  getBrowserStorage,
  readJson,
  submissionStorageKey,
  type SubmissionResult,
} from "@/lib/exam-progress";
import { formatDateTime, formatExamTitle } from "@/lib/i18n";
import styles from "@/app/page.module.css";

type Props = {
  exams: ExamManifest[];
};

type SubmissionMap = Partial<Record<ExamId, SubmissionResult>>;

const readSubmissionMap = (exams: ExamManifest[]): SubmissionMap => {
  const storage = getBrowserStorage();
  if (!storage) {
    return {};
  }

  return exams.reduce<SubmissionMap>((acc, exam) => {
    const result = readJson<SubmissionResult | null>(storage, submissionStorageKey(exam.id), null);
    if (result) {
      acc[exam.id] = result;
    }
    return acc;
  }, {});
};

const gradeClassName = (grade: SubmissionResult["grade"]) => {
  switch (grade) {
    case "A":
      return styles.gradeA;
    case "B":
      return styles.gradeB;
    case "C":
      return styles.gradeC;
    case "D":
      return styles.gradeD;
    case "E":
      return styles.gradeE;
    default:
      return styles.gradeF;
  }
};

export function ExamOverviewGrid({ exams }: Props) {
  const { locale } = useLocale();
  const [submissions, setSubmissions] = useState<SubmissionMap>({});

  const syncSubmissions = useMemo(
    () => () => {
      setSubmissions(readSubmissionMap(exams));
    },
    [exams]
  );

  useEffect(() => {
    syncSubmissions();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        syncSubmissions();
      }
    };

    window.addEventListener("focus", syncSubmissions);
    window.addEventListener("storage", syncSubmissions);
    window.addEventListener(LOCAL_PROGRESS_CHANGE_EVENT, syncSubmissions);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", syncSubmissions);
      window.removeEventListener("storage", syncSubmissions);
      window.removeEventListener(LOCAL_PROGRESS_CHANGE_EVENT, syncSubmissions);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [syncSubmissions]);

  return (
    <section className={`card ${styles.grid}`}>
      {exams.map((exam) => {
        const submission = submissions[exam.id];
        const completed = Boolean(submission);

        return (
          <Link
            key={exam.id}
            href={`/eksamen/${exam.id}`}
            className={`${styles.examCard} ${completed ? styles.examCardCompleted : ""}`}
          >
            <div className={styles.examHeader}>
              <div>
                <h2>{formatExamTitle(exam.id, locale)}</h2>
                <p>
                  {exam.questions.length} {locale === "en" ? "questions" : "oppgaver"}
                </p>
              </div>

              {submission ? (
                <div className={styles.statusCluster}>
                  <span className={styles.completionSeal} aria-hidden="true">
                    ✓
                  </span>
                  <span className={`${styles.gradeBadge} ${gradeClassName(submission.grade)}`}>
                    {submission.grade}
                  </span>
                </div>
              ) : null}
            </div>

            {submission ? (
              <div className={styles.completionPanel}>
                <span className={styles.completionKicker}>
                  {locale === "en" ? "Completed" : "Fullført"}
                </span>
                <p className={styles.completionSummary}>
                  {submission.points100.toFixed(1)} {locale === "en" ? "points" : "poeng"} ·{" "}
                  {submission.totalCorrect}/{submission.totalPossible}{" "}
                  {locale === "en" ? "correct" : "riktige"}
                </p>
                <p className={styles.completionMeta}>
                  {locale === "en" ? "Submitted" : "Levert"}{" "}
                  {formatDateTime(submission.submittedAt, locale)}
                </p>
              </div>
            ) : null}

            <span className={`${styles.open} ${completed ? styles.openCompleted : ""}`}>
              {completed
                ? locale === "en"
                  ? "Resume or view result"
                  : "Fortsett eller se resultat"
                : locale === "en"
                ? "Open exam"
                : "Åpne eksamen"}
            </span>
          </Link>
        );
      })}
    </section>
  );
}
