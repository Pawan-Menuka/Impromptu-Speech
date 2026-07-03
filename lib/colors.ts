// Hex-based color helpers for the Impromptu design system. Used for inline
// styles (glows, score badges, criterion bars, level pills) where Tailwind
// utility classes aren't expressive enough.

export const DIFFICULTY_HEX: Record<string, string> = {
  EASY: "#63d29b",
  MEDIUM: "#e8b45c",
  HARD: "#e0788a",
};

export function difficultyHex(difficulty: string): string {
  return DIFFICULTY_HEX[difficulty] ?? "#e0788a";
}

/** Score → semantic color: >=80 green, >=60 amber, else rose. */
export function scoreHex(score: number): string {
  if (score >= 80) return "#63d29b";
  if (score >= 60) return "#e8b45c";
  return "#e0788a";
}

/** Convert a #rrggbb hex to an rgba() string at alpha `a`. */
export function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Short verdict word from an overall score. */
export function verdict(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Solid work";
  return "Keep going";
}
