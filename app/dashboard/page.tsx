import { getOrCreateUser } from "@/lib/getOrCreateUser";
import { prisma } from "@/lib/prisma";

// Phase 0 checkpoint page: confirms auth + DB are wired by syncing and showing
// the local User row. Will be replaced by the real dashboard in Phase 7.
export default async function DashboardPage() {
  const user = await getOrCreateUser();

  // Proxy protects this route, so `user` should always be present here.
  if (!user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-zinc-500">Not signed in.</p>
      </main>
    );
  }

  const sessionCount = await prisma.session.count({
    where: { userId: user.id },
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Phase 0 checkpoint — auth + database are connected.
      </p>

      <dl className="mt-8 grid gap-4 rounded-xl border border-black/[.08] p-6 text-sm dark:border-white/[.145]">
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">User ID (Clerk)</dt>
          <dd className="font-mono">{user.id}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Email</dt>
          <dd className="font-mono">{user.email}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Member since</dt>
          <dd>{user.createdAt.toLocaleString()}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Practice sessions</dt>
          <dd>{sessionCount}</dd>
        </div>
      </dl>
    </main>
  );
}
