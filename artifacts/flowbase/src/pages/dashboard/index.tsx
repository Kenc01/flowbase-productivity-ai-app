import React, { useState } from "react";
import {
  LayoutDashboard,
  Bot,
  KanbanSquare,
  NotebookPen,
  PenLine,
  Wand2,
  TrendingUp,
  CheckCircle2,
  Clock,
  Star,
  Plus,
  ArrowRight,
  Sparkles,
  Target,
  Flame,
  Zap,
  Bell,
  Search,
  ChevronDown,
} from "lucide-react";

const STATS = [
  {
    label: "Tasks Done",
    value: "24",
    sub: "+4 today",
    color: "#10B981",
    bg: "#10B98112",
    icon: CheckCircle2,
  },
  {
    label: "In Progress",
    value: "8",
    sub: "3 due today",
    color: "#F59E0B",
    bg: "#F59E0B12",
    icon: Clock,
  },
  {
    label: "AI Queries",
    value: "142",
    sub: "this week",
    color: "#7467F0",
    bg: "#7467F012",
    icon: Bot,
  },
  {
    label: "Streak",
    value: "12",
    sub: "days active",
    color: "#F43F5E",
    bg: "#F43F5E12",
    icon: Flame,
  },
];

const RECENT = [
  { title: "Q2 Product Roadmap", type: "Page", color: "#38BDF8", icon: LayoutDashboard, updated: "2 min ago" },
  { title: "Sprint Board — May", type: "Kanban", color: "#10B981", icon: KanbanSquare, updated: "1 hr ago" },
  { title: "Meeting Notes 5/24", type: "Note", color: "#F43F5E", icon: NotebookPen, updated: "3 hr ago" },
  { title: "UI Brainstorm", type: "Whiteboard", color: "#6366F1", icon: PenLine, updated: "Yesterday" },
  { title: "AI Report Template", type: "Template", color: "#A855F7", icon: Wand2, updated: "2 days ago" },
];

const TASKS = [
  { title: "Review design proposal", priority: "High", due: "Today", done: false, color: "#F43F5E" },
  { title: "Sync with backend team", priority: "Medium", due: "Today", done: false, color: "#F59E0B" },
  { title: "Update roadmap docs", priority: "Low", due: "Tomorrow", done: true, color: "#10B981" },
  { title: "Write AI prompt templates", priority: "High", due: "May 27", done: false, color: "#F43F5E" },
  { title: "Deploy staging build", priority: "Medium", due: "May 28", done: false, color: "#F59E0B" },
];

export default function DashboardPage() {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <header
        className="fb-dashboard-topbar"
        style={{
          height: "64px",
          borderBottom: "1px solid var(--fb-border)",
          background: "var(--fb-surface)",
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          gap: "16px",
          position: "sticky",
          top: 0,
          zIndex: 30,
          flexShrink: 0,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginRight: "auto" }}>
          <LayoutDashboard size={18} color="var(--fb-violet)" strokeWidth={2} />
          <h1
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: "1.05rem",
              fontWeight: 700,
              color: "var(--fb-text)",
              margin: 0,
            }}
          >
            Dashboard
          </h1>
        </div>

        <div
          className="fb-dashboard-search"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: searchFocused ? "var(--fb-surface)" : "var(--fb-bg)",
            border: `1px solid ${searchFocused ? "var(--fb-violet)" : "var(--fb-border)"}`,
            borderRadius: "8px",
            padding: "6px 12px",
            width: "220px",
            transition: "all 0.2s ease",
            boxShadow: searchFocused ? "0 0 0 3px rgba(116,103,240,0.12)" : "none",
          }}
        >
          <Search size={13} color="var(--fb-text-muted)" strokeWidth={2} />
          <input
            type="text"
            placeholder="Search everything…"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: "0.8rem",
              color: "var(--fb-text)",
              width: "100%",
              fontFamily: "'Inter', sans-serif",
            }}
          />
          <kbd
            className="fb-dashboard-shortcut"
            style={{
              fontSize: "0.6rem",
              color: "var(--fb-text-muted)",
              background: "var(--fb-muted)",
              padding: "2px 5px",
              borderRadius: "4px",
              fontFamily: "monospace",
              border: "1px solid var(--fb-border)",
            }}
          >
            ⌘K
          </kbd>
        </div>

        <button
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            border: "1px solid var(--fb-border)",
            background: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            position: "relative",
            color: "var(--fb-text-muted)",
            transition: "background 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--fb-bg)";
            e.currentTarget.style.color = "#F59E0B";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--fb-text-muted)";
          }}
        >
          <Bell size={15} strokeWidth={1.8} />
          <span
            style={{
              position: "absolute",
              top: "7px",
              right: "7px",
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: "#F43F5E",
              border: "1.5px solid var(--fb-surface)",
            }}
          />
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            padding: "4px 10px 4px 4px",
            borderRadius: "8px",
            border: "1px solid var(--fb-border)",
            background: "transparent",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--fb-bg)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "7px",
              background: "linear-gradient(135deg, var(--fb-violet), var(--fb-cyan))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "#fff",
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            KB
          </div>
          <span
            className="fb-dashboard-user-name"
            style={{ fontSize: "0.78rem", fontWeight: 500, color: "var(--fb-text)" }}
          >
            Keith
          </span>
          <ChevronDown size={12} color="var(--fb-text-muted)" strokeWidth={2} />
        </div>
      </header>

      <main
        className="fb-dashboard-main"
        style={{
          flex: 1,
          padding: "28px 28px 40px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <div className="fb-fade-in">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <Sparkles size={16} color="#F59E0B" strokeWidth={2} />
            <span style={{ fontSize: "0.78rem", color: "var(--fb-text-muted)", fontWeight: 500 }}>
              Good morning —
            </span>
          </div>
          <h2
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: "1.6rem",
              fontWeight: 700,
              color: "var(--fb-text)",
              margin: 0,
              letterSpacing: 0,
            }}
          >
            Welcome back, Keith 👋
          </h2>
          <p style={{ fontSize: "0.82rem", color: "var(--fb-text-muted)", margin: "4px 0 0" }}>
            You have <strong style={{ color: "var(--fb-text)" }}>3 tasks due today</strong> and{" "}
            <strong style={{ color: "var(--fb-violet)" }}>2 AI suggestions</strong> waiting.
          </p>
        </div>

        <div
          className="fb-fade-in"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "14px",
          }}
        >
          {STATS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                style={{
                  background: "var(--fb-surface)",
                  borderRadius: "12px",
                  padding: "16px 18px",
                  border: "1px solid var(--fb-border)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  boxShadow: "var(--fb-shadow-sm)",
                  cursor: "default",
                  transition: "box-shadow 0.2s, transform 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "var(--fb-shadow)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "var(--fb-shadow-sm)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "9px",
                    background: s.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={16} color={s.color} strokeWidth={2} />
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: "1.5rem",
                      fontWeight: 700,
                      color: "var(--fb-text)",
                      lineHeight: 1,
                    }}
                  >
                    {s.value}
                  </div>
                  <div style={{ fontSize: "0.73rem", color: "var(--fb-text-muted)", marginTop: "3px" }}>
                    {s.label}
                  </div>
                  <div
                    style={{
                      fontSize: "0.68rem",
                      color: s.color,
                      fontWeight: 600,
                      marginTop: "2px",
                    }}
                  >
                    {s.sub}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="fb-dashboard-split"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "18px",
          }}
        >
          <Section title="Recent" icon={<TrendingUp size={14} color="var(--fb-violet)" />} action="See all">
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {RECENT.map((r, i) => {
                const Icon = r.icon;
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--fb-bg)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <div
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "7px",
                        background: `${r.color}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={13} color={r.color} strokeWidth={2} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 500,
                          color: "var(--fb-text)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {r.title}
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "var(--fb-text-muted)" }}>
                        {r.type} · {r.updated}
                      </div>
                    </div>
                    <Star size={11} color="var(--fb-border-strong)" strokeWidth={1.5} />
                  </div>
                );
              })}
            </div>
          </Section>

          <Section
            title="Today's Tasks"
            icon={<Target size={14} color="#10B981" />}
            action={
              <div style={{ display: "flex", gap: "6px" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--fb-violet)", fontWeight: 500, cursor: "pointer" }}>
                  See all
                </span>
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    padding: "3px 8px",
                    borderRadius: "5px",
                    border: "1px dashed var(--fb-border-strong)",
                    background: "transparent",
                    fontSize: "0.68rem",
                    fontWeight: 500,
                    color: "var(--fb-text-muted)",
                    cursor: "pointer",
                  }}
                >
                  <Plus size={10} strokeWidth={2.5} /> Add
                </button>
              </div>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {TASKS.map((t, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "7px 10px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "background 0.15s",
                    opacity: t.done ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--fb-bg)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "5px",
                      border: `1.5px solid ${t.done ? "#10B981" : "var(--fb-border-strong)"}`,
                      background: t.done ? "#10B98120" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {t.done && <CheckCircle2 size={10} color="#10B981" strokeWidth={2.5} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "0.79rem",
                        fontWeight: 500,
                        color: "var(--fb-text)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        textDecoration: t.done ? "line-through" : "none",
                      }}
                    >
                      {t.title}
                    </div>
                    <div style={{ fontSize: "0.67rem", color: "var(--fb-text-muted)" }}>Due {t.due}</div>
                  </div>
                  <span
                    style={{
                      fontSize: "0.62rem",
                      fontWeight: 600,
                      color: t.color,
                      background: `${t.color}14`,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.priority}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div
          className="fb-fade-in"
          style={{
            background: "linear-gradient(135deg, hsl(246 80% 14%) 0%, hsl(246 60% 18%) 50%, hsl(195 80% 12%) 100%)",
            borderRadius: "14px",
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            border: "1px solid hsl(246 40% 28%)",
            boxShadow: "0 4px 20px rgba(124,111,247,0.2)",
            cursor: "pointer",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 8px 30px rgba(124,111,247,0.28)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(124,111,247,0.2)";
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, var(--fb-violet), var(--fb-cyan))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 4px 12px rgba(124,111,247,0.4)",
            }}
          >
            <Zap size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "#f0f0f8",
                marginBottom: "3px",
              }}
            >
              AI Assistant is ready
            </div>
            <div style={{ fontSize: "0.76rem", color: "hsl(220 20% 65%)" }}>
              Ask anything — summarize notes, generate templates, plan your week.
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "8px 14px",
              borderRadius: "8px",
              background: "rgba(124,111,247,0.25)",
              border: "1px solid rgba(124,111,247,0.35)",
              color: "#b0a8ff",
              fontSize: "0.78rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
              transition: "background 0.15s",
            }}
          >
            Open AI <ArrowRight size={12} strokeWidth={2.5} />
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fb-fade-in"
      style={{
        background: "var(--fb-surface)",
        borderRadius: "12px",
        border: "1px solid var(--fb-border)",
        boxShadow: "var(--fb-shadow-sm)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px 10px",
          borderBottom: "1px solid var(--fb-border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          {icon}
          <span
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: "0.85rem",
              fontWeight: 700,
              color: "var(--fb-text)",
            }}
          >
            {title}
          </span>
        </div>
        {typeof action === "string" ? (
          <button
            style={{
              fontSize: "0.72rem",
              color: "var(--fb-violet)",
              fontWeight: 500,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "3px",
            }}
          >
            {action} <ArrowRight size={10} strokeWidth={2.5} />
          </button>
        ) : (
          action
        )}
      </div>
      <div style={{ padding: "8px 6px" }}>{children}</div>
    </div>
  );
}
