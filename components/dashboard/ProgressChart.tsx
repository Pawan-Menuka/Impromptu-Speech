"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type Point = { date: string; score: number; difficulty: Difficulty };
type Filter = "ALL" | Difficulty;

const FILTERS: Filter[] = ["ALL", "EASY", "MEDIUM", "HARD"];

export function ProgressChart({ points }: { points: Point[] }) {
  const [filter, setFilter] = useState<Filter>("ALL");

  const data = points
    .filter((p) => filter === "ALL" || p.difficulty === filter)
    .map((p) => ({
      label: new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      score: p.score,
    }));

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium">Score over time</h2>
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-foreground text-background"
                  : "border border-black/[.12] hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
              }`}
            >
              {f === "ALL" ? "All" : f[0] + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-black/[.12] text-sm text-zinc-500 dark:border-white/[.2]">
          No sessions for this filter yet.
        </div>
      ) : (
        <div className="h-64 w-full rounded-xl border border-black/[.08] p-3 dark:border-white/[.145]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-black/[.06] dark:stroke-white/[.1]" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
