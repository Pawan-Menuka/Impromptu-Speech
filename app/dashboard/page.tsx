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
        <p className="text-zinc-500">Not signed in.</p>
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
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <Link
          href="/practice"
          className="h-10 shrink-0 rounded-full bg-foreground px-5 text-sm font-medium leading-10 text-background transition-colors hover:opacity-90"
        >
          Start practice
        </Link>
      </div>

      <div className="mt-8">
        <StatsBar totalSessions={totalSessions} avgScore={avg} streak={streak} />
      </div>

      <div className="mt-10">
        <ProgressChart points={points} />
      </div>

      <div className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium">Recent sessions</h2>
          {totalSessions > 5 && (
            <Link href="/history" className="text-xs text-zinc-500 hover:underline">
              View all
            </Link>
          )}
        </div>
        <RecentSessionsList sessions={recent} />
      </div>
    </main>
  );
}
