import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  X, HelpCircle, Keyboard, BookOpen, Zap, Search, ChevronRight,
  MessageSquare, ExternalLink, LayoutDashboard, KanbanSquare,
  CalendarDays, NotebookPen, Bot, Clock, Bell, Settings,
  ChevronDown,
} from "lucide-react";

interface FAQ {
  q: string;
  a: string;
}

const FAQS: FAQ[] = [
  {
    q: "How do I ask the AI to plan my day?",
    a: "Open the AI Assistant from the sidebar, then type something like 'Plan my school day for today' or 'Build me a schedule.' JARVIS will create the blocks directly in your Daily Schedule.",
  },
  {
    q: "How do I add tasks to my Kanban board?",
    a: "Go to Kanban in the sidebar. Click '+ Add Task' on any column, or ask the AI Assistant: 'Create a task called X with high priority.'",
  },
  {
    q: "Can the AI read my calendar and tasks?",
    a: "Yes — JARVIS can read your calendar events, Kanban tasks, notes, and Daily Schedule. Just ask 'What do I have today?' and it'll pull them all.",
  },
  {
    q: "How do I collaborate on a Kanban board?",
    a: "Open a Kanban board and click the Collaborators button at the top. Invite team members by email — they'll see your board update in real time.",
  },
  {
    q: "What is the Daily Schedule page for?",
    a: "It's a 24-hour time-block planner. You can add blocks manually or ask your AI coach to build a schedule for you. Blocks are saved to the database and refresh automatically.",
  },
  {
    q: "How do notifications work?",
    a: "Click the Bell icon in the sidebar footer. FlowBase generates smart alerts from your real data — overdue tasks, events today, high-priority tasks, and pinned notes.",
  },
  {
    q: "How do I create an AI Template / mini-app?",
    a: "Go to AI Templates in the sidebar and describe the app you want — e.g. 'habit tracker' or 'budget spreadsheet'. The AI builds it and adds it to your sidebar under My Apps.",
  },
];

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["⌘", "K"], label: "Quick search (coming soon)" },
  { keys: ["Enter"], label: "Send AI message" },
  { keys: ["Shift", "Enter"], label: "New line in AI chat" },
  { keys: ["Esc"], label: "Close any panel or modal" },
];

const FEATURES: { icon: React.ElementType; label: string; desc: string; href: string; color: string }[] = [
  { icon: LayoutDashboard, label: "Dashboard",      desc: "Your overview",         href: "/dashboard",              color: "#7467F0" },
  { icon: KanbanSquare,   label: "Kanban",          desc: "Task boards",           href: "/dashboard/kanban",       color: "#06B6D4" },
  { icon: CalendarDays,   label: "Calendar",        desc: "Events & reminders",    href: "/dashboard/calendar",     color: "#10B981" },
  { icon: NotebookPen,    label: "Notes",           desc: "Rich text notes",       href: "/dashboard/notes",        color: "#F59E0B" },
  { icon: Bot,            label: "AI Assistant",    desc: "JARVIS coach",          href: "/dashboard/ai-assistant", color: "#a855f7" },
  { icon: Clock,          label: "Daily Schedule",  desc: "Time-block planner",    href: "/dashboard/daily-schedule", color: "#F97316" },
  { icon: Bell,           label: "Notifications",   desc: "Alerts & reminders",    href: "#notifications",          color: "#F59E0B" },
  { icon: Settings,       label: "Settings",        desc: "Preferences",           href: "/dashboard/settings",     color: "#64748b" },
];

function FAQItem({ faq }: { faq: FAQ }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid hsl(231, 22%, 18%)" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: "11px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "hsl(220, 18%, 84%)", lineHeight: 1.4 }}>
          {faq.q}
        </span>
        <ChevronDown size={13} style={{
          color: "hsl(221, 14%, 50%)", flexShrink: 0,
          transform: open ? "rotate(180deg)" : "none",
          transition: "transform 0.2s ease",
        }} />
      </button>
      {open && (
        <div style={{
          fontSize: "0.74rem", color: "hsl(221, 14%, 58%)", lineHeight: 1.65,
          paddingBottom: 12,
        }}>
          {faq.a}
        </div>
      )}
    </div>
  );
}

export function HelpPanel({
  open,
  onClose,
  sidebarWidth,
}: {
  open: boolean;
  onClose: () => void;
  sidebarWidth: number;
}) {
  const [tab, setTab] = useState<"overview" | "faq" | "shortcuts">("overview");
  const [search, setSearch] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const filteredFaqs = search.trim()
    ? FAQS.filter(f => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()))
    : FAQS;

  function handleFeatureClick(href: string) {
    if (href === "#notifications") {
      onClose();
      return;
    }
    navigate(href);
    onClose();
  }

  const TABS: { id: typeof tab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: BookOpen },
    { id: "faq", label: "FAQ", icon: HelpCircle },
    { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
  ];

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        bottom: "12px",
        left: `${sidebarWidth + 8}px`,
        width: "360px",
        maxHeight: "560px",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        borderRadius: "16px",
        background: "hsl(231, 30%, 11%)",
        border: "1px solid hsl(231, 22%, 22%)",
        boxShadow: "0 24px 60px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3)",
        opacity: open ? 1 : 0,
        transform: open ? "translateY(0) scale(1)" : "translateY(12px) scale(0.97)",
        pointerEvents: open ? "auto" : "none",
        transition: "opacity 0.2s ease, transform 0.2s ease",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px 12px", borderBottom: "1px solid hsl(231, 22%, 20%)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <HelpCircle size={15} style={{ color: "#0EA5E9" }} />
          <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "hsl(220, 20%, 90%)" }}>Help & Support</span>
        </div>
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "hsl(221, 14%, 50%)", padding: "4px", borderRadius: "6px",
          display: "flex", alignItems: "center",
        }}
          onMouseEnter={e => { (e.currentTarget).style.background = "hsl(231, 25%, 16%)"; (e.currentTarget).style.color = "hsl(220, 20%, 80%)"; }}
          onMouseLeave={e => { (e.currentTarget).style.background = "none"; (e.currentTarget).style.color = "hsl(221, 14%, 50%)"; }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: "10px 14px 0", flexShrink: 0 }}>
        <div style={{ position: "relative" }}>
          <Search size={13} style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            color: "hsl(221, 14%, 44%)", pointerEvents: "none",
          }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); if (e.target.value) setTab("faq"); }}
            placeholder="Search help…"
            style={{
              width: "100%", boxSizing: "border-box",
              background: "hsl(231, 25%, 15%)", border: "1px solid hsl(231, 22%, 22%)",
              borderRadius: "9px", padding: "7px 10px 7px 30px",
              color: "hsl(220, 20%, 88%)", fontSize: "0.78rem", outline: "none", fontFamily: "inherit",
            }}
          />
        </div>
      </div>

      {/* Tabs */}
      {!search && (
        <div style={{
          display: "flex", gap: "4px", padding: "10px 14px 0", flexShrink: 0,
        }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  padding: "6px 0", borderRadius: "8px", border: "none", cursor: "pointer",
                  background: active ? "hsl(231, 25%, 18%)" : "transparent",
                  color: active ? "hsl(220, 20%, 90%)" : "hsl(221, 14%, 50%)",
                  fontSize: "0.72rem", fontWeight: active ? 600 : 400,
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = "hsl(231, 25%, 15%)"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                <Icon size={12} /> {t.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Body */}
      <div style={{ overflowY: "auto", flex: 1, padding: "12px 14px 16px" }}>

        {/* Overview tab */}
        {(tab === "overview" && !search) && (
          <div>
            {/* Quick tip */}
            <div style={{
              background: "hsl(244, 60%, 16%)", border: "1px solid hsl(244, 50%, 28%)",
              borderRadius: "10px", padding: "12px 14px", marginBottom: "14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                <Zap size={13} style={{ color: "#7467F0" }} />
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#7467F0" }}>Quick Tip</span>
              </div>
              <p style={{ margin: 0, fontSize: "0.74rem", color: "hsl(220, 18%, 78%)", lineHeight: 1.6 }}>
                Ask your AI Assistant to plan your day, create tasks, add calendar events, or write notes — all by just typing or speaking.
              </p>
            </div>

            {/* Feature grid */}
            <p style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "hsl(221, 14%, 44%)", margin: "0 0 8px" }}>
              Navigate to
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {FEATURES.map(f => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.label}
                    onClick={() => handleFeatureClick(f.href)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 10px", borderRadius: "9px", border: "none",
                      background: "transparent", cursor: "pointer", width: "100%", textAlign: "left",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "hsl(231, 25%, 15%)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{
                      width: "28px", height: "28px", borderRadius: "8px", flexShrink: 0,
                      background: `color-mix(in srgb, ${f.color} 14%, transparent)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon size={13} style={{ color: f.color }} />
                    </span>
                    <div>
                      <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "hsl(220, 18%, 84%)" }}>{f.label}</div>
                      <div style={{ fontSize: "0.67rem", color: "hsl(221, 14%, 50%)" }}>{f.desc}</div>
                    </div>
                    <ChevronRight size={12} style={{ color: "hsl(221, 14%, 38%)", marginLeft: "auto" }} />
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "hsl(231, 22%, 18%)", margin: "14px 0" }} />

            {/* Report issue */}
            <div style={{
              background: "hsl(231, 25%, 14%)", borderRadius: "10px",
              padding: "12px 14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                <MessageSquare size={13} style={{ color: "hsl(221, 14%, 54%)" }} />
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "hsl(220, 18%, 74%)" }}>Get in touch</span>
              </div>
              <p style={{ margin: "0 0 10px", fontSize: "0.72rem", color: "hsl(221, 14%, 50%)", lineHeight: 1.55 }}>
                Have a bug to report or feature request? We'd love to hear from you.
              </p>
              <a
                href="mailto:support@flowbase.app"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: "hsl(231, 25%, 18%)", border: "1px solid hsl(231, 22%, 24%)",
                  borderRadius: "8px", padding: "6px 12px",
                  color: "hsl(220, 18%, 78%)", fontSize: "0.74rem", fontWeight: 500,
                  textDecoration: "none", transition: "background 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "hsl(231, 25%, 22%)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "hsl(231, 25%, 18%)"}
              >
                <ExternalLink size={11} /> support@flowbase.app
              </a>
            </div>
          </div>
        )}

        {/* FAQ tab */}
        {(tab === "faq" || search) && (
          <div>
            {!search && (
              <p style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "hsl(221, 14%, 44%)", margin: "0 0 4px" }}>
                Frequently Asked
              </p>
            )}
            {filteredFaqs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "28px 0", color: "hsl(221, 14%, 44%)", fontSize: "0.78rem" }}>
                No results for "{search}"
              </div>
            ) : (
              filteredFaqs.map((f, i) => <FAQItem key={i} faq={f} />)
            )}
          </div>
        )}

        {/* Shortcuts tab */}
        {(tab === "shortcuts" && !search) && (
          <div>
            <p style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "hsl(221, 14%, 44%)", margin: "0 0 10px" }}>
              Keyboard Shortcuts
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {SHORTCUTS.map((s, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 10px", borderRadius: "9px", background: "hsl(231, 25%, 14%)",
                }}>
                  <span style={{ fontSize: "0.78rem", color: "hsl(220, 18%, 78%)" }}>{s.label}</span>
                  <div style={{ display: "flex", gap: "4px" }}>
                    {s.keys.map(k => (
                      <kbd key={k} style={{
                        background: "hsl(231, 25%, 20%)", border: "1px solid hsl(231, 22%, 28%)",
                        borderRadius: "5px", padding: "2px 7px",
                        fontSize: "0.68rem", fontWeight: 600, color: "hsl(220, 18%, 80%)",
                        fontFamily: "inherit",
                      }}>{k}</kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ height: "1px", background: "hsl(231, 22%, 18%)", margin: "14px 0" }} />

            <div style={{ background: "hsl(231, 25%, 14%)", borderRadius: "10px", padding: "12px 14px" }}>
              <p style={{ margin: 0, fontSize: "0.73rem", color: "hsl(221, 14%, 52%)", lineHeight: 1.6 }}>
                More keyboard shortcuts are coming in a future update. Voice input via the AI Assistant microphone is also available.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: "1px solid hsl(231, 22%, 18%)", padding: "10px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
      }}>
        <span style={{ fontSize: "0.64rem", color: "hsl(221, 14%, 38%)" }}>FlowBase v0.1.0 BETA</span>
        <span style={{ fontSize: "0.64rem", color: "hsl(221, 14%, 38%)" }}>Built with ❤️</span>
      </div>
    </div>
  );
}
