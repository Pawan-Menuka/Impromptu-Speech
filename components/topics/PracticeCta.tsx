"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";

// A server-side `auth()` check would force the page that renders this into
// dynamic (per-request) rendering, defeating generateStaticParams. Checking
// sign-in state client-side instead (same pattern as CinematicLanding's
// goPractice) keeps the /topics pages fully static.
export function PracticeCta({ className, children }: { className: string; children: React.ReactNode }) {
  const { isSignedIn } = useUser();
  return (
    <Link href={isSignedIn ? "/practice" : "/sign-up"} className={className}>
      {children}
    </Link>
  );
}
