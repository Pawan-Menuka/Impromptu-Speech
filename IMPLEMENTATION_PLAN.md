# Impromptu Speech Trainer — Phase-by-Phase Implementation Plan

> Working implementation guide derived from `articulate-v1-plan.md`.
> Each phase ends in a **runnable checkpoint** so you're never building three layers deep before you can test anything.
> Use this file to re-orient in new sessions when context runs out.

---

## Tech Stack (reference)

| Layer | Choice |
|---|---|
| Frontend + API | Next.js (App Router, TypeScript, Tailwind) |
| Database | PostgreSQL + Prisma |
| Auth | Clerk |
| Audio recording | Browser MediaRecorder API |
| Transcription + delivery metadata | AssemblyAI |
| LLM rating | Claude API (Sonnet) |
| Charts | Recharts |
| Deployment | Vercel |
| Audio storage | Cloudflare R2 |

**Differentiator:** Delivery/articulation training on open-ended topics — NOT Q&A interview simulation. Keep this framing distinct on the CV.

**Critical path:** Phases 2–5 (record → upload → transcribe → rate). Everything else is scaffolding. If time runs short, this pipeline working end-to-end on even one difficulty level is a demonstrable product.

---

## Key risks to keep in mind (read before each session)

1. **The pipeline needs something to drive it.** A minimal practice harness is pulled forward so you can click through the real flow as you build each stage — don't build E–H in isolation against curl/Postman.
2. **R2 CORS + public access must be configured early** (Phase 2, not at deploy). Transcription can't read the audio URL otherwise, and it fails silently late.
3. **AssemblyAI transcription is async** (10–60s). Treat it as polling/webhook with a timeout + a processing UI that survives a refresh — NOT a simple sequential call. This is the single most demo-fragile part.
4. **Clerk → User sync: use lazy create** (upsert on first authenticated request). Skip webhooks for V1 — removes a deployment dependency for no cost.
5. **Rate limiting belongs with the expensive routes** (Phase 4), not at the end. `/api/rate` and `/api/transcribe` spend real money per call.

---

## Phase 0 — Foundation & "hello, authenticated DB"
*Plan sections: A, B, D (partial)*

- [x] Scaffold Next.js (TS, App Router, Tailwind, ESLint), init git, `.gitignore`
- [x] `.env.local` placeholders (+ committed `.env.example`): `DATABASE_URL`, Clerk keys + URL vars, `ASSEMBLYAI_API_KEY`, `ANTHROPIC_API_KEY`, `R2_*`
- [x] Install deps: `@prisma/client prisma @clerk/nextjs assemblyai @anthropic-ai/sdk recharts zod @aws-sdk/client-s3` (+ `@prisma/adapter-pg`, `dotenv`)
- [x] Write Prisma schema (User, Topic, Session, Difficulty enum), generate client
- [x] Wire Clerk: `<ClerkProvider>`, `proxy.ts` (protect `/dashboard`, `/practice`, `/results`, `/history`), sign-in/up pages
- [x] `getOrCreateUser()` helper — lazy upsert, called from protected `/dashboard` test page
- [x] **USER ACTION:** create a Clerk app + a Postgres DB (Neon), paste keys into `.env.local`, run `npm run db:migrate`, then `npm run dev` — ✅ verified: tables created, sign-in synced a User row

**Decision:** dev Postgres — *Neon dev branch recommended* (lower friction, matches prod target). `npx create-db` (Prisma Postgres) also works.

**✅ Checkpoint:** Sign in → a `User` row appears in the DB. Protected routes redirect when signed out.

### ⚠️ Stack gotchas discovered in Phase 0 (this scaffold uses newer-than-training versions)

- **Next.js 16** renamed `middleware.ts` → **`proxy.ts`** (function may stay a default export of `clerkMiddleware`). There's a `node_modules/next/dist/docs/` folder — READ it before using new Next APIs.
- **Prisma 7** removed `url` from `datasource` in `schema.prisma`. The migrate URL lives in **`prisma.config.ts`** (`datasource.url: env("DATABASE_URL")`), and the **runtime client needs a driver adapter** — we use `@prisma/adapter-pg` in [lib/prisma.ts](lib/prisma.ts). Generator is `prisma-client` (not `prisma-client-js`); client is generated to `generated/prisma` (gitignored) and imported from `@/generated/prisma/client`.
- **Clerk 7.5.9** does NOT export `SignedIn`/`SignedOut`. Use **`<Show when="signed-in">` / `<Show when="signed-out">`** (supports a `fallback` prop) instead.
- `prisma.config.ts` loads `.env.local` via `dotenv` so Prisma CLI and Next share one secrets file.
- `postinstall: prisma generate` keeps the gitignored client present on fresh clones / Vercel.

---

## Phase 1 — Topic bank
*Plan sections: C*

- [x] `data/topics.json` — 18 topics per difficulty (54 total), each with a category
  - **Easy:** concrete/everyday ("Describe your ideal weekend")
  - **Medium:** opinion-based ("Should remote work be the default?")
  - **Hard:** abstract/argumentative ("Is privacy a right or a privilege?")
- [x] `prisma/seed.ts` reads JSON → idempotent upsert into `Topic` (deterministic ids, FK-safe)
- [x] `npx prisma db seed` — seed command configured in `prisma.config.ts` (`migrations.seed`), runs via `tsx`
- [x] Query helper: `getRandomTopic(difficulty)` in [lib/topics.ts](lib/topics.ts)

**✅ Checkpoint:** Query returns a random topic per difficulty — verified (18/18/18, idempotent on re-seed). Unblocks the practice flow.

> Phase 1 note: Prisma 7 seed command lives in `prisma.config.ts` under `migrations.seed`, not `package.json`. Requires `tsx` (dev dep). Seed loads `.env.local` and instantiates its own client with the pg adapter.

---

## Phase 2 — Capture & store audio
*Plan sections: E, F + R2 setup pulled forward from P*

- [x] `AudioRecorder` ([components/AudioRecorder.tsx](components/AudioRecorder.tsx)) — mic permission, start/stop, live waveform (`AnalyserNode`), hard stop at 60/120s, outputs `Blob`; handles denied/no-mic/error states
- [x] `RecordingTimer` ([components/RecordingTimer.tsx](components/RecordingTimer.tsx)) — countdown bar synced to recording
- [x] `POST /api/upload` ([app/api/upload/route.ts](app/api/upload/route.ts)) — auth-gated server-side upload to R2 via `@aws-sdk/client-s3`, validates size/type, returns public URL ([lib/r2.ts](lib/r2.ts) client)
- [x] `record-test` page ([app/record-test/page.tsx](app/record-test/page.tsx)) — throwaway harness for the checkpoint
- [x] **USER ACTION:** R2 bucket `impromptu-speech-audio` created, public r2.dev access on, Account API token (Object Read & Write), `R2_*` keys in `.env.local`

**✅ Checkpoint:** Upload to R2 + public read verified end-to-end (PUT ok, public URL → 200, body match). Browser mic capture is the only manual step left. First real end-to-end slice. ✅

> Phase 2 note: use an **Account API token** (not User API token) in R2 → it yields the S3 Access Key ID + Secret Access Key the SDK needs (User tokens give a `cfut_` bearer token instead). AWS SDK v3 warns Node ≥22 will be required after Jan 2027 — fine on Node 20 for now.

> Phase 2 notes: server-side upload chosen over presigned URLs (files are tiny, keeps creds server-side, avoids PUT CORS). Route forces `runtime = "nodejs"` for the S3 SDK. MIME is normalized (strips `;codecs=opus`).

---

## Phase 3 — Transcription
*Plan sections: G*

- [x] `POST /api/transcribe` ([app/api/transcribe/route.ts](app/api/transcribe/route.ts)) — submit R2 URL to AssemblyAI with `disfluencies: true` + word timestamps; auth-gated, zod-validated, SSRF guard (only our R2 URLs)
- [x] **Async completion** — SDK `transcribe()` polls internally; `pollingTimeout: 120s`, `pollingInterval: 3s`. Route sets `maxDuration = 120`
- [x] Compute WPM (non-filler words / `audio_duration`) + filler count from a normalized filler set ([lib/transcription.ts](lib/transcription.ts))
- [x] Returns `{ transcript, wpm, fillerCount, durationSec, words[] }`
- [x] Cost discipline: base features only — no sentiment/entity/summary
- [x] `record-test` extended: record → upload → transcribe → show transcript + metrics
- [x] **USER ACTION:** real `ASSEMBLYAI_API_KEY` added to `.env.local`

**✅ Checkpoint:** Verified live against a known sample — transcript correct, WPM 185 (sane), filler detection fires (9), word timestamps in ms, polling completed in ~12s. ✅

> Phase 3 notes: `transcribe()` polls to completion, so no webhook needed for V1. WPM excludes fillers and uses AssemblyAI's `audio_duration` (more accurate than client length). Word timestamps are in **milliseconds**. zod v4: use `z.url()` and `z.flattenError(err)`.

---

## Phase 4 — The rating engine (spend the most time here)
*Plan sections: H — "this is where the project lives or dies"*

- [x] `POST /api/rate` ([app/api/rate/route.ts](app/api/rate/route.ts)) — auth-gated, zod-validated
- [x] Difficulty-scaled rubric ([lib/rubric.ts](lib/rubric.ts)):

| Criteria | Easy | Medium | Hard |
|---|---|---|---|
| Content relevance | ✅ | ✅ | ✅ |
| Structure | ✅ | ✅ | ✅ |
| Examples used | ✅ | ✅ | ✅ |
| Filler words | — | ✅ | ✅ |
| Speaking pace (WPM) | — | ✅ | ✅ |
| Vocabulary range | — | — | ✅ |
| Pronunciation confidence | — | — | ✅ |

- [x] Prompt receives transcript, WPM, fillerCount, difficulty, rubric; WPM/fillers passed as **given facts**
- [x] **Structured outputs** (`output_config.format` JSON schema) enforce the shape; **Zod-validated** after ([lib/rating.ts](lib/rating.ts))
- [x] Retry once on malformed/validation failure, then fail gracefully; handles `refusal` stop reason
- [x] **Basic per-user rate limiting** ([lib/rateLimit.ts](lib/rateLimit.ts)) on `/api/rate` AND `/api/transcribe` (10/min/user)
- [x] `record-test` extended: difficulty selector → rate → show scores/tips
- [x] **Provider-pluggable** ([lib/rating.ts](lib/rating.ts)): `RATING_PROVIDER=anthropic` (default/prod) or `gemini` (free-tier testing). Same Zod-validated `Rating` either way.

**✅ Checkpoint:** Verified live (via Gemini) — same transcript scaled correctly: EASY 3 criteria/88, MEDIUM 5/91, HARD 7/70. Rubric + strictness scaling both confirmed. ✅

> Phase 4 notes: production model is **`claude-sonnet-4-6`** (per plan; swap to `claude-opus-4-8` for higher quality). Used **structured outputs** (Anthropic `output_config` JSON schema / Gemini native `responseSchema`) instead of prompt-only JSON. Numeric min/max omitted from schemas (unsupported) — range enforced in prompt + Zod. **Gemini (`gemini-2.5-flash`) added as a free testing provider** because Anthropic API requires purchased credits; flip back to Claude via one env var (`RATING_PROVIDER`).

---

## Phase 5 — Wire the pipeline into the real practice flow
*Plan sections: I*

Single `/practice` route, internal step state ([app/practice/page.tsx](app/practice/page.tsx)):

- [x] Step 1 — difficulty cards (Easy/Medium/Hard)
- [x] Step 2 — duration (1/2 min) + fetch random topic via `GET /api/topics/random`
- [x] Step 3 — topic card + 30s prep countdown (with "start now" skip)
- [x] Step 4 — `AudioRecorder` + `RecordingTimer`
- [x] Step 5 — processing screen orchestrates upload → transcribe → rate → save, per-stage status; recording already in R2 so it isn't lost on later failure. Persists via `POST /api/sessions`
- [x] Step 6 — redirect to `/results/[id]` (minimal report; Phase 6 fills it out)
- [x] Dashboard "Start practice" entry point
- [x] **USER ACTION:** browser happy-path test — ✅ confirmed working end-to-end

**✅ Checkpoint:** Full happy-path verified in the browser — record → upload → transcribe → rate → save → results page with score/criteria/tips/transcript/audio. The demonstrable product works. ✅

> Phase 5 notes: `POST /api/sessions` re-checks the audioUrl is from our R2 + the topic exists, and uses `getOrCreateUser` for the FK. Next 16 dynamic routes: `params` is a `Promise` (`await params`). Prisma 7 Json fields take `Prisma.InputJsonValue`.

---

## Phase 6 — Results page
*Plan sections: J*

- [x] `OverallScoreCard` — big score, color-scaled, difficulty badge ([components/results/](components/results/))
- [x] `CriteriaBreakdown` — per-criterion score bars (renders only that difficulty's criteria, which are what's stored)
- [x] `TranscriptViewer` — full transcript
- [x] Filler highlighting — inline `<mark>` on fillers (Medium/Hard only), shared detection in [lib/fillers.ts](lib/fillers.ts)
- [x] `AudioPlayback` — replay recording while reviewing
- [x] `ImprovementTips` — model's actionable tips
- [x] Refactor: extracted `lib/fillers.ts` (shared by transcription + highlighter) and `lib/score.ts` (color scale)
- [ ] **USER ACTION:** refresh an existing `/results/[id]` to see the full report

**✅ Checkpoint:** A finished session renders a complete, readable report with audio replay. *(build-verified; refresh a results page to view.)*

---

## Phase 7 — Surrounding pages
*Plan sections: K, L, M*

- [x] **Dashboard** (`/dashboard`): StatsBar (total, avg, streak via [lib/stats.ts](lib/stats.ts)), Recharts ProgressChart (score over time, difficulty filter), RecentSessionsList
- [x] **History** (`/history`): SessionsTable (sortable by date/score, difficulty filter, rows link to results, empty state)
- [x] **Landing** (`/`): hero + how-it-works + difficulty-preview sections; header gains a History link
- [ ] **USER ACTION:** browse `/dashboard` + `/history` (you have session data)

**✅ Checkpoint:** Aggregated stats + trend chart on the dashboard; history navigable. *(build-verified.)*

> Phase 7 note: built function-first with minimal styling per user — they'll reskin with their own design later. Recharts 3.9 basic line chart API matches v2; chart is a client component.

---

## Phase 8 — Polish & hardening
*Plan sections: N, O*

**Split: hardening done now; visual polish deferred to post-reskin (user brings own UI).**

Hardening (done):
- [x] Error boundary ([app/error.tsx](app/error.tsx), logs + reset) + custom 404 ([app/not-found.tsx](app/not-found.tsx))
- [x] Minimal route loading states (dashboard/history/results `loading.tsx`)
- [x] Empty states (no sessions on dashboard/history; "no speech detected" transcript)
- [x] Edge cases: **silence/too-short speech guard** (min 3 words, skips wasted rating call), mic denied / no-mic (in recorder), AssemblyAI/Claude failure → error UI
- [x] **Retry without re-recording** — recording kept in state; transient failures offer Retry, deterministic (empty speech) offers Start over only
- [x] Zod validation on every JSON API boundary (transcribe/rate/sessions/topics); upload validates type/size manually
- [x] Rate limiting on **all** paid/storage routes: rate, transcribe, upload, sessions

Deferred to post-reskin (need the custom UI):
- [ ] Navbar/Footer visual design, loading **skeletons** styling, mobile responsiveness pass, toast styling

**✅ Checkpoint (functional):** No dead ends — failures show a clear message + recovery; edge cases handled. Visual polish lands with the reskin.

---

## Phase 9 — Ship & portfolio
*Plan sections: P, Q*

- [ ] Push to GitHub → connect Vercel, set all env vars
- [ ] Provision prod PostgreSQL (Neon/Railway) + run migrations + seed
- [ ] Verify R2 CORS + public access in prod
- [ ] Production smoke test
- [ ] README: architecture diagram + record→transcribe→rate pipeline
- [ ] 60–90s demo video / GIF
- [ ] Note the difficulty-scaled rubric as the key engineering decision
- [ ] Live demo link + clear differentiation from the interview platform

**✅ Checkpoint:** Live, shareable, documented.

---

## Prisma Schema (reference)

```prisma
model User {
  id        String    @id // Clerk user id
  email     String    @unique
  createdAt DateTime  @default(now())
  sessions  Session[]
}

model Topic {
  id         String     @id @default(cuid())
  text       String
  difficulty Difficulty
  category   String?
  sessions   Session[]
}

model Session {
  id            String     @id @default(cuid())
  userId        String
  user          User       @relation(fields: [userId], references: [id])
  topicId       String
  topic         Topic      @relation(fields: [topicId], references: [id])
  difficulty    Difficulty
  durationSec   Int        // 60 or 120
  audioUrl      String     // R2 url
  transcript    String     @db.Text
  wpm           Int?
  fillerCount   Int?
  overallScore  Int        // 0-100
  criteria      Json       // per-criteria scores, varies by difficulty
  tips          Json       // array of improvement tips
  createdAt     DateTime   @default(now())
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}
```

---

## What changed vs. the original A–Q order

| Change | Why |
|---|---|
| Pulled **R2 CORS/public access** from P → Phase 2 | Transcription can't read the audio otherwise; failing late is painful |
| Pulled **rate limiting** from O → Phase 4 | `/api/rate` and `/api/transcribe` cost money per call the moment they exist |
| Made **async transcription handling** an explicit Phase 3 decision | The plan treats it as a simple call; it isn't, and it's the most demo-fragile part |
| Chose **lazy User upsert** over webhook | Removes a deployment dependency for no V1 cost |
| Each phase ends in a **runnable checkpoint** | So you're never building three layers deep before you can test anything |

---

## Deferred to V2 (do NOT build now)

- Voice/tone emotion analysis
- AI-generated follow-up questions (belongs to interview platform)
- Leaderboards / social
- Multi-language support
- User-submitted custom topics
- LLM-generated topics (V1 uses the curated bank)
- Shareable result card image
- Per-criteria trend insights ("fillers down 40%") — strong V2 first addition

---

## How to use this file across sessions

1. Open a new session and tell Claude: *"Read `IMPLEMENTATION_PLAN.md`, we're on Phase N."*
2. Check the boxes as you complete items; the checkpoints tell you when a phase is genuinely done.
3. The "Key risks" section near the top is the cheapest re-orientation — read it first each session.
