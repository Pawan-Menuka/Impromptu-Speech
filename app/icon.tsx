import { ImageResponse } from "next/og";

// Generated app icon — an interim placeholder built from the site's own
// existing brand mark (the header's gradient dot, see .logo-dot in
// globals.css), not new design. Replace with real artwork (see SEO_PLAN.md
// Phase 2) by adding a static app/icon.png, which takes precedence over
// this file.
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0809",
        }}
      >
        <div
          style={{
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #ecc0aa, #dc94ab)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
