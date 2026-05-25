"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  NotebookPen,
  PenLine,
  Settings,
  Wand2,
  Zap,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  color: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, color: "var(--fb-violet)" },
      { label: "AI Assistant", href: "/dashboard/ai-assistant", icon: Bot, color: "var(--fb-cyan)" },
    ],
  },
  {
    group: "Plan",
    items: [
      { label: "Calendar", href: "/dashboard/calendar", icon: CalendarDays, color: "var(--fb-amber)" },
      { label: "Task / Kanban", href: "/dashboard/kanban", icon: KanbanSquare, color: "var(--fb-emerald)" },
    ],
  },
  {
    group: "Create",
    items: [
      { label: "Notes", href: "/dashboard/notes", icon: NotebookPen, color: "var(--fb-rose)" },
      { label: "Whiteboard", href: "/dashboard/whiteboard", icon: PenLine, color: "var(--fb-indigo)" },
      { label: "Pages / Spaces", href: "/dashboard/pages", icon: BookOpen, color: "var(--fb-sky)" },
      { label: "AI Template Builder", href: "/dashboard/templates", icon: Wand2, color: "var(--fb-purple)" },
    ],
  },
  {
    group: "System",
    items: [
      { label: "Settings", href: "/dashboard/settings", icon: Settings, color: "var(--fb-slate)" },
    ],
  },
];

function Tooltip({ label, visible }: { label: string; visible: boolean }) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: "calc(100% + 12px)",
        top: "50%",
        transform: "translateY(-50%)",
        background: "hsl(231, 34%, 10%)",
        color: "#f8fafc",
        padding: "5px 10px",
        borderRadius: "6px",
        fontSize: "0.72rem",
        fontWeight: 500,
        whiteSpace: "nowrap",
        pointerEvents: "none",
        zIndex: 999,
        boxShadow: "0 8px 18px rgba(15, 23, 42, 0.24)",
        letterSpacing: 0,
        animation: "fadeInTooltip 0.12s ease both",
      }}
    >
      {label}
      <span
        style={{
          position: "absolute",
          right: "100%",
          top: "50%",
          transform: "translateY(-50%)",
          borderWidth: "5px",
          borderStyle: "solid",
          borderColor: "transparent hsl(231, 34%, 10%) transparent transparent",
        }}
      />
    </div>
  );
}

function NavItemRow({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: collapsed ? 0 : "8px",
        padding: collapsed ? "7px" : "6px 9px",
        borderRadius: "8px",
        textDecoration: "none",
        position: "relative",
        background: isActive
          ? "var(--fb-sidebar-active)"
          : hovered
            ? "var(--fb-sidebar-hover)"
            : "transparent",
        transition: "background 0.15s ease",
        marginBottom: "1px",
      }}
    >
      {isActive && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: "3px",
            height: "60%",
            background: item.color,
            borderRadius: "0 3px 3px 0",
          }}
        />
      )}

      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "26px",
          height: "26px",
          borderRadius: "7px",
          flexShrink: 0,
          background: isActive || hovered ? `color-mix(in srgb, ${item.color} 16%, transparent)` : "transparent",
          transition: "background 0.15s ease",
        }}
      >
        <Icon
          size={14}
          style={{
            color: isActive || hovered ? item.color : "var(--fb-sidebar-text)",
            transition: "color 0.15s ease",
          }}
          strokeWidth={isActive ? 2.25 : 1.8}
        />
      </span>

      {!collapsed && (
        <span
          style={{
            fontSize: "0.76rem",
            fontWeight: isActive ? 600 : 450,
            color: isActive
              ? "var(--fb-sidebar-text-active)"
              : hovered
                ? "hsl(220, 20%, 86%)"
                : "var(--fb-sidebar-text)",
            transition: "color 0.15s ease",
            letterSpacing: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.label}
        </span>
      )}

      {collapsed && <Tooltip label={item.label} visible={hovered} />}
    </Link>
  );
}

function FooterButton({
  icon: Icon,
  label,
  color,
  collapsed,
  danger,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  collapsed: boolean;
  danger?: boolean;
  badge?: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: collapsed ? 0 : "8px",
        padding: collapsed ? "7px" : "6px 9px",
        borderRadius: "8px",
        border: "none",
        background: hovered ? "var(--fb-sidebar-hover)" : "transparent",
        cursor: "pointer",
        width: "100%",
        position: "relative",
        transition: "background 0.15s ease",
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "26px",
          height: "26px",
          borderRadius: "7px",
          background: hovered ? `color-mix(in srgb, ${color} 16%, transparent)` : "transparent",
          transition: "background 0.15s ease",
          flexShrink: 0,
          position: "relative",
        }}
      >
        <Icon
          size={13}
          style={{
            color: hovered ? color : "var(--fb-sidebar-text)",
            transition: "color 0.15s ease",
          }}
          strokeWidth={1.8}
        />
        {badge ? (
          <span
            style={{
              position: "absolute",
              top: "1px",
              right: "1px",
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              background: color,
              color: "#fff",
              fontSize: "0.55rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {badge}
          </span>
        ) : null}
      </span>

      {!collapsed && (
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 450,
            color: danger
              ? hovered
                ? "var(--fb-rose)"
                : "var(--fb-sidebar-text)"
              : hovered
                ? "hsl(220, 20%, 86%)"
                : "var(--fb-sidebar-text)",
            transition: "color 0.15s ease",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      )}

      {collapsed && <Tooltip label={label} visible={hovered} />}
    </button>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCollapsed(localStorage.getItem("fb-sidebar-collapsed") === "true");
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("fb-sidebar-collapsed", String(next));
  };

  if (!mounted) return null;

  const sidebarWidth = collapsed
    ? "var(--fb-sidebar-width-collapsed)"
    : "var(--fb-sidebar-width)";

  return (
    <aside
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        maxWidth: sidebarWidth,
        height: "100vh",
        background: "var(--fb-sidebar-bg)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "sticky",
        top: 0,
        flexShrink: 0,
        transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: 40,
        borderRight: "1px solid var(--fb-sidebar-border)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: collapsed ? "16px 0" : "16px 12px 16px 14px",
          borderBottom: "1px solid var(--fb-sidebar-border)",
          gap: "8px",
          minHeight: "62px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "9px", overflow: "hidden" }}>
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, var(--fb-violet), var(--fb-cyan))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 3px 10px rgba(116, 103, 240, 0.36)",
            }}
          >
            <Zap size={16} color="#fff" strokeWidth={2.4} />
          </div>

          {!collapsed && (
            <div style={{ overflow: "hidden" }}>
              <div
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.92rem",
                  color: "#f8fafc",
                  letterSpacing: 0,
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                FlowBase
              </div>
              <div
                style={{
                  fontSize: "0.58rem",
                  color: "var(--fb-sidebar-label)",
                  letterSpacing: 0,
                  textTransform: "uppercase",
                  marginTop: "2px",
                  fontWeight: 600,
                }}
              >
                Workspace
              </div>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            title="Collapse sidebar"
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "6px",
              border: "1px solid var(--fb-sidebar-border)",
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--fb-sidebar-label)",
              flexShrink: 0,
              transition: "background 0.15s ease, color 0.15s ease",
            }}
          >
            <ChevronLeft size={13} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={toggleCollapsed}
          title="Expand sidebar"
          style={{
            margin: "10px auto 4px",
            width: "30px",
            height: "30px",
            borderRadius: "8px",
            border: "1px solid var(--fb-sidebar-border)",
            background: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--fb-sidebar-label)",
            transition: "background 0.15s ease, color 0.15s ease",
            flexShrink: 0,
          }}
        >
          <ChevronRight size={13} strokeWidth={2.5} />
        </button>
      )}

      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "8px 9px",
        }}
      >
        {NAV_GROUPS.map((group, groupIndex) => (
          <div key={group.group} style={{ marginBottom: "4px" }}>
            {!collapsed && (
              <div
                style={{
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: "var(--fb-sidebar-label)",
                  letterSpacing: 0,
                  textTransform: "uppercase",
                  padding: "12px 9px 5px",
                  whiteSpace: "nowrap",
                }}
              >
                {group.group}
              </div>
            )}

            {collapsed && groupIndex > 0 && (
              <div
                style={{
                  height: "1px",
                  background: "var(--fb-sidebar-border)",
                  margin: "7px 4px",
                }}
              />
            )}

            {group.items.map((item) => (
              <NavItemRow
                key={item.href}
                item={item}
                isActive={
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href)
                }
                collapsed={collapsed}
              />
            ))}
          </div>
        ))}
      </nav>

      <footer
        style={{
          borderTop: "1px solid var(--fb-sidebar-border)",
          padding: "10px 9px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        <FooterButton icon={Bell} label="Notifications" color="var(--fb-amber)" collapsed={collapsed} badge={3} />
        <FooterButton icon={HelpCircle} label="Help & Support" color="var(--fb-sky)" collapsed={collapsed} />
        <FooterButton icon={LogOut} label="Sign Out" color="var(--fb-rose)" collapsed={collapsed} danger />

        {!collapsed && (
          <div
            style={{
              marginTop: "10px",
              fontSize: "0.57rem",
              color: "var(--fb-sidebar-label)",
              letterSpacing: 0,
              textAlign: "center",
              opacity: 0.75,
            }}
          >
            FLOWBASE v0.1.0 BETA
          </div>
        )}
      </footer>
    </aside>
  );
}
