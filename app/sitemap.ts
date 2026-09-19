import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// List only public, indexable, canonical URLs — never sign-in or private pages.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    // SEO Phase 6 adds /topics pages; Phase 7 adds /guides pages.
  ];
}
