import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pagesTable = pgTable("pages", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  spaceId: text("space_id"),
  title: text("title").notNull().default("Untitled Page"),
  content: text("content").notNull().default(""),
  emoji: text("emoji").notNull().default("📄"),
  template: text("template").notNull().default("blank"),
  isFavorite: boolean("is_favorite").notNull().default(false),
  parentId: text("parent_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPageSchema = createInsertSchema(pagesTable).omit({ createdAt: true, updatedAt: true });
export type Page = typeof pagesTable.$inferSelect;
export type InsertPage = z.infer<typeof insertPageSchema>;
