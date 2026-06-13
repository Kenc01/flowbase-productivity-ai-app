import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard, Bot, KanbanSquare, NotebookPen, Timer, Trophy,
  CheckCircle2, Clock, Calendar, Plus, ArrowRight, Sparkles, Zap, Bell,
  Search, ChevronDown, Target, TrendingUp, AlertCircle, Loader2,
  StickyNote, Lightbulb, Activity, ListTodo,
  BarChart3, BookOpen, AlarmClock, Star, Flame, TrendingDown,
} from "lucide-react";
import { api } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────

interface KanbanTask {
  id: string; boardId: string; columnId: string; title: string;
  description: string; dueDate: string; priority: string; labels: string[];
}
interface KanbanColumn { id: string; boardId: string; name: string; order: number; }
interface KanbanBoard { id: string; name: string; color: string; }
interface CalendarEvent { id: string; title: string; date: string; category: string; type: string; notes: string; }
interface Note { id: string; title: string; content: string; color: string; symbol: string; pinned: boolean; updatedAt: string; }
interface AITemplate { id: string; appName: string; description: string; icon: string; color: string; createdAt: string; }
interface Space { id: string; name: string; color: string; updatedAt: string; }
interface Page { id: string; title: string; emoji: string; spaceId: string; updatedAt: string; }

interface PerfDay { date: string; totalBlocks: number; completedBlocks: number; pct: number; }
interface PerfStats { days: PerfDay[]; streak: number; avgPct: number; totalDaysTracked: number; }

interface DashData {
  boards: KanbanBoard[]; columns: KanbanColumn[]; tasks: KanbanTask[];
  events: CalendarEvent[]; notes: Note[];
  templates: AITemplate[]; spaces: Space[]; pages: Page[];
  chatCount: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);
const WEEK_END = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function relativeDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatEventDate(date: string) {
  if (!date) return "";
  if (date === TODAY) return "Today";
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (date === tomorrow) return "Tomorrow";
  return new Date(date + "T00:00:00").toLocaleDateString([], { month: "short", day: "numeric" });
}

const CAT_COLORS: Record<string, string> = {
  work: "#7467F0", personal: "#06B6D4", health: "#10B981",
  finance: "#F59E0B", other: "#6b7280",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "#F43F5E", medium: "#F59E0B", low: "#10B981",
};

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skel({ w = "100%", h = 16, r = 6 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, background: "var(--fb-muted)", animation: "fb-shimmer 1.4s ease infinite" }} />
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "var(--fb-surface)", borderRadius: 12,
      border: "1px solid var(--fb-border)", boxShadow: "var(--fb-shadow-sm)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardHeader({ title, icon, action }: { title: string; icon: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px", borderBottom: "1px solid var(--fb-border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        {icon}
        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: "0.85rem", fontWeight: 700, color: "var(--fb-text)" }}>{title}</span>
      </div>
      {action}
    </div>
  );
}

function EmptyRow({ msg }: { msg: string }) {
  return (
    <div style={{ padding: "20px 16px", textAlign: "center", fontSize: "0.78rem", color: "var(--fb-text-muted)" }}>{msg}</div>
  );
}

// ── Performance Card ──────────────────────────────────────────────────────────

function PerformanceCard({ perf, navigate }: { perf: PerfStats | null; navigate: (p: string) => void }) {
  const last14 = perf?.days ?? [];
  const last7 = last14.slice(-7);
  const today = new Date().toISOString().slice(0, 10);
  const todayData = last14.find(d => d.date === today);

  const pctColor = (pct: number) => {
    if (pct === 0) return "rgba(255,255,255,0.1)";
    if (pct >= 80) return "#10b981";
    if (pct >= 50) return "#f59e0b";
    return "#F43F5E";
  };

  const weekLabel = (date: string) => {
    const d = new Date(date + "T12:00:00");
    return d.toLocaleDateString([], { weekday: "short" });
  };

  if (!perf) {
    return (
      <div style={{ background: "var(--fb-surface)", borderRadius: 12, border: "1px solid var(--fb-border)", padding: "20px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(116,103,240,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BarChart3 size={18} color="var(--fb-violet)" />
          </div>
          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--fb-text)" }}>Schedule Performance</div>
            <div style={{ fontSize: "0.72rem", color: "var(--fb-text-muted)" }}>No schedule data yet — start planning your days!</div>
          </div>
        </div>
        <button onClick={() => navigate("/dashboard/daily-schedule")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "none", background: "rgba(116,103,240,0.15)", color: "var(--fb-violet)", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
          Plan Today <ArrowRight size={12} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--fb-surface)", borderRadius: 12, border: "1px solid var(--fb-border)", padding: "18px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BarChart3 size={16} color="var(--fb-violet)" />
          <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--fb-text)", fontFamily: "'Outfit',sans-serif" }}>Schedule Performance</span>
        </div>
        <button onClick={() => navigate("/dashboard/daily-schedule")} style={{ fontSize: "0.72rem", color: "var(--fb-violet)", fontWeight: 500, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
          Open Schedule <ArrowRight size={10} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "auto auto auto 1fr", gap: 16, alignItems: "center", marginBottom: 18 }}>
        {/* Streak */}
        <div style={{ textAlign: "center", padding: "10px 16px", background: perf.streak > 0 ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.04)", borderRadius: 10, border: `1px solid ${perf.streak > 0 ? "rgba(245,158,11,0.25)" : "var(--fb-border)"}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center", marginBottom: 3 }}>
            <Flame size={14} color={perf.streak > 0 ? "#f59e0b" : "rgba(255,255,255,0.2)"} />
            <span style={{ fontSize: "1.6rem", fontWeight: 800, color: perf.streak > 0 ? "#f59e0b" : "rgba(255,255,255,0.3)", fontVariantNumeric: "tabular-nums" }}>{perf.streak}</span>
          </div>
          <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--fb-text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Day Streak</div>
        </div>

        {/* Avg pct */}
        <div style={{ textAlign: "center", padding: "10px 16px", background: "rgba(116,103,240,0.08)", borderRadius: 10, border: "1px solid rgba(116,103,240,0.18)" }}>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--fb-violet)", fontVariantNumeric: "tabular-nums", marginBottom: 3 }}>{perf.avgPct}%</div>
          <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--fb-text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Avg Completion</div>
        </div>

        {/* Days tracked */}
        <div style={{ textAlign: "center", padding: "10px 16px", background: "rgba(16,185,129,0.07)", borderRadius: 10, border: "1px solid rgba(16,185,129,0.18)" }}>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#10b981", fontVariantNumeric: "tabular-nums", marginBottom: 3 }}>{perf.totalDaysTracked}</div>
          <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--fb-text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Days Tracked</div>
        </div>

        {/* Today's progress */}
        <div style={{ padding: "10px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid var(--fb-border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--fb-text-muted)" }}>Today</span>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--fb-text)" }}>
              {todayData ? `${todayData.completedBlocks}/${todayData.totalBlocks}` : "No schedule"}
            </span>
          </div>
          <div style={{ height: 7, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden", marginBottom: 4 }}>
            <div style={{ height: "100%", width: `${todayData?.pct ?? 0}%`, background: pctColor(todayData?.pct ?? 0), borderRadius: 99, transition: "width 0.4s ease" }} />
          </div>
          <div style={{ fontSize: "0.65rem", color: "var(--fb-text-muted)" }}>
            {todayData?.totalBlocks === 0 ? "Plan your day to start tracking" : `${todayData?.pct ?? 0}% blocks completed`}
          </div>
        </div>
      </div>

      {/* 7-day bar chart */}
      <div>
        <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--fb-text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Last 7 Days</div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 56 }}>
          {last7.map(day => {
            const isToday = day.date === today;
            const barH = day.totalBlocks === 0 ? 4 : Math.max((day.pct / 100) * 48, 4);
            const col = day.totalBlocks === 0 ? "rgba(255,255,255,0.08)" : pctColor(day.pct);
            return (
              <div key={day.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div title={`${day.date}: ${day.completedBlocks}/${day.totalBlocks} blocks (${day.pct}%)`}
                  style={{ width: "100%", height: barH, background: col, borderRadius: "4px 4px 2px 2px", transition: "height 0.3s ease", outline: isToday ? `2px solid rgba(116,103,240,0.6)` : "none", outlineOffset: 2, position: "relative" }}>
                  {isToday && <div style={{ position: "absolute", top: -6, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: "var(--fb-violet)" }} />}
                </div>
                <span style={{ fontSize: "0.57rem", color: isToday ? "var(--fb-violet)" : "var(--fb-text-muted)", fontWeight: isToday ? 700 : 400, textTransform: "uppercase" }}>
                  {weekLabel(day.date)}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
          {[{ color: "#10b981", label: "80–100%" }, { color: "#f59e0b", label: "50–79%" }, { color: "#F43F5E", label: "1–49%" }, { color: "rgba(255,255,255,0.08)", label: "No schedule" }].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
              <span style={{ fontSize: "0.6rem", color: "var(--fb-text-muted)" }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const [searchFocused, setSearchFocused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashData | null>(null);
  const [perfData, setPerfData] = useState<PerfStats | null>(null);

  const displayName = (document.querySelector<HTMLMetaElement>('meta[name="replit-user-name"]')?.content) || "there";
  const initials = displayName.slice(0, 2).toUpperCase();

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [kanban, events, notes, templates, spaces, chatHistory, perfStats] = await Promise.all([
        api.get<{ boards: KanbanBoard[]; columns: KanbanColumn[]; tasks: KanbanTask[] }>("/kanban/boards"),
        api.get<CalendarEvent[]>("/calendar"),
        api.get<Note[]>("/notes"),
        api.get<AITemplate[]>("/ai-templates"),
        api.get<Space[]>("/spaces"),
        api.get<any[]>("/ai-assistant/history").catch(() => [] as any[]),
        api.get<PerfStats>("/daily-schedule/stats?days=14").catch(() => null),
      ]);
      setPerfData(perfStats);

      // Pages need spaces to exist, load if any
      let pages: Page[] = [];
      if (spaces.length) {
        pages = await api.get<Page[]>("/pages").catch(() => []);
      }

      setData({
        boards: kanban.boards ?? [],
        columns: kanban.columns ?? [],
        tasks: kanban.tasks ?? [],
        events: Array.isArray(events) ? events : [],
        notes: Array.isArray(notes) ? notes : [],
        templates: Array.isArray(templates) ? templates : [],
        spaces: Array.isArray(spaces) ? spaces : [],
        pages: Array.isArray(pages) ? pages : [],
        chatCount: Array.isArray(chatHistory) ? chatHistory.filter(m => m.role === "user").length : 0,
      });
    } catch (e: any) {
      setError(e.message ?? "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Computed stats ──────────────────────────────────────────────────────────

  const doneColIds = new Set(
    (data?.columns ?? []).filter(c => c.name.toLowerCase().includes("done")).map(c => c.id)
  );
  const tasks = data?.tasks ?? [];
  const doneTasks = tasks.filter(t => doneColIds.has(t.columnId));
  const pendingTasks = tasks.filter(t => !doneColIds.has(t.columnId));
  const overdueTasks = pendingTasks.filter(t => t.dueDate && t.dueDate < TODAY);
  const todayTasks = pendingTasks.filter(t => t.dueDate === TODAY);
  const pct = tasks.length ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  const events = data?.events ?? [];
  const upcomingEvents = events
    .filter(e => e.date >= TODAY)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);
  const todayEvents = events.filter(e => e.date === TODAY);

  const notes = [...(data?.notes ?? [])].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const templates = data?.templates ?? [];

  // ── Recent activity feed ────────────────────────────────────────────────────

  const recentItems: Array<{ title: string; type: string; color: string; Icon: React.ElementType; updatedAt: string; href: string }> = [
    ...notes.slice(0, 3).map(n => ({ title: n.title || "Untitled Note", type: "Note", color: n.color || "#F43F5E", Icon: StickyNote, updatedAt: n.updatedAt, href: "/dashboard/notes" })),
    ...(data?.boards ?? []).slice(0, 2).map(b => ({ title: b.name, type: "Kanban", color: b.color || "#10B981", Icon: KanbanSquare, updatedAt: "", href: "/dashboard/kanban" })),
  ]
    .filter(i => i.title)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 6);

  // ── AI Insights ─────────────────────────────────────────────────────────────

  const insights: Array<{ text: string; color: string; Icon: React.ElementType }> = [];
  if (overdueTasks.length) insights.push({ text: `You have ${overdueTasks.length} overdue task${overdueTasks.length !== 1 ? "s" : ""} that need attention.`, color: "#F43F5E", Icon: AlertCircle });
  if (todayEvents.length) insights.push({ text: `${todayEvents.length} event${todayEvents.length !== 1 ? "s" : ""} scheduled for today.`, color: "#06B6D4", Icon: Calendar });
  if (pct >= 70 && tasks.length > 0) insights.push({ text: `Great work! You've completed ${pct}% of your total tasks.`, color: "#10B981", Icon: CheckCircle2 });
  if (tasks.length > 0 && pct < 30) insights.push({ text: `${pendingTasks.length} tasks still pending — consider tackling high-priority ones first.`, color: "#F59E0B", Icon: Lightbulb });
  if (notes.length > 0 && notes.length > (data?.boards.length ?? 0)) {
    insights.push({ text: `Notes is your most active workspace with ${notes.length} note${notes.length !== 1 ? "s" : ""}.`, color: "#8B5CF6", Icon: Activity });
  }
  if (data?.chatCount && data.chatCount > 0) {
    insights.push({ text: `You've asked Grind OS AI ${data.chatCount} question${data.chatCount !== 1 ? "s" : ""} — keep exploring!`, color: "#7467F0", Icon: Bot });
  }
  if (todayTasks.length) {
    insights.push({ text: `${todayTasks.length} task${todayTasks.length !== 1 ? "s" : ""} due today — stay focused!`, color: "#F59E0B", Icon: Target });
  }
  if (!insights.length) {
    insights.push({ text: "Start adding tasks, notes, and calendar events to see AI insights here.", color: "#6b7280", Icon: Sparkles });
  }

  // ── Feature status cards ────────────────────────────────────────────────────

  const FEATURES = [
    { label: "Calendar", Icon: Calendar, color: "#06B6D4", count: events.length, unit: "event", href: "/dashboard/calendar", active: events.length > 0 },
    { label: "Kanban", Icon: KanbanSquare, color: "#7467F0", count: tasks.length, unit: "task", href: "/dashboard/kanban", active: tasks.length > 0 },
    { label: "Notes", Icon: NotebookPen, color: "#F43F5E", count: notes.length, unit: "note", href: "/dashboard/notes", active: notes.length > 0 },
    { label: "Deep Work", Icon: Timer, color: "#6366F1", count: 0, unit: "session", href: "/dashboard/deep-work", active: false },
    { label: "AI Assistant", Icon: Bot, color: "#10B981", count: data?.chatCount ?? 0, unit: "chat msg", href: "/dashboard/ai-assistant", active: (data?.chatCount ?? 0) > 0 },
    { label: "Goal Map", Icon: Trophy, color: "#f59e0b", count: 0, unit: "goal", href: "/dashboard/goal-map", active: false },
  ];

  // ── Quick actions ────────────────────────────────────────────────────────────

  const QUICK = [
    { label: "New Task", Icon: ListTodo, color: "#7467F0", bg: "#7467F012", href: "/dashboard/kanban" },
    { label: "Calendar Event", Icon: AlarmClock, color: "#06B6D4", bg: "#06B6D412", href: "/dashboard/calendar" },
    { label: "New Note", Icon: StickyNote, color: "#F43F5E", bg: "#F43F5E12", href: "/dashboard/notes" },
    { label: "Deep Work", Icon: Timer, color: "#6366F1", bg: "#6366F112", href: "/dashboard/deep-work" },
    { label: "Ask JARVIS", Icon: Bot, color: "#10B981", bg: "#10B98112", href: "/dashboard/ai-assistant" },
    { label: "Goal Map", Icon: Trophy, color: "#f59e0b", bg: "#f59e0b12", href: "/dashboard/goal-map" },
  ];

  return (
    <>
      <style>{`
        @keyframes fb-shimmer { 0%,100%{opacity:1}50%{opacity:0.45} }
        .db-stat-card:hover { box-shadow:var(--fb-shadow)!important; transform:translateY(-2px)!important; }
        .db-quick:hover { transform:translateY(-2px)!important; box-shadow:0 6px 18px rgba(0,0,0,0.08)!important; }
        .db-feature:hover { border-color:var(--fb-violet)!important; box-shadow:0 0 0 3px rgba(116,103,240,0.08)!important; }
        .db-row:hover { background:var(--fb-bg)!important; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>

        {/* ── Top bar ───────────────────────────────────────────────── */}
        <header style={{
          height: 64, borderBottom: "1px solid var(--fb-border)",
          background: "var(--fb-surface)", display: "flex", alignItems: "center",
          padding: "0 24px", gap: 16, position: "sticky", top: 0, zIndex: 30,
          flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: "auto" }}>
            <LayoutDashboard size={18} color="var(--fb-violet)" strokeWidth={2} />
            <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "1.05rem", fontWeight: 700, color: "var(--fb-text)", margin: 0 }}>Dashboard</h1>
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: searchFocused ? "var(--fb-surface)" : "var(--fb-bg)",
            border: `1px solid ${searchFocused ? "var(--fb-violet)" : "var(--fb-border)"}`,
            borderRadius: 8, padding: "6px 12px", width: 220, transition: "all 0.2s ease",
            boxShadow: searchFocused ? "0 0 0 3px rgba(116,103,240,0.12)" : "none",
          }}>
            <Search size={13} color="var(--fb-text-muted)" />
            <input type="text" placeholder="Search everything…"
              onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
              style={{ border: "none", background: "transparent", outline: "none", fontSize: "0.8rem", color: "var(--fb-text)", width: "100%", fontFamily: "'Inter',sans-serif" }} />
            <kbd style={{ fontSize: "0.6rem", color: "var(--fb-text-muted)", background: "var(--fb-muted)", padding: "2px 5px", borderRadius: 4, fontFamily: "monospace", border: "1px solid var(--fb-border)" }}>⌘K</kbd>
          </div>

          <button style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid var(--fb-border)", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", color: "var(--fb-text-muted)", transition: "background 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--fb-bg)"; e.currentTarget.style.color = "#F59E0B"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--fb-text-muted)"; }}>
            <Bell size={15} strokeWidth={1.8} />
            {todayEvents.length > 0 && <span style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: "50%", background: "#F43F5E", border: "1.5px solid var(--fb-surface)" }} />}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 10px 4px 4px", borderRadius: 8, border: "1px solid var(--fb-border)", background: "transparent", transition: "background 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--fb-bg)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,var(--fb-violet),var(--fb-cyan))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, color: "#fff", fontFamily: "'Outfit',sans-serif", overflow: "hidden" }}>
              {user?.imageUrl ? <img src={user.imageUrl} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
            </div>
            <span style={{ fontSize: "0.78rem", fontWeight: 500, color: "var(--fb-text)" }}>{displayName}</span>
            <ChevronDown size={12} color="var(--fb-text-muted)" />
          </div>
        </header>

        {/* ── Main content ─────────────────────────────────────────── */}
        <main style={{ flex: 1, padding: "24px 28px 40px", display: "flex", flexDirection: "column", gap: 20, overflowY: "auto" }}>

          {/* Greeting */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
              <Sparkles size={15} color="#F59E0B" />
              <span style={{ fontSize: "0.78rem", color: "var(--fb-text-muted)", fontWeight: 500 }}>{greeting()} —</span>
            </div>
            <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "1.55rem", fontWeight: 700, color: "var(--fb-text)", margin: 0 }}>
              Welcome back, {displayName} 👋
            </h2>
            {!loading && (
              <p style={{ fontSize: "0.82rem", color: "var(--fb-text-muted)", margin: "4px 0 0" }}>
                {todayTasks.length > 0
                  ? <><strong style={{ color: "var(--fb-text)" }}>{todayTasks.length} task{todayTasks.length !== 1 ? "s" : ""} due today</strong> · </>
                  : "No tasks due today · "}
                {upcomingEvents.length > 0
                  ? <strong style={{ color: "var(--fb-violet)" }}>{upcomingEvents.length} upcoming event{upcomingEvents.length !== 1 ? "s" : ""}</strong>
                  : "No upcoming events"}
                {overdueTasks.length > 0 && <> · <strong style={{ color: "#F43F5E" }}>{overdueTasks.length} overdue</strong></>}
              </p>
            )}
          </div>

          {/* Quick Actions */}
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--fb-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Quick Actions</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10 }}>
              {QUICK.map(q => {
                const Icon = q.Icon;
                return (
                  <button key={q.label} className="db-quick" onClick={() => navigate(q.href)} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                    background: "var(--fb-surface)", border: "1px solid var(--fb-border)",
                    borderRadius: 10, cursor: "pointer", transition: "all 0.18s",
                    boxShadow: "var(--fb-shadow-sm)", textAlign: "left",
                  }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: q.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={15} color={q.color} strokeWidth={2} />
                    </div>
                    <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--fb-text)", lineHeight: 1.3 }}>{q.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
            {loading ? [1, 2, 3, 4].map(i => (
              <div key={i} style={{ background: "var(--fb-surface)", borderRadius: 12, border: "1px solid var(--fb-border)", padding: "16px 18px" }}>
                <Skel w={36} h={36} r={9} />
                <div style={{ marginTop: 10 }}><Skel w="50%" h={28} r={4} /><Skel w="70%" h={12} r={4} /></div>
              </div>
            )) : [
              { label: "Total Tasks", value: tasks.length, sub: `${doneTasks.length} completed`, color: "#7467F0", bg: "#7467F012", Icon: ListTodo },
              { label: "Done", value: doneTasks.length, sub: `${pct}% completion rate`, color: "#10B981", bg: "#10B98112", Icon: CheckCircle2 },
              { label: "Pending", value: pendingTasks.length, sub: overdueTasks.length ? `${overdueTasks.length} overdue` : "on track", color: "#F59E0B", bg: "#F59E0B12", Icon: Clock },
              { label: "Events", value: events.length, sub: `${todayEvents.length} today`, color: "#06B6D4", bg: "#06B6D412", Icon: Calendar },
            ].map((s, i) => {
              const Icon = s.Icon;
              return (
                <div key={i} className="db-stat-card" style={{ background: "var(--fb-surface)", borderRadius: 12, padding: "16px 18px", border: "1px solid var(--fb-border)", display: "flex", alignItems: "flex-start", gap: 12, boxShadow: "var(--fb-shadow-sm)", transition: "all 0.18s", cursor: "default" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={16} color={s.color} />
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: "1.6rem", fontWeight: 700, color: "var(--fb-text)", lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--fb-text-muted)", marginTop: 3 }}>{s.label}</div>
                    <div style={{ fontSize: "0.68rem", color: s.color, fontWeight: 600, marginTop: 2 }}>{s.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Performance Card */}
          <PerformanceCard perf={perfData} navigate={navigate} />

          {/* Main 2-col grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>

            {/* Upcoming Calendar */}
            <Card>
              <CardHeader
                title="Upcoming Calendar"
                icon={<Calendar size={14} color="#06B6D4" />}
                action={<button onClick={() => navigate("/dashboard/calendar")} style={{ fontSize: "0.72rem", color: "var(--fb-violet)", fontWeight: 500, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>See all <ArrowRight size={10} /></button>}
              />
              <div style={{ padding: "6px" }}>
                {loading ? [1, 2, 3].map(i => <div key={i} style={{ padding: "8px 10px" }}><Skel h={14} w="60%" /><Skel h={10} w="40%" /></div>)
                  : upcomingEvents.length === 0 ? <EmptyRow msg="No upcoming events. Add one in Calendar →" />
                    : upcomingEvents.map(ev => (
                      <div key={ev.id} className="db-row" onClick={() => navigate("/dashboard/calendar")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, cursor: "pointer", transition: "background 0.15s" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: CAT_COLORS[ev.category] ?? "#6b7280", flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--fb-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
                          <div style={{ fontSize: "0.68rem", color: "var(--fb-text-muted)" }}>{ev.type} · {ev.category}</div>
                        </div>
                        <span style={{ fontSize: "0.68rem", fontWeight: 600, color: ev.date === TODAY ? "#F43F5E" : "var(--fb-text-muted)", whiteSpace: "nowrap" }}>
                          {formatEventDate(ev.date)}
                        </span>
                      </div>
                    ))}
              </div>
              <div style={{ padding: "8px 16px", borderTop: "1px solid var(--fb-border)" }}>
                <button onClick={() => navigate("/dashboard/calendar")} style={{ width: "100%", padding: "7px", borderRadius: 8, border: "1px dashed var(--fb-border-strong)", background: "transparent", cursor: "pointer", fontSize: "0.75rem", color: "var(--fb-text-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  <Plus size={12} /> Add Calendar Event
                </button>
              </div>
            </Card>

            {/* Task Summary */}
            <Card>
              <CardHeader
                title="Task Summary"
                icon={<BarChart3 size={14} color="#7467F0" />}
                action={<button onClick={() => navigate("/dashboard/kanban")} style={{ fontSize: "0.72rem", color: "var(--fb-violet)", fontWeight: 500, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>Open Kanban <ArrowRight size={10} /></button>}
              />
              <div style={{ padding: "14px 16px" }}>
                {loading ? <><Skel h={14} /><Skel h={8} r={4} /><Skel h={12} w="60%" /></>
                  : tasks.length === 0 ? <EmptyRow msg="No tasks yet. Create your first task →" />
                    : <>
                      {/* Progress bar */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--fb-text-muted)" }}>Completion</span>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#10B981" }}>{pct}%</span>
                        </div>
                        <div style={{ height: 8, borderRadius: 4, background: "var(--fb-muted)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#7467F0,#10B981)", borderRadius: 4, transition: "width 0.5s ease" }} />
                        </div>
                      </div>
                      {/* Task breakdown */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {[
                          { label: "Total tasks", value: tasks.length, color: "var(--fb-text-muted)" },
                          { label: "Completed", value: doneTasks.length, color: "#10B981" },
                          { label: "Pending", value: pendingTasks.length, color: "#F59E0B" },
                          { label: "Overdue", value: overdueTasks.length, color: "#F43F5E" },
                        ].map(r => (
                          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.78rem", color: "var(--fb-text-muted)" }}>{r.label}</span>
                            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: r.color }}>{r.value}</span>
                          </div>
                        ))}
                      </div>
                      {/* Priority tasks */}
                      {pendingTasks.length > 0 && (
                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--fb-border)" }}>
                          <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--fb-text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Top Pending</div>
                          {pendingTasks
                            .sort((a, b) => (a.priority === "high" ? -1 : b.priority === "high" ? 1 : 0))
                            .slice(0, 3)
                            .map(t => (
                              <div key={t.id} className="db-row" onClick={() => navigate("/dashboard/kanban")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 7, cursor: "pointer", transition: "background 0.15s", marginBottom: 2 }}>
                                <div style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid var(--fb-border-strong)`, flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: "0.78rem", color: "var(--fb-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                                <span style={{ fontSize: "0.62rem", fontWeight: 600, color: PRIORITY_COLORS[t.priority] ?? "#6b7280", background: `${PRIORITY_COLORS[t.priority] ?? "#6b7280"}14`, padding: "2px 6px", borderRadius: 4 }}>{t.priority}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </>}
              </div>
              <div style={{ padding: "8px 16px", borderTop: "1px solid var(--fb-border)" }}>
                <button onClick={() => navigate("/dashboard/kanban")} style={{ width: "100%", padding: "7px", borderRadius: 8, border: "1px dashed var(--fb-border-strong)", background: "transparent", cursor: "pointer", fontSize: "0.75rem", color: "var(--fb-text-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  <Plus size={12} /> Create Task
                </button>
              </div>
            </Card>
          </div>

          {/* Feature Status */}
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--fb-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Feature Overview</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 10 }}>
              {FEATURES.map(f => {
                const Icon = f.Icon;
                return (
                  <button key={f.label} className="db-feature" onClick={() => navigate(f.href)} style={{
                    display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10, padding: "14px",
                    background: "var(--fb-surface)", border: "1px solid var(--fb-border)",
                    borderRadius: 10, cursor: "pointer", transition: "all 0.18s", textAlign: "left",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${f.color}16`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon size={16} color={f.color} />
                      </div>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: f.active ? "#10B981" : "#d1d5db" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--fb-text)" }}>{f.label}</div>
                      <div style={{ fontSize: "0.68rem", color: "var(--fb-text-muted)", marginTop: 2 }}>
                        {loading ? "—" : `${f.count} ${f.unit}${f.count !== 1 ? "s" : ""}`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2-col: Recent Activity + AI Insights */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>

            {/* Recent Activity */}
            <Card>
              <CardHeader title="Recent Activity" icon={<TrendingUp size={14} color="var(--fb-violet)" />} />
              <div style={{ padding: "6px" }}>
                {loading ? [1, 2, 3, 4].map(i => <div key={i} style={{ padding: "8px 10px", display: "flex", gap: 10 }}><Skel w={30} h={30} r={7} /><div style={{ flex: 1 }}><Skel h={13} /><Skel h={10} w="60%" /></div></div>)
                  : recentItems.length === 0 ? <EmptyRow msg="Start creating content to see activity here." />
                    : recentItems.map((r, i) => {
                      const Icon = r.Icon;
                      return (
                        <div key={i} className="db-row" onClick={() => navigate(r.href)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, cursor: "pointer", transition: "background 0.15s" }}>
                          <div style={{ width: 30, height: 30, borderRadius: 7, background: `${r.color}16`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Icon size={13} color={r.color} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "0.79rem", fontWeight: 500, color: "var(--fb-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</div>
                            <div style={{ fontSize: "0.68rem", color: "var(--fb-text-muted)" }}>{r.type}</div>
                          </div>
                          {r.updatedAt && <span style={{ fontSize: "0.65rem", color: "var(--fb-text-muted)", whiteSpace: "nowrap" }}>{relativeDate(r.updatedAt)}</span>}
                        </div>
                      );
                    })}
              </div>
            </Card>

            {/* AI Insights */}
            <Card>
              <CardHeader title="AI Insights" icon={<Lightbulb size={14} color="#F59E0B" />}
                action={<button onClick={() => navigate("/dashboard/ai-assistant")} style={{ fontSize: "0.72rem", color: "var(--fb-violet)", fontWeight: 500, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>Ask AI <ArrowRight size={10} /></button>} />
              <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                {loading ? [1, 2, 3].map(i => <div key={i} style={{ padding: "10px" }}><Skel h={13} w="80%" /><Skel h={10} w="60%" /></div>)
                  : insights.slice(0, 5).map((ins, i) => {
                    const Icon = ins.Icon;
                    return (
                      <div key={i} style={{ display: "flex", gap: 10, padding: "10px 10px", borderRadius: 8, background: `${ins.color}08`, border: `1px solid ${ins.color}20` }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: `${ins.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                          <Icon size={13} color={ins.color} />
                        </div>
                        <p style={{ fontSize: "0.78rem", color: "var(--fb-text)", margin: 0, lineHeight: 1.5 }}>{ins.text}</p>
                      </div>
                    );
                  })}
              </div>
            </Card>
          </div>

          {/* AI CTA Banner */}
          <div onClick={() => navigate("/dashboard/ai-assistant")} style={{
            background: "linear-gradient(135deg,hsl(246 80% 14%) 0%,hsl(246 60% 18%) 50%,hsl(195 80% 12%) 100%)",
            borderRadius: 14, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16,
            border: "1px solid hsl(246 40% 28%)", boxShadow: "0 4px 20px rgba(124,111,247,0.2)",
            cursor: "pointer", transition: "transform 0.2s,box-shadow 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(124,111,247,0.28)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(124,111,247,0.2)"; }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,var(--fb-violet),var(--fb-cyan))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 12px rgba(124,111,247,0.4)" }}>
              <Zap size={20} color="#fff" strokeWidth={2.5} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: "0.95rem", fontWeight: 700, color: "#f0f0f8", marginBottom: 3 }}>Grind OS AI is ready</div>
              <div style={{ fontSize: "0.76rem", color: "hsl(220 20% 65%)" }}>
                {data?.chatCount
                  ? `You've had ${data.chatCount} conversations — ask about your schedule, tasks, and more.`
                  : "Ask anything — summarize notes, generate templates, plan your week."}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8, background: "rgba(124,111,247,0.25)", border: "1px solid rgba(124,111,247,0.35)", color: "#b0a8ff", fontSize: "0.78rem", fontWeight: 600, whiteSpace: "nowrap" }}>
              Open AI <ArrowRight size={12} strokeWidth={2.5} />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 10, fontSize: "0.8rem", color: "#b91c1c" }}>
              <AlertCircle size={15} />
              {error}
              <button onClick={load} style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#7467F0", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Retry</button>
            </div>
          )}

        </main>
      </div>
    </>
  );
}
