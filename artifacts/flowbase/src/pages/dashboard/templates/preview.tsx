import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Loader2, AlertTriangle, PanelLeftOpen, PanelLeftClose, Star, Trash2 } from "lucide-react";
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

interface SidebarApp {
  templateId: string;
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

export default function TemplatePreviewPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [template, setTemplate] = useState<AiTemplate | null>(null);
  const [sidebarApps, setSidebarApps] = useState<SidebarApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "10px", color: "var(--fb-text-muted)" }}>
        <Loader2 size={22} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: "0.84rem" }}>Loading app...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "12px", color: "var(--fb-text-muted)" }}>
        <AlertTriangle size={32} strokeWidth={1.5} color="#F43F5E" />
        <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--fb-text)" }}>App not found</div>
        <div style={{ fontSize: "0.74rem" }}>{error}</div>
        <button onClick={() => navigate("/dashboard/templates")} style={{
          marginTop: "8px", padding: "8px 18px", borderRadius: "8px", border: "none",
          background: "var(--fb-surface2)", color: "var(--fb-text)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600,
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
    sections: JSON.parse(template.sectionsJson),
    actions: JSON.parse(template.actionsJson),
    sampleData: JSON.parse(template.sampleDataJson),
  };

  const rgb = hexToRgb(template.color);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--fb-bg)" }}>

      {/* Top bar */}
      <div style={{
        background: "var(--fb-surface)", borderBottom: "1px solid var(--fb-border)",
        padding: "12px 20px", display: "flex", alignItems: "center", gap: "12px",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <button
          onClick={() => navigate("/dashboard/templates")}
          style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "6px 10px", borderRadius: "7px", border: "none",
            background: "var(--fb-surface2)", color: "var(--fb-text-muted)",
            fontSize: "0.74rem", fontWeight: 600, cursor: "pointer",
          }}
        >
          <ArrowLeft size={13} strokeWidth={2.2} /> Back
        </button>

        {/* App identity */}
        <div style={{ display: "flex", alignItems: "center", gap: "9px", flex: 1, minWidth: 0 }}>
          <div style={{
            width: "28px", height: "28px", borderRadius: "7px", flexShrink: 0,
            background: `linear-gradient(135deg, ${template.color}, ${template.color}bb)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 2px 6px rgba(${rgb}, 0.3)`,
          }}>
            <LucideIcon name={template.icon} size={14} color="#fff" strokeWidth={2.1} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--fb-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{template.appName}</div>
            <div style={{ fontSize: "0.66rem", color: "var(--fb-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{template.description}</div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
          <button
            onClick={handleToggleSidebar}
            style={{
              display: "flex", alignItems: "center", gap: "5px",
              padding: "6px 12px", borderRadius: "7px", border: "none",
              background: isInSidebar ? `rgba(${rgb}, 0.15)` : "var(--fb-surface2)",
              color: isInSidebar ? template.color : "var(--fb-text-muted)",
              fontSize: "0.74rem", fontWeight: 600, cursor: "pointer",
            }}
          >
            {isInSidebar ? <><PanelLeftClose size={13} strokeWidth={2} /> In Sidebar</> : <><PanelLeftOpen size={13} strokeWidth={2} /> Add to Sidebar</>}
          </button>

          {confirmDelete ? (
            <button
              onClick={handleDelete}
              style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "6px 12px", borderRadius: "7px", border: "none",
                background: "#F43F5E", color: "#fff",
                fontSize: "0.74rem", fontWeight: 700, cursor: "pointer",
              }}
            >
              <AlertTriangle size={12} strokeWidth={2.5} /> Confirm Delete
            </button>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "6px 10px", borderRadius: "7px", border: "none",
                background: "var(--fb-surface2)", color: "var(--fb-text-muted)",
                fontSize: "0.74rem", fontWeight: 600, cursor: "pointer",
              }}
            >
              <Trash2 size={13} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Preview */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <AppRenderer template={appData} />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
