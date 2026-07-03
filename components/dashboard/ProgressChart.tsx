"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { scoreHex } from "@/lib/colors";

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type Point = { date: string; score: number; difficulty: Difficulty };
type Filter = "ALL" | Difficulty;

const FILTERS: Filter[] = ["ALL", "EASY", "MEDIUM", "HARD"];

// Per-point dot colored by score. Recharts injects cx/cy/payload at render time.
function ScoreDot(props: { cx?: number; cy?: number; payload?: { score: number } }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;
  return (
    <circle cx={cx} cy={cy} r={3.5} fill={scoreHex(payload.score)} stroke="#0b0809" strokeWidth={1.5} />
  );
}

export function ProgressChart({ points }: { points: Point[] }) {
  const [filter, setFilter] = useState<Filter>("ALL");

  const data = points
    .filter((p) => filter === "ALL" || p.difficulty === filter)
    .map((p) => ({
      label: new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      score: p.score,
    }));

  return (
    <section className="glass rounded-[22px] p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-light">Score over time</h2>
          <p className="eyebrow mt-1">Overall score, 0–100</p>
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 font-label text-[0.7rem] uppercase tracking-[0.15em] transition-colors ${
                filter === f
                  ? "btn-accent"
                  : "btn-ghost"
              }`}
            >
              {f === "ALL" ? "All" : f[0] + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-white/15 text-sm text-muted">
          No sessions for this filter yet.
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(226,150,160,0.28)" />
                  <stop offset="100%" stopColor="rgba(226,150,160,0)" />
                </linearGradient>
                <linearGradient id="area-stroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ecc0aa" />
                  <stop offset="100%" stopColor="#dc7a8e" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#8a7d78" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={{ fontSize: 11, fill: "#8a7d78" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ stroke: "rgba(255,255,255,0.15)" }}
                contentStyle={{
                  background: "#141011",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  color: "#f4efec",
                  fontSize: 12,
                }}
                labelStyle={{ color: "#8a7d78" }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="url(#area-stroke)"
                strokeWidth={2}
                fill="url(#area-fill)"
                dot={<ScoreDot />}
                activeDot={{ r: 5, fill: "#f4efec", stroke: "#0b0809" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
