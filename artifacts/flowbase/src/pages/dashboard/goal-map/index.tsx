import React, { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, Target, Trophy, Zap, Star, CheckCircle2, Circle } from "lucide-react";
import Sidebar from "@/components/Sidebar";

type Status = "not-started" | "in-progress" | "done";
type GoalLevel = "vision" | "goal" | "milestone" | "habit";

interface Item {
  id: string;
  text: string;
  level: GoalLevel;
  status: Status;
  parentId: string | null;
  note: string;
  collapsed: boolean;
}

const LEVEL_CONFIG: Record<GoalLevel, { label: string; color: string; icon: React.ReactNode; indent: number }> = {
  vision: { label: "Vision", color: "#f59e0b", icon: <Star size={15} />, indent: 0 },
  goal: { label: "Goal", color: "#7c3aed", icon: <Target size={15} />, indent: 24 },
  milestone: { label: "Milestone", color: "#06b6d4", icon: <Zap size={15} />, indent: 48 },
  habit: { label: "Daily Habit", color: "#10b981", icon: <CheckCircle2 size={15} />, indent: 72 },
};

const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  "not-started": { label: "Not Started", color: "rgba(255,255,255,0.2)" },
  "in-progress": { label: "In Progress", color: "#f59e0b" },
  "done": { label: "Done", color: "#10b981" },
};

const LEVEL_ORDER: GoalLevel[] = ["vision", "goal", "milestone", "habit"];

function uid() { return Math.random().toString(36).slice(2, 10); }

const STARTER: Item[] = [
  { id: "v1", text: "Become the best version of myself", level: "vision", status: "in-progress", parentId: null, note: "My north star. Everything else serves this.", collapsed: false },
  { id: "g1", text: "Master a high-income skill", level: "goal", status: "in-progress", parentId: "v1", note: "", collapsed: false },
  { id: "m1", text: "Complete 30 deep work sessions this month", level: "milestone", status: "in-progress", parentId: "g1", note: "", collapsed: false },
  { id: "h1", text: "2 deep work blocks every day", level: "habit", status: "not-started", parentId: "m1", note: "", collapsed: false },
  { id: "g2", text: "Build elite health & energy", level: "goal", status: "not-started", parentId: "v1", note: "", collapsed: false },
  { id: "m2", text: "Sleep 7-8 hours every night for 30 days", level: "milestone", status: "not-started", parentId: "g2", note: "", collapsed: false },
  { id: "h2", text: "In bed by 10pm, phone off", level: "habit", status: "not-started", parentId: "m2", note: "", collapsed: false },
];

export default function GoalMapPage() {
  const [items, setItems] = useState<Item[]>(STARTER);
  const [addingUnder, setAddingUnder] = useState<string | null>(null);
  const [newText, setNewText] = useState("");
  const [newLevel, setNewLevel] = useState<GoalLevel>("goal");
  const [editingNote, setEditingNote] = useState<string | null>(null);

  const update = (id: string, patch: Partial<Item>) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));

  const remove = (id: string) => {
    const toRemove = new Set<string>();
    const queue = [id];
    while (queue.length) {
      const cur = queue.pop()!;
      toRemove.add(cur);
      items.filter(i => i.parentId === cur).forEach(c => queue.push(c.id));
    }
    setItems(prev => prev.filter(i => !toRemove.has(i.id)));
  };

  const addItem = (parentId: string | null) => {
    if (!newText.trim()) return;
    const newItem: Item = { id: uid(), text: newText.trim(), level: newLevel, status: "not-started", parentId, note: "", collapsed: false };
    setItems(prev => [...prev, newItem]);
    setNewText("");
    setAddingUnder(null);
  };

  const cycleStatus = (item: Item) => {
    const order: Status[] = ["not-started", "in-progress", "done"];
    const next = order[(order.indexOf(item.status) + 1) % order.length];
    update(item.id, { status: next });
  };

  const isHidden = (item: Item): boolean => {
    if (!item.parentId) return false;
    const parent = items.find(i => i.id === item.parentId);
    if (!parent) return false;
    if (parent.collapsed) return true;
    return isHidden(parent);
  };

  const visibleItems = items.filter(i => !isHidden(i));
  const hasChildren = (id: string) => items.some(i => i.parentId === id);

  const doneCount = items.filter(i => i.status === "done").length;
  const totalCount = items.length;
  const progressPct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div style={{ display: "flex", minHeight: "100dvh", background: "hsl(246 80% 6%)" }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: "auto", padding: "32px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <Trophy size={22} color="#f59e0b" />
              <h1 style={{ color: "#f8fafc", fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Goal Map</h1>
            </div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", margin: "0 0 16px" }}>Your path to mastery — from vision down to daily habits.</p>

            {/* Progress bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg,#7c3aed,#10b981)", borderRadius: 99, transition: "width 0.4s" }} />
              </div>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>{doneCount}/{totalCount} done</span>
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            {LEVEL_ORDER.map(l => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ color: LEVEL_CONFIG[l].color }}>{LEVEL_CONFIG[l].icon}</div>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.72rem", fontWeight: 600 }}>{LEVEL_CONFIG[l].label}</span>
              </div>
            ))}
          </div>

          {/* Items */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {visibleItems.map(item => {
              const cfg = LEVEL_CONFIG[item.level];
              const sCfg = STATUS_CONFIG[item.status];
              const hasKids = hasChildren(item.id);
              return (
                <div key={item.id} style={{ marginLeft: cfg.indent }}>
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    background: item.level === "vision" ? "rgba(245,158,11,0.07)" : "hsl(246 60% 10%)",
                    border: `1px solid ${item.level === "vision" ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.06)"}`,
                    borderRadius: 12, padding: "10px 14px", transition: "border-color 0.2s",
                  }}>
                    {/* Collapse toggle */}
                    <button onClick={() => update(item.id, { collapsed: !item.collapsed })}
                      style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", cursor: hasKids ? "pointer" : "default", padding: 0, paddingTop: 1, flexShrink: 0, opacity: hasKids ? 1 : 0, pointerEvents: hasKids ? "auto" : "none" }}>
                      {item.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {/* Level icon + status toggle */}
                    <button onClick={() => cycleStatus(item)} title={`Status: ${sCfg.label} — click to cycle`}
                      style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, paddingTop: 1, color: sCfg.color === "rgba(255,255,255,0.2)" ? cfg.color : sCfg.color, flexShrink: 0 }}>
                      {item.status === "done" ? <CheckCircle2 size={16} /> : item.status === "in-progress" ? <Circle size={16} strokeWidth={2.5} /> : <Circle size={16} />}
                    </button>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        color: item.status === "done" ? "rgba(255,255,255,0.3)" : "#f8fafc",
                        fontSize: item.level === "vision" ? "1rem" : "0.88rem",
                        fontWeight: item.level === "vision" ? 700 : item.level === "goal" ? 600 : 400,
                        textDecoration: item.status === "done" ? "line-through" : "none",
                      }}>{item.text}</span>
                      <div style={{ display: "flex", gap: 8, marginTop: 3, alignItems: "center" }}>
                        <span style={{ color: cfg.color, fontSize: "0.66rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{cfg.label}</span>
                        <span style={{ color: sCfg.color, fontSize: "0.66rem", fontWeight: 500 }}>· {sCfg.label}</span>
                      </div>
                      {editingNote === item.id ? (
                        <textarea value={item.note} onChange={e => update(item.id, { note: e.target.value })}
                          onBlur={() => setEditingNote(null)} autoFocus
                          style={{ marginTop: 6, width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 10px", color: "rgba(255,255,255,0.7)", fontSize: "0.78rem", resize: "vertical", outline: "none", minHeight: 48 }}
                          placeholder="Add a note…" />
                      ) : item.note ? (
                        <p onClick={() => setEditingNote(item.id)} style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.78rem", margin: "4px 0 0", cursor: "text" }}>{item.note}</p>
                      ) : (
                        <button onClick={() => setEditingNote(item.id)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.18)", fontSize: "0.72rem", cursor: "pointer", padding: 0, marginTop: 4 }}>+ note</button>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button onClick={() => { setAddingUnder(item.id); const nextLevel = LEVEL_ORDER[Math.min(LEVEL_ORDER.indexOf(item.level) + 1, LEVEL_ORDER.length - 1)]; setNewLevel(nextLevel); }}
                        style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", padding: "2px" }}>
                        <Plus size={14} />
                      </button>
                      <button onClick={() => remove(item.id)}
                        style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.15)", cursor: "pointer", padding: "2px" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Inline add form */}
                  {addingUnder === item.id && (
                    <div style={{ marginLeft: LEVEL_CONFIG[newLevel]?.indent - cfg.indent, marginTop: 6, background: "hsl(246 60% 10%)", borderRadius: 12, padding: "12px 14px", border: "1px solid rgba(124,58,237,0.3)" }}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        {LEVEL_ORDER.map(l => (
                          <button key={l} onClick={() => setNewLevel(l)} style={{
                            padding: "4px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: "0.7rem", fontWeight: 600,
                            background: newLevel === l ? LEVEL_CONFIG[l].color : "rgba(255,255,255,0.06)",
                            color: newLevel === l ? "#fff" : "rgba(255,255,255,0.4)",
                          }}>{LEVEL_CONFIG[l].label}</button>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input value={newText} onChange={e => setNewText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addItem(item.id); if (e.key === "Escape") setAddingUnder(null); }}
                          autoFocus placeholder={`New ${LEVEL_CONFIG[newLevel].label}…`}
                          style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 12px", color: "#f8fafc", fontSize: "0.82rem", outline: "none" }} />
                        <button onClick={() => addItem(item.id)} style={{ padding: "8px 14px", borderRadius: 10, background: "#7c3aed", border: "none", color: "#fff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>Add</button>
                        <button onClick={() => setAddingUnder(null)} style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "0.8rem" }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add top-level vision */}
          <div style={{ marginTop: 20 }}>
            {addingUnder === "root" ? (
              <div style={{ background: "hsl(246 60% 10%)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(245,158,11,0.3)" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  {LEVEL_ORDER.map(l => (
                    <button key={l} onClick={() => setNewLevel(l)} style={{
                      padding: "4px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: "0.7rem", fontWeight: 600,
                      background: newLevel === l ? LEVEL_CONFIG[l].color : "rgba(255,255,255,0.06)",
                      color: newLevel === l ? "#fff" : "rgba(255,255,255,0.4)",
                    }}>{LEVEL_CONFIG[l].label}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={newText} onChange={e => setNewText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addItem(null); if (e.key === "Escape") setAddingUnder(null); }}
                    autoFocus placeholder={`New ${LEVEL_CONFIG[newLevel].label}…`}
                    style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 12px", color: "#f8fafc", fontSize: "0.82rem", outline: "none" }} />
                  <button onClick={() => addItem(null)} style={{ padding: "8px 14px", borderRadius: 10, background: "#f59e0b", border: "none", color: "#fff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>Add</button>
                  <button onClick={() => setAddingUnder(null)} style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "0.8rem" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setAddingUnder("root"); setNewLevel("vision"); setNewText(""); }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "0.82rem" }}>
                <Plus size={16} /> Add Vision / Goal
              </button>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
