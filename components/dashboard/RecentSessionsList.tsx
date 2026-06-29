import Link from "next/link";

export type SessionSummary = {
  id: string;
  overallScore: number;
  difficulty: string;
  topic: string;
  createdAt: string; // ISO
};

export function RecentSessionsList({ sessions }: { sessions: SessionSummary[] }) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-black/[.12] p-6 text-center text-sm text-zinc-500 dark:border-white/[.2]">
        No sessions yet.{" "}
        <Link href="/practice" className="font-medium underline">
          Start your first practice
        </Link>
        .
      </div>
    );
  }

  return (
    <ul className="divide-y divide-black/[.06] rounded-xl border border-black/[.08] dark:divide-white/[.08] dark:border-white/[.145]">
      {sessions.map((s) => (
        <li key={s.id}>
          <Link href={`/results/${s.id}`} className="flex items-center gap-4 p-4 hover:bg-black/[.02] dark:hover:bg-white/[.04]">
            <span className="w-10 text-xl font-semibold tabular-nums">{s.overallScore}</span>
            <span className="min-w-0 flex-1 truncate text-sm">{s.topic}</span>
            <span className="shrink-0 text-xs text-zinc-400">{s.difficulty}</span>
            <span className="shrink-0 text-xs text-zinc-400">
              {new Date(s.createdAt).toLocaleDateString()}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
