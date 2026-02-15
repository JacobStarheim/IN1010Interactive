"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { QuestionManifest } from "@/lib/exam-types";
import styles from "@/components/exam/exam-question-list.module.css";

type Props = {
  examId: string;
  questions: QuestionManifest[];
};

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

export function ExamQuestionList({ examId, questions }: Props) {
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const storage = getStorage();
    if (!storage) {
      return;
    }

    const key = `in1010:visited:${examId}`;
    const raw = storage.getItem(key);
    if (!raw) {
      return;
    }

    try {
      const ids = JSON.parse(raw) as string[];
      setVisitedIds(new Set(ids));
    } catch {
      // Ignore broken persisted data.
    }
  }, [examId]);

  const visitedCount = useMemo(() => {
    return questions.filter((q) => visitedIds.has(q.id)).length;
  }, [questions, visitedIds]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.summary}>
        <strong>Fremdrift:</strong> {visitedCount}/{questions.length} åpnet
      </div>
      <ul className={styles.list}>
        {questions.map((question) => (
          <li key={question.id}>
            <Link href={`/eksamen/${examId}/oppgave/${question.id}`} className={styles.item}>
              <div>
                <div className={styles.title}>
                  Oppgave {question.number}: {question.title}
                </div>
                <div className={styles.meta}>{question.type}</div>
              </div>
              {visitedIds.has(question.id) ? <span className={styles.done}>Åpnet</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
