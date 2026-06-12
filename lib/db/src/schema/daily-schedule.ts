import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dailyScheduleBlocksTable = pgTable("daily_schedule_blocks", {
  id:        text("id").primaryKey(),
  userId:    text("user_id").notNull(),
  date:      text("date").notNull(),
  label:     text("label").notNull(),
  type:      text("type").notNull().default("other"),
  startHour: integer("start_hour").notNull().default(0),
  startMin:  integer("start_min").notNull().default(0),
  endHour:   integer("end_hour").notNull().default(1),
  endMin:    integer("end_min").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDailyScheduleBlockSchema = createInsertSchema(dailyScheduleBlocksTable).omit({ createdAt: true });
export type DailyScheduleBlock = typeof dailyScheduleBlocksTable.$inferSelect;
export type InsertDailyScheduleBlock = z.infer<typeof insertDailyScheduleBlockSchema>;
