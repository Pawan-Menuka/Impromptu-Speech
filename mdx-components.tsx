import type { MDXComponents } from "mdx/types";
import Link from "next/link";

// Required by @next/mdx for the App Router. Maps markdown output to the
// app's existing design tokens (font-display, text-muted, etc.) — no new
// visual design, just making guide prose readable. See SEO_PLAN.md Phase 7.
const components: MDXComponents = {
  h1: ({ children }) => (
    <h1 className="mt-2 font-display text-4xl font-light tracking-tight">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-10 font-display text-2xl font-light">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 font-label text-sm uppercase tracking-[0.15em] text-fg">{children}</h3>
  ),
  p: ({ children }) => <p className="mt-4 text-[15px] leading-[1.7] text-muted">{children}</p>,
  ul: ({ children }) => <ul className="mt-4 flex flex-col gap-2 pl-5 text-[15px] leading-[1.7] text-muted [&>li]:list-disc">{children}</ul>,
  ol: ({ children }) => <ol className="mt-4 flex flex-col gap-2 pl-5 text-[15px] leading-[1.7] text-muted [&>li]:list-decimal">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="text-fg">{children}</strong>,
  a: ({ href, children }) => (
    <Link href={href ?? "#"} className="text-fg underline underline-offset-4">
      {children}
    </Link>
  ),
  blockquote: ({ children }) => (
    <blockquote className="glass mt-6 rounded-[18px] border-l-2 border-white/20 p-5 italic text-fg/90">
      {children}
    </blockquote>
  ),
};

export function useMDXComponents(): MDXComponents {
  return components;
}
