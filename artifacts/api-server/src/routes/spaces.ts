import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, spacesTable } from "@workspace/db";
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
  try {
    const spaces = await db
      .select()
      .from(spacesTable)
      .where(eq(spacesTable.userId, userId));
    return res.json(spaces);
  } catch (err: any) {
    console.error("[spaces GET]", err?.message ?? err);
    return res.status(500).json({ error: err?.message ?? "DB error" });
  }
});

router.post("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const { id, name, description, color, isFavorite, isArchived } = req.body;
    const [space] = await db
      .insert(spacesTable)
      .values({
        id,
        userId,
        name: name ?? "Untitled Space",
        description: description ?? "",
        color: color ?? "#7467F0",
        isFavorite: isFavorite ?? false,
        isArchived: isArchived ?? false,
      })
      .returning();
    return res.status(201).json(space);
  } catch (err: any) {
    console.error("[spaces POST]", err?.message ?? err);
    return res.status(500).json({ error: err?.message ?? "DB error" });
  }
});

router.put("/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const { name, description, color, isFavorite, isArchived } = req.body;
    const [space] = await db
      .update(spacesTable)
      .set({ name, description, color, isFavorite, isArchived })
      .where(
        and(eq(spacesTable.id, req.params.id), eq(spacesTable.userId, userId)),
      )
      .returning();
    if (!space) return res.status(404).json({ error: "Not found" });
    return res.json(space);
  } catch (err: any) {
    console.error("[spaces PUT]", err?.message ?? err);
    return res.status(500).json({ error: err?.message ?? "DB error" });
  }
});

router.delete("/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    await db
      .delete(spacesTable)
      .where(
        and(eq(spacesTable.id, req.params.id), eq(spacesTable.userId, userId)),
      );
    return res.status(204).end();
  } catch (err: any) {
    console.error("[spaces DELETE]", err?.message ?? err);
    return res.status(500).json({ error: err?.message ?? "DB error" });
  }
});

export default router;
