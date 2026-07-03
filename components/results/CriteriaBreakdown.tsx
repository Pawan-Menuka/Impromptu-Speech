import { hexA, scoreHex } from "@/lib/colors";

export type Criterion = { name: string; score: number; comment: string };

export function CriteriaBreakdown({ criteria }: { criteria: Criterion[] }) {
  if (criteria.length === 0) return null;
  return (
    <section>
      <h2 className="font-display text-2xl font-light">Breakdown</h2>
      <div className="mt-5 space-y-5">
        {criteria.map((c) => {
          const sc = scoreHex(c.score);
          const width = Math.max(0, Math.min(100, c.score));
          return (
            <div key={c.name}>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">{c.name}</span>
                <span className="font-display text-xl font-light" style={{ color: sc }}>
                  {c.score}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[.08]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${width}%`, background: `linear-gradient(90deg, ${hexA(sc, 0.6)}, ${sc})` }}
                />
              </div>
              <p className="mt-2 text-sm text-muted">{c.comment}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
