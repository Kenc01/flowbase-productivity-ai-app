import { Router } from "express";
import { requireUser } from "../middlewares/replitAuth";
import { db, userSettingsTable, userCategoriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

router.get("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const rows = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, userId));
    if (rows.length === 0) {
      const defaults = {
        userId,
        preferredModel: "llama-3.3-70b-versatile",
        aiTone: "balanced",
        aiRefineEnabled: true,
        aiAssistantEnabled: true,
        aiTemplateBuilderEnabled: true,
        theme: "system",
        defaultCalendarView: "week",
        defaultTaskPriority: "medium",
        notificationsEnabled: true,
        emailNotifications: false,
        autoSave: true,
      };
      await db.insert(userSettingsTable).values(defaults);
      return res.json(defaults);
    } else {
      return res.json(rows[0]);
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const allowed = [
      "preferredModel",
      "aiTone",
      "aiRefineEnabled",
      "aiAssistantEnabled",
      "aiTemplateBuilderEnabled",
      "theme",
      "defaultCalendarView",
      "defaultTaskPriority",
      "notificationsEnabled",
      "emailNotifications",
      "autoSave",
      "masterName",
      "voiceAgentVoice",
    ];
    const update: Record<string, any> = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    }
    if (Object.keys(update).length === 0)
      return res.status(400).json({ error: "No valid fields" });

    const existing = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, userId));
    if (existing.length === 0) {
      await db.insert(userSettingsTable).values({ userId, ...update });
    } else {
      await db
        .update(userSettingsTable)
        .set(update)
        .where(eq(userSettingsTable.userId, userId));
    }
    const rows = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, userId));
    return res.json(rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/categories", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const rows = await db
      .select()
      .from(userCategoriesTable)
      .where(eq(userCategoriesTable.userId, userId));
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/categories", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { type, name, color, icon } = req.body;
  if (!type || !name)
    return res.status(400).json({ error: "type and name required" });
  try {
    const row = {
      id: uid(),
      userId,
      type,
      name,
      color: color ?? "#7467F0",
      icon: icon ?? "Tag",
    };
    await db.insert(userCategoriesTable).values(row);
    return res.status(201).json(row);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/categories/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { id } = req.params;
  const { name, color, icon } = req.body;
  try {
    const update: Record<string, any> = {};
    if (name !== undefined) update.name = name;
    if (color !== undefined) update.color = color;
    if (icon !== undefined) update.icon = icon;
    await db
      .update(userCategoriesTable)
      .set(update)
      .where(
        and(
          eq(userCategoriesTable.id, id),
          eq(userCategoriesTable.userId, userId),
        ),
      );
    const rows = await db
      .select()
      .from(userCategoriesTable)
      .where(
        and(
          eq(userCategoriesTable.id, id),
          eq(userCategoriesTable.userId, userId),
        ),
      );
    return res.json(rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/categories/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { id } = req.params;
  try {
    await db
      .delete(userCategoriesTable)
      .where(
        and(
          eq(userCategoriesTable.id, id),
          eq(userCategoriesTable.userId, userId),
        ),
      );
    return res.status(204).send();
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
