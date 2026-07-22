"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AudioRecorder, type RecordingResult } from "@/components/AudioRecorder";
import { hexA } from "@/lib/colors";

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type Step = "difficulty" | "duration" | "prep" | "record" | "processing";
type Topic = { id: string; text: string; difficulty: Difficulty; category: string | null };
type ProcessingStage = "uploading" | "transcribing" | "rating" | "saving";

const DIFFICULTIES: {
  value: Difficulty;
  label: string;
  color: string;
  criteria: number;
  blurb: string;
  sample: string;
}[] = [
  { value: "EASY", label: "Easy", color: "#63d29b", criteria: 3, blurb: "Concrete, everyday topics. Encouraging feedback.", sample: "Describe your ideal weekend." },
  { value: "MEDIUM", label: "Medium", color: "#e8b45c", criteria: 5, blurb: "Opinion-based topics. Delivery starts to count.", sample: "Should remote work be the default?" },
  { value: "HARD", label: "Hard", color: "#e0788a", criteria: 7, blurb: "Abstract & argumentative. Strict, full rubric.", sample: "Is privacy a right or a privilege?" },
];

const STAGE_ORDER: ProcessingStage[] = ["uploading", "transcribing", "rating", "saving"];
const STAGE_LABEL: Record<ProcessingStage, string> = {
  uploading: "Uploading your recording…",
  transcribing: "Transcribing… (usually 10–60s)",
  rating: "Scoring your speech…",
  saving: "Saving your results…",
};

const STEP_LABELS = ["Difficulty", "Duration", "Prepare", "Record"];

// Below this many transcribed words we treat the attempt as "no real speech".
const MIN_WORDS = 3;

/**
 * Reads an API response, tolerating a body that isn't JSON.
 *
 * Our routes always return JSON, but an unhandled server error or a platform
 * timeout does not — it sends an empty body or an HTML error page. Calling
 * `res.json()` before checking `res.ok` turns those into "Unexpected end of
 * JSON input", replacing the real failure with a meaningless parser message.
 * Reading the body defensively means the user always gets something
 * actionable, and the HTTP status survives when there is no message at all.
 */
// Mirrors the `any` that `res.json()` itself returns, so call sites are unchanged.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function okJson(res: Response, fallback: string): Promise<any> {
  const raw = await res.text();
  let body: { error?: string } | null = null;
  if (raw) {
    try {
      body = JSON.parse(raw) as { error?: string };
    } catch {
      body = null;
    }
  }
  if (!res.ok) {
    throw new Error(body?.error ?? `${fallback} (server error ${res.status})`);
  }
  if (!body) {
    throw new Error(`${fallback} (empty response from server)`);
  }
  return body;
}

function extFor(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

function StepRail({ current }: { current: number }) {
  return (
    <div className="mb-12 flex items-center justify-center">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full font-label text-xs ${
                  active ? "btn-accent" : ""
                }`}
                style={
                  active
                    ? undefined
                    : { background: "rgba(255,255,255,0.06)", color: done ? "#f4efec" : "#8a7d78" }
                }
              >
                {done ? "✓" : n}
              </span>
              <span
                className={`hidden font-label text-[0.7rem] uppercase tracking-[0.15em] sm:inline ${
                  active ? "text-fg" : "text-faint"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && <span className="mx-3 h-px w-6 bg-white/10 sm:w-10" />}
          </div>
        );
      })}
    </div>
  );
}

export default function PracticePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("difficulty");
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loadingTopic, setLoadingTopic] = useState(false);
  const [stage, setStage] = useState<ProcessingStage>("uploading");
  const [error, setError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [lastRec, setLastRec] = useState<RecordingResult | null>(null);

  function restart() {
    setStep("difficulty");
    setDifficulty(null);
    setDurationSec(null);
    setTopic(null);
    setError(null);
    setLastRec(null);
  }

  function chooseDifficulty(d: Difficulty) {
    setError(null);
    setDifficulty(d);
    setStep("duration");
  }

  async function chooseDuration(sec: number) {
    if (!difficulty) return;
    setDurationSec(sec);
    setLoadingTopic(true);
    setError(null);
    try {
      const res = await fetch(`/api/topics/random?difficulty=${difficulty}`);
      const data = await okJson(res, "Could not load a topic");
      setTopic(data);
      setStep("prep");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load a topic");
    } finally {
      setLoadingTopic(false);
    }
  }

  const runPipeline = useCallback(
    async (rec: RecordingResult) => {
      if (!difficulty || !durationSec || !topic) return;
      setLastRec(rec);
      setStep("processing");
      setError(null);
      setCanRetry(true);
      try {
        setStage("uploading");
        const form = new FormData();
        form.append(
          "audio",
          new File([rec.blob], `recording.${extFor(rec.mimeType)}`, { type: rec.blob.type }),
        );
        const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
        const upload = await okJson(uploadRes, "Upload failed");

        setStage("transcribing");
        const txRes = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audioUrl: upload.url }),
        });
        const tx = await okJson(txRes, "Transcription failed");

        if (wordCount(tx.transcript ?? "") < MIN_WORDS) {
          setError("We couldn't detect enough speech. Please record again and speak clearly.");
          setCanRetry(false);
          return;
        }

        setStage("rating");
        const rateRes = await fetch("/api/rate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            difficulty,
            transcript: tx.transcript,
            wpm: tx.wpm,
            fillerCount: tx.fillerCount,
            durationSec: tx.durationSec,
          }),
        });
        const rating = await okJson(rateRes, "Rating failed");

        setStage("saving");
        const saveRes = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topicId: topic.id,
            difficulty,
            durationSec,
            audioUrl: upload.url,
            transcript: tx.transcript,
            wpm: tx.wpm,
            fillerCount: tx.fillerCount,
            overallScore: rating.overallScore,
            criteria: rating.criteria,
            tips: rating.tips,
          }),
        });
        const saved = await okJson(saveRes, "Could not save session");

        router.push(`/results/${saved.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
        setCanRetry(true);
      }
    },
    [difficulty, durationSec, topic, router],
  );

  const railStep =
    step === "difficulty" ? 1 : step === "duration" ? 2 : step === "prep" ? 3 : 4;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      {step !== "processing" && <StepRail current={railStep} />}

      {step === "difficulty" && (
        <section className="animate-fade-up text-center">
          <h1 className="font-display text-4xl font-light tracking-tight">Choose a difficulty</h1>
          <p className="mt-2 text-sm text-muted">Strictness and the scoring rubric scale up with each level.</p>
          <div className="mt-8 grid gap-4">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                onClick={() => chooseDifficulty(d.value)}
                className="glass rounded-[22px] p-6 text-left transition-transform hover:-translate-y-0.5"
                style={{ borderColor: hexA(d.color, 0.2) }}
              >
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="font-display text-2xl font-light">{d.label}</span>
                  <span
                    className="ml-auto rounded-full px-2.5 py-0.5 font-label text-[0.65rem] uppercase tracking-[0.15em]"
                    style={{ color: d.color, background: hexA(d.color, 0.12), border: `1px solid ${hexA(d.color, 0.3)}` }}
                  >
                    {d.criteria} criteria
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted">{d.blurb}</p>
                <p className="mt-3 font-display text-lg font-light italic text-faint">“{d.sample}”</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === "duration" && (
        <section className="animate-fade-up text-center">
          <h1 className="font-display text-4xl font-light tracking-tight">How long?</h1>
          <p className="mt-2 text-sm text-muted">Pick your speaking time. We&apos;ll then give you a random topic.</p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {[60, 120].map((sec) => (
              <button
                key={sec}
                onClick={() => chooseDuration(sec)}
                disabled={loadingTopic}
                className="glass rounded-[22px] p-8 transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                <div className="font-display text-5xl font-light">{sec === 60 ? "1" : "2"}</div>
                <div className="mt-1 font-label text-xs uppercase tracking-[0.2em] text-muted">
                  {sec === 60 ? "minute" : "minutes"}
                </div>
              </button>
            ))}
          </div>
          {loadingTopic && (
            <div className="mt-8 flex items-center justify-center gap-3 text-sm text-muted">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-fg" />
              Picking a topic…
            </div>
          )}
          {error && !loadingTopic && (
            <p className="mt-6 text-sm" style={{ color: "#e0788a" }}>
              {error} — pick a duration to try again.
            </p>
          )}
        </section>
      )}

      {step === "prep" && topic && <PrepStep topic={topic} onReady={() => setStep("record")} />}

      {step === "record" && topic && durationSec && (
        <section className="animate-fade-up flex flex-col items-center">
          <p className="eyebrow">Your topic</p>
          <h2 className="mt-2 text-center font-display text-2xl font-light">{topic.text}</h2>
          <div className="mt-8 w-full">
            <AudioRecorder durationSec={durationSec} onComplete={runPipeline} />
          </div>
        </section>
      )}

      {step === "processing" &&
        (error ? (
          <section className="flex flex-col items-center gap-5 py-20 text-center">
            <p className="text-sm" style={{ color: "#e0788a" }}>{error}</p>
            <div className="flex gap-2">
              {canRetry && lastRec && (
                <button
                  onClick={() => runPipeline(lastRec)}
                  className="btn-accent h-11 rounded-full px-6 font-label text-xs uppercase tracking-[0.2em]"
                >
                  Retry
                </button>
              )}
              <button
                onClick={restart}
                className="btn-ghost h-11 rounded-full px-6 font-label text-xs uppercase tracking-[0.2em]"
              >
                Start over
              </button>
            </div>
          </section>
        ) : (
          <section className="flex flex-col items-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/15 border-t-[#dc94ab]" />
            <p className="mt-6 font-display text-xl font-light">{STAGE_LABEL[stage]}</p>
            <div className="mt-4 flex gap-2">
              {STAGE_ORDER.map((s, i) => {
                const activeIdx = STAGE_ORDER.indexOf(stage);
                const filled = i <= activeIdx;
                return (
                  <span
                    key={s}
                    className="h-1.5 w-1.5 rounded-full transition-colors"
                    style={{ background: filled ? "#dc94ab" : "rgba(255,255,255,0.15)" }}
                  />
                );
              })}
            </div>
            <p className="mt-4 font-label text-[0.7rem] uppercase tracking-[0.15em] text-faint">
              Please keep this tab open
            </p>
          </section>
        ))}
    </main>
  );
}

function PrepStep({ topic, onReady }: { topic: Topic; onReady: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onReady();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, onReady]);

  return (
    <section className="animate-fade-up flex flex-col items-center text-center">
      <p className="eyebrow">Recording starts automatically in</p>
      <div className="mt-3 font-display text-7xl font-light tabular-nums">{secondsLeft}</div>
      <div className="glass mt-10 w-full rounded-[22px] p-6">
        <p className="eyebrow">Your topic</p>
        <h2 className="mt-2 font-display text-2xl font-light">{topic.text}</h2>
      </div>
      <button
        onClick={onReady}
        className="btn-accent mt-8 h-12 rounded-full px-8 font-label text-xs uppercase tracking-[0.2em]"
      >
        I&apos;m ready — start now
      </button>
    </section>
  );
}
