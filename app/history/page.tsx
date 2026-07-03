import { getOrCreateUser } from "@/lib/getOrCreateUser";
import { prisma } from "@/lib/prisma";
import { SessionsTable } from "@/components/history/SessionsTable";

export default async function HistoryPage() {
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
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      overallScore: true,
      difficulty: true,
      createdAt: true,
      topic: { select: { text: true } },
    },
  });

  const rows = sessions.map((s) => ({
    id: s.id,
    overallScore: s.overallScore,
    difficulty: s.difficulty,
    topic: s.topic.text,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <div className="animate-fade-up">
        <p className="eyebrow">Your record</p>
        <h1 className="mt-1 font-display text-4xl font-light tracking-tight">History</h1>
        <p className="mt-2 text-sm text-muted">All your practice sessions.</p>
      </div>
      <div className="mt-8">
        <SessionsTable sessions={rows} />
      </div>
    </main>
  );
}
