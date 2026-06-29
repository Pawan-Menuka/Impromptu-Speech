"use client";

function format(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const mm = Math.floor(clamped / 60);
  const ss = String(clamped % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/**
 * Presentational countdown bar for an in-progress recording.
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
      <div className="flex items-baseline justify-between text-sm tabular-nums">
        <span className={low ? "font-semibold text-red-600" : "font-medium"}>
          {format(secondsLeft)}
        </span>
        <span className="text-zinc-500">{total}s limit</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className={`h-full transition-[width] duration-500 ease-linear ${
            low ? "bg-red-600" : "bg-red-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
