import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopicListPage } from "@/components/topics/TopicListPage";
import { DIFFICULTY_LEVELS, getIndexableCategories, getTopicsByCategory, slugToTitle } from "@/lib/topicPages";

export function generateStaticParams() {
  return getIndexableCategories().map(({ category }) => ({ category }));
}

function isIndexable(category: string): boolean {
  return getIndexableCategories().some((c) => c.category === category);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  if (!isIndexable(category)) return {};
  const title = `Impromptu Speech Topics About ${slugToTitle(category)}`;
  return {
    title,
    description: `${title}: practice prompts on ${category}, ready to speak on the spot — then get AI feedback on your delivery.`,
    alternates: { canonical: `/topics/category/${category}` },
    openGraph: { url: `/topics/category/${category}` },
  };
}

export default async function TopicCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!isIndexable(category)) notFound();

  const topics = getTopicsByCategory(category);
  const title = `Impromptu Speech Topics About ${slugToTitle(category)}`;

  return (
    <TopicListPage
      eyebrow={`Category · ${slugToTitle(category)}`}
      heading={title}
      intro={`A focused set of impromptu speech prompts about ${category} — useful for themed practice sessions, ` +
        `classroom units, or just working a subject you want to get sharper at speaking about on the spot.`}
      topics={topics}
      breadcrumbs={[
        { name: "Home", path: "/" },
        { name: "Topics", path: "/topics" },
        { name: slugToTitle(category), path: `/topics/category/${category}` },
      ]}
      relatedLinks={[
        ...DIFFICULTY_LEVELS.map((l) => ({ label: `${l[0].toUpperCase()}${l.slice(1)} topics`, href: `/topics/${l}` })),
        { label: "Topic generator", href: "/topic-generator" },
      ]}
    />
  );
}
