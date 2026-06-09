import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";

const dbUrl = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;
if (!dbUrl) throw new Error("No database URL found");

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: process.env.NEON_DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("Creating tables if they don't exist...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS kanban_boards (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#7467F0',
        column_order TEXT[] NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS kanban_columns (
        id TEXT PRIMARY KEY,
        board_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        "order" INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS kanban_tasks (
        id TEXT PRIMARY KEY,
        board_id TEXT NOT NULL,
        column_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        due_date TEXT NOT NULL DEFAULT '',
        priority TEXT NOT NULL DEFAULT 'medium',
        labels TEXT[] NOT NULL DEFAULT '{}',
        sync_calendar BOOLEAN NOT NULL DEFAULT FALSE,
        sync_notes BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS calendar_events (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'work',
        type TEXT NOT NULL DEFAULT 'task',
        notes TEXT NOT NULL DEFAULT '',
        is_draft BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT 'Untitled',
        content TEXT NOT NULL DEFAULT '',
        color TEXT NOT NULL DEFAULT '#F43F5E',
        pinned BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS pages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT 'Untitled Page',
        content TEXT NOT NULL DEFAULT '',
        emoji TEXT NOT NULL DEFAULT '📄',
        parent_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS spaces (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        color TEXT NOT NULL DEFAULT '#7467F0',
        is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
        is_archived BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    console.log("Adding new columns if missing...");
    await client.query(`
      ALTER TABLE pages ADD COLUMN IF NOT EXISTS space_id TEXT;
      ALTER TABLE pages ADD COLUMN IF NOT EXISTS template TEXT NOT NULL DEFAULT 'blank';
      ALTER TABLE pages ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE;
    `);

    console.log("Adding settings tables...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY,
        preferred_model TEXT NOT NULL DEFAULT 'llama-3.3-70b-versatile',
        ai_tone TEXT NOT NULL DEFAULT 'balanced',
        ai_refine_enabled BOOLEAN NOT NULL DEFAULT true,
        ai_assistant_enabled BOOLEAN NOT NULL DEFAULT true,
        ai_template_builder_enabled BOOLEAN NOT NULL DEFAULT true,
        theme TEXT NOT NULL DEFAULT 'system',
        default_calendar_view TEXT NOT NULL DEFAULT 'week',
        default_task_priority TEXT NOT NULL DEFAULT 'medium',
        notifications_enabled BOOLEAN NOT NULL DEFAULT true,
        email_notifications BOOLEAN NOT NULL DEFAULT false,
        auto_save BOOLEAN NOT NULL DEFAULT true,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_categories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#7467F0',
        icon TEXT NOT NULL DEFAULT 'Tag',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    console.log("✓ All tables created/verified successfully");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error("Migration failed:", err); process.exit(1); });
