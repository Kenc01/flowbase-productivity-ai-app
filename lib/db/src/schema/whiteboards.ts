import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const whiteboardsTable = pgTable("whiteboards", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull().default("Untitled Board"),
  color: text("color").notNull().default("#4F46E5"),
  elements: text("elements").notNull().default("[]"),
  appState: text("app_state").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWhiteboardSchema = createInsertSchema(whiteboardsTable).omit({ createdAt: true, updatedAt: true });
export type Whiteboard = typeof whiteboardsTable.$inferSelect;
export type InsertWhiteboard = z.infer<typeof insertWhiteboardSchema>;
