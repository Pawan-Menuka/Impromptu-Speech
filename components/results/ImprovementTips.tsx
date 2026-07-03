export function ImprovementTips({ tips }: { tips: string[] }) {
  if (tips.length === 0) return null;
  return (
    <section>
      <h2 className="font-display text-2xl font-light">Tips to improve</h2>
      <ul className="mt-5 space-y-4">
        {tips.map((tip, i) => (
          <li key={i} className="flex gap-4">
            <span className="font-display text-2xl font-light italic text-faint">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="pt-1 text-sm leading-6 text-muted">{tip}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
