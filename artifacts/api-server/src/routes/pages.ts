import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, pagesTable } from "@workspace/db";
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
  const pages = await db.select().from(pagesTable).where(eq(pagesTable.userId, userId));
  res.json(pages);
});

router.post("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { id, title, content, emoji, parentId } = req.body;
  const [page] = await db.insert(pagesTable).values({ id, userId, title: title ?? "Untitled Page", content: content ?? "", emoji: emoji ?? "📄", parentId: parentId ?? null }).returning();
  res.status(201).json(page);
});

router.put("/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { title, content, emoji, parentId } = req.body;
  const [page] = await db.update(pagesTable)
    .set({ title, content, emoji, parentId })
    .where(and(eq(pagesTable.id, req.params.id), eq(pagesTable.userId, userId)))
    .returning();
  if (!page) return res.status(404).json({ error: "Not found" });
  res.json(page);
});

router.delete("/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  await db.delete(pagesTable).where(and(eq(pagesTable.id, req.params.id), eq(pagesTable.userId, userId)));
  res.status(204).end();
});

export default router;
