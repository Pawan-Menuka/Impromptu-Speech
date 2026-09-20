import Link from "next/link";
import { PracticeCta } from "@/components/topics/PracticeCta";

export function GuidePracticeCta() {
  return (
    <div className="glass mt-10 rounded-[18px] p-6">
      <p className="font-display text-lg font-light text-fg">Ready to practice this?</p>
      <p className="mt-1 text-sm text-muted">
        Pick a prompt from the{" "}
        <Link href="/topics" className="text-fg underline underline-offset-4">
          topic library
        </Link>{" "}
        or the{" "}
        <Link href="/topic-generator" className="text-fg underline underline-offset-4">
          random topic generator
        </Link>
        , record a 1–2 minute answer, and get AI feedback on pace, filler words, structure and vocabulary.
      </p>
      <PracticeCta className="btn-accent mt-4 inline-flex h-11 items-center gap-2 rounded-full px-6 font-label text-xs uppercase tracking-[0.2em]">
        Start practicing
      </PracticeCta>
    </div>
  );
}
