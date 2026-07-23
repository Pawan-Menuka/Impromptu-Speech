import type { Metadata } from "next";
import { Cormorant_Garamond, Hanken_Grotesk, Jost } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { AppHeader } from "@/components/AppHeader";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hanken",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-jost",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Impromptu — AI Speech Trainer",
  description: "Train articulation with timed impromptu speeches and AI feedback.",
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
        </body>
      </html>
    </ClerkProvider>
  );
}
