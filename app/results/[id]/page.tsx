import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { OverallScoreCard } from "@/components/results/OverallScoreCard";
import { CriteriaBreakdown, type Criterion } from "@/components/results/CriteriaBreakdown";
import { TranscriptViewer } from "@/components/results/TranscriptViewer";
import { AudioPlayback } from "@/components/results/AudioPlayback";
import { ImprovementTips } from "@/components/results/ImprovementTips";

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
  // Filler highlighting only applies where the rubric scores fillers (Medium/Hard).
  const highlightFillers = session.difficulty !== "EASY";

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:underline">
          ← Dashboard
        </Link>
        <Link
          href="/practice"
          className="h-9 rounded-full bg-foreground px-4 text-sm font-medium leading-9 text-background transition-colors hover:opacity-90"
        >
          Practice again
        </Link>
      </div>

      <div className="mt-6">
        <OverallScoreCard
          score={session.overallScore}
          difficulty={session.difficulty}
          topic={session.topic.text}
        />
      </div>

      <div className="mt-6 flex gap-6 text-sm tabular-nums">
        {session.wpm != null && (
          <span>
            <span className="font-semibold">{session.wpm}</span>{" "}
            <span className="text-zinc-500">WPM</span>
          </span>
        )}
        {session.fillerCount != null && (
          <span>
            <span className="font-semibold">{session.fillerCount}</span>{" "}
            <span className="text-zinc-500">filler words</span>
          </span>
        )}
        <span>
          <span className="font-semibold">{session.durationSec}s</span>{" "}
          <span className="text-zinc-500">time limit</span>
        </span>
      </div>

      <div className="mt-8 space-y-8">
        <CriteriaBreakdown criteria={criteria} />
        <ImprovementTips tips={tips} />
        <AudioPlayback src={session.audioUrl} />
        <TranscriptViewer transcript={session.transcript} highlightFillers={highlightFillers} />
      </div>
    </main>
  );
}
