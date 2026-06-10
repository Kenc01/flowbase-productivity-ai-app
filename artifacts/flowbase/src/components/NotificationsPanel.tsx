import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  X, Bell, AlertCircle, Clock, CalendarDays, Zap, StickyNote,
  CalendarClock, CheckCircle2, RefreshCw, Inbox,
} from "lucide-react";
import { api } from "@/lib/api";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  color: string;
  icon: string;
  link: string;
  ts: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  AlertCircle,
  Clock,
  CalendarDays,
  CalendarClock,
  Zap,
  StickyNote,
};

const TYPE_LABEL: Record<string, string> = {
  overdue: "Overdue",
  due_today: "Due Today",
  due_tomorrow: "Due Tomorrow",
  event_today: "Today's Events",
  event_tomorrow: "Tomorrow",
  high_priority: "High Priority",
  pinned_note: "Pinned",
};

export function NotificationsPanel({
  open,
  onClose,
  sidebarWidth,
  onCountChange,
}: {
  open: boolean;
  onClose: () => void;
  sidebarWidth: number;
  onCountChange: (n: number) => void;
}) {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("fb-dismissed-notifs") || "[]")); }
    catch { return new Set(); }
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  async function load() {
    setLoading(true);
    try {
      const data = await api.get("/notifications");
      setNotifs(data);
      const visible = data.filter((n: Notification) => !dismissed.has(n.id));
      onCountChange(visible.length);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) load();
  }, [open]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, onClose]);

  function dismiss(id: string) {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    localStorage.setItem("fb-dismissed-notifs", JSON.stringify([...next]));
    const visible = notifs.filter(n => !next.has(n.id));
    onCountChange(visible.length);
  }

  function dismissAll() {
    const next = new Set(notifs.map(n => n.id));
    setDismissed(next);
    localStorage.setItem("fb-dismissed-notifs", JSON.stringify([...next]));
    onCountChange(0);
  }

  function handleItemClick(link: string) {
    navigate(link);
    onClose();
  }

  const visible = notifs.filter(n => !dismissed.has(n.id));

  const groups: Record<string, Notification[]> = {};
  for (const n of visible) {
    const grp = TYPE_LABEL[n.type] ?? n.type;
    if (!groups[grp]) groups[grp] = [];
    groups[grp].push(n);
  }

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 900,
        pointerEvents: open ? "auto" : "none",
        opacity: open ? 1 : 0,
        transition: "opacity 0.2s ease",
      }} />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: "fixed",
          bottom: "12px",
          left: `${sidebarWidth + 8}px`,
          width: "340px",
          maxHeight: "520px",
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
            <Bell size={15} style={{ color: "var(--fb-amber)" }} />
            <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "hsl(220, 20%, 90%)" }}>
              Notifications
            </span>
            {visible.length > 0 && (
              <span style={{
                background: "var(--fb-amber)", color: "#000", fontSize: "0.6rem",
                fontWeight: 700, borderRadius: "20px", padding: "1px 7px",
              }}>{visible.length}</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {visible.length > 0 && (
              <button onClick={dismissAll} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "hsl(221, 14%, 50%)", fontSize: "0.7rem", padding: "4px 8px",
                borderRadius: "6px", transition: "background 0.15s, color 0.15s",
              }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = "hsl(231, 25%, 16%)"; (e.target as HTMLElement).style.color = "hsl(220, 20%, 80%)"; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = "none"; (e.target as HTMLElement).style.color = "hsl(221, 14%, 50%)"; }}
              >
                Clear all
              </button>
            )}
            <button onClick={load} title="Refresh" style={{
              background: "none", border: "none", cursor: "pointer",
              color: "hsl(221, 14%, 50%)", padding: "4px", borderRadius: "6px",
              display: "flex", alignItems: "center",
              transition: "background 0.15s, color 0.15s",
            }}
              onMouseEnter={e => { (e.currentTarget).style.background = "hsl(231, 25%, 16%)"; (e.currentTarget).style.color = "hsl(220, 20%, 80%)"; }}
              onMouseLeave={e => { (e.currentTarget).style.background = "none"; (e.currentTarget).style.color = "hsl(221, 14%, 50%)"; }}
            >
              <RefreshCw size={12} />
            </button>
            <button onClick={onClose} style={{
              background: "none", border: "none", cursor: "pointer",
              color: "hsl(221, 14%, 50%)", padding: "4px", borderRadius: "6px",
              display: "flex", alignItems: "center",
              transition: "background 0.15s, color 0.15s",
            }}
              onMouseEnter={e => { (e.currentTarget).style.background = "hsl(231, 25%, 16%)"; (e.currentTarget).style.color = "hsl(220, 20%, 80%)"; }}
              onMouseLeave={e => { (e.currentTarget).style.background = "none"; (e.currentTarget).style.color = "hsl(221, 14%, 50%)"; }}
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
          {loading && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: "10px", padding: "40px 20px",
              color: "hsl(221, 14%, 50%)", fontSize: "0.8rem",
            }}>
              <RefreshCw size={20} style={{ animation: "notif-spin 1s linear infinite" }} />
              Loading…
            </div>
          )}

          {!loading && visible.length === 0 && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: "12px", padding: "40px 24px",
            }}>
              <div style={{
                width: "52px", height: "52px", borderRadius: "14px",
                background: "hsl(231, 25%, 15%)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Inbox size={22} style={{ color: "hsl(221, 14%, 46%)" }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "hsl(220, 18%, 78%)", marginBottom: "4px" }}>All caught up!</div>
                <div style={{ fontSize: "0.73rem", color: "hsl(221, 14%, 48%)" }}>No pending tasks, events, or alerts.</div>
              </div>
            </div>
          )}

          {!loading && Object.entries(groups).map(([group, items]) => (
            <div key={group} style={{ marginBottom: "2px" }}>
              <div style={{
                fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.05em", color: "hsl(221, 14%, 44%)",
                padding: "8px 16px 4px",
              }}>{group}</div>
              {items.map(n => {
                const IconComp = ICON_MAP[n.icon] ?? Bell;
                return (
                  <div
                    key={n.id}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: "10px",
                      padding: "9px 14px", cursor: "pointer",
                      transition: "background 0.15s",
                      borderRadius: "10px", margin: "0 6px",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "hsl(231, 25%, 15%)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    onClick={() => handleItemClick(n.link)}
                  >
                    <span style={{
                      width: "30px", height: "30px", borderRadius: "8px", flexShrink: 0,
                      background: `color-mix(in srgb, ${n.color} 16%, transparent)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginTop: "1px",
                    }}>
                      <IconComp size={14} style={{ color: n.color }} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: "0.75rem", fontWeight: 600,
                        color: "hsl(220, 18%, 86%)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>{n.body}</div>
                      <div style={{
                        fontSize: "0.67rem", color: "hsl(221, 14%, 48%)",
                        marginTop: "2px",
                      }}>{n.title}</div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "hsl(221, 14%, 40%)", padding: "3px", borderRadius: "5px",
                        display: "flex", alignItems: "center", flexShrink: 0,
                        transition: "background 0.15s, color 0.15s",
                      }}
                      onMouseEnter={e => { (e.currentTarget).style.color = "hsl(220, 20%, 70%)"; (e.currentTarget).style.background = "hsl(231, 25%, 20%)"; }}
                      onMouseLeave={e => { (e.currentTarget).style.color = "hsl(221, 14%, 40%)"; (e.currentTarget).style.background = "none"; }}
                    >
                      <X size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes notif-spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
