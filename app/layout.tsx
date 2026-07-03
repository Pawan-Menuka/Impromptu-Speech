import type { Metadata } from "next";
import { Cormorant_Garamond, Hanken_Grotesk, Jost } from "next/font/google";
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
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

const navLinkClass =
  "font-label text-xs uppercase tracking-[0.2em] text-muted transition-colors hover:text-fg";

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

          <header className="glass-header sticky top-0 z-40">
            <div className="mx-auto flex w-full max-w-[1080px] items-center justify-between px-6 py-4">
              <Link href="/" className="flex items-center gap-2.5">
                <span className="logo-dot" />
                <span className="font-display text-xl tracking-tight">Impromptu</span>
              </Link>
              <nav className="flex items-center gap-6">
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className={navLinkClass}>Sign in</button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="btn-accent rounded-full px-5 py-2 font-label text-xs uppercase tracking-[0.2em]">
                      Start practicing
                    </button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <Link href="/dashboard" className={navLinkClass}>
                    Dashboard
                  </Link>
                  <Link href="/history" className={navLinkClass}>
                    History
                  </Link>
                  <UserButton />
                </Show>
              </nav>
            </div>
          </header>

          <div className="flex flex-1 flex-col">{children}</div>
        </body>
      </html>
    </ClerkProvider>
  );
}
