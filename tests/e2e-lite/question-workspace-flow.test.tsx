import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

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

const sampleChoiceZoneQuestion: QuestionManifest = {
  id: "q02",
  number: 2,
  title: "Choice Zones",
  type: "choice-grid",
  promptPages: ["/assets/exams/v24-prove/prompt/page-01.png"],
  solutionPages: ["/assets/exams/v24-prove/solution/page-01.png"],
  interaction: {
    checkMode: "auto",
    choiceZones: [
      {
        id: "zone-1",
        kind: "text",
        rect: { x: 0.2, y: 0.2, w: 0.2, h: 0.05 },
        answer: "42",
      },
    ],
  },
};

describe("QuestionWorkspace flow", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    const localStorageMock = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    };

    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("toggles fasit and checks choices", () => {
    render(<QuestionWorkspace examId="v24-prove" question={sampleQuestion} />);

    const toggle = screen.getByRole("button", { name: "Vis fasit" });
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Skjul fasit" })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("A"));
    fireEvent.click(screen.getByRole("button", { name: "Sjekk svar" }));

    expect(screen.getByText("Riktig: 1/1")).toBeInTheDocument();
  });

  it("persists checked question feedback and status across remounts", async () => {
    const { unmount } = render(
      <QuestionWorkspace examId="v24-prove" question={sampleChoiceZoneQuestion} />
    );

    const input = screen.getByLabelText("Svarfelt zone-1");
    fireEvent.change(input, { target: { value: "42" } });
    fireEvent.click(screen.getByRole("button", { name: "Sjekk svar" }));

    expect(screen.getByText("Riktig: 1/1")).toBeInTheDocument();
    expect(screen.getByLabelText("Svarfelt zone-1").className).toMatch(/choiceZoneInputCorrect/);

    await waitFor(() => {
      expect(screen.getByText("Riktig: 1/1")).toBeInTheDocument();
      expect(window.localStorage.getItem("in1010:feedback:v24-prove:q02")).toBe("Riktig: 1/1");
      expect(window.localStorage.getItem("in1010:choice-zones:v24-prove:q02")).toBe(
        JSON.stringify({ "zone-1": "42" })
      );
      expect(window.localStorage.getItem("in1010:choice-zone-status:v24-prove:q02")).toBe(
        JSON.stringify({ "zone-1": "correct" })
      );
    });

    unmount();

    render(<QuestionWorkspace examId="v24-prove" question={sampleChoiceZoneQuestion} />);

    expect(screen.getByText("Riktig: 1/1")).toBeInTheDocument();
    expect(screen.getByLabelText("Svarfelt zone-1")).toHaveValue("42");
    expect(screen.getByLabelText("Svarfelt zone-1").className).toMatch(/choiceZoneInputCorrect/);
  });
});
