---
name: DB setup
description: How to initialize or migrate the Grind OS PostgreSQL database on Replit.
---

# Database Setup

## Active DB
`DATABASE_URL` secret (Replit-managed PostgreSQL) is the active database.

## Schema push
Tables are created via Drizzle Kit push (not migration files):
```bash
cd lib/db && DATABASE_URL="$DATABASE_URL" pnpm drizzle-kit push --force
```

## Tables (16 total)
ai_sidebar_apps, ai_templates, calendar_events, chat_messages, daily_schedule_blocks, goals, kanban_boards, kanban_columns, kanban_tasks, notes, pages, space_collaborators, spaces, user_categories, user_settings, whiteboards

**Why:** The app uses Drizzle ORM with `drizzle-kit push` (schema-first, no migration files). Must run after first deploy or after any schema changes. The post-merge script at `scripts/post-merge.sh` handles this automatically.
