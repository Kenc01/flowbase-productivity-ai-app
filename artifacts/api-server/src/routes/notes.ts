import { Router } from "express";
import { requireUser } from "../middlewares/replitAuth";
import { db, notesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const notes = await db.select().from(notesTable).where(eq(notesTable.userId, userId));
  return res.json(notes);
});

router.post("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { id, title, content, color, symbol, pinned, tags } = req.body;
  const [note] = await db
    .insert(notesTable)
    .values({
      id,
      userId,
      title: title ?? "Untitled",
      content: content ?? "",
      color: color ?? "#F43F5E",
      symbol: symbol ?? "📝",
      pinned: !!pinned,
      tags: typeof tags === "string" ? tags : JSON.stringify(tags ?? []),
    })
    .returning();
  return res.status(201).json(note);
});

router.put("/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { title, content, color, symbol, pinned, tags } = req.body;
  const [note] = await db
    .update(notesTable)
    .set({
      title,
      content,
      color,
      symbol,
      pinned,
      tags: typeof tags === "string" ? tags : JSON.stringify(tags ?? []),
    })
    .where(and(eq(notesTable.id, req.params.id), eq(notesTable.userId, userId)))
    .returning();
  if (!note) return res.status(404).json({ error: "Not found" });
  return res.json(note);
});

router.delete("/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  await db.delete(notesTable).where(and(eq(notesTable.id, req.params.id), eq(notesTable.userId, userId)));
  res.status(204).end();
});

export default router;
