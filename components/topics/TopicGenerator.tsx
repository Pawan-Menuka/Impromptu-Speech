"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import type { TopicRow } from "@/lib/topics";

const FILTERS = ["ALL", "EASY", "MEDIUM", "HARD"] as const;
type Filter = (typeof FILTERS)[number];

const PREP_SECONDS = 60;

export function TopicGenerator({ topics }: { topics: TopicRow[] }) {
  const { isSignedIn } = useUser();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [topic, setTopic] = useState<TopicRow | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const pool = filter === "ALL" ? topics : topics.filter((t) => t.difficulty === filter);

  function pickTopic() {
    if (pool.length === 0) return;
    setTopic(pool[Math.floor(Math.random() * pool.length)]);
    setSecondsLeft(null);
  }

  function startPrepTime() {
    setSecondsLeft(PREP_SECONDS);
  }

  // One tick per second: re-runs whenever secondsLeft changes, stops at 0.
  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  return (
    <div className="mt-8">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="btn-ghost rounded-full px-4 py-2 font-label text-[11px] uppercase tracking-[0.15em]"
            style={filter === f ? { borderColor: "rgba(240,195,182,0.6)", color: "#f4efec" } : undefined}
          >
            {f === "ALL" ? "All levels" : f[0] + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="glass mt-6 flex min-h-[140px] flex-col items-center justify-center rounded-[18px] p-8 text-center">
        {topic ? (
          <>
            <p className="eyebrow">{topic.difficulty[0] + topic.difficulty.slice(1).toLowerCase()}</p>
            <p className="mt-2 font-display text-2xl font-light italic text-fg">“{topic.text}”</p>
          </>
        ) : (
          <p className="text-sm text-muted">Click “New topic” to get a random impromptu speech prompt.</p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={pickTopic}
          className="btn-accent flex h-12 items-center gap-2 rounded-full px-8 font-label text-xs uppercase tracking-[0.2em]"
        >
          New topic
        </button>
        {topic && (
          <button
            onClick={startPrepTime}
            disabled={secondsLeft !== null && secondsLeft > 0}
            className="btn-ghost flex h-12 items-center gap-2 rounded-full px-6 font-label text-xs uppercase tracking-[0.2em] disabled:opacity-50"
          >
            {secondsLeft !== null ? `Thinking… ${secondsLeft}s` : "Start 60s think time"}
          </button>
        )}
      </div>

      {topic && (
        <Link
          href={isSignedIn ? "/practice" : "/sign-up"}
          className="mt-8 inline-flex items-center gap-2 font-label text-xs uppercase tracking-[0.2em] text-blush underline underline-offset-4"
        >
          Record it and get AI feedback →
        </Link>
      )}
    </div>
  );
}
