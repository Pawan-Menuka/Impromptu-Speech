import type { Metadata } from "next";

// The practice page is a client component, so its metadata lives here.
export const metadata: Metadata = {
  title: "Practice",
  robots: { index: false, follow: false },
};

export default function PracticeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
