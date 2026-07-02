export function StatsBar({
  totalSessions,
  avgScore,
  streak,
}: {
  totalSessions: number;
  avgScore: number;
  streak: number;
}) {
  const stats = [
    { label: "Sessions", value: totalSessions },
    { label: "Avg score", value: totalSessions > 0 ? avgScore : "—" },
    { label: "Day streak", value: streak },
  ];
  return (
    <dl className="grid grid-cols-3 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-black/[.08] p-4 dark:border-white/[.145]"
        >
          <dt className="text-xs uppercase tracking-wide text-zinc-400">{s.label}</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}
