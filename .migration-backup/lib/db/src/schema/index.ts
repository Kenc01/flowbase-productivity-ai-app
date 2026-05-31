import {
  pgTable, serial, text, timestamp, boolean, integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersTable = pgTable("users", {
  id:        serial("id").primaryKey(),
  name:      text("name"),
  clerkId:   text("clerk_id").notNull().unique(),
  email:     text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User     = typeof usersTable.$inferSelect;

// ─── Calendar Items ───────────────────────────────────────────────────────────
// Stores both scheduled tasks/reminders and unscheduled drafts.

export const calendarItemsTable = pgTable("calendar_items", {
  id:        serial("id").primaryKey(),
  clerkId:   text("clerk_id").notNull(),
  title:     text("title").notNull(),
  date:      text("date"),                          // YYYY-MM-DD; null when draft
  type:      text("type").notNull().default("task"), // 'task' | 'reminder'
  category:  text("category").notNull().default("work"),
  notes:     text("notes"),
  isDraft:   boolean("is_draft").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCalendarItemSchema = createInsertSchema(calendarItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectCalendarItemSchema = createSelectSchema(calendarItemsTable);
export type InsertCalendarItem = z.infer<typeof insertCalendarItemSchema>;
export type CalendarItem       = typeof calendarItemsTable.$inferSelect;

// ─── Kanban Boards ────────────────────────────────────────────────────────────

export const kanbanBoardsTable = pgTable("kanban_boards", {
  id:          text("id").primaryKey(),             // client-generated uid
  clerkId:     text("clerk_id").notNull(),
  name:        text("name").notNull(),
  color:       text("color").notNull().default("#7467F0"),
  columnOrder: text("column_order").notNull().default("[]"), // JSON array of column ids
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});

export const insertKanbanBoardSchema = createInsertSchema(kanbanBoardsTable).omit({ createdAt: true, updatedAt: true });
export const selectKanbanBoardSchema = createSelectSchema(kanbanBoardsTable);
export type InsertKanbanBoard = z.infer<typeof insertKanbanBoardSchema>;
export type KanbanBoard       = typeof kanbanBoardsTable.$inferSelect;

// ─── Kanban Columns ───────────────────────────────────────────────────────────

export const kanbanColumnsTable = pgTable("kanban_columns", {
  id:        text("id").primaryKey(),
  boardId:   text("board_id").notNull(),
  clerkId:   text("clerk_id").notNull(),
  name:      text("name").notNull(),
  order:     integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertKanbanColumnSchema = createInsertSchema(kanbanColumnsTable).omit({ createdAt: true, updatedAt: true });
export const selectKanbanColumnSchema = createSelectSchema(kanbanColumnsTable);
export type InsertKanbanColumn = z.infer<typeof insertKanbanColumnSchema>;
export type KanbanColumn       = typeof kanbanColumnsTable.$inferSelect;

// ─── Kanban Tasks ─────────────────────────────────────────────────────────────

export const kanbanTasksTable = pgTable("kanban_tasks", {
  id:           text("id").primaryKey(),
  boardId:      text("board_id").notNull(),
  columnId:     text("column_id").notNull(),
  clerkId:      text("clerk_id").notNull(),
  title:        text("title").notNull(),
  description:  text("description"),
  dueDate:      text("due_date"),                   // YYYY-MM-DD
  priority:     text("priority").notNull().default("medium"), // 'low'|'medium'|'high'
  labels:       text("labels").notNull().default("[]"),       // JSON array of label ids
  syncCalendar: boolean("sync_calendar").notNull().default(false),
  syncNotes:    boolean("sync_notes").notNull().default(false),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
});

export const insertKanbanTaskSchema = createInsertSchema(kanbanTasksTable).omit({ createdAt: true, updatedAt: true });
export const selectKanbanTaskSchema = createSelectSchema(kanbanTasksTable);
export type InsertKanbanTask = z.infer<typeof insertKanbanTaskSchema>;
export type KanbanTask       = typeof kanbanTasksTable.$inferSelect;
