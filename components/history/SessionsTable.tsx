"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { difficultyHex, hexA, scoreHex } from "@/lib/colors";

type Difficulty = "EASY" | "MEDIUM" | "HARD";

export type SessionRow = {
  id: string;
  overallScore: number;
  difficulty: Difficulty;
  topic: string;
  createdAt: string; // ISO
};

type SortKey = "date" | "score";
type Filter = "ALL" | Difficulty;

const FILTERS: Filter[] = ["ALL", "EASY", "MEDIUM", "HARD"];

function ScoreBadge({ score }: { score: number }) {
  const sc = scoreHex(score);
  return (
    <span
      className="flex h-9 w-9 items-center justify-center rounded-lg font-display text-base"
      style={{ color: sc, background: hexA(sc, 0.12), border: `1px solid ${hexA(sc, 0.3)}` }}
    >
      {score}
    </span>
  );
}

function LevelPill({ d }: { d: string }) {
  const dc = difficultyHex(d);
  return (
    <span
      className="rounded-full px-2.5 py-0.5 font-label text-[0.6rem] uppercase tracking-[0.15em]"
      style={{ color: dc, background: hexA(dc, 0.12), border: `1px solid ${hexA(dc, 0.3)}` }}
    >
      {d}
    </span>
  );
}

const HEADER = "font-label text-[0.65rem] uppercase tracking-[0.15em] text-faint";

export function SessionsTable({ sessions }: { sessions: SessionRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [desc, setDesc] = useState(true);

  const rows = useMemo(() => {
    const filtered = sessions.filter((s) => filter === "ALL" || s.difficulty === filter);
    return [...filtered].sort((a, b) => {
      const cmp =
        sortKey === "score"
          ? a.overallScore - b.overallScore
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return desc ? -cmp : cmp;
    });
  }, [sessions, filter, sortKey, desc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setDesc((d) => !d);
    else {
      setSortKey(key);
      setDesc(true);
    }
  }

  if (sessions.length === 0) {
    return (
      <div className="glass rounded-[22px] border-dashed p-10 text-center text-sm text-muted">
        No sessions yet.{" "}
        <Link href="/practice" className="text-accent underline">
          Start your first practice
        </Link>
        .
      </div>
    );
  }

  const arrow = (key: SortKey) => (sortKey === key ? (desc ? " ↓" : " ↑") : "");

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 font-label text-[0.65rem] uppercase tracking-[0.15em] ${
              filter === f ? "btn-accent" : "btn-ghost"
            }`}
          >
            {f === "ALL" ? "All" : f[0] + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <table className="hidden w-full text-sm sm:table">
        <thead>
          <tr className="border-b border-white/[.08] text-left">
            <th className="pb-3">
              <button onClick={() => toggleSort("score")} className={HEADER}>
                Score{arrow("score")}
              </button>
            </th>
            <th className={`pb-3 ${HEADER}`}>Topic</th>
            <th className={`pb-3 ${HEADER}`}>Level</th>
            <th className="pb-3">
              <button onClick={() => toggleSort("date")} className={HEADER}>
                Date{arrow("date")}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr
              key={s.id}
              onClick={() => router.push(`/results/${s.id}`)}
              className="cursor-pointer border-b border-white/[.05] transition-colors hover:bg-white/[.03]"
            >
              <td className="py-3">
                <ScoreBadge score={s.overallScore} />
              </td>
              <td className="max-w-0 truncate py-3 pr-4">{s.topic}</td>
              <td className="py-3">
                <LevelPill d={s.difficulty} />
              </td>
              <td className="py-3 text-faint">{new Date(s.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile cards */}
      <div className="sm:hidden">
        <div className="mb-3 flex gap-2">
          <button onClick={() => toggleSort("score")} className="btn-ghost rounded-full px-3 py-1 font-label text-[0.65rem] uppercase tracking-[0.15em]">
            Score{arrow("score")}
          </button>
          <button onClick={() => toggleSort("date")} className="btn-ghost rounded-full px-3 py-1 font-label text-[0.65rem] uppercase tracking-[0.15em]">
            Date{arrow("date")}
          </button>
        </div>
        <ul className="space-y-2">
          {rows.map((s) => (
            <li key={s.id}>
              <Link href={`/results/${s.id}`} className="glass flex items-center gap-3 rounded-[18px] p-4">
                <ScoreBadge score={s.overallScore} />
                <span className="min-w-0 flex-1 truncate text-sm">{s.topic}</span>
                <LevelPill d={s.difficulty} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
