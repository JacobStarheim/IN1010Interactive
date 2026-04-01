import type { ChoiceZone, ExamId, ExamManifest } from "@/lib/exam-types";
import {
  evaluateChoiceSelection,
  evaluateChoiceZones,
  evaluateDragAssignments,
  type ChoiceZoneValues,
  type DragAssignments,
} from "@/lib/interaction";
import {
  gradeFromPoints,
  storageKey,
  submissionStorageKey,
  timerStorageKey,
  type SubmissionResult,
  readJson,
} from "@/lib/exam-progress";

const hasChoiceZoneAnswerKey = (choiceZones: ChoiceZone[]) =>
  choiceZones.some(
    (zone) =>
      typeof zone.correct === "boolean" ||
      typeof zone.answer === "string" ||
      (zone.answers?.length ?? 0) > 0
  );

export const clearExamProgress = (examId: ExamId, storage: Storage) => {
  const keysToDelete: string[] = [];

  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key) {
      continue;
    }

    if (
      key === `in1010:visited:${examId}` ||
      key === submissionStorageKey(examId) ||
      key === timerStorageKey(examId)
    ) {
      keysToDelete.push(key);
      continue;
    }

    if (key.startsWith("in1010:") && key.includes(`:${examId}:`)) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => storage.removeItem(key));
};

export const gradeExamSubmission = (
  exam: ExamManifest,
  storage: Storage,
  submittedAt = new Date().toISOString()
): SubmissionResult | null => {
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
    return null;
  }

  const points100 = Number(((totalCorrect / totalPossible) * 100).toFixed(1));
  return {
    submittedAt,
    gradedQuestions,
    totalCorrect,
    totalPossible,
    points100,
    grade: gradeFromPoints(points100),
  };
};
