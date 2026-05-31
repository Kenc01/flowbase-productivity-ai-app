import { pgTable, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const kanbanBoardsTable = pgTable("kanban_boards", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#7467F0"),
  columnOrder: text("column_order").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const kanbanColumnsTable = pgTable("kanban_columns", {
  id: text("id").primaryKey(),
  boardId: text("board_id").notNull(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const kanbanTasksTable = pgTable("kanban_tasks", {
  id: text("id").primaryKey(),
  boardId: text("board_id").notNull(),
  columnId: text("column_id").notNull(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  dueDate: text("due_date").notNull().default(""),
  priority: text("priority").notNull().default("medium"),
  labels: text("labels").array().notNull().default([]),
  syncCalendar: boolean("sync_calendar").notNull().default(false),
  syncNotes: boolean("sync_notes").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertKanbanBoardSchema = createInsertSchema(kanbanBoardsTable).omit({ createdAt: true, updatedAt: true });
export const insertKanbanColumnSchema = createInsertSchema(kanbanColumnsTable).omit({ createdAt: true });
export const insertKanbanTaskSchema = createInsertSchema(kanbanTasksTable).omit({ createdAt: true, updatedAt: true });

export type KanbanBoard = typeof kanbanBoardsTable.$inferSelect;
export type KanbanColumn = typeof kanbanColumnsTable.$inferSelect;
export type KanbanTask = typeof kanbanTasksTable.$inferSelect;
export type InsertKanbanBoard = z.infer<typeof insertKanbanBoardSchema>;
export type InsertKanbanColumn = z.infer<typeof insertKanbanColumnSchema>;
export type InsertKanbanTask = z.infer<typeof insertKanbanTaskSchema>;
