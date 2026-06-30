"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RecordingTimer } from "@/components/RecordingTimer";

type Status = "idle" | "recording" | "done" | "denied" | "no-mic" | "error";

export type RecordingResult = {
  blob: Blob;
  durationSec: number;
  mimeType: string;
};

type Props = {
  /** Hard stop after this many seconds (e.g. 60 or 120). */
  durationSec: number;
  /** Called once when a recording finishes (manual stop or hard stop). */
  onComplete: (result: RecordingResult) => void;
  disabled?: boolean;
};

// Prefer Opus in WebM; fall back through what the browser supports.
function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

export function AudioRecorder({ durationSec, onComplete, disabled }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [secondsLeft, setSecondsLeft] = useState(durationSec);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const teardown = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Clean up on unmount.
  useEffect(() => teardown, [teardown]);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.fftSize;
    const data = new Uint8Array(bufferLength);

    const render = () => {
      rafRef.current = requestAnimationFrame(render);
      analyser.getByteTimeDomainData(data);

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ef4444"; // red-500
      ctx.beginPath();

      const slice = width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = data[i] / 128.0; // 0..2, centered at 1
        const y = (v * height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += slice;
      }
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    };
    render();
  }, []);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop(); // triggers onstop -> finalize
    }
  }, []);

  const start = useCallback(async () => {
    setErrorMsg(null);
    setSecondsLeft(durationSec);
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setStatus("denied");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setStatus("no-mic");
      } else {
        setErrorMsg(err instanceof Error ? err.message : "Could not access microphone");
        setStatus("error");
      }
      return;
    }
    streamRef.current = stream;

    // Live waveform via Web Audio.
    try {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
    } catch {
      // Waveform is non-essential; recording can proceed without it.
    }

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const actual = Math.min(durationSec, Math.round(elapsed));
      const type = recorder.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      teardown();
      setStatus("done");
      setSecondsLeft(0);
      onComplete({ blob, durationSec: actual, mimeType: type });
    };

    recorder.start();
    startTimeRef.current = Date.now();
    setStatus("recording");
    drawWaveform();

    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const left = Math.ceil(durationSec - elapsed);
      setSecondsLeft(Math.max(0, left));
      if (elapsed >= durationSec) stop();
    }, 250);
  }, [durationSec, drawWaveform, onComplete, stop, teardown]);

  const reset = useCallback(() => {
    teardown();
    chunksRef.current = [];
    setSecondsLeft(durationSec);
    setErrorMsg(null);
    setStatus("idle");
  }, [durationSec, teardown]);

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={420}
        height={96}
        className="h-24 w-full rounded-lg border border-black/[.08] bg-zinc-50 dark:border-white/[.145] dark:bg-zinc-900"
      />

      {status === "recording" && (
        <RecordingTimer secondsLeft={secondsLeft} total={durationSec} />
      )}

      {status === "idle" && (
        <button
          onClick={start}
          disabled={disabled}
          className="flex h-11 items-center gap-2 rounded-full bg-red-500 px-6 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
        >
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-white" />
          Start recording
        </button>
      )}

      {status === "recording" && (
        <button
          onClick={stop}
          className="flex h-11 items-center gap-2 rounded-full border border-red-500 px-6 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950"
        >
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-red-600" />
          Stop
        </button>
      )}

      {status === "done" && (
        <button
          onClick={reset}
          className="h-11 rounded-full border border-black/[.12] px-6 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
        >
          Record again
        </button>
      )}

      {status === "denied" && (
        <p className="text-center text-sm text-red-600">
          Microphone access was blocked. Allow mic access in your browser
          settings, then{" "}
          <button onClick={reset} className="underline">
            try again
          </button>
          .
        </p>
      )}
      {status === "no-mic" && (
        <p className="text-center text-sm text-red-600">
          No microphone was found. Connect one and{" "}
          <button onClick={reset} className="underline">
            try again
          </button>
          .
        </p>
      )}
      {status === "error" && (
        <p className="text-center text-sm text-red-600">
          {errorMsg ?? "Something went wrong."}{" "}
          <button onClick={reset} className="underline">
            try again
          </button>
        </p>
      )}
    </div>
  );
}
