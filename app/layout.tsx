import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Impromptu Speech Trainer",
  description: "Train articulation with timed impromptu speeches and AI feedback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-black">
          <header className="flex items-center justify-between border-b border-black/[.08] px-6 py-3 dark:border-white/[.145]">
            <Link href="/" className="font-semibold tracking-tight">
              Impromptu Speech Trainer
            </Link>
            <nav className="flex items-center gap-3 text-sm">
              <Show when="signed-out">
                <SignInButton mode="modal" />
                <SignUpButton mode="modal" />
              </Show>
              <Show when="signed-in">
                <Link href="/dashboard" className="font-medium">
                  Dashboard
                </Link>
                <Link href="/history" className="font-medium">
                  History
                </Link>
                <UserButton />
              </Show>
            </nav>
          </header>
          <div className="flex flex-1 flex-col">{children}</div>
        </body>
      </html>
    </ClerkProvider>
  );
}
