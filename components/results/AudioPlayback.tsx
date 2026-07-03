"use client";

import { useRef, useState } from "react";

function fmt(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const mm = Math.floor(seconds / 60);
  const ss = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function AudioPlayback({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause();
    else void a.play();
  }

  const pct = duration > 0 && isFinite(duration) ? (current / duration) * 100 : 0;
  const durText = duration > 0 && isFinite(duration) ? fmt(duration) : "--:--";

  return (
    <section>
      <h2 className="font-display text-2xl font-light">Your recording</h2>
      <div className="glass mt-4 flex items-center gap-4 rounded-[18px] p-4">
        <button
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className="btn-accent flex h-11 w-11 items-center justify-center rounded-full text-sm"
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg, #ecc0aa, #dc94ab)" }}
          />
        </div>
        <span className="font-label text-xs tabular-nums text-faint">
          {fmt(current)} / {durText}
        </span>
      </div>
      <audio
        ref={audioRef}
        src={src}
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      >
        <track kind="captions" />
      </audio>
    </section>
  );
}
