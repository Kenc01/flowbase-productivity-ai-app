import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, dailyScheduleBlocksTable } from "@flowbase/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

function requireUser(req: any, res: any): string | null {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return null; }
  return userId;
}

// GET /daily-schedule?date=YYYY-MM-DD
router.get("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const date = req.query.date as string;
  if (!date) return res.status(400).json({ error: "date query param required" });
  try {
    const rows = await db
      .select()
      .from(dailyScheduleBlocksTable)
      .where(and(eq(dailyScheduleBlocksTable.userId, userId), eq(dailyScheduleBlocksTable.date, date)));
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /daily-schedule
router.post("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { date, label, type, startHour, startMin, endHour, endMin } = req.body;
  if (!date || !label) return res.status(400).json({ error: "date and label required" });
  try {
    const [row] = await db
      .insert(dailyScheduleBlocksTable)
      .values({ id: uid(), userId, date, label, type: type ?? "other", startHour: startHour ?? 0, startMin: startMin ?? 0, endHour: endHour ?? 1, endMin: endMin ?? 0 })
      .returning();
    return res.status(201).json(row);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /daily-schedule/:id — remove single block
router.delete("/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { id } = req.params;
  try {
    await db.delete(dailyScheduleBlocksTable)
      .where(and(eq(dailyScheduleBlocksTable.id, id), eq(dailyScheduleBlocksTable.userId, userId)));
    return res.status(204).send();
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /daily-schedule?date=YYYY-MM-DD — clear all blocks for a date
router.delete("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const date = req.query.date as string;
  if (!date) return res.status(400).json({ error: "date query param required" });
  try {
    await db.delete(dailyScheduleBlocksTable)
      .where(and(eq(dailyScheduleBlocksTable.userId, userId), eq(dailyScheduleBlocksTable.date, date)));
    return res.status(204).send();
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
