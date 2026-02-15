export type ExamId =
  | "v24-midtveis"
  | "v24-konte"
  | "v24-prove"
  | "v25-midtveis"
  | "v25-konte";

export type QuestionType = "official-only" | "drag-drop" | "choice-grid" | "code-editor";

export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type DragItem = {
  id: string;
  label: string;
};

export type DropZone = {
  id: string;
  label: string;
  accepts: string[];
  rect?: Rect;
  pageIndex?: number;
};

export type ChoiceOption = {
  id: string;
  label: string;
  correct: boolean;
};

export type InteractionSpec = {
  checkMode: "manual" | "auto";
  instructions?: string;
  draggableItems?: DragItem[];
  dropZones?: DropZone[];
  options?: ChoiceOption[];
  allowMultiple?: boolean;
  codeTemplate?: string;
  solutionText?: string;
};

export type QuestionManifest = {
  id: string;
  number: number;
  title: string;
  type: QuestionType;
  promptPages: string[];
  solutionPages: string[];
  interaction?: InteractionSpec;
};

export type ExamManifest = {
  id: ExamId;
  title: string;
  sourcePromptPdf: string;
  sourceSolutionPdf: string;
  questionOrder: string[];
  questions: QuestionManifest[];
};
