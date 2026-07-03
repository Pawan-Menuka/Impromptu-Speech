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
      ctx.strokeStyle = "#dc94ab"; // accent pink
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

  const isError = status === "denied" || status === "no-mic" || status === "error";

  return (
    <div className="glass mx-auto flex w-full max-w-md flex-col items-center gap-5 rounded-[22px] p-6">
      <div className="flex w-full items-center">
        <span className="flex items-center gap-2 font-label text-[0.7rem] uppercase tracking-[0.2em] text-muted">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              status === "recording" ? "animate-pulse" : ""
            }`}
            style={{
              background: status === "recording" ? "#c0243a" : "rgba(255,255,255,0.25)",
            }}
          />
          {status === "recording" ? "Recording" : status === "done" ? "Done" : "Ready"}
        </span>
      </div>

      <canvas
        ref={canvasRef}
        width={420}
        height={96}
        className="h-24 w-full rounded-xl border border-white/10 bg-black/20"
      />

      {status === "recording" && (
        <RecordingTimer secondsLeft={secondsLeft} total={durationSec} />
      )}

      {status === "idle" && (
        <button
          onClick={start}
          disabled={disabled}
          className="btn-accent flex h-12 items-center gap-2 rounded-full px-8 font-label text-xs uppercase tracking-[0.2em] disabled:opacity-50"
        >
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#2a1418]" />
          Start recording
        </button>
      )}

      {status === "recording" && (
        <button
          onClick={stop}
          className="btn-ghost flex h-12 items-center gap-2 rounded-full px-8 font-label text-xs uppercase tracking-[0.2em]"
        >
          <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: "#e0788a" }} />
          Stop
        </button>
      )}

      {status === "done" && (
        <button
          onClick={reset}
          className="btn-ghost h-12 rounded-full px-8 font-label text-xs uppercase tracking-[0.2em]"
        >
          Record again
        </button>
      )}

      {isError && (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm" style={{ color: "#e0788a" }}>
            {status === "denied"
              ? "Microphone access was blocked. Allow mic access in your browser settings."
              : status === "no-mic"
                ? "No microphone was found. Connect one and try again."
                : (errorMsg ?? "Something went wrong.")}
          </p>
          <button
            onClick={reset}
            className="btn-ghost h-10 rounded-full px-6 font-label text-xs uppercase tracking-[0.2em]"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
