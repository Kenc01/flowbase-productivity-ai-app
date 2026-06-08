import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const collaboratorsTable = pgTable("space_collaborators", {
  id: text("id").primaryKey(),
  spaceId: text("space_id").notNull(),
  ownerId: text("owner_id").notNull(),
  email: text("email").notNull(),
  name: text("name").notNull().default(""),
  role: text("role").notNull().default("viewer"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCollaboratorSchema = createInsertSchema(collaboratorsTable).omit({ createdAt: true });
export type Collaborator = typeof collaboratorsTable.$inferSelect;
export type InsertCollaborator = z.infer<typeof insertCollaboratorSchema>;
