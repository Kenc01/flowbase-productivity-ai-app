import { Router } from "express";
import { requireUser } from "../middlewares/replitAuth";
import { db, kanbanTasksTable, kanbanColumnsTable, calendarEventsTable, notesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

export type NotifType =
  | "overdue"
  | "due_today"
  | "due_tomorrow"
  | "event_today"
  | "event_tomorrow"
  | "high_priority"
  | "pinned_note";

export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  color: string;
  icon: string;
  link: string;
  ts: string;
}

router.get("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  try {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const [tasks, columns, events, notes] = await Promise.all([
      db.select().from(kanbanTasksTable).where(eq(kanbanTasksTable.userId, userId)),
      db.select().from(kanbanColumnsTable).where(eq(kanbanColumnsTable.userId, userId)),
      db.select().from(calendarEventsTable).where(eq(calendarEventsTable.userId, userId)),
      db.select().from(notesTable).where(eq(notesTable.userId, userId)),
    ]);

    const doneColIds = new Set(
      columns.filter(c => c.name.toLowerCase().includes("done")).map(c => c.id)
    );

    const activeTasks = tasks.filter(t => !doneColIds.has(t.columnId));
    const notifs: Notification[] = [];

    for (const t of activeTasks) {
      if (t.dueDate && t.dueDate < today) {
        notifs.push({ id: `overdue-${t.id}`, type: "overdue", title: "Overdue task", body: t.title, color: "#F43F5E", icon: "AlertCircle", link: "/dashboard/kanban", ts: t.dueDate });
      }
    }
    for (const t of activeTasks) {
      if (t.dueDate === today) {
        notifs.push({ id: `due-today-${t.id}`, type: "due_today", title: "Due today", body: t.title, color: "#F59E0B", icon: "Clock", link: "/dashboard/kanban", ts: today });
      }
    }
    for (const t of activeTasks) {
      if (t.dueDate === tomorrow) {
        notifs.push({ id: `due-tomorrow-${t.id}`, type: "due_tomorrow", title: "Due tomorrow", body: t.title, color: "#06B6D4", icon: "CalendarClock", link: "/dashboard/kanban", ts: tomorrow });
      }
    }
    for (const t of activeTasks) {
      if (t.priority === "high" && !t.dueDate) {
        notifs.push({ id: `highpri-${t.id}`, type: "high_priority", title: "High priority task", body: t.title, color: "#a855f7", icon: "Zap", link: "/dashboard/kanban", ts: today });
      }
    }
    for (const e of events) {
      if (e.date === today) {
        notifs.push({ id: `event-today-${e.id}`, type: "event_today", title: "Today's event", body: e.title, color: "#10B981", icon: "CalendarDays", link: "/dashboard/calendar", ts: today });
      }
    }
    for (const e of events) {
      if (e.date === tomorrow) {
        notifs.push({ id: `event-tomorrow-${e.id}`, type: "event_tomorrow", title: "Upcoming tomorrow", body: e.title, color: "#0EA5E9", icon: "CalendarDays", link: "/dashboard/calendar", ts: tomorrow });
      }
    }
    const pinned = notes.filter(n => n.pinned).slice(0, 2);
    for (const n of pinned) {
      notifs.push({ id: `pinned-${n.id}`, type: "pinned_note", title: "Pinned note", body: n.title, color: n.color ?? "#7467F0", icon: "StickyNote", link: "/dashboard/notes", ts: n.updatedAt ? String(n.updatedAt) : today });
    }

    const ORDER: NotifType[] = ["overdue", "due_today", "high_priority", "due_tomorrow", "event_today", "event_tomorrow", "pinned_note"];
    notifs.sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));

    return res.json(notifs.slice(0, 30));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
