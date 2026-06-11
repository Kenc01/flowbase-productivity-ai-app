import { pgTable, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const aiTemplatesTable = pgTable("ai_templates", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  appName: text("app_name").notNull(),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("Wand2"),
  color: text("color").notNull().default("#7467F0"),
  layout: text("layout").notNull().default("single-page"),
  sectionsJson: text("sections_json").notNull().default("[]"),
  actionsJson: text("actions_json").notNull().default("[]"),
  sampleDataJson: text("sample_data_json").notNull().default("[]"),
  prompt: text("prompt").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const aiSidebarAppsTable = pgTable("ai_sidebar_apps", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  templateId: text("template_id").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAiTemplateSchema = createInsertSchema(aiTemplatesTable).omit({ createdAt: true, updatedAt: true });
export const insertAiSidebarAppSchema = createInsertSchema(aiSidebarAppsTable).omit({ addedAt: true });

export type AiTemplate = typeof aiTemplatesTable.$inferSelect;
export type InsertAiTemplate = z.infer<typeof insertAiTemplateSchema>;
export type AiSidebarApp = typeof aiSidebarAppsTable.$inferSelect;
export type InsertAiSidebarApp = z.infer<typeof insertAiSidebarAppSchema>;
