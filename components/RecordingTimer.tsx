"use client";

function format(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const mm = Math.floor(clamped / 60);
  const ss = String(clamped % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/**
 * Presentational countdown for an in-progress recording (big timer + bar).
 * The recorder owns the timing; this just renders it.
 */
export function RecordingTimer({
  secondsLeft,
  total,
}: {
  secondsLeft: number;
  total: number;
}) {
  const pct = total > 0 ? (Math.max(0, secondsLeft) / total) * 100 : 0;
  const low = secondsLeft <= 10;

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between">
        <span
          className="font-display text-4xl font-light tabular-nums"
          style={low ? { color: "#e0788a" } : undefined}
        >
          {format(secondsLeft)}
        </span>
        <span className="font-label text-[0.7rem] uppercase tracking-[0.15em] text-faint">
          {total}s limit
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-linear"
          style={{
            width: `${pct}%`,
            background: low ? "#c0243a" : "linear-gradient(90deg, #ecc0aa, #dc94ab)",
          }}
        />
      </div>
    </div>
  );
}
