import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, collaboratorsTable } from "@flowbase/db";
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

router.get("/:spaceId", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const collaborators = await db
    .select()
    .from(collaboratorsTable)
    .where(
      and(
        eq(collaboratorsTable.spaceId, req.params.spaceId),
        eq(collaboratorsTable.ownerId, userId),
      ),
    );
  return res.json(collaborators);
});

router.post("/:spaceId", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { id, email, name, role } = req.body;
  if (!email) return res.status(400).json({ error: "email is required" });
  const [collab] = await db
    .insert(collaboratorsTable)
    .values({
      id,
      spaceId: req.params.spaceId,
      ownerId: userId,
      email: email.trim().toLowerCase(),
      name: name ?? "",
      role: role ?? "viewer",
      status: "pending",
    })
    .returning();
  return res.status(201).json(collab);
});

router.put("/:spaceId/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { role } = req.body;
  const [collab] = await db
    .update(collaboratorsTable)
    .set({ role })
    .where(
      and(
        eq(collaboratorsTable.id, req.params.id),
        eq(collaboratorsTable.ownerId, userId),
      ),
    )
    .returning();
  if (!collab) return res.status(404).json({ error: "Not found" });
  return res.json(collab);
});

router.delete("/:spaceId/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  await db
    .delete(collaboratorsTable)
    .where(
      and(
        eq(collaboratorsTable.id, req.params.id),
        eq(collaboratorsTable.ownerId, userId),
      ),
    );
  res.status(204).end();
});

export default router;
