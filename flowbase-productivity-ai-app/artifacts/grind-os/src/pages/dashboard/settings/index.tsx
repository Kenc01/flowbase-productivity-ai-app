import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/react";
import {
  User, CreditCard, Tag, Bot, SlidersHorizontal,
  ChevronRight, Plus, Pencil, Trash2, Check, X,
  Palette, Bell, CalendarDays, ListTodo, Save,
  Download, Shield, Loader2, AlertCircle, Sparkles,
  Brain, Wand2, ToggleRight, Moon, Sun, Monitor, NotebookPen,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserSettings {
  preferredModel: string;
  aiTone: string;
  aiRefineEnabled: boolean;
  aiAssistantEnabled: boolean;
  aiTemplateBuilderEnabled: boolean;
  theme: string;
  defaultCalendarView: string;
  defaultTaskPriority: string;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  autoSave: boolean;
}

interface Category {
  id: string;
  userId?: string;
  type: string;
  name: string;
  color: string;
  icon: string;
  createdAt?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "profile",      label: "Profile",       icon: User,              color: "#7467F0" },
  { id: "subscription", label: "Subscription",  icon: CreditCard,        color: "#10B981" },
  { id: "categories",   label: "Categories",    icon: Tag,               color: "#F59E0B" },
  { id: "ai",           label: "AI Settings",   icon: Bot,               color: "#06B6D4" },
  { id: "preferences",  label: "Preferences",   icon: SlidersHorizontal, color: "#8B5CF6" },
];

const GROQ_MODELS = [
  { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", desc: "Best quality · Recommended" },
  { value: "llama-3.1-70b-versatile", label: "Llama 3.1 70B", desc: "High quality · Stable" },
  { value: "llama-3.1-8b-instant",    label: "Llama 3.1 8B",  desc: "Fast · Lightweight" },
];

const AI_TONES = [
  { value: "balanced",  label: "Balanced",  desc: "Natural and helpful" },
  { value: "formal",    label: "Formal",    desc: "Professional and structured" },
  { value: "casual",    label: "Casual",    desc: "Friendly and relaxed" },
  { value: "concise",   label: "Concise",   desc: "Short and to the point" },
  { value: "creative",  label: "Creative",  desc: "Expressive and imaginative" },
];

const CATEGORY_TYPES = [
  { id: "calendar",  label: "Calendar Events", icon: CalendarDays,  color: "#F59E0B" },
  { id: "tasks",     label: "Tasks / Kanban",  icon: ListTodo,      color: "#10B981" },
  { id: "notes",     label: "Notes",           icon: NotebookPen,   color: "#F43F5E" },
  { id: "reminders", label: "Reminders",       icon: Bell,          color: "#7467F0" },
];

const CATEGORY_ICONS = [
  "Tag","Star","Heart","Zap","Flame","Target","BookOpen","Coffee",
  "Music","Plane","Home","Briefcase","ShoppingCart","Dumbbell","Apple","Brain",
];

const PRESET_COLORS = [
  "#7467F0","#10B981","#F59E0B","#F43F5E","#3B82F6","#8B5CF6",
  "#EC4899","#14B8A6","#06B6D4","#84CC16","#EF4444","#F97316",
];

const DEFAULT_SETTINGS: UserSettings = {
  preferredModel: "llama-3.3-70b-versatile",
  aiTone: "balanced",
  aiRefineEnabled: true,
  aiAssistantEnabled: true,
  aiTemplateBuilderEnabled: true,
  theme: "system",
  defaultCalendarView: "week",
  defaultTaskPriority: "medium",
  notificationsEnabled: true,
  emailNotifications: false,
  autoSave: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function LucideIcon({ name, size = 16, color }: { name: string; size?: number; color?: string }) {
  const Icon = (LucideIcons as any)[name] ?? LucideIcons.Tag;
  return <Icon size={size} color={color} strokeWidth={1.8} />;
}

function Toggle({ value, onChange, color = "#7467F0" }: {
  value: boolean; onChange: (v: boolean) => void; color?: string;
}) {
  return (
    <button onClick={() => onChange(!value)} style={{
      width: "42px", height: "24px", borderRadius: "12px", border: "none", cursor: "pointer",
      background: value ? color : "var(--fb-border)", transition: "background 0.2s",
      position: "relative", flexShrink: 0,
    }}>
      <div style={{
        position: "absolute", top: "3px", left: value ? "21px" : "3px",
        width: "18px", height: "18px", borderRadius: "50%", background: "#fff",
        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

function SettingRow({ label, description, children, last }: {
  label: string; description?: string; children: React.ReactNode; last?: boolean;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: "16px", padding: "12px 0",
      borderBottom: last ? "none" : "1px solid var(--fb-border)",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.83rem", fontWeight: 600, color: "var(--fb-text)" }}>{label}</div>
        {description && <div style={{ fontSize: "0.72rem", color: "var(--fb-text-muted)", marginTop: "2px" }}>{description}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "var(--fb-surface)", border: "1px solid var(--fb-border)",
      borderRadius: "12px", padding: "20px 24px", ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, label, color }: {
  icon: React.ElementType; label: string; color: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
      <div style={{
        width: "28px", height: "28px", borderRadius: "8px", background: `${color}18`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={14} color={color} strokeWidth={2} />
      </div>
      <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--fb-text)" }}>{label}</span>
    </div>
  );
}

function SelectField({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; desc?: string }[];
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      padding: "7px 12px", borderRadius: "8px", border: "1px solid var(--fb-border)",
      background: "var(--fb-surface2)", color: "var(--fb-text)", fontSize: "0.8rem",
      fontFamily: "inherit", outline: "none", cursor: "pointer", minWidth: "180px",
    }}>
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}{o.desc ? ` — ${o.desc}` : ""}
        </option>
      ))}
    </select>
  );
}

// ─── Category Form ────────────────────────────────────────────────────────────

function CategoryForm({ initial, type, onSave, onCancel }: {
  initial?: Partial<Category>;
  type: string;
  onSave: (data: { type: string; name: string; color: string; icon: string }) => void;
  onCancel: () => void;
}) {
  const [name,  setName]  = useState(initial?.name  ?? "");
  const [color, setColor] = useState(initial?.color ?? "#7467F0");
  const [icon,  setIcon]  = useState(initial?.icon  ?? "Tag");

  return (
    <div style={{
      padding: "14px", background: "var(--fb-surface)", border: "1px solid var(--fb-border)",
      borderRadius: "10px", display: "flex", flexDirection: "column", gap: "10px",
    }}>
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && name.trim()) onSave({ type, name: name.trim(), color, icon }); if (e.key === "Escape") onCancel(); }}
        placeholder="Category name"
        style={{
          padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--fb-border)",
          background: "var(--fb-surface2)", color: "var(--fb-text)", fontSize: "0.8rem",
          fontFamily: "inherit", outline: "none",
        }}
        onFocus={e => { e.target.style.borderColor = "#7467F0"; }}
        onBlur={e => { e.target.style.borderColor = "var(--fb-border)"; }}
      />

      <div>
        <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--fb-text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Color</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {PRESET_COLORS.map(c => (
            <div key={c} onClick={() => setColor(c)} style={{
              width: "22px", height: "22px", borderRadius: "50%", background: c, cursor: "pointer",
              border: color === c ? "3px solid var(--fb-text)" : "2px solid transparent",
              boxSizing: "border-box", flexShrink: 0,
            }} />
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--fb-text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Icon</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {CATEGORY_ICONS.map(ic => (
            <div key={ic} onClick={() => setIcon(ic)} style={{
              width: "30px", height: "30px", borderRadius: "7px", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: icon === ic ? `${color}22` : "var(--fb-surface2)",
              border: icon === ic ? `2px solid ${color}` : "1px solid var(--fb-border)",
            }}>
              <LucideIcon name={ic} size={14} color={icon === ic ? color : "var(--fb-text-muted)"} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={() => { if (name.trim()) onSave({ type, name: name.trim(), color, icon }); }}
          disabled={!name.trim()}
          style={{
            display: "flex", alignItems: "center", gap: "5px", padding: "7px 14px",
            borderRadius: "8px", border: "none", background: "#7467F0", color: "#fff",
            fontSize: "0.78rem", fontWeight: 600, cursor: name.trim() ? "pointer" : "not-allowed",
            opacity: name.trim() ? 1 : 0.5, fontFamily: "inherit",
          }}>
          <Check size={12} strokeWidth={2.5} /> Save
        </button>
        <button onClick={onCancel} style={{
          padding: "7px 12px", borderRadius: "8px", border: "none", background: "transparent",
          color: "var(--fb-text-muted)", cursor: "pointer", fontSize: "0.78rem", fontFamily: "inherit",
        }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Categories Section ───────────────────────────────────────────────────────

function CategoriesSection({ categories, loading, onCreate, onUpdate, onDelete }: {
  categories: Category[];
  loading: boolean;
  onCreate: (data: { type: string; name: string; color: string; icon: string }) => void;
  onUpdate: (id: string, data: Partial<Category>) => void;
  onDelete: (id: string) => void;
}) {
  const [addingType,  setAddingType]  = useState<string | null>(null);
  const [editingCat,  setEditingCat]  = useState<Category | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {CATEGORY_TYPES.map(ct => {
        const typeCats = categories.filter(c => c.type === ct.id);
        const Icon = ct.icon;
        return (
          <Card key={ct.id}>
            <SectionTitle icon={Icon} label={ct.label} color={ct.color} />
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {loading && typeCats.length === 0 && (
                <div style={{ fontSize: "0.75rem", color: "var(--fb-text-muted)", padding: "4px 0", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Loading…
                </div>
              )}

              {typeCats.map(cat =>
                editingCat?.id === cat.id ? (
                  <CategoryForm
                    key={cat.id}
                    initial={cat}
                    type={ct.id}
                    onSave={data => { onUpdate(cat.id, data); setEditingCat(null); }}
                    onCancel={() => setEditingCat(null)}
                  />
                ) : (
                  <div key={cat.id} style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px 14px", borderRadius: "9px",
                    background: "var(--fb-surface2)", border: "1px solid var(--fb-border)",
                  }}>
                    <div style={{
                      width: "30px", height: "30px", borderRadius: "8px", flexShrink: 0,
                      background: `${cat.color}22`, display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <LucideIcon name={cat.icon} size={14} color={cat.color} />
                    </div>
                    <span style={{ flex: 1, fontSize: "0.82rem", fontWeight: 500, color: "var(--fb-text)" }}>{cat.name}</span>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                    <button onClick={() => { setEditingCat(cat); setAddingType(null); }} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--fb-text-muted)", padding: "4px", display: "flex", opacity: 0.6 }}>
                      <Pencil size={13} strokeWidth={2} />
                    </button>
                    <button onClick={() => onDelete(cat.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#F43F5E", padding: "4px", display: "flex", opacity: 0.6 }}>
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  </div>
                )
              )}

              {typeCats.length === 0 && !loading && addingType !== ct.id && (
                <div style={{ fontSize: "0.74rem", color: "var(--fb-text-muted)", opacity: 0.7, padding: "2px 0" }}>
                  No categories yet
                </div>
              )}

              {addingType === ct.id ? (
                <CategoryForm
                  type={ct.id}
                  onSave={data => { onCreate(data); setAddingType(null); }}
                  onCancel={() => setAddingType(null)}
                />
              ) : (
                <button
                  onClick={() => { setAddingType(ct.id); setEditingCat(null); }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "5px",
                    padding: "5px 10px", borderRadius: "7px", border: "1px dashed var(--fb-border)",
                    background: "transparent", color: "var(--fb-text-muted)", fontSize: "0.72rem",
                    cursor: "pointer", fontFamily: "inherit", alignSelf: "flex-start", marginTop: "4px",
                  }}>
                  <Plus size={11} strokeWidth={2.5} /> Add category
                </button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── AI Section ───────────────────────────────────────────────────────────────

function AISection({ settings, onChange }: {
  settings: UserSettings;
  onChange: (key: keyof UserSettings, val: any) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <Card>
        <SectionTitle icon={Brain} label="AI Model" color="#06B6D4" />
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {GROQ_MODELS.map(m => (
            <div key={m.value} onClick={() => onChange("preferredModel", m.value)} style={{
              display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px",
              borderRadius: "9px", cursor: "pointer",
              border: `1.5px solid ${settings.preferredModel === m.value ? "#06B6D4" : "var(--fb-border)"}`,
              background: settings.preferredModel === m.value ? "rgba(6,182,212,0.06)" : "var(--fb-surface2)",
              transition: "all 0.15s",
            }}>
              <div style={{
                width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
                border: `2px solid ${settings.preferredModel === m.value ? "#06B6D4" : "var(--fb-border)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {settings.preferredModel === m.value && (
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#06B6D4" }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--fb-text)" }}>{m.label}</div>
                <div style={{ fontSize: "0.68rem", color: "var(--fb-text-muted)", marginTop: "1px" }}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle icon={Wand2} label="Response Style" color="#8B5CF6" />
        <SettingRow label="Default Tone" description="How the AI writes and responds" last>
          <SelectField
            value={settings.aiTone}
            onChange={v => onChange("aiTone", v)}
            options={AI_TONES}
          />
        </SettingRow>
      </Card>

      <Card>
        <SectionTitle icon={ToggleRight} label="AI Features" color="#7467F0" />
        <SettingRow label="AI Refine" description="Improve and rephrase text in the editor">
          <Toggle value={settings.aiRefineEnabled} onChange={v => onChange("aiRefineEnabled", v)} />
        </SettingRow>
        <SettingRow label="AI Assistant" description="Chat-based AI assistant in your workspace">
          <Toggle value={settings.aiAssistantEnabled} onChange={v => onChange("aiAssistantEnabled", v)} />
        </SettingRow>
        <SettingRow label="AI Template Builder" description="Build mini-apps from natural language" last>
          <Toggle value={settings.aiTemplateBuilderEnabled} onChange={v => onChange("aiTemplateBuilderEnabled", v)} />
        </SettingRow>
      </Card>
    </div>
  );
}

// ─── Preferences Section ──────────────────────────────────────────────────────

function PreferencesSection({ settings, onChange }: {
  settings: UserSettings;
  onChange: (key: keyof UserSettings, val: any) => void;
}) {
  const THEMES = [
    { value: "light",  label: "Light",  icon: Sun },
    { value: "dark",   label: "Dark",   icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <Card>
        <SectionTitle icon={Palette} label="Appearance" color="#8B5CF6" />
        <SettingRow label="Theme" description="Choose your preferred color scheme" last>
          <div style={{ display: "flex", gap: "6px" }}>
            {THEMES.map(t => {
              const Icon = t.icon;
              const active = settings.theme === t.value;
              return (
                <button key={t.value} onClick={() => onChange("theme", t.value)} style={{
                  display: "flex", alignItems: "center", gap: "5px", padding: "6px 10px",
                  borderRadius: "7px", border: `1.5px solid ${active ? "#8B5CF6" : "var(--fb-border)"}`,
                  background: active ? "rgba(139,92,246,0.08)" : "transparent",
                  color: active ? "#8B5CF6" : "var(--fb-text-muted)", cursor: "pointer",
                  fontSize: "0.72rem", fontWeight: active ? 700 : 500, fontFamily: "inherit",
                }}>
                  <Icon size={12} strokeWidth={2} /> {t.label}
                </button>
              );
            })}
          </div>
        </SettingRow>
      </Card>

      <Card>
        <SectionTitle icon={Bell} label="Notifications" color="#F59E0B" />
        <SettingRow label="In-App Notifications" description="Show alerts inside Grind OS">
          <Toggle value={settings.notificationsEnabled} onChange={v => onChange("notificationsEnabled", v)} color="#F59E0B" />
        </SettingRow>
        <SettingRow label="Email Notifications" description="Receive updates via email" last>
          <Toggle value={settings.emailNotifications} onChange={v => onChange("emailNotifications", v)} color="#F59E0B" />
        </SettingRow>
      </Card>

      <Card>
        <SectionTitle icon={CalendarDays} label="Calendar" color="#F59E0B" />
        <SettingRow label="Default View" description="How your calendar opens by default" last>
          <SelectField
            value={settings.defaultCalendarView}
            onChange={v => onChange("defaultCalendarView", v)}
            options={[
              { value: "month", label: "Month" },
              { value: "week",  label: "Week"  },
              { value: "day",   label: "Day"   },
            ]}
          />
        </SettingRow>
      </Card>

      <Card>
        <SectionTitle icon={ListTodo} label="Tasks" color="#10B981" />
        <SettingRow label="Default Priority" description="Default priority for new tasks" last>
          <SelectField
            value={settings.defaultTaskPriority}
            onChange={v => onChange("defaultTaskPriority", v)}
            options={[
              { value: "low",    label: "Low"    },
              { value: "medium", label: "Medium" },
              { value: "high",   label: "High"   },
            ]}
          />
        </SettingRow>
      </Card>

      <Card>
        <SectionTitle icon={Save} label="Data & Storage" color="#06B6D4" />
        <SettingRow label="Auto-Save" description="Automatically save changes as you type">
          <Toggle value={settings.autoSave} onChange={v => onChange("autoSave", v)} color="#06B6D4" />
        </SettingRow>
        <SettingRow label="Export My Data" description="Download a copy of all your Grind OS data" last>
          <button style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            padding: "6px 12px", borderRadius: "7px",
            border: "1px solid var(--fb-border)", background: "transparent",
            color: "var(--fb-text-muted)", fontSize: "0.72rem", fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            <Download size={12} strokeWidth={2} /> Export
          </button>
        </SettingRow>
      </Card>

      <Card>
        <SectionTitle icon={Shield} label="Privacy & Security" color="#F43F5E" />
        <SettingRow label="Two-Factor Authentication" description="Add an extra layer of account security">
          <a href="https://accounts.clerk.dev/user/security" target="_blank" rel="noreferrer" style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            padding: "6px 12px", borderRadius: "7px", border: "1px solid var(--fb-border)",
            background: "transparent", color: "var(--fb-text-muted)", fontSize: "0.72rem",
            fontWeight: 600, textDecoration: "none",
          }}>
            Manage <ChevronRight size={11} strokeWidth={2.5} />
          </a>
        </SettingRow>
        <SettingRow label="Active Sessions" description="View and revoke other logged-in sessions" last>
          <a href="https://accounts.clerk.dev/user/security" target="_blank" rel="noreferrer" style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            padding: "6px 12px", borderRadius: "7px", border: "1px solid var(--fb-border)",
            background: "transparent", color: "var(--fb-text-muted)", fontSize: "0.72rem",
            fontWeight: 600, textDecoration: "none",
          }}>
            Manage <ChevronRight size={11} strokeWidth={2.5} />
          </a>
        </SettingRow>
      </Card>
    </div>
  );
}

// ─── Profile Section ──────────────────────────────────────────────────────────

function ProfileSection({ user }: { user: ReturnType<typeof useUser>["user"] }) {
  const fullName  = user?.fullName ?? "—";
  const email     = user?.primaryEmailAddress?.emailAddress ?? "—";
  const avatarUrl = user?.imageUrl;
  const initials  = (fullName !== "—" ? fullName : email).slice(0, 2).toUpperCase();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <Card>
        <SectionTitle icon={User} label="Account Profile" color="#7467F0" />
        <div style={{ display: "flex", alignItems: "center", gap: "16px", paddingBottom: "18px", borderBottom: "1px solid var(--fb-border)" }}>
          <div style={{
            width: "64px", height: "64px", borderRadius: "50%", flexShrink: 0, overflow: "hidden",
            background: "linear-gradient(135deg, #7467F0, #06B6D4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid var(--fb-border)",
          }}>
            {avatarUrl
              ? <img src={avatarUrl} alt={fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ color: "#fff", fontWeight: 800, fontSize: "1.2rem" }}>{initials}</span>}
          </div>
          <div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--fb-text)" }}>{fullName}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--fb-text-muted)", marginTop: "2px" }}>{email}</div>
            <a href="https://accounts.clerk.dev/user" target="_blank" rel="noreferrer" style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              marginTop: "10px", padding: "5px 12px", borderRadius: "7px",
              border: "1px solid var(--fb-border)", background: "transparent",
              color: "var(--fb-text-muted)", fontSize: "0.72rem", fontWeight: 600,
              textDecoration: "none",
            }}>
              <Pencil size={11} strokeWidth={2} /> Edit Profile
            </a>
          </div>
        </div>
        <SettingRow label="Account ID" description="Your unique Grind OS user ID">
          <span style={{
            fontFamily: "monospace", fontSize: "0.7rem", color: "var(--fb-text-muted)",
            background: "var(--fb-surface2)", padding: "3px 8px", borderRadius: "5px",
          }}>
            {user?.id?.slice(0, 22)}…
          </span>
        </SettingRow>
        <SettingRow label="Account Status">
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#10B981", background: "#10B98112", padding: "3px 10px", borderRadius: "20px" }}>
            Active
          </span>
        </SettingRow>
        <SettingRow label="Sign-In Methods" description="How you sign in to Grind OS" last>
          <span style={{ fontSize: "0.78rem", color: "var(--fb-text-muted)" }}>
            {user?.externalAccounts?.length
              ? user.externalAccounts.map(a => a.provider).join(", ")
              : "Email / Password"}
          </span>
        </SettingRow>
      </Card>
    </div>
  );
}

// ─── Subscription Section ─────────────────────────────────────────────────────

function SubscriptionSection() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <Card>
        <SectionTitle icon={CreditCard} label="Current Plan" color="#10B981" />
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
          padding: "16px", borderRadius: "10px",
          background: "linear-gradient(135deg, rgba(116,103,240,0.09), rgba(6,182,212,0.06))",
          border: "1px solid rgba(116,103,240,0.18)", marginBottom: "16px",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
              <Sparkles size={15} color="#7467F0" strokeWidth={2} />
              <span style={{ fontSize: "1rem", fontWeight: 800, color: "#7467F0" }}>Free Plan</span>
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--fb-text-muted)" }}>Basic access to all Grind OS features</div>
          </div>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#10B981", background: "#10B98115", padding: "4px 12px", borderRadius: "20px", flexShrink: 0 }}>
            Active
          </span>
        </div>

        <SettingRow label="Plan" description="Your current subscription tier">
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--fb-text)" }}>Free</span>
        </SettingRow>
        <SettingRow label="AI Queries" description="Monthly AI usage allowance">
          <span style={{ fontSize: "0.8rem", color: "var(--fb-text-muted)" }}>Unlimited (Groq free tier)</span>
        </SettingRow>
        <SettingRow label="Storage" description="Workspace data storage" last>
          <span style={{ fontSize: "0.8rem", color: "var(--fb-text-muted)" }}>1 GB</span>
        </SettingRow>

        <div style={{ marginTop: "16px", padding: "14px", borderRadius: "10px", background: "var(--fb-surface2)", border: "1px solid var(--fb-border)" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--fb-text)", marginBottom: "5px" }}>Upgrade to Pro</div>
          <div style={{ fontSize: "0.72rem", color: "var(--fb-text-muted)", marginBottom: "12px" }}>
            Unlock unlimited AI, advanced templates, priority support, and team collaboration features.
          </div>
          <button style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "8px 18px", borderRadius: "8px", border: "none",
            background: "linear-gradient(135deg, #7467F0, #06B6D4)",
            color: "#fff", fontSize: "0.78rem", fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 3px 12px rgba(116,103,240,0.3)",
          }}>
            <Sparkles size={13} strokeWidth={2} /> Upgrade Plan
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user }                        = useUser();
  const [activeTab, setActiveTab]       = useState("profile");
  const [settings,  setSettings]        = useState<UserSettings>(DEFAULT_SETTINGS);
  const [categories, setCategories]     = useState<Category[]>([]);
  const [loading,   setLoading]         = useState(true);
  const [saving,    setSaving]          = useState(false);
  const [saved,     setSaved]           = useState(false);
  const [error,     setError]           = useState<string | null>(null);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [s, cats] = await Promise.all([
          api.get<any>("/settings"),
          api.get<any>("/settings/categories"),
        ]);
        if (!cancelled) {
          if (s && !s.error) setSettings({ ...DEFAULT_SETTINGS, ...s });
          setCategories(Array.isArray(cats) ? cats : []);
        }
      } catch { if (!cancelled) setError("Could not load settings"); }
      finally  { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const saveSettings = useCallback((next: UserSettings) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await api.patch<any>("/settings", next);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch { setError("Failed to save — try again"); }
      finally { setSaving(false); }
    }, 700);
  }, []);

  const handleChange = useCallback((key: keyof UserSettings, val: any) => {
    setSettings(prev => {
      const next = { ...prev, [key]: val };
      saveSettings(next);
      return next;
    });
  }, [saveSettings]);

  const handleCreateCategory = async (data: { type: string; name: string; color: string; icon: string }) => {
    try {
      const cat = await api.post<any>("/settings/categories", data);
      if (!cat.error) setCategories(prev => [...prev, cat]);
    } catch { setError("Failed to create category"); }
  };

  const handleUpdateCategory = async (id: string, data: Partial<Category>) => {
    try {
      const cat = await api.patch<any>(`/settings/categories/${id}`, data);
      if (!cat.error) setCategories(prev => prev.map(c => c.id === id ? { ...c, ...cat } : c));
    } catch { setError("Failed to update category"); }
  };

  const handleDeleteCategory = async (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    try { await api.delete(`/settings/categories/${id}`); }
    catch { setError("Failed to delete category"); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--fb-bg)", overflow: "hidden" }}>

      {/* Top header */}
      <div style={{
        padding: "16px 24px", borderBottom: "1px solid var(--fb-border)",
        background: "var(--fb-surface)", display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: "12px", flexShrink: 0,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "var(--fb-text)" }}>Settings</h1>
          <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: "var(--fb-text-muted)" }}>
            Manage your account, workspace, and AI preferences
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minHeight: "22px" }}>
          {saving && (
            <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.72rem", color: "var(--fb-text-muted)" }}>
              <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Saving…
            </span>
          )}
          {!saving && saved && (
            <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.72rem", color: "#10B981", fontWeight: 600 }}>
              <Check size={13} strokeWidth={2.5} /> Saved
            </span>
          )}
          {error && (
            <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.72rem", color: "#F43F5E" }}>
              <AlertCircle size={13} strokeWidth={2} /> {error}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left sidebar tabs */}
        <div style={{
          width: "196px", flexShrink: 0, borderRight: "1px solid var(--fb-border)",
          background: "var(--fb-surface)", padding: "14px 10px",
          display: "flex", flexDirection: "column", gap: "2px", overflowY: "auto",
        }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                display: "flex", alignItems: "center", gap: "9px",
                padding: "9px 12px", borderRadius: "8px", border: "none",
                background: active ? `${tab.color}14` : "transparent",
                color: active ? tab.color : "var(--fb-text-muted)",
                fontSize: "0.8rem", fontWeight: active ? 700 : 500,
                cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                transition: "all 0.15s", width: "100%",
              }}>
                <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          <div style={{ maxWidth: "620px" }}>
            {loading && activeTab !== "profile" && activeTab !== "subscription" ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--fb-text-muted)", fontSize: "0.82rem", padding: "40px 0" }}>
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Loading settings…
              </div>
            ) : (
              <>
                {activeTab === "profile"      && <ProfileSection user={user} />}
                {activeTab === "subscription" && <SubscriptionSection />}
                {activeTab === "categories"   && (
                  <CategoriesSection
                    categories={categories}
                    loading={loading}
                    onCreate={handleCreateCategory}
                    onUpdate={handleUpdateCategory}
                    onDelete={handleDeleteCategory}
                  />
                )}
                {activeTab === "ai"           && <AISection settings={settings} onChange={handleChange} />}
                {activeTab === "preferences"  && <PreferencesSection settings={settings} onChange={handleChange} />}
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
