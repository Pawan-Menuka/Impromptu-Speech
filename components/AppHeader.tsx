"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";

const navLinkClass =
  "font-label text-xs uppercase tracking-[0.2em] text-muted transition-colors hover:text-fg";

export function AppHeader() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useUser();

  // The landing page provides its own full-viewport chrome.
  if (pathname === "/") return null;

  return (
    <header className="glass-header sticky top-0 z-40">
      <div className="mx-auto flex w-full max-w-[1080px] items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="logo-dot" />
          <span className="font-display text-xl tracking-tight">Impromptu</span>
        </Link>
        <nav className="flex items-center gap-6">
          {!isLoaded ? null : isSignedIn ? (
            <>
              <Link href="/dashboard" className={navLinkClass}>
                Dashboard
              </Link>
              <Link href="/history" className={navLinkClass}>
                History
              </Link>
              <UserButton />
            </>
          ) : (
            <>
              <Link href="/sign-in" className={navLinkClass}>
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="btn-accent rounded-full px-5 py-2 font-label text-xs uppercase tracking-[0.2em]"
              >
                Start practicing
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
