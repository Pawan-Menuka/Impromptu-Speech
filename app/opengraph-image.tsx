import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

// Interim, plain social share card built from the site's own brand colors
// and copy — not final design. Replace with a real 1200×630 PNG (see
// SEO_PLAN.md Phase 2) by adding a static app/opengraph-image.png, which
// takes precedence over this file.
export const alt = `${SITE_NAME} — AI impromptu speech trainer`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0809",
          color: "#f4efec",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #ecc0aa, #dc94ab)",
            marginBottom: 36,
          }}
        />
        <div style={{ display: "flex", fontSize: 88, fontWeight: 400, letterSpacing: -2 }}>
          {SITE_NAME}
        </div>
        <div style={{ display: "flex", marginTop: 20, fontSize: 32, color: "#b7a9a3" }}>
          AI-guided practice for impromptu speaking
        </div>
      </div>
    ),
    { ...size }
  );
}
