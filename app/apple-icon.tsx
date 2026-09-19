import { ImageResponse } from "next/og";

// Same interim mark as app/icon.tsx, sized for iOS home-screen icons (which
// are auto-rounded by the OS, so this fills edge-to-edge with no padding).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
            width: 116,
            height: 116,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #ecc0aa, #dc94ab)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
