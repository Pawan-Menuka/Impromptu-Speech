import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { OverallScoreCard } from "@/components/results/OverallScoreCard";
import { CriteriaBreakdown, type Criterion } from "@/components/results/CriteriaBreakdown";
import { TranscriptViewer } from "@/components/results/TranscriptViewer";
import { AudioPlayback } from "@/components/results/AudioPlayback";
import { ImprovementTips } from "@/components/results/ImprovementTips";

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="glass rounded-[18px] p-4 text-center">
      <div className="font-display text-3xl font-light">{value}</div>
      <div className="eyebrow mt-1">{label}</div>
    </div>
  );
}

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
        <Link
          href="/dashboard"
          className="font-label text-xs uppercase tracking-[0.15em] text-muted hover:text-fg"
        >
          ← Dashboard
        </Link>
        <Link
          href="/practice"
          className="btn-accent rounded-full px-5 py-2.5 font-label text-xs uppercase tracking-[0.2em]"
        >
          Practice again
        </Link>
      </div>

      <div className="mt-8 animate-fade-up">
        <OverallScoreCard
          score={session.overallScore}
          difficulty={session.difficulty}
          topic={session.topic.text}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Metric label="Words / min" value={session.wpm ?? "—"} />
        <Metric label="Filler words" value={session.fillerCount ?? "—"} />
        <Metric label="Time limit" value={`${session.durationSec}s`} />
      </div>

      <div className="mt-10 space-y-10">
        <CriteriaBreakdown criteria={criteria} />
        <ImprovementTips tips={tips} />
        <AudioPlayback src={session.audioUrl} />
        <TranscriptViewer transcript={session.transcript} highlightFillers={highlightFillers} />
      </div>
    </main>
  );
}
