import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import type { Difficulty } from "@/generated/prisma/client";
import { rubricFor, strictnessFor } from "@/lib/rubric";

// Production rating uses Claude (per the V1 plan). For free-tier testing without
// Anthropic credits, set RATING_PROVIDER=gemini. Both providers return the same
// Zod-validated Rating shape, so nothing downstream changes.
const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

// Validated shape of the model's structured output.
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

// JSON schema for Anthropic structured outputs. Numeric min/max are omitted
// (unsupported) — the 0-100 range is enforced in the prompt and re-checked by Zod.
const ANTHROPIC_OUTPUT_SCHEMA = {
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

// Gemini's native Schema (Type enum) — the most reliable structured-output path.
const GEMINI_OUTPUT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    overallScore: { type: Type.INTEGER },
    criteria: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          score: { type: Type.INTEGER },
          comment: { type: Type.STRING },
        },
        required: ["name", "score", "comment"],
        propertyOrdering: ["name", "score", "comment"],
      },
    },
    tips: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["overallScore", "criteria", "tips"],
  propertyOrdering: ["overallScore", "criteria", "tips"],
};

const SYSTEM_PROMPT = `You are an expert public-speaking coach evaluating short impromptu speeches.

You will receive a transcript plus measured delivery metrics (words per minute and filler-word count). Treat those metrics as FACTS — interpret them against the rubric; never invent or contradict them.

Score the speech from 0 to 100 overall and 0 to 100 on each rubric criterion you are given. Your strictness scales with the stated difficulty. Provide 2-4 specific, actionable improvement tips.

Output a JSON object with: overallScore, a criteria array (one entry per rubric criterion, using the EXACT criterion names provided), and a tips array. Score only the criteria you are given for this difficulty — do not add others.`;

export type RateArgs = {
  difficulty: Difficulty;
  transcript: string;
  wpm: number | null;
  fillerCount: number | null;
  durationSec: number | null;
};

function buildUserPrompt(args: RateArgs): string {
  const criteria = rubricFor(args.difficulty);
  const criteriaList = criteria.map((c) => `- ${c.name}: ${c.description}`).join("\n");

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

// Each provider returns raw JSON text (and whether the model refused).
type ProviderResult = { text: string; refused: boolean };
type ProviderCall = (system: string, user: string) => Promise<ProviderResult>;

let anthropic: Anthropic | undefined;
async function callAnthropic(system: string, user: string): Promise<ProviderResult> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY");
  anthropic ??= new Anthropic();

  const message = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 2048,
    temperature: 0.3,
    system,
    messages: [{ role: "user", content: user }],
    output_config: { format: { type: "json_schema", schema: ANTHROPIC_OUTPUT_SCHEMA } },
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return { text, refused: message.stop_reason === "refusal" };
}

let gemini: GoogleGenAI | undefined;
async function callGemini(system: string, user: string): Promise<ProviderResult> {
  if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
  gemini ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: user,
    config: {
      systemInstruction: system,
      temperature: 0.3,
      responseMimeType: "application/json",
      responseSchema: GEMINI_OUTPUT_SCHEMA,
    },
  });

  return { text: response.text ?? "", refused: false };
}

function selectProvider(): { name: string; call: ProviderCall } {
  const provider = (process.env.RATING_PROVIDER ?? "anthropic").toLowerCase();
  if (provider === "gemini") return { name: "gemini", call: callGemini };
  return { name: "anthropic", call: callAnthropic };
}

/**
 * Rates a transcript against the difficulty-scaled rubric using the configured
 * LLM provider. Structured outputs enforce the JSON shape; we Zod-validate as a
 * safety net and retry once before failing.
 */
export async function rateSpeech(args: RateArgs): Promise<Rating> {
  const user = buildUserPrompt(args);
  const { call } = selectProvider();

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { text, refused } = await call(SYSTEM_PROMPT, user);
    if (refused) throw new Error("The model declined to rate this speech.");

    try {
      return RatingSchema.parse(JSON.parse(text));
    } catch (err) {
      lastError = err; // malformed or failed validation — retry once
    }
  }

  throw new Error(
    `Rating failed validation after retry: ${lastError instanceof Error ? lastError.message : "unknown error"}`,
  );
}
