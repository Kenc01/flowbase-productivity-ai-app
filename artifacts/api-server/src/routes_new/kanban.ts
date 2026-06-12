import { Router } from "express";
import { getAuth } from "@clerk/express";
import {
  db,
  kanbanBoardsTable,
  kanbanColumnsTable,
  kanbanTasksTable,
} from "@workspace/db";
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

router.get("/boards", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const boards = await db
    .select()
    .from(kanbanBoardsTable)
    .where(eq(kanbanBoardsTable.userId, userId));
  const columns = await db
    .select()
    .from(kanbanColumnsTable)
    .where(eq(kanbanColumnsTable.userId, userId));
  const tasks = await db
    .select()
    .from(kanbanTasksTable)
    .where(eq(kanbanTasksTable.userId, userId));
  return res.json({ boards, columns, tasks });
});

router.post("/boards", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { id, name, color, columnOrder } = req.body;
  const [board] = await db
    .insert(kanbanBoardsTable)
    .values({ id, userId, name, color, columnOrder })
    .returning();
  return res.status(201).json(board);
});

router.put("/boards/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { name, color, columnOrder } = req.body;
  const [board] = await db
    .update(kanbanBoardsTable)
    .set({ name, color, columnOrder })
    .where(
      and(
        eq(kanbanBoardsTable.id, req.params.id),
        eq(kanbanBoardsTable.userId, userId),
      ),
    )
    .returning();
  if (!board) return res.status(404).json({ error: "Not found" });
  return res.json(board);
});

router.delete("/boards/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const boardId = req.params.id;
  await db
    .delete(kanbanTasksTable)
    .where(
      and(
        eq(kanbanTasksTable.boardId, boardId),
        eq(kanbanTasksTable.userId, userId),
      ),
    );
  await db
    .delete(kanbanColumnsTable)
    .where(
      and(
        eq(kanbanColumnsTable.boardId, boardId),
        eq(kanbanColumnsTable.userId, userId),
      ),
    );
  await db
    .delete(kanbanBoardsTable)
    .where(
      and(
        eq(kanbanBoardsTable.id, boardId),
        eq(kanbanBoardsTable.userId, userId),
      ),
    );
  res.status(204).end();
});

router.post("/columns", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { id, boardId, name, order } = req.body;
  const [col] = await db
    .insert(kanbanColumnsTable)
    .values({ id, boardId, userId, name, order })
    .returning();
  return res.status(201).json(col);
});

router.put("/columns/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { name } = req.body;
  const [col] = await db
    .update(kanbanColumnsTable)
    .set({ name })
    .where(
      and(
        eq(kanbanColumnsTable.id, req.params.id),
        eq(kanbanColumnsTable.userId, userId),
      ),
    )
    .returning();
  if (!col) return res.status(404).json({ error: "Not found" });
  return res.json(col);
});

router.delete("/columns/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  await db
    .delete(kanbanTasksTable)
    .where(
      and(
        eq(kanbanTasksTable.columnId, req.params.id),
        eq(kanbanTasksTable.userId, userId),
      ),
    );
  await db
    .delete(kanbanColumnsTable)
    .where(
      and(
        eq(kanbanColumnsTable.id, req.params.id),
        eq(kanbanColumnsTable.userId, userId),
      ),
    );
  res.status(204).end();
});

router.post("/tasks", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const {
    id,
    boardId,
    columnId,
    title,
    description,
    dueDate,
    priority,
    labels,
    syncCalendar,
    syncNotes,
  } = req.body;
  const [task] = await db
    .insert(kanbanTasksTable)
    .values({
      id,
      boardId,
      columnId,
      userId,
      title,
      description: description ?? "",
      dueDate: dueDate ?? "",
      priority: priority ?? "medium",
      labels: labels ?? [],
      syncCalendar: !!syncCalendar,
      syncNotes: !!syncNotes,
    })
    .returning();
  return res.status(201).json(task);
});

router.put("/tasks/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const {
    title,
    description,
    dueDate,
    priority,
    labels,
    syncCalendar,
    syncNotes,
    columnId,
  } = req.body;
  const [task] = await db
    .update(kanbanTasksTable)
    .set({
      title,
      description,
      dueDate,
      priority,
      labels,
      syncCalendar,
      syncNotes,
      columnId,
    })
    .where(
      and(
        eq(kanbanTasksTable.id, req.params.id),
        eq(kanbanTasksTable.userId, userId),
      ),
    )
    .returning();
  if (!task) return res.status(404).json({ error: "Not found" });
  return res.json(task);
});

router.delete("/tasks/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  await db
    .delete(kanbanTasksTable)
    .where(
      and(
        eq(kanbanTasksTable.id, req.params.id),
        eq(kanbanTasksTable.userId, userId),
      ),
    );
  res.status(204).end();
});

export default router;
