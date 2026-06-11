import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, calendarEventsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function requireUser(req: any, res: any): string | null {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return userId;
}

router.get("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const events = await db
    .select()
    .from(calendarEventsTable)
    .where(eq(calendarEventsTable.userId, userId));
  return res.json(events);
});

router.post("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { id, title, date, category, type, notes, isDraft } = req.body;
  const [event] = await db
    .insert(calendarEventsTable)
    .values({
      id,
      userId,
      title,
      date: date ?? "",
      category: category ?? "work",
      type: type ?? "task",
      notes: notes ?? "",
      isDraft: !!isDraft,
    })
    .returning();
  return res.status(201).json(event);
});

router.put("/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { title, date, category, type, notes, isDraft } = req.body;
  const [event] = await db
    .update(calendarEventsTable)
    .set({ title, date, category, type, notes, isDraft })
    .where(
      and(
        eq(calendarEventsTable.id, req.params.id),
        eq(calendarEventsTable.userId, userId),
      ),
    )
    .returning();
  if (!event) return res.status(404).json({ error: "Not found" });
  return res.json(event);
});

router.delete("/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  await db
    .delete(calendarEventsTable)
    .where(
      and(
        eq(calendarEventsTable.id, req.params.id),
        eq(calendarEventsTable.userId, userId),
      ),
    );
  res.status(204).end();
});

export default router;
