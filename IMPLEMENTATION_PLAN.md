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
- [ ] **USER ACTION:** create R2 bucket, enable public access (r2.dev or custom domain), set CORS, add `R2_*` keys to `.env.local`

**✅ Checkpoint:** Record on `/record-test` → blob uploads → play back the returned R2 URL. First real end-to-end slice. *(code verified via `next build`; awaiting R2 creds for live test.)*

> Phase 2 notes: server-side upload chosen over presigned URLs (files are tiny, keeps creds server-side, avoids PUT CORS). Route forces `runtime = "nodejs"` for the S3 SDK. MIME is normalized (strips `;codecs=opus`).

---

## Phase 3 — Transcription
*Plan sections: G*

- [ ] `POST /api/transcribe` — submit R2 URL to AssemblyAI with `disfluencies: true` + word timestamps
- [ ] **Handle async completion** — poll (or webhook) with a sensible timeout. Decide the mechanism here.
- [ ] Compute WPM (word count / actual duration)
- [ ] Extract filler count from disfluency tokens
- [ ] Return `{ transcript, wpm, fillerCount, words[] }`
- [ ] Cost discipline: base features only — no sentiment/entity/summary

**✅ Checkpoint:** Feed a real recording's URL → get back transcript + WPM + fillers. Verify WPM is sane against a known clip.

---

## Phase 4 — The rating engine (spend the most time here)
*Plan sections: H — "this is where the project lives or dies"*

- [ ] `POST /api/rate`
- [ ] Difficulty-scaled rubric in the prompt:

| Criteria | Easy | Medium | Hard |
|---|---|---|---|
| Content relevance | ✅ | ✅ | ✅ |
| Structure | ✅ | ✅ | ✅ |
| Examples used | ✅ | ✅ | ✅ |
| Filler words | — | ✅ | ✅ |
| Speaking pace (WPM) | — | ✅ | ✅ |
| Vocabulary range | — | — | ✅ |
| Pronunciation confidence | — | — | ✅ |

- [ ] Prompt receives: transcript, WPM, fillerCount, difficulty, rubric
- [ ] WPM/fillerCount passed as **given facts** — Claude interprets, does not invent
- [ ] Enforce structured JSON; **Zod-validate before saving**:
  ```ts
  { overallScore: number, criteria: {name, score, comment}[], tips: string[] }
  ```
- [ ] Handle malformed output: retry once, then fail gracefully
- [ ] **Add basic per-user rate limiting** to `/api/rate` AND `/api/transcribe` now

**✅ Checkpoint:** Same transcript at Easy vs Hard produces visibly different rubrics and stricter scoring. JSON validates every time.

---

## Phase 5 — Wire the pipeline into the real practice flow
*Plan sections: I*

Single `/practice` route, internal step state:

- [ ] Step 1 — `DifficultySelector` (Easy/Medium/Hard cards)
- [ ] Step 2 — `DurationSelector` (1/2 min) + fetch random topic
- [ ] Step 3 — `TopicCard` + `PrepCountdown` (30s)
- [ ] Step 4 — `AudioRecorder` + `RecordingTimer`
- [ ] Step 5 — `ProcessingScreen` orchestrates upload → transcribe → rate, with per-stage status + failure recovery (don't lose the recording if rating fails). Persist the `Session` row.
- [ ] Step 6 — redirect to `/results/[id]`

**✅ Checkpoint:** Full happy-path run end-to-end for **one** difficulty. Per the plan, this is your demonstrable product — everything after is presentation.

---

## Phase 6 — Results page
*Plan sections: J*

- [ ] `OverallScoreCard` — big score
- [ ] `CriteriaBreakdown` — renders only criteria for that difficulty
- [ ] `TranscriptViewer` — full transcript
- [ ] `FillerWordHighlighter` — inline highlights (medium/hard only)
- [ ] `AudioPlayback` — replay recording while reviewing
- [ ] `ImprovementTips` — Claude's actionable tips

**✅ Checkpoint:** A finished session renders a complete, readable report with audio replay.

---

## Phase 7 — Surrounding pages
*Plan sections: K, L, M*

- [ ] **Dashboard** (`/dashboard`): `StatsBar` (total sessions, avg score, streak), `ProgressChart` (Recharts line, avg score over time, filterable by difficulty), `RecentSessionsList`
- [ ] **History** (`/history`): `SessionsTable` (sortable by date/score), filter by difficulty (`DifficultyBadge`), rows link to results
- [ ] **Landing** (`/`): `HeroSection`, `HowItWorksSection`, `DifficultyPreviewSection`; redirect signed-in users to `/dashboard`

**✅ Checkpoint:** Multiple sessions show aggregated stats and a trend chart; history is navigable.

---

## Phase 8 — Polish & hardening
*Plan sections: N, O*

- [ ] `Navbar` (logo, nav, Clerk avatar) + `Footer`
- [ ] Loading skeletons, empty states (no sessions yet), error boundaries / toasts
- [ ] Mobile responsiveness pass
- [ ] Edge cases: silence, very short speech, mic denied, AssemblyAI/Claude failure
- [ ] Confirm Zod validation on every API boundary
- [ ] Confirm rate limiting on rate/transcribe routes

**✅ Checkpoint:** A non-technical person can use it without hitting a dead end.

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
