import React from "react";
import * as LucideIcons from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StatsItem {
  label: string;
  value: string;
  icon?: string;
  change?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  streak?: string;
}

export interface ListItem {
  id: string;
  label: string;
  sublabel?: string;
  tag?: string;
  tagColor?: string;
}

export interface TableItem {
  columns: string[];
  rows: string[][];
}

export interface FormField {
  label: string;
  type: "text" | "number" | "select" | "date" | "textarea";
  placeholder?: string;
  options?: string[];
}

export interface ProgressItem {
  label: string;
  value: number;
  color?: string;
}

export interface TagItem {
  label: string;
  color: string;
}

export interface ChartItem {
  chartType: "bar" | "line" | "pie" | "donut";
  label: string;
}

export type SectionItem =
  | StatsItem
  | ChecklistItem
  | ListItem
  | TableItem
  | FormField
  | ProgressItem
  | TagItem
  | ChartItem;

export interface AppSection {
  id: string;
  type: "stats" | "checklist" | "list" | "table" | "form" | "progress" | "tags" | "chart_placeholder";
  title: string;
  items: SectionItem[];
}

export interface AppAction {
  label: string;
  icon?: string;
  variant: "primary" | "secondary" | "ghost";
}

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function LucideIcon({ name, size = 16, color, strokeWidth = 1.8 }: {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const Icon = (LucideIcons as any)[name] ?? LucideIcons.Sparkles;
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

// ─── Section Renderers ────────────────────────────────────────────────────────

function StatsSection({ items, color }: { items: StatsItem[]; color: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "10px" }}>
      {items.map((item, i) => (
        <div key={i} style={{
          background: `rgba(${hexToRgb(color)}, 0.07)`,
          border: `1px solid rgba(${hexToRgb(color)}, 0.18)`,
          borderRadius: "10px",
          padding: "14px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.7rem", color: "var(--fb-text-muted)", fontWeight: 500 }}>{item.label}</span>
            {item.icon && <LucideIcon name={item.icon} size={14} color={color} />}
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--fb-text)", lineHeight: 1 }}>{item.value}</div>
          {item.change && (
            <div style={{
              fontSize: "0.65rem",
              color: item.change.startsWith("+") ? "#10B981" : item.change.startsWith("-") ? "#F43F5E" : "var(--fb-text-muted)",
              fontWeight: 600,
            }}>{item.change}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function ChecklistSection({ items, color }: { items: ChecklistItem[]; color: string }) {
  const [checked, setChecked] = React.useState<Record<string, boolean>>(
    Object.fromEntries(items.map(i => [i.id, i.done]))
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => setChecked(c => ({ ...c, [item.id]: !c[item.id] }))}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "9px 12px",
            borderRadius: "8px",
            background: checked[item.id] ? `rgba(${hexToRgb(color)}, 0.06)` : "var(--fb-surface2)",
            cursor: "pointer",
            transition: "background 0.15s",
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
            fontSize: "0.82rem",
            color: checked[item.id] ? "var(--fb-text-muted)" : "var(--fb-text)",
            textDecoration: checked[item.id] ? "line-through" : "none",
            flex: 1,
          }}>{item.label}</span>
          {item.streak && (
            <span style={{
              fontSize: "0.65rem",
              color: color,
              fontWeight: 600,
              background: `rgba(${hexToRgb(color)}, 0.12)`,
              padding: "2px 6px",
              borderRadius: "10px",
            }}>{item.streak}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ListSection({ items, color }: { items: ListItem[]; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {items.map((item) => (
        <div key={item.id} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "9px 12px", borderRadius: "8px", background: "var(--fb-surface2)",
          border: "1px solid var(--fb-border)",
        }}>
          <div>
            <div style={{ fontSize: "0.82rem", color: "var(--fb-text)", fontWeight: 500 }}>{item.label}</div>
            {item.sublabel && <div style={{ fontSize: "0.7rem", color: "var(--fb-text-muted)", marginTop: "2px" }}>{item.sublabel}</div>}
          </div>
          {item.tag && (
            <span style={{
              fontSize: "0.65rem", fontWeight: 600, padding: "3px 8px", borderRadius: "20px",
              background: item.tagColor ? `rgba(${hexToRgb(item.tagColor)}, 0.15)` : `rgba(${hexToRgb(color)}, 0.15)`,
              color: item.tagColor ?? color,
            }}>{item.tag}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function TableSection({ items }: { items: TableItem[] }) {
  const table = items[0];
  if (!table || !table.columns) return null;
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
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {items.map((field, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--fb-text-muted)" }}>{field.label}</label>
          {field.type === "textarea" ? (
            <textarea placeholder={field.placeholder ?? ""} rows={3} style={{
              background: "var(--fb-surface2)", border: "1px solid var(--fb-border)", borderRadius: "7px",
              padding: "8px 10px", fontSize: "0.8rem", color: "var(--fb-text)", resize: "vertical",
              outline: "none", fontFamily: "inherit",
            }} />
          ) : field.type === "select" ? (
            <select style={{
              background: "var(--fb-surface2)", border: "1px solid var(--fb-border)", borderRadius: "7px",
              padding: "7px 10px", fontSize: "0.8rem", color: "var(--fb-text)", outline: "none", fontFamily: "inherit",
            }}>
              {(field.options ?? []).map((opt, j) => <option key={j}>{opt}</option>)}
            </select>
          ) : (
            <input type={field.type} placeholder={field.placeholder ?? ""} style={{
              background: "var(--fb-surface2)", border: "1px solid var(--fb-border)", borderRadius: "7px",
              padding: "7px 10px", fontSize: "0.8rem", color: "var(--fb-text)", outline: "none", fontFamily: "inherit",
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

function ProgressSection({ items, color }: { items: ProgressItem[]; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {items.map((item, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--fb-text)", fontWeight: 500 }}>{item.label}</span>
            <span style={{ fontSize: "0.72rem", color: "var(--fb-text-muted)", fontWeight: 600 }}>{item.value}%</span>
          </div>
          <div style={{ height: "6px", borderRadius: "10px", background: "var(--fb-border)", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${Math.max(0, Math.min(100, item.value))}%`,
              background: item.color ?? color, borderRadius: "10px",
              transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TagsSection({ items, color }: { items: TagItem[]; color: string }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {items.map((tag, i) => (
        <span key={i} style={{
          padding: "5px 12px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600,
          background: `rgba(${hexToRgb(tag.color || color)}, 0.15)`,
          color: tag.color || color, cursor: "default",
        }}>{tag.label}</span>
      ))}
    </div>
  );
}

function ChartPlaceholder({ items, color }: { items: ChartItem[]; color: string }) {
  const chart = items[0];
  const chartType = chart?.chartType ?? "bar";
  return (
    <div style={{
      background: `rgba(${hexToRgb(color)}, 0.05)`,
      border: `2px dashed rgba(${hexToRgb(color)}, 0.25)`,
      borderRadius: "10px", padding: "24px", textAlign: "center",
      display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
    }}>
      <LucideIcons.BarChart3 size={36} color={color} strokeWidth={1.5} />
      <div style={{ fontSize: "0.78rem", color: "var(--fb-text-muted)", fontWeight: 500 }}>
        {chart?.label ?? "Chart"} ({chartType})
      </div>
      <div style={{ fontSize: "0.68rem", color: "var(--fb-text-muted)" }}>Chart renders with live data</div>
    </div>
  );
}

// ─── Main Renderer ─────────────────────────────────────────────────────────────

export default function AppRenderer({ template }: { template: AppTemplate }) {
  const { appName, description, icon, color, sections, actions } = template;

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: "0",
      minHeight: "100%", background: "var(--fb-bg)",
    }}>
      {/* App Header */}
      <div style={{
        background: `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`,
        borderBottom: `1px solid rgba(${hexToRgb(color)}, 0.15)`,
        padding: "20px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "11px",
            background: `linear-gradient(135deg, ${color}, ${color}cc)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 4px 12px rgba(${hexToRgb(color)}, 0.35)`,
          }}>
            <LucideIcon name={icon} size={20} color="#fff" strokeWidth={2} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--fb-text)", lineHeight: 1.2 }}>{appName}</h2>
            <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--fb-text-muted)", marginTop: "2px" }}>{description}</p>
          </div>
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {actions.map((action, i) => (
              <button key={i} style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "7px 14px", borderRadius: "8px", border: "none", cursor: "pointer",
                fontSize: "0.75rem", fontWeight: 600,
                background: action.variant === "primary" ? color : action.variant === "secondary" ? `rgba(${hexToRgb(color)}, 0.12)` : "transparent",
                color: action.variant === "primary" ? "#fff" : color,
                transition: "opacity 0.15s",
              }} onClick={() => {}}>
                {action.icon && <LucideIcon name={action.icon} size={13} color={action.variant === "primary" ? "#fff" : color} strokeWidth={2.2} />}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sections */}
      <div style={{ flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", overflowY: "auto" }}>
        {sections.map((section) => (
          <div key={section.id}>
            <h3 style={{
              margin: "0 0 10px 0", fontSize: "0.8rem", fontWeight: 700,
              color: "var(--fb-text)", textTransform: "uppercase", letterSpacing: "0.04em",
              display: "flex", alignItems: "center", gap: "6px",
            }}>
              <span style={{ width: "3px", height: "14px", borderRadius: "2px", background: color, display: "inline-block" }} />
              {section.title}
            </h3>
            {section.type === "stats" && <StatsSection items={section.items as StatsItem[]} color={color} />}
            {section.type === "checklist" && <ChecklistSection items={section.items as ChecklistItem[]} color={color} />}
            {section.type === "list" && <ListSection items={section.items as ListItem[]} color={color} />}
            {section.type === "table" && <TableSection items={section.items as TableItem[]} />}
            {section.type === "form" && <FormSection items={section.items as FormField[]} color={color} />}
            {section.type === "progress" && <ProgressSection items={section.items as ProgressItem[]} color={color} />}
            {section.type === "tags" && <TagsSection items={section.items as TagItem[]} color={color} />}
            {section.type === "chart_placeholder" && <ChartPlaceholder items={section.items as ChartItem[]} color={color} />}
          </div>
        ))}
      </div>
    </div>
  );
}
