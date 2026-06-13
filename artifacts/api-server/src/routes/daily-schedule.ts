import { Router } from "express";
import { requireUser } from "../middlewares/replitAuth";
import { db, dailyScheduleBlocksTable, kanbanTasksTable, kanbanColumnsTable } from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";

const router = Router();

function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

router.get("/stats", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const days = Math.min(parseInt(req.query.days as string) || 14, 60);
  const cutoff = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
  try {
    const rows = await db
      .select()
      .from(dailyScheduleBlocksTable)
      .where(and(eq(dailyScheduleBlocksTable.userId, userId), gte(dailyScheduleBlocksTable.date, cutoff)));

    const byDate: Record<string, { total: number; completed: number }> = {};
    for (const r of rows) {
      if (!byDate[r.date]) byDate[r.date] = { total: 0, completed: 0 };
      byDate[r.date].total++;
      if (r.completed) byDate[r.date].completed++;
    }

    const dayList: { date: string; totalBlocks: number; completedBlocks: number; pct: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const entry = byDate[d] ?? { total: 0, completed: 0 };
      dayList.push({ date: d, totalBlocks: entry.total, completedBlocks: entry.completed, pct: entry.total > 0 ? Math.round((entry.completed / entry.total) * 100) : 0 });
    }

    let streak = 0;
    const today = new Date().toISOString().slice(0, 10);
    for (let i = dayList.length - 1; i >= 0; i--) {
      const day = dayList[i];
      if (day.date > today) continue;
      if (day.completedBlocks > 0) { streak++; } else { if (day.date < today) break; }
    }

    const trackedDays = dayList.filter(d => d.totalBlocks > 0);
    const avgPct = trackedDays.length > 0 ? Math.round(trackedDays.reduce((s, d) => s + d.pct, 0) / trackedDays.length) : 0;

    return res.json({ days: dayList, streak, avgPct, totalDaysTracked: trackedDays.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

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

router.post("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { date, label, type, startHour, startMin, endHour, endMin, kanbanTaskId, kanbanTaskTitle } = req.body;
  if (!date || !label) return res.status(400).json({ error: "date and label required" });
  try {
    const [row] = await db
      .insert(dailyScheduleBlocksTable)
      .values({
        id: uid(), userId, date, label,
        type: type ?? "other",
        startHour: startHour ?? 0, startMin: startMin ?? 0,
        endHour: endHour ?? 1, endMin: endMin ?? 0,
        completed: false,
        kanbanTaskId: kanbanTaskId ?? null,
        kanbanTaskTitle: kanbanTaskTitle ?? null,
      })
      .returning();
    return res.status(201).json(row);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { id } = req.params;
  const { completed } = req.body;
  if (typeof completed !== "boolean") return res.status(400).json({ error: "completed (boolean) required" });
  try {
    const [row] = await db
      .update(dailyScheduleBlocksTable)
      .set({ completed })
      .where(and(eq(dailyScheduleBlocksTable.id, id), eq(dailyScheduleBlocksTable.userId, userId)))
      .returning();
    if (!row) return res.status(404).json({ error: "Block not found" });

    if (completed && row.kanbanTaskId) {
      try {
        const [task] = await db.select().from(kanbanTasksTable)
          .where(and(eq(kanbanTasksTable.id, row.kanbanTaskId), eq(kanbanTasksTable.userId, userId)));
        if (task) {
          const cols = await db.select().from(kanbanColumnsTable).where(eq(kanbanColumnsTable.boardId, task.boardId));
          const doneCol = cols.find(c => c.name.toLowerCase() === "done")
            ?? cols.find(c => c.name.toLowerCase().includes("done"))
            ?? cols.find(c => c.name.toLowerCase().includes("complete"));
          if (doneCol && task.columnId !== doneCol.id) {
            await db.update(kanbanTasksTable).set({ columnId: doneCol.id }).where(eq(kanbanTasksTable.id, task.id));
          }
        }
      } catch { }
    }

    return res.json(row);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

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
