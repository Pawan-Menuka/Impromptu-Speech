# Impromptu Speech Trainer

Train articulation through timed impromptu speeches, with difficulty-scaled AI
feedback on both content and delivery.

Pick a difficulty → get a random topic → record a 1–2 min speech → receive
AI-scored feedback that scales in strictness by difficulty.

See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the phased build plan.

## Stack

Next.js 16 (App Router, TS) · PostgreSQL + Prisma 7 · Clerk auth · MediaRecorder
· AssemblyAI · Claude API · Recharts · Cloudflare R2 · Vercel.

## Local setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Provision a Postgres database** — pick one:
   - [Neon](https://neon.tech) dev branch (recommended; matches prod target)
   - `npx create-db` (free Prisma Postgres)
   - local Postgres

3. **Create a Clerk application** at [clerk.com](https://clerk.com) and grab the
   publishable + secret keys.

4. **Fill in `.env.local`** (copy from [.env.example](.env.example)). Required to
   boot: `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.

5. **Run the database migration**
   ```bash
   npm run db:migrate
   ```

6. **Start the dev server**
   ```bash
   npm run dev
   ```

7. Open http://localhost:3000, sign in, and visit `/dashboard`. You should see
   your synced user row — the Phase 0 checkpoint.

## Architecture notes

- **Next 16** uses `proxy.ts` (renamed from `middleware.ts`) for route protection
  via Clerk's `clerkMiddleware`.
- **Prisma 7** connects through the `@prisma/adapter-pg` driver adapter
  ([lib/prisma.ts](lib/prisma.ts)); the migrate URL lives in `prisma.config.ts`.
  The generated client (`generated/`) is gitignored and rebuilt on `postinstall`.
- Users are synced lazily on first authenticated request via
  [lib/getOrCreateUser.ts](lib/getOrCreateUser.ts) — no Clerk webhook needed.
