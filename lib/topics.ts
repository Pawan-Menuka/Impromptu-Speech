import { prisma } from "@/lib/prisma";
import type { Difficulty } from "@/generated/prisma/client";

/**
 * Returns a random topic for the given difficulty, or null if none are seeded.
 * Uses count + random skip so it scales without loading every row.
 */
export async function getRandomTopic(difficulty: Difficulty) {
  const count = await prisma.topic.count({ where: { difficulty } });
  if (count === 0) return null;

  const skip = Math.floor(Math.random() * count);
  return prisma.topic.findFirst({
    where: { difficulty },
    skip,
    orderBy: { id: "asc" },
  });
}
