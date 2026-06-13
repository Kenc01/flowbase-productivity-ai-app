import { pgTable, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export const userSettingsTable = pgTable("user_settings", {
  userId:                     text("user_id").primaryKey(),
  preferredModel:             text("preferred_model").notNull().default("llama-3.3-70b-versatile"),
  aiTone:                     text("ai_tone").notNull().default("balanced"),
  aiRefineEnabled:            boolean("ai_refine_enabled").notNull().default(true),
  aiAssistantEnabled:         boolean("ai_assistant_enabled").notNull().default(true),
  aiTemplateBuilderEnabled:   boolean("ai_template_builder_enabled").notNull().default(true),
  theme:                      text("theme").notNull().default("system"),
  defaultCalendarView:        text("default_calendar_view").notNull().default("week"),
  defaultTaskPriority:        text("default_task_priority").notNull().default("medium"),
  notificationsEnabled:       boolean("notifications_enabled").notNull().default(true),
  emailNotifications:         boolean("email_notifications").notNull().default(false),
  autoSave:                   boolean("auto_save").notNull().default(true),
  masterName:                 text("master_name").notNull().default(""),
  voiceAgentVoice:            text("voice_agent_voice").notNull().default("Brian"),
  updatedAt:                  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const userCategoriesTable = pgTable("user_categories", {
  id:        text("id").primaryKey(),
  userId:    text("user_id").notNull(),
  type:      text("type").notNull(),
  name:      text("name").notNull(),
  color:     text("color").notNull().default("#7467F0"),
  icon:      text("icon").notNull().default("Tag"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserSettings    = typeof userSettingsTable.$inferSelect;
export type UserCategory    = typeof userCategoriesTable.$inferSelect;
