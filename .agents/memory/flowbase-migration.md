---
name: FlowBase migration notes
description: Key decisions and quirks from migrating FlowBase from Vercel/v0 to Replit pnpm monorepo
---

# FlowBase migration decisions

## DB setup
- Replit provisions its own DATABASE_URL (locked, can't override)
- User's Neon DB is stored as NEON_DATABASE_URL secret
- lib/db/src/index.ts and drizzle.config.ts both use: `NEON_DATABASE_URL ?? DATABASE_URL`
- SSL for Neon: `ssl: { rejectUnauthorized: false }` when NEON_DATABASE_URL is set
- drizzle-kit push fails without TTY in this env — use `node lib/db/migrate.mjs` instead (runs raw CREATE TABLE IF NOT EXISTS)

## Auth
- Clerk provisioned via setupClerkWhitelabelAuth(); proxy middleware wired in api-server/app.ts
- Clerk proxy path: /api/__clerk
- Tailwind v4 requires `optimize: false` for Clerk themes

## Routing
- Frontend: wouter, base path from import.meta.env.BASE_URL
- API calls from frontend use `/api/...` — Vite dev server proxies to localhost:8080
- Production: Replit proxy routes /api → api-server, / → flowbase

## Tables
- kanban_boards, kanban_columns, kanban_tasks, calendar_events, notes, pages
- All use text PKs (matching frontend uid() pattern)
- user_id from Clerk's getAuth(req).userId

## API helper
- artifacts/flowbase/src/lib/api.ts — thin fetch wrapper, uses BASE_URL prefix
