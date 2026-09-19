import type { Metadata } from "next";
import { CinematicLanding } from "@/components/landing/CinematicLanding";

export const metadata: Metadata = {
  // Don't add `openGraph` here: metadata merges shallowly, so it would replace
  // the root layout's whole openGraph object.
  alternates: { canonical: "/" },
};

export default function Home() {
  return <CinematicLanding />;
}
