import React, { useState, useEffect, useRef } from "react";
import {
  Wand2, Sparkles, Loader2, Trash2, Eye, LayoutTemplate,
  PanelLeftOpen, PanelLeftClose, AlertTriangle,
  Search, X, Star,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { api } from "../../../lib/api";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiTemplate {
  id: string;
  appName: string;
  description: string;
  icon: string;
  color: string;
  layout: string;
  sectionsJson: string;
  actionsJson: string;
  sampleDataJson: string;
  prompt: string;
  createdAt: string;
}

interface SidebarApp {
  sidebarId: string;
  templateId: string;
  sortOrder: number;
  appName: string;
  icon: string;
  color: string;
  description: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

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

const EXAMPLE_PROMPTS = [
  "Habit Tracker with daily streaks",
  "Budget Tracker with categories",
  "Meal Planner for the week",
  "Study Planner with progress",
  "Workout Logger with exercises",
  "Book Reading List tracker",
];

// ─── App Card ─────────────────────────────────────────────────────────────────

function AppCard({
  template,
  isSidebarApp,
  onPreview,
  onDelete,
  onToggleSidebar,
}: {
  template: AiTemplate;
  isSidebarApp: boolean;
  onPreview: (t: AiTemplate) => void;
  onDelete: (id: string) => void;
  onToggleSidebar: (t: AiTemplate) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const rgb = hexToRgb(template.color);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false); }}
      style={{
        background: "var(--fb-surface)",
        border: `1px solid ${hovered ? `rgba(${rgb}, 0.4)` : "var(--fb-border)"}`,
        borderRadius: "12px",
        overflow: "hidden",
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxShadow: hovered ? `0 4px 20px rgba(${rgb}, 0.14)` : "0 1px 3px rgba(0,0,0,0.07)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Color bar */}
      <div style={{ height: "4px", background: `linear-gradient(90deg, ${template.color}, ${template.color}77)` }} />

      <div style={{ padding: "14px 14px 10px", flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "9px", flexShrink: 0,
            background: `linear-gradient(135deg, ${template.color}, ${template.color}bb)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 3px 8px rgba(${rgb}, 0.28)`,
          }}>
            <LucideIcon name={template.icon} size={17} color="#fff" strokeWidth={2.1} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: "0.85rem", fontWeight: 700, color: "var(--fb-text)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{template.appName}</div>
            <div style={{
              fontSize: "0.7rem", color: "var(--fb-text-muted)", marginTop: "2px",
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>{template.description}</div>
          </div>
        </div>

        {/* Meta badges */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span style={{
            fontSize: "0.61rem", color: "var(--fb-text-muted)", fontWeight: 500,
            background: "var(--fb-surface2)", padding: "2px 7px", borderRadius: "10px",
          }}>
            {timeAgo(template.createdAt)}
          </span>
          {isSidebarApp && (
            <span style={{
              fontSize: "0.61rem", fontWeight: 600, padding: "2px 7px", borderRadius: "10px",
              background: `rgba(${rgb}, 0.13)`, color: template.color,
              display: "flex", alignItems: "center", gap: "3px",
            }}>
              <Star size={9} strokeWidth={2.5} /> In Sidebar
            </span>
          )}
        </div>
      </div>

      {/* Action row */}
      <div style={{
        borderTop: "1px solid var(--fb-border)", padding: "8px 10px",
        display: "flex", gap: "5px", alignItems: "center",
      }}>
        <button
          onClick={() => onPreview(template)}
          style={{
            display: "flex", alignItems: "center", gap: "4px",
            padding: "5px 10px", borderRadius: "7px", border: "none",
            background: template.color, color: "#fff", fontSize: "0.71rem",
            fontWeight: 600, cursor: "pointer", flex: 1, justifyContent: "center",
          }}
        >
          <Eye size={12} strokeWidth={2.2} /> Preview
        </button>
        <button
          onClick={() => onToggleSidebar(template)}
          title={isSidebarApp ? "Remove from sidebar" : "Add to sidebar"}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "30px", height: "30px", borderRadius: "7px", border: "none",
            background: isSidebarApp ? `rgba(${rgb}, 0.15)` : "var(--fb-surface2)",
            color: isSidebarApp ? template.color : "var(--fb-text-muted)",
            cursor: "pointer", flexShrink: 0,
          }}
        >
          {isSidebarApp ? <PanelLeftClose size={13} strokeWidth={2} /> : <PanelLeftOpen size={13} strokeWidth={2} />}
        </button>
        {confirmDelete ? (
          <button
            onClick={() => onDelete(template.id)}
            title="Confirm delete"
            style={{
              width: "30px", height: "30px", borderRadius: "7px", border: "none",
              background: "#F43F5E1A", color: "#F43F5E",
              cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <AlertTriangle size={13} strokeWidth={2.5} />
          </button>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            title="Delete app"
            style={{
              width: "30px", height: "30px", borderRadius: "7px", border: "none",
              background: "var(--fb-surface2)", color: "var(--fb-text-muted)",
              cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Trash2 size={13} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const [, navigate] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [templates, setTemplates] = useState<AiTemplate[]>([]);
  const [sidebarApps, setSidebarApps] = useState<SidebarApp[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();
  const sidebarTemplateIds = new Set(sidebarApps.map(a => a.templateId));

  useEffect(() => {
    Promise.all([
      api.get<AiTemplate[]>("/ai-templates"),
      api.get<SidebarApp[]>("/ai-templates/sidebar/apps"),
    ]).then(([tmpl, sidebar]) => {
      setTemplates(tmpl);
      setSidebarApps(sidebar);
    }).catch(console.error).finally(() => setLoadingTemplates(false));
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const generated = await api.post<any>("/ai-templates/generate", { prompt });
      const saved = await api.post<AiTemplate>("/ai-templates", {
        appName: generated.appName,
        description: generated.description,
        icon: generated.icon ?? "Wand2",
        color: generated.color ?? "#7467F0",
        layout: generated.layout ?? "single-page",
        sectionsJson: JSON.stringify(generated.sections ?? []),
        actionsJson: JSON.stringify(generated.actions ?? []),
        sampleDataJson: JSON.stringify(generated.sampleData ?? []),
        prompt: prompt.trim(),
      });
      setTemplates(prev => [saved, ...prev]);
      setPrompt("");
      toast({ title: `✨ ${saved.appName} created!`, description: "Click Preview to open your app." });
    } catch (err: any) {
      const msg = err?.message?.includes("GROQ_API_KEY")
        ? "GROQ_API_KEY is not configured. Add it in the Secrets tab to enable AI generation."
        : (err?.message ?? "Generation failed. Please try again.");
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/ai-templates/${id}`);
      setTemplates(prev => prev.filter(t => t.id !== id));
      setSidebarApps(prev => prev.filter(a => a.templateId !== id));
      toast({ title: "App deleted" });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.message, variant: "destructive" });
    }
  };

  const handleToggleSidebar = async (template: AiTemplate) => {
    const isIn = sidebarTemplateIds.has(template.id);
    try {
      if (isIn) {
        await api.delete(`/ai-templates/sidebar/apps/${template.id}`);
        setSidebarApps(prev => prev.filter(a => a.templateId !== template.id));
        toast({ title: "Removed from sidebar" });
      } else {
        if (sidebarApps.length >= 3) {
          toast({ title: "Sidebar full (max 3)", description: "Remove an app from the sidebar first.", variant: "destructive" });
          return;
        }
        const app = await api.post<SidebarApp>("/ai-templates/sidebar/apps", { templateId: template.id });
        setSidebarApps(prev => [...prev, app]);
        toast({ title: `${template.appName} added to sidebar!` });
      }
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message, variant: "destructive" });
    }
  };

  const filtered = templates.filter(t =>
    !search ||
    t.appName.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--fb-bg)", display: "flex", flexDirection: "column" }}>

      {/* ── Page Header ── */}
      <div style={{
        background: "var(--fb-surface)", borderBottom: "1px solid var(--fb-border)",
        padding: "20px 28px", display: "flex", alignItems: "center", gap: "14px",
      }}>
        <div style={{
          width: "38px", height: "38px", borderRadius: "10px", flexShrink: 0,
          background: "linear-gradient(135deg, #A855F7, #7467F0)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 12px rgba(168,85,247,0.3)",
        }}>
          <Wand2 size={18} color="#fff" strokeWidth={2.2} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--fb-text)" }}>AI Template Builder</h1>
          <p style={{ margin: 0, fontSize: "0.73rem", color: "var(--fb-text-muted)", marginTop: "2px" }}>
            Describe any mini app — AI generates a complete interactive layout for you.
          </p>
        </div>
      </div>

      <div style={{ flex: 1, padding: "24px 28px", maxWidth: "920px", width: "100%", margin: "0 auto", boxSizing: "border-box" }}>

        {/* ── Prompt Box ── */}
        <div style={{
          background: "var(--fb-surface)", border: "1px solid var(--fb-border)",
          borderRadius: "14px", padding: "18px", marginBottom: "28px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "11px" }}>
            <Sparkles size={14} color="#A855F7" strokeWidth={2.2} />
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--fb-text)" }}>What app do you want to build?</span>
          </div>

          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
            placeholder="e.g. Habit Tracker with daily streaks and weekly progress charts..."
            rows={3}
            disabled={generating}
            style={{
              width: "100%", resize: "none", border: "1px solid var(--fb-border)",
              borderRadius: "9px", padding: "11px 13px",
              background: "var(--fb-surface2)", color: "var(--fb-text)",
              fontSize: "0.84rem", fontFamily: "inherit", outline: "none",
              lineHeight: 1.55, boxSizing: "border-box", opacity: generating ? 0.6 : 1,
            }}
          />

          {/* Example chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "9px" }}>
            {EXAMPLE_PROMPTS.map(ex => (
              <button
                key={ex}
                onClick={() => setPrompt(ex)}
                disabled={generating}
                style={{
                  padding: "3px 10px", borderRadius: "20px", border: "1px solid var(--fb-border)",
                  background: "var(--fb-surface2)", color: "var(--fb-text-muted)",
                  fontSize: "0.67rem", cursor: "pointer", fontFamily: "inherit",
                }}
              >{ex}</button>
            ))}
          </div>

          {error && (
            <div style={{
              marginTop: "10px", padding: "9px 12px", borderRadius: "8px",
              background: "#F43F5E12", border: "1px solid #F43F5E30",
              color: "#F43F5E", fontSize: "0.74rem",
              display: "flex", alignItems: "center", gap: "7px",
            }}>
              <AlertTriangle size={13} strokeWidth={2.2} /> {error}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px" }}>
            <span style={{ fontSize: "0.65rem", color: "var(--fb-text-muted)" }}>⌘ + Enter to generate</span>
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || generating}
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                padding: "9px 20px", borderRadius: "9px", border: "none",
                background: !prompt.trim() || generating ? "var(--fb-surface2)" : "linear-gradient(135deg, #A855F7, #7467F0)",
                color: !prompt.trim() || generating ? "var(--fb-text-muted)" : "#fff",
                fontSize: "0.82rem", fontWeight: 700,
                cursor: !prompt.trim() || generating ? "not-allowed" : "pointer",
                boxShadow: !prompt.trim() || generating ? "none" : "0 4px 14px rgba(168,85,247,0.32)",
                transition: "all 0.2s",
              }}
            >
              {generating
                ? <><Loader2 size={14} strokeWidth={2.5} style={{ animation: "spin 1s linear infinite" }} /> Generating...</>
                : <><Wand2 size={14} strokeWidth={2.2} /> Generate App</>
              }
            </button>
          </div>
        </div>

        {/* ── My Apps Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "var(--fb-text)" }}>My Generated Apps</h2>
            <p style={{ margin: "2px 0 0", fontSize: "0.7rem", color: "var(--fb-text-muted)" }}>
              {templates.length} app{templates.length !== 1 ? "s" : ""} · {sidebarApps.length}/3 pinned to sidebar
            </p>
          </div>
          {templates.length > 3 && (
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: "var(--fb-surface)", border: "1px solid var(--fb-border)",
              borderRadius: "8px", padding: "5px 10px",
            }}>
              <Search size={13} color="var(--fb-text-muted)" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  border: "none", outline: "none", background: "transparent",
                  fontSize: "0.75rem", color: "var(--fb-text)", width: "110px", fontFamily: "inherit",
                }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ border: "none", background: "none", cursor: "pointer", padding: 0, color: "var(--fb-text-muted)", display: "flex" }}>
                  <X size={12} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Grid ── */}
        {loadingTemplates ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "52px", gap: "10px", color: "var(--fb-text-muted)" }}>
            <Loader2 size={20} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: "0.82rem" }}>Loading your apps...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "52px 24px",
            background: "var(--fb-surface)", borderRadius: "12px",
            border: "1px dashed var(--fb-border)",
          }}>
            <LayoutTemplate size={38} color="var(--fb-text-muted)" strokeWidth={1.3} style={{ marginBottom: "12px", opacity: 0.45 }} />
            <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--fb-text)", marginBottom: "6px" }}>
              {search ? "No apps match your search" : "No apps yet"}
            </div>
            <div style={{ fontSize: "0.73rem", color: "var(--fb-text-muted)" }}>
              {search ? "Try a different search term." : "Enter a prompt above and click Generate to create your first mini app."}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "14px" }}>
            {filtered.map(template => (
              <AppCard
                key={template.id}
                template={template}
                isSidebarApp={sidebarTemplateIds.has(template.id)}
                onPreview={t => navigate(`/dashboard/templates/${t.id}`)}
                onDelete={handleDelete}
                onToggleSidebar={handleToggleSidebar}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
