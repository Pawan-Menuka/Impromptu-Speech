# SEO Plan — Impromptu Speech Trainer

> Plan file for adding search engine optimization (SEO) to the live site at
> **https://impromptu.pawanmenuka.com**. Written so a fresh session (or you) can
> resume from this file alone. Update the **Status** table after every phase.
> Base branch for PRs: `Develop`.

## Status

| Phase | Name | Type | Status |
|---|---|---|---|
| 0 | Search Console + Bing setup | You (browser, ~20 min) | ⬜ Not started |
| 1 | Technical foundation (metadata, robots, sitemap, noindex) | Code | ✅ Done — awaiting deploy + Phase 0 sitemap submission |
| 2 | Icons, manifest, social share image | Code + your artwork | ✅ Code done, interim art — real artwork still needed |
| 3 | Structured data (JSON-LD) | Code | ⬜ Not started |
| 4 | Landing page on-page fixes | Code (no visual change) | ⬜ Not started |
| 5 | Performance / Core Web Vitals | Code + measurement | ⬜ Not started |
| 6 | Public topic library + topic generator | Code (plain UI, you reskin) | ⬜ Not started |
| 7 | Guides (articles) | Writing + code | ⬜ Not started |
| 8 | Backlinks & launch promotion | You (ongoing) | ⬜ Not started |
| 9 | Measure & iterate | You (monthly) | ⬜ Ongoing |

Phases 1–5 are the "make Google understand the site we already have" work.
Phases 6–7 are the part that actually brings **new visitors**. Phase 8 builds the
trust that makes pages rank. Phases 0 and 8–9 happen in browsers, not code.

---

## Part A — SEO in five minutes (read this first)

**What SEO is:** making it easy for search engines (Google, Bing, and the AI
answer engines built on them, such as ChatGPT search, Perplexity, and Copilot) to
**find**, **understand**, and **trust** your pages, so they show them to people
searching for what you offer.

The work falls into three parts:

1. **Technical SEO: can Google read the site?** Crawlable pages, a sitemap, a
   robots.txt, correct titles and descriptions, one "canonical" address per page,
   fast loading, and working on mobile. This is mostly one-time code work
   (Phases 1–5).
2. **Content SEO: is there a page that answers what people search?** Google
   ranks *pages*, not *sites*. People search "impromptu speech topics", "how to
   stop saying um", or "table topics questions". If you have no page about that
   subject, you can't rank for it, however good the app is. **This is the biggest
   gap today** (Phases 6–7).
3. **Authority: do other sites vouch for you?** Links from other websites
   ("backlinks") and mentions on Reddit, Product Hunt, and blogs signal trust.
   This is slow and manual (Phase 8).

**Key terms you'll see in this plan:**

| Term | Meaning |
|---|---|
| Crawl / crawler / Googlebot | Google's robot that downloads your pages |
| Index / indexed | Google has stored the page and *can* show it in results |
| `robots.txt` | File telling crawlers which paths to skip |
| Sitemap (`sitemap.xml`) | List of your public URLs so Google finds them all |
| `noindex` | A tag saying "don't show this page in results" |
| Canonical URL | The one official address of a page (avoids duplicates such as `vercel.app` vs your domain) |
| Title / meta description | The blue link text and the grey snippet in search results |
| Open Graph (OG) image | The preview card shown when the link is shared on WhatsApp, LinkedIn, X, or Discord |
| Structured data / JSON-LD | Hidden machine-readable facts ("this is a web app, it's free, it's in the education category") |
| Core Web Vitals (CWV) | Google's speed metrics: LCP (loading), INP (responsiveness), CLS (layout shift) |
| Keyword | A phrase people type into search |
| Backlink | A link to your site from another site |
| Search Console (GSC) | Google's free dashboard showing how your site performs in search |

**Timeline expectations:** technical fixes are picked up within days to weeks.
New content usually takes **2–6 months** to rank. A new domain with no
backlinks is slowest. SEO compounds, so the earlier content goes live, the
better.

---

## Part B — Audit: where the site is today (2026-09-19)

Checked against the code on branch `claude/website-seo-optimization-f5a341`
(same as `main` @ `d015d04`).

**Public vs private pages**

| Route | Public? | Should be indexed? |
|---|---|---|
| `/` (landing, `components/landing/CinematicLanding.tsx`) | ✅ | **Yes**, the main page |
| `/sign-in`, `/sign-up` | ✅ | No (thin pages, no search value) |
| `/dashboard`, `/practice`, `/results/[id]`, `/history` | ❌ Clerk `auth.protect()` in `proxy.ts` | No |
| `/api/*` | n/a | No |

So the site has **exactly one indexable page** today. That's the core problem
Phases 6–7 fix.

**What's good already**
- `<html lang="en">` is set.
- The landing page is a `"use client"` component, but Next.js still
  **server-renders** it, so the `<h1>`, the four `<h2>` checkpoint headlines, and
  the feature text are in the initial HTML Google downloads. ✅
- Fonts use `next/font` with `display: "swap"` (no invisible text while fonts load).
- Vercel Analytics is installed (`@vercel/analytics`).
- The landing frames are lazy-loaded with a priority backbone (not all 178 on load).

**What's missing or weak**

| # | Issue | Where | Fix in |
|---|---|---|---|
| 1 | No `metadataBase`, so relative OG/canonical URLs can't resolve to the real domain | `app/layout.tsx` | Phase 1 |
| 2 | Title and description are the only metadata. Description is short (69 chars) and has none of the phrases people search | `app/layout.tsx` | Phase 1 |
| 3 | No title template, so every page shows the same title | `app/layout.tsx` | Phase 1 |
| 4 | No `robots.txt` | — | Phase 1 |
| 5 | No `sitemap.xml` | — | Phase 1 |
| 6 | No canonical URL; the `*.vercel.app` production alias can compete as a duplicate | `app/layout.tsx` + Vercel dashboard | Phase 1 |
| 7 | Sign-in/up pages indexable | `app/sign-in`, `app/sign-up` | Phase 1 |
| 8 | No Open Graph or Twitter card, so shared links show no image | — | Phase 2 |
| 9 | Default `favicon.ico`; no `apple-icon`, no web manifest, no `theme-color`; leftover create-next-app files in `public/` (`next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`) | `app/`, `public/` | Phase 2 |
| 10 | No structured data | — | Phase 3 |
| 11 | Landing CTAs are `<button onClick={router.push}>`, which crawlers can't follow (no `<a href>`) | `CinematicLanding.tsx` ~L562 | Phase 4 |
| 12 | `<h1>` ("Find your voice, one breath at a time.") is poetic with no keywords. **Keep it** (it's your design); compensate with title, description, and the "Impromptu Speech Trainer" pill text | — | Phase 4 |
| 13 | 13 MB of landing frames (`public/frames`, 178 webp) still served from Vercel until `NEXT_PUBLIC_FRAME_BASE_URL` is set; 3 Google font families × many weights | `CinematicLanding.tsx`, `layout.tsx` | Phase 5 |
| 14 | Nothing public targets real search phrases, even though **150 curated topics already exist** in `data/topics.json` (EASY/MEDIUM/HARD × categories) | — | Phase 6 |
| 15 | No articles or guides | — | Phase 7 |
| 16 | Site not verified in Google Search Console or Bing Webmaster Tools (assumed; verify) | — | Phase 0 |

**Domain note:** `impromptu.pawanmenuka.com` is a subdomain of your personal
site. Google treats subdomains as mostly separate sites, so it won't inherit much
authority from `pawanmenuka.com`, but it works fine. A dedicated domain (for
example `impromptu.app`, if available) is a slightly stronger brand signal.
**Recommendation: stay on the subdomain for now.** Moving later is possible with
301 redirects, but every move costs some ranking temporarily, so if you ever plan
a dedicated domain, switching *before* Phase 6 is cheapest. All code below reads
the domain from one env var, so switching is a config change.

## Part C — Ground rules for every code phase

- **No visual changes.** You hand-design the UI. SEO code only touches
  `<head>` metadata, invisible JSON-LD, robots/sitemap files, and (Phase 4)
  swapping a `<button>` for a `<Link>` **with identical classes**. New public pages
  (Phases 6–7) ship with plain, functional markup reusing existing classes, and
  you reskin them.
- **Next 16 is newer than most docs online.** Before coding a phase, read the
  matching guide in the main repo's `node_modules/next/dist/docs/01-app/`:
  - `03-api-reference/03-file-conventions/01-metadata/` (`sitemap.md`, `robots.md`, `opengraph-image.md`, `app-icons.md`, `manifest.md`)
  - `03-api-reference/04-functions/generate-metadata.md`, `generate-viewport.md`
  - `02-guides/json-ld.md`, `02-guides/mdx.md`, `02-guides/analytics.md`
- **`metadata` can't be exported from a `"use client"` file.** For client pages
  (`app/practice/page.tsx`, landing is fine because `app/page.tsx` is a server
  wrapper), put the `metadata` export in a sibling `layout.tsx`.
- **Never set `alternates.canonical` in the root layout.** Every page would
  inherit it and tell Google "I'm a copy of the homepage." Set it per page.
- Worktrees have no `node_modules`; run `npm run build` from `D:\GitHub\Impromptu-Speech`
  after pulling, or install in the worktree.
- Verify each phase with `npm run typecheck`, `npm run lint`, `npm run build`
  (CI runs the same), then the phase-specific checks below.

---

## Phase 0 — Search Console + Bing setup (you, ~20 min, do this first)

Starting now means Google begins collecting data before any code lands.

1. **Google Search Console:** go to https://search.google.com/search-console, then
   **Add property**, then **Domain** (not "URL prefix"), and enter `pawanmenuka.com`.
   A *domain* property covers every subdomain, including `impromptu.` and future ones.
2. It shows a `TXT` record (`google-site-verification=…`). Add it at your DNS
   provider for `pawanmenuka.com` (the same place `impromptu` DNS lives, per
   HANDOFF §6b), then click **Verify**. DNS can take minutes to hours.
3. After Phase 1 is deployed: **Sitemaps**, then submit
   `https://impromptu.pawanmenuka.com/sitemap.xml`.
4. **URL Inspection:** paste the homepage URL, then **Request indexing**.
5. **Bing Webmaster Tools:** https://www.bing.com/webmasters, then **Import from
   Google Search Console** (one click). Bing also feeds ChatGPT search, Copilot,
   and DuckDuckGo, so it's worth the two minutes.

**Done when:** both dashboards show the site as verified. (The data takes 2–3
days to appear.)

---

## Phase 1 — Technical foundation (code, 1 session) [done]

**Shipped 2026-09-19** on branch `claude/website-seo-optimization-f5a341`, not yet
merged/deployed. Files added: `lib/site.ts`, `app/robots.ts`, `app/sitemap.ts`,
`app/practice/layout.tsx`. Files edited: `app/layout.tsx` (metadataBase, title
template, OG/Twitter, viewport themeColor), `app/page.tsx` (canonical `/`),
`app/sign-in/[[...sign-in]]/page.tsx`, `app/sign-up/[[...sign-up]]/page.tsx`,
`app/dashboard/page.tsx`, `app/history/page.tsx`, `app/results/[id]/page.tsx`
(all `noindex`), `.env.example` (`NEXT_PUBLIC_SITE_URL` documented).

Verified: `npx tsc --noEmit` clean; `npx eslint app lib` clean; `next build`
with CI's placeholder env clean (`/robots.txt` and `/sitemap.xml` prerender as
static ○ routes); `next start` curl checks all matched the plan exactly —
robots.txt rules + sitemap line, sitemap.xml XML, canonical
`https://impromptu.pawanmenuka.com`, `/sign-in` `<meta name="robots"
content="noindex, follow">`, homepage `<title>Impromptu — AI Impromptu Speech
Practice &amp; Feedback</title>`, and `/practice`/`/dashboard`/`/history`
307-redirect to Clerk sign-in for anonymous requests (proxy protection intact;
the `noindex` metadata on those pages is defense-in-depth, not the primary guard).

**Deviation from the plan text:** `app/page.tsx` sets only
`alternates.canonical` — no `openGraph.url` override — because Next metadata
merges `openGraph` shallowly, so setting it in a child would have silently
replaced the whole root `openGraph` object.

**Not done yet (needs you, not code):** Phase 0 (GSC/Bing verification), Vercel
`vercel.app` → prod-domain redirect (1.8), `NEXT_PUBLIC_SITE_URL` set in Vercel
prod env, merge + deploy, then submit the sitemap in GSC.

**Open decision still pending from Part F:** is the app free? (affects OG/Twitter
copy and future JSON-LD `offers` in Phase 3) — using neutral wording for now,
no "free" claim anywhere in what shipped.

### 1.1 Site constants — new file `lib/site.ts`

```ts
// Single source of truth for the public URL and brand strings used in SEO
// metadata, robots.txt, the sitemap and JSON-LD.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://impromptu.pawanmenuka.com"
).replace(/\/+$/, "");

export const SITE_NAME = "Impromptu";
export const SITE_TITLE = "Impromptu — AI Impromptu Speech Practice & Feedback";
export const SITE_DESCRIPTION =
  "Practice impromptu speaking: get a random topic, record a 1–2 minute speech, " +
  "and get AI feedback on pace, filler words, structure and vocabulary.";
```

Add to `.env.example` (and Vercel → Settings → Environment Variables, Production):

```bash
# --- SEO ---
# Canonical public URL (no trailing slash). Used for metadata, sitemap, robots.
NEXT_PUBLIC_SITE_URL="https://impromptu.pawanmenuka.com"
```

Why an env var: preview deployments and a possible future domain change stay a
config edit, not a code edit.

### 1.2 Root metadata — edit `app/layout.tsx`

Replace the current `metadata` export:

```ts
import type { Metadata, Viewport } from "next";
import { SITE_URL, SITE_NAME, SITE_TITLE, SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  // Verification via DNS (Phase 0) needs no meta tag. Only add
  // `verification: { google: "…" }` if you chose the URL-prefix method.
};

export const viewport: Viewport = {
  themeColor: "#141011", // matches the Clerk/app background
};
```

Title rules of thumb: under ~60 characters, main phrase first, brand last.
Description: ~140–160 characters, a plain sentence a human would click.
Descriptions don't directly affect ranking, but they affect *click rate*.

⚠️ **Only claim "free" in titles, descriptions, or JSON-LD if the product really
is free.** Decide this before Phase 3.

### 1.3 Homepage canonical — edit `app/page.tsx`

```ts
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};
```

### 1.4 `noindex` for non-public pages

Add to each (in `page.tsx` if it's a server component, otherwise a new sibling `layout.tsx`):

| Route | File | `metadata` |
|---|---|---|
| `/sign-in` | `app/sign-in/[[...sign-in]]/page.tsx` (or layout) | `{ title: "Sign in", robots: { index: false, follow: true } }` |
| `/sign-up` | `app/sign-up/[[...sign-up]]/page.tsx` (or layout) | `{ title: "Create your account", robots: { index: false, follow: true } }` |
| `/dashboard` | `app/dashboard/page.tsx` | `{ title: "Dashboard", robots: { index: false, follow: false } }` |
| `/history` | `app/history/page.tsx` | `{ title: "History", robots: { index: false, follow: false } }` |
| `/practice` | **new** `app/practice/layout.tsx` (page is a client component) | `{ title: "Practice", robots: { index: false, follow: false } }` |
| `/results/[id]` | `app/results/[id]/page.tsx` (or layout) | `{ title: "Results", robots: { index: false, follow: false } }` |

The private pages already redirect logged-out visitors (and Googlebot) via
`proxy.ts`, so this is belt-and-braces. It also gives each tab a proper title
through the template ("Dashboard · Impromptu").

`app/practice/layout.tsx` template:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Practice",
  robots: { index: false, follow: false },
};

export default function PracticeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

### 1.5 `robots.txt` — new file `app/robots.ts`

```ts
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private app routes + API. Sign-in/up are deliberately NOT disallowed:
        // Google must be able to crawl them to see their `noindex` tag.
        disallow: ["/api/", "/dashboard", "/practice", "/results", "/history"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
```

AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) are **allowed** by
this rule. Being quotable in AI answers is free exposure for a product like this.
Add `{ userAgent: "GPTBot", disallow: "/" }`-style rules only if you decide otherwise.

### 1.6 Sitemap — new file `app/sitemap.ts`

```ts
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    // Phase 6 adds /topics pages; Phase 7 adds /guides pages.
  ];
}
```

List **only** public, indexable, canonical URLs. Never list sign-in or private pages.

### 1.7 Proxy check

`proxy.ts`'s matcher excludes `.txt` files but not `.xml`, so Clerk's middleware
runs on `/sitemap.xml`. That's harmless because it isn't a protected route. Just
confirm in 1.9 that the sitemap returns `200` with XML, not a redirect.

### 1.8 Kill the `vercel.app` duplicate (you, Vercel dashboard)

Vercel → Project → Settings → **Domains**: edit the `<project>.vercel.app` entry
and set it to **Redirect to** `impromptu.pawanmenuka.com` (308). Preview
deployments are already `noindex`ed by Vercel automatically.

### 1.9 Verify Phase 1

- `npm run build` passes. `npm run start`, then:
  - `curl -s localhost:3000/robots.txt` shows the rules and the sitemap line
  - `curl -s localhost:3000/sitemap.xml` returns valid XML with the homepage
  - `curl -s localhost:3000/ | grep -o '<link rel="canonical"[^>]*>'` shows the absolute prod URL
  - `curl -s localhost:3000/sign-in | grep -o '<meta name="robots"[^>]*>'` shows `noindex`
- After deploy: https://impromptu.pawanmenuka.com/robots.txt and `/sitemap.xml` load;
  submit the sitemap in Search Console (Phase 0 step 3).

**Done when:** all checks pass on production and the sitemap status in GSC is "Success".

---

## Phase 2 — Icons, manifest, social share image (code + your artwork) [done, interim art]

**Shipped 2026-09-19.** Code plumbing is in place; the artwork is a plain
interim placeholder, not your final design.

Files added: `app/icon.tsx`, `app/apple-icon.tsx`, `app/opengraph-image.tsx`
(all generated via `next/og` `ImageResponse`, reusing the header's own
`.logo-dot` gradient mark and brand colors from `globals.css` — no new design
invented), `app/manifest.ts`. Removed the unused create-next-app leftovers
(`public/next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg` — confirmed
zero references first).

**Deviation from the plan text:** the plan's `manifest.ts` example and the
`icon.png`/`apple-icon.png` file convention assume static image *files*.
Instead this shipped the **code-generation** convention (`icon.tsx` /
`apple-icon.tsx` / `opengraph-image.tsx`), which Next serves at hashed paths
like `/icon?a298a36f416b5106`, not a stable `/icon.png`. So `manifest.ts`
points its one icon entry at the existing static `favicon.ico` (confirmed via
`next build` + `next start` + curl that this is the only stable, literal path
available) rather than the plan's `/icon.png`.

**Verified:** tsc/eslint/build clean; `next start` + curl confirmed the
rendered `<head>` (`rel="icon"`, `rel="apple-touch-icon"`, `rel="manifest"`,
`og:image`/`twitter:image` meta with correct 1200×630 / 512×512 / 180×180
dimensions and absolute prod URLs); downloaded and visually inspected all
three generated PNGs — correct size, on-brand gradient dot, readable wordmark.

**Still needed (you):** design the real 1200×630 share image and (optionally)
a real icon/apple-icon PNG per the table above, then add them as static files
in `app/` — Next automatically prefers a static file over the generated route
of the same name, so no code changes will be needed to switch them in. Also
re-run the opengraph.xyz / LinkedIn Post Inspector checks after deploy.

Next.js picks these up by **file name** in `app/`. No code wiring is needed.

| File (in `app/`) | Size | Purpose |
|---|---|---|
| `favicon.ico` (replace the default) | 32×32 (multi-size .ico ok) | Browser tab, Google result icon |
| `icon.png` | 512×512 | Modern favicon; Google shows your logo next to results |
| `apple-icon.png` | 180×180 | iOS home screen |
| `opengraph-image.png` | **1200×630** | Link previews (WhatsApp, LinkedIn, X, Discord, Slack) |
| `opengraph-image.alt.txt` | text | e.g. `Impromptu — AI impromptu speech trainer` |

**Your design task:** a 1200×630 share image (logo + one line like "Practice
impromptu speaking with AI feedback", on the dark `#141011` background, key text
inside the centre ~1000×500 because some apps crop). A strong landing frame with
the wordmark works well. Until you've made it, the builder may generate a plain
interim version with `next/og` `ImageResponse` in `app/opengraph-image.tsx`
(see `opengraph-image.md`). Replace it with your PNG when ready.

**Web manifest:** new `app/manifest.ts`:

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Impromptu — AI Speech Trainer",
    short_name: "Impromptu",
    start_url: "/",
    display: "standalone",
    background_color: "#141011",
    theme_color: "#141011",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }],
  };
}
```

**Cleanup:** delete the unused create-next-app leftovers `public/next.svg`,
`public/vercel.svg`, `public/file.svg`, `public/globe.svg`, `public/window.svg`
(first confirm with `grep -rn "next.svg\|vercel.svg\|file.svg\|globe.svg\|window.svg" app components`).

**Verify:** after deploy, paste the URL into https://www.opengraph.xyz and the
LinkedIn Post Inspector (https://www.linkedin.com/post-inspector/). Both should
show the image, title, and description. Send the link to yourself on WhatsApp.

**Done when:** the preview card renders everywhere and the tab shows your icon.

---

## Phase 3 — Structured data / JSON-LD (code, short)

Tells search engines (and AI answer engines) explicitly *what* the site is.

In `app/page.tsx` (server component), per `02-guides/json-ld.md`:

```tsx
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      alternateName: "Impromptu Speech Trainer",
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: "Impromptu Speech Trainer",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web browser",
      // ONLY if genuinely free (see Phase 1.2):
      // offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: [
        "Random impromptu speech topics by difficulty",
        "Timed 1–2 minute speech recording",
        "AI scoring of content and delivery (0–100)",
        "Filler word counting and pace (words per minute)",
        "Progress tracking over time",
      ],
      author: { "@type": "Person", name: "<YOUR PUBLIC NAME>", url: "https://pawanmenuka.com" },
    },
  ],
};

// inside the component's returned JSX, alongside <CinematicLanding />:
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
/>
```

(Confirm the author name and URL you want public before shipping.)

**Be realistic:** Google shows *star-rating* rich results for apps only with real
`aggregateRating`/reviews. **Never invent ratings** (that's a manual-penalty
offense). FAQ rich results have been limited to government and health sites since
2023, so don't add FAQ schema expecting special snippets. JSON-LD's value here is
understanding and entity recognition, not visual extras.

**Verify:** https://search.google.com/test/rich-results and
https://validator.schema.org show 0 errors.

---

## Phase 4 — Landing page on-page fixes (code, no visual change)

1. **Make CTAs real links.** In `CinematicLanding.tsx` (~L562), "Start your first
   speech" is a `<button onClick={goPractice}>`. Crawlers only follow `<a href>`.
   Replace it with `next/link` `<Link href={isSignedIn ? "/practice" : "/sign-up"}>`
   (this is exactly what `goPractice` does today, L413) and keep the **exact same
   `className`** and children. Do the same for the final "Record" CTA if it
   navigates. Keep "See how it works" as a `<button>`, because it scrolls in-page.
2. **Keywords without touching the design.** Keep the poetic `<h1>`. The phrases
   Google should associate with the page already appear in visible text: the
   "Impromptu Speech Trainer" pill, the subtitle, and the four feature rows (pace,
   filler words, structure, vocabulary). The title and description from Phase 1
   carry the main phrases. *Optional, your call as designer:* a small
   below-the-fold section or footer with 2–3 sentences of plain text and links to
   `/topics` and `/guides` once they exist (Phases 6–7). Internal links from the
   homepage are how Google discovers and values new pages.
3. **Heading order is already correct** (one `<h1>`, then `<h2>` per
   checkpoint). Don't add more `<h1>`s.
4. Give the landing `<canvas>` `aria-hidden` (it's decorative, and the meaning
   is in the text). This is an accessibility nicety that also keeps audits clean.

**Verify:** view source (Ctrl+U) on production and confirm `<a href="/sign-up"`
(or `/practice`) is present. Lighthouse SEO score (Chrome DevTools → Lighthouse →
SEO) should be **100**.

---

## Phase 5 — Performance / Core Web Vitals (code + measurement)

Speed is a (modest) ranking factor and a big conversion factor.

1. **Measure first:** https://pagespeed.web.dev on the homepage, **Mobile** tab.
   Record LCP / INP / CLS here. Targets: **LCP < 2.5 s, INP < 200 ms, CLS < 0.1**.
   Baseline: _fill in_.
2. **Move frames off Vercel** (already planned in HANDOFF): upload with
   `npm run frames:upload` and set `NEXT_PUBLIC_FRAME_BASE_URL`. Note that
   Cloudflare rate-limits `r2.dev` URLs and they're meant for development, so a
   custom domain on the bucket is the proper production setup when available.
3. **Trim fonts:** `layout.tsx` loads Cormorant (4 weights × 2 styles), Hanken
   (4), and Jost (3). `grep` the codebase for which `font-light`/`font-medium`/etc.
   are actually used with each family and drop unused weights. Fewer font files
   means faster first paint. (No visual change if only unused weights are removed.)
4. **Real-user metrics:** `npm i @vercel/speed-insights` and add
   `<SpeedInsights />` next to `<Analytics />` in `layout.tsx`. The Vercel
   dashboard then shows CWV from real visitors (check the free-tier quota).
5. Make sure the first landing frame (the one visible on load) is fetched first
   and nothing shifts when it appears. The backbone preload does this; confirm CLS
   ≈ 0 in PageSpeed.

**Done when:** PageSpeed mobile is green (or improved and the remaining issues are
understood), with before/after numbers written here.

---

## Part D — Keyword strategy (read before Phases 6–7)

A **keyword** is a phrase real people type. Each public page targets **one
main phrase** (plus close variants). Never target the same phrase with two pages.

**The brand problem:** "impromptu" is a common English word, so you'll rarely rank
for the bare word. Always pair it: "Impromptu speech trainer".

**Candidate keywords and which page owns them.** Volumes aren't listed on
purpose. Check them yourself with the free tools below before writing.

| Search intent | Example phrases | Page that targets it |
|---|---|---|
| Wants topics | impromptu speech topics · easy impromptu speech topics · impromptu topics for students · table topics questions | `/topics`, `/topics/easy`, `/topics/medium`, `/topics/hard` |
| Wants a tool | random impromptu speech topic generator · random speech topic | `/topic-generator` |
| Wants to learn | how to give an impromptu speech · impromptu speech structure · how to stop saying um · filler words · speaking pace words per minute · table topics tips · how to think on your feet | `/guides/*` (Phase 7) |
| Wants an app | AI speech coach · public speaking practice app · practice public speaking online | `/` (homepage) |
| Comparing apps | Yoodli alternative · Orai alternative | later: `/compare/*` (only once you have real users/feedback) |

**Free keyword tools**
- **Google autocomplete** plus the **"People also ask"** box on the results page (best for finding questions to answer in guides)
- **Google Trends** (trends.google.com) for comparing two phrases
- **Bing Webmaster Tools → Keyword Research** (free after Phase 0)
- **Search Console → Performance** (after 3–4 weeks this shows the *actual* phrases you appear for, which is the most valuable source)
- Ahrefs / Semrush free keyword generators (limited but give rough volumes)

**How to target a keyword on a page:** put it (naturally) in the `<title>`,
the `<h1>`, the URL slug, the first paragraph, and one or two `<h2>`s. That's
enough. **Don't** repeat it unnaturally ("keyword stuffing" gets penalized).

---

## Phase 6 — Public topic library + topic generator (code, 2 sessions)

**Why this is the highest-value phase:** you already own 150 curated, graded
topics (`data/topics.json`: 50 EASY / 50 MEDIUM / 50 HARD). "Impromptu speech
topics" pages are what students, teachers, Toastmasters members, and interview
preppers search for. Every page ends with "Practice this with AI feedback", which
is the funnel into the app.

### 6.1 Routes (all public, statically generated)

| Route | Content | Target phrase |
|---|---|---|
| `/topics` | Hub: ~300 words of genuine advice (what impromptu speaking is, how to pick a level, the PREP structure in 4 lines), links to the 3 levels + 4 categories + generator, a sample of 10 topics | impromptu speech topics |
| `/topics/easy` | Intro (who it's for: beginners, students, ESL), the 50 EASY topics as a numbered list, a "how to answer one" example, CTA | easy impromptu speech topics |
| `/topics/medium` | Same pattern, 50 MEDIUM | impromptu speech topics for students / table topics questions |
| `/topics/hard` | Same pattern, 50 HARD | challenging / advanced impromptu speech topics |
| `/topics/category/[category]` | **Only for categories with ≥ 10 topics**: today `society` (15), `philosophy` (15), `technology` (14), `ethics` (14). Intro + list + CTA | impromptu speech topics about technology, etc. |
| `/topic-generator` | Client tool: difficulty filter, "New topic" button, optional 60-s prep countdown, then CTA "Record it and get AI feedback" → `/sign-up` (or `/practice` if signed in). Server-render a heading + 3 paragraphs of explanation so the page isn't empty to crawlers | random impromptu speech topic generator |

**Don't** create one page per individual topic (150 one-sentence pages are
"thin content" and can drag down the whole site). Categories with fewer than 10
topics stay unlisted until the bank grows.

### 6.2 Implementation notes

- New `lib/topicPages.ts`: pure helpers over the existing `data/topics.json`
  (reuse the id scheme in `lib/topics.ts`):
  `getTopicsByDifficulty(d)`, `getIndexableCategories(min = 10)`, `getTopicsByCategory(c)`.
- `app/topics/[level]/page.tsx` with `generateStaticParams()` returning
  `easy|medium|hard`; `notFound()` for anything else.
  `app/topics/category/[category]/page.tsx` with `generateStaticParams()` from
  `getIndexableCategories()`. Both are server components and fully static.
- Each page exports `generateMetadata` → unique `title`, `description`,
  `alternates.canonical`, `openGraph.url`. Example title:
  `"50 Easy Impromptu Speech Topics (with Tips)"` → rendered as
  "50 Easy Impromptu Speech Topics (with Tips) · Impromptu".
- JSON-LD per page: `BreadcrumbList` (Home › Topics › Easy) + `ItemList` of the topics.
- Breadcrumb links, and links between levels, at the top or bottom of each page (internal linking).
- **Add every route to `app/sitemap.ts`** (import the helpers so the sitemap can't drift).
- `proxy.ts` doesn't protect `/topics` or `/topic-generator`; confirm they load logged out.
- **Plain, functional UI** reusing existing classes (`font-display`, `text-muted`,
  `btn-accent`, etc.). You reskin afterwards.
- *Optional feature:* deep-link a topic into practice (`/practice?topic=<id>`).
  `app/practice/page.tsx` doesn't read search params today, so this is a small
  feature change. Do it only if you want "Practice this topic" buttons per topic.
- **Grow the bank** over time (`data/topics.json` → re-run `npm run db:seed`, per
  the invariant in `lib/topics.ts`). "100 easy impromptu speech topics" beats 50.
  Hand-review generated topics for quality.

### 6.3 Link them in

Pages nobody links to rank poorly. Link `/topics` and `/topic-generator` from:
the landing page (your design choice from Phase 4.2), the `AppHeader` for
logged-out users (optional), the not-found page, and every guide in Phase 7.

**Verify:** build passes; all pages return 200 logged out; each has a unique
title, canonical, and one `<h1>`; `sitemap.xml` lists them; Rich Results Test is
valid; Lighthouse SEO = 100. After deploy, request indexing for `/topics` in GSC.

**Done when:** deployed, in the sitemap, and GSC "Pages" shows them discovered.

---

## Phase 7 — Guides / articles (writing + code; ongoing)

This is where most long-term traffic comes from. Code setup is one session; the
writing is ongoing.

### 7.1 Setup

- MDX via `@next/mdx`. Follow `node_modules/next/dist/docs/01-app/02-guides/mdx.md`
  exactly, because Next 16 setup (the `mdx-components.tsx` file, `next.config.ts`
  `pageExtensions`) differs from older tutorials.
- One folder per article: `app/guides/<slug>/page.mdx`, with
  `export const metadata = { title, description, alternates: { canonical: "/guides/<slug>" } }`.
- Registry `lib/guides.ts`:
  `export const GUIDES = [{ slug, title, description, datePublished, dateModified }]`,
  used by the `/guides` index page, the sitemap, and `Article` JSON-LD
  (`headline`, `datePublished`, `dateModified`, `author`).
- Simple readable article layout (`app/guides/layout.tsx`): max-width prose
  column, byline + date, "Practice this" CTA box at the end. Plain; you reskin.

### 7.2 First 10 guides (in suggested order)

| # | Slug | Target phrase | Angle / unique value |
|---|---|---|---|
| 1 | `how-to-give-an-impromptu-speech` | how to give an impromptu speech | Step-by-step; the pillar page all others link to |
| 2 | `impromptu-speech-structures` | impromptu speech structure | PREP, Past-Present-Future, Problem-Solution, with worked examples using your topics |
| 3 | `how-to-stop-saying-um` | how to stop saying um | Tie in the app's filler-word counter; show a real before/after |
| 4 | `filler-words-list` | filler words | The list the app detects (`lib/fillers.ts`) + why they happen |
| 5 | `speaking-pace-words-per-minute` | speaking rate words per minute | What WPM the app considers ideal and why |
| 6 | `table-topics-tips` | table topics tips | For Toastmasters; links to `/topics/medium` |
| 7 | `impromptu-speech-examples` | impromptu speech examples | **Unique:** real transcripts + the app's actual scores and feedback (yours, anonymized) |
| 8 | `practice-public-speaking-alone` | how to practice public speaking at home | A routine using the app |
| 9 | `think-on-your-feet` | how to think on your feet | Interviews and meetings angle |
| 10 | `impromptu-speaking-for-students` | impromptu speaking for students | Teachers/students; links to `/topics/easy` |

### 7.3 Writing rules (what Google rewards now)

- **Answer the question in the first 2–3 sentences**, then go deeper. This also
  makes AI answer engines likely to quote and cite you.
- **First-hand experience wins:** screenshots of the app's feedback, your own
  practice results, and specific numbers. Generic advice that every site has won't rank.
- Clear `<h2>`/`<h3>` sections phrased like the questions people ask ("How long
  should an impromptu speech be?").
- 800–2,000 words when the topic needs it. Don't pad.
- 3–5 internal links (other guides, `/topics/*`, `/topic-generator`) and a CTA.
- Byline with your name + a short "about the author" line (trust signal).
- AI-assisted drafting is fine, **but edit hard and add your own experience.**
  Publishing large amounts of unedited AI text is exactly what Google's "scaled
  content abuse" policy targets.
- Update old guides (and `dateModified`) instead of writing near-duplicates.

**Cadence (solo-realistic):** launch with guides 1–3, then **2 per month**.
Consistency beats bursts.

**Verify per guide:** unique title/description/canonical, in the sitemap, valid
`Article` JSON-LD, request indexing in GSC after publishing.

---

## Phase 8 — Backlinks & launch promotion (you, ongoing)

A backlink from a relevant, real site is a vote of trust. **Never buy links** or
use link schemes. Google penalizes them.

**Easy wins (week 1)**
- Link to the app from `pawanmenuka.com` (homepage or projects page) and your
  GitHub profile / repo README (if public), LinkedIn, and X bio.
- AI/tool directories: There's An AI For That, Futurepedia, AlternativeTo (list it
  as an alternative to Yoodli / Orai / Poised), SaaSHub, BetaList.

**Launch moments (pick 1–2, spaced out)**
- **Product Hunt** launch (prepare the OG image, a GIF of the landing, and 3 screenshots)
- **Show HN** on Hacker News (technical angle: Next 16 + AssemblyAI + Claude scoring)
- **Indie Hackers** build story

**Communities (be helpful first, promote second, always disclose you built it)**
- Reddit: r/PublicSpeaking, r/Toastmasters, r/SideProject, r/EnglishLearning (read each sub's self-promo rules)
- Toastmasters clubs and district newsletters, university debate/speech societies:
  offer the topic library as a free resource (that page is easier to link to than an app)

**Linkable assets:** `/topics` and the best guides are what people naturally link
to ("here's a list of 150 topics"), so promote those, not just the homepage.

Log every link and submission here so you don't repeat effort:

| Date | Where | URL | Status |
|---|---|---|---|
| | | | |

---

## Phase 9 — Measure & iterate (you, 30 min monthly)

**Search Console, monthly**
1. **Performance → Search results:** check clicks, impressions, CTR, and average position. Filter by page.
2. Queries with **position 8–20** are "almost there": improve that page (expand
   the section answering the query, add internal links to it).
3. Pages with **many impressions but CTR < 2%**: rewrite the `title`/`description` to be more clickable.
4. **Indexing → Pages:** fix anything listed as "Crawled – currently not indexed"
   (usually thin or duplicate content) or "Excluded by noindex" (make sure only
   the intended pages are there).
5. **Experience → Core Web Vitals:** stays green.

**Vercel Analytics:** check referrers (google, bing, chatgpt.com, perplexity) and
top pages. Organic sign-ups are the real success metric, not rankings.

**Milestones to expect (rough):** month 1, indexed with brand searches working;
months 2–3, first impressions for topic pages; months 3–6, steady organic clicks
if Phases 6–8 were done consistently.

---

## Part E — Don'ts / known risks

| Risk | Mitigation |
|---|---|
| Canonical set in root layout makes every page claim to be the homepage | Canonical per page only (Phase 1.3) |
| Accidentally `noindex`ing public pages, or robots blocking `/_next/` (breaks rendering for Google) | Phase 1 curl checks; never disallow `/_next`; check GSC "Pages" monthly |
| Disallowing a URL in robots.txt *and* `noindex`ing it (Google can't see the noindex) | Sign-in/up are noindex only, not disallowed |
| Thin programmatic pages (one per topic / tiny categories) | ≥ 10-topic threshold; no per-topic pages |
| Mass AI-generated articles | Edited, experience-backed guides at a sustainable cadence |
| Fake ratings/reviews in JSON-LD | Only real data; omit `aggregateRating` until real |
| Claiming "free" when it isn't | Decide pricing wording before Phases 1.2/3 |
| Redesigning your UI for "SEO" | Metadata and plain pages only; visual changes are yours |
| `vercel.app` duplicate | 308 redirect (Phase 1.8) |
| Domain change later loses rankings temporarily | Decide subdomain vs dedicated domain before Phase 6 |
| Expecting fast results | SEO takes 3–6 months; Phases 0–5 still pay off immediately for link previews and brand search |

---

## Part F — Suggested session order (solo)

| Session | Work |
|---|---|
| 1 | Phase 0 (you) + Phase 1 → PR to `Develop` |
| 2 | Phases 2 (with interim OG image), 3, 4 → PR |
| 3 | Phase 5 (measure, frames, fonts, Speed Insights) → PR |
| 4 | Phase 6.1–6.2: `/topics` hub + level pages + sitemap → PR |
| 5 | Phase 6: category pages + `/topic-generator` → PR; you reskin the new pages |
| 6 | Phase 7 setup + guide #1 → PR |
| then | 2 guides/month (Phase 7), promotion (Phase 8), monthly review (Phase 9) |

**Open decisions for you (answer before the phase that needs it):**
1. Is the app free (entirely, or with a free tier)? Affects copy and JSON-LD (Phases 1, 3).
2. Public author name for bylines and JSON-LD (Phases 3, 7).
3. Stay on `impromptu.pawanmenuka.com` or move to a dedicated domain? (before Phase 6)
4. Do you want the per-topic "Practice this topic" deep link? (Phase 6, optional)
