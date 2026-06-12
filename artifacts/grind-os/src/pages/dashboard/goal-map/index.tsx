import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../../lib/api";
import {
  Plus, Trash2, ChevronDown, ChevronRight, Target, Trophy, Zap, Star,
  CheckCircle2, Circle, KanbanSquare, CalendarDays, Loader2, LinkIcon,
  AlertTriangle, ChevronUp, Edit2, Check, X,
} from "lucide-react";
import { useLocation } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "not-started" | "in-progress" | "done";
type GoalLevel = "vision" | "goal" | "milestone" | "habit";

interface Goal {
  id: string;
  text: string;
  level: GoalLevel;
  status: Status;
  parentId: string | null;
  note: string;
  collapsed: boolean;
  order: number;
  dueDate?: string | null;
  linkedKanbanTaskId?: string | null;
  linkedCalendarEventId?: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<GoalLevel, { label: string; color: string; bg: string; icon: React.ReactNode; indent: number }> = {
  vision:    { label: "Vision",      color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  icon: <Star size={14} />,         indent: 0 },
  goal:      { label: "Goal",        color: "#7c3aed", bg: "rgba(124,58,237,0.07)", icon: <Target size={14} />,       indent: 24 },
  milestone: { label: "Milestone",   color: "#06b6d4", bg: "rgba(6,182,212,0.07)",  icon: <Zap size={14} />,          indent: 48 },
  habit:     { label: "Daily Habit", color: "#10b981", bg: "rgba(16,185,129,0.07)", icon: <CheckCircle2 size={14} />, indent: 72 },
};

const STATUS_CYCLE: Status[] = ["not-started", "in-progress", "done"];

const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  "not-started": { label: "Not started", color: "rgba(255,255,255,0.2)" },
  "in-progress":  { label: "In progress", color: "#f59e0b" },
  "done":         { label: "Done",         color: "#10b981" },
};

const LEVEL_ORDER: GoalLevel[] = ["vision", "goal", "milestone", "habit"];

function uid() { return Math.random().toString(36).slice(2, 10); }

// ─── Stat Badge ───────────────────────────────────────────────────────────────

function StatBadge({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "10px 18px", borderRadius: 12,
      background: `${color}12`, border: `1px solid ${color}25`,
    }}>
      <span style={{ fontSize: "1.4rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, marginTop: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GoalMapPage() {
  const [, navigate] = useLocation();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [sendingKanban, setSendingKanban] = useState<Set<string>>(new Set());
  const [sendingCal, setSendingCal] = useState<Set<string>>(new Set());

  // Form state
  const [addingUnder, setAddingUnder] = useState<string | "root" | null>(null);
  const [newText, setNewText] = useState("");
  const [newLevel, setNewLevel] = useState<GoalLevel>("goal");
  const [newDueDate, setNewDueDate] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Schedule modal
  const [scheduleGoalId, setScheduleGoalId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    api.get<Goal[]>("/goals")
      .then(data => setGoals(data.sort((a, b) => a.order - b.order)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const markSaving = (id: string) => setSaving(s => new Set(s).add(id));
  const unmarkSaving = (id: string) => setSaving(s => { const n = new Set(s); n.delete(id); return n; });

  const patch = useCallback((id: string, changes: Partial<Goal>) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...changes } : g));
  }, []);

  const save = useCallback(async (id: string, changes: Partial<Goal>) => {
    patch(id, changes);
    markSaving(id);
    try {
      const goal = goals.find(g => g.id === id);
      if (goal) await api.put(`/goals/${id}`, { ...goal, ...changes });
    } catch (e) { console.error(e); }
    finally { unmarkSaving(id); }
  }, [goals, patch]);

  const remove = async (id: string) => {
    // Remove this item + all descendants
    const toRemove = new Set<string>();
    const queue = [id];
    while (queue.length) {
      const cur = queue.pop()!;
      toRemove.add(cur);
      goals.filter(g => g.parentId === cur).forEach(c => queue.push(c.id));
    }
    setGoals(prev => prev.filter(g => !toRemove.has(g.id)));
    for (const rid of toRemove) {
      try { await api.delete(`/goals/${rid}`); } catch {}
    }
  };

  const addGoal = async (parentId: string | null) => {
    if (!newText.trim()) return;
    const id = uid();
    const sibs = goals.filter(g => g.parentId === parentId);
    const newGoal: Goal = {
      id, text: newText.trim(), level: newLevel, status: "not-started",
      parentId, note: "", collapsed: false, order: sibs.length,
      dueDate: newDueDate || null,
    };
    setGoals(prev => [...prev, newGoal]);
    setNewText(""); setAddingUnder(null); setNewDueDate("");
    try { await api.post("/goals", newGoal); } catch (e) { console.error(e); }
  };

  const cycleStatus = (goal: Goal) => {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(goal.status) + 1) % STATUS_CYCLE.length];
    save(goal.id, { status: next });
  };

  const isHidden = useCallback((goal: Goal): boolean => {
    if (!goal.parentId) return false;
    const parent = goals.find(g => g.id === goal.parentId);
    if (!parent) return false;
    if (parent.collapsed) return true;
    return isHidden(parent);
  }, [goals]);

  const hasChildren = (id: string) => goals.some(g => g.parentId === id);

  // ── Integrations ──────────────────────────────────────────────────────────

  const sendToKanban = async (id: string) => {
    setSendingKanban(s => new Set(s).add(id));
    try {
      const res = await api.post<{ task: any; boardName: string }>(`/goals/${id}/send-to-kanban`, {});
      patch(id, { linkedKanbanTaskId: res.task.id });
    } catch (e) { console.error(e); }
    finally { setSendingKanban(s => { const n = new Set(s); n.delete(id); return n; }); }
  };

  const sendToCalendar = async (id: string) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    // If no due date, open the schedule modal
    if (!goal.dueDate && !scheduleDate) {
      setScheduleGoalId(id);
      setScheduleDate(new Date().toISOString().slice(0, 10));
      return;
    }
    setSendingCal(s => new Set(s).add(id));
    try {
      // Set the due date first if coming from modal
      if (scheduleDate && !goal.dueDate) {
        await api.put(`/goals/${id}`, { ...goal, dueDate: scheduleDate });
        patch(id, { dueDate: scheduleDate });
      }
      const res = await api.post<{ event: any }>(`/goals/${id}/send-to-calendar`, {});
      patch(id, { linkedCalendarEventId: res.event.id });
    } catch (e) { console.error(e); }
    finally {
      setSendingCal(s => { const n = new Set(s); n.delete(id); return n; });
      setScheduleGoalId(null); setScheduleDate("");
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────

  const visibleGoals = goals.filter(g => !isHidden(g));
  const doneCount = goals.filter(g => g.status === "done").length;
  const inProgressCount = goals.filter(g => g.status === "in-progress").length;
  const totalCount = goals.length;
  const progressPct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  const visionCount = goals.filter(g => g.level === "vision").length;
  const goalCount = goals.filter(g => g.level === "goal").length;
  const milestoneCount = goals.filter(g => g.level === "milestone").length;
  const habitCount = goals.filter(g => g.level === "habit").length;

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={24} color="#7c3aed" style={{ animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "hsl(246 70% 8%)" }}>
      {/* Schedule date modal */}
      {scheduleGoalId && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(10,8,30,0.7)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => { setScheduleGoalId(null); setScheduleDate(""); }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "hsl(246 50% 12%)", border: "1px solid rgba(124,58,237,0.4)",
            borderRadius: 16, padding: 24, width: 320,
          }}>
            <h3 style={{ color: "#f8fafc", fontSize: "0.95rem", fontWeight: 700, margin: "0 0 6px" }}>
              Schedule on Calendar
            </h3>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem", margin: "0 0 16px" }}>
              Choose a target date for this goal.
            </p>
            <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 10,
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                color: "#f8fafc", fontSize: "0.85rem", outline: "none", marginBottom: 14, boxSizing: "border-box",
              }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setScheduleGoalId(null); setScheduleDate(""); }}
                style={{ flex: 1, padding: "9px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "0.82rem" }}>
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!scheduleDate) return;
                  const goal = goals.find(g => g.id === scheduleGoalId);
                  if (goal) {
                    patch(scheduleGoalId, { dueDate: scheduleDate });
                    setSendingCal(s => new Set(s).add(scheduleGoalId!));
                    api.put(`/goals/${scheduleGoalId}`, { ...goal, dueDate: scheduleDate })
                      .then(() => api.post<{ event: any }>(`/goals/${scheduleGoalId}/send-to-calendar`, {}))
                      .then(res => patch(scheduleGoalId!, { linkedCalendarEventId: (res as any).event.id }))
                      .catch(console.error)
                      .finally(() => {
                        setSendingCal(s => { const n = new Set(s); n.delete(scheduleGoalId!); return n; });
                        setScheduleGoalId(null); setScheduleDate("");
                      });
                  }
                }}
                style={{ flex: 1, padding: "9px", borderRadius: 10, background: "#7c3aed", border: "none", color: "#fff", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>
                Add to Calendar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Trophy size={20} color="#f59e0b" />
            </div>
            <div>
              <h1 style={{ color: "#f8fafc", fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>Goal Map</h1>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.78rem", margin: 0 }}>
                Vision → Goals → Milestones → Daily Habits · persisted and synced
              </p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          <StatBadge value={progressPct} label="% done" color="#10b981" />
          <StatBadge value={doneCount} label="Completed" color="#10b981" />
          <StatBadge value={inProgressCount} label="In progress" color="#f59e0b" />
          <StatBadge value={visionCount} label="Visions" color="#f59e0b" />
          <StatBadge value={goalCount} label="Goals" color="#7c3aed" />
          <StatBadge value={milestoneCount} label="Milestones" color="#06b6d4" />
          <StatBadge value={habitCount} label="Habits" color="#10b981" />
        </div>

        {/* Progress bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div style={{ flex: 1, height: 7, background: "rgba(255,255,255,0.07)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg, #7c3aed, #10b981)", borderRadius: 99, transition: "width 0.5s cubic-bezier(.4,0,.2,1)" }} />
          </div>
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.73rem", whiteSpace: "nowrap", fontWeight: 600 }}>
            {doneCount} / {totalCount}
          </span>
        </div>

        {/* Integration legend */}
        <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.68rem", color: "rgba(255,255,255,0.35)" }}>
            <KanbanSquare size={11} color="#10b981" /> Send milestones → Kanban board
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.68rem", color: "rgba(255,255,255,0.35)" }}>
            <CalendarDays size={11} color="#06b6d4" /> Schedule goals/milestones → Calendar
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.68rem", color: "rgba(255,255,255,0.35)" }}>
            <LinkIcon size={11} color="#7c3aed" /> Linked indicator shows existing connections
          </div>
        </div>

        {/* Level legend */}
        <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
          {LEVEL_ORDER.map(l => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ color: LEVEL_CONFIG[l].color }}>{LEVEL_CONFIG[l].icon}</div>
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.68rem", fontWeight: 600 }}>{LEVEL_CONFIG[l].label}</span>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {goals.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "rgba(255,255,255,0.25)" }}>
            <Trophy size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ fontSize: "0.9rem", margin: "0 0 4px", fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>No goals yet</p>
            <p style={{ fontSize: "0.78rem", margin: 0 }}>Add a vision to get started — then break it down into goals, milestones, and daily habits.</p>
          </div>
        )}

        {/* Goal items */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {visibleGoals.map(goal => {
            const cfg = LEVEL_CONFIG[goal.level];
            const sCfg = STATUS_CONFIG[goal.status];
            const kids = hasChildren(goal.id);
            const isSaving = saving.has(goal.id);
            const isEditingThis = editingId === goal.id;
            const isEditingNoteThis = editingNoteId === goal.id;
            const linkedKanban = !!goal.linkedKanbanTaskId;
            const linkedCal = !!goal.linkedCalendarEventId;
            const kanbanLoading = sendingKanban.has(goal.id);
            const calLoading = sendingCal.has(goal.id);

            return (
              <div key={goal.id} style={{ marginLeft: cfg.indent }}>
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  background: cfg.bg,
                  border: `1px solid ${cfg.color}22`,
                  borderRadius: 12, padding: "10px 12px",
                  transition: "border-color 0.2s, opacity 0.2s",
                  opacity: goal.status === "done" ? 0.55 : 1,
                }}>
                  {/* Collapse */}
                  <button onClick={() => save(goal.id, { collapsed: !goal.collapsed })}
                    style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", cursor: kids ? "pointer" : "default", padding: 0, paddingTop: 2, flexShrink: 0, opacity: kids ? 1 : 0, pointerEvents: kids ? "auto" : "none" }}>
                    {goal.collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {/* Status toggle */}
                  <button onClick={() => cycleStatus(goal)} title={`Status: ${sCfg.label} — click to cycle`}
                    style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, paddingTop: 2, color: sCfg.color, flexShrink: 0 }}>
                    {goal.status === "done"
                      ? <CheckCircle2 size={16} color="#10b981" />
                      : goal.status === "in-progress"
                        ? <Circle size={16} color="#f59e0b" strokeWidth={2.5} />
                        : <Circle size={16} />
                    }
                  </button>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title row */}
                    {isEditingThis ? (
                      <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                        <input value={editText} onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") { save(goal.id, { text: editText }); setEditingId(null); }
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          autoFocus
                          style={{ flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "4px 8px", color: "#f8fafc", fontSize: "0.85rem", outline: "none" }}
                        />
                        <button onClick={() => { save(goal.id, { text: editText }); setEditingId(null); }}
                          style={{ background: "#10b981", border: "none", borderRadius: 7, padding: "4px 8px", cursor: "pointer" }}>
                          <Check size={12} color="#fff" />
                        </button>
                        <button onClick={() => setEditingId(null)}
                          style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 7, padding: "4px 8px", cursor: "pointer" }}>
                          <X size={12} color="rgba(255,255,255,0.4)" />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 3 }}>
                        <span style={{
                          color: goal.status === "done" ? "rgba(255,255,255,0.35)" : "#f8fafc",
                          fontSize: goal.level === "vision" ? "0.95rem" : "0.85rem",
                          fontWeight: goal.level === "vision" ? 700 : goal.level === "goal" ? 600 : 400,
                          textDecoration: goal.status === "done" ? "line-through" : "none",
                          flex: 1,
                        }}>{goal.text}</span>
                        <button onClick={() => { setEditingId(goal.id); setEditText(goal.text); }}
                          style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer", padding: "1px 3px", opacity: 0, flexShrink: 0 }}
                          className="edit-btn">
                          <Edit2 size={11} />
                        </button>
                      </div>
                    )}

                    {/* Meta row */}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ color: cfg.color, fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {cfg.label}
                      </span>
                      <span style={{ color: sCfg.color, fontSize: "0.62rem", fontWeight: 500 }}>· {sCfg.label}</span>
                      {isSaving && <Loader2 size={9} color="rgba(255,255,255,0.25)" style={{ animation: "spin 0.8s linear infinite" }} />}

                      {/* Due date */}
                      {goal.dueDate && (
                        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.62rem" }}>
                          📅 {goal.dueDate}
                        </span>
                      )}

                      {/* Integration badges */}
                      {linkedKanban && (
                        <button onClick={() => navigate("/dashboard/kanban")} title="Linked to Kanban — click to open"
                          style={{ display: "flex", alignItems: "center", gap: 3, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 5, padding: "1px 6px", cursor: "pointer" }}>
                          <KanbanSquare size={9} color="#10b981" />
                          <span style={{ color: "#10b981", fontSize: "0.6rem", fontWeight: 600 }}>In Kanban</span>
                        </button>
                      )}
                      {linkedCal && (
                        <button onClick={() => navigate("/dashboard/calendar")} title="Scheduled — click to open Calendar"
                          style={{ display: "flex", alignItems: "center", gap: 3, background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)", borderRadius: 5, padding: "1px 6px", cursor: "pointer" }}>
                          <CalendarDays size={9} color="#06b6d4" />
                          <span style={{ color: "#06b6d4", fontSize: "0.6rem", fontWeight: 600 }}>Scheduled</span>
                        </button>
                      )}
                    </div>

                    {/* Note */}
                    {isEditingNoteThis ? (
                      <textarea value={goal.note}
                        onChange={e => patch(goal.id, { note: e.target.value })}
                        onBlur={() => { save(goal.id, { note: goal.note }); setEditingNoteId(null); }}
                        autoFocus rows={2}
                        style={{ marginTop: 6, width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 10px", color: "rgba(255,255,255,0.7)", fontSize: "0.75rem", resize: "vertical", outline: "none", boxSizing: "border-box" }}
                        placeholder="Add a note…" />
                    ) : goal.note ? (
                      <p onClick={() => setEditingNoteId(goal.id)} style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", margin: "5px 0 0", cursor: "text", lineHeight: 1.4 }}>
                        {goal.note}
                      </p>
                    ) : (
                      <button onClick={() => setEditingNoteId(goal.id)}
                        style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.15)", fontSize: "0.68rem", cursor: "pointer", padding: 0, marginTop: 4 }}>
                        + note
                      </button>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, flexShrink: 0, alignItems: "flex-end" }}>
                    {/* Top row: integration actions */}
                    <div style={{ display: "flex", gap: 4 }}>
                      {/* Send to Kanban — for milestones */}
                      {(goal.level === "milestone" || goal.level === "goal") && (
                        <button onClick={() => sendToKanban(goal.id)} disabled={kanbanLoading || linkedKanban}
                          title={linkedKanban ? "Already in Kanban" : "Send to Kanban board"}
                          style={{
                            display: "flex", alignItems: "center", gap: 4,
                            padding: "3px 7px", borderRadius: 6, border: "none", cursor: linkedKanban ? "default" : "pointer",
                            background: linkedKanban ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.12)",
                            color: linkedKanban ? "#10b981" : "rgba(16,185,129,0.7)",
                            fontSize: "0.63rem", fontWeight: 600, transition: "all 0.15s",
                            opacity: linkedKanban ? 0.7 : 1,
                          }}>
                          {kanbanLoading
                            ? <Loader2 size={9} style={{ animation: "spin 0.8s linear infinite" }} />
                            : <KanbanSquare size={9} />
                          }
                          {linkedKanban ? "Synced" : "Kanban"}
                        </button>
                      )}

                      {/* Schedule on Calendar — for goals and milestones */}
                      {(goal.level === "goal" || goal.level === "milestone") && (
                        <button onClick={() => sendToCalendar(goal.id)} disabled={calLoading || linkedCal}
                          title={linkedCal ? "Already scheduled" : "Schedule on Calendar"}
                          style={{
                            display: "flex", alignItems: "center", gap: 4,
                            padding: "3px 7px", borderRadius: 6, border: "none", cursor: linkedCal ? "default" : "pointer",
                            background: "rgba(6,182,212,0.12)",
                            color: linkedCal ? "#06b6d4" : "rgba(6,182,212,0.7)",
                            fontSize: "0.63rem", fontWeight: 600, transition: "all 0.15s",
                            opacity: linkedCal ? 0.7 : 1,
                          }}>
                          {calLoading
                            ? <Loader2 size={9} style={{ animation: "spin 0.8s linear infinite" }} />
                            : <CalendarDays size={9} />
                          }
                          {linkedCal ? "Scheduled" : "Calendar"}
                        </button>
                      )}
                    </div>

                    {/* Bottom row: add child + delete */}
                    <div style={{ display: "flex", gap: 3 }}>
                      {goal.level !== "habit" && (
                        <button
                          onClick={() => {
                            setAddingUnder(goal.id);
                            setNewLevel(LEVEL_ORDER[Math.min(LEVEL_ORDER.indexOf(goal.level) + 1, LEVEL_ORDER.length - 1)]);
                            setNewText("");
                          }}
                          title="Add child item"
                          style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer", padding: "2px 4px", borderRadius: 5, transition: "color 0.15s" }}>
                          <Plus size={13} />
                        </button>
                      )}
                      <button onClick={() => remove(goal.id)} title="Delete (and children)"
                        style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.15)", cursor: "pointer", padding: "2px 4px", borderRadius: 5, transition: "color 0.15s" }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline add form */}
                {addingUnder === goal.id && (
                  <AddForm
                    defaultLevel={newLevel}
                    onLevelChange={setNewLevel}
                    text={newText}
                    onTextChange={setNewText}
                    dueDate={newDueDate}
                    onDueDateChange={setNewDueDate}
                    onAdd={() => addGoal(goal.id)}
                    onCancel={() => setAddingUnder(null)}
                    showLevels={LEVEL_ORDER.slice(LEVEL_ORDER.indexOf(goal.level))}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Add root vision */}
        <div style={{ marginTop: 16 }}>
          {addingUnder === "root" ? (
            <AddForm
              defaultLevel={newLevel}
              onLevelChange={setNewLevel}
              text={newText}
              onTextChange={setNewText}
              dueDate={newDueDate}
              onDueDateChange={setNewDueDate}
              onAdd={() => addGoal(null)}
              onCancel={() => setAddingUnder(null)}
              showLevels={LEVEL_ORDER}
              highlight
            />
          ) : (
            <button
              onClick={() => { setAddingUnder("root"); setNewLevel("vision"); setNewText(""); setNewDueDate(""); }}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
                borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: "0.82rem", width: "100%",
              }}>
              <Plus size={15} /> Add Vision or Goal
            </button>
          )}
        </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        div:hover > div > .edit-btn, div:hover .edit-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
}

// ─── Add Form ─────────────────────────────────────────────────────────────────

function AddForm({
  defaultLevel, onLevelChange, text, onTextChange, dueDate, onDueDateChange,
  onAdd, onCancel, showLevels, highlight,
}: {
  defaultLevel: GoalLevel; onLevelChange: (l: GoalLevel) => void;
  text: string; onTextChange: (t: string) => void;
  dueDate: string; onDueDateChange: (d: string) => void;
  onAdd: () => void; onCancel: () => void;
  showLevels: GoalLevel[]; highlight?: boolean;
}) {
  return (
    <div style={{
      marginTop: 6,
      background: "hsl(246 60% 10%)",
      borderRadius: 12, padding: "12px 14px",
      border: `1px solid ${highlight ? "rgba(245,158,11,0.3)" : "rgba(124,58,237,0.3)"}`,
    }}>
      {/* Level picker */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {showLevels.map(l => (
          <button key={l} onClick={() => onLevelChange(l)}
            style={{
              padding: "3px 10px", borderRadius: 7, border: "none", cursor: "pointer",
              fontSize: "0.68rem", fontWeight: 700, transition: "all 0.12s",
              background: defaultLevel === l ? LEVEL_CONFIG[l].color : "rgba(255,255,255,0.06)",
              color: defaultLevel === l ? "#fff" : "rgba(255,255,255,0.4)",
            }}>
            {LEVEL_CONFIG[l].label}
          </button>
        ))}
      </div>

      {/* Text + date */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input value={text} onChange={e => onTextChange(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") onAdd(); if (e.key === "Escape") onCancel(); }}
          autoFocus
          placeholder={`New ${LEVEL_CONFIG[defaultLevel].label}…`}
          style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "8px 12px", color: "#f8fafc", fontSize: "0.82rem", outline: "none" }}
        />
        <input type="date" value={dueDate} onChange={e => onDueDateChange(e.target.value)}
          title="Optional due date"
          style={{ width: 130, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "8px 10px", color: dueDate ? "#f8fafc" : "rgba(255,255,255,0.25)", fontSize: "0.75rem", outline: "none" }}
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onAdd} disabled={!text.trim()}
          style={{ padding: "8px 16px", borderRadius: 9, background: text.trim() ? LEVEL_CONFIG[defaultLevel].color : "rgba(255,255,255,0.07)", border: "none", color: "#fff", cursor: text.trim() ? "pointer" : "not-allowed", fontSize: "0.8rem", fontWeight: 700 }}>
          Add
        </button>
        <button onClick={onCancel}
          style={{ padding: "8px 12px", borderRadius: 9, background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "0.8rem" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
