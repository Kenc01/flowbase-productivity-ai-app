import { Router } from "express";
import { requireUser } from "../middlewares/replitAuth";
import { db, whiteboardsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const boards = await db
      .select()
      .from(whiteboardsTable)
      .where(eq(whiteboardsTable.userId, userId));
    return res.json(boards);
  } catch (err: any) {
    console.error("GET /whiteboards error:", err?.message ?? err);
    return res.status(500).json({ error: "Failed to load whiteboards" });
  }
});

router.post("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const { id, title, color, elements, appState } = req.body;
    const [board] = await db
      .insert(whiteboardsTable)
      .values({
        id,
        userId,
        title: title ?? "Untitled Board",
        color: color ?? "#4F46E5",
        elements: elements ?? "[]",
        appState: appState ?? "{}",
      })
      .returning();
    return res.status(201).json(board);
  } catch (err: any) {
    console.error("POST /whiteboards error:", err?.message ?? err);
    return res.status(500).json({ error: "Failed to create whiteboard" });
  }
});

router.put("/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const { title, color, elements, appState } = req.body;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (title !== undefined) updateData.title = title;
    if (color !== undefined) updateData.color = color;
    if (elements !== undefined) updateData.elements = elements;
    if (appState !== undefined) updateData.appState = appState;
    const [board] = await db
      .update(whiteboardsTable)
      .set(updateData)
      .where(
        and(
          eq(whiteboardsTable.id, req.params.id),
          eq(whiteboardsTable.userId, userId),
        ),
      )
      .returning();
    if (!board) return res.status(404).json({ error: "Not found" });
    return res.json(board);
  } catch (err: any) {
    console.error("PUT /whiteboards error:", err?.message ?? err);
    return res.status(500).json({ error: "Failed to update whiteboard" });
  }
});

router.delete("/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    await db
      .delete(whiteboardsTable)
      .where(
        and(
          eq(whiteboardsTable.id, req.params.id),
          eq(whiteboardsTable.userId, userId),
        ),
      );
    return res.status(204).end();
  } catch (err: any) {
    console.error("DELETE /whiteboards error:", err?.message ?? err);
    return res.status(500).json({ error: "Failed to delete whiteboard" });
  }
});

export default router;
