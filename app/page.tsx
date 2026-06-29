import Link from "next/link";
import { Show, SignInButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
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
    </main>
  );
}
