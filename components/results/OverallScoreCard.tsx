import { scoreColor } from "@/lib/score";

export function OverallScoreCard({
  score,
  difficulty,
  topic,
}: {
  score: number;
  difficulty: string;
  topic: string;
}) {
  const color = scoreColor(score);
  return (
    <div className="rounded-2xl border border-black/[.08] p-6 dark:border-white/[.145]">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-zinc-400">Overall score</span>
        <span className="rounded-full border border-black/[.12] px-3 py-1 text-xs font-medium dark:border-white/[.2]">
          {difficulty}
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`text-6xl font-semibold ${color.text}`}>{score}</span>
        <span className="text-zinc-500">/ 100</span>
      </div>
      <p className="mt-3 text-sm text-zinc-500">{topic}</p>
    </div>
  );
}
