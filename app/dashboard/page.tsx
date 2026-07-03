import Link from "next/link";
import { getOrCreateUser } from "@/lib/getOrCreateUser";
import { prisma } from "@/lib/prisma";
import { avgScore, currentStreak } from "@/lib/stats";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { ProgressChart } from "@/components/dashboard/ProgressChart";
import { RecentSessionsList } from "@/components/dashboard/RecentSessionsList";

export default async function DashboardPage() {
  const user = await getOrCreateUser();
  if (!user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-muted">Not signed in.</p>
      </main>
    );
  }

  const sessions = await prisma.session.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      overallScore: true,
      difficulty: true,
      createdAt: true,
      topic: { select: { text: true } },
    },
  });

  const totalSessions = sessions.length;
  const avg = avgScore(sessions.map((s) => s.overallScore));
  const streak = currentStreak(sessions.map((s) => s.createdAt));

  const points = sessions.map((s) => ({
    date: s.createdAt.toISOString(),
    score: s.overallScore,
    difficulty: s.difficulty,
  }));

  const recent = [...sessions]
    .reverse()
    .slice(0, 5)
    .map((s) => ({
      id: s.id,
      overallScore: s.overallScore,
      difficulty: s.difficulty,
      topic: s.topic.text,
      createdAt: s.createdAt.toISOString(),
    }));

  return (
    <main className="mx-auto w-full max-w-[1080px] flex-1 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="animate-fade-up">
          <p className="eyebrow">Welcome back</p>
          <h1 className="mt-1 font-display text-4xl font-light tracking-tight sm:text-5xl">
            Your dashboard
          </h1>
        </div>
        <Link
          href="/practice"
          className="btn-accent rounded-full px-6 py-3 font-label text-xs uppercase tracking-[0.2em]"
        >
          Start practice
        </Link>
      </div>

      <div className="mt-10">
        <StatsBar totalSessions={totalSessions} avgScore={avg} streak={streak} />
      </div>

      <div className="mt-8">
        <ProgressChart points={points} />
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-light">Recent sessions</h2>
          {totalSessions > 5 && (
            <Link
              href="/history"
              className="font-label text-xs uppercase tracking-[0.15em] text-muted hover:text-fg"
            >
              View all →
            </Link>
          )}
        </div>
        <RecentSessionsList sessions={recent} />
      </div>
    </main>
  );
}
