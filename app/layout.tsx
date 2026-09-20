import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Hanken_Grotesk, Jost } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AppHeader } from "@/components/AppHeader";
import { SITE_URL, SITE_NAME, SITE_TITLE, SITE_DESCRIPTION } from "@/lib/site";
import "./globals.css";

// Weight lists are trimmed to exactly what's used in the codebase (verified
// with a `font-light|font-normal|font-medium|font-semibold|font-bold` grep
// across app/ and components/ — SEO Phase 5). Unused weights bloat the font
// payload and slow first paint for no visual benefit. If a design change adds
// a new weight, add it back here first — an unloaded weight renders as a
// faux-bold/synthetic approximation of the nearest loaded one, not a 404.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"], // 600 (font-semibold) is unused with font-display
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"], // 700 (font-bold) is unused anywhere in the app
  variable: "--font-hanken",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  weight: ["400", "500"], // 300 (font-light) is unused with font-label
  variable: "--font-jost",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // No `alternates.canonical` here — every page would inherit it and claim to
  // be the homepage. Canonicals are set per page.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#141011", // matches the app background
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#dc94ab",
          colorBackground: "#141011",
          colorForeground: "#f4efec",
          colorMutedForeground: "#b7a9a3",
          borderRadius: "12px",
        },
      }}
    >
      <html
        lang="en"
        className={`${cormorant.variable} ${hanken.variable} ${jost.variable} h-full antialiased`}
      >
        <body className="flex min-h-full flex-col font-body">
          <div className="ambient" aria-hidden />
          <AppHeader />
          <div className="flex flex-1 flex-col">{children}</div>
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
