import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  CalendarDays,
  Clock,
  GripVertical,
  Calendar,
  Inbox,
  Trash2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewMode = "month" | "week";
type TaskType = "task" | "reminder";

interface Category {
  id: string;
  label: string;
  color: string;
  bg: string;
}

interface CalendarTask {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  category: string;
  type: TaskType;
  notes: string;
}

interface DraftTask {
  id: string;
  title: string;
  category: string;
  type: TaskType;
  notes: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  { id: "work",     label: "Work",     color: "#7467F0", bg: "#EEF0FF" },
  { id: "personal", label: "Personal", color: "#06B6D4", bg: "#E0F9FF" },
  { id: "health",   label: "Health",   color: "#10B981", bg: "#DCFCEC" },
  { id: "learning", label: "Learning", color: "#F59E0B", bg: "#FEF6DC" },
  { id: "other",    label: "Other",    color: "#F43F5E", bg: "#FFE4EA" },
];

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function getCat(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[4];
}

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Task Chip ────────────────────────────────────────────────────────────────

function TaskChip({
  task,
  compact = false,
  onRemove,
  onClick,
  draggable,
  onDragStart,
}: {
  task: CalendarTask | DraftTask;
  compact?: boolean;
  onRemove?: () => void;
  onClick?: (e: React.MouseEvent) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}) {
  const cat = getCat(task.category);
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      style={{
        backgroundColor: cat.bg,
        borderLeft: `3px solid ${cat.color}`,
        cursor: onClick ? "pointer" : draggable ? "grab" : "default",
      }}
      className={`flex items-center gap-1 rounded-md text-xs font-medium select-none transition-opacity hover:opacity-80 ${
        compact ? "px-1.5 py-0.5 truncate max-w-full" : "px-2 py-1.5 w-full"
      }`}
    >
      {draggable && !compact && (
        <GripVertical size={12} className="shrink-0 opacity-40" />
      )}
      {task.type === "reminder" && (
        <Clock size={10} className="shrink-0" style={{ color: cat.color }} />
      )}
      <span className="truncate flex-1" style={{ color: cat.color }}>
        {task.title}
      </span>
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}

// ─── Add / Edit Task Dialog ───────────────────────────────────────────────────

function TaskDialog({
  open,
  onClose,
  initialDate,
  onSave,
  asDraft,
  editTask,
  onUpdate,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  initialDate?: string;
  onSave: (task: CalendarTask | DraftTask, saveToDraft: boolean) => void;
  asDraft?: boolean;
  editTask?: CalendarTask | null;
  onUpdate?: (task: CalendarTask) => void;
  onDelete?: (id: string) => void;
}) {
  const isEdit = !!editTask;

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(initialDate ?? toKey(new Date()));
  const [category, setCategory] = useState("work");
  const [type, setType] = useState<TaskType>("task");
  const [notes, setNotes] = useState("");
  const [toDraft, setToDraft] = useState(asDraft ?? false);

  useEffect(() => {
    if (open) {
      if (editTask) {
        setTitle(editTask.title);
        setDate(editTask.date);
        setCategory(editTask.category);
        setType(editTask.type);
        setNotes(editTask.notes);
        setToDraft(false);
      } else {
        setTitle("");
        setDate(initialDate ?? toKey(new Date()));
        setCategory("work");
        setType("task");
        setNotes("");
        setToDraft(asDraft ?? false);
      }
    }
  }, [open, initialDate, asDraft, editTask]);

  if (!open) return null;

  const handleSave = () => {
    if (!title.trim()) return;
    if (isEdit && onUpdate && editTask) {
      onUpdate({ ...editTask, title: title.trim(), date, category, type, notes });
      onClose();
      return;
    }
    if (toDraft) {
      onSave({ id: uid(), title: title.trim(), category, type, notes }, true);
    } else {
      onSave({ id: uid(), title: title.trim(), date, category, type, notes }, false);
    }
    onClose();
  };

  const handleDelete = () => {
    if (editTask && onDelete) {
      onDelete(editTask.id);
      onClose();
    }
  };

  const cat = isEdit ? getCat(category) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.35)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-5 shadow-2xl"
        style={{ background: "var(--fb-surface)", border: "1px solid var(--fb-border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {isEdit && cat && (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: cat.color }}
              />
            )}
            <h2 className="text-base font-semibold" style={{ color: "var(--fb-text)" }}>
              {isEdit ? "Edit Task" : "New Task"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {isEdit && onDelete && (
              <button
                onClick={handleDelete}
                title="Delete task"
                className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-red-50"
              >
                <Trash2 size={14} style={{ color: "#F43F5E" }} />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <X size={15} style={{ color: "var(--fb-text-muted)" }} />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--fb-text-muted)" }}>
            Title *
          </label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="What needs to be done?"
            className="px-3 py-2 rounded-lg text-sm outline-none transition-all"
            style={{
              background: "var(--fb-muted)",
              border: "1px solid var(--fb-border)",
              color: "var(--fb-text)",
            }}
          />
        </div>

        {/* Type toggle */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--fb-text-muted)" }}>
            Type
          </label>
          <div className="flex gap-2">
            {(["task", "reminder"] as TaskType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                style={{
                  background: type === t ? "#7467F0" : "var(--fb-muted)",
                  color: type === t ? "#fff" : "var(--fb-text-muted)",
                  border: `1px solid ${type === t ? "#7467F0" : "var(--fb-border)"}`,
                }}
              >
                {t === "reminder" ? "⏰ " : "✅ "}{t}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--fb-text-muted)" }}>
            Category
          </label>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: category === c.id ? c.color : c.bg,
                  color: category === c.id ? "#fff" : c.color,
                  border: `1.5px solid ${c.color}`,
                  opacity: category === c.id ? 1 : 0.7,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: category === c.id ? "#fff" : c.color }}
                />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        {!toDraft && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--fb-text-muted)" }}>
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "var(--fb-muted)",
                border: "1px solid var(--fb-border)",
                color: "var(--fb-text)",
              }}
            />
          </div>
        )}

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--fb-text-muted)" }}>
            Notes <span className="opacity-50">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note…"
            rows={2}
            className="px-3 py-2 rounded-lg text-sm outline-none resize-none"
            style={{
              background: "var(--fb-muted)",
              border: "1px solid var(--fb-border)",
              color: "var(--fb-text)",
            }}
          />
        </div>

        {/* Save to Draft toggle — only for new tasks */}
        {!isEdit && (
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              onClick={() => setToDraft(!toDraft)}
              className="w-9 h-5 rounded-full transition-all relative"
              style={{ background: toDraft ? "#7467F0" : "var(--fb-border)" }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                style={{ left: toDraft ? "18px" : "2px" }}
              />
            </div>
            <span className="text-xs" style={{ color: "var(--fb-text-muted)" }}>
              Save to Draft (schedule later)
            </span>
          </label>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{
              background: "var(--fb-muted)",
              color: "var(--fb-text-muted)",
              border: "1px solid var(--fb-border)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="flex-1 py-2 rounded-xl text-sm font-medium text-white transition-all"
            style={{
              background: title.trim() ? "#7467F0" : "var(--fb-border)",
              cursor: title.trim() ? "pointer" : "not-allowed",
            }}
          >
            {isEdit ? "Save Changes" : toDraft ? "Save to Drafts" : "Add to Calendar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({
  currentDate,
  tasks,
  onDayClick,
  onDropOnDate,
  onRemoveTask,
  onDragTaskStart,
  onTaskClick,
  dragOverDate,
  setDragOverDate,
}: {
  currentDate: Date;
  tasks: CalendarTask[];
  onDayClick: (date: string) => void;
  onDropOnDate: (date: string) => void;
  onRemoveTask: (id: string) => void;
  onDragTaskStart: (task: CalendarTask) => void;
  onTaskClick: (task: CalendarTask) => void;
  dragOverDate: string | null;
  setDragOverDate: (d: string | null) => void;
}) {
  const today = toKey(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: Array<{ date: string; inMonth: boolean; day: number }> = [];

  // Previous month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthDays - i);
    cells.push({ date: toKey(d), inMonth: false, day: prevMonthDays - i });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: toKey(new Date(year, month, d)), inMonth: true, day: d });
  }
  // Next month padding
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ date: toKey(new Date(year, month + 1, d)), inMonth: false, day: d });
  }

  const tasksByDate: Record<string, CalendarTask[]> = {};
  for (const t of tasks) {
    if (!tasksByDate[t.date]) tasksByDate[t.date] = [];
    tasksByDate[t.date].push(t);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_SHORT.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-semibold py-2"
            style={{ color: "var(--fb-text-muted)" }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 grid-rows-6 flex-1 gap-1">
        {cells.map(({ date, inMonth, day }) => {
          const dayTasks = tasksByDate[date] ?? [];
          const isToday = date === today;
          const isDragOver = dragOverDate === date;
          const MAX_SHOW = 3;

          return (
            <div
              key={date}
              onClick={() => inMonth && onDayClick(date)}
              onDragOver={(e) => { e.preventDefault(); setDragOverDate(date); }}
              onDragLeave={() => setDragOverDate(null)}
              onDrop={(e) => { e.preventDefault(); setDragOverDate(null); onDropOnDate(date); }}
              className="rounded-xl flex flex-col gap-0.5 p-1.5 cursor-pointer transition-all overflow-hidden"
              style={{
                background: isDragOver
                  ? "#EEF0FF"
                  : isToday
                  ? "#F5F3FF"
                  : inMonth
                  ? "var(--fb-surface)"
                  : "transparent",
                border: isDragOver
                  ? "2px dashed #7467F0"
                  : isToday
                  ? "1.5px solid #7467F0"
                  : `1px solid ${inMonth ? "var(--fb-border)" : "transparent"}`,
                opacity: inMonth ? 1 : 0.35,
                minHeight: 0,
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? "text-white" : ""
                  }`}
                  style={{
                    background: isToday ? "#7467F0" : "transparent",
                    color: isToday ? "#fff" : inMonth ? "var(--fb-text)" : "var(--fb-text-muted)",
                  }}
                >
                  {day}
                </span>
                {inMonth && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDayClick(date); }}
                    className="w-4 h-4 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 group-hover:opacity-60 transition-opacity"
                    style={{ color: "var(--fb-text-muted)" }}
                  >
                    <Plus size={10} />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayTasks.slice(0, MAX_SHOW).map((t) => (
                  <TaskChip
                    key={t.id}
                    task={t}
                    compact
                    draggable
                    onDragStart={(e) => { e.stopPropagation(); onDragTaskStart(t); }}
                    onClick={(e) => { e.stopPropagation(); onTaskClick(t); }}
                    onRemove={() => onRemoveTask(t.id)}
                  />
                ))}
                {dayTasks.length > MAX_SHOW && (
                  <span className="text-xs pl-1" style={{ color: "var(--fb-text-muted)" }}>
                    +{dayTasks.length - MAX_SHOW} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({
  currentDate,
  tasks,
  onDayClick,
  onDropOnDate,
  onRemoveTask,
  onDragTaskStart,
  onTaskClick,
  dragOverDate,
  setDragOverDate,
}: {
  currentDate: Date;
  tasks: CalendarTask[];
  onDayClick: (date: string) => void;
  onDropOnDate: (date: string) => void;
  onRemoveTask: (id: string) => void;
  onDragTaskStart: (task: CalendarTask) => void;
  onTaskClick: (task: CalendarTask) => void;
  dragOverDate: string | null;
  setDragOverDate: (d: string | null) => void;
}) {
  const today = toKey(new Date());

  // Get start of week (Sunday)
  const startOfWeek = new Date(currentDate);
  const dow = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - dow);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });

  const tasksByDate: Record<string, CalendarTask[]> = {};
  for (const t of tasks) {
    if (!tasksByDate[t.date]) tasksByDate[t.date] = [];
    tasksByDate[t.date].push(t);
  }

  return (
    <div className="flex-1 grid grid-cols-7 gap-2 min-h-0 overflow-hidden">
      {weekDays.map((d) => {
        const dateKey = toKey(d);
        const dayTasks = tasksByDate[dateKey] ?? [];
        const isToday = dateKey === today;
        const isDragOver = dragOverDate === dateKey;

        return (
          <div
            key={dateKey}
            className="flex flex-col gap-2 rounded-xl p-3 overflow-y-auto cursor-pointer transition-all"
            style={{
              background: isDragOver ? "#EEF0FF" : isToday ? "#F5F3FF" : "var(--fb-surface)",
              border: isDragOver
                ? "2px dashed #7467F0"
                : isToday
                ? "1.5px solid #7467F0"
                : "1px solid var(--fb-border)",
            }}
            onClick={() => onDayClick(dateKey)}
            onDragOver={(e) => { e.preventDefault(); setDragOverDate(dateKey); }}
            onDragLeave={() => setDragOverDate(null)}
            onDrop={(e) => { e.preventDefault(); setDragOverDate(null); onDropOnDate(dateKey); }}
          >
            <div className="flex flex-col items-center gap-0.5 pb-1" style={{ borderBottom: "1px solid var(--fb-border)" }}>
              <span className="text-xs font-medium" style={{ color: "var(--fb-text-muted)" }}>
                {DAYS_SHORT[d.getDay()]}
              </span>
              <span
                className="text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full"
                style={{
                  background: isToday ? "#7467F0" : "transparent",
                  color: isToday ? "#fff" : "var(--fb-text)",
                }}
              >
                {d.getDate()}
              </span>
            </div>
            <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
              {dayTasks.map((t) => (
                <TaskChip
                  key={t.id}
                  task={t}
                  draggable
                  onDragStart={(e) => { e.stopPropagation(); onDragTaskStart(t); }}
                  onClick={(e) => { e.stopPropagation(); onTaskClick(t); }}
                  onRemove={() => onRemoveTask(t.id)}
                />
              ))}
              {dayTasks.length === 0 && (
                <p className="text-xs text-center mt-2" style={{ color: "var(--fb-text-muted)" }}>
                  Drop here
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Draft Panel ──────────────────────────────────────────────────────────────

function DraftPanel({
  drafts,
  onAddDraft,
  onRemoveDraft,
  onDragDraftStart,
}: {
  drafts: DraftTask[];
  onAddDraft: () => void;
  onRemoveDraft: (id: string) => void;
  onDragDraftStart: (draft: DraftTask) => void;
}) {
  return (
    <div
      className="w-64 shrink-0 rounded-2xl flex flex-col gap-3 overflow-hidden"
      style={{
        background: "var(--fb-surface)",
        border: "1px solid var(--fb-border)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--fb-border)" }}
      >
        <div className="flex items-center gap-2">
          <Inbox size={14} style={{ color: "#7467F0" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--fb-text)" }}>
            Drafts
          </span>
          {drafts.length > 0 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: "#EEF0FF", color: "#7467F0" }}
            >
              {drafts.length}
            </span>
          )}
        </div>
        <button
          onClick={onAddDraft}
          className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
          style={{ background: "#EEF0FF", color: "#7467F0" }}
          title="Add draft"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Hint */}
      <p className="text-xs px-4 leading-relaxed" style={{ color: "var(--fb-text-muted)" }}>
        Drag tasks onto any calendar date to schedule them.
      </p>

      {/* Draft list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2">
        {drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <Inbox size={28} style={{ color: "var(--fb-border)" }} />
            <p className="text-xs text-center" style={{ color: "var(--fb-text-muted)" }}>
              No drafts yet.
              <br />
              Add tasks you'll schedule later.
            </p>
          </div>
        ) : (
          drafts.map((draft) => (
            <div
              key={draft.id}
              draggable
              onDragStart={() => onDragDraftStart(draft)}
              className="flex flex-col gap-1 rounded-xl p-2.5 cursor-grab transition-all"
              style={{
                background: getCat(draft.category).bg,
                border: `1px solid ${getCat(draft.category).color}22`,
              }}
            >
              <div className="flex items-center gap-1.5">
                <GripVertical size={12} style={{ color: getCat(draft.category).color }} className="shrink-0 opacity-50" />
                {draft.type === "reminder" && (
                  <Clock size={10} style={{ color: getCat(draft.category).color }} className="shrink-0" />
                )}
                <span
                  className="text-xs font-medium flex-1 truncate"
                  style={{ color: getCat(draft.category).color }}
                >
                  {draft.title}
                </span>
                <button
                  onClick={() => onRemoveDraft(draft.id)}
                  className="shrink-0 opacity-40 hover:opacity-100 transition-opacity"
                  style={{ color: getCat(draft.category).color }}
                >
                  <Trash2 size={10} />
                </button>
              </div>
              <div className="flex items-center gap-1 pl-5">
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                  style={{
                    background: getCat(draft.category).color + "22",
                    color: getCat(draft.category).color,
                  }}
                >
                  {getCat(draft.category).label}
                </span>
                <span
                  className="text-xs capitalize"
                  style={{ color: getCat(draft.category).color, opacity: 0.7 }}
                >
                  · {draft.type}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Calendar Page ───────────────────────────────────────────────────────

const STORAGE_KEY_TASKS = "fb_cal_tasks";
const STORAGE_KEY_DRAFTS = "fb_cal_drafts";

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<CalendarTask[]>(() =>
    loadStorage(STORAGE_KEY_TASKS, [])
  );
  const [drafts, setDrafts] = useState<DraftTask[]>(() =>
    loadStorage(STORAGE_KEY_DRAFTS, [])
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDate, setDialogDate] = useState<string | undefined>();
  const [dialogAsDraft, setDialogAsDraft] = useState(false);
  const [editingTask, setEditingTask] = useState<CalendarTask | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const draggedTaskRef = useRef<CalendarTask | null>(null);
  const draggedDraftRef = useRef<DraftTask | null>(null);

  // Persist to localStorage
  useEffect(() => { localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(drafts)); }, [drafts]);

  // ── Navigation ──────────────────────────────────────────────

  const navigate = (dir: 1 | -1) => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (view === "month") d.setMonth(d.getMonth() + dir);
      else d.setDate(d.getDate() + dir * 7);
      return d;
    });
  };

  const goToday = () => setCurrentDate(new Date());

  const headerLabel = view === "month"
    ? `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : (() => {
        const start = new Date(currentDate);
        start.setDate(start.getDate() - start.getDay());
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        if (start.getMonth() === end.getMonth())
          return `${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
        return `${MONTHS[start.getMonth()]} – ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
      })();

  // ── Dialog handlers ─────────────────────────────────────────

  const openAddTask = (date?: string, asDraft = false) => {
    setEditingTask(null);
    setDialogDate(date);
    setDialogAsDraft(asDraft);
    setDialogOpen(true);
  };

  const handleTaskClick = useCallback((task: CalendarTask) => {
    setEditingTask(task);
    setDialogAsDraft(false);
    setDialogOpen(true);
  }, []);

  const handleUpdateTask = useCallback((updated: CalendarTask) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setEditingTask(null);
  }, []);

  const handleDeleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setEditingTask(null);
  }, []);

  const handleSave = useCallback(
    (task: CalendarTask | DraftTask, saveToDraft: boolean) => {
      if (saveToDraft) {
        const { id, title, category, type, notes } = task as DraftTask;
        setDrafts((prev) => [...prev, { id, title, category, type, notes }]);
      } else {
        setTasks((prev) => [...prev, task as CalendarTask]);
      }
    },
    []
  );

  // ── Drag & drop ─────────────────────────────────────────────

  const handleDragTaskStart = (task: CalendarTask) => {
    draggedTaskRef.current = task;
    draggedDraftRef.current = null;
  };

  const handleDragDraftStart = (draft: DraftTask) => {
    draggedDraftRef.current = draft;
    draggedTaskRef.current = null;
  };

  const handleDropOnDate = (date: string) => {
    // Drop a calendar task (reschedule)
    if (draggedTaskRef.current) {
      const moved = draggedTaskRef.current;
      if (moved.date === date) { draggedTaskRef.current = null; return; }
      setTasks((prev) =>
        prev.map((t) => (t.id === moved.id ? { ...t, date } : t))
      );
      draggedTaskRef.current = null;
    }
    // Drop a draft (schedule)
    if (draggedDraftRef.current) {
      const draft = draggedDraftRef.current;
      setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
      setTasks((prev) => [
        ...prev,
        { id: draft.id, title: draft.title, date, category: draft.category, type: draft.type, notes: draft.notes },
      ]);
      draggedDraftRef.current = null;
    }
  };

  const handleRemoveTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleRemoveDraft = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: "var(--fb-bg)" }}
    >
      {/* ── Top bar ─────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--fb-border)" }}
      >
        {/* Left: Title */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "#FEF6DC" }}
          >
            <CalendarDays size={18} color="#F59E0B" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--fb-text)" }}>
              Calendar
            </h1>
            <p className="text-xs" style={{ color: "var(--fb-text-muted)" }}>
              Plan your tasks and reminders
            </p>
          </div>
        </div>

        {/* Center: Nav */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
            style={{ background: "var(--fb-surface)", border: "1px solid var(--fb-border)", color: "var(--fb-text-muted)" }}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold min-w-44 text-center" style={{ color: "var(--fb-text)" }}>
            {headerLabel}
          </span>
          <button
            onClick={() => navigate(1)}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
            style={{ background: "var(--fb-surface)", border: "1px solid var(--fb-border)", color: "var(--fb-text-muted)" }}
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={goToday}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: "var(--fb-muted)", color: "var(--fb-text-muted)", border: "1px solid var(--fb-border)" }}
          >
            Today
          </button>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div
            className="flex p-1 rounded-xl gap-1"
            style={{ background: "var(--fb-muted)", border: "1px solid var(--fb-border)" }}
          >
            {(["month", "week"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                style={{
                  background: view === v ? "var(--fb-surface)" : "transparent",
                  color: view === v ? "#7467F0" : "var(--fb-text-muted)",
                  boxShadow: view === v ? "var(--fb-shadow-sm)" : "none",
                }}
              >
                {v === "month" ? <Calendar size={12} /> : <Clock size={12} />}
                {v}
              </button>
            ))}
          </div>

          {/* Add task */}
          <button
            onClick={() => openAddTask(toKey(new Date()))}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:scale-105"
            style={{ background: "#7467F0" }}
          >
            <Plus size={13} />
            Add Task
          </button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────── */}
      <div className="flex-1 flex gap-4 p-5 min-h-0 overflow-hidden">
        {/* Calendar area */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {view === "month" ? (
            <MonthView
              currentDate={currentDate}
              tasks={tasks}
              onDayClick={(date) => openAddTask(date)}
              onDropOnDate={handleDropOnDate}
              onRemoveTask={handleRemoveTask}
              onDragTaskStart={handleDragTaskStart}
              onTaskClick={handleTaskClick}
              dragOverDate={dragOverDate}
              setDragOverDate={setDragOverDate}
            />
          ) : (
            <WeekView
              currentDate={currentDate}
              tasks={tasks}
              onDayClick={(date) => openAddTask(date)}
              onDropOnDate={handleDropOnDate}
              onRemoveTask={handleRemoveTask}
              onDragTaskStart={handleDragTaskStart}
              onTaskClick={handleTaskClick}
              dragOverDate={dragOverDate}
              setDragOverDate={setDragOverDate}
            />
          )}
        </div>

        {/* Draft panel */}
        <DraftPanel
          drafts={drafts}
          onAddDraft={() => openAddTask(undefined, true)}
          onRemoveDraft={handleRemoveDraft}
          onDragDraftStart={handleDragDraftStart}
        />
      </div>

      {/* ── Dialog ──────────────────────────────────────────── */}
      <TaskDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingTask(null); }}
        initialDate={dialogDate}
        onSave={handleSave}
        asDraft={dialogAsDraft}
        editTask={editingTask}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
      />
    </div>
  );
}
