import React, { useState } from "react";
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

// Seeded deterministic values so charts look the same every render
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
            <rect x={x} y={H - bh} width={barW * 0.7} height={bh}
              rx={3} fill={color} opacity={isMax ? 1 : 0.45} />
            {isMax && (
              <text x={x + barW * 0.35} y={H - bh - 4} textAnchor="middle"
                fontSize="8" fill={color} fontWeight="700" fontFamily="inherit">{v}</text>
            )}
            <text x={x + barW * 0.35} y={H + padB - 4} textAnchor="middle"
              fontSize="9" fill="var(--fb-text-muted)" fontFamily="inherit">{days[i]}</text>
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
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2.2"
        strokeLinejoin="round" strokeLinecap="round" />
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
        return <path key={i} d={d} fill={color} opacity={s.opacity}
          stroke="var(--fb-surface)" strokeWidth="2" />;
      })}
      {donut && (
        <>
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="14" fontWeight="700"
            fill="var(--fb-text)" fontFamily="inherit">{total}</text>
          <text x={cx} y={cx + 10} textAnchor="middle" fontSize="8"
            fill="var(--fb-text-muted)" fontFamily="inherit">total</text>
        </>
      )}
      {slices.map((s, i) => (
        <g key={i} transform={`translate(142, ${10 + i * 22})`}>
          <rect width="9" height="9" rx="2" fill={color} opacity={s.opacity} y="1" />
          <text x="14" y="10" fontSize="9" fill="var(--fb-text-muted)" fontFamily="inherit">
            {s.label} · {s.pct}%
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─── Section Renderers ────────────────────────────────────────────────────────

function StatsSection({ items, color }: { items: StatsItem[]; color: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "10px" }}>
      {items.map((item, i) => (
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
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--fb-text)", lineHeight: 1 }}>{item.value}</div>
          {item.change && (
            <div style={{
              fontSize: "0.65rem", fontWeight: 600,
              color: item.change.startsWith("+") ? "#10B981" : item.change.startsWith("-") ? "#F43F5E" : "var(--fb-text-muted)",
            }}>{item.change}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function ChecklistSection({ items, color }: { items: ChecklistItem[]; color: string }) {
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map(i => [i.id, i.done]))
  );
  const doneCount = Object.values(checked).filter(Boolean).length;

  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: "10px",
      }}>
        <div style={{ height: "4px", flex: 1, borderRadius: "4px", background: "var(--fb-border)", overflow: "hidden", marginRight: "12px" }}>
          <div style={{
            height: "100%", width: `${(doneCount / items.length) * 100}%`,
            background: color, borderRadius: "4px", transition: "width 0.3s ease",
          }} />
        </div>
        <span style={{ fontSize: "0.68rem", color: "var(--fb-text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
          {doneCount}/{items.length}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => setChecked(c => ({ ...c, [item.id]: !c[item.id] }))}
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "9px 12px", borderRadius: "8px",
              background: checked[item.id] ? `rgba(${hexToRgb(color)}, 0.06)` : "var(--fb-surface2)",
              cursor: "pointer", transition: "background 0.15s",
              border: `1px solid ${checked[item.id] ? `rgba(${hexToRgb(color)}, 0.2)` : "transparent"}`,
            }}
          >
            <div style={{
              width: "18px", height: "18px", borderRadius: "5px", flexShrink: 0,
              border: `2px solid ${checked[item.id] ? color : "var(--fb-border)"}`,
              background: checked[item.id] ? color : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}>
              {checked[item.id] && <LucideIcons.Check size={11} color="#fff" strokeWidth={3} />}
            </div>
            <span style={{
              fontSize: "0.82rem", flex: 1,
              color: checked[item.id] ? "var(--fb-text-muted)" : "var(--fb-text)",
              textDecoration: checked[item.id] ? "line-through" : "none",
            }}>{item.label}</span>
            {item.streak && (
              <span style={{
                fontSize: "0.62rem", color, fontWeight: 700,
                background: `rgba(${hexToRgb(color)}, 0.12)`,
                padding: "2px 7px", borderRadius: "10px",
              }}>{item.streak}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ListSection({ items, color }: { items: ListItem[]; color: string }) {
  const [list, setList] = useState<ListItem[]>(items);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    setList(prev => [...prev, { id: `u_${Date.now()}`, label: newLabel.trim() }]);
    setNewLabel("");
    setAdding(false);
  };

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {list.map((item) => (
          <div key={item.id} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "9px 12px", borderRadius: "8px",
            background: "var(--fb-surface2)", border: "1px solid var(--fb-border)",
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.82rem", color: "var(--fb-text)", fontWeight: 500 }}>{item.label}</div>
              {item.sublabel && <div style={{ fontSize: "0.7rem", color: "var(--fb-text-muted)", marginTop: "2px" }}>{item.sublabel}</div>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
              {item.tag && (
                <span style={{
                  fontSize: "0.64rem", fontWeight: 600, padding: "2px 8px", borderRadius: "20px",
                  background: item.tagColor ? `rgba(${hexToRgb(item.tagColor)}, 0.15)` : `rgba(${hexToRgb(color)}, 0.15)`,
                  color: item.tagColor ?? color,
                }}>{item.tag}</span>
              )}
              <button
                onClick={() => setList(prev => prev.filter(l => l.id !== item.id))}
                style={{ border: "none", background: "none", cursor: "pointer", padding: "2px", color: "var(--fb-text-muted)", display: "flex", opacity: 0.5 }}
              >
                <LucideIcons.X size={12} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {adding ? (
        <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
          <input
            autoFocus
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setNewLabel(""); } }}
            placeholder="New item..."
            style={{
              flex: 1, padding: "7px 10px", borderRadius: "7px",
              border: `1.5px solid ${color}`, background: "var(--fb-surface2)",
              color: "var(--fb-text)", fontSize: "0.8rem", outline: "none", fontFamily: "inherit",
            }}
          />
          <button onClick={handleAdd} style={{
            padding: "7px 12px", borderRadius: "7px", border: "none",
            background: color, color: "#fff", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
          }}>Add</button>
          <button onClick={() => { setAdding(false); setNewLabel(""); }} style={{
            padding: "7px 10px", borderRadius: "7px", border: "none",
            background: "var(--fb-surface2)", color: "var(--fb-text-muted)", cursor: "pointer",
          }}>Cancel</button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{
            marginTop: "8px", display: "flex", alignItems: "center", gap: "5px",
            padding: "6px 12px", borderRadius: "7px", border: `1px dashed var(--fb-border)`,
            background: "transparent", color: "var(--fb-text-muted)", fontSize: "0.75rem",
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <LucideIcons.Plus size={13} strokeWidth={2.2} /> Add item
        </button>
      )}
    </div>
  );
}

function TableSection({ items }: { items: TableItem[] }) {
  const table = items[0];
  if (!table?.columns) return null;
  return (
    <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--fb-border)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
        <thead>
          <tr style={{ background: "var(--fb-surface2)" }}>
            {table.columns.map((col, i) => (
              <th key={i} style={{ padding: "9px 12px", textAlign: "left", color: "var(--fb-text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(table.rows ?? []).map((row, ri) => (
            <tr key={ri} style={{ borderTop: "1px solid var(--fb-border)" }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: "9px 12px", color: "var(--fb-text)" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FormSection({ items, color }: { items: FormField[]; color: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [values, setValues] = useState<Record<number, string>>({});

  if (submitted) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "28px", gap: "10px",
        background: `rgba(${hexToRgb(color)}, 0.06)`,
        borderRadius: "10px", border: `1px solid rgba(${hexToRgb(color)}, 0.2)`,
      }}>
        <div style={{
          width: "40px", height: "40px", borderRadius: "50%",
          background: color, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <LucideIcons.Check size={20} color="#fff" strokeWidth={2.5} />
        </div>
        <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--fb-text)" }}>Submitted!</div>
        <button onClick={() => { setSubmitted(false); setValues({}); }} style={{
          padding: "5px 14px", borderRadius: "7px", border: "none",
          background: "var(--fb-surface2)", color: "var(--fb-text-muted)",
          fontSize: "0.74rem", cursor: "pointer", fontFamily: "inherit",
        }}>Fill again</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {items.map((field, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--fb-text-muted)" }}>{field.label}</label>
          {field.type === "textarea" ? (
            <textarea
              value={values[i] ?? ""}
              onChange={e => setValues(v => ({ ...v, [i]: e.target.value }))}
              placeholder={field.placeholder ?? ""}
              rows={3}
              style={{
                background: "var(--fb-surface2)", border: "1px solid var(--fb-border)", borderRadius: "7px",
                padding: "8px 10px", fontSize: "0.8rem", color: "var(--fb-text)", resize: "vertical",
                outline: "none", fontFamily: "inherit", transition: "border-color 0.15s",
              }}
              onFocus={e => { e.target.style.borderColor = color; }}
              onBlur={e => { e.target.style.borderColor = "var(--fb-border)"; }}
            />
          ) : field.type === "select" ? (
            <select
              value={values[i] ?? ""}
              onChange={e => setValues(v => ({ ...v, [i]: e.target.value }))}
              style={{
                background: "var(--fb-surface2)", border: "1px solid var(--fb-border)", borderRadius: "7px",
                padding: "7px 10px", fontSize: "0.8rem", color: "var(--fb-text)", outline: "none", fontFamily: "inherit",
              }}
            >
              <option value="">Select...</option>
              {(field.options ?? []).map((opt, j) => <option key={j}>{opt}</option>)}
            </select>
          ) : (
            <input
              type={field.type}
              value={values[i] ?? ""}
              onChange={e => setValues(v => ({ ...v, [i]: e.target.value }))}
              placeholder={field.placeholder ?? ""}
              style={{
                background: "var(--fb-surface2)", border: "1px solid var(--fb-border)", borderRadius: "7px",
                padding: "7px 10px", fontSize: "0.8rem", color: "var(--fb-text)", outline: "none", fontFamily: "inherit",
                transition: "border-color 0.15s",
              }}
              onFocus={e => { e.target.style.borderColor = color; }}
              onBlur={e => { e.target.style.borderColor = "var(--fb-border)"; }}
            />
          )}
        </div>
      ))}
      <button
        onClick={() => setSubmitted(true)}
        style={{
          marginTop: "4px", display: "flex", alignItems: "center", gap: "6px",
          padding: "9px 18px", borderRadius: "8px", border: "none",
          background: color, color: "#fff", fontSize: "0.8rem", fontWeight: 700,
          cursor: "pointer", alignSelf: "flex-start", fontFamily: "inherit",
          boxShadow: `0 3px 10px rgba(${hexToRgb(color)}, 0.3)`,
        }}
      >
        <LucideIcons.Send size={13} strokeWidth={2.2} /> Submit
      </button>
    </div>
  );
}

function ProgressSection({ items, color }: { items: ProgressItem[]; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {items.map((item, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--fb-text)", fontWeight: 500 }}>{item.label}</span>
            <span style={{
              fontSize: "0.7rem", fontWeight: 700,
              color: item.value >= 80 ? "#10B981" : item.value >= 50 ? color : "var(--fb-text-muted)",
            }}>{item.value}%</span>
          </div>
          <div style={{ height: "7px", borderRadius: "10px", background: "var(--fb-border)", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${Math.max(0, Math.min(100, item.value))}%`,
              background: item.color ?? color, borderRadius: "10px",
              transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: `0 0 6px rgba(${hexToRgb(item.color ?? color)}, 0.4)`,
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TagsSection({ items, color }: { items: TagItem[]; color: string }) {
  const [tags, setTags] = useState<TagItem[]>(items);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {tags.map((tag, i) => (
        <span key={i} style={{
          padding: "5px 10px 5px 12px", borderRadius: "20px", fontSize: "0.76rem", fontWeight: 600,
          background: `rgba(${hexToRgb(tag.color || color)}, 0.14)`,
          color: tag.color || color, cursor: "default",
          display: "flex", alignItems: "center", gap: "5px",
        }}>
          {tag.label}
          <button
            onClick={() => setTags(t => t.filter((_, j) => j !== i))}
            style={{ border: "none", background: "none", cursor: "pointer", padding: 0, display: "flex", opacity: 0.6, color: "inherit" }}
          >
            <LucideIcons.X size={10} strokeWidth={3} />
          </button>
        </span>
      ))}
    </div>
  );
}

function ChartSection({ items, color }: { items: ChartItem[]; color: string }) {
  const chart = items[0];
  const chartType = chart?.chartType ?? "bar";
  const label = chart?.label ?? "Chart Data";

  return (
    <div style={{
      background: `rgba(${hexToRgb(color)}, 0.04)`,
      border: `1px solid rgba(${hexToRgb(color)}, 0.15)`,
      borderRadius: "10px", padding: "14px 16px",
    }}>
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

export default function AppRenderer({ template }: { template: AppTemplate }) {
  const { appName, description, icon, color, sections, actions } = template;
  const rgb = hexToRgb(color);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%", background: "var(--fb-bg)" }}>

      {/* App Header */}
      <div style={{
        background: `linear-gradient(135deg, rgba(${rgb}, 0.12) 0%, rgba(${rgb}, 0.04) 100%)`,
        borderBottom: `1px solid rgba(${rgb}, 0.15)`,
        padding: "20px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "44px", height: "44px", borderRadius: "12px",
            background: `linear-gradient(135deg, ${color}, ${color}cc)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 4px 14px rgba(${rgb}, 0.38)`,
            flexShrink: 0,
          }}>
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
              <button key={i} style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "7px 14px", borderRadius: "8px", border: "none", cursor: "pointer",
                fontSize: "0.76rem", fontWeight: 600, fontFamily: "inherit",
                background: action.variant === "primary" ? color
                  : action.variant === "secondary" ? `rgba(${rgb}, 0.12)`
                  : "transparent",
                color: action.variant === "primary" ? "#fff" : color,
                boxShadow: action.variant === "primary" ? `0 3px 10px rgba(${rgb}, 0.3)` : "none",
                transition: "opacity 0.15s",
              }} onMouseEnter={e => (e.currentTarget.style.opacity = "0.82")}
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
      <div style={{ flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column", gap: "22px" }}>
        {sections.map((section) => (
          <div key={section.id}>
            <h3 style={{
              margin: "0 0 12px 0", fontSize: "0.78rem", fontWeight: 700,
              color: "var(--fb-text)", textTransform: "uppercase", letterSpacing: "0.05em",
              display: "flex", alignItems: "center", gap: "7px",
            }}>
              <span style={{ width: "3px", height: "14px", borderRadius: "2px", background: color, display: "inline-block", flexShrink: 0 }} />
              {section.title}
            </h3>
            {section.type === "stats" && <StatsSection items={section.items as StatsItem[]} color={color} />}
            {section.type === "checklist" && <ChecklistSection items={section.items as ChecklistItem[]} color={color} />}
            {section.type === "list" && <ListSection items={section.items as ListItem[]} color={color} />}
            {section.type === "table" && <TableSection items={section.items as TableItem[]} />}
            {section.type === "form" && <FormSection items={section.items as FormField[]} color={color} />}
            {section.type === "progress" && <ProgressSection items={section.items as ProgressItem[]} color={color} />}
            {section.type === "tags" && <TagsSection items={section.items as TagItem[]} color={color} />}
            {section.type === "chart_placeholder" && <ChartSection items={section.items as ChartItem[]} color={color} />}
          </div>
        ))}
      </div>
    </div>
  );
}
