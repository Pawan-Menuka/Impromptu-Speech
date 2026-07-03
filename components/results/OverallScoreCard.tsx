import { difficultyHex, hexA, scoreHex, verdict } from "@/lib/colors";

export function OverallScoreCard({
  score,
  difficulty,
  topic,
}: {
  score: number;
  difficulty: string;
  topic: string;
}) {
  const sc = scoreHex(score);
  const dc = difficultyHex(difficulty);
  return (
    <div className="glass relative overflow-hidden rounded-[26px] p-8 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-6 h-40 w-40 -translate-x-1/2 rounded-full blur-[60px]"
        style={{ background: hexA(sc, 0.5) }}
      />
      <div className="relative">
        <p className="eyebrow">Overall score</p>
        <div className="mt-2 flex items-baseline justify-center gap-2">
          <span className="font-display text-8xl font-light leading-none" style={{ color: sc }}>
            {score}
          </span>
          <span className="font-display text-3xl font-light text-faint">/100</span>
        </div>
        <div className="mt-4 flex items-center justify-center gap-3">
          <span
            className="rounded-full px-3 py-1 font-label text-[0.65rem] uppercase tracking-[0.15em]"
            style={{ color: dc, background: hexA(dc, 0.12), border: `1px solid ${hexA(dc, 0.3)}` }}
          >
            {difficulty}
          </span>
          <span className="font-display text-lg font-light italic" style={{ color: sc }}>
            {verdict(score)}
          </span>
        </div>
        <p className="mt-5 text-sm text-muted">{topic}</p>
      </div>
    </div>
  );
}
