import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QuestionWorkspace } from "@/components/exam/question-workspace";
import type { QuestionManifest } from "@/lib/exam-types";

const sampleQuestion: QuestionManifest = {
  id: "q01",
  number: 1,
  title: "Sample",
  type: "choice-grid",
  promptPages: ["/assets/exams/v24-prove/prompt/page-01.png"],
  solutionPages: ["/assets/exams/v24-prove/solution/page-01.png"],
  interaction: {
    checkMode: "auto",
    allowMultiple: true,
    options: [
      { id: "a", label: "A", correct: true },
      { id: "b", label: "B", correct: false },
    ],
  },
};

describe("QuestionWorkspace flow", () => {
  it("toggles fasit and checks choices", () => {
    render(<QuestionWorkspace examId="v24-prove" question={sampleQuestion} />);

    const toggle = screen.getByRole("button", { name: "Vis fasit" });
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Skjul fasit" })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("A"));
    fireEvent.click(screen.getByRole("button", { name: "Sjekk svar" }));

    expect(screen.getByText("Riktig: 1/1")).toBeInTheDocument();
  });
});
