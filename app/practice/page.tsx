"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AudioRecorder, type RecordingResult } from "@/components/AudioRecorder";

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type Step = "difficulty" | "duration" | "prep" | "record" | "processing";
type Topic = { id: string; text: string; difficulty: Difficulty; category: string | null };
type ProcessingStage = "uploading" | "transcribing" | "rating" | "saving";

const DIFFICULTIES: { value: Difficulty; label: string; blurb: string }[] = [
  { value: "EASY", label: "Easy", blurb: "Concrete, everyday topics. Encouraging feedback." },
  { value: "MEDIUM", label: "Medium", blurb: "Opinion-based topics. Delivery starts to count." },
  { value: "HARD", label: "Hard", blurb: "Abstract & argumentative. Strict, full rubric." },
];

const STAGE_LABEL: Record<ProcessingStage, string> = {
  uploading: "Uploading your recording…",
  transcribing: "Transcribing… (usually 10–60s)",
  rating: "Scoring your speech…",
  saving: "Saving your results…",
};

function extFor(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
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

  function restart() {
    setStep("difficulty");
    setDifficulty(null);
    setDurationSec(null);
    setTopic(null);
    setError(null);
  }

  function chooseDifficulty(d: Difficulty) {
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load a topic");
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
      setStep("processing");
      setError(null);
      try {
        setStage("uploading");
        const form = new FormData();
        form.append(
          "audio",
          new File([rec.blob], `recording.${extFor(rec.mimeType)}`, { type: rec.blob.type }),
        );
        const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
        const upload = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(upload.error ?? "Upload failed");

        setStage("transcribing");
        const txRes = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audioUrl: upload.url }),
        });
        const tx = await txRes.json();
        if (!txRes.ok) throw new Error(tx.error ?? "Transcription failed");

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
        const rating = await rateRes.json();
        if (!rateRes.ok) throw new Error(rating.error ?? "Rating failed");

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
        const saved = await saveRes.json();
        if (!saveRes.ok) throw new Error(saved.error ?? "Could not save session");

        router.push(`/results/${saved.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    },
    [difficulty, durationSec, topic, router],
  );

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      {error && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <p>{error}</p>
          <button onClick={restart} className="mt-2 font-medium underline">
            Start over
          </button>
        </div>
      )}

      {step === "difficulty" && (
        <section>
          <h1 className="text-2xl font-semibold tracking-tight">Choose a difficulty</h1>
          <p className="mt-1 text-sm text-zinc-500">Strictness and the scoring rubric scale up with each level.</p>
          <div className="mt-6 grid gap-3">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                onClick={() => chooseDifficulty(d.value)}
                className="rounded-xl border border-black/[.08] p-5 text-left transition-colors hover:border-foreground/40 hover:bg-black/[.02] dark:border-white/[.145] dark:hover:bg-white/[.04]"
              >
                <div className="font-medium">{d.label}</div>
                <div className="mt-0.5 text-sm text-zinc-500">{d.blurb}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === "duration" && (
        <section>
          <h1 className="text-2xl font-semibold tracking-tight">How long?</h1>
          <p className="mt-1 text-sm text-zinc-500">Pick your speaking time. We&apos;ll then give you a random topic.</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[60, 120].map((sec) => (
              <button
                key={sec}
                onClick={() => chooseDuration(sec)}
                disabled={loadingTopic}
                className="rounded-xl border border-black/[.08] p-6 text-center transition-colors hover:border-foreground/40 hover:bg-black/[.02] disabled:opacity-50 dark:border-white/[.145] dark:hover:bg-white/[.04]"
              >
                <div className="text-2xl font-semibold">{sec === 60 ? "1 min" : "2 min"}</div>
                <div className="mt-0.5 text-sm text-zinc-500">{sec} seconds</div>
              </button>
            ))}
          </div>
          {loadingTopic && <p className="mt-4 text-sm text-zinc-500">Picking a topic…</p>}
        </section>
      )}

      {step === "prep" && topic && (
        <PrepStep
          topic={topic}
          onReady={() => setStep("record")}
        />
      )}

      {step === "record" && topic && durationSec && (
        <section className="flex flex-col items-center">
          <p className="text-center text-sm text-zinc-500">Your topic</p>
          <h2 className="mt-1 text-center text-xl font-medium">{topic.text}</h2>
          <div className="mt-8 w-full">
            <AudioRecorder durationSec={durationSec} onComplete={runPipeline} />
          </div>
        </section>
      )}

      {step === "processing" && (
        <section className="flex flex-col items-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-300 border-t-foreground" />
          <p className="mt-4 text-sm text-zinc-500">{STAGE_LABEL[stage]}</p>
          <p className="mt-1 text-xs text-zinc-400">Please keep this tab open.</p>
        </section>
      )}
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
    <section className="flex flex-col items-center text-center">
      <p className="text-sm text-zinc-500">Get ready — recording starts in</p>
      <div className="mt-2 text-5xl font-semibold tabular-nums">{secondsLeft}</div>
      <div className="mt-8 w-full rounded-xl border border-black/[.08] p-6 dark:border-white/[.145]">
        <p className="text-xs uppercase tracking-wide text-zinc-400">Your topic</p>
        <h2 className="mt-2 text-xl font-medium">{topic.text}</h2>
      </div>
      <button
        onClick={onReady}
        className="mt-6 h-11 rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:opacity-90"
      >
        I&apos;m ready — start now
      </button>
    </section>
  );
}
