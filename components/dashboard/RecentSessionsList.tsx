import Link from "next/link";
import { difficultyHex, hexA, scoreHex } from "@/lib/colors";

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
      <div className="glass rounded-[22px] border-dashed p-8 text-center text-sm text-muted">
        No sessions yet.{" "}
        <Link href="/practice" className="text-accent underline">
          Start your first practice
        </Link>
        .
      </div>
    );
  }

  return (
    <ul className="glass divide-y divide-white/[.06] overflow-hidden rounded-[22px]">
      {sessions.map((s) => {
        const sc = scoreHex(s.overallScore);
        const dc = difficultyHex(s.difficulty);
        return (
          <li key={s.id}>
            <Link
              href={`/results/${s.id}`}
              className="flex items-center gap-4 p-4 transition-colors hover:bg-white/[.03]"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-lg"
                style={{ color: sc, background: hexA(sc, 0.12), border: `1px solid ${hexA(sc, 0.3)}` }}
              >
                {s.overallScore}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{s.topic}</span>
              <span
                className="shrink-0 rounded-full px-2.5 py-0.5 font-label text-[0.65rem] uppercase tracking-[0.15em]"
                style={{ color: dc, background: hexA(dc, 0.12), border: `1px solid ${hexA(dc, 0.3)}` }}
              >
                {s.difficulty}
              </span>
              <span className="hidden shrink-0 text-xs text-faint sm:block">
                {new Date(s.createdAt).toLocaleDateString()}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
