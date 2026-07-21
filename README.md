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

## CI/CD

**CI — GitHub Actions** ([.github/workflows/ci.yml](.github/workflows/ci.yml))

Runs on every push and PR to `main` / `Develop`: install → **typecheck** → **lint**
→ **build**. It uses throwaway placeholder env values (a syntactically valid
`DATABASE_URL` for `prisma generate`, a well-formed Clerk key for prerendering),
so **no real secrets are stored in GitHub** and CI never touches a live service.

**CD — Vercel Git integration**

Vercel deploys straight from the repo, so no deploy workflow is needed:

1. In [vercel.com](https://vercel.com) → **Add New Project** → import this repo.
2. Set the **Production Branch** (e.g. `main`). Other branches/PRs get preview
   deploys automatically.
3. Add the environment variables below (Production + Preview).
4. Push → Vercel builds and deploys.

Vercel runs the `vercel-build` script, which applies migrations before building:

```
prisma migrate deploy && next build
```

(`build` itself stays migration-free so CI can run against a dummy database.)

### Environment variables to set in Vercel

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Production Postgres (Neon) connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Use a Clerk **production** instance for the live domain |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `..._SIGN_UP_URL` / `..._FALLBACK_REDIRECT_URL` | Same values as `.env.example` |
| `ASSEMBLYAI_API_KEY` | Transcription |
| `RATING_PROVIDER` | `anthropic` (needs credits) or `gemini` |
| `ANTHROPIC_API_KEY` and/or `GEMINI_API_KEY` | Whichever provider is selected |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | Audio storage |

### One-time production steps

- **Seed the topic bank** against the production database:
  `DATABASE_URL="<prod-url>" npm run db:seed`
- **Clerk**: create a *production* instance and add your Vercel domain (test
  keys only work on development instances).
- **R2**: add your production domain to the bucket's CORS allowed origins.

## Architecture notes

- **Next 16** uses `proxy.ts` (renamed from `middleware.ts`) for route protection
  via Clerk's `clerkMiddleware`.
- **Prisma 7** connects through Neon's serverless driver
  (`@prisma/adapter-neon`, [lib/prisma.ts](lib/prisma.ts)) — it handles Neon's
  compute cold-start wake gracefully and suits serverless. The migrate URL lives
  in `prisma.config.ts`; the generated client (`generated/`) is gitignored and
  rebuilt on `postinstall`.
- Topic selection is served from the bundled `data/topics.json` in memory (no DB
  round-trip). Edit that file → re-run `npm run db:seed` to keep ids aligned.
- Users are synced lazily on first authenticated request via
  [lib/getOrCreateUser.ts](lib/getOrCreateUser.ts) — no Clerk webhook needed.
