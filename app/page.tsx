import Link from "next/link";
import { Show, SignInButton } from "@clerk/nextjs";

const STEPS = [
  { n: 1, title: "Pick a difficulty & topic", body: "Choose Easy, Medium, or Hard and get a random impromptu topic." },
  { n: 2, title: "Record 1–2 minutes", body: "A 30-second prep, then speak to the clock. We capture your audio." },
  { n: 3, title: "Get AI feedback", body: "Scored on content and delivery, with concrete tips to improve." },
];

const LEVELS = [
  { name: "Easy", body: "Concrete, everyday topics. Scored on relevance, structure, and examples. Encouraging." },
  { name: "Medium", body: "Opinion-based topics. Adds filler words and speaking pace to the rubric." },
  { name: "Hard", body: "Abstract & argumentative. Full rubric incl. vocabulary range and delivery confidence." },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-24 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Train your articulation, one impromptu speech at a time.
        </h1>
        <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          Pick a difficulty, get a random topic, record a 1–2 minute speech, and
          receive AI-scored feedback on content and delivery.
        </p>
        <div className="flex gap-3">
          <Show
            when="signed-out"
            fallback={
              <Link
                href="/dashboard"
                className="flex h-11 items-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:opacity-90"
              >
                Go to dashboard
              </Link>
            }
          >
            <SignInButton mode="modal">
              <button className="h-11 rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:opacity-90">
                Get started
              </button>
            </SignInButton>
          </Show>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-3xl px-6 py-12">
        <h2 className="text-center text-sm font-medium uppercase tracking-wide text-zinc-400">
          How it works
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-xl border border-black/[.08] p-5 dark:border-white/[.145]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                {s.n}
              </div>
              <h3 className="mt-3 font-medium">{s.title}</h3>
              <p className="mt-1 text-sm text-zinc-500">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Difficulty preview */}
      <section className="mx-auto w-full max-w-3xl px-6 py-12 pb-24">
        <h2 className="text-center text-sm font-medium uppercase tracking-wide text-zinc-400">
          What each level tests
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {LEVELS.map((l) => (
            <div key={l.name} className="rounded-xl border border-black/[.08] p-5 dark:border-white/[.145]">
              <h3 className="font-medium">{l.name}</h3>
              <p className="mt-1 text-sm text-zinc-500">{l.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
