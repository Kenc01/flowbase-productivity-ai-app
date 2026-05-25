# FlowBase

FlowBase is an all-in-one productivity workspace combining notes, kanban, whiteboard, AI assistant, and calendar features in a beautiful sidebar-driven UI.

## Run & Operate

- `pnpm --filter @workspace/flowbase run dev` — run the frontend (port assigned by workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (Tailwind v4, wouter routing, lucide-react icons)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/flowbase/` — React + Vite frontend (FlowBase UI)
- `artifacts/api-server/` — Express API backend
- `artifacts/flowbase/src/pages/` — Route pages (home, dashboard/*)
- `artifacts/flowbase/src/components/Sidebar.tsx` — Collapsible sidebar navigation
- `artifacts/flowbase/src/index.css` — Global CSS with FlowBase design tokens (`--fb-*`)
- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle schema

## Architecture decisions

- Migrated from Next.js to Vite + React; all routing via wouter (not file-based)
- Sidebar uses localStorage to persist collapsed state
- Design tokens are CSS variables with `--fb-` prefix (violet, cyan, amber, emerald, rose, etc.)
- Dashboard sub-routes share a `DashboardLayout` wrapper with the sidebar
- No Clerk auth in Vite port — the original Next.js app used `@clerk/nextjs` which is not compatible with Vite

## Product

- Landing page at `/` with hero and feature cards
- Dashboard at `/dashboard` with stats, recent items, task list, and AI banner
- Sidebar navigation to: AI Assistant, Calendar, Kanban, Notes, Whiteboard, Pages, Templates, Settings
- Collapsible sidebar with tooltip labels in collapsed mode
- All sub-pages functional with placeholder content

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Tailwind v4 — uses `@import "tailwindcss"` not `@tailwind base/components/utilities`
- `postcss.config.mjs` from the original Next.js project conflicts with Tailwind v4 + Vite; it was not copied over
- wouter `useLocation` returns the current path; active route detection checks `startsWith` for nested routes

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
