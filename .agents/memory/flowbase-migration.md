---
name: FlowBase Migration
description: How FlowBase was migrated from .migration-backup into the live workspace
---

FlowBase is a Vite+React app (not Next.js). Source restored from `.migration-backup/artifacts/flowbase/src/` into `artifacts/flowbase/src/`.

Key files:
- App.tsx uses `@clerk/react` ClerkProvider + wouter Router with base path
- index.css uses custom `--fb-*` CSS vars + Tailwind v4 with `@layer theme, base, clerk, components, utilities`
- vite.config.ts uses `tailwindcss({ optimize: false })` for Clerk theme compat

Dependencies added to package.json:
- `@clerk/react: ^6.7.1` and `@clerk/themes: ^2.4.57` (moved to `dependencies` not `devDependencies`)

**Why:** Clerk theme CSS layers require `optimize: false` in Tailwind v4 or prod builds break.
