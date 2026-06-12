import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  KanbanSquare, Plus, X, Trash2, Edit2,
  CalendarDays, FileText, Flag,
  MoreHorizontal, MessageCircle, Users,
} from "lucide-react";
import { api } from "../../../lib/api";
import { RoomProvider, useThreads } from "../../../lib/liveblocks";
import CollaboratorAvatars from "../../../components/kanban/CollaboratorAvatars";
import CollaborationPanel from "../../../components/kanban/CollaborationPanel";
import TaskComments from "../../../components/kanban/TaskComments";

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = "low" | "medium" | "high";

interface KanbanTask {
  id: string; boardId: string; columnId: string;
  title: string; description: string; dueDate: string;
  priority: Priority; labels: string[];
  syncCalendar: boolean; syncNotes: boolean;
}
interface KanbanColumn { id: string; boardId: string; name: string; order: number }
interface KanbanBoard { id: string; name: string; color: string; columnOrder: string[] }

// ─── Constants ────────────────────────────────────────────────────────────────

const BOARD_COLORS = [
  "#7467F0","#06B6D4","#10B981","#F59E0B",
  "#F43F5E","#4F46E5","#A855F7","#0EA5E9",
  "#EC4899","#14B8A6",
];

const PRIORITY_CFG: Record<Priority, { label: string; color: string; bg: string }> = {
  low:    { label: "Low",    color: "#10B981", bg: "#DCFCEC" },
  medium: { label: "Medium", color: "#F59E0B", bg: "#FEF6DC" },
  high:   { label: "High",   color: "#F43F5E", bg: "#FFE4EA" },
};

const LABELS = [
  { id: "bug",     name: "Bug",     color: "#F43F5E" },
  { id: "feature", name: "Feature", color: "#7467F0" },
  { id: "design",  name: "Design",  color: "#A855F7" },
  { id: "urgent",  name: "Urgent",  color: "#F59E0B" },
  { id: "review",  name: "Review",  color: "#06B6D4" },
  { id: "backend", name: "Backend", color: "#10B981" },
];

const DEFAULT_COLS = ["Todo", "In Progress", "Done"];
const MAX_COLS = 5;

function uid() { return Math.random().toString(36).slice(2, 10); }
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function fmtDate(s: string) {
  if (!s) return "";
  const d = new Date(s + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function loadLS<T>(key: string, fb: T): T {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fb; }
  catch { return fb; }
}

// ─── Calendar sync helper ─────────────────────────────────────────────────────

function syncToCalendar(task: KanbanTask, remove = false) {
  try {
    const key = "fb_cal_tasks";
    const calId = `kb_${task.id}`;
    const existing: any[] = loadLS(key, []);
    const filtered = existing.filter((t: any) => t.id !== calId);
    if (!remove && task.syncCalendar && task.dueDate) {
      filtered.push({ id: calId, title: task.title, date: task.dueDate, category: "work", type: "task", notes: task.description });
    }
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch {}
}

// ─── Board Dialog ─────────────────────────────────────────────────────────────

function BoardDialog({ open, onClose, onSave, editBoard }: {
  open: boolean; onClose: () => void;
  onSave: (name: string, color: string) => void;
  editBoard?: KanbanBoard | null;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(BOARD_COLORS[0]);
  useEffect(() => {
    if (open) { setName(editBoard?.name ?? ""); setColor(editBoard?.color ?? BOARD_COLORS[0]); }
  }, [open, editBoard]);
  if (!open) return null;
  const submit = () => { if (name.trim()) { onSave(name.trim(), color); onClose(); } };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5 shadow-2xl"
        style={{ background: "var(--fb-surface)", border: "1px solid var(--fb-border)" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: "var(--fb-text)" }}>
            {editBoard ? "Edit Board" : "New Board"}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100">
            <X size={14} style={{ color: "var(--fb-text-muted)" }} />
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--fb-text-muted)" }}>Board Name *</label>
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="e.g. Product Roadmap"
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: "var(--fb-muted)", border: "1px solid var(--fb-border)", color: "var(--fb-text)" }} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium" style={{ color: "var(--fb-text-muted)" }}>Board Color</label>
          <div className="flex gap-2 flex-wrap">
            {BOARD_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full transition-all"
                style={{ background: c, outline: color === c ? `3px solid ${c}` : "none", outlineOffset: "2px", transform: color === c ? "scale(1.15)" : "scale(1)" }} />
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-medium"
            style={{ background: "var(--fb-muted)", color: "var(--fb-text-muted)", border: "1px solid var(--fb-border)" }}>
            Cancel
          </button>
          <button onClick={submit} disabled={!name.trim()}
            className="flex-1 py-2 rounded-xl text-sm font-medium text-white"
            style={{ background: name.trim() ? color : "var(--fb-border)", cursor: name.trim() ? "pointer" : "not-allowed" }}>
            {editBoard ? "Save Changes" : "Create Board"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Task Dialog ──────────────────────────────────────────────────────────────

function TaskDialog({ open, onClose, columnId, boardId, editTask, onSave, onDelete }: {
  open: boolean; onClose: () => void; columnId: string; boardId: string;
  editTask?: KanbanTask | null;
  onSave: (task: KanbanTask) => void; onDelete?: (id: string) => void;
}) {
  const isEdit = !!editTask;
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [due, setDue] = useState(todayStr());
  const [priority, setPriority] = useState<Priority>("medium");
  const [lbls, setLbls] = useState<string[]>([]);
  const [syncCal, setSyncCal] = useState(false);
  const [syncNote, setSyncNote] = useState(false);

  useEffect(() => {
    if (open) {
      if (editTask) {
        setTitle(editTask.title); setDesc(editTask.description);
        setDue(editTask.dueDate || todayStr()); setPriority(editTask.priority);
        setLbls(editTask.labels); setSyncCal(editTask.syncCalendar); setSyncNote(editTask.syncNotes);
      } else {
        setTitle(""); setDesc(""); setDue(todayStr());
        setPriority("medium"); setLbls([]); setSyncCal(false); setSyncNote(false);
      }
    }
  }, [open, editTask]);

  if (!open) return null;

  const toggleLabel = (id: string) => setLbls(p => p.includes(id) ? p.filter(l => l !== id) : [...p, id]);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ id: editTask?.id ?? uid(), boardId, columnId, title: title.trim(), description: desc, dueDate: due, priority, labels: lbls, syncCalendar: syncCal, syncNotes: syncNote });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4 shadow-2xl"
        style={{ background: "var(--fb-surface)", border: "1px solid var(--fb-border)", maxHeight: "90vh", overflowY: "auto" }}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: "var(--fb-text)" }}>
            {isEdit ? "Edit Task" : "New Task"}
          </h2>
          <div className="flex items-center gap-1.5">
            {isEdit && onDelete && (
              <button onClick={() => { onDelete(editTask!.id); onClose(); }}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-50">
                <Trash2 size={13} color="#F43F5E" />
              </button>
            )}
            <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100">
              <X size={14} style={{ color: "var(--fb-text-muted)" }} />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--fb-text-muted)" }}>Title *</label>
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSave()}
            placeholder="What needs to be done?"
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: "var(--fb-muted)", border: "1px solid var(--fb-border)", color: "var(--fb-text)" }} />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--fb-text-muted)" }}>
            Description <span className="opacity-50">(optional)</span>
          </label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Add more details…" rows={2}
            className="px-3 py-2 rounded-lg text-sm outline-none resize-none"
            style={{ background: "var(--fb-muted)", border: "1px solid var(--fb-border)", color: "var(--fb-text)" }} />
        </div>

        {/* Due + Priority */}
        <div className="flex gap-3">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-xs font-medium" style={{ color: "var(--fb-text-muted)" }}>Due Date</label>
            <input type="date" value={due} onChange={e => setDue(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--fb-muted)", border: "1px solid var(--fb-border)", color: "var(--fb-text)" }} />
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-xs font-medium" style={{ color: "var(--fb-text-muted)" }}>Priority</label>
            <div className="flex gap-1">
              {(["low","medium","high"] as Priority[]).map(p => {
                const cfg = PRIORITY_CFG[p];
                return (
                  <button key={p} onClick={() => setPriority(p)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                    style={{ background: priority===p ? cfg.color : cfg.bg, color: priority===p ? "#fff" : cfg.color, border: `1px solid ${cfg.color}55` }}>
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Labels */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--fb-text-muted)" }}>Labels</label>
          <div className="flex gap-1.5 flex-wrap">
            {LABELS.map(lbl => {
              const active = lbls.includes(lbl.id);
              return (
                <button key={lbl.id} onClick={() => toggleLabel(lbl.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                  style={{ background: active ? lbl.color : lbl.color+"18", color: active ? "#fff" : lbl.color, border: `1px solid ${lbl.color}44` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? "#fff" : lbl.color }} />
                  {lbl.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sync toggles */}
        <div className="flex flex-col gap-2.5 pt-1" style={{ borderTop: "1px solid var(--fb-border)" }}>
          <p className="text-xs font-semibold" style={{ color: "var(--fb-text-muted)" }}>Sync & Link</p>
          {([
            { label: "Sync with Calendar", icon: <CalendarDays size={13}/>, color: "#F59E0B", val: syncCal, set: setSyncCal },
            { label: "Link with Notes",    icon: <FileText size={13}/>,     color: "#06B6D4", val: syncNote, set: setSyncNote },
          ] as const).map(({ label, icon, color, val, set }) => (
            <label key={label} className="flex items-center gap-3 cursor-pointer select-none">
              <div onClick={() => set(!val)}
                className="w-9 h-5 rounded-full transition-all relative shrink-0"
                style={{ background: val ? color : "var(--fb-border)" }}>
                <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                  style={{ left: val ? "18px" : "2px" }} />
              </div>
              <div className="flex items-center gap-1.5" style={{ color: val ? color : "var(--fb-text-muted)" }}>
                {icon} <span className="text-xs">{label}</span>
              </div>
            </label>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-medium"
            style={{ background: "var(--fb-muted)", color: "var(--fb-text-muted)", border: "1px solid var(--fb-border)" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={!title.trim()}
            className="flex-1 py-2 rounded-xl text-sm font-medium text-white"
            style={{ background: title.trim() ? "#7467F0" : "var(--fb-border)", cursor: title.trim() ? "pointer" : "not-allowed" }}>
            {isEdit ? "Save Changes" : "Add Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function CommentBadge({ taskId }: { taskId: string }) {
  const { threads } = useThreads({ query: { metadata: { taskId, resolved: false } } });
  const count = threads?.reduce((sum, t) => sum + t.comments.length, 0) ?? 0;
  if (count === 0) return null;
  return (
    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
      style={{ background: "#7467F0" }}>
      {count > 9 ? "9+" : count}
    </span>
  );
}

function TaskCard({ task, onEdit, onDelete, onDragStart, onComment }: {
  task: KanbanTask; onEdit: () => void; onDelete: () => void; onDragStart: () => void; onComment: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const pCfg = PRIORITY_CFG[task.priority];
  const taskLabels = LABELS.filter(l => task.labels.includes(l.id));
  const overdue = task.dueDate && task.dueDate < todayStr();

  return (
    <div draggable onDragStart={e => { e.stopPropagation(); onDragStart(); }}
      className="group relative rounded-xl p-3 flex flex-col gap-2 cursor-grab active:cursor-grabbing transition-all hover:shadow-md"
      style={{ background: "var(--fb-surface)", border: "1px solid var(--fb-border)", boxShadow: "var(--fb-shadow-sm)" }}>

      {/* Menu button */}
      <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="relative">
          <button onClick={e => { e.stopPropagation(); setMenu(m => !m); }}
            className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-gray-100"
            style={{ color: "var(--fb-text-muted)" }}>
            <MoreHorizontal size={13} />
          </button>
          {menu && (
            <div className="absolute right-0 top-7 rounded-xl overflow-hidden shadow-lg py-1 min-w-28"
              style={{ background: "var(--fb-surface)", border: "1px solid var(--fb-border)", zIndex: 30 }}
              onMouseLeave={() => setMenu(false)}>
              <button onClick={e => { e.stopPropagation(); setMenu(false); onEdit(); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50"
                style={{ color: "var(--fb-text)" }}>
                <Edit2 size={11} /> Edit
              </button>
              <button onClick={e => { e.stopPropagation(); setMenu(false); onDelete(); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-red-50"
                style={{ color: "#F43F5E" }}>
                <Trash2 size={11} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Labels */}
      {taskLabels.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {taskLabels.map(l => (
            <span key={l.id} className="px-1.5 py-0.5 rounded-full text-xs font-medium"
              style={{ background: l.color+"20", color: l.color }}>
              {l.name}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-medium leading-snug pr-5" style={{ color: "var(--fb-text)" }}>
        {task.title}
      </p>

      {/* Description */}
      {task.description && (
        <p className="text-xs leading-relaxed" style={{ color: "var(--fb-text-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {task.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium"
          style={{ background: pCfg.bg, color: pCfg.color }}>
          <Flag size={9} /> {pCfg.label}
        </span>
        {task.dueDate && (
          <span className="flex items-center gap-1 text-xs font-medium"
            style={{ color: overdue ? "#F43F5E" : "var(--fb-text-muted)" }}>
            <CalendarDays size={10} /> {fmtDate(task.dueDate)}
          </span>
        )}
        <div className="flex gap-1 ml-auto">
          {task.syncCalendar && (
            <span title="Synced to Calendar" className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#FEF6DC" }}>
              <CalendarDays size={10} color="#F59E0B" />
            </span>
          )}
          {task.syncNotes && (
            <span title="Linked to Notes" className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#E0F9FF" }}>
              <FileText size={10} color="#06B6D4" />
            </span>
          )}
          <button
            onClick={e => { e.stopPropagation(); onComment(); }}
            className="relative w-5 h-5 rounded-full flex items-center justify-center hover:bg-purple-50 transition-colors"
            style={{ background: "#EEF0FF" }}
            title="Comments"
          >
            <MessageCircle size={10} color="#7467F0" />
            <CommentBadge taskId={task.id} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Column View ──────────────────────────────────────────────────────────────

function ColumnView({ col, tasks, board, onAddTask, onEditTask, onDeleteTask,
  onDragTaskStart, onDropOnColumn, onDeleteColumn, onRenameColumn, onCommentTask, isDragOver, setDragOver }: {
  col: KanbanColumn; tasks: KanbanTask[]; board: KanbanBoard;
  onAddTask: () => void; onEditTask: (t: KanbanTask) => void; onDeleteTask: (id: string) => void;
  onDragTaskStart: (id: string) => void; onDropOnColumn: (colId: string) => void;
  onDeleteColumn: () => void; onRenameColumn: (name: string) => void; onCommentTask: (t: KanbanTask) => void;
  isDragOver: boolean; setDragOver: (v: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(col.name);
  const [menu, setMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const commitRename = () => {
    if (editName.trim()) onRenameColumn(editName.trim());
    else setEditName(col.name);
    setEditing(false);
  };

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  return (
    <div className="flex flex-col rounded-2xl shrink-0 transition-all"
      style={{
        width: "272px",
        background: isDragOver ? "#EEF0FF" : "var(--fb-muted)",
        border: isDragOver ? "2px dashed #7467F0" : "1px solid var(--fb-border)",
      }}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); onDropOnColumn(col.id); }}>

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 shrink-0">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: board.color }} />
        {editing ? (
          <input ref={inputRef} value={editName} onChange={e => setEditName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") { setEditName(col.name); setEditing(false); } }}
            className="flex-1 text-sm font-semibold outline-none bg-transparent border-b"
            style={{ color: "var(--fb-text)", borderColor: board.color }} />
        ) : (
          <span className="flex-1 text-sm font-semibold truncate" style={{ color: "var(--fb-text)" }}>{col.name}</span>
        )}
        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0"
          style={{ background: board.color+"22", color: board.color }}>
          {tasks.length}
        </span>
        <div className="relative shrink-0">
          <button onClick={() => setMenu(m => !m)}
            className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/60"
            style={{ color: "var(--fb-text-muted)" }}>
            <MoreHorizontal size={13} />
          </button>
          {menu && (
            <div className="absolute right-0 top-7 rounded-xl overflow-hidden shadow-lg py-1 min-w-28"
              style={{ background: "var(--fb-surface)", border: "1px solid var(--fb-border)", zIndex: 20 }}
              onMouseLeave={() => setMenu(false)}>
              <button onClick={() => { setMenu(false); setEditing(true); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50"
                style={{ color: "var(--fb-text)" }}>
                <Edit2 size={11} /> Rename
              </button>
              <button onClick={() => { setMenu(false); onDeleteColumn(); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-red-50"
                style={{ color: "#F43F5E" }}>
                <Trash2 size={11} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-3 pb-2 flex flex-col gap-2"
        style={{ minHeight: "100px", maxHeight: "calc(100vh - 260px)" }}>
        {tasks.map(t => (
          <TaskCard key={t.id} task={t}
            onEdit={() => onEditTask(t)}
            onDelete={() => onDeleteTask(t.id)}
            onDragStart={() => onDragTaskStart(t.id)}
            onComment={() => onCommentTask(t)} />
        ))}
        {tasks.length === 0 && !isDragOver && (
          <div className="flex-1 flex items-center justify-center py-8">
            <p className="text-xs text-center leading-relaxed" style={{ color: "var(--fb-text-muted)" }}>
              No tasks yet<br/>Drop or add one below
            </p>
          </div>
        )}
      </div>

      {/* Add Task */}
      <button onClick={onAddTask}
        className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors hover:bg-white/50 shrink-0"
        style={{ color: "var(--fb-text-muted)", borderTop: "1px solid var(--fb-border)" }}>
        <Plus size={13} /> Add Task
      </button>
    </div>
  );
}

// ─── Board Panel (left sidebar) ───────────────────────────────────────────────

function BoardPanel({ boards, activeBoardId, onSelectBoard, onCreateBoard, onDeleteBoard, onEditBoard }: {
  boards: KanbanBoard[]; activeBoardId: string | null;
  onSelectBoard: (id: string) => void; onCreateBoard: () => void;
  onDeleteBoard: (id: string) => void; onEditBoard: (b: KanbanBoard) => void;
}) {
  return (
    <div className="w-56 shrink-0 flex flex-col rounded-2xl overflow-hidden"
      style={{ background: "var(--fb-surface)", border: "1px solid var(--fb-border)" }}>
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--fb-border)" }}>
        <span className="text-sm font-semibold" style={{ color: "var(--fb-text)" }}>My Boards</span>
        <button onClick={onCreateBoard}
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: "#EEF0FF", color: "#7467F0" }}>
          <Plus size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-0.5 px-2">
        {boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 px-3">
            <KanbanSquare size={24} style={{ color: "var(--fb-border)" }} />
            <p className="text-xs text-center" style={{ color: "var(--fb-text-muted)" }}>
              No boards yet.<br />Create your first.
            </p>
          </div>
        ) : boards.map(b => {
          const isActive = b.id === activeBoardId;
          return (
            <div key={b.id}
              className="group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
              style={{
                background: isActive ? b.color+"18" : "transparent",
                border: isActive ? `1px solid ${b.color}44` : "1px solid transparent",
              }}
              onClick={() => onSelectBoard(b.id)}>
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: b.color }} />
              <span className="flex-1 text-xs font-medium truncate"
                style={{ color: isActive ? b.color : "var(--fb-text)" }}>
                {b.name}
              </span>
              <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
                <button onClick={e => { e.stopPropagation(); onEditBoard(b); }}
                  className="w-5 h-5 rounded flex items-center justify-center hover:bg-white"
                  style={{ color: "var(--fb-text-muted)" }}>
                  <Edit2 size={9} />
                </button>
                <button onClick={e => { e.stopPropagation(); onDeleteBoard(b.id); }}
                  className="w-5 h-5 rounded flex items-center justify-center hover:bg-red-50"
                  style={{ color: "#F43F5E" }}>
                  <Trash2 size={9} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={onCreateBoard}
        className="flex items-center gap-2 px-4 py-3 text-xs font-medium hover:bg-gray-50 transition-colors shrink-0"
        style={{ color: "#7467F0", borderTop: "1px solid var(--fb-border)" }}>
        <Plus size={13} /> New Board
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function KanbanInner() {
  const [boards, setBoards] = useState<KanbanBoard[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [boardDlg, setBoardDlg] = useState<{ open: boolean; edit?: KanbanBoard | null }>({ open: false });
  const [taskDlg, setTaskDlg] = useState<{ open: boolean; columnId: string; edit?: KanbanTask | null }>({ open: false, columnId: "" });
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [collab, setCollab] = useState(false);
  const [commentTask, setCommentTask] = useState<KanbanTask | null>(null);

  useEffect(() => {
    api.get<{ boards: KanbanBoard[]; columns: KanbanColumn[]; tasks: KanbanTask[] }>("/kanban/boards")
      .then(data => {
        setBoards(data.boards);
        setColumns(data.columns);
        setTasks(data.tasks);
        setActiveBoardId(prev => {
          const saved = localStorage.getItem("fb_kb_active");
          const savedId = saved ? JSON.parse(saved) : null;
          if (savedId && data.boards.find((b: KanbanBoard) => b.id === savedId)) return savedId;
          return data.boards[0]?.id ?? null;
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeBoardId) localStorage.setItem("fb_kb_active", JSON.stringify(activeBoardId));
  }, [activeBoardId]);

  const activeBoard = boards.find(b => b.id === activeBoardId) ?? null;
  const activeCols = activeBoard
    ? (activeBoard.columnOrder.map(id => columns.find(c => c.id === id)).filter(Boolean) as KanbanColumn[])
    : [];

  // ── Board CRUD ────────────────────────────────────────────────────────────

  const createBoard = useCallback(async (name: string, color: string) => {
    const boardId = uid();
    const newCols: KanbanColumn[] = DEFAULT_COLS.map((n, i) => ({ id: uid(), boardId, name: n, order: i }));
    const board: KanbanBoard = { id: boardId, name, color, columnOrder: newCols.map(c => c.id) };
    setBoards(p => [...p, board]);
    setColumns(p => [...p, ...newCols]);
    setActiveBoardId(boardId);
    try {
      await api.post("/kanban/boards", board);
      await Promise.all(newCols.map(col => api.post("/kanban/columns", col)));
    } catch (e) { console.error(e); }
  }, []);

  const updateBoard = useCallback(async (name: string, color: string) => {
    if (!boardDlg.edit) return;
    const id = boardDlg.edit.id;
    const existing = boards.find(b => b.id === id);
    setBoards(p => p.map(b => b.id === id ? { ...b, name, color } : b));
    try { await api.put(`/kanban/boards/${id}`, { name, color, columnOrder: existing?.columnOrder }); } catch (e) { console.error(e); }
  }, [boardDlg.edit, boards]);

  const deleteBoard = useCallback(async (id: string) => {
    setBoards(p => {
      const remaining = p.filter(b => b.id !== id);
      setActiveBoardId(prev => prev === id ? (remaining[0]?.id ?? null) : prev);
      return remaining;
    });
    setColumns(p => p.filter(c => c.boardId !== id));
    setTasks(p => p.filter(t => t.boardId !== id));
    try { await api.delete(`/kanban/boards/${id}`); } catch (e) { console.error(e); }
  }, []);

  // ── Column CRUD ───────────────────────────────────────────────────────────

  const addColumn = useCallback(async () => {
    if (!activeBoard || activeBoard.columnOrder.length >= MAX_COLS) return;
    const col: KanbanColumn = { id: uid(), boardId: activeBoard.id, name: "New Column", order: activeBoard.columnOrder.length };
    const newOrder = [...activeBoard.columnOrder, col.id];
    setColumns(p => [...p, col]);
    setBoards(p => p.map(b => b.id === activeBoard.id ? { ...b, columnOrder: newOrder } : b));
    try {
      await api.post("/kanban/columns", col);
      await api.put(`/kanban/boards/${activeBoard.id}`, { name: activeBoard.name, color: activeBoard.color, columnOrder: newOrder });
    } catch (e) { console.error(e); }
  }, [activeBoard]);

  const deleteColumn = useCallback(async (colId: string) => {
    if (!activeBoard) return;
    const newOrder = activeBoard.columnOrder.filter(id => id !== colId);
    setTasks(p => p.filter(t => t.columnId !== colId));
    setColumns(p => p.filter(c => c.id !== colId));
    setBoards(p => p.map(b => b.id === activeBoard.id ? { ...b, columnOrder: newOrder } : b));
    try {
      await api.delete(`/kanban/columns/${colId}`);
      await api.put(`/kanban/boards/${activeBoard.id}`, { name: activeBoard.name, color: activeBoard.color, columnOrder: newOrder });
    } catch (e) { console.error(e); }
  }, [activeBoard]);

  const renameColumn = useCallback(async (colId: string, name: string) => {
    setColumns(p => p.map(c => c.id === colId ? { ...c, name } : c));
    try { await api.put(`/kanban/columns/${colId}`, { name }); } catch (e) { console.error(e); }
  }, []);

  // ── Task CRUD ─────────────────────────────────────────────────────────────

  const saveTask = useCallback(async (task: KanbanTask) => {
    const exists = tasks.find(t => t.id === task.id);
    setTasks(p => exists ? p.map(t => t.id === task.id ? task : t) : [...p, task]);
    try {
      if (exists) await api.put(`/kanban/tasks/${task.id}`, task);
      else await api.post("/kanban/tasks", task);
    } catch (e) { console.error(e); }
  }, [tasks]);

  const deleteTask = useCallback(async (id: string) => {
    setTasks(p => p.filter(t => t.id !== id));
    try { await api.delete(`/kanban/tasks/${id}`); } catch (e) { console.error(e); }
  }, []);

  // ── Drag & Drop ───────────────────────────────────────────────────────────

  const handleDrop = useCallback(async (targetColId: string) => {
    if (!draggedId) return;
    const task = tasks.find(t => t.id === draggedId);
    setTasks(p => p.map(t => t.id === draggedId ? { ...t, columnId: targetColId } : t));
    setDraggedId(null); setDragOverCol(null);
    if (task && task.columnId !== targetColId) {
      try { await api.put(`/kanban/tasks/${draggedId}`, { ...task, columnId: targetColId }); } catch (e) { console.error(e); }
    }
  }, [draggedId, tasks]);

  if (loading) return (
    <div className="flex items-center justify-center h-full" style={{ background: "var(--fb-bg)" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "#7467F022", borderTopColor: "#7467F0" }} />
        <p className="text-sm" style={{ color: "var(--fb-text-muted)" }}>Loading boards…</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--fb-bg)" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--fb-border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#DCFCEC" }}>
            <KanbanSquare size={18} color="#10B981" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--fb-text)" }}>Task Board</h1>
            <p className="text-xs" style={{ color: "var(--fb-text-muted)" }}>
              {activeBoard ? activeBoard.name : "Select or create a board to begin"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Live collaborator avatars */}
          <CollaboratorAvatars />

          {activeBoard && (
            <button onClick={() => setCollab(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105"
              style={{ background: "var(--fb-muted)", color: "var(--fb-text-muted)", border: "1px solid var(--fb-border)" }}
              title="Collaboration & sharing">
              <Users size={13} /> Share
            </button>
          )}
          {activeBoard && activeCols.length < MAX_COLS && (
            <button onClick={addColumn}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105"
              style={{ background: "var(--fb-muted)", color: "var(--fb-text-muted)", border: "1px solid var(--fb-border)" }}>
              <Plus size={13} /> Add Column
            </button>
          )}
          {activeBoard && (
            <button onClick={() => setTaskDlg({ open: true, columnId: activeCols[0]?.id ?? "" })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:scale-105"
              style={{ background: "#7467F0" }}>
              <Plus size={13} /> New Task
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex gap-4 p-5 min-h-0 overflow-hidden">
        {/* Left panel */}
        <BoardPanel
          boards={boards}
          activeBoardId={activeBoardId}
          onSelectBoard={setActiveBoardId}
          onCreateBoard={() => setBoardDlg({ open: true })}
          onDeleteBoard={deleteBoard}
          onEditBoard={b => setBoardDlg({ open: true, edit: b })}
        />

        {/* Board area */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {!activeBoard ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#DCFCEC" }}>
                  <KanbanSquare size={32} color="#10B981" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-base font-semibold mb-1" style={{ color: "var(--fb-text)" }}>No board selected</p>
                  <p className="text-xs" style={{ color: "var(--fb-text-muted)" }}>
                    Create a board from the panel on the left.
                  </p>
                </div>
                <button onClick={() => setBoardDlg({ open: true })}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "#7467F0" }}>
                  <Plus size={15} /> Create First Board
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
              <div className="flex gap-4 h-full pb-2" style={{ minWidth: "fit-content" }}>
                {activeCols.map(col => (
                  <ColumnView key={col.id} col={col}
                    tasks={tasks.filter(t => t.columnId === col.id)}
                    board={activeBoard}
                    onAddTask={() => setTaskDlg({ open: true, columnId: col.id })}
                    onEditTask={t => setTaskDlg({ open: true, columnId: col.id, edit: t })}
                    onDeleteTask={deleteTask}
                    onDragTaskStart={id => setDraggedId(id)}
                    onDropOnColumn={handleDrop}
                    onDeleteColumn={() => deleteColumn(col.id)}
                    onRenameColumn={name => renameColumn(col.id, name)}
                    onCommentTask={t => setCommentTask(t)}
                    isDragOver={dragOverCol === col.id}
                    setDragOver={v => setDragOverCol(v ? col.id : null)}
                  />
                ))}

                {/* Add column ghost */}
                {activeCols.length < MAX_COLS && (
                  <button onClick={addColumn}
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl shrink-0 transition-all hover:scale-[1.01]"
                    style={{ width: "220px", minHeight: "140px", background: "transparent", border: "2px dashed var(--fb-border)", color: "var(--fb-text-muted)" }}>
                    <Plus size={18} />
                    <span className="text-xs font-medium">Add Column</span>
                    <span className="text-xs opacity-50">{activeCols.length}/{MAX_COLS}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <BoardDialog open={boardDlg.open} onClose={() => setBoardDlg({ open: false })}
        editBoard={boardDlg.edit}
        onSave={(name, color) => boardDlg.edit ? updateBoard(name, color) : createBoard(name, color)} />
      <TaskDialog open={taskDlg.open} onClose={() => setTaskDlg({ open: false, columnId: "" })}
        columnId={taskDlg.columnId} boardId={activeBoardId ?? ""}
        editTask={taskDlg.edit} onSave={saveTask} onDelete={deleteTask} />

      {/* Collaboration panel */}
      {collab && activeBoard && (
        <CollaborationPanel
          boardId={activeBoard.id}
          boardName={activeBoard.name}
          onClose={() => setCollab(false)}
        />
      )}

      {/* Task comments panel */}
      {commentTask && (
        <TaskComments
          taskId={commentTask.id}
          taskTitle={commentTask.title}
          onClose={() => setCommentTask(null)}
        />
      )}
    </div>
  );
}

export default function KanbanPage() {
  const [activeBoardId, setActiveBoardId] = useState<string | null>(() => {
    try { const s = localStorage.getItem("fb_kb_active"); return s ? JSON.parse(s) : null; } catch { return null; }
  });

  const roomId = activeBoardId ? `grind-os-board-${activeBoardId}` : "grind-os-board-default";

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ cursor: null, name: "", color: "#7467F0", avatar: "" }}
    >
      <KanbanInner />
    </RoomProvider>
  );
}
