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
  return prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, email },
  });
}
