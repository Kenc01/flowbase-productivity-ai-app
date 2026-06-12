import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Clock, Plus, Trash2, Sparkles, Sun, Moon, Dumbbell, BookOpen,
  Coffee, Zap, Utensils, Gamepad2, Music, Loader2, ChevronRight, Edit2, Check, X,
  RefreshCw,
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

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function uid() { return Math.random().toString(36).slice(2, 10); }

function fmtTime(h: number, m: number) {
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function toMinutes(h: number, m: number) { return h * 60 + m; }

function blockDurationLabel(b: ScheduleBlock) {
  const mins = toMinutes(b.endHour, b.endMin) - toMinutes(b.startHour, b.startMin);
  if (mins <= 0) return "";
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.abs(mins) % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

// ─── Timeline Visual ──────────────────────────────────────────────────────────

function TimelineBar({ blocks, onRemove }: { blocks: ScheduleBlock[]; onRemove: (id: string) => void }) {
  const totalMins = 24 * 60;
  return (
    <div style={{ position: "relative", width: "100%", background: "rgba(255,255,255,0.03)", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ position: "relative", height: 56, display: "flex" }}>
        {HOURS.map(h => (
          <div key={h} style={{
            position: "absolute", left: `${(h / 24) * 100}%`, top: 0, bottom: 0,
            width: "1px", background: h % 6 === 0 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
          }} />
        ))}
        {blocks.map(b => {
          const startPct = (toMinutes(b.startHour, b.startMin) / totalMins) * 100;
          const endPct = (toMinutes(b.endHour, b.endMin) / totalMins) * 100;
          const widthPct = Math.max(endPct - startPct, 0.5);
          const cfg = TYPE_CONFIG[b.type];
          return (
            <div key={b.id} title={`${b.label}: ${fmtTime(b.startHour, b.startMin)} – ${fmtTime(b.endHour, b.endMin)}`}
              style={{
                position: "absolute", left: `${startPct}%`, width: `${widthPct}%`,
                top: "8px", bottom: "8px", background: cfg.color, borderRadius: 6,
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", cursor: "pointer", boxShadow: `0 0 10px ${cfg.color}44`,
                transition: "opacity 0.15s", minWidth: "2px",
              }}
              onClick={() => onRemove(b.id)}
            >
              {widthPct > 4 && (
                <span style={{ fontSize: "0.62rem", color: "#fff", fontWeight: 700, whiteSpace: "nowrap", padding: "0 4px", textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>
                  {b.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0 6px", position: "relative" }}>
        {[0, 6, 12, 18, 23].map(h => (
          <div key={h} style={{
            position: "absolute", left: `${(h / 24) * 100}%`,
            transform: h === 23 ? "translateX(-100%)" : h === 0 ? "none" : "translateX(-50%)",
            fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", fontWeight: 500, paddingTop: 2,
          }}>
            {h === 0 ? "12am" : h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Block Card ───────────────────────────────────────────────────────────────

function BlockCard({ block, onRemove, onEdit }: { block: ScheduleBlock; onRemove: () => void; onEdit: (label: string) => void }) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(block.label);
  const cfg = TYPE_CONFIG[block.type];

  const save = () => {
    if (editLabel.trim()) onEdit(editLabel.trim());
    setEditing(false);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 12px", borderRadius: 11,
        background: hovered ? cfg.bg : "rgba(255,255,255,0.04)",
        border: `1px solid ${hovered ? cfg.color + "44" : "rgba(255,255,255,0.07)"}`,
        transition: "all 0.15s",
      }}
    >
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
      <div style={{ fontSize: "0.72rem", color: cfg.color, fontWeight: 700, fontVariantNumeric: "tabular-nums", flexShrink: 0, minWidth: 90 }}>
        {fmtTime(block.startHour, block.startMin)} – {fmtTime(block.endHour, block.endMin)}
      </div>
      {editing ? (
        <input autoFocus value={editLabel} onChange={e => setEditLabel(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          style={{ flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "3px 8px", color: "#f8fafc", fontSize: "0.8rem", outline: "none" }}
        />
      ) : (
        <span style={{ flex: 1, fontSize: "0.82rem", color: "#f8fafc", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {block.label}
        </span>
      )}
      <span style={{ fontSize: "0.62rem", fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: cfg.bg, color: cfg.color, whiteSpace: "nowrap", flexShrink: 0 }}>
        {cfg.label}
      </span>
      <span style={{ fontSize: "0.67rem", color: "rgba(255,255,255,0.3)", flexShrink: 0, minWidth: 30, textAlign: "right" }}>
        {blockDurationLabel(block)}
      </span>
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        {editing ? (
          <>
            <button onClick={save} style={{ width: 24, height: 24, border: "none", borderRadius: 6, background: "rgba(16,185,129,0.2)", color: "#10b981", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Check size={11} strokeWidth={2.5} />
            </button>
            <button onClick={() => setEditing(false)} style={{ width: 24, height: 24, border: "none", borderRadius: 6, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={11} strokeWidth={2.5} />
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)} style={{ width: 24, height: 24, border: "none", borderRadius: 6, background: hovered ? "rgba(255,255,255,0.08)" : "transparent", color: "rgba(255,255,255,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.1s" }}>
              <Edit2 size={11} strokeWidth={2} />
            </button>
            <button onClick={onRemove} style={{ width: 24, height: 24, border: "none", borderRadius: 6, background: hovered ? "rgba(244,63,94,0.15)" : "transparent", color: hovered ? "#F43F5E" : "rgba(255,255,255,0.2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.1s" }}>
              <Trash2 size={11} strokeWidth={2} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── AI Panel ─────────────────────────────────────────────────────────────────

function AIPanel({ blocks }: { blocks: ScheduleBlock[] }) {
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [asked, setAsked] = useState(false);

  const analyze = async () => {
    if (blocks.length === 0) return;
    setLoading(true); setFeedback(""); setAsked(true);
    try {
      const scheduleText = [...blocks]
        .sort((a, b) => toMinutes(a.startHour, a.startMin) - toMinutes(b.startHour, b.startMin))
        .map(b => `${fmtTime(b.startHour, b.startMin)} – ${fmtTime(b.endHour, b.endMin)}: ${b.label} (${TYPE_CONFIG[b.type].label})`)
        .join("\n");
      const prompt = `Here is my planned 24-hour daily schedule:\n\n${scheduleText}\n\nAnalyze this schedule. Look at: sleep quality, balance between work/school and rest, gym timing, free time placement, and overall structure. Give me direct, honest feedback and 2-3 specific improvements I can make. Keep it tight and actionable.`;
      const res = await api.post<{ message: string }>("/ai-assistant/chat", { userMessage: prompt, history: [] });
      setFeedback(res.message);
    } catch {
      setFeedback("Couldn't reach AI — check that the backend is running and GROQ_API_KEY is set.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "hsl(246 60% 10%)", borderRadius: 18, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
      <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={15} color="#f59e0b" />
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#f8fafc" }}>AI Schedule Review</span>
          </div>
          <button onClick={analyze} disabled={loading || blocks.length === 0}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 10, border: "none", cursor: blocks.length === 0 ? "not-allowed" : "pointer",
              background: blocks.length === 0 ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #f59e0b, #f97316)",
              color: blocks.length === 0 ? "rgba(255,255,255,0.3)" : "#fff",
              fontSize: "0.76rem", fontWeight: 700, transition: "all 0.2s", opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} /> : <Sparkles size={13} />}
            {loading ? "Analyzing…" : "Analyze My Day"}
          </button>
        </div>
        <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", margin: "6px 0 0" }}>
          {blocks.length === 0
            ? "Add blocks to your schedule first, then get AI feedback."
            : `${blocks.length} block${blocks.length !== 1 ? "s" : ""} ready — click Analyze to get personalized feedback.`}
        </p>
      </div>
      <div style={{ padding: "16px 20px", minHeight: 120 }}>
        {!asked && !loading && (
          <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(255,255,255,0.2)", fontSize: "0.8rem" }}>
            <Sparkles size={28} style={{ marginBottom: 10, opacity: 0.3 }} />
            <p style={{ margin: 0 }}>Your AI coach will review your schedule and give you honest, actionable feedback.</p>
          </div>
        )}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0", color: "rgba(255,255,255,0.4)" }}>
            <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite", color: "#f59e0b" }} />
            <span style={{ fontSize: "0.8rem" }}>Reading your schedule…</span>
          </div>
        )}
        {feedback && !loading && (
          <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.8)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {feedback}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Add Block Form ───────────────────────────────────────────────────────────

function AddBlockForm({ onAdd, saving }: { onAdd: (b: Omit<ScheduleBlock, "id" | "date">) => Promise<void>; saving: boolean }) {
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
  }).filter((o, i, arr) => i === 0 || !(o.h === arr[i - 1].h && o.m === arr[i - 1].m));

  const submit = async () => {
    if (!label.trim()) { setError("Give this block a name."); return; }
    if (toMinutes(endH, endM) <= toMinutes(startH, startM)) { setError("End time must be after start time."); return; }
    setError("");
    await onAdd({ label: label.trim(), type, startHour: startH, startMin: startM, endHour: endH, endMin: endM });
    setLabel("");
  };

  return (
    <div style={{ background: "hsl(246 60% 10%)", borderRadius: 18, border: "1px solid rgba(255,255,255,0.07)", padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Plus size={15} color="#7467F0" />
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#f8fafc" }}>Add Time Block</span>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: "0.68rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 5 }}>Block Name</label>
        <input value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="e.g. Math class, Lunch, Gym session…"
          style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px 12px", color: "#f8fafc", fontSize: "0.82rem", outline: "none", fontFamily: "inherit" }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: "0.68rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 5 }}>Type</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {(Object.keys(TYPE_CONFIG) as BlockType[]).map(t => {
            const cfg = TYPE_CONFIG[t];
            const selected = type === t;
            return (
              <button key={t} onClick={() => setType(t)} style={{
                display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                background: selected ? cfg.bg : "rgba(255,255,255,0.04)",
                color: selected ? cfg.color : "rgba(255,255,255,0.45)",
                fontSize: "0.72rem", fontWeight: selected ? 700 : 500, transition: "all 0.15s",
                outline: selected ? `1.5px solid ${cfg.color}66` : "none",
              }}>
                {cfg.icon} {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Start Time", h: startH, m: startM, setH: setStartH, setM: setStartM },
          { label: "End Time",   h: endH,   m: endM,   setH: setEndH,   setM: setEndM   },
        ].map(({ label: lbl, h, m, setH, setM }) => (
          <div key={lbl}>
            <label style={{ fontSize: "0.68rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 5 }}>{lbl}</label>
            <select value={`${h}:${m}`} onChange={e => { const [hh, mm] = e.target.value.split(":").map(Number); setH(hh); setM(mm); }}
              style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px 10px", color: "#f8fafc", fontSize: "0.8rem", outline: "none", cursor: "pointer", fontFamily: "inherit" }}
            >
              {timeOptions.map(o => (
                <option key={`${o.h}:${o.m}`} value={`${o.h}:${o.m}`} style={{ background: "hsl(246 60% 10%)" }}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {error && <p style={{ color: "#F43F5E", fontSize: "0.75rem", margin: "0 0 10px" }}>{error}</p>}

      <button onClick={submit} disabled={saving}
        style={{
          width: "100%", padding: "10px", borderRadius: 11, border: "none",
          background: saving ? "rgba(116,103,240,0.4)" : "linear-gradient(135deg, #7467F0, #7c3aed)",
          color: "#fff", fontSize: "0.82rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          boxShadow: "0 4px 16px rgba(116,103,240,0.3)", transition: "opacity 0.15s",
        }}
      >
        {saving ? <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> : <Plus size={15} strokeWidth={2.5} />}
        {saving ? "Saving…" : "Add to Schedule"}
      </button>
    </div>
  );
}

// ─── Coverage Summary ─────────────────────────────────────────────────────────

function CoverageBar({ blocks }: { blocks: ScheduleBlock[] }) {
  const totalPlanned = blocks.reduce((acc, b) => acc + Math.max(toMinutes(b.endHour, b.endMin) - toMinutes(b.startHour, b.startMin), 0), 0);
  const pct = Math.min((totalPlanned / (24 * 60)) * 100, 100);
  const byType: Partial<Record<BlockType, number>> = {};
  for (const b of blocks) {
    const mins = Math.max(toMinutes(b.endHour, b.endMin) - toMinutes(b.startHour, b.startMin), 0);
    byType[b.type] = (byType[b.type] ?? 0) + mins;
  }
  return (
    <div style={{ background: "hsl(246 60% 10%)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.07)", padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>Day Coverage</span>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#f8fafc" }}>
          {Math.floor(totalPlanned / 60)}h {totalPlanned % 60}m of 24h
        </span>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 99, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #7467F0, #06b6d4)", borderRadius: 99, transition: "width 0.4s ease" }} />
      </div>
      {Object.entries(byType).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {(Object.entries(byType) as [BlockType, number][]).sort((a, b) => b[1] - a[1]).map(([t, mins]) => {
            const cfg = TYPE_CONFIG[t];
            const h = Math.floor(mins / 60), m = mins % 60;
            return (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, background: cfg.bg }}>
                <span style={{ color: cfg.color }}>{cfg.icon}</span>
                <span style={{ fontSize: "0.68rem", fontWeight: 600, color: cfg.color }}>{h > 0 ? `${h}h` : ""}{m > 0 ? `${m}m` : ""}</span>
                <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)" }}>{cfg.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Quick Templates ───────────────────────────────────────────────────────────

const TEMPLATES: { label: string; blocks: Omit<ScheduleBlock, "id" | "date">[] }[] = [
  {
    label: "🏫 School Day",
    blocks: [
      { label: "Wake Up & Morning Routine", type: "wake",   startHour: 6, startMin: 0, endHour: 7, endMin: 0 },
      { label: "Breakfast",                 type: "meal",   startHour: 7, startMin: 0, endHour: 7, endMin: 30 },
      { label: "School",                    type: "school", startHour: 8, startMin: 0, endHour: 15, endMin: 0 },
      { label: "Gym / Exercise",            type: "gym",    startHour: 16, startMin: 0, endHour: 17, endMin: 0 },
      { label: "Dinner",                    type: "meal",   startHour: 18, startMin: 0, endHour: 18, endMin: 30 },
      { label: "Study / Homework",          type: "study",  startHour: 19, startMin: 0, endHour: 21, endMin: 0 },
      { label: "Free Time",                 type: "free",   startHour: 21, startMin: 0, endHour: 22, endMin: 30 },
      { label: "Sleep",                     type: "sleep",  startHour: 22, startMin: 30, endHour: 24, endMin: 0 },
    ],
  },
  {
    label: "💤 Rest Day",
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
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DailySchedulePage() {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const date = todayStr();

  const loadBlocks = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.get<ScheduleBlock[]>(`/daily-schedule?date=${date}`);
      setBlocks(rows);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { loadBlocks(); }, [loadBlocks]);

  // Poll for AI-created blocks every 8s so the page updates live
  useEffect(() => {
    const interval = setInterval(loadBlocks, 8000);
    return () => clearInterval(interval);
  }, [loadBlocks]);

  const addBlock = async (b: Omit<ScheduleBlock, "id" | "date">) => {
    setSaving(true);
    try {
      const created = await api.post<ScheduleBlock>("/daily-schedule", { ...b, date });
      setBlocks(prev => [...prev, created]);
    } finally {
      setSaving(false);
    }
  };

  const removeBlock = async (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    try { await api.delete(`/daily-schedule/${id}`); }
    catch { loadBlocks(); }
  };

  const editBlock = async (id: string, label: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, label } : b));
  };

  const clearAll = async () => {
    setBlocks([]);
    try { await api.delete(`/daily-schedule?date=${date}`); }
    catch { loadBlocks(); }
  };

  const applyTemplate = async (tpl: typeof TEMPLATES[0]) => {
    setSaving(true);
    try {
      await api.delete(`/daily-schedule?date=${date}`);
      const created: ScheduleBlock[] = [];
      for (const b of tpl.blocks) {
        const row = await api.post<ScheduleBlock>("/daily-schedule", { ...b, date });
        created.push(row);
      }
      setBlocks(created);
    } finally {
      setSaving(false);
    }
  };

  const sorted = [...blocks].sort((a, b) => toMinutes(a.startHour, a.startMin) - toMinutes(b.startHour, b.startMin));

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <Clock size={22} color="#7467F0" />
              <h1 style={{ color: "#f8fafc", fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Daily Schedule</h1>
              <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", fontWeight: 500, marginLeft: 4 }}>
                {new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
              </span>
            </div>
            <button onClick={loadBlocks} title="Refresh" style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 9, padding: "6px 10px", cursor: "pointer", color: "rgba(255,255,255,0.4)",
              display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", transition: "all 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.09)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            >
              <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
            </button>
          </div>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", margin: 0 }}>
            Plan your 24 hours — ask your AI coach to build or tweak your schedule by chatting in the AI Assistant.
          </p>
        </div>

        {/* Loading state */}
        {loading && blocks.length === 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "32px 0", color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            Loading your schedule…
          </div>
        )}

        {/* Quick templates */}
        {!loading && blocks.length === 0 && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Quick Start</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {TEMPLATES.map(tpl => (
                <button key={tpl.label} onClick={() => applyTemplate(tpl)} disabled={saving}
                  style={{
                    display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#f8fafc",
                    fontSize: "0.78rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                >
                  {tpl.label} <ChevronRight size={13} style={{ opacity: 0.4 }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Timeline visual */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: "0.68rem", fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
            24-Hour Overview <span style={{ fontWeight: 400 }}>(click a block to remove)</span>
          </p>
          <TimelineBar blocks={blocks} onRemove={removeBlock} />
        </div>

        {/* Coverage */}
        {blocks.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <CoverageBar blocks={blocks} />
          </div>
        )}

        {/* Main 2-col layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 20, alignItems: "start" }}>

          {/* Left: Add form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <AddBlockForm onAdd={addBlock} saving={saving} />
            {blocks.length > 0 && (
              <button onClick={clearAll}
                style={{
                  padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(244,63,94,0.25)",
                  background: "rgba(244,63,94,0.06)", color: "#F43F5E",
                  fontSize: "0.76rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(244,63,94,0.13)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(244,63,94,0.06)"}
              >
                <Trash2 size={13} /> Clear All Blocks
              </button>
            )}
          </div>

          {/* Right: Block list + AI panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "hsl(246 60% 10%)", borderRadius: 18, border: "1px solid rgba(255,255,255,0.07)", padding: "16px 16px" }}>
              <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>
                Schedule Blocks {blocks.length > 0 && <span style={{ color: "#7467F0" }}>· {blocks.length}</span>}
              </p>
              {sorted.length === 0 ? (
                <div style={{ textAlign: "center", padding: "28px 0", color: "rgba(255,255,255,0.2)" }}>
                  <Clock size={28} style={{ marginBottom: 10, opacity: 0.25 }} />
                  <p style={{ margin: 0, fontSize: "0.8rem" }}>No blocks yet. Add your first time block or ask your AI coach to plan your day.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {sorted.map(b => (
                    <BlockCard key={b.id} block={b} onRemove={() => removeBlock(b.id)} onEdit={(label) => editBlock(b.id, label)} />
                  ))}
                </div>
              )}
            </div>
            <AIPanel blocks={blocks} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
