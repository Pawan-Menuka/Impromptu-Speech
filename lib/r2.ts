import { S3Client } from "@aws-sdk/client-s3";

// Cloudflare R2 is S3-compatible. We talk to it with the AWS S3 client pointed
// at the R2 endpoint. Credentials stay server-side (this module is never imported
// by client components).

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const R2_BUCKET = process.env.R2_BUCKET ?? "";
// Public base URL of the bucket (r2.dev or a custom domain), no trailing slash.
export const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");

let client: S3Client | undefined;

export function getR2Client(): S3Client {
  if (client) return client;
  client = new S3Client({
    region: "auto",
    endpoint: `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: required("R2_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

/** Public URL for an object key in the bucket. */
export function r2PublicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}
