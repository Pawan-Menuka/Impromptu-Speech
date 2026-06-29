import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { Difficulty } from "@/generated/prisma/client";
import { rubricFor, strictnessFor } from "@/lib/rubric";

// Per the V1 plan, the rating engine uses Sonnet for cost discipline.
// Swap to "claude-opus-4-8" for higher-quality scoring if desired.
const MODEL = "claude-sonnet-4-6";

// Validated shape of Claude's structured output.
const CriterionSchema = z.object({
  name: z.string(),
  score: z.number().int().min(0).max(100),
  comment: z.string(),
});

const RatingSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  criteria: z.array(CriterionSchema).min(1),
  tips: z.array(z.string()).min(1),
});

export type Rating = z.infer<typeof RatingSchema>;

// JSON schema for the API's structured-output enforcement. Numeric min/max are
// intentionally omitted (unsupported by structured outputs) — we enforce the
// 0-100 range in the prompt and re-check with Zod after.
const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    overallScore: { type: "integer", description: "Overall score from 0 to 100." },
    criteria: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", description: "Exact criterion name from the rubric." },
          score: { type: "integer", description: "Score 0-100 for this criterion." },
          comment: { type: "string", description: "One or two sentences of specific feedback." },
        },
        required: ["name", "score", "comment"],
      },
    },
    tips: {
      type: "array",
      items: { type: "string" },
      description: "2-4 concrete, actionable improvement tips.",
    },
  },
  required: ["overallScore", "criteria", "tips"],
} as const;

const SYSTEM_PROMPT = `You are an expert public-speaking coach evaluating short impromptu speeches.

You will receive a transcript plus measured delivery metrics (words per minute and filler-word count). Treat those metrics as FACTS — interpret them against the rubric; never invent or contradict them.

Score the speech from 0 to 100 overall and 0 to 100 on each rubric criterion you are given. Your strictness scales with the stated difficulty. Provide 2-4 specific, actionable improvement tips.

Output a JSON object with: overallScore, a criteria array (one entry per rubric criterion, using the EXACT criterion names provided), and a tips array. Score only the criteria you are given for this difficulty — do not add others.`;

function buildUserPrompt(args: {
  difficulty: Difficulty;
  transcript: string;
  wpm: number | null;
  fillerCount: number | null;
  durationSec: number | null;
}): string {
  const criteria = rubricFor(args.difficulty);
  const criteriaList = criteria
    .map((c) => `- ${c.name}: ${c.description}`)
    .join("\n");

  return `Difficulty: ${args.difficulty}
${strictnessFor(args.difficulty)}

Rubric criteria to score (use these exact names):
${criteriaList}

Measured delivery metrics (facts):
- Words per minute: ${args.wpm ?? "unknown"}
- Filler-word count: ${args.fillerCount ?? "unknown"}
- Duration (seconds): ${args.durationSec ?? "unknown"}

Transcript:
"""
${args.transcript}
"""`;
}

let client: Anthropic | undefined;
function getClient(): Anthropic {
  if (client) return client;
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY");
  client = new Anthropic();
  return client;
}

function extractJson(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/**
 * Rates a transcript against the difficulty-scaled rubric using Claude.
 * Structured outputs enforce the JSON shape; we Zod-validate as a safety net and
 * retry once before failing.
 */
export async function rateSpeech(args: {
  difficulty: Difficulty;
  transcript: string;
  wpm: number | null;
  fillerCount: number | null;
  durationSec: number | null;
}): Promise<Rating> {
  const userPrompt = buildUserPrompt(args);

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const message = await getClient().messages.create({
      model: MODEL,
      max_tokens: 2048,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    });

    if (message.stop_reason === "refusal") {
      throw new Error("The model declined to rate this speech.");
    }

    try {
      const parsed = JSON.parse(extractJson(message));
      return RatingSchema.parse(parsed);
    } catch (err) {
      lastError = err; // malformed or failed validation — retry once
    }
  }

  throw new Error(
    `Rating failed validation after retry: ${lastError instanceof Error ? lastError.message : "unknown error"}`,
  );
}
