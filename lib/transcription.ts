import { AssemblyAI } from "assemblyai";

// Filler words AssemblyAI surfaces when `disfluencies` is enabled. We normalize
// each token (lowercase, strip surrounding punctuation/brackets) before matching.
const FILLER_WORDS = new Set([
  "um", "umm", "uh", "uhh", "uh-huh", "hmm", "hmmm", "mm", "mhm", "mmhmm",
  "er", "err", "ah", "ahh", "huh",
]);

function normalizeToken(text: string): string {
  return text.toLowerCase().replace(/^[^a-z-]+|[^a-z-]+$/g, "");
}

export type TranscriptWordLite = {
  text: string;
  /** start time in milliseconds */
  start: number;
  /** end time in milliseconds */
  end: number;
};

export type TranscriptionResult = {
  transcript: string;
  wpm: number;
  fillerCount: number;
  durationSec: number;
  words: TranscriptWordLite[];
};

let client: AssemblyAI | undefined;

function getClient(): AssemblyAI {
  if (client) return client;
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) throw new Error("Missing ASSEMBLYAI_API_KEY");
  client = new AssemblyAI({ apiKey });
  return client;
}

/**
 * Transcribes a public audio URL via AssemblyAI. The SDK's `transcribe` polls
 * until the job completes (transcription is async, typically 10–60s), bounded
 * by `pollingTimeout`. We request only base features + disfluencies for cost
 * discipline — no sentiment/entity/summary.
 */
export async function transcribeAudio(audioUrl: string): Promise<TranscriptionResult> {
  const transcript = await getClient().transcripts.transcribe(
    { audio: audioUrl, disfluencies: true },
    { pollingTimeout: 120_000, pollingInterval: 3_000 },
  );

  if (transcript.status === "error") {
    throw new Error(transcript.error ?? "Transcription failed");
  }

  const words: TranscriptWordLite[] = (transcript.words ?? []).map((w) => ({
    text: w.text,
    start: w.start,
    end: w.end,
  }));

  let fillerCount = 0;
  for (const w of words) {
    if (FILLER_WORDS.has(normalizeToken(w.text))) fillerCount++;
  }

  // WPM reflects speaking pace, so it excludes filler words. AssemblyAI's
  // audio_duration (seconds) is more accurate than the client-reported length.
  const durationSec = transcript.audio_duration ?? 0;
  const spokenWords = words.length - fillerCount;
  const wpm = durationSec > 0 ? Math.round(spokenWords / (durationSec / 60)) : 0;

  return {
    transcript: transcript.text ?? "",
    wpm,
    fillerCount,
    durationSec,
    words,
  };
}
