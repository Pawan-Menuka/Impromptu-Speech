// Prisma CLI config (Prisma 7). Loads env from .env.local (Next.js convention)
// so the CLI and the app share a single secrets file.
// In Prisma 7 the migrate/introspect URL lives here, not in schema.prisma.
// The runtime PrismaClient connects via a driver adapter — see lib/prisma.ts.
import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

loadEnv({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
