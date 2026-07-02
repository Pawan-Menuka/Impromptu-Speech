import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getOrCreateUser } from "@/lib/getOrCreateUser";
import { prisma } from "@/lib/prisma";
import { R2_PUBLIC_URL } from "@/lib/r2";
import { rateLimit } from "@/lib/rateLimit";
import type { Prisma } from "@/generated/prisma/client";

export const runtime = "nodejs";

const CriterionSchema = z.object({
  name: z.string(),
  score: z.number().int().min(0).max(100),
  comment: z.string(),
});

const BodySchema = z.object({
  topicId: z.string().min(1),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  durationSec: z.number().int().positive(),
  audioUrl: z.url(),
  transcript: z.string(),
  wpm: z.number().int().nonnegative().nullable(),
  fillerCount: z.number().int().nonnegative().nullable(),
  overallScore: z.number().int().min(0).max(100),
  criteria: z.array(CriterionSchema).min(1),
  tips: z.array(z.string()).min(1),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(`sessions:${userId}`, 20, 60_000);
  if (!limit.ok) {
    return Response.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: z.flattenError(parsed.error) },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Only accept audio from our own bucket.
  if (!R2_PUBLIC_URL || !data.audioUrl.startsWith(`${R2_PUBLIC_URL}/`)) {
    return Response.json({ error: "audioUrl must be an uploaded recording" }, { status: 400 });
  }

  // Ensure the local User row exists (lazy sync), then validate the topic.
  const user = await getOrCreateUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const topic = await prisma.topic.findUnique({ where: { id: data.topicId } });
  if (!topic) {
    return Response.json({ error: "Unknown topic" }, { status: 400 });
  }

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      topicId: data.topicId,
      difficulty: data.difficulty,
      durationSec: data.durationSec,
      audioUrl: data.audioUrl,
      transcript: data.transcript,
      wpm: data.wpm,
      fillerCount: data.fillerCount,
      overallScore: data.overallScore,
      criteria: data.criteria as unknown as Prisma.InputJsonValue,
      tips: data.tips as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  });

  return Response.json({ id: session.id });
}
