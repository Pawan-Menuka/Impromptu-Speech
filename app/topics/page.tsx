import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, itemListJsonLd, jsonLdHtml } from "@/lib/jsonld";
import { DIFFICULTY_LEVELS, getIndexableCategories, slugToTitle } from "@/lib/topicPages";
import { TOPICS } from "@/lib/topics";
import { PracticeCta } from "@/components/topics/PracticeCta";

const TITLE = "Impromptu Speech Topics";

export const metadata: Metadata = {
  title: TITLE,
  description:
    "150 impromptu speech topics by difficulty and category — free prompts for practice, table topics, " +
    "classroom assignments and interview prep, plus a quick guide to answering one on the spot.",
  alternates: { canonical: "/topics" },
  openGraph: { url: "/topics" },
};

// A deterministic (build-stable) sample rather than random, so the page and
// its ItemList JSON-LD stay identical between builds.
const SAMPLE_TOPICS = TOPICS.filter((t) => t.difficulty === "MEDIUM").slice(0, 10);

export default function TopicsHubPage() {
  const categories = getIndexableCategories();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdHtml(breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Topics", path: "/topics" }])),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdHtml(itemListJsonLd("Sample impromptu speech topics", SAMPLE_TOPICS.map((t) => ({ name: t.text })))),
        }}
      />

      <p className="eyebrow">Free practice prompts</p>
      <h1 className="mt-1 font-display text-4xl font-light tracking-tight">{TITLE}</h1>

      <div className="mt-4 flex max-w-[60ch] flex-col gap-4 text-[15px] leading-[1.6] text-muted">
        <p>
          An impromptu speech is a talk you give with little or no preparation — usually 30 seconds to think,
          then 1–2 minutes to speak. It&apos;s how Toastmasters table topics work, how many interviews and classroom
          assignments are run, and a core skill for thinking clearly under pressure in meetings and Q&As.
        </p>
        <p>
          Pick a level based on how comfortable you are: <strong className="text-fg">easy</strong> topics stay
          close to everyday experience, <strong className="text-fg">medium</strong> topics ask for a light
          opinion or comparison, and <strong className="text-fg">hard</strong> topics lean into abstract or
          ethical questions with no single right answer.
        </p>
        <p>
          A simple structure carries almost any impromptu topic: state your <strong className="text-fg">Point</strong>,
          give a <strong className="text-fg">Reason</strong>, add a short <strong className="text-fg">Example</strong>,
          then restate your <strong className="text-fg">Point</strong> to close (PREP). Four sentences is enough
          for a short answer, and naming your structure out loud buys you thinking time.
        </p>
      </div>

      <Link
        href="/topic-generator"
        className="btn-accent mt-8 inline-flex h-12 items-center gap-2 rounded-full px-8 font-label text-xs uppercase tracking-[0.2em]"
      >
        Get a random topic
      </Link>

      <h2 className="mt-12 font-display text-2xl font-light">Browse by difficulty</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        {DIFFICULTY_LEVELS.map((level) => (
          <Link
            key={level}
            href={`/topics/${level}`}
            className="btn-ghost rounded-full px-6 py-3 font-label text-xs uppercase tracking-[0.2em]"
          >
            {level[0].toUpperCase() + level.slice(1)}
          </Link>
        ))}
      </div>

      {categories.length > 0 && (
        <>
          <h2 className="mt-10 font-display text-2xl font-light">Browse by category</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {categories.map(({ category }) => (
              <Link
                key={category}
                href={`/topics/category/${category}`}
                className="btn-ghost rounded-full px-6 py-3 font-label text-xs uppercase tracking-[0.2em]"
              >
                {slugToTitle(category)}
              </Link>
            ))}
          </div>
        </>
      )}

      <h2 className="mt-10 font-display text-2xl font-light">A sample of the topics</h2>
      <ol className="mt-4 flex flex-col gap-1 border-t border-white/[.08]">
        {SAMPLE_TOPICS.map((t, i) => (
          <li
            key={t.id}
            className="flex items-baseline gap-3 border-b border-white/[.08] py-3 text-[15px] leading-[1.5] text-fg/90"
          >
            <span className="font-label text-xs tabular-nums text-faint">{i + 1}</span>
            <span>{t.text}</span>
          </li>
        ))}
      </ol>

      <PracticeCta className="btn-ghost mt-6 inline-flex h-11 items-center rounded-full px-6 font-label text-xs uppercase tracking-[0.2em]">
        Practice one of these now
      </PracticeCta>
    </main>
  );
}
