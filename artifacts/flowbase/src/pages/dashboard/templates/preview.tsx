import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft, Loader2, AlertTriangle, PanelLeftOpen, PanelLeftClose,
  Trash2, Wand2, Calendar, MessageSquare, ChevronDown, ChevronUp,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { api } from "../../../lib/api";
import { useToast } from "@/hooks/use-toast";
import AppRenderer, { type AppTemplate } from "./AppRenderer";

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

interface SidebarApp { templateId: string; }

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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function TemplatePreviewPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [template, setTemplate] = useState<AiTemplate | null>(null);
  const [sidebarApps, setSidebarApps] = useState<SidebarApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const { toast } = useToast();
  const isInSidebar = sidebarApps.some(a => a.templateId === params.id);

  useEffect(() => {
    if (!params.id) return;
    Promise.all([
      api.get<AiTemplate>(`/ai-templates/${params.id}`),
      api.get<SidebarApp[]>("/ai-templates/sidebar/apps"),
    ]).then(([tmpl, sidebar]) => {
      setTemplate(tmpl);
      setSidebarApps(sidebar);
    }).catch(err => {
      setError(err?.message ?? "Failed to load app");
    }).finally(() => setLoading(false));
  }, [params.id]);

  const handleToggleSidebar = async () => {
    if (!template) return;
    try {
      if (isInSidebar) {
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

  const handleDelete = async () => {
    if (!template) return;
    try {
      await api.delete(`/ai-templates/${template.id}`);
      toast({ title: "App deleted" });
      navigate("/dashboard/templates");
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.message, variant: "destructive" });
    }
  };

  const handleRegenerate = () => {
    if (!template?.prompt) return;
    navigate(`/dashboard/templates?reprompt=${encodeURIComponent(template.prompt)}`);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "10px", color: "var(--fb-text-muted)" }}>
        <Loader2 size={22} strokeWidth={2} style={{ animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: "0.84rem" }}>Loading app...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "12px" }}>
        <AlertTriangle size={32} strokeWidth={1.5} color="#F43F5E" />
        <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--fb-text)" }}>App not found</div>
        <div style={{ fontSize: "0.74rem", color: "var(--fb-text-muted)" }}>{error}</div>
        <button onClick={() => navigate("/dashboard/templates")} style={{
          marginTop: "8px", padding: "8px 18px", borderRadius: "8px", border: "none",
          background: "var(--fb-surface2)", color: "var(--fb-text)", cursor: "pointer",
          fontSize: "0.8rem", fontWeight: 600, fontFamily: "inherit",
        }}>← Back to Template Builder</button>
      </div>
    );
  }

  const appData: AppTemplate = {
    appName: template.appName,
    description: template.description,
    icon: template.icon,
    color: template.color,
    layout: template.layout,
    sections: (() => { try { return JSON.parse(template.sectionsJson); } catch { return []; } })(),
    actions: (() => { try { return JSON.parse(template.actionsJson); } catch { return []; } })(),
    sampleData: (() => { try { return JSON.parse(template.sampleDataJson); } catch { return []; } })(),
  };

  const rgb = hexToRgb(template.color);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--fb-bg)" }}>

      {/* ── Top Bar ── */}
      <div style={{
        background: "var(--fb-surface)", borderBottom: "1px solid var(--fb-border)",
        padding: "10px 18px", display: "flex", alignItems: "center", gap: "10px",
        position: "sticky", top: 0, zIndex: 20,
      }}>
        <button
          onClick={() => navigate("/dashboard/templates")}
          style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "6px 10px", borderRadius: "7px", border: "none",
            background: "var(--fb-surface2)", color: "var(--fb-text-muted)",
            fontSize: "0.74rem", fontWeight: 600, cursor: "pointer", flexShrink: 0,
            fontFamily: "inherit",
          }}
        >
          <ArrowLeft size={13} strokeWidth={2.2} /> Back
        </button>

        {/* App identity */}
        <div style={{ display: "flex", alignItems: "center", gap: "9px", flex: 1, minWidth: 0 }}>
          <div style={{
            width: "30px", height: "30px", borderRadius: "8px", flexShrink: 0,
            background: `linear-gradient(135deg, ${template.color}, ${template.color}bb)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 2px 8px rgba(${rgb}, 0.32)`,
          }}>
            <LucideIcon name={template.icon} size={14} color="#fff" strokeWidth={2.1} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--fb-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {template.appName}
            </div>
            <div style={{ fontSize: "0.64rem", color: "var(--fb-text-muted)", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <Calendar size={10} strokeWidth={2} /> {formatDate(template.createdAt)}
              </span>
              {template.prompt && (
                <button
                  onClick={() => setShowPrompt(s => !s)}
                  style={{
                    border: "none", background: "none", cursor: "pointer", padding: 0,
                    color: "var(--fb-text-muted)", display: "flex", alignItems: "center", gap: "2px",
                    fontSize: "0.64rem", fontFamily: "inherit",
                  }}
                >
                  <MessageSquare size={10} strokeWidth={2} /> prompt
                  {showPrompt ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
          {/* Regenerate */}
          {template.prompt && (
            <button
              onClick={handleRegenerate}
              title="Regenerate with same prompt"
              style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "6px 11px", borderRadius: "7px", border: "none",
                background: "rgba(168,85,247,0.1)", color: "#A855F7",
                fontSize: "0.73rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <Wand2 size={13} strokeWidth={2} /> Regenerate
            </button>
          )}

          {/* Pin/Unpin */}
          <button
            onClick={handleToggleSidebar}
            style={{
              display: "flex", alignItems: "center", gap: "5px",
              padding: "6px 11px", borderRadius: "7px", border: "none",
              background: isInSidebar ? `rgba(${rgb}, 0.15)` : "var(--fb-surface2)",
              color: isInSidebar ? template.color : "var(--fb-text-muted)",
              fontSize: "0.73rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {isInSidebar
              ? <><PanelLeftClose size={13} strokeWidth={2} /> Pinned</>
              : <><PanelLeftOpen size={13} strokeWidth={2} /> Pin</>}
          </button>

          {/* Delete */}
          {confirmDelete ? (
            <button
              onClick={handleDelete}
              style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "6px 12px", borderRadius: "7px", border: "none",
                background: "#F43F5E", color: "#fff",
                fontSize: "0.73rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <AlertTriangle size={12} strokeWidth={2.5} /> Confirm
            </button>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              onBlur={() => setTimeout(() => setConfirmDelete(false), 200)}
              style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "6px 10px", borderRadius: "7px", border: "none",
                background: "var(--fb-surface2)", color: "var(--fb-text-muted)",
                fontSize: "0.73rem", fontWeight: 600, cursor: "pointer",
              }}
            >
              <Trash2 size={13} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* ── Prompt banner ── */}
      {showPrompt && template.prompt && (
        <div style={{
          background: "rgba(168,85,247,0.06)", borderBottom: "1px solid rgba(168,85,247,0.15)",
          padding: "10px 20px",
          display: "flex", alignItems: "flex-start", gap: "8px",
        }}>
          <MessageSquare size={13} color="#A855F7" strokeWidth={2} style={{ marginTop: "2px", flexShrink: 0 }} />
          <span style={{ fontSize: "0.77rem", color: "var(--fb-text-muted)", lineHeight: 1.5, fontStyle: "italic" }}>
            "{template.prompt}"
          </span>
          <button
            onClick={() => navigate(`/dashboard/templates?reprompt=${encodeURIComponent(template.prompt)}`)}
            style={{
              marginLeft: "auto", flexShrink: 0, padding: "3px 10px", borderRadius: "6px", border: "none",
              background: "rgba(168,85,247,0.12)", color: "#A855F7",
              fontSize: "0.68rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Use as prompt
          </button>
        </div>
      )}

      {/* ── App Content ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <AppRenderer template={appData} />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
