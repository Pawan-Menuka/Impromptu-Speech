export function ImprovementTips({ tips }: { tips: string[] }) {
  if (tips.length === 0) return null;
  return (
    <section>
      <h2 className="text-sm font-medium">Tips to improve</h2>
      <ul className="mt-3 space-y-2">
        {tips.map((tip, i) => (
          <li key={i} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <span aria-hidden className="select-none text-foreground">→</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
