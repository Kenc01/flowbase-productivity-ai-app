import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, spacesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function requireUser(req: any, res: any): string | null {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return null; }
  return userId;
}

router.get("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const spaces = await db.select().from(spacesTable).where(eq(spacesTable.userId, userId));
  res.json(spaces);
});

router.post("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { id, name, description, color, isFavorite, isArchived } = req.body;
  const [space] = await db.insert(spacesTable).values({
    id, userId,
    name: name ?? "Untitled Space",
    description: description ?? "",
    color: color ?? "#7467F0",
    isFavorite: isFavorite ?? false,
    isArchived: isArchived ?? false,
  }).returning();
  res.status(201).json(space);
});

router.put("/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { name, description, color, isFavorite, isArchived } = req.body;
  const [space] = await db.update(spacesTable)
    .set({ name, description, color, isFavorite, isArchived })
    .where(and(eq(spacesTable.id, req.params.id), eq(spacesTable.userId, userId)))
    .returning();
  if (!space) return res.status(404).json({ error: "Not found" });
  res.json(space);
});

router.delete("/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  await db.delete(spacesTable).where(and(eq(spacesTable.id, req.params.id), eq(spacesTable.userId, userId)));
  res.status(204).end();
});

export default router;
