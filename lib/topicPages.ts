import type { Difficulty } from "@/generated/prisma/client";
import { TOPICS, type TopicRow } from "@/lib/topics";

export type DifficultyLevel = "easy" | "medium" | "hard";

const LEVEL_TO_DIFFICULTY: Record<DifficultyLevel, Difficulty> = {
  easy: "EASY",
  medium: "MEDIUM",
  hard: "HARD",
};

export const DIFFICULTY_LEVELS: DifficultyLevel[] = ["easy", "medium", "hard"];

export function isDifficultyLevel(value: string): value is DifficultyLevel {
  return (DIFFICULTY_LEVELS as string[]).includes(value);
}

/** All topics for a given URL level slug (`easy` | `medium` | `hard`). */
export function getTopicsByDifficulty(level: DifficultyLevel): TopicRow[] {
  const difficulty = LEVEL_TO_DIFFICULTY[level];
  return TOPICS.filter((t) => t.difficulty === difficulty);
}

/**
 * Categories with at least `min` topics, sorted by count descending then
 * alphabetically. Thin categories (below the threshold) are deliberately
 * left off public pages — see SEO_PLAN.md Phase 6 ("don't create thin
 * programmatic pages").
 */
export function getIndexableCategories(min = 10): { category: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const t of TOPICS) {
    if (!t.category) continue;
    counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= min)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

/** All topics in a category, regardless of the indexable-count threshold. */
export function getTopicsByCategory(category: string): TopicRow[] {
  return TOPICS.filter((t) => t.category === category);
}

export function slugToTitle(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}
