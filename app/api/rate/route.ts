import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { rateSpeech } from "@/lib/rating";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  transcript: z.string().min(1),
  wpm: z.number().int().nonnegative().nullable().default(null),
  fillerCount: z.number().int().nonnegative().nullable().default(null),
  durationSec: z.number().nonnegative().nullable().default(null),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cost guard: this route spends money per call.
  const limit = await rateLimit(`rate:${userId}`, 10, 60_000);
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

  try {
    const rating = await rateSpeech(parsed.data);
    return Response.json(rating);
  } catch (err) {
    console.error("Rating failed:", err);
    const message = err instanceof Error ? err.message : "Rating failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
