// Maps a 0-100 score to Tailwind color classes (text + bar fill).
export function scoreColor(score: number): { text: string; bar: string } {
  if (score >= 80) return { text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" };
  if (score >= 60) return { text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" };
  return { text: "text-red-600 dark:text-red-400", bar: "bg-red-500" };
}
