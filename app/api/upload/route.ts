import { randomUUID } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, r2PublicUrl, R2_BUCKET } from "@/lib/r2";

export const runtime = "nodejs";

// Audio recordings are small (a 2-min opus clip is well under 1 MB), so a
// server-side upload through this route stays comfortably under platform body
// limits and keeps R2 credentials off the client.
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB safety ceiling

// Map of accepted base MIME types -> file extension.
const ALLOWED_TYPES = new Map<string, string>([
  ["audio/webm", "webm"],
  ["audio/ogg", "ogg"],
  ["audio/mp4", "mp4"],
  ["audio/mpeg", "mp3"],
]);

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = form.get("audio");
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing 'audio' file field" }, { status: 400 });
  }

  // MediaRecorder reports types like "audio/webm;codecs=opus" — strip params.
  const baseType = file.type.split(";")[0].trim().toLowerCase();
  const ext = ALLOWED_TYPES.get(baseType);
  if (!ext) {
    return Response.json(
      { error: `Unsupported audio type: ${file.type || "unknown"}` },
      { status: 415 },
    );
  }

  if (file.size === 0) {
    return Response.json({ error: "Empty audio file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Audio file too large" }, { status: 413 });
  }

  const key = `recordings/${userId}/${randomUUID()}.${ext}`;
  const body = Buffer.from(await file.arrayBuffer());

  try {
    await getR2Client().send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: baseType,
      }),
    );
  } catch (err) {
    console.error("R2 upload failed:", err);
    return Response.json({ error: "Upload failed" }, { status: 502 });
  }

  return Response.json({
    url: r2PublicUrl(key),
    key,
    size: file.size,
    contentType: baseType,
  });
}
