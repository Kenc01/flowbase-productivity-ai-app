import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const calendarEventsTable = pgTable("calendar_events", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  date: text("date").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  category: text("category").notNull().default("work"),
  type: text("type").notNull().default("task"),
  priority: text("priority").notNull().default("normal"),
  notes: text("notes").notNull().default(""),
  isDraft: boolean("is_draft").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCalendarEventSchema = createInsertSchema(calendarEventsTable).omit({ createdAt: true, updatedAt: true });
export type CalendarEvent = typeof calendarEventsTable.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
