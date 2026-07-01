"use client";

import { useEffect } from "react";

// Global error boundary for the App Router. Catches render/runtime errors in
// route segments and offers a recovery path. Styling is intentionally minimal
// (to be reskinned with the custom UI later).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-zinc-500">
        An unexpected error occurred. You can try again.
      </p>
      <button
        onClick={reset}
        className="h-10 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:opacity-90"
      >
        Try again
      </button>
    </main>
  );
}
