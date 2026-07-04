import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";
import ws from "ws";

// Neon serverless driver. Unlike the raw `pg` TCP driver, it handles Neon's
// compute cold-start wake gracefully (no dropped-connection errors) and suits
// serverless (Vercel). Simple queries go over HTTP fetch; writes/transactions
// (e.g. upsert) go over WebSocket, which needs `ws` in Node.
neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL ?? "" });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
