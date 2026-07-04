import type { Difficulty } from "@/generated/prisma/client";
import topicsData from "@/data/topics.json";

export type TopicRow = {
  id: string;
  text: string;
  difficulty: Difficulty;
  category: string | null;
};

type RawTopic = { text: string; difficulty: Difficulty; category?: string | null };

// The topic bank is small, static seed data, so we serve it from the bundled
// JSON in memory — no DB round-trip (which on Neon's free tier can cold-start
// for seconds). Ids are reconstructed with the SAME deterministic scheme the
// seed uses (`seed-<difficulty>-<n>`, see prisma/seed.ts), so a chosen topic's
// id always matches its row in the database.
//
// Invariant: edit data/topics.json → re-run `npm run db:seed`, so the DB and
// this list stay aligned.
const TOPICS: TopicRow[] = (() => {
  const counters: Record<string, number> = {};
  return (topicsData as RawTopic[]).map((t) => {
    const n = (counters[t.difficulty] = (counters[t.difficulty] ?? 0) + 1);
    return {
      id: `seed-${t.difficulty.toLowerCase()}-${n}`,
      text: t.text,
      difficulty: t.difficulty,
      category: t.category ?? null,
    };
  });
})();

/** Returns a random topic for the given difficulty (in-memory, instant). */
export async function getRandomTopic(difficulty: Difficulty): Promise<TopicRow | null> {
  const pool = TOPICS.filter((t) => t.difficulty === difficulty);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
