// Seeds the Topic bank from data/topics.json.
// Run via `npx prisma db seed` (configured in prisma.config.ts) or `npm run db:seed`.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Difficulty } from "../generated/prisma/client";

type TopicSeed = { text: string; difficulty: Difficulty; category?: string };

const topics: TopicSeed[] = JSON.parse(
  readFileSync(join(process.cwd(), "data", "topics.json"), "utf8"),
);

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  // Deterministic ids per (difficulty, index) make re-seeding idempotent and
  // FK-safe: re-running updates rows in place instead of orphaning sessions.
  const counters: Partial<Record<Difficulty, number>> = {};
  const tally: Record<string, number> = {};

  for (const t of topics) {
    const n = (counters[t.difficulty] = (counters[t.difficulty] ?? 0) + 1);
    const id = `seed-${t.difficulty.toLowerCase()}-${n}`;
    await prisma.topic.upsert({
      where: { id },
      update: { text: t.text, difficulty: t.difficulty, category: t.category ?? null },
      create: { id, text: t.text, difficulty: t.difficulty, category: t.category ?? null },
    });
    tally[t.difficulty] = (tally[t.difficulty] ?? 0) + 1;
  }

  console.log(`Seeded ${topics.length} topics:`, tally);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
