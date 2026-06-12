import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Clock, Plus, Trash2, Sparkles, Sun, Moon, Dumbbell, BookOpen,
  Coffee, Zap, Utensils, Gamepad2, Music, Loader2, Edit2, Check, X,
  RefreshCw, Play, Square, CheckCircle2, Circle, Save, ChevronDown,
  ChevronUp, Send, BookmarkPlus, Bookmark, Timer, Brain,
} from "lucide-react";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type BlockType =
  | "wake" | "sleep" | "school" | "study" | "gym"
  | "free" | "meal" | "rest" | "work" | "other";

interface ScheduleBlock {
  id: string;
  date: string;
  label: string;
  type: BlockType;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  completed: boolean;
  kanbanTaskId?: string | null;
  kanbanTaskTitle?: string | null;
}

interface CustomTemplate {
  id: string;
  label: string;
  blocks: Omit<ScheduleBlock, "id" | "date" | "completed">[];
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<BlockType, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  wake:   { label: "Wake Up",    color: "#f59e0b", bg: "rgba(245,158,11,0.15)",  icon: <Sun size={13} /> },
  sleep:  { label: "Sleep",      color: "#7c3aed", bg: "rgba(124,58,237,0.15)",  icon: <Moon size={13} /> },
  school: { label: "School",     color: "#3b82f6", bg: "rgba(59,130,246,0.15)",  icon: <BookOpen size={13} /> },
  study:  { label: "Study",      color: "#06b6d4", bg: "rgba(6,182,212,0.15)",   icon: <Zap size={13} /> },
  gym:    { label: "Gym",        color: "#10b981", bg: "rgba(16,185,129,0.15)",  icon: <Dumbbell size={13} /> },
  free:   { label: "Free Time",  color: "#a855f7", bg: "rgba(168,85,247,0.15)",  icon: <Gamepad2 size={13} /> },
  meal:   { label: "Meal",       color: "#f97316", bg: "rgba(249,115,22,0.15)",  icon: <Utensils size={13} /> },
  rest:   { label: "Rest",       color: "#64748b", bg: "rgba(100,116,139,0.15)", icon: <Coffee size={13} /> },
  work:   { label: "Work",       color: "#ec4899", bg: "rgba(236,72,153,0.15)",  icon: <Music size={13} /> },
  other:  { label: "Other",      color: "#94a3b8", bg: "rgba(148,163,184,0.15)", icon: <Clock size={13} /> },
};

const BUILT_IN_TEMPLATES: { label: string; emoji: string; blocks: Omit<ScheduleBlock, "id" | "date" | "completed">[] }[] = [
  {
    label: "School Day", emoji: "🏫",
    blocks: [
      { label: "Wake Up & Morning Routine", type: "wake",   startHour: 6,  startMin: 0,  endHour: 7,  endMin: 0 },
      { label: "Breakfast",                 type: "meal",   startHour: 7,  startMin: 0,  endHour: 7,  endMin: 30 },
      { label: "School",                    type: "school", startHour: 8,  startMin: 0,  endHour: 15, endMin: 0 },
      { label: "Gym / Exercise",            type: "gym",    startHour: 16, startMin: 0,  endHour: 17, endMin: 0 },
      { label: "Dinner",                    type: "meal",   startHour: 18, startMin: 0,  endHour: 18, endMin: 30 },
      { label: "Study / Homework",          type: "study",  startHour: 19, startMin: 0,  endHour: 21, endMin: 0 },
      { label: "Free Time",                 type: "free",   startHour: 21, startMin: 0,  endHour: 22, endMin: 30 },
      { label: "Sleep",                     type: "sleep",  startHour: 22, startMin: 30, endHour: 24, endMin: 0 },
    ],
  },
  {
    label: "Rest Day", emoji: "💤",
    blocks: [
      { label: "Wake Up",        type: "wake",  startHour: 8,  startMin: 0,  endHour: 9,  endMin: 0 },
      { label: "Breakfast",      type: "meal",  startHour: 9,  startMin: 0,  endHour: 9,  endMin: 30 },
      { label: "Leisure / Rest", type: "free",  startHour: 9,  startMin: 30, endHour: 12, endMin: 0 },
      { label: "Lunch",          type: "meal",  startHour: 12, startMin: 0,  endHour: 13, endMin: 0 },
      { label: "Nap / Rest",     type: "rest",  startHour: 13, startMin: 0,  endHour: 14, endMin: 30 },
      { label: "Free Time",      type: "free",  startHour: 14, startMin: 30, endHour: 19, endMin: 0 },
      { label: "Dinner",         type: "meal",  startHour: 19, startMin: 0,  endHour: 20, endMin: 0 },
      { label: "Wind Down",      type: "rest",  startHour: 21, startMin: 0,  endHour: 22, endMin: 0 },
      { label: "Sleep",          type: "sleep", startHour: 22, startMin: 0,  endHour: 24, endMin: 0 },
    ],
  },
  {
    label: "Deep Work Day", emoji: "⚡",
    blocks: [
      { label: "Wake Up & Cold Shower",      type: "wake",   startHour: 5,  startMin: 30, endHour: 6,  endMin: 30 },
      { label: "Breakfast",                  type: "meal",   startHour: 6,  startMin: 30, endHour: 7,  endMin: 0 },
      { label: "Deep Work Block 1",          type: "study",  startHour: 7,  startMin: 0,  endHour: 8,  endMin: 30 },
      { label: "Break",                      type: "rest",   startHour: 8,  startMin: 30, endHour: 9,  endMin: 0 },
      { label: "Deep Work Block 2",          type: "study",  startHour: 9,  startMin: 0,  endHour: 10, endMin: 30 },
      { label: "School",                     type: "school", startHour: 11, startMin: 0,  endHour: 15, endMin: 0 },
      { label: "Lunch",                      type: "meal",   startHour: 15, startMin: 0,  endHour: 15, endMin: 45 },
      { label: "Gym",                        type: "gym",    startHour: 16, startMin: 0,  endHour: 17, endMin: 15 },
      { label: "Deep Work Block 3",          type: "study",  startHour: 18, startMin: 0,  endHour: 19, endMin: 30 },
      { label: "Dinner",                     type: "meal",   startHour: 19, startMin: 30, endHour: 20, endMin: 0 },
      { label: "Review & Plan Tomorrow",     type: "other",  startHour: 21, startMin: 0,  endHour: 21, endMin: 30 },
      { label: "Sleep",                      type: "sleep",  startHour: 22, startMin: 0,  endHour: 24, endMin: 0 },
    ],
  },
  {
    label: "Exam Day", emoji: "📝",
    blocks: [
      { label: "Wake Up Early",              type: "wake",   startHour: 5,  startMin: 0,  endHour: 5,  endMin: 45 },
      { label: "Light Breakfast",            type: "meal",   startHour: 5,  startMin: 45, endHour: 6,  endMin: 15 },
      { label: "Final Review Session",       type: "study",  startHour: 6,  startMin: 15, endHour: 8,  endMin: 0 },
      { label: "School / Exam",              type: "school", startHour: 8,  startMin: 0,  endHour: 13, endMin: 0 },
      { label: "Lunch & Decompress",         type: "meal",   startHour: 13, startMin: 0,  endHour: 14, endMin: 0 },
      { label: "Rest & Recovery",            type: "rest",   startHour: 14, startMin: 0,  endHour: 16, endMin: 0 },
      { label: "Light Study (Next Topics)",  type: "study",  startHour: 16, startMin: 0,  endHour: 18, endMin: 0 },
      { label: "Dinner",                     type: "meal",   startHour: 18, startMin: 0,  endHour: 18, endMin: 45 },
      { label: "Wind Down",                  type: "free",   startHour: 19, startMin: 0,  endHour: 21, endMin: 30 },
      { label: "Sleep Early",                type: "sleep",  startHour: 21, startMin: 30, endHour: 24, endMin: 0 },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 10); }
function fmtTime(h: number, m: number) {
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${m.toString().padStart(2, "0")} ${ampm}`;
}
function toMinutes(h: number, m: number) { return h * 60 + m; }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function nowMinutes() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}
function fmtElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
  return `${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
}
function blockStatus(block: ScheduleBlock): "done" | "active" | "upcoming" {
  const now = nowMinutes();
  const start = toMinutes(block.startHour, block.startMin);
  const end = toMinutes(block.endHour, block.endMin);
  if (now >= end) return "done";
  if (now >= start) return "active";
  return "upcoming";
}
function blockDuration(b: ScheduleBlock) {
  const mins = toMinutes(b.endHour, b.endMin) - toMinutes(b.startHour, b.startMin);
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.abs(mins) % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ─── Custom template localStorage ────────────────────────────────────────────

function loadCustomTemplates(): CustomTemplate[] {
  try { return JSON.parse(localStorage.getItem("grind_custom_templates") ?? "[]"); } catch { return []; }
}
function saveCustomTemplates(tpls: CustomTemplate[]) {
  localStorage.setItem("grind_custom_templates", JSON.stringify(tpls));
}

// ─── Timeline Bar ─────────────────────────────────────────────────────────────

function TimelineBar({ blocks }: { blocks: ScheduleBlock[] }) {
  const totalMins = 24 * 60;
  const nowPct = (nowMinutes() / totalMins) * 100;
  return (
    <div style={{ position: "relative", width: "100%", background: "rgba(255,255,255,0.03)", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ position: "relative", height: 52 }}>
        {Array.from({ length: 24 }, (_, h) => h).map(h => (
          <div key={h} style={{ position: "absolute", left: `${(h / 24) * 100}%`, top: 0, bottom: 0, width: "1px", background: h % 6 === 0 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)" }} />
        ))}
        {blocks.map(b => {
          const startPct = (toMinutes(b.startHour, b.startMin) / totalMins) * 100;
          const widthPct = Math.max((toMinutes(b.endHour, b.endMin) - toMinutes(b.startHour, b.startMin)) / totalMins * 100, 0.5);
          const cfg = TYPE_CONFIG[b.type];
          return (
            <div key={b.id} title={`${b.label}: ${fmtTime(b.startHour, b.startMin)} – ${fmtTime(b.endHour, b.endMin)}`}
              style={{ position: "absolute", left: `${startPct}%`, width: `${widthPct}%`, top: "8px", bottom: "8px", background: b.completed ? "rgba(16,185,129,0.7)" : cfg.color, borderRadius: 6, overflow: "hidden", boxShadow: b.completed ? "none" : `0 0 10px ${cfg.color}44`, opacity: b.completed ? 0.6 : 1, transition: "all 0.2s" }}>
              {widthPct > 4 && (
                <span style={{ fontSize: "0.58rem", color: "#fff", fontWeight: 700, whiteSpace: "nowrap", padding: "0 4px", display: "block", lineHeight: "36px" }}>
                  {b.completed ? "✓" : b.label}
                </span>
              )}
            </div>
          );
        })}
        <div style={{ position: "absolute", left: `${nowPct}%`, top: 0, bottom: 0, width: 2, background: "#F43F5E", boxShadow: "0 0 6px #F43F5E" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0 6px", position: "relative" }}>
        {[0, 6, 12, 18, 23].map(h => (
          <div key={h} style={{ position: "absolute", left: `${(h / 24) * 100}%`, transform: h === 23 ? "translateX(-100%)" : h === 0 ? "none" : "translateX(-50%)", fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", fontWeight: 500, paddingTop: 2 }}>
            {h === 0 ? "12am" : h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Block Row ────────────────────────────────────────────────────────────────

function BlockRow({
  block, isTimerActive, elapsed,
  onToggleComplete, onStartTimer, onStopTimer, onRemove, onEdit, onDeepWork,
}: {
  block: ScheduleBlock;
  isTimerActive: boolean;
  elapsed: number;
  onToggleComplete: () => void;
  onStartTimer: () => void;
  onStopTimer: () => void;
  onRemove: () => void;
  onEdit: (label: string) => void;
  onDeepWork: () => void;
}) {
  const cfg = TYPE_CONFIG[block.type];
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(block.label);
  const [hovered, setHovered] = useState(false);

  const duration = blockDuration(block);
  const totalSecs = (toMinutes(block.endHour, block.endMin) - toMinutes(block.startHour, block.startMin)) * 60;
  const progressPct = isTimerActive ? Math.min((elapsed / totalSecs) * 100, 100) : block.completed ? 100 : 0;

  const save = () => {
    if (editLabel.trim()) onEdit(editLabel.trim());
    setEditing(false);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14,
        background: block.completed ? "rgba(16,185,129,0.07)" : isTimerActive ? cfg.bg : hovered ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${block.completed ? "rgba(16,185,129,0.25)" : isTimerActive ? cfg.color + "55" : hovered ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)"}`,
        transition: "all 0.18s", position: "relative", overflow: "hidden",
      }}
    >
      {(isTimerActive || block.completed) && (
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${progressPct}%`, background: block.completed ? "rgba(16,185,129,0.1)" : `${cfg.color}18`, transition: "width 1s linear", pointerEvents: "none" }} />
      )}

      <button onClick={onToggleComplete} style={{ width: 26, height: 26, borderRadius: "50%", border: "none", cursor: "pointer", flexShrink: 0, background: block.completed ? "#10b981" : "rgba(255,255,255,0.07)", color: block.completed ? "#fff" : "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.18s", zIndex: 1 }}>
        {block.completed ? <CheckCircle2 size={14} /> : <Circle size={14} />}
      </button>

      <div style={{ flexShrink: 0, zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.color, display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontSize: "0.68rem", color: cfg.color, fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
            {fmtTime(block.startHour, block.startMin)} – {fmtTime(block.endHour, block.endMin)}
          </span>
        </div>
        <div style={{ display: "flex", gap: 5, paddingLeft: 13 }}>
          <span style={{ fontSize: "0.6rem", padding: "1px 6px", borderRadius: 20, background: cfg.bg, color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
          <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.25)" }}>{duration}</span>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
        {editing ? (
          <input autoFocus value={editLabel} onChange={e => setEditLabel(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
            style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 7, padding: "4px 8px", color: "#f8fafc", fontSize: "0.82rem", outline: "none", boxSizing: "border-box" }} />
        ) : (
          <>
            <span style={{ fontSize: "0.86rem", fontWeight: 600, color: block.completed ? "rgba(255,255,255,0.45)" : "#f8fafc", textDecoration: block.completed ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
              {block.label}
            </span>
            {block.kanbanTaskTitle && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 3, padding: "2px 7px", borderRadius: 20, background: "rgba(116,103,240,0.12)", border: "1px solid rgba(116,103,240,0.25)", fontSize: "0.62rem", fontWeight: 600, color: "#a78bfa" }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                {block.kanbanTaskTitle}
              </span>
            )}
          </>
        )}
      </div>

      {isTimerActive && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0, zIndex: 1 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, animation: "pulse 1s infinite" }} />
          <span style={{ fontSize: "0.85rem", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: cfg.color }}>{fmtElapsed(elapsed)}</span>
        </div>
      )}

      <div style={{ display: "flex", gap: 4, flexShrink: 0, zIndex: 1, opacity: hovered || isTimerActive ? 1 : 0, transition: "opacity 0.15s" }}>
        {editing ? (
          <>
            <button onClick={save} style={{ width: 26, height: 26, border: "none", borderRadius: 7, background: "rgba(16,185,129,0.2)", color: "#10b981", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={11} /></button>
            <button onClick={() => setEditing(false)} style={{ width: 26, height: 26, border: "none", borderRadius: 7, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={11} /></button>
          </>
        ) : (
          <>
            {!block.completed && (
              isTimerActive ? (
                <button onClick={onStopTimer} title="Stop timer" style={{ width: 26, height: 26, border: "none", borderRadius: 7, background: "rgba(244,63,94,0.2)", color: "#F43F5E", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Square size={10} /></button>
              ) : (
                <button onClick={onStartTimer} title="Start focus timer" style={{ width: 26, height: 26, border: "none", borderRadius: 7, background: cfg.bg, color: cfg.color, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Play size={10} /></button>
              )
            )}
            {!block.completed && (
              <button onClick={onDeepWork} title="Open in Deep Work timer" style={{ width: 26, height: 26, border: "none", borderRadius: 7, background: "rgba(124,58,237,0.15)", color: "#a78bfa", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Brain size={10} /></button>
            )}
            <button onClick={() => setEditing(true)} style={{ width: 26, height: 26, border: "none", borderRadius: 7, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Edit2 size={10} /></button>
            <button onClick={onRemove} style={{ width: 26, height: 26, border: "none", borderRadius: 7, background: "rgba(244,63,94,0.06)", color: "rgba(244,63,94,0.5)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={10} /></button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Add Block Form ───────────────────────────────────────────────────────────

function AddBlockForm({ onAdd, saving }: { onAdd: (b: Omit<ScheduleBlock, "id" | "date" | "completed">) => Promise<void>; saving: boolean }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<BlockType>("school");
  const [startH, setStartH] = useState(7);
  const [startM, setStartM] = useState(0);
  const [endH, setEndH] = useState(8);
  const [endM, setEndM] = useState(0);
  const [error, setError] = useState("");

  const timeOptions = Array.from({ length: 24 * 4 + 1 }, (_, i) => {
    const h = Math.min(Math.floor(i / 4), 24);
    const m = h === 24 ? 0 : (i % 4) * 15;
    return { h, m, label: h === 24 ? "12:00 AM (end)" : fmtTime(h, m) };
  }).filter((o, i, arr) => i === 0 || !(o.h === arr[i-1].h && o.m === arr[i-1].m));

  const submit = async () => {
    if (!label.trim()) { setError("Give this block a name."); return; }
    if (toMinutes(endH, endM) <= toMinutes(startH, startM)) { setError("End time must be after start time."); return; }
    setError("");
    await onAdd({ label: label.trim(), type, startHour: startH, startMin: startM, endHour: endH, endMin: endM });
    setLabel(""); setOpen(false);
  };

  return (
    <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", background: "none", border: "none", cursor: "pointer", color: "#f8fafc" }}>
        <Plus size={15} color="#7467F0" />
        <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>Add Time Block</span>
        <div style={{ marginLeft: "auto" }}>{open ? <ChevronUp size={14} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={14} color="rgba(255,255,255,0.3)" />}</div>
      </button>
      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ marginTop: 14, marginBottom: 12 }}>
            <label style={{ fontSize: "0.67rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 5 }}>Block Name</label>
            <input value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="e.g. Math class, Lunch, Gym session…" style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "8px 12px", color: "#f8fafc", fontSize: "0.82rem", outline: "none", fontFamily: "inherit" }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: "0.67rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 5 }}>Type</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {(Object.keys(TYPE_CONFIG) as BlockType[]).map(t => {
                const cfg = TYPE_CONFIG[t]; const sel = type === t;
                return <button key={t} onClick={() => setType(t)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 7, border: "none", cursor: "pointer", background: sel ? cfg.bg : "rgba(255,255,255,0.04)", color: sel ? cfg.color : "rgba(255,255,255,0.4)", fontSize: "0.7rem", fontWeight: sel ? 700 : 500, outline: sel ? `1.5px solid ${cfg.color}55` : "none" }}>{cfg.icon} {cfg.label}</button>;
              })}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {[{ lbl: "Start Time", h: startH, m: startM, setH: setStartH, setM: setStartM }, { lbl: "End Time", h: endH, m: endM, setH: setEndH, setM: setEndM }].map(({ lbl, h, m, setH, setM }) => (
              <div key={lbl}>
                <label style={{ fontSize: "0.67rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 5 }}>{lbl}</label>
                <select value={`${h}:${m}`} onChange={e => { const [hh, mm] = e.target.value.split(":").map(Number); setH(hh); setM(mm); }} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "8px 10px", color: "#f8fafc", fontSize: "0.78rem", outline: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  {timeOptions.map(o => <option key={`${o.h}:${o.m}`} value={`${o.h}:${o.m}`} style={{ background: "#1a1040" }}>{o.label}</option>)}
                </select>
              </div>
            ))}
          </div>
          {error && <p style={{ color: "#F43F5E", fontSize: "0.73rem", margin: "0 0 10px" }}>{error}</p>}
          <button onClick={submit} disabled={saving} style={{ width: "100%", padding: "9px", borderRadius: 10, border: "none", background: saving ? "rgba(116,103,240,0.4)" : "linear-gradient(135deg, #7467F0, #7c3aed)", color: "#fff", fontSize: "0.8rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
            {saving ? <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} /> : <Plus size={14} />}
            {saving ? "Saving…" : "Add Block"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── AI Quick Planner ─────────────────────────────────────────────────────────

function AIQuickPlanner({ onRefresh }: { onRefresh: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState("");

  const send = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true); setReply("");
    const msg = `Please build me a daily schedule for today. ${prompt}. Clear the existing schedule first, then create the blocks on the Daily Schedule page.`;
    try {
      const res = await api.post<{ message: string }>("/ai-assistant/chat", { userMessage: msg, history: [] });
      setReply(res.message);
      setTimeout(onRefresh, 1500);
    } catch {
      setReply("Couldn't reach JARVIS — make sure the API server is running.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ background: "rgba(245,158,11,0.06)", borderRadius: 14, border: "1px solid rgba(245,158,11,0.2)", padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <Sparkles size={14} color="#f59e0b" />
        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#f8fafc" }}>Ask JARVIS to plan your day</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder='e.g. "school day, wake at 6am, gym after school"' style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "8px 12px", color: "#f8fafc", fontSize: "0.8rem", outline: "none", fontFamily: "inherit" }} />
        <button onClick={send} disabled={loading || !prompt.trim()} style={{ width: 36, height: 36, borderRadius: 9, border: "none", background: loading || !prompt.trim() ? "rgba(245,158,11,0.2)" : "linear-gradient(135deg, #f59e0b, #f97316)", color: "#fff", cursor: loading || !prompt.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {loading ? <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> : <Send size={13} />}
        </button>
      </div>
      {reply && <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 9, fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{reply}</div>}
    </div>
  );
}

// ─── Templates Panel ──────────────────────────────────────────────────────────

function TemplatesPanel({ blocks, onApply, onSaveCustom, customTemplates, onDeleteCustom, saving }: {
  blocks: ScheduleBlock[];
  onApply: (tpl: { label: string; blocks: Omit<ScheduleBlock, "id"|"date"|"completed">[] }) => void;
  onSaveCustom: (name: string) => void;
  customTemplates: CustomTemplate[];
  onDeleteCustom: (id: string) => void;
  saving: boolean;
}) {
  const [saveName, setSaveName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const doSave = () => {
    if (saveName.trim() && blocks.length > 0) { onSaveCustom(saveName.trim()); setSaveName(""); setShowSave(false); }
  };

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.07)", padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Bookmark size={14} color="#7467F0" />
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#f8fafc" }}>Schedule Templates</span>
        </div>
        {blocks.length > 0 && (
          <button onClick={() => setShowSave(s => !s)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(116,103,240,0.3)", background: "rgba(116,103,240,0.1)", color: "#7467F0", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>
            <BookmarkPlus size={11} /> Save Current
          </button>
        )}
      </div>
      {showSave && (
        <div style={{ display: "flex", gap: 7, marginBottom: 12 }}>
          <input autoFocus value={saveName} onChange={e => setSaveName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") doSave(); if (e.key === "Escape") setShowSave(false); }} placeholder='Template name, e.g. "My School Day"' style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(116,103,240,0.4)", borderRadius: 8, padding: "7px 11px", color: "#f8fafc", fontSize: "0.78rem", outline: "none", fontFamily: "inherit" }} />
          <button onClick={doSave} disabled={!saveName.trim()} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: saveName.trim() ? "#7467F0" : "rgba(116,103,240,0.3)", color: "#fff", fontSize: "0.78rem", fontWeight: 700, cursor: saveName.trim() ? "pointer" : "not-allowed" }}><Save size={12} /></button>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <p style={{ fontSize: "0.63rem", fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 0.7, margin: "0 0 4px" }}>Built-in</p>
        {BUILT_IN_TEMPLATES.map(tpl => (
          <button key={tpl.label} onClick={() => !saving && onApply(tpl)} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#f8fafc", fontSize: "0.78rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", textAlign: "left", transition: "all 0.15s" }}
            onMouseEnter={e => { if (!saving) { e.currentTarget.style.background = "rgba(116,103,240,0.1)"; e.currentTarget.style.borderColor = "rgba(116,103,240,0.3)"; }}}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}>
            <span style={{ fontSize: "1rem" }}>{tpl.emoji}</span>
            <span style={{ flex: 1 }}>{tpl.label}</span>
            <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.25)" }}>{tpl.blocks.length} blocks</span>
          </button>
        ))}
        {customTemplates.length > 0 && (
          <>
            <p style={{ fontSize: "0.63rem", fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 0.7, margin: "8px 0 4px" }}>Your Templates</p>
            {customTemplates.map(tpl => (
              <div key={tpl.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => !saving && onApply(tpl)} disabled={saving} style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(116,103,240,0.2)", background: "rgba(116,103,240,0.07)", color: "#f8fafc", fontSize: "0.78rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", textAlign: "left", transition: "all 0.15s" }}
                  onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "rgba(116,103,240,0.15)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(116,103,240,0.07)"; }}>
                  <BookmarkPlus size={13} color="#7467F0" />
                  <span style={{ flex: 1 }}>{tpl.label}</span>
                  <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.25)" }}>{tpl.blocks.length} blocks</span>
                </button>
                <button onClick={() => onDeleteCustom(tpl.id)} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "rgba(244,63,94,0.08)", color: "rgba(244,63,94,0.5)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Trash2 size={11} /></button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Progress Header ──────────────────────────────────────────────────────────

function ProgressHeader({ blocks }: { blocks: ScheduleBlock[] }) {
  const total = blocks.length;
  const done = blocks.filter(b => b.completed).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const nowMins = nowMinutes();
  const currentBlock = [...blocks].sort((a, b) => toMinutes(a.startHour, a.startMin) - toMinutes(b.startHour, b.startMin))
    .find(b => nowMins >= toMinutes(b.startHour, b.startMin) && nowMins < toMinutes(b.endHour, b.endMin));

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
      <div style={{ flex: 1, minWidth: 160, background: "rgba(116,103,240,0.1)", borderRadius: 12, border: "1px solid rgba(116,103,240,0.2)", padding: "12px 16px" }}>
        <div style={{ fontSize: "0.67rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 4 }}>Day Progress</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "#7467F0", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>{done}/{total} done</span>
        </div>
        <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #7467F0, #06b6d4)", borderRadius: 99, transition: "width 0.4s ease" }} />
        </div>
      </div>
      {currentBlock && (
        <div style={{ flex: 1, minWidth: 160, background: TYPE_CONFIG[currentBlock.type].bg, borderRadius: 12, border: `1px solid ${TYPE_CONFIG[currentBlock.type].color}44`, padding: "12px 16px" }}>
          <div style={{ fontSize: "0.67rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 4 }}>Now</div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ color: TYPE_CONFIG[currentBlock.type].color }}>{TYPE_CONFIG[currentBlock.type].icon}</span>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#f8fafc" }}>{currentBlock.label}</span>
          </div>
          <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Until {fmtTime(currentBlock.endHour, currentBlock.endMin)}</div>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 160, background: "rgba(16,185,129,0.08)", borderRadius: 12, border: "1px solid rgba(16,185,129,0.2)", padding: "12px 16px" }}>
        <div style={{ fontSize: "0.67rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 4 }}>Completed</div>
        <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#10b981", fontVariantNumeric: "tabular-nums" }}>{done}</div>
        <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>{total - done} remaining</div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DailySchedulePage() {
  const [, navigate] = useLocation();
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const date = todayStr();
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [timerStart, setTimerStart] = useState<number>(0);
  const [elapsed, setElapsed] = useState<number>(0);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>(loadCustomTemplates);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (activeTimerId) {
      intervalRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - timerStart) / 1000)), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeTimerId, timerStart]);

  const loadBlocks = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.get<ScheduleBlock[]>(`/daily-schedule?date=${date}`);
      setBlocks(rows);
    } catch {} finally { setLoading(false); }
  }, [date]);

  useEffect(() => { loadBlocks(); }, [loadBlocks]);
  useEffect(() => { const iv = setInterval(loadBlocks, 10000); return () => clearInterval(iv); }, [loadBlocks]);

  const addBlock = async (b: Omit<ScheduleBlock, "id" | "date" | "completed">) => {
    setSaving(true);
    try {
      const created = await api.post<ScheduleBlock>("/daily-schedule", { ...b, date });
      setBlocks(prev => [...prev, created]);
    } finally { setSaving(false); }
  };

  const removeBlock = async (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (activeTimerId === id) { setActiveTimerId(null); setElapsed(0); }
    try { await api.delete(`/daily-schedule/${id}`); } catch { loadBlocks(); }
  };

  const editBlock = (id: string, label: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, label } : b));
  };

  const clearAll = async () => {
    setBlocks([]); setActiveTimerId(null); setElapsed(0);
    try { await api.delete(`/daily-schedule?date=${date}`); } catch { loadBlocks(); }
  };

  const applyTemplate = async (tpl: { label: string; blocks: Omit<ScheduleBlock, "id" | "date" | "completed">[] }) => {
    setSaving(true);
    try {
      await api.delete(`/daily-schedule?date=${date}`);
      setActiveTimerId(null); setElapsed(0);
      const created: ScheduleBlock[] = [];
      for (const b of tpl.blocks) {
        const row = await api.post<ScheduleBlock>("/daily-schedule", { ...b, date });
        created.push(row);
      }
      setBlocks(created);
    } finally { setSaving(false); }
  };

  const toggleComplete = async (id: string) => {
    const block = blocks.find(b => b.id === id);
    if (!block) return;
    const newCompleted = !block.completed;
    // Optimistic update
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, completed: newCompleted } : b));
    if (newCompleted && activeTimerId === id) { setActiveTimerId(null); setElapsed(0); }
    try {
      await api.patch(`/daily-schedule/${id}`, { completed: newCompleted });
    } catch {
      // Revert on failure
      setBlocks(prev => prev.map(b => b.id === id ? { ...b, completed: !newCompleted } : b));
    }
  };

  const startTimer = (id: string) => { setActiveTimerId(id); setTimerStart(Date.now()); setElapsed(0); };
  const stopTimer = () => { setActiveTimerId(null); setElapsed(0); };

  const saveCustomTemplate = (name: string) => {
    const tpl: CustomTemplate = {
      id: uid(), label: name,
      blocks: blocks.map(({ label, type, startHour, startMin, endHour, endMin }) => ({ label, type, startHour, startMin, endHour, endMin })),
    };
    const updated = [...customTemplates, tpl];
    setCustomTemplates(updated); saveCustomTemplates(updated);
  };

  const deleteCustomTemplate = (id: string) => {
    const updated = customTemplates.filter(t => t.id !== id);
    setCustomTemplates(updated); saveCustomTemplates(updated);
  };

  const sorted = [...blocks].sort((a, b) => toMinutes(a.startHour, a.startMin) - toMinutes(b.startHour, b.startMin));
  const doneCount = blocks.filter(b => b.completed).length;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "28px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <Timer size={22} color="#7467F0" />
              <h1 style={{ color: "#f8fafc", fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Daily Schedule</h1>
              <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>
                {new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
              </span>
            </div>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.82rem", margin: 0 }}>Plan your day, start your blocks, and track every session.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {blocks.length > 0 && (
              <button onClick={clearAll} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 13px", borderRadius: 9, border: "1px solid rgba(244,63,94,0.2)", background: "rgba(244,63,94,0.06)", color: "#F43F5E", fontSize: "0.74rem", fontWeight: 600, cursor: "pointer" }}>
                <Trash2 size={12} /> Clear Day
              </button>
            )}
            <button onClick={loadBlocks} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 13px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: "0.74rem", cursor: "pointer" }}>
              <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
            </button>
          </div>
        </div>

        {blocks.length > 0 && <ProgressHeader blocks={blocks} />}
        <div style={{ marginBottom: 20 }}><TimelineBar blocks={blocks} /></div>

        {activeTimerId && (() => {
          const b = blocks.find(x => x.id === activeTimerId);
          if (!b) return null;
          const cfg = TYPE_CONFIG[b.type];
          return (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderRadius: 14, background: `${cfg.color}18`, border: `1px solid ${cfg.color}44`, marginBottom: 20 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.color, animation: "pulse 1s infinite", flexShrink: 0 }} />
              <span style={{ color: cfg.color }}>{cfg.icon}</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>Focus: {b.label}</span>
                <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginLeft: 10 }}>{fmtTime(b.startHour, b.startMin)} – {fmtTime(b.endHour, b.endMin)}</span>
              </div>
              <span style={{ fontSize: "1.4rem", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: cfg.color }}>{fmtElapsed(elapsed)}</span>
              <button onClick={() => { toggleComplete(activeTimerId); stopTimer(); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, border: "none", background: "#10b981", color: "#fff", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>
                <CheckCircle2 size={13} /> Done
              </button>
              <button onClick={stopTimer} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 9, border: "1px solid rgba(244,63,94,0.3)", background: "rgba(244,63,94,0.1)", color: "#F43F5E", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                <Square size={11} /> Stop
              </button>
            </div>
          );
        })()}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {loading && blocks.length === 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "40px 0", color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>
                <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Loading your schedule…
              </div>
            )}
            {!loading && blocks.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.2)" }}>
                <Timer size={36} style={{ marginBottom: 12, opacity: 0.2 }} />
                <p style={{ margin: "0 0 6px", fontSize: "0.95rem", fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>No blocks yet</p>
                <p style={{ margin: 0, fontSize: "0.8rem" }}>Pick a template on the right, ask JARVIS, or add blocks manually.</p>
              </div>
            )}
            {sorted.length > 0 && (
              <>
                <div style={{ display: "flex", gap: 10, marginBottom: 4 }}>
                  {(["upcoming","active","done"] as const).map(s => {
                    const count = sorted.filter(b => {
                      if (b.completed) return s === "done";
                      return blockStatus(b) === s;
                    }).length;
                    const colors: Record<string, string> = { upcoming: "#94a3b8", active: "#f59e0b", done: "#10b981" };
                    return count > 0 ? (
                      <div key={s} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: `${colors[s]}18`, border: `1px solid ${colors[s]}33` }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors[s], display: "inline-block" }} />
                        <span style={{ fontSize: "0.68rem", fontWeight: 600, color: colors[s], textTransform: "capitalize" }}>{count} {s}</span>
                      </div>
                    ) : null;
                  })}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {sorted.map(b => (
                    <BlockRow key={b.id} block={b}
                      isTimerActive={activeTimerId === b.id}
                      elapsed={activeTimerId === b.id ? elapsed : 0}
                      onToggleComplete={() => toggleComplete(b.id)}
                      onStartTimer={() => startTimer(b.id)}
                      onStopTimer={stopTimer}
                      onRemove={() => removeBlock(b.id)}
                      onEdit={(label) => editBlock(b.id, label)}
                      onDeepWork={() => navigate(`/dashboard/deep-work?blockId=${b.id}&label=${encodeURIComponent(b.label)}`)}
                    />
                  ))}
                </div>
              </>
            )}
            {blocks.length > 0 && doneCount === blocks.length && (
              <div style={{ textAlign: "center", padding: "20px", background: "rgba(16,185,129,0.08)", borderRadius: 14, border: "1px solid rgba(16,185,129,0.2)", marginTop: 8 }}>
                <div style={{ fontSize: "1.8rem", marginBottom: 6 }}>🎉</div>
                <p style={{ margin: "0 0 4px", fontSize: "0.95rem", fontWeight: 700, color: "#10b981" }}>Day Complete!</p>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "rgba(255,255,255,0.4)" }}>You crushed every block. JARVIS would be proud.</p>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <AIQuickPlanner onRefresh={loadBlocks} />
            <AddBlockForm onAdd={addBlock} saving={saving} />
            <TemplatesPanel blocks={blocks} onApply={applyTemplate} onSaveCustom={saveCustomTemplate} customTemplates={customTemplates} onDeleteCustom={deleteCustomTemplate} saving={saving} />
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
