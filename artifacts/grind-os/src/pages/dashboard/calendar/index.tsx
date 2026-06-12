import React, { useState, useRef, useCallback, useEffect } from "react";
import { api } from "../../../lib/api";
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
  List,
  AlertCircle,
  Minus,
  ArrowUp,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "month" | "week" | "day";
type TaskType = "task" | "reminder";
type Priority = "high" | "normal" | "low";

interface Category {
  id: string;
  label: string;
  color: string;
  bg: string;
}

interface CalendarTask {
  id: string;
  title: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  category: string;
  type: TaskType;
  priority: Priority;
  notes: string;
}

interface DraftTask {
  id: string;
  title: string;
  category: string;
  type: TaskType;
  priority: Priority;
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

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  high:   { label: "High",   color: "#F43F5E", bg: "#FFE4EA", icon: <ArrowUp size={10} /> },
  normal: { label: "Normal", color: "#7467F0", bg: "#EEF0FF", icon: <Minus size={10} /> },
  low:    { label: "Low",    color: "#9CA3AF", bg: "#F3F4F6", icon: <Minus size={10} style={{ opacity: 0.5 }} /> },
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getCat(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[4];
}

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function formatTime(t: string) {
  const [hh, mm] = t.split(":").map(Number);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h = hh % 12 || 12;
  return `${h}:${String(mm).padStart(2, "0")} ${ampm}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ─── Task Chip ────────────────────────────────────────────────────────────────

function TaskChip({
  task,
  compact = false,
  onRemove,
  onClick,
  draggable,
  onDragStart,
  showTime = false,
}: {
  task: CalendarTask | DraftTask;
  compact?: boolean;
  onRemove?: () => void;
  onClick?: (e: React.MouseEvent) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  showTime?: boolean;
}) {
  const cat = getCat(task.category);
  const pri = (task as CalendarTask).priority
    ? PRIORITY_CONFIG[(task as CalendarTask).priority] ?? PRIORITY_CONFIG.normal
    : PRIORITY_CONFIG.normal;
  const st = (task as CalendarTask).startTime;

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
      {(task as CalendarTask).priority === "high" && (
        <span style={{ color: "#F43F5E" }} className="shrink-0">
          <AlertCircle size={9} />
        </span>
      )}
      {task.type === "reminder" && (
        <Clock size={10} className="shrink-0" style={{ color: cat.color }} />
      )}
      <span className="truncate flex-1" style={{ color: cat.color }}>
        {task.title}
      </span>
      {showTime && st && !compact && (
        <span className="shrink-0 text-xs opacity-60" style={{ color: cat.color }}>
          {formatTime(st)}
        </span>
      )}
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

// ─── Task Dialog ─────────────────────────────────────────────────────────────

function TaskDialog({
  open,
  onClose,
  initialDate,
  initialTime,
  onSave,
  asDraft,
  editTask,
  onUpdate,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  initialDate?: string;
  initialTime?: string;
  onSave: (task: CalendarTask | DraftTask, saveToDraft: boolean) => void;
  asDraft?: boolean;
  editTask?: CalendarTask | null;
  onUpdate?: (task: CalendarTask) => void;
  onDelete?: (id: string) => void;
}) {
  const isEdit = !!editTask;
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(initialDate ?? toKey(new Date()));
  const [startTime, setStartTime] = useState(initialTime ?? "");
  const [endTime, setEndTime] = useState("");
  const [category, setCategory] = useState("work");
  const [type, setType] = useState<TaskType>("task");
  const [priority, setPriority] = useState<Priority>("normal");
  const [notes, setNotes] = useState("");
  const [toDraft, setToDraft] = useState(asDraft ?? false);

  useEffect(() => {
    if (open) {
      if (editTask) {
        setTitle(editTask.title);
        setDate(editTask.date);
        setStartTime(editTask.startTime ?? "");
        setEndTime(editTask.endTime ?? "");
        setCategory(editTask.category);
        setType(editTask.type);
        setPriority(editTask.priority ?? "normal");
        setNotes(editTask.notes);
        setToDraft(false);
      } else {
        setTitle("");
        setDate(initialDate ?? toKey(new Date()));
        setStartTime(initialTime ?? "");
        setEndTime(initialTime ? minutesToTime(timeToMinutes(initialTime) + 60) : "");
        setCategory("work");
        setType("task");
        setPriority("normal");
        setNotes("");
        setToDraft(asDraft ?? false);
      }
    }
  }, [open, initialDate, initialTime, asDraft, editTask]);

  if (!open) return null;

  const handleSave = () => {
    if (!title.trim()) return;
    const base = {
      title: title.trim(),
      category,
      type,
      priority,
      notes,
    };
    if (isEdit && onUpdate && editTask) {
      onUpdate({ ...editTask, ...base, date, startTime: startTime || null, endTime: endTime || null });
      onClose();
      return;
    }
    if (toDraft) {
      onSave({ id: uid(), ...base }, true);
    } else {
      onSave({ id: uid(), ...base, date, startTime: startTime || null, endTime: endTime || null }, false);
    }
    onClose();
  };

  const cat = getCat(category);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.35)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4 shadow-2xl"
        style={{ background: "var(--fb-surface)", border: "1px solid var(--fb-border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {isEdit && (
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
            )}
            <h2 className="text-base font-semibold" style={{ color: "var(--fb-text)" }}>
              {isEdit ? "Edit Event" : "New Event"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {isEdit && onDelete && (
              <button onClick={() => { onDelete(editTask!.id); onClose(); }}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors">
                <Trash2 size={14} style={{ color: "#F43F5E" }} />
              </button>
            )}
            <button onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
              <X size={15} style={{ color: "var(--fb-text-muted)" }} />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--fb-text-muted)" }}>Title *</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="What needs to be done?"
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: "var(--fb-muted)", border: "1px solid var(--fb-border)", color: "var(--fb-text)" }}
          />
        </div>

        {/* Type + Priority */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--fb-text-muted)" }}>Type</label>
            <div className="flex gap-1">
              {(["task", "reminder"] as TaskType[]).map((t) => (
                <button key={t} onClick={() => setType(t)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                  style={{
                    background: type === t ? "#7467F0" : "var(--fb-muted)",
                    color: type === t ? "#fff" : "var(--fb-text-muted)",
                    border: `1px solid ${type === t ? "#7467F0" : "var(--fb-border)"}`,
                  }}>
                  {t === "reminder" ? "⏰" : "✅"} {t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--fb-text-muted)" }}>Priority</label>
            <div className="flex gap-1">
              {(["high", "normal", "low"] as Priority[]).map((p) => {
                const pc = PRIORITY_CONFIG[p];
                return (
                  <button key={p} onClick={() => setPriority(p)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                    style={{
                      background: priority === p ? pc.color : "var(--fb-muted)",
                      color: priority === p ? "#fff" : pc.color,
                      border: `1px solid ${priority === p ? pc.color : "var(--fb-border)"}`,
                    }}>
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Category */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--fb-text-muted)" }}>Category</label>
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => setCategory(c.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  background: category === c.id ? c.color : c.bg,
                  color: category === c.id ? "#fff" : c.color,
                  border: `1.5px solid ${c.color}`,
                  opacity: category === c.id ? 1 : 0.7,
                }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: category === c.id ? "#fff" : c.color }} />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date + Time */}
        {!toDraft && (
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--fb-text-muted)" }}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="px-2 py-2 rounded-lg text-xs outline-none"
                style={{ background: "var(--fb-muted)", border: "1px solid var(--fb-border)", color: "var(--fb-text)" }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--fb-text-muted)" }}>Start time</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="px-2 py-2 rounded-lg text-xs outline-none"
                style={{ background: "var(--fb-muted)", border: "1px solid var(--fb-border)", color: "var(--fb-text)" }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--fb-text-muted)" }}>End time</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="px-2 py-2 rounded-lg text-xs outline-none"
                style={{ background: "var(--fb-muted)", border: "1px solid var(--fb-border)", color: "var(--fb-text)" }}
              />
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--fb-text-muted)" }}>
            Notes <span className="opacity-50">(optional)</span>
          </label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add a note…" rows={2}
            className="px-3 py-2 rounded-lg text-sm outline-none resize-none"
            style={{ background: "var(--fb-muted)", border: "1px solid var(--fb-border)", color: "var(--fb-text)" }}
          />
        </div>

        {/* Draft toggle */}
        {!isEdit && (
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div onClick={() => setToDraft(!toDraft)}
              className="w-9 h-5 rounded-full transition-all relative"
              style={{ background: toDraft ? "#7467F0" : "var(--fb-border)" }}>
              <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                style={{ left: toDraft ? "18px" : "2px" }} />
            </div>
            <span className="text-xs" style={{ color: "var(--fb-text-muted)" }}>
              Save to Drafts (schedule later)
            </span>
          </label>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: "var(--fb-muted)", color: "var(--fb-text-muted)", border: "1px solid var(--fb-border)" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={!title.trim()}
            className="flex-1 py-2 rounded-xl text-sm font-medium text-white transition-all"
            style={{ background: title.trim() ? "#7467F0" : "var(--fb-border)", cursor: title.trim() ? "pointer" : "not-allowed" }}>
            {isEdit ? "Save Changes" : toDraft ? "Save to Drafts" : "Add Event"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({
  currentDate, tasks, onDayClick, onDropOnDate, onRemoveTask, onDragTaskStart, onTaskClick, dragOverDate, setDragOverDate,
}: {
  currentDate: Date; tasks: CalendarTask[];
  onDayClick: (date: string) => void; onDropOnDate: (date: string) => void;
  onRemoveTask: (id: string) => void; onDragTaskStart: (task: CalendarTask) => void;
  onTaskClick: (task: CalendarTask) => void; dragOverDate: string | null;
  setDragOverDate: (d: string | null) => void;
}) {
  const today = toKey(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const cells: Array<{ date: string; inMonth: boolean; day: number }> = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthDays - i);
    cells.push({ date: toKey(d), inMonth: false, day: prevMonthDays - i });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: toKey(new Date(year, month, d)), inMonth: true, day: d });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ date: toKey(new Date(year, month + 1, d)), inMonth: false, day: d });
  }

  const tasksByDate: Record<string, CalendarTask[]> = {};
  for (const t of tasks) {
    if (!tasksByDate[t.date]) tasksByDate[t.date] = [];
    tasksByDate[t.date].push(t);
  }
  for (const k in tasksByDate) {
    tasksByDate[k].sort((a, b) => {
      if (a.priority === "high" && b.priority !== "high") return -1;
      if (b.priority === "high" && a.priority !== "high") return 1;
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
      if (a.startTime) return -1;
      if (b.startTime) return 1;
      return 0;
    });
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="grid grid-cols-7 mb-1">
        {DAYS_SHORT.map((d) => (
          <div key={d} className="text-center text-xs font-semibold py-2" style={{ color: "var(--fb-text-muted)" }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6 flex-1 gap-1">
        {cells.map(({ date, inMonth, day }) => {
          const dayTasks = tasksByDate[date] ?? [];
          const isToday = date === today;
          const isDragOver = dragOverDate === date;
          const hasHigh = dayTasks.some(t => t.priority === "high");

          return (
            <div
              key={date}
              onClick={() => inMonth && onDayClick(date)}
              onDragOver={(e) => { e.preventDefault(); setDragOverDate(date); }}
              onDragLeave={() => setDragOverDate(null)}
              onDrop={(e) => { e.preventDefault(); setDragOverDate(null); onDropOnDate(date); }}
              className="rounded-xl flex flex-col gap-0.5 p-1.5 cursor-pointer transition-all overflow-hidden"
              style={{
                background: isDragOver ? "#EEF0FF" : isToday ? "#F5F3FF" : inMonth ? "var(--fb-surface)" : "transparent",
                border: isDragOver ? "2px dashed #7467F0" : isToday ? "1.5px solid #7467F0" : `1px solid ${inMonth ? "var(--fb-border)" : "transparent"}`,
                opacity: inMonth ? 1 : 0.35,
                minHeight: 0,
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full"
                  style={{
                    background: isToday ? "#7467F0" : "transparent",
                    color: isToday ? "#fff" : inMonth ? "var(--fb-text)" : "var(--fb-text-muted)",
                  }}
                >
                  {day}
                </span>
                {hasHigh && inMonth && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" title="High priority event" />
                )}
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayTasks.slice(0, 3).map((t) => (
                  <TaskChip key={t.id} task={t} compact draggable
                    onDragStart={(e) => { e.stopPropagation(); onDragTaskStart(t); }}
                    onClick={(e) => { e.stopPropagation(); onTaskClick(t); }}
                    onRemove={() => onRemoveTask(t.id)}
                  />
                ))}
                {dayTasks.length > 3 && (
                  <span className="text-xs pl-1" style={{ color: "var(--fb-text-muted)" }}>+{dayTasks.length - 3} more</span>
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
  currentDate, tasks, onDayClick, onDropOnDate, onRemoveTask, onDragTaskStart, onTaskClick, dragOverDate, setDragOverDate,
}: {
  currentDate: Date; tasks: CalendarTask[];
  onDayClick: (date: string) => void; onDropOnDate: (date: string) => void;
  onRemoveTask: (id: string) => void; onDragTaskStart: (task: CalendarTask) => void;
  onTaskClick: (task: CalendarTask) => void; dragOverDate: string | null;
  setDragOverDate: (d: string | null) => void;
}) {
  const today = toKey(new Date());
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
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
  for (const k in tasksByDate) {
    tasksByDate[k].sort((a, b) => {
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
      if (a.startTime) return -1;
      if (b.startTime) return 1;
      return 0;
    });
  }

  return (
    <div className="flex-1 grid grid-cols-7 gap-2 min-h-0 overflow-hidden">
      {weekDays.map((d) => {
        const dateKey = toKey(d);
        const dayTasks = tasksByDate[dateKey] ?? [];
        const isToday = dateKey === today;
        const isDragOver = dragOverDate === dateKey;
        return (
          <div key={dateKey}
            className="flex flex-col gap-2 rounded-xl p-3 overflow-y-auto cursor-pointer transition-all"
            style={{
              background: isDragOver ? "#EEF0FF" : isToday ? "#F5F3FF" : "var(--fb-surface)",
              border: isDragOver ? "2px dashed #7467F0" : isToday ? "1.5px solid #7467F0" : "1px solid var(--fb-border)",
            }}
            onClick={() => onDayClick(dateKey)}
            onDragOver={(e) => { e.preventDefault(); setDragOverDate(dateKey); }}
            onDragLeave={() => setDragOverDate(null)}
            onDrop={(e) => { e.preventDefault(); setDragOverDate(null); onDropOnDate(dateKey); }}
          >
            <div className="flex flex-col items-center gap-0.5 pb-1" style={{ borderBottom: "1px solid var(--fb-border)" }}>
              <span className="text-xs font-medium" style={{ color: "var(--fb-text-muted)" }}>{DAYS_SHORT[d.getDay()]}</span>
              <span className="text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full"
                style={{ background: isToday ? "#7467F0" : "transparent", color: isToday ? "#fff" : "var(--fb-text)" }}>
                {d.getDate()}
              </span>
            </div>
            <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
              {dayTasks.map((t) => (
                <TaskChip key={t.id} task={t} showTime draggable
                  onDragStart={(e) => { e.stopPropagation(); onDragTaskStart(t); }}
                  onClick={(e) => { e.stopPropagation(); onTaskClick(t); }}
                  onRemove={() => onRemoveTask(t.id)}
                />
              ))}
              {dayTasks.length === 0 && (
                <p className="text-xs text-center mt-2" style={{ color: "var(--fb-text-muted)" }}>Drop here</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 60; // px per hour
const DAY_START = 7;   // first visible hour

function DayView({
  currentDate, tasks, onTimeSlotClick, onTaskClick, onRemoveTask,
}: {
  currentDate: Date;
  tasks: CalendarTask[];
  onTimeSlotClick: (date: string, time: string) => void;
  onTaskClick: (task: CalendarTask) => void;
  onRemoveTask: (id: string) => void;
}) {
  const today = toKey(new Date());
  const dateKey = toKey(currentDate);
  const isToday = dateKey === today;
  const now = new Date();
  const nowMins = isToday ? now.getHours() * 60 + now.getMinutes() : -1;

  const dayTasks = tasks.filter(t => t.date === dateKey);
  const timedTasks = dayTasks.filter(t => t.startTime);
  const allDayTasks = dayTasks.filter(t => !t.startTime);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      const offset = Math.max(0, (DAY_START - 1)) * HOUR_HEIGHT;
      scrollRef.current.scrollTop = offset;
    }
  }, [dateKey]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden rounded-xl"
      style={{ border: "1px solid var(--fb-border)", background: "var(--fb-surface)" }}>

      {/* Day header */}
      <div className="px-4 py-3 flex items-center gap-3 shrink-0" style={{ borderBottom: "1px solid var(--fb-border)" }}>
        <span className="text-sm font-bold w-9 h-9 flex items-center justify-center rounded-full"
          style={{ background: isToday ? "#7467F0" : "var(--fb-muted)", color: isToday ? "#fff" : "var(--fb-text)" }}>
          {currentDate.getDate()}
        </span>
        <div>
          <div className="text-sm font-semibold" style={{ color: "var(--fb-text)" }}>
            {DAYS_SHORT[currentDate.getDay()]}, {MONTHS[currentDate.getMonth()]} {currentDate.getDate()}
          </div>
          <div className="text-xs" style={{ color: "var(--fb-text-muted)" }}>
            {dayTasks.length} event{dayTasks.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* All-day events */}
      {allDayTasks.length > 0 && (
        <div className="px-4 py-2 flex flex-col gap-1 shrink-0" style={{ borderBottom: "1px solid var(--fb-border)" }}>
          <p className="text-xs font-medium mb-1" style={{ color: "var(--fb-text-muted)" }}>All-day</p>
          {allDayTasks.map(t => (
            <TaskChip key={t.id} task={t} showTime
              onClick={(e) => { e.stopPropagation(); onTaskClick(t); }}
              onRemove={() => onRemoveTask(t.id)}
            />
          ))}
        </div>
      )}

      {/* Hourly grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        <div style={{ height: `${24 * HOUR_HEIGHT}px`, position: "relative" }}>
          {/* Hour lines */}
          {HOURS.map((h) => (
            <div key={h} style={{ position: "absolute", top: `${h * HOUR_HEIGHT}px`, left: 0, right: 0, height: HOUR_HEIGHT }}>
              <div className="flex">
                <div className="w-14 shrink-0 text-right pr-3 pt-0"
                  style={{ color: "var(--fb-text-muted)", fontSize: "10px", lineHeight: "1", marginTop: "-6px" }}>
                  {h === 0 ? "" : `${h % 12 || 12}${h < 12 ? "am" : "pm"}`}
                </div>
                <div
                  className="flex-1"
                  onClick={() => onTimeSlotClick(dateKey, minutesToTime(h * 60))}
                  style={{
                    borderTop: "1px solid var(--fb-border)",
                    opacity: h % 6 === 0 ? 0.8 : 0.35,
                    cursor: "pointer",
                  }}
                />
              </div>
              {/* Half-hour dashed */}
              <div className="flex" style={{ marginTop: `${HOUR_HEIGHT / 2 - 1}px`, position: "absolute", top: HOUR_HEIGHT / 2, left: 56, right: 0 }}>
                <div className="flex-1" style={{ borderTop: "1px dashed var(--fb-border)", opacity: 0.3 }}
                  onClick={() => onTimeSlotClick(dateKey, minutesToTime(h * 60 + 30))}
                />
              </div>
            </div>
          ))}

          {/* Now line */}
          {nowMins >= 0 && (
            <div style={{
              position: "absolute",
              top: `${(nowMins / 60) * HOUR_HEIGHT}px`,
              left: 56,
              right: 0,
              zIndex: 10,
              pointerEvents: "none",
            }}>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 -ml-1" />
                <div className="flex-1 h-px bg-red-500" />
              </div>
            </div>
          )}

          {/* Events */}
          {timedTasks.map((t) => {
            const startMins = timeToMinutes(t.startTime!);
            const endMins = t.endTime ? timeToMinutes(t.endTime) : startMins + 60;
            const duration = Math.max(30, endMins - startMins);
            const cat = getCat(t.category);
            const pri = PRIORITY_CONFIG[t.priority ?? "normal"];

            return (
              <div
                key={t.id}
                onClick={() => onTaskClick(t)}
                style={{
                  position: "absolute",
                  top: `${(startMins / 60) * HOUR_HEIGHT}px`,
                  left: "60px",
                  right: "8px",
                  height: `${(duration / 60) * HOUR_HEIGHT - 2}px`,
                  minHeight: "24px",
                  backgroundColor: cat.bg,
                  borderLeft: `3px solid ${cat.color}`,
                  borderRadius: "6px",
                  padding: "4px 8px",
                  cursor: "pointer",
                  zIndex: 5,
                  overflow: "hidden",
                  boxShadow: t.priority === "high" ? `0 0 0 1px ${pri.color}44` : undefined,
                }}
                className="transition-opacity hover:opacity-80"
              >
                <div className="flex items-center gap-1">
                  {t.priority === "high" && <AlertCircle size={9} color="#F43F5E" />}
                  <span className="text-xs font-semibold truncate" style={{ color: cat.color }}>{t.title}</span>
                </div>
                {duration >= 45 && (
                  <div className="text-xs opacity-70 mt-0.5" style={{ color: cat.color }}>
                    {formatTime(t.startTime!)} {t.endTime ? `– ${formatTime(t.endTime)}` : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Agenda / Draft Panel ─────────────────────────────────────────────────────

function SidePanel({
  tasks, drafts, currentDate, onAddDraft, onRemoveDraft, onDragDraftStart, onTaskClick,
}: {
  tasks: CalendarTask[]; drafts: DraftTask[]; currentDate: Date;
  onAddDraft: () => void; onRemoveDraft: (id: string) => void;
  onDragDraftStart: (draft: DraftTask) => void; onTaskClick: (task: CalendarTask) => void;
}) {
  const [tab, setTab] = useState<"agenda" | "drafts">("agenda");

  const today = toKey(new Date());
  const upcoming = tasks
    .filter(t => t.date >= today)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
      if (a.startTime) return -1;
      if (b.startTime) return 1;
      return 0;
    })
    .slice(0, 20);

  const grouped: Record<string, CalendarTask[]> = {};
  for (const t of upcoming) {
    if (!grouped[t.date]) grouped[t.date] = [];
    grouped[t.date].push(t);
  }

  return (
    <div className="w-60 shrink-0 rounded-2xl flex flex-col overflow-hidden"
      style={{ background: "var(--fb-surface)", border: "1px solid var(--fb-border)" }}>

      {/* Tab header */}
      <div className="flex shrink-0" style={{ borderBottom: "1px solid var(--fb-border)" }}>
        {(["agenda", "drafts"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-3 text-xs font-semibold capitalize transition-all"
            style={{
              color: tab === t ? "#7467F0" : "var(--fb-text-muted)",
              borderBottom: tab === t ? "2px solid #7467F0" : "2px solid transparent",
            }}>
            {t === "agenda" ? "📅 Agenda" : `📥 Drafts${drafts.length > 0 ? ` (${drafts.length})` : ""}`}
          </button>
        ))}
      </div>

      {tab === "agenda" ? (
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
          {Object.keys(grouped).length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8">
              <CalendarDays size={28} style={{ color: "var(--fb-border)" }} />
              <p className="text-xs text-center" style={{ color: "var(--fb-text-muted)" }}>No upcoming events</p>
            </div>
          ) : (
            Object.entries(grouped).map(([date, dayTasks]) => {
              const d = new Date(date + "T00:00:00");
              const isToday = date === today;
              return (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold" style={{ color: isToday ? "#7467F0" : "var(--fb-text-muted)" }}>
                      {isToday ? "Today" : `${DAYS_SHORT[d.getDay()]}, ${MONTHS[d.getMonth()].slice(0,3)} ${d.getDate()}`}
                    </span>
                    <div className="flex-1 h-px" style={{ background: "var(--fb-border)" }} />
                  </div>
                  <div className="flex flex-col gap-1">
                    {dayTasks.map(t => {
                      const cat = getCat(t.category);
                      return (
                        <div key={t.id} onClick={() => onTaskClick(t)}
                          className="flex items-start gap-2 p-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ background: cat.bg, borderLeft: `3px solid ${cat.color}` }}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              {t.priority === "high" && <AlertCircle size={9} color="#F43F5E" />}
                              <span className="text-xs font-medium truncate" style={{ color: cat.color }}>{t.title}</span>
                            </div>
                            {t.startTime && (
                              <span className="text-xs opacity-60" style={{ color: cat.color }}>{formatTime(t.startTime)}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="px-3 pt-2 pb-1">
            <p className="text-xs leading-relaxed" style={{ color: "var(--fb-text-muted)" }}>
              Drag onto a calendar day to schedule.
            </p>
          </div>
          <div className="flex-1 px-3 pb-3 flex flex-col gap-2">
            {drafts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8">
                <Inbox size={28} style={{ color: "var(--fb-border)" }} />
                <p className="text-xs text-center" style={{ color: "var(--fb-text-muted)" }}>No drafts yet</p>
              </div>
            ) : (
              drafts.map((draft) => (
                <div key={draft.id} draggable onDragStart={() => onDragDraftStart(draft)}
                  className="flex flex-col gap-1 rounded-xl p-2.5 cursor-grab transition-all"
                  style={{ background: getCat(draft.category).bg, border: `1px solid ${getCat(draft.category).color}22` }}>
                  <div className="flex items-center gap-1.5">
                    <GripVertical size={12} style={{ color: getCat(draft.category).color }} className="shrink-0 opacity-50" />
                    <span className="text-xs font-medium flex-1 truncate" style={{ color: getCat(draft.category).color }}>{draft.title}</span>
                    <button onClick={() => onRemoveDraft(draft.id)} className="shrink-0 opacity-40 hover:opacity-100 transition-opacity">
                      <Trash2 size={10} style={{ color: getCat(draft.category).color }} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 pl-5">
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: getCat(draft.category).color + "22", color: getCat(draft.category).color }}>
                      {getCat(draft.category).label}
                    </span>
                    {draft.priority === "high" && (
                      <span className="text-xs" style={{ color: "#F43F5E" }}>· High</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="px-3 pb-3 shrink-0">
            <button onClick={onAddDraft}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ background: "#EEF0FF", color: "#7467F0", border: "1px dashed #7467F090" }}>
              <Plus size={12} /> Add Draft
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Calendar Page ───────────────────────────────────────────────────────

export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [drafts, setDrafts] = useState<DraftTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDate, setDialogDate] = useState<string | undefined>();
  const [dialogTime, setDialogTime] = useState<string | undefined>();
  const [dialogAsDraft, setDialogAsDraft] = useState(false);
  const [editingTask, setEditingTask] = useState<CalendarTask | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const draggedTaskRef = useRef<CalendarTask | null>(null);
  const draggedDraftRef = useRef<DraftTask | null>(null);

  useEffect(() => {
    api.get<Array<CalendarTask & { isDraft?: boolean; startTime?: string | null; endTime?: string | null; priority?: string }>>("/calendar")
      .then(data => {
        setTasks(data.filter(e => !e.isDraft).map(e => ({
          ...e, priority: (e.priority as Priority) ?? "normal",
          startTime: e.startTime ?? null, endTime: e.endTime ?? null,
        })));
        setDrafts(data.filter(e => e.isDraft).map(e => ({
          id: e.id, title: e.title, category: e.category, type: e.type, priority: (e.priority as Priority) ?? "normal", notes: e.notes,
        })));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const navigate = (dir: 1 | -1) => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (view === "month") d.setMonth(d.getMonth() + dir);
      else if (view === "week") d.setDate(d.getDate() + dir * 7);
      else d.setDate(d.getDate() + dir);
      return d;
    });
  };

  const goToday = () => setCurrentDate(new Date());

  const headerLabel = (() => {
    if (view === "month") return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (view === "day") return `${DAYS_SHORT[currentDate.getDay()]}, ${MONTHS[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start); end.setDate(end.getDate() + 6);
    if (start.getMonth() === end.getMonth()) return `${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
    return `${MONTHS[start.getMonth()].slice(0,3)} – ${MONTHS[end.getMonth()].slice(0,3)} ${end.getFullYear()}`;
  })();

  const openAddTask = (date?: string, asDraft = false, time?: string) => {
    setEditingTask(null);
    setDialogDate(date);
    setDialogTime(time);
    setDialogAsDraft(asDraft);
    setDialogOpen(true);
  };

  const handleTaskClick = useCallback((task: CalendarTask) => {
    setEditingTask(task);
    setDialogAsDraft(false);
    setDialogOpen(true);
  }, []);

  const handleUpdateTask = useCallback(async (updated: CalendarTask) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setEditingTask(null);
    try { await api.put(`/calendar/${updated.id}`, { ...updated, isDraft: false }); } catch (e) { console.error(e); }
  }, []);

  const handleDeleteTask = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    setEditingTask(null);
    try { await api.delete(`/calendar/${id}`); } catch (e) { console.error(e); }
  }, []);

  const handleSave = useCallback(async (task: CalendarTask | DraftTask, saveToDraft: boolean) => {
    if (saveToDraft) {
      const { id, title, category, type, priority, notes } = task as DraftTask;
      setDrafts((prev) => [...prev, { id, title, category, type, priority, notes }]);
      try { await api.post("/calendar", { id, title, category, type, priority, notes, date: "", isDraft: true }); } catch (e) { console.error(e); }
    } else {
      setTasks((prev) => [...prev, task as CalendarTask]);
      try { await api.post("/calendar", { ...(task as CalendarTask), isDraft: false }); } catch (e) { console.error(e); }
    }
  }, []);

  const handleDragTaskStart = (task: CalendarTask) => {
    draggedTaskRef.current = task; draggedDraftRef.current = null;
  };

  const handleDragDraftStart = (draft: DraftTask) => {
    draggedDraftRef.current = draft; draggedTaskRef.current = null;
  };

  const handleDropOnDate = async (date: string) => {
    if (draggedTaskRef.current) {
      const moved = draggedTaskRef.current;
      if (moved.date === date) { draggedTaskRef.current = null; return; }
      setTasks((prev) => prev.map((t) => (t.id === moved.id ? { ...t, date } : t)));
      draggedTaskRef.current = null;
      try { await api.put(`/calendar/${moved.id}`, { ...moved, date, isDraft: false }); } catch (e) { console.error(e); }
    }
    if (draggedDraftRef.current) {
      const draft = draggedDraftRef.current;
      const scheduled: CalendarTask = { id: draft.id, title: draft.title, date, category: draft.category, type: draft.type, priority: draft.priority, notes: draft.notes, startTime: null, endTime: null };
      setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
      setTasks((prev) => [...prev, scheduled]);
      draggedDraftRef.current = null;
      try { await api.put(`/calendar/${draft.id}`, { ...scheduled, isDraft: false }); } catch (e) { console.error(e); }
    }
  };

  const handleRemoveTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try { await api.delete(`/calendar/${id}`); } catch (e) { console.error(e); }
  };

  const handleRemoveDraft = async (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    try { await api.delete(`/calendar/${id}`); } catch (e) { console.error(e); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--fb-bg)" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: "1px solid var(--fb-border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#FEF6DC" }}>
            <CalendarDays size={18} color="#F59E0B" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--fb-text)" }}>Calendar</h1>
            <p className="text-xs" style={{ color: "var(--fb-text-muted)" }}>Plan your tasks and events</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
            style={{ background: "var(--fb-surface)", border: "1px solid var(--fb-border)", color: "var(--fb-text-muted)" }}>
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold min-w-52 text-center" style={{ color: "var(--fb-text)" }}>
            {headerLabel}
          </span>
          <button onClick={() => navigate(1)}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
            style={{ background: "var(--fb-surface)", border: "1px solid var(--fb-border)", color: "var(--fb-text-muted)" }}>
            <ChevronRight size={16} />
          </button>
          <button onClick={goToday}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: "var(--fb-muted)", color: "var(--fb-text-muted)", border: "1px solid var(--fb-border)" }}>
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex p-1 rounded-xl gap-1" style={{ background: "var(--fb-muted)", border: "1px solid var(--fb-border)" }}>
            {([
              { id: "month", icon: <Calendar size={12} />, label: "Month" },
              { id: "week",  icon: <List size={12} />,     label: "Week" },
              { id: "day",   icon: <Clock size={12} />,    label: "Day" },
            ] as const).map((v) => (
              <button key={v.id} onClick={() => setView(v.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                style={{
                  background: view === v.id ? "var(--fb-surface)" : "transparent",
                  color: view === v.id ? "#7467F0" : "var(--fb-text-muted)",
                  boxShadow: view === v.id ? "var(--fb-shadow-sm)" : "none",
                }}>
                {v.icon}{v.label}
              </button>
            ))}
          </div>
          <button onClick={() => openAddTask(toKey(currentDate))}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:scale-105"
            style={{ background: "#7467F0" }}>
            <Plus size={13} /> Add Event
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex gap-4 p-5 min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {view === "month" ? (
            <MonthView currentDate={currentDate} tasks={tasks}
              onDayClick={(date) => { setCurrentDate(new Date(date + "T00:00:00")); setView("day"); }}
              onDropOnDate={handleDropOnDate} onRemoveTask={handleRemoveTask}
              onDragTaskStart={handleDragTaskStart} onTaskClick={handleTaskClick}
              dragOverDate={dragOverDate} setDragOverDate={setDragOverDate}
            />
          ) : view === "week" ? (
            <WeekView currentDate={currentDate} tasks={tasks}
              onDayClick={(date) => openAddTask(date)}
              onDropOnDate={handleDropOnDate} onRemoveTask={handleRemoveTask}
              onDragTaskStart={handleDragTaskStart} onTaskClick={handleTaskClick}
              dragOverDate={dragOverDate} setDragOverDate={setDragOverDate}
            />
          ) : (
            <DayView currentDate={currentDate} tasks={tasks}
              onTimeSlotClick={(date, time) => openAddTask(date, false, time)}
              onTaskClick={handleTaskClick} onRemoveTask={handleRemoveTask}
            />
          )}
        </div>

        <SidePanel tasks={tasks} drafts={drafts} currentDate={currentDate}
          onAddDraft={() => openAddTask(undefined, true)}
          onRemoveDraft={handleRemoveDraft} onDragDraftStart={handleDragDraftStart}
          onTaskClick={handleTaskClick}
        />
      </div>

      <TaskDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingTask(null); }}
        initialDate={dialogDate}
        initialTime={dialogTime}
        onSave={handleSave}
        asDraft={dialogAsDraft}
        editTask={editingTask}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
      />
    </div>
  );
}
