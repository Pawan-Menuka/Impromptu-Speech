// Uploads a landing frame sequence to Cloudflare R2 so Vercel doesn't serve
// ~178 image requests per landing visit.
//
//   npm run frames:upload                                  # public/frames -> frames/
//   node scripts/upload-frames.mjs <sourceDir> <prefix>    # any set -> any prefix
//
// Prefixes are versioned rather than overwritten (frames/, frames-webp/, ...)
// so switching sets is a NEXT_PUBLIC_FRAME_BASE_URL change plus a redeploy, and
// rolling back costs nothing. Objects carry a long immutable cache header,
// which is only safe because filenames within a prefix never change.
//
// Reads R2 credentials from .env.local.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const SOURCE_DIR = process.argv[2] ?? join("public", "frames");
const PREFIX = (process.argv[3] ?? "frames").replace(/^\/+|\/+$/g, "");
const CONCURRENCY = 8;
const CACHE_CONTROL = "public, max-age=31536000, immutable";

const CONTENT_TYPES = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".avif", "image/avif"],
  [".png", "image/png"],
]);

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name} in .env.local`);
    process.exit(1);
  }
  return v;
}

const accountId = required("R2_ACCOUNT_ID");
const bucket = required("R2_BUCKET");
const publicUrl = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: required("R2_ACCESS_KEY_ID"),
    secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
  },
});

const dir = join(process.cwd(), SOURCE_DIR);
let files;
try {
  files = (await readdir(dir))
    .filter((f) => CONTENT_TYPES.has(extname(f).toLowerCase()))
    .sort();
} catch {
  console.error(`Could not read ${dir}`);
  process.exit(1);
}

if (files.length === 0) {
  console.error(`No image frames found in ${dir}`);
  process.exit(1);
}

console.log(`Uploading ${files.length} frames to r2://${bucket}/${PREFIX}/ …`);

let done = 0;
let failed = 0;

async function upload(name) {
  const body = await readFile(join(dir, name));
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `${PREFIX}/${name}`,
        Body: body,
        ContentType: CONTENT_TYPES.get(extname(name).toLowerCase()),
        CacheControl: CACHE_CONTROL,
      }),
    );
    done++;
  } catch (err) {
    failed++;
    console.error(`  FAILED ${name}: ${err.message}`);
  }
  if ((done + failed) % 25 === 0 || done + failed === files.length) {
    console.log(`  ${done + failed}/${files.length}`);
  }
}

for (let i = 0; i < files.length; i += CONCURRENCY) {
  await Promise.all(files.slice(i, i + CONCURRENCY).map(upload));
}

console.log(`\nUploaded ${done}/${files.length}${failed ? ` (${failed} failed)` : ""}`);
if (publicUrl) {
  console.log(`\nSet this in Vercel (and .env.local if you want dev to use R2 too):`);
  console.log(`  NEXT_PUBLIC_FRAME_BASE_URL=${publicUrl}/${PREFIX}`);
  console.log(`\nVerify one frame loads:`);
  console.log(`  ${publicUrl}/${PREFIX}/${files[0]}`);
}
process.exit(failed ? 1 : 0);
