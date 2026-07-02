// Dashboard stat helpers, computed from a user's sessions.

export function avgScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Consecutive-day streak ending at the most recent active day.
 * (If the user practised today and the 2 days before, returns 3.)
 */
export function currentStreak(createdAts: Date[]): number {
  if (createdAts.length === 0) return 0;

  const keys = new Set(createdAts.map(dayKey));
  const mostRecent = createdAts.reduce((a, b) => (a > b ? a : b));

  const cursor = new Date(mostRecent);
  let streak = 0;
  while (keys.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
