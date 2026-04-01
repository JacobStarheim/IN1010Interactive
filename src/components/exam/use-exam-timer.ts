"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";

import {
  EXAM_DURATION_MS,
  defaultExamTimerState,
  getBrowserStorage,
  readJson,
  resolveExamTimerState,
  timerStorageKey,
  type ExamTimerState,
} from "@/lib/exam-progress";
import type { ExamId } from "@/lib/exam-types";

type TimerDraft = {
  hours: string;
  minutes: string;
  seconds: string;
};

type Args = {
  examId: ExamId;
  isEnglish: boolean;
};

const defaultTimerDraft = (): TimerDraft => ({
  hours: "2",
  minutes: "00",
  seconds: "00",
});

export function useExamTimer({ examId, isEnglish }: Args) {
  const [timerState, setTimerState] = useState<ExamTimerState>(defaultExamTimerState);
  const [isEditingTimer, setIsEditingTimer] = useState(false);
  const [timerDraft, setTimerDraft] = useState<TimerDraft>(defaultTimerDraft);

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
        storage.removeItem(timerStorageKey(examId));
        return;
      }

      storage.setItem(timerStorageKey(examId), JSON.stringify(next));
    },
    [examId]
  );

  useEffect(() => {
    const storage = getBrowserStorage();
    if (!storage) {
      return;
    }

    const saved = readJson<ExamTimerState | null>(storage, timerStorageKey(examId), null);
    const resolved = resolveExamTimerState(saved);
    setTimerState(resolved);
    syncTimerDraftFromState(resolved);

    if (saved && JSON.stringify(saved) !== JSON.stringify(resolved)) {
      storage.setItem(timerStorageKey(examId), JSON.stringify(resolved));
    }
  }, [examId, syncTimerDraftFromState]);

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

  const handleTimerDraftChange =
    (field: keyof TimerDraft) =>
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
      window.alert(
        isEnglish
          ? "Choose a time that is greater than 0 seconds."
          : "Velg en tid som er større enn 0 sekunder."
      );
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
    const durationMs = timerState.durationMs || EXAM_DURATION_MS;
    const next: ExamTimerState = {
      status: "running",
      durationMs,
      remainingMs: durationMs,
      startedAt: new Date(now).toISOString(),
      endsAt: new Date(now + durationMs).toISOString(),
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
    const approved = window.confirm(
      isEnglish
        ? "Reset the timer for this exam simulation?"
        : "Nullstille 2-timers timeren for denne eksamenen?"
    );
    if (!approved) {
      return;
    }

    const next = defaultExamTimerState();
    setTimerState(next);
    persistTimerState(next);
    syncTimerDraftFromState(next);
    setIsEditingTimer(false);
  };

  const resetTimerState = useCallback(() => {
    const next = defaultExamTimerState();
    setTimerState(next);
    persistTimerState(next);
    syncTimerDraftFromState(next);
    setIsEditingTimer(false);
  }, [persistTimerState, syncTimerDraftFromState]);

  const timerProgress = Math.max(
    0,
    Math.min(100, (timerState.remainingMs / timerState.durationMs) * 100)
  );

  return {
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
  };
}
