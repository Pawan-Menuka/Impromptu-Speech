import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, jsonLdHtml } from "@/lib/jsonld";
import { TOPICS } from "@/lib/topics";
import { TopicGenerator } from "@/components/topics/TopicGenerator";

export const metadata: Metadata = {
  title: "Random Impromptu Speech Topic Generator",
  description:
    "Free random impromptu speech topic generator — filter by difficulty, get a prompt instantly, take 60 " +
    "seconds to think, then record your answer and get AI feedback.",
  alternates: { canonical: "/topic-generator" },
  openGraph: { url: "/topic-generator" },
};

export default function TopicGeneratorPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdHtml(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Topics", path: "/topics" },
              { name: "Topic Generator", path: "/topic-generator" },
            ])
          ),
        }}
      />

      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-faint">
        <Link href="/" className="hover:text-fg">
          Home
        </Link>
        <span aria-hidden>›</span>
        <Link href="/topics" className="hover:text-fg">
          Topics
        </Link>
        <span aria-hidden>›</span>
        <span className="text-muted">Generator</span>
      </nav>

      <p className="eyebrow">Free tool</p>
      <h1 className="mt-1 font-display text-4xl font-light tracking-tight">
        Random Impromptu Speech Topic Generator
      </h1>

      <div className="mt-4 flex max-w-[60ch] flex-col gap-4 text-[15px] leading-[1.6] text-muted">
        <p>
          Pick a difficulty, hit &ldquo;New topic&rdquo;, and you&apos;ll get a random prompt pulled from a bank of{" "}
          {TOPICS.length} impromptu speech topics — the same ones used across our{" "}
          <Link href="/topics" className="text-fg underline underline-offset-4">
            topic library
          </Link>
          .
        </p>
        <p>
          Give yourself real prep time: hit &ldquo;Start 60s think time&rdquo; to run the same short countdown
          you&apos;d get before a table topics turn or an impromptu interview question, so you practice under
          the same pressure you&apos;ll actually face.
        </p>
        <p>
          When you&apos;re ready, record your answer and get AI feedback on pace, filler words, structure and
          vocabulary — scored 0–100, with specific tips for your next take.
        </p>
      </div>

      <TopicGenerator topics={TOPICS} />
    </main>
  );
}
