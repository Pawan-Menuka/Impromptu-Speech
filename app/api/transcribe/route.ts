import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { transcribeAudio } from "@/lib/transcription";
import { R2_PUBLIC_URL } from "@/lib/r2";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
// Transcription polls AssemblyAI; allow a long-running request on Vercel.
export const maxDuration = 120;

const BodySchema = z.object({
  audioUrl: z.url(),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cost guard: transcription is a paid call.
  const limit = await rateLimit(`transcribe:${userId}`, 10, 60_000);
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

  // SSRF / cost guard: only transcribe audio from our own R2 bucket, never an
  // arbitrary caller-supplied URL.
  if (!R2_PUBLIC_URL || !parsed.data.audioUrl.startsWith(`${R2_PUBLIC_URL}/`)) {
    return Response.json({ error: "audioUrl must be an uploaded recording" }, { status: 400 });
  }

  try {
    const result = await transcribeAudio(parsed.data.audioUrl);
    return Response.json(result);
  } catch (err) {
    console.error("Transcription failed:", err);
    const message = err instanceof Error ? err.message : "Transcription failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
