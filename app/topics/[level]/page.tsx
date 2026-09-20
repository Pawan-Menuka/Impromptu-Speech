import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopicListPage } from "@/components/topics/TopicListPage";
import { DIFFICULTY_LEVELS, getTopicsByDifficulty, isDifficultyLevel, type DifficultyLevel } from "@/lib/topicPages";

const COPY: Record<
  DifficultyLevel,
  { title: string; eyebrow: string; intro: string; exampleBody: string }
> = {
  easy: {
    title: "50 Easy Impromptu Speech Topics (with Tips)",
    eyebrow: "Easy · beginners, students & ESL learners",
    intro:
      "Easy impromptu speech topics stick to everyday experience — your routine, a hobby, a favorite meal — " +
      "so you can focus on structure and delivery instead of hunting for something to say. They're the right " +
      "starting point if you're new to impromptu speaking, teaching a class, or building confidence before " +
      "tackling harder prompts.",
    exampleBody:
      "Give yourself 10–15 seconds to think, then use a simple frame: make your Point, give a Reason, add a " +
      "short Example from your own life, then restate your Point to close. That's four sentences — plenty for " +
      "a 60–90 second easy-level speech.",
  },
  medium: {
    title: "50 Impromptu Speech Topics for Students (Medium Difficulty)",
    eyebrow: "Medium · students, Toastmasters & table topics",
    intro:
      "Medium topics ask for a light opinion or a structured comparison — a good fit for classroom impromptu " +
      "speaking assignments, Toastmasters table topics, and anyone past the basics. They still draw on " +
      "everyday experience, but reward a clear opening and closing.",
    exampleBody:
      "Open with a one-line answer to the question, then support it with two brief reasons or examples, and " +
      "close by restating your position in different words. Naming your structure out loud (\"there are two " +
      "reasons for this...\") buys you thinking time and sounds organized.",
  },
  hard: {
    title: "50 Challenging Impromptu Speech Topics (Advanced)",
    eyebrow: "Hard · advanced practice & interview prep",
    intro:
      "Hard topics lean into abstract ideas, ethics, and judgment calls with no single right answer. They're " +
      "built for advanced speakers, competitive Toastmasters practice, and interview or graduate-school prep, " +
      "where you need to think on your feet under real pressure.",
    exampleBody:
      "Pick a side quickly — indecision costs you time, not credibility — then defend it with one strong " +
      "reason and one acknowledgment of the counterargument before your close. A confident, structured answer " +
      "beats a hedged one, even on a genuinely hard question.",
  },
};

export function generateStaticParams() {
  return DIFFICULTY_LEVELS.map((level) => ({ level }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ level: string }>;
}): Promise<Metadata> {
  const { level } = await params;
  if (!isDifficultyLevel(level)) return {};
  const { title } = COPY[level];
  return {
    title,
    description: `${title}: practice prompts to speak on the spot, plus tips for answering one — then get AI feedback on your delivery.`,
    alternates: { canonical: `/topics/${level}` },
    openGraph: { url: `/topics/${level}` },
  };
}

export default async function TopicLevelPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  if (!isDifficultyLevel(level)) notFound();

  const topics = getTopicsByDifficulty(level);
  const { title, eyebrow, intro, exampleBody } = COPY[level];

  return (
    <TopicListPage
      eyebrow={eyebrow}
      heading={title}
      intro={intro}
      example={topics[0] ? { prompt: topics[0].text, body: exampleBody } : undefined}
      topics={topics}
      breadcrumbs={[
        { name: "Home", path: "/" },
        { name: "Topics", path: "/topics" },
        { name: title.split(" (")[0], path: `/topics/${level}` },
      ]}
      relatedLinks={[
        ...DIFFICULTY_LEVELS.filter((l) => l !== level).map((l) => ({
          label: `${l[0].toUpperCase()}${l.slice(1)} topics`,
          href: `/topics/${l}`,
        })),
        { label: "Topic generator", href: "/topic-generator" },
      ]}
    />
  );
}
