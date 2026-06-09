import React, { useEffect, useState, useRef } from "react";
import { useClerk } from "@clerk/react";
import { Link, useLocation } from "wouter";
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
  X,
  Plus,
  Search,
  Loader2,
  Sparkles,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { api } from "@/lib/api";

interface SidebarAppEntry {
  sidebarId: string;
  templateId: string;
  appName: string;
  icon: string;
  color: string;
}

interface AiTemplate {
  id: string;
  appName: string;
  icon: string;
  color: string;
  description: string;
}

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

const SIDEBAR_LIMIT = 3;

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function Tooltip({ label, visible }: { label: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <div style={{
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
      animation: "fadeInTooltip 0.12s ease both",
    }}>
      {label}
      <span style={{
        position: "absolute",
        right: "100%",
        top: "50%",
        transform: "translateY(-50%)",
        borderWidth: "5px",
        borderStyle: "solid",
        borderColor: "transparent hsl(231, 34%, 10%) transparent transparent",
      }} />
    </div>
  );
}

// ─── Nav Item Row ─────────────────────────────────────────────────────────────

function NavItemRow({ item, isActive, collapsed }: {
  item: NavItem; isActive: boolean; collapsed: boolean;
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
        background: isActive ? "var(--fb-sidebar-active)" : hovered ? "var(--fb-sidebar-hover)" : "transparent",
        transition: "background 0.15s ease",
        marginBottom: "1px",
      }}
    >
      {isActive && (
        <span style={{
          position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
          width: "3px", height: "60%", background: item.color, borderRadius: "0 3px 3px 0",
        }} />
      )}
      <span style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: "26px", height: "26px", borderRadius: "7px", flexShrink: 0,
        background: isActive || hovered ? `color-mix(in srgb, ${item.color} 16%, transparent)` : "transparent",
        transition: "background 0.15s ease",
      }}>
        <Icon size={14} style={{
          color: isActive || hovered ? item.color : "var(--fb-sidebar-text)",
          transition: "color 0.15s ease",
        }} strokeWidth={isActive ? 2.25 : 1.8} />
      </span>
      {!collapsed && (
        <span style={{
          fontSize: "0.76rem",
          fontWeight: isActive ? 600 : 450,
          color: isActive ? "var(--fb-sidebar-text-active)" : hovered ? "hsl(220, 20%, 86%)" : "var(--fb-sidebar-text)",
          transition: "color 0.15s ease",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {item.label}
        </span>
      )}
      {collapsed && <Tooltip label={item.label} visible={hovered} />}
    </Link>
  );
}

// ─── Footer Button ────────────────────────────────────────────────────────────

function FooterButton({
  icon: Icon, label, color, collapsed, danger, badge, onClick,
}: {
  icon: React.ElementType; label: string; color: string;
  collapsed: boolean; danger?: boolean; badge?: number; onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: collapsed ? 0 : "8px",
        padding: collapsed ? "7px" : "6px 9px",
        borderRadius: "8px", border: "none",
        background: hovered ? "var(--fb-sidebar-hover)" : "transparent",
        cursor: "pointer", width: "100%", position: "relative",
        transition: "background 0.15s ease",
      }}
    >
      <span style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: "26px", height: "26px", borderRadius: "7px",
        background: hovered ? `color-mix(in srgb, ${color} 16%, transparent)` : "transparent",
        transition: "background 0.15s ease", flexShrink: 0, position: "relative",
      }}>
        <Icon size={13} style={{
          color: hovered ? color : "var(--fb-sidebar-text)",
          transition: "color 0.15s ease",
        }} strokeWidth={1.8} />
        {badge ? (
          <span style={{
            position: "absolute", top: "1px", right: "1px",
            width: "14px", height: "14px", borderRadius: "50%",
            background: color, color: "#fff", fontSize: "0.55rem", fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
          }}>{badge}</span>
        ) : null}
      </span>
      {!collapsed && (
        <span style={{
          fontSize: "0.75rem", fontWeight: 450,
          color: danger
            ? hovered ? "var(--fb-rose)" : "var(--fb-sidebar-text)"
            : hovered ? "hsl(220, 20%, 86%)" : "var(--fb-sidebar-text)",
          transition: "color 0.15s ease", whiteSpace: "nowrap",
        }}>{label}</span>
      )}
      {collapsed && <Tooltip label={label} visible={hovered} />}
    </button>
  );
}

// ─── Sidebar App Row ──────────────────────────────────────────────────────────

function SidebarAppRow({ app, isActive, collapsed, onRemove }: {
  app: SidebarAppEntry; isActive: boolean; collapsed: boolean;
  onRemove: (templateId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = (LucideIcons as any)[app.icon] ?? LucideIcons.Sparkles;

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link
        href={`/dashboard/templates/${app.templateId}`}
        style={{
          display: "flex", alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: collapsed ? 0 : "8px",
          padding: collapsed ? "7px" : "6px 9px",
          borderRadius: "8px", textDecoration: "none", position: "relative",
          background: isActive ? "var(--fb-sidebar-active)" : hovered ? "var(--fb-sidebar-hover)" : "transparent",
          transition: "background 0.15s ease", marginBottom: "1px",
          paddingRight: !collapsed && hovered ? "30px" : undefined,
        }}
      >
        {isActive && (
          <span style={{
            position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
            width: "3px", height: "60%", background: app.color, borderRadius: "0 3px 3px 0",
          }} />
        )}
        <span style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: "26px", height: "26px", borderRadius: "7px", flexShrink: 0,
          background: isActive || hovered ? `${app.color}22` : "transparent",
          transition: "background 0.15s ease",
        }}>
          <Icon size={13} style={{
            color: isActive || hovered ? app.color : "var(--fb-sidebar-text)",
            transition: "color 0.15s ease",
          }} strokeWidth={isActive ? 2.25 : 1.8} />
        </span>
        {!collapsed && (
          <span style={{
            fontSize: "0.76rem", fontWeight: isActive ? 600 : 450,
            color: isActive ? "var(--fb-sidebar-text-active)" : hovered ? "hsl(220, 20%, 86%)" : "var(--fb-sidebar-text)",
            transition: "color 0.15s ease",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1,
          }}>{app.appName}</span>
        )}
        {collapsed && (
          <div style={{
            position: "absolute", left: "calc(100% + 12px)", top: "50%", transform: "translateY(-50%)",
            background: "hsl(231, 34%, 10%)", color: "#f8fafc",
            padding: "5px 10px", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 500,
            whiteSpace: "nowrap", pointerEvents: "none", zIndex: 999,
            boxShadow: "0 8px 18px rgba(15, 23, 42, 0.24)",
            display: hovered ? "block" : "none",
          }}>
            {app.appName}
            <span style={{
              position: "absolute", right: "100%", top: "50%", transform: "translateY(-50%)",
              borderWidth: "5px", borderStyle: "solid",
              borderColor: "transparent hsl(231, 34%, 10%) transparent transparent",
            }} />
          </div>
        )}
      </Link>
      {!collapsed && hovered && (
        <button
          type="button"
          onClick={e => { e.preventDefault(); onRemove(app.templateId); }}
          style={{
            position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)",
            width: "20px", height: "20px", borderRadius: "5px",
            border: "none", background: "transparent",
            color: "var(--fb-sidebar-label)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.7,
          }}
          title="Unpin"
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

// ─── Add App Popover ──────────────────────────────────────────────────────────

function AddAppPopover({
  anchorRef,
  sidebarApps,
  onAdd,
  onClose,
  collapsed,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  sidebarApps: SidebarAppEntry[];
  onAdd: (template: AiTemplate) => void;
  onClose: () => void;
  collapsed: boolean;
}) {
  const [templates, setTemplates] = useState<AiTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pinnedIds = new Set(sidebarApps.map(a => a.templateId));
  const available = templates.filter(t =>
    !pinnedIds.has(t.id) &&
    (!search || t.appName.toLowerCase().includes(search.toLowerCase()))
  );

  useEffect(() => {
    api.get<AiTemplate[]>("/ai-templates")
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Position: right of anchor when collapsed, above anchor when expanded
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    if (collapsed) {
      setPos({ top: rect.top, left: rect.right + 10 });
    } else {
      setPos({ top: rect.top - 8, left: rect.right + 10 });
    }
  }, [collapsed]);

  const isFull = sidebarApps.length >= SIDEBAR_LIMIT;

  return (
    <div
      ref={popoverRef}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: "240px",
        background: "hsl(230, 30%, 12%)",
        border: "1px solid hsl(230, 20%, 22%)",
        borderRadius: "12px",
        boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
        zIndex: 1000,
        overflow: "hidden",
        animation: "popIn 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) both",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "11px 12px 9px",
        borderBottom: "1px solid hsl(230, 20%, 20%)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#f8fafc" }}>Pin app to sidebar</span>
        <span style={{
          fontSize: "0.6rem", fontWeight: 600, color: "var(--fb-sidebar-label)",
          background: "hsl(230, 20%, 20%)",
          padding: "2px 7px", borderRadius: "10px",
        }}>{sidebarApps.length}/{SIDEBAR_LIMIT}</span>
      </div>

      {/* Search */}
      <div style={{
        padding: "8px 10px",
        borderBottom: "1px solid hsl(230, 20%, 18%)",
        display: "flex", alignItems: "center", gap: "7px",
      }}>
        <Search size={12} style={{ color: "var(--fb-sidebar-label)", flexShrink: 0 }} strokeWidth={2} />
        <input
          ref={inputRef}
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === "Escape" && onClose()}
          placeholder="Search your apps..."
          style={{
            flex: 1, border: "none", background: "transparent", outline: "none",
            fontSize: "0.74rem", color: "#f8fafc", fontFamily: "inherit",
          }}
        />
      </div>

      {/* Sidebar full warning */}
      {isFull && (
        <div style={{
          padding: "8px 12px",
          background: "rgba(251,113,133,0.08)",
          borderBottom: "1px solid rgba(251,113,133,0.15)",
          fontSize: "0.68rem", color: "#F43F5E", display: "flex", alignItems: "center", gap: "6px",
        }}>
          <Sparkles size={10} strokeWidth={2.5} />
          Sidebar is full — unpin an app first
        </div>
      )}

      {/* List */}
      <div style={{ maxHeight: "220px", overflowY: "auto", padding: "6px" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", gap: "8px", color: "var(--fb-sidebar-label)" }}>
            <Loader2 size={14} strokeWidth={2} style={{ animation: "spin 0.8s linear infinite" }} />
            <span style={{ fontSize: "0.72rem" }}>Loading...</span>
          </div>
        ) : available.length === 0 ? (
          <div style={{ textAlign: "center", padding: "22px 12px" }}>
            <Wand2 size={22} style={{ color: "var(--fb-sidebar-label)", opacity: 0.5, marginBottom: "8px" }} strokeWidth={1.5} />
            <div style={{ fontSize: "0.72rem", color: "var(--fb-sidebar-label)" }}>
              {templates.length === 0
                ? "No apps yet — generate one in AI Template Builder"
                : search
                  ? "No apps match your search"
                  : "All your apps are already pinned"}
            </div>
          </div>
        ) : (
          available.map(template => {
            const Icon = (LucideIcons as any)[template.icon] ?? LucideIcons.Sparkles;
            return (
              <button
                key={template.id}
                onClick={() => !isFull && onAdd(template)}
                disabled={isFull}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "9px",
                  padding: "7px 8px", borderRadius: "8px", border: "none",
                  background: "transparent", cursor: isFull ? "not-allowed" : "pointer",
                  textAlign: "left", transition: "background 0.12s",
                  opacity: isFull ? 0.45 : 1,
                }}
                onMouseEnter={e => { if (!isFull) e.currentTarget.style.background = "hsl(230, 20%, 20%)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{
                  width: "28px", height: "28px", borderRadius: "8px", flexShrink: 0,
                  background: `linear-gradient(135deg, ${template.color}, ${template.color}bb)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={13} color="#fff" strokeWidth={2.1} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "0.76rem", fontWeight: 600, color: "#f8fafc",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{template.appName}</div>
                  {template.description && (
                    <div style={{
                      fontSize: "0.65rem", color: "var(--fb-sidebar-label)", marginTop: "1px",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>{template.description}</div>
                  )}
                </div>
                {!isFull && (
                  <Plus size={13} style={{ color: "var(--fb-sidebar-label)", flexShrink: 0 }} strokeWidth={2.5} />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Footer link */}
      <div style={{
        borderTop: "1px solid hsl(230, 20%, 18%)",
        padding: "8px 10px",
      }}>
        <Link
          href="/dashboard/templates"
          onClick={onClose}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            fontSize: "0.68rem", color: "var(--fb-sidebar-label)",
            textDecoration: "none", padding: "4px 4px",
            borderRadius: "5px", transition: "color 0.12s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#A855F7"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--fb-sidebar-label)"; }}
        >
          <Wand2 size={11} strokeWidth={2} />
          Open AI Template Builder
        </Link>
      </div>
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export default function Sidebar() {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sidebarApps, setSidebarApps] = useState<SidebarAppEntry[]>([]);
  const [showAddPopover, setShowAddPopover] = useState(false);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const { signOut } = useClerk();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    setMounted(true);
    setCollapsed(localStorage.getItem("fb-sidebar-collapsed") === "true");
  }, []);

  useEffect(() => {
    if (!mounted) return;
    api.get<SidebarAppEntry[]>("/ai-templates/sidebar/apps")
      .then(apps => setSidebarApps(apps))
      .catch(() => {});
  }, [mounted]);

  const handleRemoveSidebarApp = async (templateId: string) => {
    try {
      await api.delete(`/ai-templates/sidebar/apps/${templateId}`);
      setSidebarApps(prev => prev.filter(a => a.templateId !== templateId));
    } catch {}
  };

  const handleAddApp = async (template: AiTemplate) => {
    try {
      const app = await api.post<SidebarAppEntry>("/ai-templates/sidebar/apps", { templateId: template.id });
      setSidebarApps(prev => [...prev, app]);
      setShowAddPopover(false);
    } catch {}
  };

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("fb-sidebar-collapsed", String(next));
  };

  if (!mounted) return null;

  const sidebarWidth = collapsed ? "var(--fb-sidebar-width-collapsed)" : "var(--fb-sidebar-width)";
  const isFull = sidebarApps.length >= SIDEBAR_LIMIT;

  return (
    <>
      <aside style={{
        width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth,
        height: "100vh", background: "var(--fb-sidebar-bg)",
        display: "flex", flexDirection: "column",
        overflow: "hidden", position: "sticky", top: 0, flexShrink: 0,
        transition: "width 0.25s cubic-bezier(0.4,0,0.2,1), min-width 0.25s cubic-bezier(0.4,0,0.2,1), max-width 0.25s cubic-bezier(0.4,0,0.2,1)",
        zIndex: 40, borderRight: "1px solid var(--fb-sidebar-border)",
      }}>

        {/* ── Logo / Header ── */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: collapsed ? "16px 0" : "16px 12px 16px 14px",
          borderBottom: "1px solid var(--fb-sidebar-border)",
          gap: "8px", minHeight: "62px", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "9px", overflow: "hidden" }}>
            <div style={{
              width: "30px", height: "30px", borderRadius: "8px",
              background: "linear-gradient(135deg, var(--fb-violet), var(--fb-cyan))",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, boxShadow: "0 3px 10px rgba(116, 103, 240, 0.36)",
            }}>
              <Zap size={16} color="#fff" strokeWidth={2.4} />
            </div>
            {!collapsed && (
              <div style={{ overflow: "hidden" }}>
                <div style={{
                  fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "0.92rem",
                  color: "#f8fafc", letterSpacing: 0, lineHeight: 1, whiteSpace: "nowrap",
                }}>FlowBase</div>
                <div style={{
                  fontSize: "0.58rem", color: "var(--fb-sidebar-label)", letterSpacing: 0,
                  textTransform: "uppercase", marginTop: "2px", fontWeight: 600,
                }}>Workspace</div>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              title="Collapse sidebar"
              style={{
                width: "26px", height: "26px", borderRadius: "6px",
                border: "1px solid var(--fb-sidebar-border)", background: "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "var(--fb-sidebar-label)", flexShrink: 0,
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
              margin: "10px auto 4px", width: "30px", height: "30px", borderRadius: "8px",
              border: "1px solid var(--fb-sidebar-border)", background: "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "var(--fb-sidebar-label)",
              transition: "background 0.15s ease, color 0.15s ease", flexShrink: 0,
            }}
          >
            <ChevronRight size={13} strokeWidth={2.5} />
          </button>
        )}

        {/* ── Nav ── */}
        <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "8px 9px" }}>
          {NAV_GROUPS.map((group, groupIndex) => (
            <div key={group.group} style={{ marginBottom: "4px" }}>
              {!collapsed && (
                <div style={{
                  fontSize: "0.6rem", fontWeight: 700, color: "var(--fb-sidebar-label)",
                  letterSpacing: 0, textTransform: "uppercase", padding: "12px 9px 5px", whiteSpace: "nowrap",
                }}>{group.group}</div>
              )}
              {collapsed && groupIndex > 0 && (
                <div style={{ height: "1px", background: "var(--fb-sidebar-border)", margin: "7px 4px" }} />
              )}
              {group.items.map(item => (
                <NavItemRow
                  key={item.href}
                  item={item}
                  isActive={item.href === "/dashboard" ? location === "/dashboard" : location.startsWith(item.href)}
                  collapsed={collapsed}
                />
              ))}
            </div>
          ))}

          {/* ── My Apps ── */}
          <div style={{ marginBottom: "4px" }}>
            {!collapsed ? (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 9px 5px",
              }}>
                <span style={{
                  fontSize: "0.6rem", fontWeight: 700, color: "var(--fb-sidebar-label)",
                  letterSpacing: 0, textTransform: "uppercase", whiteSpace: "nowrap",
                }}>My Apps</span>
                <span style={{
                  fontSize: "0.55rem", color: "var(--fb-sidebar-label)", opacity: 0.6,
                }}>{sidebarApps.length}/{SIDEBAR_LIMIT}</span>
              </div>
            ) : (
              <div style={{ height: "1px", background: "var(--fb-sidebar-border)", margin: "7px 4px" }} />
            )}

            {sidebarApps.map(app => (
              <SidebarAppRow
                key={app.templateId}
                app={app}
                isActive={location === `/dashboard/templates/${app.templateId}`}
                collapsed={collapsed}
                onRemove={handleRemoveSidebarApp}
              />
            ))}

            {/* ── Add App Button — only visible on the AI Template Builder page ── */}
            {location.startsWith("/dashboard/templates") && (
            <button
              ref={addBtnRef as React.RefObject<HTMLButtonElement>}
              type="button"
              onClick={() => setShowAddPopover(s => !s)}
              disabled={false}
              style={{
                display: "flex", alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                gap: collapsed ? 0 : "8px",
                padding: collapsed ? "7px" : "5px 9px",
                borderRadius: "8px", border: "none",
                background: showAddPopover ? "var(--fb-sidebar-hover)" : "transparent",
                cursor: "pointer", width: "100%", position: "relative",
                transition: "background 0.15s ease",
                marginTop: "1px",
              }}
              onMouseEnter={e => { if (!showAddPopover) e.currentTarget.style.background = "var(--fb-sidebar-hover)"; }}
              onMouseLeave={e => { if (!showAddPopover) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "26px", height: "26px", borderRadius: "7px",
                border: "1.5px dashed hsl(230, 20%, 32%)",
                flexShrink: 0, transition: "border-color 0.15s, background 0.15s",
              }}>
                <Plus size={12} style={{ color: "var(--fb-sidebar-label)" }} strokeWidth={2.5} />
              </span>
              {!collapsed && (
                <span style={{
                  fontSize: "0.72rem", fontWeight: 500,
                  color: "var(--fb-sidebar-label)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  display: "flex", alignItems: "center", gap: "5px",
                }}>
                  Pin an app
                  {isFull && (
                    <span style={{
                      fontSize: "0.55rem", background: "hsl(230, 20%, 22%)",
                      padding: "1px 5px", borderRadius: "6px", fontWeight: 600,
                    }}>Full</span>
                  )}
                </span>
              )}
              {collapsed && (
                <Tooltip label={isFull ? "Sidebar full (3/3)" : "Pin an app"} visible={!showAddPopover} />
              )}
            </button>
            )}
          </div>
        </nav>

        {/* ── Footer ── */}
        <footer style={{
          borderTop: "1px solid var(--fb-sidebar-border)",
          padding: "10px 9px", flexShrink: 0,
          display: "flex", flexDirection: "column", gap: "2px",
        }}>
          <FooterButton icon={Bell} label="Notifications" color="var(--fb-amber)" collapsed={collapsed} badge={3} />
          <FooterButton icon={HelpCircle} label="Help & Support" color="var(--fb-sky)" collapsed={collapsed} />
          <FooterButton icon={LogOut} label="Sign Out" color="var(--fb-rose)" collapsed={collapsed} danger
            onClick={() => signOut({ redirectUrl: basePath || "/" })} />
          {!collapsed && (
            <div style={{
              marginTop: "10px", fontSize: "0.57rem", color: "var(--fb-sidebar-label)",
              letterSpacing: 0, textAlign: "center", opacity: 0.75,
            }}>
              FLOWBASE v0.1.0 BETA
            </div>
          )}
        </footer>
      </aside>

      {/* ── Add App Popover (portal-style fixed) ── */}
      {showAddPopover && (
        <AddAppPopover
          anchorRef={addBtnRef}
          sidebarApps={sidebarApps}
          onAdd={handleAddApp}
          onClose={() => setShowAddPopover(false)}
          collapsed={collapsed}
        />
      )}

      <style>{`
        @keyframes fadeInTooltip { from { opacity: 0; transform: translateY(-50%) translateX(-4px); } to { opacity: 1; transform: translateY(-50%) translateX(0); } }
        @keyframes popIn { from { opacity: 0; transform: scale(0.94) translateY(4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
