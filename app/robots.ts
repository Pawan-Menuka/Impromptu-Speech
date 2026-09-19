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
