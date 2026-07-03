import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <p className="eyebrow">Welcome back</p>
      <h1 className="mt-1 font-display text-3xl font-light tracking-tight">Sign in</h1>
      <p className="mb-8 mt-2 text-sm text-muted">Continue your practice.</p>
      <SignIn />
    </div>
  );
}
