import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearch, useLocation } from "wouter";
import {
  Play, Pause, RotateCcw, Coffee, Brain, CheckCircle2, Plus, Trash2,
  Timer, CalendarDays, KanbanSquare, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import { api } from "../../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "focus" | "short-break" | "long-break";

interface LinkedTask {
  id: string;
  text: string;
  scheduleBlockId?: string;
  kanbanTaskId?: string;
  kanbanColumnId?: string;
}

interface SessionLog { label: string; duration: number; completedAt: string }

interface ScheduleBlock {
  id: string; label: string; type: string;
  startHour: number; startMin: number; endHour: number; endMin: number;
  completed: boolean;
}

interface KanbanTask {
  id: string; title: string; columnId: string; boardId: string;
}

interface KanbanColumn { id: string; name: string; boardId: string }
interface KanbanBoard { id: string; name: string; color: string; columnOrder: string[] }

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_FOCUS_SECS = 25 * 60;
const DEFAULT_SHORT_SECS = 5 * 60;
const DEFAULT_LONG_SECS = 15 * 60;

const MODES_DEFAULT: Record<Mode, { label: string; seconds: number; color: string; bg: string; icon: React.ReactNode }> = {
  "focus":       { label: "Deep Work",   seconds: DEFAULT_FOCUS_SECS, color: "#7c3aed", bg: "rgba(124,58,237,0.12)",  icon: <Brain size={18} /> },
  "short-break": { label: "Short Break", seconds: DEFAULT_SHORT_SECS, color: "#06b6d4", bg: "rgba(6,182,212,0.12)",   icon: <Coffee size={18} /> },
  "long-break":  { label: "Long Break",  seconds: DEFAULT_LONG_SECS,  color: "#10b981", bg: "rgba(16,185,129,0.12)", icon: <Coffee size={18} /> },
};

const QUOTES = [
  "You don't rise to the level of your goals. You fall to the level of your systems.",
  "The secret of getting ahead is getting started.",
  "Hard work beats talent when talent doesn't work hard.",
  "Do the hard things first. The rest becomes easy.",
  "One session at a time. That's all it takes.",
  "Focus is the new IQ.",
  "Discipline is choosing between what you want now and what you want most.",
  "Every deep work session compounds. Trust the process.",
];

function fmt(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function fmtTime(h: number, m: number) {
  const suffix = h < 12 ? "AM" : "PM";
  const hh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hh}:${m.toString().padStart(2, "0")} ${suffix}`;
}

function uid() { return Math.random().toString(36).slice(2, 9); }

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DeepWorkPage() {
  const search = useSearch();
  const [, navigate] = useLocation();

  // Parse URL params (handed off from Daily Schedule)
  const params = new URLSearchParams(search);
  const paramBlockId = params.get("blockId");
  const paramLabel = params.get("label");

  // Timer state
  const [modes, setModes] = useState({ ...MODES_DEFAULT });
  const [mode, setMode] = useState<Mode>("focus");
  const [timeLeft, setTimeLeft] = useState(MODES_DEFAULT["focus"].seconds);
  const [running, setRunning] = useState(false);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [log, setLog] = useState<SessionLog[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [customMinutes, setCustomMinutes] = useState("");

  // Task state
  const [tasks, setTasks] = useState<LinkedTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState<LinkedTask[]>([]);
  const [taskInput, setTaskInput] = useState("");

  // Import panels
  const [showScheduleImport, setShowScheduleImport] = useState(false);
  const [showKanbanImport, setShowKanbanImport] = useState(false);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [kanbanBoards, setKanbanBoards] = useState<KanbanBoard[]>([]);
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>([]);
  const [kanbanTasks, setKanbanTasks] = useState<KanbanTask[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingKanban, setLoadingKanban] = useState(false);

  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  const { color, bg, label, icon } = modes[mode];
  const totalSeconds = modes[mode].seconds;
  const progress = 1 - timeLeft / totalSeconds;
  const circumference = 2 * Math.PI * 88;

  // Pre-load from URL params (navigate from Daily Schedule)
  useEffect(() => {
    if (paramBlockId && paramLabel) {
      const existing = tasks.find(t => t.scheduleBlockId === paramBlockId);
      if (!existing) {
        setTasks(prev => [{
          id: uid(), text: decodeURIComponent(paramLabel), scheduleBlockId: paramBlockId,
        }, ...prev]);
      }
      // Clean URL
      navigate("/dashboard/deep-work", { replace: true });
    }
  }, []); // intentionally only on mount

  // ── Timer logic ─────────────────────────────────────────────────────────────

  const switchMode = useCallback((m: Mode) => {
    setMode(m);
    setTimeLeft(modes[m].seconds);
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [modes]);

  const complete = useCallback(() => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (mode === "focus") {
      setSessionsToday(s => s + 1);
      setLog(l => [{
        label: `Deep Work — ${fmt(modes[mode].seconds)}`,
        duration: modes[mode].seconds,
        completedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      }, ...l].slice(0, 10));
    }
    setTimeLeft(modes[mode].seconds);
  }, [mode, modes]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { complete(); return modes[mode].seconds; }
          return t - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, mode, modes, complete]);

  const reset = () => { setTimeLeft(modes[mode].seconds); setRunning(false); };

  const applyCustom = () => {
    const mins = parseInt(customMinutes);
    if (!isNaN(mins) && mins > 0 && mins <= 180) {
      setModes(prev => ({ ...prev, focus: { ...prev.focus, seconds: mins * 60, label: `Deep Work (${mins}m)` } }));
      setTimeLeft(mins * 60);
      setRunning(false);
      setMode("focus");
      setCustomMinutes("");
    }
  };

  // ── Task management ─────────────────────────────────────────────────────────

  const addTask = () => {
    if (!taskInput.trim()) return;
    setTasks(prev => [...prev, { id: uid(), text: taskInput.trim() }]);
    setTaskInput("");
  };

  const completeTask = async (task: LinkedTask) => {
    setTasks(prev => prev.filter(t => t.id !== task.id));
    setCompletedTasks(prev => [task, ...prev]);

    // Sync back to schedule block
    if (task.scheduleBlockId) {
      try { await api.patch(`/daily-schedule/${task.scheduleBlockId}`, { completed: true }); } catch {}
      setScheduleBlocks(prev => prev.map(b => b.id === task.scheduleBlockId ? { ...b, completed: true } : b));
    }

    // Sync back to kanban (move to Done column)
    if (task.kanbanTaskId && task.kanbanColumnId) {
      try {
        const doneCol = kanbanColumns.find(c =>
          c.boardId === (kanbanTasks.find(t => t.id === task.kanbanTaskId)?.boardId) &&
          (c.name.toLowerCase() === "done" || c.name.toLowerCase().includes("done"))
        );
        if (doneCol) {
          const kt = kanbanTasks.find(t => t.id === task.kanbanTaskId);
          if (kt) {
            await api.put(`/kanban/tasks/${task.kanbanTaskId}`, { ...kt, columnId: doneCol.id });
            setKanbanTasks(prev => prev.map(t => t.id === task.kanbanTaskId ? { ...t, columnId: doneCol.id } : t));
          }
        }
      } catch {}
    }
  };

  const removeTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));

  // ── Schedule import ─────────────────────────────────────────────────────────

  const loadScheduleBlocks = async () => {
    if (loadingSchedule) return;
    setLoadingSchedule(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const rows = await api.get<ScheduleBlock[]>(`/daily-schedule?date=${today}`);
      setScheduleBlocks(rows);
      setShowScheduleImport(true);
    } catch {} finally { setLoadingSchedule(false); }
  };

  const importScheduleBlock = (block: ScheduleBlock) => {
    if (tasks.find(t => t.scheduleBlockId === block.id) || completedTasks.find(t => t.scheduleBlockId === block.id)) return;
    setTasks(prev => [...prev, { id: uid(), text: block.label, scheduleBlockId: block.id }]);
  };

  const incompleteBlocks = scheduleBlocks.filter(b => !b.completed);

  // ── Kanban import ───────────────────────────────────────────────────────────

  const loadKanban = async () => {
    if (loadingKanban) return;
    setLoadingKanban(true);
    try {
      const data = await api.get<{ boards: KanbanBoard[]; columns: KanbanColumn[]; tasks: KanbanTask[] }>("/kanban/boards");
      setKanbanBoards(data.boards);
      setKanbanColumns(data.columns);
      setKanbanTasks(data.tasks);
      const saved = localStorage.getItem("fb_kb_active");
      const savedId = saved ? JSON.parse(saved) : null;
      setActiveBoardId(savedId && data.boards.find((b: KanbanBoard) => b.id === savedId) ? savedId : data.boards[0]?.id ?? null);
      setShowKanbanImport(true);
    } catch {} finally { setLoadingKanban(false); }
  };

  const importKanbanTask = (task: KanbanTask) => {
    if (tasks.find(t => t.kanbanTaskId === task.id) || completedTasks.find(t => t.kanbanTaskId === task.id)) return;
    setTasks(prev => [...prev, { id: uid(), text: task.title, kanbanTaskId: task.id, kanbanColumnId: task.columnId }]);
  };

  const activeBoard = kanbanBoards.find(b => b.id === activeBoardId);
  const activeBoardTasks = kanbanTasks.filter(t => t.boardId === activeBoardId);
  const doneColId = kanbanColumns.find(c =>
    c.boardId === activeBoardId && (c.name.toLowerCase() === "done" || c.name.toLowerCase().includes("done"))
  )?.id;
  const pendingBoardTasks = activeBoardTasks.filter(t => t.columnId !== doneColId);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Timer size={22} color="#7c3aed" />
            <h1 style={{ color: "#f8fafc", fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Deep Work Session</h1>
          </div>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.85rem", margin: 0 }}>{quote}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

          {/* ── Timer Card ── */}
          <div style={{ background: "hsl(246 60% 10%)", borderRadius: 20, padding: 32, border: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>

            {/* Mode tabs */}
            <div style={{ display: "flex", gap: 8, background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 4 }}>
              {(Object.keys(modes) as Mode[]).map(m => (
                <button key={m} onClick={() => switchMode(m)} style={{
                  padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontSize: "0.75rem", fontWeight: 600, transition: "all 0.2s",
                  background: mode === m ? color : "transparent",
                  color: mode === m ? "#fff" : "rgba(255,255,255,0.5)",
                }}>{modes[m].label}</button>
              ))}
            </div>

            {/* Circular timer */}
            <div style={{ position: "relative", width: 210, height: 210 }}>
              <svg width={210} height={210} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={105} cy={105} r={88} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
                <circle cx={105} cy={105} r={88} fill="none" stroke={color} strokeWidth={10}
                  strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)}
                  strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color }}>
                  {icon}<span style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
                </div>
                <span style={{ fontSize: "3rem", fontWeight: 800, color: "#f8fafc", fontVariantNumeric: "tabular-nums", letterSpacing: -2 }}>{fmt(timeLeft)}</span>
                <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>{sessionsToday} session{sessionsToday !== 1 ? "s" : ""} today</span>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={reset} style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <RotateCcw size={18} />
              </button>
              <button onClick={() => setRunning(r => !r)} style={{
                width: 64, height: 64, borderRadius: "50%", border: "none", background: color, color: "#fff", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 24px ${color}55`, transition: "transform 0.15s",
              }}>
                {running ? <Pause size={24} /> : <Play size={24} />}
              </button>
              <button onClick={complete} style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle2 size={18} />
              </button>
            </div>

            {/* Custom time */}
            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              <input value={customMinutes} onChange={e => setCustomMinutes(e.target.value)}
                onKeyDown={e => e.key === "Enter" && applyCustom()}
                placeholder="Custom minutes (e.g. 45)"
                style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 12px", color: "#f8fafc", fontSize: "0.8rem", outline: "none" }} />
              <button onClick={applyCustom} style={{ padding: "8px 14px", borderRadius: 10, background: color, border: "none", color: "#fff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>Set</button>
            </div>

            {/* Session log */}
            {log.length > 0 && (
              <div style={{ width: "100%", background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "12px 14px" }}>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>Today's Log</p>
                {log.map((s, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: i < log.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.78rem" }}>{s.label}</span>
                    <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.72rem" }}>{s.completedAt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Right panel ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "Sessions Today", value: sessionsToday, color: "#7c3aed" },
                { label: "Tasks Done", value: completedTasks.length, color: "#10b981" },
                { label: "Focus Time", value: `${Math.round(sessionsToday * (modes.focus.seconds / 60))}m`, color: "#f59e0b" },
                { label: "Remaining", value: tasks.length, color: "#06b6d4" },
              ].map(s => (
                <div key={s.label} style={{ background: "hsl(246 60% 10%)", borderRadius: 14, padding: "16px 18px", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>{s.label}</p>
                  <p style={{ color: s.color, fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Session tasks */}
            <div style={{ background: "hsl(246 60% 10%)", borderRadius: 20, padding: 22, border: "1px solid rgba(255,255,255,0.07)", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>Session Tasks</p>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { setShowKanbanImport(false); showScheduleImport ? setShowScheduleImport(false) : loadScheduleBlocks(); }}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(116,103,240,0.3)", background: showScheduleImport ? "rgba(116,103,240,0.2)" : "rgba(116,103,240,0.07)", color: "#a78bfa", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer" }}>
                    {loadingSchedule ? <Loader2 size={11} style={{ animation: "spin 0.8s linear infinite" }} /> : <CalendarDays size={11} />}
                    Schedule
                  </button>
                  <button onClick={() => { setShowScheduleImport(false); showKanbanImport ? setShowKanbanImport(false) : loadKanban(); }}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(16,185,129,0.3)", background: showKanbanImport ? "rgba(16,185,129,0.18)" : "rgba(16,185,129,0.07)", color: "#34d399", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer" }}>
                    {loadingKanban ? <Loader2 size={11} style={{ animation: "spin 0.8s linear infinite" }} /> : <KanbanSquare size={11} />}
                    Board
                  </button>
                </div>
              </div>

              {/* Schedule import panel */}
              {showScheduleImport && (
                <div style={{ background: "rgba(116,103,240,0.06)", borderRadius: 12, border: "1px solid rgba(116,103,240,0.18)", padding: "10px 12px" }}>
                  <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 8px" }}>
                    📅 Today's Schedule — click to add
                  </p>
                  {incompleteBlocks.length === 0 ? (
                    <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.78rem" }}>No incomplete blocks for today.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {incompleteBlocks.map(b => {
                        const alreadyAdded = tasks.some(t => t.scheduleBlockId === b.id) || completedTasks.some(t => t.scheduleBlockId === b.id);
                        return (
                          <button key={b.id} onClick={() => importScheduleBlock(b)} disabled={alreadyAdded}
                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, border: "none", background: alreadyAdded ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)", color: alreadyAdded ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.75)", cursor: alreadyAdded ? "not-allowed" : "pointer", fontSize: "0.8rem", textAlign: "left", width: "100%" }}>
                            <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap" }}>{fmtTime(b.startHour, b.startMin)}</span>
                            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.label}</span>
                            {alreadyAdded && <CheckCircle2 size={12} color="#10b981" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Kanban import panel */}
              {showKanbanImport && (
                <div style={{ background: "rgba(16,185,129,0.05)", borderRadius: 12, border: "1px solid rgba(16,185,129,0.18)", padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, margin: 0 }}>
                      🎯 From Board — click to add
                    </p>
                    {kanbanBoards.length > 1 && (
                      <div style={{ display: "flex", gap: 4 }}>
                        {kanbanBoards.map(b => (
                          <button key={b.id} onClick={() => setActiveBoardId(b.id)}
                            style={{ padding: "2px 8px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: "0.65rem", fontWeight: 600, background: b.id === activeBoardId ? b.color : "rgba(255,255,255,0.06)", color: b.id === activeBoardId ? "#fff" : "rgba(255,255,255,0.4)" }}>
                            {b.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {pendingBoardTasks.length === 0 ? (
                    <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.78rem" }}>No pending tasks on this board.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 160, overflowY: "auto" }}>
                      {pendingBoardTasks.map(t => {
                        const alreadyAdded = tasks.some(x => x.kanbanTaskId === t.id) || completedTasks.some(x => x.kanbanTaskId === t.id);
                        const col = kanbanColumns.find(c => c.id === t.columnId);
                        return (
                          <button key={t.id} onClick={() => importKanbanTask(t)} disabled={alreadyAdded}
                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, border: "none", background: alreadyAdded ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)", color: alreadyAdded ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.75)", cursor: alreadyAdded ? "not-allowed" : "pointer", fontSize: "0.8rem", textAlign: "left", width: "100%" }}>
                            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                            {col && <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.25)", whiteSpace: "nowrap" }}>{col.name}</span>}
                            {alreadyAdded && <CheckCircle2 size={12} color="#10b981" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Manual add */}
              <div style={{ display: "flex", gap: 8 }}>
                <input value={taskInput} onChange={e => setTaskInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addTask()}
                  placeholder="What will you work on?"
                  style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px 12px", color: "#f8fafc", fontSize: "0.82rem", outline: "none" }} />
                <button onClick={addTask} style={{ width: 38, height: 38, borderRadius: 10, background: "#7c3aed", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Plus size={18} />
                </button>
              </div>

              {/* Active tasks */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {tasks.length === 0 && (
                  <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.8rem", textAlign: "center", padding: "12px 0" }}>
                    Add tasks manually, or import from your schedule or board above.
                  </p>
                )}
                {tasks.map(t => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <button onClick={() => completeTask(t)}
                      style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", background: "transparent", cursor: "pointer", flexShrink: 0 }} />
                    <span style={{ flex: 1, color: "rgba(255,255,255,0.8)", fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.text}</span>
                    {t.scheduleBlockId && (
                      <span title="From Daily Schedule" style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(116,103,240,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <CalendarDays size={10} color="#a78bfa" />
                      </span>
                    )}
                    {t.kanbanTaskId && (
                      <span title="From Kanban Board" style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <KanbanSquare size={10} color="#34d399" />
                      </span>
                    )}
                    <button onClick={() => removeTask(t.id)}
                      style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer", padding: 0, flexShrink: 0 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Completed tasks */}
              {completedTasks.length > 0 && (
                <div>
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>Completed</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {completedTasks.map(t => (
                      <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: "rgba(16,185,129,0.06)", borderRadius: 10 }}>
                        <CheckCircle2 size={16} color="#10b981" />
                        <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem", textDecoration: "line-through", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.text}</span>
                        {t.scheduleBlockId && <CalendarDays size={10} color="rgba(167,139,250,0.5)" style={{ flexShrink: 0 }} />}
                        {t.kanbanTaskId && <KanbanSquare size={10} color="rgba(52,211,153,0.5)" style={{ flexShrink: 0 }} />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
