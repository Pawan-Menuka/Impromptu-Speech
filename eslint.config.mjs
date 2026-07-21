import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma 7 generated client — not our source.
    "generated/**",
    // `.next/**` above is top-level only; git worktrees under .claude/ carry
    // their own build output, which otherwise floods local lint with errors
    // that CI never sees (a fresh checkout has no worktrees).
    "**/.next/**",
    ".claude/**",
    // Untracked design reference (hand-authored HTML/JS, not app source).
    "UI/**",
  ]),
]);

export default eslintConfig;
