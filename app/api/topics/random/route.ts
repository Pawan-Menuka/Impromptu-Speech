import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getRandomTopic } from "@/lib/topics";

export const runtime = "nodejs";

const DifficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = DifficultySchema.safeParse(searchParams.get("difficulty"));
  if (!parsed.success) {
    return Response.json({ error: "Invalid or missing difficulty" }, { status: 400 });
  }

  const topic = await getRandomTopic(parsed.data);
  if (!topic) {
    return Response.json({ error: "No topics for that difficulty" }, { status: 404 });
  }

  return Response.json({
    id: topic.id,
    text: topic.text,
    difficulty: topic.difficulty,
    category: topic.category,
  });
}
