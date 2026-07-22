import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * Lazy user sync: ensures a local `User` row exists for the signed-in Clerk user.
 * Called from server components / route handlers on first authenticated access —
 * no Clerk webhook needed for V1.
 *
 * Returns the local User row, or null if the request is not authenticated.
 */
export async function getOrCreateUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    `${userId}@placeholder.local`;

  // upsert guards against a race where two requests create the row concurrently.
  try {
    return await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email },
    });
  } catch (err) {
    // `email` is @unique, so creating a row can still fail when a *different*
    // Clerk id already owns this address. That happens whenever the database
    // has been cloned between Clerk instances (e.g. a production Neon branch
    // copied from dev): same person, same email, a new id. Re-point the
    // existing row at the current id rather than throwing, which previously
    // surfaced as an unhandled 500 with no JSON body.
    if (isUniqueEmailViolation(err)) {
      return prisma.user.update({ where: { email }, data: { id: userId } });
    }
    throw err;
  }
}

function isUniqueEmailViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: string; message?: string; meta?: { target?: unknown } };
  if (e.code !== "P2002") return false;

  // Prisma normally names the offending column in `meta.target`, but under the
  // Neon driver adapter (Prisma 7) meta carries only `modelName` and
  // `driverAdapterError` — `target` is undefined. Verified against a real
  // production P2002. So fall back to the message, which does name the field:
  // "Unique constraint failed on the fields: (`email`)".
  const target = e.meta?.target;
  if (Array.isArray(target)) return target.includes("email");
  if (typeof target === "string") return target.includes("email");
  return /email/i.test(e.message ?? "");
}
