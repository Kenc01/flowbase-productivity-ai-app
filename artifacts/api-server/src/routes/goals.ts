import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, goalsTable, kanbanBoardsTable, kanbanColumnsTable, kanbanTasksTable, calendarEventsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function requireUser(req: any, res: any): string | null {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return null; }
  return userId;
}

function uid() { return Math.random().toString(36).slice(2, 10); }

// GET all goals for user
router.get("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const goals = await db.select().from(goalsTable).where(eq(goalsTable.userId, userId));
  return res.json(goals);
});

// POST create goal
router.post("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { id, text, level, status, parentId, note, collapsed, order, dueDate } = req.body;
  const [goal] = await db.insert(goalsTable).values({
    id, userId, text, level: level ?? "goal",
    status: status ?? "not-started", parentId: parentId ?? null,
    note: note ?? "", collapsed: !!collapsed, order: order ?? 0,
    dueDate: dueDate ?? null,
  }).returning();
  return res.status(201).json(goal);
});

// PUT update goal
router.put("/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { text, level, status, parentId, note, collapsed, order, dueDate, linkedKanbanTaskId, linkedCalendarEventId } = req.body;
  const [goal] = await db.update(goalsTable)
    .set({ text, level, status, parentId, note, collapsed, order, dueDate, linkedKanbanTaskId, linkedCalendarEventId })
    .where(and(eq(goalsTable.id, req.params.id), eq(goalsTable.userId, userId)))
    .returning();
  if (!goal) return res.status(404).json({ error: "Not found" });
  return res.json(goal);
});

// DELETE goal
router.delete("/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  await db.delete(goalsTable).where(and(eq(goalsTable.id, req.params.id), eq(goalsTable.userId, userId)));
  res.status(204).end();
});

// POST /goals/:id/send-to-kanban — create a Kanban task from a milestone
router.post("/:id/send-to-kanban", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const [goal] = await db.select().from(goalsTable)
    .where(and(eq(goalsTable.id, req.params.id), eq(goalsTable.userId, userId)));
  if (!goal) return res.status(404).json({ error: "Goal not found" });

  // Find or create a "Goals" board
  let board = (await db.select().from(kanbanBoardsTable)
    .where(and(eq(kanbanBoardsTable.userId, userId)))).find(b => b.name === "Goals");

  if (!board) {
    const [newBoard] = await db.insert(kanbanBoardsTable).values({
      id: uid(), userId, name: "Goals", emoji: "🎯",
    }).returning();
    board = newBoard;
    // Create default columns
    for (const [i, name] of ["To Do", "In Progress", "Done"].entries()) {
      await db.insert(kanbanColumnsTable).values({ id: uid(), boardId: board.id, name, order: i });
    }
  }

  // Get the first column (To Do)
  const columns = await db.select().from(kanbanColumnsTable)
    .where(eq(kanbanColumnsTable.boardId, board.id));
  columns.sort((a, b) => a.order - b.order);
  const firstCol = columns[0];
  if (!firstCol) return res.status(500).json({ error: "Board has no columns" });

  // Get task count for ordering
  const existing = await db.select().from(kanbanTasksTable)
    .where(eq(kanbanTasksTable.columnId, firstCol.id));

  const taskId = uid();
  const [task] = await db.insert(kanbanTasksTable).values({
    id: taskId,
    columnId: firstCol.id,
    title: goal.text,
    description: goal.note || `From Goal Map: ${goal.level}`,
    priority: goal.level === "milestone" ? "high" : "medium",
    order: existing.length,
    labels: JSON.stringify(["goal-map"]),
  }).returning();

  // Link back to goal
  await db.update(goalsTable)
    .set({ linkedKanbanTaskId: taskId })
    .where(eq(goalsTable.id, goal.id));

  return res.json({ task, boardName: board.name });
});

// POST /goals/:id/send-to-calendar — create a Calendar event from a goal/milestone
router.post("/:id/send-to-calendar", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const [goal] = await db.select().from(goalsTable)
    .where(and(eq(goalsTable.id, req.params.id), eq(goalsTable.userId, userId)));
  if (!goal) return res.status(404).json({ error: "Goal not found" });

  const date = goal.dueDate ?? new Date().toISOString().slice(0, 10);
  const eventId = uid();
  const [event] = await db.insert(calendarEventsTable).values({
    id: eventId, userId,
    title: goal.text,
    date,
    category: "work",
    type: "task",
    priority: goal.level === "goal" ? "high" : "normal",
    notes: goal.note || `Goal Map: ${goal.level}`,
    isDraft: false,
  }).returning();

  await db.update(goalsTable)
    .set({ linkedCalendarEventId: eventId })
    .where(eq(goalsTable.id, goal.id));

  return res.json({ event });
});

export default router;
