import React, { useState, useCallback, useRef, useEffect } from "react";
import * as LucideIcons from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StatsItem { label: string; value: string; icon?: string; change?: string; }
export interface ChecklistItem { id: string; label: string; done: boolean; streak?: string; }
export interface ListItem { id: string; label: string; sublabel?: string; tag?: string; tagColor?: string; }
export interface TableItem { columns: string[]; rows: string[][]; }
export interface FormField { label: string; type: "text" | "number" | "select" | "date" | "textarea"; placeholder?: string; options?: string[]; }
export interface ProgressItem { label: string; value: number; color?: string; }
export interface TagItem { label: string; color: string; }
export interface ChartItem { chartType: "bar" | "line" | "pie" | "donut"; label: string; }

export type SectionItem = StatsItem | ChecklistItem | ListItem | TableItem | FormField | ProgressItem | TagItem | ChartItem;

export interface AppSection {
  id: string;
  type: "stats" | "checklist" | "list" | "table" | "form" | "progress" | "tags" | "chart_placeholder";
  title: string;
  items: SectionItem[];
}

export interface AppAction { label: string; icon?: string; variant: "primary" | "secondary" | "ghost"; }

export interface AppTemplate {
  appName: string;
  description: string;
  icon: string;
  color: string;
  layout: string;
  sections: AppSection[];
  actions: AppAction[];
  sampleData: Record<string, unknown>[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function LucideIcon({ name, size = 16, color, strokeWidth = 1.8 }: {
  name: string; size?: number; color?: string; strokeWidth?: number;
}) {
  const Icon = (LucideIcons as any)[name] ?? LucideIcons.Sparkles;
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}

function hexToRgb(hex: string) {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  } catch { return "116, 103, 240"; }
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── localStorage-backed state ────────────────────────────────────────────────

function useStoredState<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void, () => void] {
  const [state, setState] = useState<T>(() => {
    if (!key) return initial;
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : initial;
    } catch { return initial; }
  });

  const set = useCallback((v: T | ((prev: T) => T)) => {
    setState(prev => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      try { if (key) localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);

  const reset = useCallback(() => {
    try { if (key) localStorage.removeItem(key); } catch {}
    setState(initial);
  }, [key, initial]);

  return [state, set, reset];
}

// Seeded deterministic values for charts
function chartVals(seed: string, count: number, min = 22, max = 92): number[] {
  const s = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: count }, (_, i) =>
    Math.round(((s * (i + 3) * 7919 + i * 137) % (max - min)) + min)
  );
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// ─── SVG Charts ───────────────────────────────────────────────────────────────

function BarChart({ color, label }: { color: string; label: string }) {
  const vals = chartVals(label, 7);
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const maxV = Math.max(...vals);
  const W = 300, H = 100, padB = 22, padL = 6;
  const barW = (W - padL * 2) / vals.length;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + padB}`} style={{ display: "block" }}>
      {vals.map((v, i) => {
        const bh = Math.max(4, (v / maxV) * H * 0.9);
        const x = padL + i * barW + barW * 0.15;
        const isMax = v === maxV;
        return (
          <g key={i}>
            <rect x={x} y={H - bh} width={barW * 0.7} height={bh} rx={3} fill={color} opacity={isMax ? 1 : 0.45} />
            {isMax && (
              <text x={x + barW * 0.35} y={H - bh - 4} textAnchor="middle" fontSize="8" fill={color} fontWeight="700" fontFamily="inherit">{v}</text>
            )}
            <text x={x + barW * 0.35} y={H + padB - 4} textAnchor="middle" fontSize="9" fill="var(--fb-text-muted)" fontFamily="inherit">{days[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ color, label }: { color: string; label: string }) {
  const vals = chartVals(label, 8);
  const W = 300, H = 100, padL = 12, padT = 10;
  const maxV = Math.max(...vals), minV = Math.min(...vals);
  const range = maxV - minV || 1;
  const pts = vals.map((v, i) => ({
    x: padL + (i * (W - padL * 2)) / (vals.length - 1),
    y: padT + ((maxV - v) / range) * (H - padT * 2),
  }));
  const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
  const area = `M ${pts[0].x} ${H} ` + pts.map(p => `L ${p.x} ${p.y}`).join(" ") + ` L ${pts[pts.length - 1].x} ${H} Z`;
  const gradId = `lg_${label.slice(0, 6).replace(/\W/g, "")}`;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} stroke="var(--fb-surface)" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

function PieChart({ color, label, donut = false }: { color: string; label: string; donut?: boolean }) {
  const vals = chartVals(label, 5, 8, 38);
  const total = vals.reduce((a, b) => a + b, 0);
  const cx = 65, cy = 65, r = 55, innerR = donut ? 32 : 0;
  const opacities = [1, 0.72, 0.5, 0.32, 0.18];
  const pieLbls = ["Cat A", "Cat B", "Cat C", "Cat D", "Cat E"];
  let angle = 0;
  const slices = vals.map((v, i) => {
    const start = angle;
    const sweep = (v / total) * 360;
    angle += sweep;
    return { start, end: angle, opacity: opacities[i], pct: Math.round((v / total) * 100), label: pieLbls[i] };
  });
  return (
    <svg width="100%" viewBox="0 0 260 130" style={{ display: "block" }}>
      {slices.map((s, i) => {
        const p1 = polar(cx, cy, r, s.start);
        const p2 = polar(cx, cy, r, s.end);
        const largeArc = s.end - s.start > 180 ? "1" : "0";
        let d: string;
        if (donut) {
          const ip1 = polar(cx, cy, innerR, s.start);
          const ip2 = polar(cx, cy, innerR, s.end);
          d = `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y} L ${ip2.x} ${ip2.y} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ip1.x} ${ip1.y} Z`;
        } else {
          d = `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`;
        }
        return <path key={i} d={d} fill={color} opacity={s.opacity} stroke="var(--fb-surface)" strokeWidth="2" />;
      })}
      {donut && (
        <>
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--fb-text)" fontFamily="inherit">{total}</text>
          <text x={cx} y={cx + 10} textAnchor="middle" fontSize="8" fill="var(--fb-text-muted)" fontFamily="inherit">total</text>
        </>
      )}
      {slices.map((s, i) => (
        <g key={i} transform={`translate(142, ${10 + i * 22})`}>
          <rect width="9" height="9" rx="2" fill={color} opacity={s.opacity} y="1" />
          <text x="14" y="10" fontSize="9" fill="var(--fb-text-muted)" fontFamily="inherit">{s.label} · {s.pct}%</text>
        </g>
      ))}
    </svg>
  );
}

// ─── Stats Section ─────────────────────────────────────────────────────────────

function StatsSection({ items, color, storageKey }: { items: StatsItem[]; color: string; storageKey: string }) {
  const [stats, setStats, resetStats] = useStoredState<StatsItem[]>(storageKey, items.map(i => ({ ...i, value: i.value ?? "—" })));
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "10px" }}>
        {stats.map((item, i) => (
          <div key={i} style={{
            background: `rgba(${hexToRgb(color)}, 0.07)`,
            border: `1px solid rgba(${hexToRgb(color)}, 0.18)`,
            borderRadius: "10px", padding: "14px 12px",
            display: "flex", flexDirection: "column", gap: "6px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.7rem", color: "var(--fb-text-muted)", fontWeight: 500 }}>{item.label}</span>
              {item.icon && <LucideIcon name={item.icon} size={14} color={color} />}
            </div>
            {editing === i ? (
              <input
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") { setStats(s => s.map((x, j) => j === i ? { ...x, value: draft } : x)); setEditing(null); }
                  if (e.key === "Escape") setEditing(null);
                }}
                onBlur={() => { setStats(s => s.map((x, j) => j === i ? { ...x, value: draft } : x)); setEditing(null); }}
                style={{
                  fontSize: "1.2rem", fontWeight: 800, color: "var(--fb-text)", background: "transparent",
                  border: "none", borderBottom: `2px solid ${color}`, outline: "none", width: "100%", fontFamily: "inherit",
                }}
              />
            ) : (
              <div
                onClick={() => { setDraft(item.value); setEditing(i); }}
                title="Click to edit"
                style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--fb-text)", lineHeight: 1, cursor: "pointer" }}
              >
                {item.value || <span style={{ opacity: 0.3, fontSize: "0.9rem" }}>click to set</span>}
              </div>
            )}
            {item.change && (
              <div style={{
                fontSize: "0.65rem", fontWeight: 600,
                color: item.change.startsWith("+") ? "#10B981" : item.change.startsWith("-") ? "#F43F5E" : "var(--fb-text-muted)",
              }}>{item.change}</div>
            )}
          </div>
        ))}
      </div>
      {stats.some(s => s.value && s.value !== "—") && (
        <button onClick={resetStats} style={{ marginTop: "8px", border: "none", background: "none", cursor: "pointer", fontSize: "0.65rem", color: "var(--fb-text-muted)", padding: "2px 0", fontFamily: "inherit" }}>
          ↺ Reset values
        </button>
      )}
    </div>
  );
}

// ─── Checklist Section ─────────────────────────────────────────────────────────

function ChecklistSection({ color, storageKey }: { items: ChecklistItem[]; color: string; storageKey: string }) {
  const [items, setItems, resetItems] = useStoredState<ChecklistItem[]>(storageKey, []);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const doneCount = items.filter(i => i.done).length;

  const addItem = () => {
    if (!newLabel.trim()) return;
    setItems(prev => [...prev, { id: uid(), label: newLabel.trim(), done: false }]);
    setNewLabel("");
    setAdding(false);
  };

  return (
    <div>
      {items.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <div style={{ height: "4px", flex: 1, borderRadius: "4px", background: "var(--fb-border)", overflow: "hidden", marginRight: "12px" }}>
            <div style={{ height: "100%", width: `${items.length ? (doneCount / items.length) * 100 : 0}%`, background: color, borderRadius: "4px", transition: "width 0.3s ease" }} />
          </div>
          <span style={{ fontSize: "0.68rem", color: "var(--fb-text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{doneCount}/{items.length}</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {items.map(item => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 12px", borderRadius: "8px", background: item.done ? `rgba(${hexToRgb(color)}, 0.06)` : "var(--fb-surface2)", border: `1px solid ${item.done ? `rgba(${hexToRgb(color)}, 0.2)` : "transparent"}`, transition: "background 0.15s" }}>
            <div
              onClick={() => setItems(prev => prev.map(x => x.id === item.id ? { ...x, done: !x.done } : x))}
              style={{ width: "18px", height: "18px", borderRadius: "5px", flexShrink: 0, border: `2px solid ${item.done ? color : "var(--fb-border)"}`, background: item.done ? color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}
            >
              {item.done && <LucideIcons.Check size={11} color="#fff" strokeWidth={3} />}
            </div>
            <span style={{ fontSize: "0.82rem", flex: 1, color: item.done ? "var(--fb-text-muted)" : "var(--fb-text)", textDecoration: item.done ? "line-through" : "none" }}>{item.label}</span>
            <button onClick={() => setItems(prev => prev.filter(x => x.id !== item.id))} style={{ border: "none", background: "none", cursor: "pointer", padding: "2px", color: "var(--fb-text-muted)", display: "flex", opacity: 0.5, flexShrink: 0 }}>
              <LucideIcons.X size={12} strokeWidth={2.5} />
            </button>
          </div>
        ))}
      </div>

      {adding ? (
        <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
          <input autoFocus value={newLabel} onChange={e => setNewLabel(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addItem(); if (e.key === "Escape") { setAdding(false); setNewLabel(""); } }} placeholder="New task..." style={{ flex: 1, padding: "7px 10px", borderRadius: "7px", border: `1.5px solid ${color}`, background: "var(--fb-surface2)", color: "var(--fb-text)", fontSize: "0.8rem", outline: "none", fontFamily: "inherit" }} />
          <button onClick={addItem} style={{ padding: "7px 12px", borderRadius: "7px", border: "none", background: color, color: "#fff", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Add</button>
          <button onClick={() => { setAdding(false); setNewLabel(""); }} style={{ padding: "7px 10px", borderRadius: "7px", border: "none", background: "var(--fb-surface2)", color: "var(--fb-text-muted)", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "8px", marginTop: "8px", alignItems: "center" }}>
          <button onClick={() => setAdding(true)} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "7px", border: `1px dashed var(--fb-border)`, background: "transparent", color: "var(--fb-text-muted)", fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit" }}>
            <LucideIcons.Plus size={13} strokeWidth={2.2} /> Add task
          </button>
          {items.length > 0 && <button onClick={resetItems} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "0.65rem", color: "var(--fb-text-muted)", fontFamily: "inherit" }}>↺ Clear all</button>}
        </div>
      )}

      {items.length === 0 && !adding && (
        <div style={{ textAlign: "center", padding: "20px", color: "var(--fb-text-muted)", fontSize: "0.78rem", opacity: 0.6 }}>
          No tasks yet — add one above
        </div>
      )}
    </div>
  );
}

// ─── List Section ─────────────────────────────────────────────────────────────

function ListSection({ color, storageKey }: { items: ListItem[]; color: string; storageKey: string }) {
  const [list, setList, resetList] = useStoredState<ListItem[]>(storageKey, []);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ label: "", sublabel: "", tag: "" });

  const addItem = () => {
    if (!draft.label.trim()) return;
    setList(prev => [...prev, { id: uid(), label: draft.label.trim(), sublabel: draft.sublabel.trim() || undefined, tag: draft.tag.trim() || undefined }]);
    setDraft({ label: "", sublabel: "", tag: "" });
    setAdding(false);
  };

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {list.map(item => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderRadius: "8px", background: "var(--fb-surface2)", border: "1px solid var(--fb-border)" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.82rem", color: "var(--fb-text)", fontWeight: 500 }}>{item.label}</div>
              {item.sublabel && <div style={{ fontSize: "0.7rem", color: "var(--fb-text-muted)", marginTop: "2px" }}>{item.sublabel}</div>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
              {item.tag && <span style={{ fontSize: "0.64rem", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", background: `rgba(${hexToRgb(color)}, 0.15)`, color }}>{item.tag}</span>}
              <button onClick={() => setList(prev => prev.filter(l => l.id !== item.id))} style={{ border: "none", background: "none", cursor: "pointer", padding: "2px", color: "var(--fb-text-muted)", display: "flex", opacity: 0.5 }}>
                <LucideIcons.X size={12} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {adding ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px", padding: "12px", background: "var(--fb-surface2)", borderRadius: "8px", border: `1px solid ${color}40` }}>
          <input autoFocus value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} onKeyDown={e => e.key === "Enter" && addItem()} placeholder="Item name *" style={{ padding: "7px 10px", borderRadius: "7px", border: "1px solid var(--fb-border)", background: "var(--fb-surface)", color: "var(--fb-text)", fontSize: "0.8rem", outline: "none", fontFamily: "inherit" }} />
          <div style={{ display: "flex", gap: "6px" }}>
            <input value={draft.sublabel} onChange={e => setDraft(d => ({ ...d, sublabel: e.target.value }))} placeholder="Detail (optional)" style={{ flex: 1, padding: "7px 10px", borderRadius: "7px", border: "1px solid var(--fb-border)", background: "var(--fb-surface)", color: "var(--fb-text)", fontSize: "0.8rem", outline: "none", fontFamily: "inherit" }} />
            <input value={draft.tag} onChange={e => setDraft(d => ({ ...d, tag: e.target.value }))} placeholder="Tag (optional)" style={{ width: "110px", padding: "7px 10px", borderRadius: "7px", border: "1px solid var(--fb-border)", background: "var(--fb-surface)", color: "var(--fb-text)", fontSize: "0.8rem", outline: "none", fontFamily: "inherit" }} />
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button onClick={addItem} style={{ padding: "7px 14px", borderRadius: "7px", border: "none", background: color, color: "#fff", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Add</button>
            <button onClick={() => { setAdding(false); setDraft({ label: "", sublabel: "", tag: "" }); }} style={{ padding: "7px 10px", borderRadius: "7px", border: "none", background: "transparent", color: "var(--fb-text-muted)", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "8px", marginTop: "8px", alignItems: "center" }}>
          <button onClick={() => setAdding(true)} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "7px", border: `1px dashed var(--fb-border)`, background: "transparent", color: "var(--fb-text-muted)", fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit" }}>
            <LucideIcons.Plus size={13} strokeWidth={2.2} /> Add item
          </button>
          {list.length > 0 && <button onClick={resetList} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "0.65rem", color: "var(--fb-text-muted)", fontFamily: "inherit" }}>↺ Clear all</button>}
        </div>
      )}

      {list.length === 0 && !adding && (
        <div style={{ textAlign: "center", padding: "20px", color: "var(--fb-text-muted)", fontSize: "0.78rem", opacity: 0.6 }}>
          No entries yet — add one above
        </div>
      )}
    </div>
  );
}

// ─── Table Section ─────────────────────────────────────────────────────────────

function TableSection({ items, color, storageKey }: { items: TableItem[]; color: string; storageKey: string }) {
  const columns = items[0]?.columns ?? [];
  const [rows, setRows, resetRows] = useStoredState<string[][]>(storageKey, []);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [cellDraft, setCellDraft] = useState("");

  const startAdd = () => {
    setDraft(columns.map(() => ""));
    setAdding(true);
  };

  const confirmAdd = () => {
    if (draft.every(v => !v.trim())) return;
    setRows(prev => [...prev, draft.map(v => v.trim())]);
    setDraft([]);
    setAdding(false);
  };

  const startEdit = (ri: number, ci: number) => {
    setEditingCell({ row: ri, col: ci });
    setCellDraft(rows[ri][ci] ?? "");
  };

  const confirmEdit = () => {
    if (!editingCell) return;
    setRows(prev => prev.map((r, ri) => ri === editingCell.row ? r.map((c, ci) => ci === editingCell.col ? cellDraft : c) : r));
    setEditingCell(null);
  };

  if (!columns.length) return null;

  return (
    <div>
      <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--fb-border)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
          <thead>
            <tr style={{ background: "var(--fb-surface2)" }}>
              {columns.map((col, i) => (
                <th key={i} style={{ padding: "9px 12px", textAlign: "left", color: "var(--fb-text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{col}</th>
              ))}
              <th style={{ width: "36px" }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !adding && (
              <tr>
                <td colSpan={columns.length + 1} style={{ padding: "20px", textAlign: "center", color: "var(--fb-text-muted)", fontSize: "0.78rem", opacity: 0.6 }}>
                  No rows yet — click "Add row" below
                </td>
              </tr>
            )}
            {rows.map((row, ri) => (
              <tr key={ri} style={{ borderTop: "1px solid var(--fb-border)" }}>
                {columns.map((_, ci) => (
                  <td key={ci} style={{ padding: "8px 12px", color: "var(--fb-text)" }}>
                    {editingCell?.row === ri && editingCell?.col === ci ? (
                      <input
                        autoFocus
                        value={cellDraft}
                        onChange={e => setCellDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" || e.key === "Tab") confirmEdit(); if (e.key === "Escape") setEditingCell(null); }}
                        onBlur={confirmEdit}
                        style={{ width: "100%", border: `1px solid ${color}`, borderRadius: "4px", padding: "3px 6px", background: "var(--fb-surface)", color: "var(--fb-text)", fontSize: "0.78rem", outline: "none", fontFamily: "inherit" }}
                      />
                    ) : (
                      <span onClick={() => startEdit(ri, ci)} style={{ cursor: "pointer", display: "block", minHeight: "18px" }} title="Click to edit">
                        {row[ci] || <span style={{ opacity: 0.3 }}>—</span>}
                      </span>
                    )}
                  </td>
                ))}
                <td style={{ padding: "8px 6px", textAlign: "center" }}>
                  <button onClick={() => setRows(prev => prev.filter((_, i) => i !== ri))} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--fb-text-muted)", display: "flex", opacity: 0.5, padding: "2px" }}>
                    <LucideIcons.Trash2 size={12} strokeWidth={2} />
                  </button>
                </td>
              </tr>
            ))}
            {adding && (
              <tr style={{ borderTop: "1px solid var(--fb-border)", background: `rgba(${hexToRgb(color)}, 0.04)` }}>
                {draft.map((val, ci) => (
                  <td key={ci} style={{ padding: "6px 8px" }}>
                    <input
                      autoFocus={ci === 0}
                      value={val}
                      onChange={e => setDraft(d => d.map((v, i) => i === ci ? e.target.value : v))}
                      onKeyDown={e => { if (e.key === "Enter") confirmAdd(); if (e.key === "Escape") setAdding(false); }}
                      placeholder={columns[ci]}
                      style={{ width: "100%", border: `1px solid ${color}60`, borderRadius: "4px", padding: "5px 8px", background: "var(--fb-surface)", color: "var(--fb-text)", fontSize: "0.78rem", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                    />
                  </td>
                ))}
                <td style={{ padding: "6px 4px", textAlign: "center" }}>
                  <button onClick={() => setAdding(false)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--fb-text-muted)", display: "flex", padding: "2px" }}>
                    <LucideIcons.X size={13} strokeWidth={2.5} />
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: "8px", marginTop: "8px", alignItems: "center" }}>
        {!adding && (
          <button onClick={startAdd} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "7px", border: `1px dashed var(--fb-border)`, background: "transparent", color: "var(--fb-text-muted)", fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit" }}>
            <LucideIcons.Plus size={13} strokeWidth={2.2} /> Add row
          </button>
        )}
        {adding && (
          <button onClick={confirmAdd} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 14px", borderRadius: "7px", border: "none", background: color, color: "#fff", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            <LucideIcons.Check size={12} strokeWidth={2.5} /> Save row
          </button>
        )}
        {rows.length > 0 && <button onClick={resetRows} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "0.65rem", color: "var(--fb-text-muted)", fontFamily: "inherit" }}>↺ Clear all rows</button>}
      </div>
    </div>
  );
}

// ─── Form Section ─────────────────────────────────────────────────────────────

function FormSection({ items, color, storageKey }: { items: FormField[]; color: string; storageKey: string }) {
  const [log, setLog, resetLog] = useStoredState<Record<string, string>[]>(`${storageKey}-log`, []);
  const [values, setValues] = useState<Record<number, string>>({});

  const handleSubmit = () => {
    const entry: Record<string, string> = {};
    items.forEach((field, i) => { if (values[i]) entry[field.label] = values[i]; });
    if (Object.keys(entry).length === 0) return;
    setLog(prev => [{ ...entry, _ts: new Date().toLocaleString() }, ...prev]);
    setValues({});
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {items.map((field, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--fb-text-muted)" }}>{field.label}</label>
            {field.type === "textarea" ? (
              <textarea value={values[i] ?? ""} onChange={e => setValues(v => ({ ...v, [i]: e.target.value }))} placeholder={field.placeholder ?? ""} rows={3} style={{ background: "var(--fb-surface2)", border: "1px solid var(--fb-border)", borderRadius: "7px", padding: "8px 10px", fontSize: "0.8rem", color: "var(--fb-text)", resize: "vertical", outline: "none", fontFamily: "inherit", transition: "border-color 0.15s" }} onFocus={e => { e.target.style.borderColor = color; }} onBlur={e => { e.target.style.borderColor = "var(--fb-border)"; }} />
            ) : field.type === "select" ? (
              <select value={values[i] ?? ""} onChange={e => setValues(v => ({ ...v, [i]: e.target.value }))} style={{ background: "var(--fb-surface2)", border: "1px solid var(--fb-border)", borderRadius: "7px", padding: "7px 10px", fontSize: "0.8rem", color: "var(--fb-text)", outline: "none", fontFamily: "inherit" }}>
                <option value="">Select...</option>
                {(field.options ?? []).map((opt, j) => <option key={j}>{opt}</option>)}
              </select>
            ) : (
              <input type={field.type} value={values[i] ?? ""} onChange={e => setValues(v => ({ ...v, [i]: e.target.value }))} placeholder={field.placeholder ?? ""} style={{ background: "var(--fb-surface2)", border: "1px solid var(--fb-border)", borderRadius: "7px", padding: "7px 10px", fontSize: "0.8rem", color: "var(--fb-text)", outline: "none", fontFamily: "inherit", transition: "border-color 0.15s" }} onFocus={e => { e.target.style.borderColor = color; }} onBlur={e => { e.target.style.borderColor = "var(--fb-border)"; }} />
            )}
          </div>
        ))}
        <button onClick={handleSubmit} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 18px", borderRadius: "8px", border: "none", background: color, color: "#fff", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", alignSelf: "flex-start", fontFamily: "inherit", boxShadow: `0 3px 10px rgba(${hexToRgb(color)}, 0.3)` }}>
          <LucideIcons.Send size={13} strokeWidth={2.2} /> Submit
        </button>
      </div>

      {log.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--fb-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Submissions ({log.length})</span>
            <button onClick={resetLog} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "0.65rem", color: "var(--fb-text-muted)", fontFamily: "inherit" }}>↺ Clear</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {log.map((entry, i) => (
              <div key={i} style={{ padding: "10px 12px", borderRadius: "8px", background: "var(--fb-surface2)", border: "1px solid var(--fb-border)", position: "relative" }}>
                <button onClick={() => setLog(prev => prev.filter((_, j) => j !== i))} style={{ position: "absolute", top: "8px", right: "8px", border: "none", background: "none", cursor: "pointer", color: "var(--fb-text-muted)", opacity: 0.5, display: "flex" }}>
                  <LucideIcons.X size={11} strokeWidth={2.5} />
                </button>
                {entry._ts && <div style={{ fontSize: "0.62rem", color: "var(--fb-text-muted)", marginBottom: "5px" }}>{entry._ts}</div>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {Object.entries(entry).filter(([k]) => k !== "_ts").map(([k, v]) => (
                    <span key={k} style={{ fontSize: "0.74rem", color: "var(--fb-text)" }}>
                      <span style={{ color: "var(--fb-text-muted)", fontWeight: 500 }}>{k}:</span> {v}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Progress Section ─────────────────────────────────────────────────────────

function ProgressSection({ items, color, storageKey }: { items: ProgressItem[]; color: string; storageKey: string }) {
  const [bars, setBars, resetBars] = useStoredState<ProgressItem[]>(storageKey, items.map(i => ({ ...i, value: 0 })));
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {bars.map((item, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--fb-text)", fontWeight: 500 }}>{item.label}</span>
            {editing === i ? (
              <input
                autoFocus
                value={draft}
                type="number"
                min="0"
                max="100"
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === "Escape") {
                    const v = Math.max(0, Math.min(100, Number(draft) || 0));
                    setBars(b => b.map((x, j) => j === i ? { ...x, value: v } : x));
                    setEditing(null);
                  }
                }}
                onBlur={() => {
                  const v = Math.max(0, Math.min(100, Number(draft) || 0));
                  setBars(b => b.map((x, j) => j === i ? { ...x, value: v } : x));
                  setEditing(null);
                }}
                style={{ width: "56px", border: `1px solid ${color}`, borderRadius: "5px", padding: "2px 6px", background: "var(--fb-surface2)", color: "var(--fb-text)", fontSize: "0.7rem", outline: "none", fontFamily: "inherit", textAlign: "center" }}
              />
            ) : (
              <span onClick={() => { setDraft(String(item.value)); setEditing(i); }} title="Click to edit" style={{ fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", color: item.value >= 80 ? "#10B981" : item.value >= 50 ? color : "var(--fb-text-muted)" }}>
                {item.value}%
              </span>
            )}
          </div>
          <div style={{ height: "7px", borderRadius: "10px", background: "var(--fb-border)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, item.value))}%`, background: item.color ?? color, borderRadius: "10px", transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)", boxShadow: item.value > 0 ? `0 0 6px rgba(${hexToRgb(item.color ?? color)}, 0.4)` : "none" }} />
          </div>
        </div>
      ))}
      {bars.some(b => b.value > 0) && (
        <button onClick={resetBars} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "0.65rem", color: "var(--fb-text-muted)", padding: "0", fontFamily: "inherit", alignSelf: "flex-start" }}>
          ↺ Reset all to 0%
        </button>
      )}
    </div>
  );
}

// ─── Tags Section ─────────────────────────────────────────────────────────────

const TAG_COLORS = ["#7467F0", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6"];

function TagsSection({ color, storageKey }: { items: TagItem[]; color: string; storageKey: string }) {
  const [tags, setTags, resetTags] = useStoredState<TagItem[]>(storageKey, []);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [tagColor, setTagColor] = useState(color);

  const addTag = () => {
    if (!newLabel.trim()) return;
    setTags(t => [...t, { label: newLabel.trim(), color: tagColor }]);
    setNewLabel("");
    setTagColor(TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]);
    setAdding(false);
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: tags.length ? "10px" : 0 }}>
        {tags.map((tag, i) => (
          <span key={i} style={{ padding: "5px 10px 5px 12px", borderRadius: "20px", fontSize: "0.76rem", fontWeight: 600, background: `rgba(${hexToRgb(tag.color || color)}, 0.14)`, color: tag.color || color, display: "flex", alignItems: "center", gap: "5px" }}>
            {tag.label}
            <button onClick={() => setTags(t => t.filter((_, j) => j !== i))} style={{ border: "none", background: "none", cursor: "pointer", padding: 0, display: "flex", opacity: 0.6, color: "inherit" }}>
              <LucideIcons.X size={10} strokeWidth={3} />
            </button>
          </span>
        ))}
      </div>

      {adding ? (
        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
          <input autoFocus value={newLabel} onChange={e => setNewLabel(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addTag(); if (e.key === "Escape") setAdding(false); }} placeholder="Tag name..." style={{ padding: "5px 10px", borderRadius: "20px", border: `1.5px solid ${color}`, background: "var(--fb-surface2)", color: "var(--fb-text)", fontSize: "0.76rem", outline: "none", fontFamily: "inherit", width: "140px" }} />
          <div style={{ display: "flex", gap: "4px" }}>
            {TAG_COLORS.map(c => (
              <div key={c} onClick={() => setTagColor(c)} style={{ width: "16px", height: "16px", borderRadius: "50%", background: c, cursor: "pointer", border: tagColor === c ? "2px solid var(--fb-text)" : "2px solid transparent", flexShrink: 0 }} />
            ))}
          </div>
          <button onClick={addTag} style={{ padding: "5px 10px", borderRadius: "20px", border: "none", background: tagColor, color: "#fff", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Add</button>
          <button onClick={() => setAdding(false)} style={{ padding: "5px 8px", borderRadius: "20px", border: "none", background: "transparent", color: "var(--fb-text-muted)", cursor: "pointer", fontFamily: "inherit", fontSize: "0.72rem" }}>Cancel</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button onClick={() => setAdding(true)} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "20px", border: `1px dashed var(--fb-border)`, background: "transparent", color: "var(--fb-text-muted)", fontSize: "0.72rem", cursor: "pointer", fontFamily: "inherit" }}>
            <LucideIcons.Plus size={11} strokeWidth={2.5} /> Add tag
          </button>
          {tags.length > 0 && <button onClick={resetTags} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "0.65rem", color: "var(--fb-text-muted)", fontFamily: "inherit" }}>↺ Clear all</button>}
        </div>
      )}

      {tags.length === 0 && !adding && (
        <div style={{ fontSize: "0.76rem", color: "var(--fb-text-muted)", opacity: 0.6 }}>No tags yet — add one above</div>
      )}
    </div>
  );
}

// ─── Chart Section ─────────────────────────────────────────────────────────────

function ChartSection({ items, color }: { items: ChartItem[]; color: string }) {
  const chart = items[0];
  const chartType = chart?.chartType ?? "bar";
  const label = chart?.label ?? "Chart Data";
  return (
    <div style={{ background: `rgba(${hexToRgb(color)}, 0.04)`, border: `1px solid rgba(${hexToRgb(color)}, 0.15)`, borderRadius: "10px", padding: "14px 16px" }}>
      <div style={{ fontSize: "0.7rem", color: "var(--fb-text-muted)", marginBottom: "12px", fontWeight: 500, display: "flex", alignItems: "center", gap: "5px" }}>
        <LucideIcons.BarChart3 size={11} color={color} />
        {label}
      </div>
      {chartType === "bar" && <BarChart color={color} label={label} />}
      {chartType === "line" && <LineChart color={color} label={label} />}
      {chartType === "pie" && <PieChart color={color} label={label} />}
      {chartType === "donut" && <PieChart color={color} label={label} donut />}
    </div>
  );
}

// ─── Main Renderer ────────────────────────────────────────────────────────────

export default function AppRenderer({ template, templateId }: { template: AppTemplate; templateId?: string }) {
  const { appName, description, icon, color, sections, actions } = template;
  const rgb = hexToRgb(color);
  const storeKey = (sectionId: string) => templateId ? `fb-app-${templateId}-${sectionId}` : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%", background: "var(--fb-bg)" }}>

      {/* App Header */}
      <div style={{ background: `linear-gradient(135deg, rgba(${rgb}, 0.12) 0%, rgba(${rgb}, 0.04) 100%)`, borderBottom: `1px solid rgba(${rgb}, 0.15)`, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: `linear-gradient(135deg, ${color}, ${color}cc)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 14px rgba(${rgb}, 0.38)`, flexShrink: 0 }}>
            <LucideIcon name={icon} size={22} color="#fff" strokeWidth={2} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "var(--fb-text)", lineHeight: 1.2 }}>{appName}</h2>
            <p style={{ margin: 0, fontSize: "0.73rem", color: "var(--fb-text-muted)", marginTop: "3px" }}>{description}</p>
          </div>
        </div>
        {actions.length > 0 && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {actions.map((action, i) => (
              <button key={i} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 14px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "0.76rem", fontWeight: 600, fontFamily: "inherit", background: action.variant === "primary" ? color : action.variant === "secondary" ? `rgba(${rgb}, 0.12)` : "transparent", color: action.variant === "primary" ? "#fff" : color, boxShadow: action.variant === "primary" ? `0 3px 10px rgba(${rgb}, 0.3)` : "none", transition: "opacity 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.82")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                onClick={() => {}}>
                {action.icon && <LucideIcon name={action.icon} size={13} color={action.variant === "primary" ? "#fff" : color} strokeWidth={2.2} />}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sections */}
      <div style={{ flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column", gap: "28px" }}>
        {sections.map(section => (
          <div key={section.id}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "0.78rem", fontWeight: 700, color: "var(--fb-text)", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "7px" }}>
              <span style={{ width: "3px", height: "14px", borderRadius: "2px", background: color, display: "inline-block", flexShrink: 0 }} />
              {section.title}
            </h3>
            {section.type === "stats" && <StatsSection items={section.items as StatsItem[]} color={color} storageKey={storeKey(section.id)} />}
            {section.type === "checklist" && <ChecklistSection items={section.items as ChecklistItem[]} color={color} storageKey={storeKey(section.id)} />}
            {section.type === "list" && <ListSection items={section.items as ListItem[]} color={color} storageKey={storeKey(section.id)} />}
            {section.type === "table" && <TableSection items={section.items as TableItem[]} color={color} storageKey={storeKey(section.id)} />}
            {section.type === "form" && <FormSection items={section.items as FormField[]} color={color} storageKey={storeKey(section.id)} />}
            {section.type === "progress" && <ProgressSection items={section.items as ProgressItem[]} color={color} storageKey={storeKey(section.id)} />}
            {section.type === "tags" && <TagsSection items={section.items as TagItem[]} color={color} storageKey={storeKey(section.id)} />}
            {section.type === "chart_placeholder" && <ChartSection items={section.items as ChartItem[]} color={color} />}
          </div>
        ))}
      </div>
    </div>
  );
}
