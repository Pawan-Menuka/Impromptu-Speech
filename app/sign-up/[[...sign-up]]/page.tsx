import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <p className="eyebrow">Get started</p>
      <h1 className="mt-1 font-display text-3xl font-light tracking-tight">Create your account</h1>
      <p className="mb-8 mt-2 text-sm text-muted">Find your voice, one breath at a time.</p>
      <SignUp />
    </div>
  );
}
