// Shared prose-column wrapper for every guide, plus the /guides index page.
// Plain, functional — reuses the same max-w-2xl pattern as app/topics/*.
export default function GuidesLayout({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">{children}</main>;
}
