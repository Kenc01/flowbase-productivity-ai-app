import { pgTable, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const goalsTable = pgTable("goals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  text: text("text").notNull(),
  level: text("level").notNull().default("goal"), // vision | goal | milestone | habit
  status: text("status").notNull().default("not-started"), // not-started | in-progress | done
  parentId: text("parent_id"),
  note: text("note").notNull().default(""),
  collapsed: boolean("collapsed").notNull().default(false),
  order: integer("order").notNull().default(0),
  dueDate: text("due_date"), // YYYY-MM-DD, optional
  linkedKanbanTaskId: text("linked_kanban_task_id"),
  linkedCalendarEventId: text("linked_calendar_event_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Goal = typeof goalsTable.$inferSelect;
export type InsertGoal = typeof goalsTable.$inferInsert;
