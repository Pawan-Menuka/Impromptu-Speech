import type { Difficulty } from "@/generated/prisma/client";

export type RubricCriterion = {
  /** Stable key + the exact name Claude must use in its output. */
  name: string;
  /** What this criterion assesses — included in the prompt. */
  description: string;
};

// Difficulty-scaled rubric. Higher difficulties layer additional criteria on
// top of the lower ones, and the rating prompt scales strictness accordingly.
const CONTENT: RubricCriterion[] = [
  { name: "Content relevance", description: "How well the speech stays on topic and addresses the prompt." },
  { name: "Structure", description: "Clear beginning, middle, and end; logical flow between ideas." },
  { name: "Examples used", description: "Use of concrete examples, anecdotes, or evidence to support points." },
];

const DELIVERY: RubricCriterion[] = [
  { name: "Filler words", description: "Frequency of fillers (um, uh, like). Fewer is better; fillerCount is given." },
  { name: "Speaking pace", description: "Words per minute. Ideal conversational pace is ~120-150 WPM; wpm is given." },
];

const ADVANCED: RubricCriterion[] = [
  { name: "Vocabulary range", description: "Variety and precision of word choice; avoidance of repetition." },
  { name: "Pronunciation confidence", description: "Inferred fluency and assuredness from phrasing and word choice." },
];

export function rubricFor(difficulty: Difficulty): RubricCriterion[] {
  switch (difficulty) {
    case "EASY":
      return CONTENT;
    case "MEDIUM":
      return [...CONTENT, ...DELIVERY];
    case "HARD":
      return [...CONTENT, ...DELIVERY, ...ADVANCED];
  }
}

// Strictness guidance injected per difficulty.
export function strictnessFor(difficulty: Difficulty): string {
  switch (difficulty) {
    case "EASY":
      return "This is an EASY, everyday topic. Be encouraging and lenient — reward a clear, on-topic attempt.";
    case "MEDIUM":
      return "This is a MEDIUM, opinion-based topic. Hold a moderate bar — expect a clear position and some delivery control.";
    case "HARD":
      return "This is a HARD, abstract/argumentative topic. Be strict — expect nuance, strong structure, varied vocabulary, and confident delivery.";
  }
}
