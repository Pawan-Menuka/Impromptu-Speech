const TILES = [
  { key: "sessions", label: "Sessions", glow: "#dc94ab" },
  { key: "avg", label: "Avg score", glow: "#ecc0aa" },
  { key: "streak", label: "Day streak", glow: "#8fb8d6" },
] as const;

export function StatsBar({
  totalSessions,
  avgScore,
  streak,
}: {
  totalSessions: number;
  avgScore: number;
  streak: number;
}) {
  const values: Record<string, React.ReactNode> = {
    sessions: totalSessions,
    avg:
      totalSessions > 0 ? (
        <>
          {avgScore}
          <span className="ml-1 font-body text-base text-faint">/100</span>
        </>
      ) : (
        "—"
      ),
    streak,
  };

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {TILES.map((t) => (
        <div key={t.key} className="glass relative overflow-hidden rounded-[22px] p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-40 blur-2xl"
            style={{ background: t.glow }}
          />
          <p className="eyebrow">{t.label}</p>
          <p className="mt-2 font-display text-5xl font-light leading-none">
            {values[t.key]}
          </p>
        </div>
      ))}
    </div>
  );
}
