import { Router } from "express";
import { requireUser } from "../middlewares/replitAuth";
import { db, pagesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { spaceId } = req.query as { spaceId?: string };
  const pages = await db
    .select()
    .from(pagesTable)
    .where(
      spaceId
        ? and(eq(pagesTable.userId, userId), eq(pagesTable.spaceId, spaceId))
        : eq(pagesTable.userId, userId),
    );
  return res.json(pages);
});

router.post("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { id, title, content, emoji, parentId, spaceId, template, isFavorite } =
    req.body;
  const [page] = await db
    .insert(pagesTable)
    .values({
      id,
      userId,
      title: title ?? "Untitled Page",
      content: content ?? "",
      emoji: emoji ?? "📄",
      parentId: parentId ?? null,
      spaceId: spaceId ?? null,
      template: template ?? "blank",
      isFavorite: isFavorite ?? false,
    })
    .returning();
  return res.status(201).json(page);
});

router.put("/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { title, content, emoji, parentId, spaceId, template, isFavorite } =
    req.body;
  const [page] = await db
    .update(pagesTable)
    .set({ title, content, emoji, parentId, spaceId, template, isFavorite })
    .where(and(eq(pagesTable.id, req.params.id), eq(pagesTable.userId, userId)))
    .returning();
  if (!page) return res.status(404).json({ error: "Not found" });
  return res.json(page);
});

router.delete("/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  await db
    .delete(pagesTable)
    .where(
      and(eq(pagesTable.id, req.params.id), eq(pagesTable.userId, userId)),
    );
  res.status(204).end();
});

export default router;
