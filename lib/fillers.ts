// Shared filler-word detection, used both when computing fillerCount during
// transcription and when highlighting fillers in the results transcript.

export const FILLER_WORDS = new Set([
  "um", "umm", "uh", "uhh", "uh-huh", "hmm", "hmmm", "mm", "mhm", "mmhmm",
  "er", "err", "ah", "ahh", "huh",
]);

/** Lowercase + strip surrounding punctuation/brackets so "Um," matches "um". */
export function normalizeToken(text: string): string {
  return text.toLowerCase().replace(/^[^a-z-]+|[^a-z-]+$/g, "");
}

export function isFillerToken(text: string): boolean {
  return FILLER_WORDS.has(normalizeToken(text));
}

export type TranscriptToken = { text: string; isFiller: boolean };

/**
 * Splits a transcript into tokens (words + the whitespace between them),
 * flagging filler words. Whitespace is preserved as its own tokens so the
 * transcript can be re-rendered exactly with fillers wrapped for highlighting.
 */
export function tokenizeTranscript(transcript: string): TranscriptToken[] {
  return transcript
    .split(/(\s+)/)
    .filter((part) => part.length > 0)
    .map((part) =>
      /^\s+$/.test(part)
        ? { text: part, isFiller: false }
        : { text: part, isFiller: isFillerToken(part) },
    );
}
