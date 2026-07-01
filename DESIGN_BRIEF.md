# Impromptu Speech Trainer — UI Design Brief

> A complete description of the app's product, screens, states, data, and
> interactions — written so a design assistant can mock every screen without
> seeing the code. The app is **fully functional**; this is a reskin, not a
> rebuild. Keep the structure/flows; restyle the visuals.

---

## 1. Product in one line

Pick a difficulty, get a random impromptu speaking topic, record a 1–2 minute
speech, and receive AI-scored feedback on **content** (relevance, structure,
examples) and **delivery** (pace, filler words, vocabulary), scaled in strictness
by difficulty.

**Audience:** people practising public speaking / articulation (students, job
seekers, non-native speakers, professionals).
**Tone:** focused, encouraging, a little premium. Think "calm coaching tool,"
not "gamified quiz." Clean, confident, not noisy.

**Tech context for the designer:** Next.js (App Router) + Tailwind CSS. Designs
should be component-based and Tailwind-friendly. Dark mode is supported today
(neutral zinc palette) — keep light + dark in mind.

---

## 2. Information architecture (routes)

| Route | Auth | Purpose |
|---|---|---|
| `/` | public | Landing / marketing |
| `/sign-in`, `/sign-up` | public | Auth (Clerk-hosted components) |
| `/dashboard` | protected | Stats, progress chart, recent sessions |
| `/practice` | protected | The multi-step practice flow (the core) |
| `/results/[id]` | protected | Feedback report for one session |
| `/history` | protected | All past sessions (table) |

Global **header** on every page; **footer** is currently minimal (open for design).

---

## 3. The core user journey

```
Landing → Sign in → Dashboard → "Start practice"
   → choose difficulty → choose duration (topic is fetched)
   → 30s prep with topic shown → record (1–2 min, hard stop)
   → processing (upload → transcribe → score → save)
   → Results report → (Practice again / Dashboard / History)
```

---

## 4. Global elements

### Header (every page)
- **Left:** product name/logo → links to `/`.
- **Right, signed OUT:** "Sign in" + "Sign up" (open Clerk modals).
- **Right, signed IN:** links to **Dashboard**, **History**, and a **user avatar**
  menu (Clerk `UserButton`).
- Note: the avatar menu and the sign-in/up modals are **Clerk components** —
  they can be themed (colors, radius, fonts) but their internal layout is Clerk's.

### Footer
- Currently absent. Design a simple one if desired (product name, a tagline,
  maybe links). Low priority.

### Two global auth states to design
1. **Signed out** — landing hero CTA = "Get started" (opens sign-in modal).
2. **Signed in** — hero CTA = "Go to dashboard"; full nav shows.

---

## 5. Page-by-page spec

### 5.1 Landing (`/`)
Three stacked sections, centered, max width ~768px:
1. **Hero** — big headline ("Train your articulation, one impromptu speech at a
   time."), supporting paragraph, primary CTA button.
2. **How it works** — 3 numbered cards: (1) Pick a difficulty & topic,
   (2) Record 1–2 minutes, (3) Get AI feedback.
3. **What each level tests** — 3 cards: Easy / Medium / Hard with a one-line
   description each (see §6 for content).

### 5.2 Sign in / Sign up (`/sign-in`, `/sign-up`)
- A single centered **Clerk auth card** on an otherwise empty page.
- Designer can theme the Clerk card (brand color, radius, font) but not
  restructure it. Mostly: design the surrounding page/background.

### 5.3 Dashboard (`/dashboard`)
The signed-in home. Top to bottom:
- **Header row:** "Dashboard" title + primary **"Start practice"** button.
- **StatsBar:** 3 stat tiles — **Sessions** (count), **Avg score** (0–100 or "—"
  if none), **Day streak** (consecutive days practised).
- **ProgressChart:** a **line chart** of overall score over time, with filter
  chips **All / Easy / Medium / Hard**. Y-axis 0–100. (Built with Recharts —
  themeable: colors, grid, dots, tooltip.) Needs an **empty state** ("No
  sessions for this filter yet").
- **Recent sessions:** up to 5 rows; each row = score + topic + level + date,
  links to its results page. Needs an **empty state** ("No sessions yet → start
  your first practice"). "View all" link to `/history` when >5.

### 5.4 Practice (`/practice`) — the centerpiece, a single page with internal steps
Design each **step** as a distinct state of one screen (no full page reloads):

1. **Choose difficulty** — 3 large selectable cards (Easy/Medium/Hard) each with
   a one-line description.
2. **Choose duration** — 2 cards: **1 min** / **2 min**. On select, the app
   fetches a random topic (brief "Picking a topic…" loading state).
3. **Prep** — a **30-second countdown** (big number) + the **topic shown in a
   card** + a "I'm ready — start now" button to skip the wait.
4. **Record** — the topic stays visible. The **AudioRecorder** shows:
   - a **live audio waveform** (animated while recording),
   - a **countdown timer bar** (turns red in the final 10s),
   - a **Start recording** button (idle) → **Stop** button (recording),
   - hard stop when time runs out.
   Recorder error states to design: **mic permission denied**, **no microphone
   found**, generic error — each with a "try again".
5. **Processing** — a **spinner** with a changing label that walks through stages:
   *Uploading your recording… → Transcribing… (10–60s) → Scoring your speech… →
   Saving your results…* Plus a "keep this tab open" hint.
6. On success → redirect to the **Results** page.
- **Error banner** (any step fails): red banner with the message + "Start over".

### 5.5 Results (`/results/[id]`) — the payoff screen
Top to bottom:
- **Top bar:** "← Dashboard" link + "Practice again" button.
- **OverallScoreCard:** large **score / 100**, **color-coded** (see §6 score
  colors), a **difficulty badge**, and the **topic** text.
- **Metrics row:** **WPM**, **filler words** count, **time limit** (e.g. 60s).
- **Criteria breakdown:** one row per rubric criterion (count depends on
  difficulty — see §6): criterion name + score + a **horizontal score bar**
  (color-coded) + a one–two sentence comment.
- **Tips:** a short bulleted list of 2–4 actionable improvement tips.
- **Audio playback:** replay the recording (native audio element today; can be
  restyled or replaced with a custom player).
- **Transcript:** full text. On **Medium/Hard**, **filler words are highlighted
  inline** (e.g. yellow marks on "um", "uh"). On Easy, plain transcript.

### 5.6 History (`/history`)
- Title + subtitle.
- **Difficulty filter chips:** All / Easy / Medium / Hard.
- **Sortable table:** columns **Score**, **Topic**, **Level**, **Date**. Score
  and Date headers toggle sort direction (show an arrow). Entire **row links to
  results**.
- **Empty state:** "No sessions yet → start your first practice".

---

## 6. Data & semantics the design must reflect

### Difficulty levels (and what each tests)
- **Easy** — concrete, everyday topics ("Describe your ideal weekend").
  Encouraging. Rubric: Content relevance, Structure, Examples used. **(3 criteria)**
- **Medium** — opinion-based ("Should remote work be the default?"). Adds
  delivery. Rubric: the 3 above **+ Filler words + Speaking pace**. **(5 criteria)**
- **Hard** — abstract/argumentative ("Is privacy a right or a privilege?").
  Strict. Rubric: the 5 above **+ Vocabulary range + Pronunciation confidence**.
  **(7 criteria)**

> The results page renders **only the criteria for that difficulty** — so design
> the breakdown to look good at 3, 5, and 7 rows.

### Durations
- **60s** or **120s**. A **30s prep** precedes recording.

### Metrics & scores
- **Overall score:** integer 0–100.
- **Per-criterion score:** integer 0–100, each with a short comment.
- **WPM** (words per minute), **filler-word count**, **duration** (seconds).
- **Tips:** 2–4 short strings.

### Score color scale (used for the score number and the bars)
- **80–100 → green** (emerald)
- **60–79 → amber**
- **0–59 → red**
(These are the current thresholds — feel free to refine the exact hues.)

### Recorder states to design
`idle` · `recording` (waveform + timer) · `done` · `permission denied` ·
`no microphone` · `error`.

### Processing stages (sequential, shown one at a time)
`Uploading` → `Transcribing (10–60s)` → `Scoring` → `Saving`.

---

## 7. Reusable components (inventory)

Design these as a small system so they compose across pages:
- **Buttons:** primary (filled), secondary (outline), small chip/toggle (filters).
- **Cards:** selectable (difficulty/duration), content card (topic), stat tile.
- **Score display:** large number + "/100", color-coded; and a horizontal
  **score bar**.
- **Difficulty badge / chip.**
- **Stat tile** (label + big number).
- **Line chart** (Recharts — themeable).
- **Table** (history) with sortable headers + clickable rows.
- **Transcript block** with optional inline **filler highlight** marks.
- **Audio player** (native today; custom welcome).
- **Spinner / processing indicator** with rotating labels.
- **Empty states** (dashboard chart, recent sessions, history).
- **Error banner / inline error text.**
- **Countdown** (prep 30s; in-recording timer bar).
- **Live waveform** visualizer (canvas-based, animated).

---

## 8. States checklist (don't forget these)
- Loading: "Picking a topic…", processing stages, page-level skeletons (optional).
- Empty: no sessions (dashboard, history), no transcript ("no speech detected"),
  chart filter with no data.
- Error: pipeline failure banner; mic denied / no-mic; generic try-again.
- Auth: signed-in vs signed-out header + landing CTA.
- Difficulty variants: 3 / 5 / 7 criteria on results; filler highlight only on
  Medium/Hard.

---

## 9. Responsive / accessibility notes
- **Mobile matters** — recording on a phone is a real use case. The practice
  flow, recorder controls, and results must work well at ~375px wide.
- Most content sits in a centered column (~640–768px max on desktop).
- Keep good contrast (light + dark). Ensure the score colors are distinguishable
  for color-blind users (pair color with the number, which we already do).
- Buttons/targets comfortably tappable on mobile.

---

## 10. Constraints (things that are fixed or semi-fixed)
- **Clerk** provides the sign-in/up forms and the user-avatar menu. Themeable via
  Clerk's appearance options (colors, radius, fonts) but not free-form layout.
- **Recharts** powers the progress chart — fully themeable, but it's an SVG chart
  component, not a hand-drawn graphic.
- **Audio**: currently the browser's native `<audio>` control; can be replaced
  with a custom player design.
- **Framework**: Tailwind utility classes; deliver designs as components/screens,
  ideally with spacing/scale that maps to Tailwind.

---

## 11. What to deliver back (suggested)
- High-fidelity mockups for: Landing, Dashboard, Practice (all 6 step states),
  Results (show a Hard example with 7 criteria + filler highlights), History,
  plus the key empty/error states.
- A small design-token set: color palette (light+dark), type scale, spacing,
  radius, and the score color scale.
- Component specs for the inventory in §7.

---

*Generated from the working app. If a screen detail is ambiguous, the
implementation in `app/` and `components/` is the source of truth.*
