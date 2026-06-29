import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Minimal results view for the Phase 5 checkpoint (proves the session persisted).
// Phase 6 replaces this with the full report (criteria breakdown, filler
// highlighting, audio playback component, etc.).

type Criterion = { name: string; score: number; comment: string };

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) notFound();

  const session = await prisma.session.findUnique({
    where: { id },
    include: { topic: true },
  });

  // Enforce ownership — never show another user's session.
  if (!session || session.userId !== userId) notFound();

  const criteria = (session.criteria as unknown as Criterion[]) ?? [];
  const tips = (session.tips as unknown as string[]) ?? [];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link href="/practice" className="text-sm text-zinc-500 hover:underline">
        ← New practice
      </Link>

      <div className="mt-4 flex items-baseline gap-3">
        <span className="text-5xl font-semibold">{session.overallScore}</span>
        <span className="text-zinc-500">/ 100</span>
        <span className="ml-auto rounded-full border border-black/[.12] px-3 py-1 text-xs font-medium dark:border-white/[.2]">
          {session.difficulty}
        </span>
      </div>

      <p className="mt-2 text-sm text-zinc-500">{session.topic.text}</p>

      <div className="mt-4 flex gap-6 text-sm tabular-nums">
        {session.wpm != null && (
          <span><span className="font-semibold">{session.wpm}</span> <span className="text-zinc-500">WPM</span></span>
        )}
        {session.fillerCount != null && (
          <span><span className="font-semibold">{session.fillerCount}</span> <span className="text-zinc-500">fillers</span></span>
        )}
        <span><span className="font-semibold">{session.durationSec}s</span> <span className="text-zinc-500">limit</span></span>
      </div>

      <audio controls src={session.audioUrl} className="mt-6 w-full">
        <track kind="captions" />
      </audio>

      <section className="mt-8">
        <h2 className="text-sm font-medium">Criteria</h2>
        <div className="mt-3 space-y-3">
          {criteria.map((c) => (
            <div key={c.name}>
              <div className="flex justify-between text-sm font-medium">
                <span>{c.name}</span>
                <span className="tabular-nums">{c.score}</span>
              </div>
              <p className="text-sm text-zinc-500">{c.comment}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium">Tips</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
          {tips.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium">Transcript</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
          {session.transcript || <span className="text-zinc-500">(no speech detected)</span>}
        </p>
      </section>
    </main>
  );
}
