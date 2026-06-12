# Grind OS

An AI-powered productivity workspace with Kanban boards, notes, whiteboards, calendar, and real-time collaboration — migrated from Vercel to Replit.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/grind-os run dev` — run the frontend (Vite dev server)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned by Replit)
- Required env: `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` — Clerk auth keys

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, wouter (routing), @tanstack/react-query, Tailwind CSS
- Auth: Clerk (@clerk/react frontend, @clerk/express backend)
- Collaboration: Liveblocks (@liveblocks/react, @liveblocks/node)
- Editor: Tiptap
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- AI: @google/genai, groq-sdk
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/grind-os/` — React + Vite frontend
- `artifacts/api-server/` — Express 5 API server
- `lib/db/` — Drizzle ORM schema and DB client
- `lib/db/src/schema/` — all table schemas (kanban, notes, calendar, pages, whiteboards, spaces, etc.)
- `artifacts/api-server/src/routes/` — all API route handlers
- `artifacts/api-server/src/middlewares/` — Clerk auth middleware

## Architecture decisions

- Migrated from Vercel (Next.js) to Replit pnpm workspace with separate frontend + API artifacts
- All `@flowbase/*` package imports replaced with `@workspace/*` throughout routes
- Clerk middleware applied on all `/api/*` routes; proxy middleware forwards Clerk auth requests
- DB supports both `DATABASE_URL` (Replit Postgres) and `NEON_DATABASE_URL` (Neon cloud Postgres)
- Frontend uses `VITE_API_URL` env var (defaults to `/api`) for all API calls

## Product

- Landing page with sign-in / sign-up via Clerk
- Dashboard with Kanban boards, notes, calendar, whiteboards, pages, and AI chat
- Real-time collaboration via Liveblocks
- AI assistant powered by Google Gemini and Groq

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_PUBLISHABLE_KEY` are the same Clerk publishable key — both must be set
- After any DB schema change, run `pnpm --filter @workspace/db run push` before restarting the API server
- Port 8080 is used by the API server; frontend Vite dev server uses the `PORT` env var assigned by Replit

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
