# Session Handoff — Impromptu Speech Trainer

> Read this first in a fresh session. It captures the working environment, what's
> built, the non-obvious gotchas, and exactly what's left.
> Companion docs: [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) (phase plan),
> [README.md](README.md) (setup + CI/CD), [DESIGN_BRIEF.md](DESIGN_BRIEF.md) (UI spec).

---

## 1. Read this before touching anything

**Work in the MAIN ROOT, on branch `Develop`:**

```
D:\GitHub\Impromptu-Speech          ← the real working copy (branch: Develop)
```

- ⚠️ There is a **stale git worktree** at `.claude/worktrees/nostalgic-agnesi-5314e2`
  (branch `claude/nostalgic-agnesi-5314e2`). It was merged via PR #6 and is
  **abandoned** — do not edit files there. A shell may reset its cwd there;
  always `cd "D:/GitHub/Impromptu-Speech"` first.
- The dev server must be run from the main root: `npm run dev`.
- Commits go directly to `Develop` and are pushed to
  `https://github.com/Pawan-Menuka/Impromptu-Speech`.
- Base branch for PRs is `main`.

**Secrets** live in `D:\GitHub\Impromptu-Speech\.env.local` (gitignored, real
keys present and working). `.env.example` documents every variable. Never commit
secrets. All keys have passed through chat, so rotate before any serious public
launch.

---

## 2. What this project is

Pick a difficulty → get a random topic → record a 1–2 min impromptu speech →
AI-scored feedback on content + delivery, strictness scaling by difficulty.

**Stack:** Next.js 16 (App Router, TS) · Prisma 7 + Neon Postgres · Clerk auth ·
MediaRecorder · AssemblyAI (transcription) · Gemini/Claude (rating) · Recharts ·
Cloudflare R2 (audio + landing frames) · Tailwind v4 · Vercel (target).

---

## 3. Status — everything below is DONE, verified, committed & pushed

| Area | State |
|---|---|
| Phases 0–7 (foundation → dashboard/history/landing) | ✅ built & verified |
| Phase 8 hardening (error boundary, edge cases, retry, rate limits) | ✅ |
| Phase 8 *visual* polish | ✅ superseded by the reskin |
| Full UI reskin R1–R7 (design system + all screens + cinematic landing) | ✅ |
| CI (GitHub Actions) | ✅ green |
| Landing frames on R2 (upload + local verify) | ✅ see §6a |
| Domain DNS, Clerk prod instance (5/5), prod Neon branch | ✅ see §6b |
| Phase 9 deploy — **first Vercel deploy not yet run** | ⏳ **see §6b** |

The whole pipeline works end-to-end in the browser: record → upload (R2) →
transcribe (AssemblyAI) → rate (Gemini) → save → results page.

**Latest commits (HEAD = `eeedb9a`):**
```
eeedb9a Serve landing frames from R2 via NEXT_PUBLIC_FRAME_BASE_URL
34aefb0 CI: bump checkout/setup-node to v5
313eba3 Add CI pipeline + deployment setup
cd209e1 Expand topic bank to 50 per difficulty (150 total)
36175f3 Fix slow topic pick + Neon connection resilience
```

---

## 4. Non-obvious gotchas (these WILL bite — versions are newer than most training data)

- **Next.js 16** renamed `middleware.ts` → **`proxy.ts`** (Clerk's
  `clerkMiddleware` is the default export there). Dynamic route `params` is a
  **Promise** (`await params`). Bundled docs live in `node_modules/next/dist/docs/`
  — read them before using new Next APIs.
- **Prisma 7**: no `url` in `schema.prisma`; the migrate URL lives in
  `prisma.config.ts`. Runtime **requires a driver adapter**. Generator is
  `prisma-client` (not `-js`), output `generated/prisma` (gitignored, rebuilt by
  `postinstall`), imported as `@/generated/prisma/client`. Seed command is in
  `prisma.config.ts` under `migrations.seed` and needs `tsx`.
- **Database driver**: uses **`@prisma/adapter-neon`** (WebSocket + `ws`,
  `poolQueryViaFetch`), *not* `pg`. The raw `pg` driver **errors (`P1017`) on
  Neon's free-tier compute cold-start** — that was a real bug. Don't switch back.
  Neon HTTP mode can't do `upsert` ("Transactions are not supported in HTTP mode").
- **Clerk 7.5.9**: there is **no `<SignedIn>/<SignedOut>`** — use
  `<Show when="signed-in" | "signed-out">` (server) or `useUser()` (client).
  Appearance vars are `colorForeground` / `colorMutedForeground` (not `colorText`).
- **React 19 lint rules** are strict: no `Math.random()` during render (use the
  deterministic `pseudo()` helper), no sync `setState` in an effect, no ref
  access during render (ref callbacks need an eslint-disable).
- **Tailwind v4**: CSS-based `@theme` in `app/globals.css`, no `tailwind.config.js`.
- Running `tsc` and `eslint` in one chained command sometimes exceeds the 3-min
  tool timeout — **run them separately**.
- After deleting a route, a stale `.next` type cache can fail the build; `rm -rf .next`.

---

## 5. Architecture notes worth knowing

- **Topic selection does NOT hit the database.** `lib/topics.ts` serves topics
  from the bundled `data/topics.json` in memory, reconstructing the seed's
  deterministic ids (`seed-<difficulty>-<n>`). This was a deliberate fix for
  multi-second Neon cold starts.
  **Invariant: edit `data/topics.json` → run `npm run db:seed`** or ids drift.
  Currently **150 topics (50 EASY / 50 MEDIUM / 50 HARD)**.
- **Rating provider is switchable** via `RATING_PROVIDER=anthropic|gemini`
  (`lib/rating.ts`). Currently **`gemini`** because the Anthropic account has no
  credits. Both use structured outputs + Zod validation + one retry.
- **Difficulty-scaled rubric** (`lib/rubric.ts`) — Easy 3 criteria, Medium 5,
  Hard 7. This is the project's headline engineering decision.
- **Landing** (`components/landing/CinematicLanding.tsx`) is a scroll-scrubbed
  178-frame canvas with 5 checkpoints. Frame tween + caption reveal are driven
  imperatively via refs (no React re-render per frame). Captions deliberately
  reveal **after** the frame lands (120ms beat + 340ms ease-out).
- **Auth**: lazy user sync in `lib/getOrCreateUser.ts` (no Clerk webhook).
- **Rate limiting** (`lib/rateLimit.ts`) on all paid/storage routes: rate,
  transcribe, upload, sessions.
- `UI/` (design reference + 178 source frames + briefs) and `public/frames/`
  are **untracked on purpose** (large). `UI/README.md` is the design handoff.

---

## 6. WHAT'S NEXT — deployment (the only outstanding work)

The user is deploying to **Vercel**, with the **landing frames on Cloudflare R2**
to avoid burning Vercel's free-tier request budget (~178 image requests/visit).

### 6a. Move landing frames to R2 — ✅ DONE locally, prod steps remain

1. ✅ `npm run frames:upload` — all **178/178** uploaded to
   `r2://impromptu-speech-audio/frames/`. (An earlier attempt "didn't work";
   re-running from the **main root** succeeded — almost certainly it was run from
   a `.claude/worktrees/*` copy, which has no `node_modules`.)
2. ✅ Verified serving: `frame_001/090/178.jpg` → `200`, `image/jpeg`,
   `Cache-Control: public, max-age=31536000, immutable`.
3. ⏳ Set `NEXT_PUBLIC_FRAME_BASE_URL` in **Vercel** (Production + Preview) — see 6b.
   It's `NEXT_PUBLIC_` → inlined at build → **redeploy required** to change it.
4. ✅ Verified locally: added to `.env.local`, all **178/178** frame requests go to
   `pub-18efac271c2a45be95ad3fe47554617a.r2.dev`, **0** to localhost. Landing renders.
5. ⏳ Deploy and confirm frames come from R2, not the Vercel domain.
6. ⏳ **Only after step 5 passes**, stop shipping them to Vercel (they're currently
   tracked — **21 MB / 178 files**):
   ```bash
   git rm -r --cached public/frames
   echo "/public/frames" >> .gitignore
   ```
   (Local copy stays so dev works offline.)

**Frame URL decision (2026-07-21):** ship on `pub-…r2.dev/frames` for now.
A custom domain was considered and **deferred**: R2 custom domains require the
zone to be hosted on **Cloudflare**, but `pawanmenuka.com` currently uses
**Namecheap** nameservers (`dns1/dns2.registrar-servers.com`). Moving it is a
nameserver change + re-creating every DNS record — not worth blocking launch.
Swapping later is one env var + a redeploy.

> ⚠️ `*.r2.dev` is rate-limited and not intended for production traffic. Frames
> are immutable-cached, so repeat visits barely touch it — fine for a portfolio
> demo, revisit if traffic grows.

> Note: the frames need **no R2 CORS rule** — they're plain `<img>` loads, and
> the canvas only ever calls `drawImage` (never `getImageData`/`toDataURL`), so
> cross-origin tainting is harmless. **Nothing else needs CORS either** — see §6b.

### 6b. Vercel deployment checklist

- Import the repo in Vercel; set Production Branch.
- Vercel runs **`vercel-build`** = `prisma migrate deploy && next build`
  (migrations auto-apply; `build` stays migration-free so CI can use a dummy DB).
- **Env vars to set** (see README table): `DATABASE_URL`, Clerk keys + URL vars,
  `ASSEMBLYAI_API_KEY`, `RATING_PROVIDER`, `GEMINI_API_KEY` and/or
  `ANTHROPIC_API_KEY`, all `R2_*`, and `NEXT_PUBLIC_FRAME_BASE_URL`.
- **Domain: `impromptu.pawanmenuka.com`** — ✅ DNS live. Registrar/DNS is
  **Namecheap** (BasicDNS). Six CNAMEs now exist under `impromptu`: five for
  Clerk plus `impromptu` → `d29ca46f6289ffe7.vercel-dns-017.com` for Vercel.
  Vercel reports "properly configured". The apex `@` redirect and `www`
  parking-page records are unrelated defaults — leave them alone.
- **Clerk: ✅ production instance created and verified 5/5.** Its keys are
  `pk_live_`/`sk_live_` and belong in **Vercel only** — `.env.local` keeps the
  `pk_test_`/`sk_test_` dev keys or local dev breaks. Google SSO was cloned in
  but **disabled** for launch (production requires your own Google OAuth
  credentials; dev used Clerk's shared ones). Re-enabling is a dashboard toggle,
  no code change. Its redirect URI, for when you do:
  `https://clerk.impromptu.pawanmenuka.com/v1/oauth_callback`
- **Prod DB: ✅ separate Neon branch** `ep-round-queen-atjrmq1v-pooler…`
  (dev stays on `ep-purple-mode-at8z4227…`). Created as a copy-on-write clone,
  so **all 150 topics came across — no seeding needed**. It also inherited 4 test
  sessions + 1 user; these are inert (the prod Clerk instance issues different
  user ids, so nothing references them). Connection string lives in the
  gitignored `.env.production.local`, used only for one-off admin commands.
  The branch split exists so a local `npm run db:migrate` can't hit production.
- **R2 CORS: NOT needed** — earlier drafts of this doc and the README said
  otherwise; that was wrong and cost a detour. The browser never talks to R2:
  uploads go through `app/api/upload/route.ts` **server-side** (deliberately, to
  keep R2 credentials off the client), transcription passes the URL to
  AssemblyAI server-side, and playback/frames are plain `<audio src>` / `<img>`
  loads, which aren't CORS-gated.

### 6c. Then: Phase 9 portfolio polish (not started)

README architecture diagram, 60–90s demo GIF, live link, and framing the
difficulty-scaled rubric as the key engineering decision.

---

## 7. Commands

```bash
cd "D:/GitHub/Impromptu-Speech"

npm run dev            # dev server (run from MAIN ROOT)
npm run typecheck      # tsc --noEmit
npm run lint           # eslint   (run separately from typecheck — timeouts)
npm run build          # next build
npm run db:migrate     # prisma migrate dev
npm run db:seed        # re-seed topics (REQUIRED after editing data/topics.json)
npm run db:studio
npm run frames:upload  # upload landing frames to R2
gh run list --limit 3  # CI status
```

---

## 8. Working preferences (from the user)

- **Narrate reasoning visibly** while working — they want to follow the thinking,
  not just see results.
- They **hand-design the UI**; the reskin is complete and faithful to
  `UI/reference/*.dc.html`. Don't redesign visuals unless asked — match the
  reference exactly and verify against it.
- Solo developer — skip team/process overhead.
- Verify empirically rather than assuming (this session caught several real bugs
  that way: the pg cold-start error, the easing/ramp mismatch, Clerk's renamed
  exports).
- Commit + push after each meaningful chunk; keep CI green.

---

## 9. Known caveats / possible follow-ups

- First DB-touching action after idle still waits ~1–2s for Neon's free-tier
  compute to wake (inherent to the plan tier; topic pick is unaffected).
- `package.json` still has the scaffold name `nostalgic-agnesi-5314e2`
  (cosmetic; renaming risks lockfile churn).
- No automated tests exist — CI runs typecheck + lint + build only.
- Anthropic account has no credits, hence `RATING_PROVIDER=gemini`.
- Landing frame count could be halved (every 2nd frame) to cut requests further
  if needed.
