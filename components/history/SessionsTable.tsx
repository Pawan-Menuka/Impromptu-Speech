"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

export function SessionsTable({ sessions }: { sessions: SessionRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [desc, setDesc] = useState(true);

  const rows = useMemo(() => {
    const filtered = sessions.filter((s) => filter === "ALL" || s.difficulty === filter);
    const sorted = [...filtered].sort((a, b) => {
      const cmp =
        sortKey === "score"
          ? a.overallScore - b.overallScore
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return desc ? -cmp : cmp;
    });
    return sorted;
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
      <div className="rounded-xl border border-dashed border-black/[.12] p-8 text-center text-sm text-zinc-500 dark:border-white/[.2]">
        No sessions yet.{" "}
        <Link href="/practice" className="font-medium underline">
          Start your first practice
        </Link>
        .
      </div>
    );
  }

  const arrow = (key: SortKey) => (sortKey === key ? (desc ? " ↓" : " ↑") : "");

  return (
    <div>
      <div className="mb-4 flex gap-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === f
                ? "bg-foreground text-background"
                : "border border-black/[.12] hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
            }`}
          >
            {f === "ALL" ? "All" : f[0] + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-black/[.08] text-left text-xs uppercase tracking-wide text-zinc-400 dark:border-white/[.145]">
            <th className="py-2">
              <button onClick={() => toggleSort("score")} className="font-medium">
                Score{arrow("score")}
              </button>
            </th>
            <th className="py-2 font-medium">Topic</th>
            <th className="py-2 font-medium">Level</th>
            <th className="py-2">
              <button onClick={() => toggleSort("date")} className="font-medium">
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
              className="cursor-pointer border-b border-black/[.04] hover:bg-black/[.02] dark:border-white/[.06] dark:hover:bg-white/[.04]"
            >
              <td className="py-3 font-semibold tabular-nums">{s.overallScore}</td>
              <td className="max-w-0 truncate py-3 pr-4">{s.topic}</td>
              <td className="py-3 text-zinc-500">{s.difficulty}</td>
              <td className="py-3 text-zinc-500">{new Date(s.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
