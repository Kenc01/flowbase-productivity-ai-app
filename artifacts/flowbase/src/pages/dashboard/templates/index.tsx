import React, { useState, useEffect } from "react";
import {
  Wand2, Sparkles, Loader2, Trash2, Eye, LayoutTemplate,
  PanelLeftOpen, PanelLeftClose, AlertTriangle, Search, X, Star, Plus,
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

const GEN_STEPS = [
  "Analyzing your prompt...",
  "Designing the layout...",
  "Building sections...",
  "Saving your app...",
];

// ─── App Card ─────────────────────────────────────────────────────────────────

function AppCard({
  template, isSidebarApp, onPreview, onDelete, onToggleSidebar,
}: {
  template: AiTemplate; isSidebarApp: boolean;
  onPreview: (t: AiTemplate) => void;
  onDelete: (id: string) => void;
  onToggleSidebar: (t: AiTemplate) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const rgb = hexToRgb(template.color);
  const sections = (() => { try { return JSON.parse(template.sectionsJson); } catch { return []; } })();

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false); }}
      style={{
        background: "var(--fb-surface)",
        border: `1px solid ${hovered ? `rgba(${rgb}, 0.4)` : "var(--fb-border)"}`,
        borderRadius: "12px", overflow: "hidden",
        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.15s",
        boxShadow: hovered ? `0 6px 24px rgba(${rgb}, 0.16)` : "0 1px 3px rgba(0,0,0,0.06)",
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
        display: "flex", flexDirection: "column",
      }}
    >
      <div style={{ height: "4px", background: `linear-gradient(90deg, ${template.color}, ${template.color}55)` }} />

      <div style={{ padding: "14px 14px 10px", flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <div style={{
            width: "38px", height: "38px", borderRadius: "10px", flexShrink: 0,
            background: `linear-gradient(135deg, ${template.color}, ${template.color}bb)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 3px 8px rgba(${rgb}, 0.28)`,
          }}>
            <LucideIcon name={template.icon} size={17} color="#fff" strokeWidth={2.1} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: "0.86rem", fontWeight: 700, color: "var(--fb-text)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{template.appName}</div>
            <div style={{
              fontSize: "0.7rem", color: "var(--fb-text-muted)", marginTop: "2px",
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>{template.description}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span style={{
            fontSize: "0.61rem", color: "var(--fb-text-muted)", fontWeight: 500,
            background: "var(--fb-surface2)", padding: "2px 7px", borderRadius: "10px",
          }}>{timeAgo(template.createdAt)}</span>

          {sections.length > 0 && (
            <span style={{
              fontSize: "0.61rem", color: "var(--fb-text-muted)", fontWeight: 500,
              background: "var(--fb-surface2)", padding: "2px 7px", borderRadius: "10px",
            }}>{sections.length} section{sections.length !== 1 ? "s" : ""}</span>
          )}

          {isSidebarApp && (
            <span style={{
              fontSize: "0.61rem", fontWeight: 600, padding: "2px 7px", borderRadius: "10px",
              background: `rgba(${rgb}, 0.13)`, color: template.color,
              display: "flex", alignItems: "center", gap: "3px",
            }}>
              <Star size={9} strokeWidth={2.5} /> Pinned
            </span>
          )}
        </div>
      </div>

      <div style={{
        borderTop: "1px solid var(--fb-border)", padding: "8px 10px",
        display: "flex", gap: "5px", alignItems: "center",
      }}>
        <button
          onClick={() => onPreview(template)}
          style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "6px 10px", borderRadius: "7px", border: "none",
            background: template.color, color: "#fff", fontSize: "0.72rem",
            fontWeight: 600, cursor: "pointer", flex: 1, justifyContent: "center",
            boxShadow: `0 2px 6px rgba(${rgb}, 0.28)`,
          }}
        >
          <Eye size={12} strokeWidth={2.2} /> Open
        </button>
        <button
          onClick={() => onToggleSidebar(template)}
          title={isSidebarApp ? "Unpin from sidebar" : "Pin to sidebar"}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "32px", height: "32px", borderRadius: "7px", border: "none",
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
              width: "32px", height: "32px", borderRadius: "7px", border: "none",
              background: "#F43F5E20", color: "#F43F5E",
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
              width: "32px", height: "32px", borderRadius: "7px", border: "none",
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
  const [genStep, setGenStep] = useState(0);
  const [templates, setTemplates] = useState<AiTemplate[]>([]);
  const [sidebarApps, setSidebarApps] = useState<SidebarApp[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Read reprompt from URL query (set by preview page "Regenerate" button)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reprompt = params.get("reprompt");
    if (reprompt) {
      setPrompt(decodeURIComponent(reprompt));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      api.get<AiTemplate[]>("/ai-templates"),
      api.get<SidebarApp[]>("/ai-templates/sidebar/apps"),
    ]).then(([tmpl, sidebar]) => {
      setTemplates(tmpl);
      setSidebarApps(sidebar);
    }).catch(console.error).finally(() => setLoadingTemplates(false));
  }, []);

  const sidebarTemplateIds = new Set(sidebarApps.map(a => a.templateId));

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setGenStep(0);
    setError(null);

    // Step through generation phases
    const stepTimer = setInterval(() => {
      setGenStep(s => Math.min(s + 1, GEN_STEPS.length - 2));
    }, 1100);

    try {
      const generated = await api.post<any>("/ai-templates/generate", { prompt });
      clearInterval(stepTimer);
      setGenStep(GEN_STEPS.length - 1); // "Saving..."

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
      toast({ title: `✨ ${saved.appName} ready!`, description: "Opening preview..." });

      // Navigate to the new app's preview
      setTimeout(() => navigate(`/dashboard/templates/${saved.id}`), 600);
    } catch (err: any) {
      clearInterval(stepTimer);
      const msg = err?.message?.includes("GROQ_API_KEY")
        ? "GROQ_API_KEY is not configured."
        : err?.message?.includes("Invalid API Key")
        ? "Your Groq API key is invalid. Please check it in the Secrets tab."
        : (err?.message ?? "Generation failed. Please try again.");
      setError(msg);
    } finally {
      setGenerating(false);
      setGenStep(0);
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
        toast({ title: "Unpinned from sidebar" });
      } else {
        if (sidebarApps.length >= 3) {
          toast({ title: "Sidebar full (max 3)", description: "Unpin an app first.", variant: "destructive" });
          return;
        }
        const app = await api.post<SidebarApp>("/ai-templates/sidebar/apps", { templateId: template.id });
        setSidebarApps(prev => [...prev, app]);
        toast({ title: `${template.appName} pinned to sidebar!` });
      }
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message, variant: "destructive" });
    }
  };

  const filtered = templates.filter(t =>
    !search ||
    t.appName.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase()) ||
    t.prompt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--fb-bg)", display: "flex", flexDirection: "column" }}>

      {/* ── Page Header ── */}
      <div style={{
        background: "var(--fb-surface)", borderBottom: "1px solid var(--fb-border)",
        padding: "18px 28px", display: "flex", alignItems: "center", gap: "14px",
      }}>
        <div style={{
          width: "40px", height: "40px", borderRadius: "11px", flexShrink: 0,
          background: "linear-gradient(135deg, #A855F7, #7467F0)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 14px rgba(168,85,247,0.32)",
        }}>
          <Wand2 size={19} color="#fff" strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--fb-text)" }}>AI Template Builder</h1>
          <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--fb-text-muted)", marginTop: "2px" }}>
            Describe any app — AI generates a complete interactive layout instantly.
          </p>
        </div>
        {templates.length > 0 && (
          <div style={{
            padding: "5px 11px", borderRadius: "20px",
            background: "linear-gradient(135deg, rgba(168,85,247,0.12), rgba(116,103,240,0.12))",
            fontSize: "0.7rem", fontWeight: 700, color: "#A855F7",
          }}>
            {templates.length} app{templates.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: "24px 28px", maxWidth: "960px", width: "100%", margin: "0 auto", boxSizing: "border-box" }}>

        {/* ── Prompt Box ── */}
        <div style={{
          background: "var(--fb-surface)", border: "1px solid var(--fb-border)",
          borderRadius: "14px", padding: "18px", marginBottom: "28px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "11px" }}>
            <Sparkles size={14} color="#A855F7" strokeWidth={2.2} />
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--fb-text)" }}>What app do you want to build?</span>
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
              lineHeight: 1.55, boxSizing: "border-box",
              opacity: generating ? 0.6 : 1, transition: "opacity 0.2s",
            }}
          />

          {/* Example chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "9px" }}>
            {EXAMPLE_PROMPTS.map(ex => (
              <button
                key={ex}
                onClick={() => { setPrompt(ex); setError(null); }}
                disabled={generating}
                style={{
                  padding: "4px 10px", borderRadius: "20px", border: "1px solid var(--fb-border)",
                  background: prompt === ex ? "rgba(168,85,247,0.1)" : "var(--fb-surface2)",
                  color: prompt === ex ? "#A855F7" : "var(--fb-text-muted)",
                  fontSize: "0.68rem", cursor: "pointer", fontFamily: "inherit",
                  fontWeight: prompt === ex ? 600 : 400,
                  transition: "all 0.15s",
                }}
              >{ex}</button>
            ))}
          </div>

          {error && (
            <div style={{
              marginTop: "10px", padding: "10px 13px", borderRadius: "8px",
              background: "#F43F5E12", border: "1px solid #F43F5E30",
              color: "#F43F5E", fontSize: "0.75rem",
              display: "flex", alignItems: "flex-start", gap: "8px",
            }}>
              <AlertTriangle size={14} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: "1px" }} /> {error}
            </div>
          )}

          {/* Generating steps */}
          {generating && (
            <div style={{
              marginTop: "12px", padding: "10px 14px", borderRadius: "8px",
              background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.18)",
              display: "flex", alignItems: "center", gap: "10px",
            }}>
              <Loader2 size={14} color="#A855F7" strokeWidth={2.5} style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.76rem", color: "#A855F7", fontWeight: 600 }}>{GEN_STEPS[genStep]}</div>
                <div style={{ display: "flex", gap: "4px", marginTop: "5px" }}>
                  {GEN_STEPS.map((_, i) => (
                    <div key={i} style={{
                      height: "3px", flex: 1, borderRadius: "2px",
                      background: i <= genStep ? "#A855F7" : "rgba(168,85,247,0.2)",
                      transition: "background 0.3s",
                    }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px" }}>
            <span style={{ fontSize: "0.65rem", color: "var(--fb-text-muted)" }}>⌘ + Enter to generate</span>
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || generating}
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                padding: "9px 22px", borderRadius: "9px", border: "none",
                background: !prompt.trim() || generating
                  ? "var(--fb-surface2)"
                  : "linear-gradient(135deg, #A855F7, #7467F0)",
                color: !prompt.trim() || generating ? "var(--fb-text-muted)" : "#fff",
                fontSize: "0.83rem", fontWeight: 700,
                cursor: !prompt.trim() || generating ? "not-allowed" : "pointer",
                boxShadow: !prompt.trim() || generating ? "none" : "0 4px 16px rgba(168,85,247,0.35)",
                transition: "all 0.2s", fontFamily: "inherit",
              }}
            >
              {generating
                ? <><Loader2 size={14} strokeWidth={2.5} style={{ animation: "spin 0.8s linear infinite" }} /> Generating...</>
                : <><Wand2 size={14} strokeWidth={2.2} /> Generate App</>
              }
            </button>
          </div>
        </div>

        {/* ── My Apps Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "var(--fb-text)" }}>My Generated Apps</h2>
            <p style={{ margin: "2px 0 0", fontSize: "0.7rem", color: "var(--fb-text-muted)" }}>
              {templates.length} app{templates.length !== 1 ? "s" : ""} · {sidebarApps.length}/3 pinned
            </p>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "var(--fb-surface)", border: "1px solid var(--fb-border)",
            borderRadius: "8px", padding: "5px 10px",
          }}>
            <Search size={13} color="var(--fb-text-muted)" strokeWidth={2} />
            <input
              type="text"
              placeholder="Search apps..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                border: "none", outline: "none", background: "transparent",
                fontSize: "0.75rem", color: "var(--fb-text)", width: "120px", fontFamily: "inherit",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ border: "none", background: "none", cursor: "pointer", padding: 0, color: "var(--fb-text-muted)", display: "flex" }}>
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* ── Grid ── */}
        {loadingTemplates ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "14px" }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                height: "150px", background: "var(--fb-surface)", borderRadius: "12px",
                border: "1px solid var(--fb-border)", animation: "pulse 1.5s ease-in-out infinite",
              }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "52px 24px",
            background: "var(--fb-surface)", borderRadius: "14px",
            border: "1px dashed var(--fb-border)",
          }}>
            <LayoutTemplate size={40} color="var(--fb-text-muted)" strokeWidth={1.3} style={{ marginBottom: "14px", opacity: 0.4 }} />
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--fb-text)", marginBottom: "6px" }}>
              {search ? "No apps match your search" : "No apps yet"}
            </div>
            <div style={{ fontSize: "0.73rem", color: "var(--fb-text-muted)", maxWidth: "280px", margin: "0 auto" }}>
              {search
                ? "Try a different search term or clear the filter."
                : "Enter a prompt above and hit Generate to create your first mini app."}
            </div>
            {!search && (
              <button
                onClick={() => { setPrompt(EXAMPLE_PROMPTS[0]); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                style={{
                  marginTop: "16px", display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "8px 18px", borderRadius: "8px", border: "none",
                  background: "linear-gradient(135deg, #A855F7, #7467F0)", color: "#fff",
                  fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <Plus size={14} strokeWidth={2.5} /> Try an example
              </button>
            )}
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

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
