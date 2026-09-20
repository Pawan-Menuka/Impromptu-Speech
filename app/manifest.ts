import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_TITLE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE,
    short_name: SITE_NAME,
    start_url: "/",
    display: "standalone",
    background_color: "#0b0809",
    theme_color: "#0b0809",
    // Points at the real, static favicon.ico rather than the generated
    // app/icon.tsx route, whose served path isn't a fixed literal string.
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
