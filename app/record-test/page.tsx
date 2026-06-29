"use client";

import { useState } from "react";
import { AudioRecorder, type RecordingResult } from "@/components/AudioRecorder";

// Throwaway harness for the Phase 2/3 checkpoints:
// record -> upload to R2 -> transcribe (AssemblyAI) -> show transcript + metrics.
// Replaced by the real practice flow in Phase 5.

function extFor(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

type Transcription = {
  transcript: string;
  wpm: number;
  fillerCount: number;
  durationSec: number;
};

type Stage = "idle" | "uploading" | "transcribing" | "done";

export default function RecordTestPage() {
  const [duration, setDuration] = useState(60);
  const [stage, setStage] = useState<Stage>("idle");
  const [result, setResult] = useState<{ url: string; size: number } | null>(null);
  const [transcription, setTranscription] = useState<Transcription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ seconds: number; bytes: number; type: string } | null>(null);

  async function handleComplete(rec: RecordingResult) {
    setError(null);
    setResult(null);
    setTranscription(null);
    setMeta({ seconds: rec.durationSec, bytes: rec.blob.size, type: rec.mimeType });

    try {
      // 1. Upload to R2.
      setStage("uploading");
      const form = new FormData();
      const filename = `recording.${extFor(rec.mimeType)}`;
      form.append("audio", new File([rec.blob], filename, { type: rec.blob.type }));

      const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error ?? `Upload failed (${uploadRes.status})`);
      setResult({ url: uploadData.url, size: uploadData.size });

      // 2. Transcribe the uploaded URL.
      setStage("transcribing");
      const txRes = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioUrl: uploadData.url }),
      });
      const txData = await txRes.json();
      if (!txRes.ok) throw new Error(txData.error ?? `Transcription failed (${txRes.status})`);
      setTranscription(txData);
      setStage("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStage("idle");
    }
  }

  const busy = stage === "uploading" || stage === "transcribing";

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Record test</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Phase 2/3 checkpoint — record, upload to R2, then transcribe. You must be
        signed in (routes are auth-gated).
      </p>

      <div className="mt-8 flex gap-2">
        {[60, 120].map((d) => (
          <button
            key={d}
            onClick={() => setDuration(d)}
            className={`h-9 rounded-full px-4 text-sm font-medium transition-colors ${
              duration === d
                ? "bg-foreground text-background"
                : "border border-black/[.12] hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
            }`}
          >
            {d === 60 ? "1 min" : "2 min"}
          </button>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-center gap-4 rounded-xl border border-black/[.08] p-6 dark:border-white/[.145]">
        {/* Remount on duration change so the timer resets cleanly. */}
        <AudioRecorder
          key={duration}
          durationSec={duration}
          onComplete={handleComplete}
          disabled={busy}
        />
      </div>

      {meta && (
        <p className="mt-4 text-center text-sm text-zinc-500 tabular-nums">
          Captured {meta.seconds}s · {(meta.bytes / 1024).toFixed(0)} KB · {meta.type}
        </p>
      )}

      {stage === "uploading" && (
        <p className="mt-4 text-center text-sm text-zinc-500">Uploading…</p>
      )}
      {stage === "transcribing" && (
        <p className="mt-4 text-center text-sm text-zinc-500">
          Transcribing… (AssemblyAI, usually 10–60s)
        </p>
      )}

      {error && (
        <p className="mt-4 text-center text-sm text-red-600">{error}</p>
      )}

      {result && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="text-sm font-medium text-green-700 dark:text-green-500">
            Uploaded ✓ ({(result.size / 1024).toFixed(0)} KB)
          </p>
          <audio controls src={result.url} className="w-full">
            <track kind="captions" />
          </audio>
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-center text-xs text-zinc-500 underline"
          >
            {result.url}
          </a>
        </div>
      )}

      {transcription && (
        <div className="mt-6 rounded-xl border border-black/[.08] p-6 dark:border-white/[.145]">
          <div className="flex gap-6 text-sm tabular-nums">
            <div>
              <div className="text-2xl font-semibold">{transcription.wpm}</div>
              <div className="text-zinc-500">WPM</div>
            </div>
            <div>
              <div className="text-2xl font-semibold">{transcription.fillerCount}</div>
              <div className="text-zinc-500">filler words</div>
            </div>
            <div>
              <div className="text-2xl font-semibold">
                {transcription.durationSec.toFixed(1)}s
              </div>
              <div className="text-zinc-500">duration</div>
            </div>
          </div>
          <hr className="my-4 border-black/[.08] dark:border-white/[.145]" />
          <p className="whitespace-pre-wrap text-sm leading-6">
            {transcription.transcript || (
              <span className="text-zinc-500">(no speech detected)</span>
            )}
          </p>
        </div>
      )}
    </main>
  );
}
