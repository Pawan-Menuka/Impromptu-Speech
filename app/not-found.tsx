import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-sm text-zinc-500">
        This page doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link
        href="/dashboard"
        className="h-10 rounded-full bg-foreground px-5 text-sm font-medium leading-10 text-background transition-colors hover:opacity-90"
      >
        Go to dashboard
      </Link>
    </main>
  );
}
