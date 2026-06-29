import { scoreColor } from "@/lib/score";

export type Criterion = { name: string; score: number; comment: string };

export function CriteriaBreakdown({ criteria }: { criteria: Criterion[] }) {
  if (criteria.length === 0) return null;
  return (
    <section>
      <h2 className="text-sm font-medium">Breakdown</h2>
      <div className="mt-4 space-y-4">
        {criteria.map((c) => {
          const color = scoreColor(c.score);
          return (
            <div key={c.name}>
              <div className="flex justify-between text-sm font-medium">
                <span>{c.name}</span>
                <span className="tabular-nums">{c.score}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full ${color.bar}`}
                  style={{ width: `${Math.max(0, Math.min(100, c.score))}%` }}
                />
              </div>
              <p className="mt-1.5 text-sm text-zinc-500">{c.comment}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
