import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Bot,
  Send,
  Mic,
  Square,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Calendar,
  StickyNote,
  Kanban,
  LayoutTemplate,
  Trash2,
  Brain,
  Volume2,
  PhoneOff,
  Radio,
  Copy,
  Check,
  Clock,
  ChevronRight,
  ListTodo,
  BarChart3,
  Plus,
  MessageSquare,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  useVoiceAgent,
  type VoiceAgentMessage,
  type VoiceAgentStatus,
} from "@/hooks/useVoiceAgent";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Action {
  tool: string;
  summary: string;
  success: boolean;
  link?: string;
  result?: any;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: Action[];
  timestamp: Date;
}

interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { icon: Calendar, label: "What's on my calendar today?", color: "#06B6D4" },
  { icon: ListTodo, label: "What tasks do I need to do?", color: "#7467F0" },
  { icon: StickyNote, label: "Show me my recent notes", color: "#F59E0B" },
  { icon: Kanban, label: "Create a task for tomorrow", color: "#10B981" },
  { icon: BarChart3, label: "Plan my day with time blocks", color: "#8B5CF6" },
  { icon: Sparkles, label: "Help me focus for 2 hours", color: "#F43F5E" },
];

const PRIORITY_COLOR: Record<string, string> = {
  high: "#F43F5E",
  medium: "#F59E0B",
  low: "#10B981",
};

const TOOL_META: Record<
  string,
  { icon: React.ElementType; label: string; color: string }
> = {
  get_schedule: { icon: Calendar, label: "Calendar", color: "#06B6D4" },
  get_tasks: { icon: ListTodo, label: "Tasks", color: "#7467F0" },
  get_notes: { icon: StickyNote, label: "Notes", color: "#F59E0B" },
  get_daily_schedule: { icon: Clock, label: "Schedule", color: "#8B5CF6" },
  create_kanban_task: { icon: Kanban, label: "Kanban", color: "#7467F0" },
  create_kanban_board: { icon: Kanban, label: "Kanban", color: "#7467F0" },
  create_calendar_event: {
    icon: Calendar,
    label: "Calendar",
    color: "#06B6D4",
  },
  create_note: { icon: StickyNote, label: "Notes", color: "#F59E0B" },
  create_schedule_block: { icon: Clock, label: "Schedule", color: "#8B5CF6" },
  clear_daily_schedule: { icon: Trash2, label: "Schedule", color: "#6B7280" },
  generate_ai_template: {
    icon: LayoutTemplate,
    label: "Templates",
    color: "#F43F5E",
  },
};

function uid() {
  return Math.random().toString(36).slice(2, 14);
}
function fmtTime(h: number, m: number) {
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${m.toString().padStart(2, "0")} ${ampm}`;
}

// ── Conversation date grouping ─────────────────────────────────────────────────

function groupConversations(
  convs: Conversation[],
): { label: string; items: Conversation[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: Record<string, Conversation[]> = {
    Today: [],
    Yesterday: [],
    "Last 7 days": [],
    Older: [],
  };

  for (const c of convs) {
    const d = new Date(c.updatedAt);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day >= today) groups["Today"].push(c);
    else if (day >= yesterday) groups["Yesterday"].push(c);
    else if (day >= weekAgo) groups["Last 7 days"].push(c);
    else groups["Older"].push(c);
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("### ")) {
      nodes.push(
        <div
          key={i}
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#a78bfa",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            marginTop: 10,
            marginBottom: 3,
          }}
        >
          {inlineRender(line.slice(4))}
        </div>,
      );
    } else if (line.startsWith("## ")) {
      nodes.push(
        <div
          key={i}
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--fb-text)",
            marginTop: 12,
            marginBottom: 4,
            fontFamily: "Outfit, sans-serif",
          }}
        >
          {inlineRender(line.slice(3))}
        </div>,
      );
    } else if (line.startsWith("# ")) {
      nodes.push(
        <div
          key={i}
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: "var(--fb-text)",
            marginTop: 12,
            marginBottom: 6,
            fontFamily: "Outfit, sans-serif",
          }}
        >
          {inlineRender(line.slice(2))}
        </div>,
      );
    } else if (line.match(/^[-*] /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <ul
          key={`ul-${i}`}
          style={{ margin: "5px 0", paddingLeft: 0, listStyle: "none" }}
        >
          {items.map((it, j) => (
            <li
              key={j}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: "#7467F0",
                  flexShrink: 0,
                  marginTop: 8,
                }}
              />
              <span style={{ color: "var(--fb-text)" }}>
                {inlineRender(it)}
              </span>
            </li>
          ))}
        </ul>,
      );
      continue;
    } else if (line.match(/^\d+\. /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      nodes.push(
        <ol key={`ol-${i}`} style={{ margin: "5px 0", paddingLeft: 20 }}>
          {items.map((it, j) => (
            <li key={j} style={{ marginBottom: 4, color: "var(--fb-text)" }}>
              {inlineRender(it)}
            </li>
          ))}
        </ol>,
      );
      continue;
    } else if (line.trim() === "") {
      if (nodes.length > 0) nodes.push(<div key={i} style={{ height: 5 }} />);
    } else {
      nodes.push(
        <div key={i} style={{ lineHeight: 1.65, color: "var(--fb-text)" }}>
          {inlineRender(line)}
        </div>,
      );
    }
    i++;
  }
  return nodes;
}

function inlineRender(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return (
        <strong key={i} style={{ fontWeight: 700, color: "var(--fb-text)" }}>
          {part.slice(2, -2)}
        </strong>
      );
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
      return (
        <em key={i} style={{ color: "var(--fb-text-muted)" }}>
          {part.slice(1, -1)}
        </em>
      );
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code
          key={i}
          style={{
            background: "rgba(116,103,240,.2)",
            color: "#a78bfa",
            borderRadius: 4,
            padding: "1px 5px",
            fontSize: "0.88em",
            fontFamily: "monospace",
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    return (
      <span key={i} style={{ color: "var(--fb-text)" }}>
        {part}
      </span>
    );
  });
}

// ── Tool Result Cards ─────────────────────────────────────────────────────────

function ToolResultCard({
  action,
  onNavigate,
}: {
  action: Action;
  onNavigate: (h: string) => void;
}) {
  const meta = TOOL_META[action.tool] ?? {
    icon: Sparkles,
    label: "Action",
    color: "#7467F0",
  };
  const Icon = meta.icon;
  const isCreate = action.tool.startsWith("create_");
  const result = action.result;

  const bgColor = isCreate
    ? action.success
      ? "rgba(16,185,129,.1)"
      : "rgba(244,63,94,.1)"
    : "var(--fb-surface-hover)";
  const borderColor = isCreate
    ? action.success
      ? "rgba(16,185,129,.28)"
      : "rgba(244,63,94,.28)"
    : "var(--fb-border)";
  const dividerColor = isCreate
    ? action.success
      ? "rgba(16,185,129,.18)"
      : "rgba(244,63,94,.18)"
    : "var(--fb-border)";

  return (
    <div
      style={{
        marginTop: 8,
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 12px",
          borderBottom: `1px solid ${dividerColor}`,
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 5,
            background: `${meta.color}22`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {isCreate ? (
            <CheckCircle2
              size={11}
              color={action.success ? "#10B981" : "#F43F5E"}
            />
          ) : (
            <Icon size={11} color={meta.color} />
          )}
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: isCreate
              ? action.success
                ? "#10B981"
                : "#F43F5E"
              : meta.color,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {isCreate
            ? action.success
              ? "Created"
              : "Failed"
            : `Read ${meta.label}`}
        </span>
        {action.link && (
          <button
            onClick={() => onNavigate(action.link!)}
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 3,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 11,
              color: "#7467F0",
              fontWeight: 600,
              padding: "2px 6px",
            }}
          >
            View <ChevronRight size={10} />
          </button>
        )}
      </div>
      <div style={{ padding: "8px 12px" }}>
        {action.tool === "get_tasks" &&
          Array.isArray(result) &&
          result.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {result.slice(0, 6).map((task: any, i: number) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background:
                        PRIORITY_COLOR[task.priority] ?? "var(--fb-text-muted)",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--fb-text)",
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {task.title}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--fb-text-muted)",
                      flexShrink: 0,
                    }}
                  >
                    {task.columnName}
                  </span>
                </div>
              ))}
              {result.length > 6 && (
                <span style={{ fontSize: 11, color: "var(--fb-text-muted)" }}>
                  +{result.length - 6} more
                </span>
              )}
            </div>
          )}
        {action.tool === "get_schedule" &&
          Array.isArray(result) &&
          result.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {result.slice(0, 5).map((ev: any, i: number) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#06B6D4",
                      minWidth: 60,
                    }}
                  >
                    {ev.date}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--fb-text)",
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ev.title}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      background: "rgba(6,182,212,.15)",
                      color: "#06B6D4",
                      borderRadius: 4,
                      padding: "1px 5px",
                    }}
                  >
                    {ev.type}
                  </span>
                </div>
              ))}
              {result.length > 5 && (
                <span style={{ fontSize: 11, color: "var(--fb-text-muted)" }}>
                  +{result.length - 5} more
                </span>
              )}
            </div>
          )}
        {action.tool === "get_notes" &&
          Array.isArray(result) &&
          result.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {result.slice(0, 6).map((note: any, i: number) => (
                <span
                  key={i}
                  style={{
                    fontSize: 11,
                    background: `${note.color}22`,
                    color: note.color,
                    border: `1px solid ${note.color}44`,
                    borderRadius: 20,
                    padding: "2px 8px",
                  }}
                >
                  {note.symbol} {note.title}
                </span>
              ))}
              {result.length > 6 && (
                <span style={{ fontSize: 11, color: "var(--fb-text-muted)" }}>
                  +{result.length - 6} more
                </span>
              )}
            </div>
          )}
        {action.tool === "get_daily_schedule" &&
          result?.blocks &&
          result.blocks.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {result.blocks.slice(0, 6).map((b: any, i: number) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      color: "#8B5CF6",
                      fontWeight: 600,
                      minWidth: 70,
                    }}
                  >
                    {fmtTime(b.startHour, b.startMin)}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--fb-text)" }}>
                    {b.label}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--fb-text-muted)",
                      marginLeft: "auto",
                    }}
                  >
                    {b.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        {(!result ||
          (Array.isArray(result) && result.length === 0) ||
          isCreate ||
          action.tool === "clear_daily_schedule" ||
          action.tool === "generate_ai_template") && (
          <p style={{ fontSize: 12, color: "var(--fb-text-muted)", margin: 0 }}>
            {action.summary}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Typing Indicator ──────────────────────────────────────────────────────────

function TypingIndicator({ activeTool }: { activeTool?: string | null }) {
  const meta = activeTool ? (TOOL_META[activeTool] ?? null) : null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "11px 16px",
      }}
    >
      {meta ? (
        <>
          <Loader2
            size={12}
            color={meta.color}
            style={{ animation: "j-spin 1s linear infinite", flexShrink: 0 }}
          />
          <span style={{ fontSize: 12, color: "var(--fb-text-muted)" }}>
            Reading {meta.label.toLowerCase()}…
          </span>
        </>
      ) : (
        [0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#7467F0",
              opacity: 0.7,
              animation: `j-bounce 1.2s ease-in-out ${i * 0.18}s infinite`,
            }}
          />
        ))
      )}
    </div>
  );
}

// ── Copy Button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="j-copy-btn"
      title="Copy"
      style={{
        width: 24,
        height: 24,
        borderRadius: 6,
        background: "var(--fb-muted)",
        border: "1px solid var(--fb-border)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all .15s",
        opacity: 0,
        position: "absolute",
        top: 8,
        right: 8,
      }}
    >
      {copied ? (
        <Check size={11} color="#10B981" />
      ) : (
        <Copy size={11} color="var(--fb-text-muted)" />
      )}
    </button>
  );
}

// ── Voice Mode Overlay ────────────────────────────────────────────────────────

function VoiceModeOverlay({
  status,
  lastText,
  lastRole,
  masterName,
  onStop,
}: {
  status: VoiceAgentStatus;
  lastText: string;
  lastRole: "user" | "agent";
  masterName: string;
  onStop: () => void;
}) {
  const cfg: Record<
    VoiceAgentStatus,
    { label: string; color: string; pulse: boolean }
  > = {
    idle: { label: "Voice ready", color: "#7467F0", pulse: false },
    connecting: { label: "Connecting…", color: "#F59E0B", pulse: false },
    listening: { label: "Listening…", color: "#10B981", pulse: true },
    thinking: { label: "Thinking…", color: "#7467F0", pulse: false },
    speaking: { label: "Speaking…", color: "#06B6D4", pulse: true },
    stopping: { label: "Ending…", color: "#6B7280", pulse: false },
    error: { label: "Error", color: "#F43F5E", pulse: false },
  };
  const c = cfg[status] ?? cfg.idle;
  const name = masterName.trim() || "sir";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 50,
        background: "rgba(6, 5, 18, 0.98)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.22em",
            color: "rgba(255,255,255,.2)",
            textTransform: "uppercase",
            marginBottom: 5,
          }}
        >
          JARVIS VOICE
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>
          Master {name}
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: 32 }}>
        {c.pulse &&
          [1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-50%)",
                width: 90 + i * 48,
                height: 90 + i * 48,
                borderRadius: "50%",
                border: `1px solid ${c.color}`,
                opacity: 0.12 / i,
                animation: `vc-ring 2s ease-out ${i * 0.35}s infinite`,
              }}
            />
          ))}
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: `radial-gradient(circle at 35% 35%, ${c.color}cc, ${c.color}33)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 40px ${c.color}44`,
            animation: c.pulse
              ? "vc-breathe 1.8s ease-in-out infinite"
              : "none",
          }}
        >
          {status === "listening" && (
            <Mic size={38} color="#fff" strokeWidth={1.6} />
          )}
          {status === "thinking" && (
            <Brain
              size={38}
              color="#fff"
              strokeWidth={1.6}
              style={{ animation: "j-spin 2s linear infinite" }}
            />
          )}
          {status === "speaking" && (
            <Volume2 size={38} color="#fff" strokeWidth={1.6} />
          )}
          {status === "connecting" && (
            <Radio size={38} color="#fff" strokeWidth={1.6} />
          )}
          {(status === "idle" ||
            status === "stopping" ||
            status === "error") && (
            <Mic size={38} color="#fff" strokeWidth={1.6} />
          )}
        </div>
        {(status === "listening" || status === "speaking") && (
          <div
            style={{
              display: "flex",
              gap: 4,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 18,
            }}
          >
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                style={{
                  width: 3,
                  borderRadius: 99,
                  background: c.color,
                  animation: `vc-wave 1s ease-in-out ${i * 0.1}s infinite`,
                  height: `${10 + Math.sin(i * 1.2) * 8 + 6}px`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <p
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#fff",
          margin: 0,
          marginBottom: 8,
          fontFamily: "Outfit, sans-serif",
        }}
      >
        {c.label}
      </p>

      <div
        style={{
          minHeight: 52,
          maxWidth: 480,
          width: "90%",
          textAlign: "center",
          marginBottom: 40,
        }}
      >
        {lastText ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 5,
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.14em",
                color: "rgba(255,255,255,.25)",
                textTransform: "uppercase",
              }}
            >
              {lastRole === "agent" ? "JARVIS" : "You said"}
            </span>
            <p
              style={{
                fontSize: 14,
                color:
                  lastRole === "agent" ? "#06B6D4" : "rgba(255,255,255,.6)",
                margin: 0,
                fontStyle: "italic",
                lineHeight: 1.6,
              }}
            >
              "{lastText}"
            </p>
          </div>
        ) : (
          <p
            style={{ fontSize: 13, color: "rgba(255,255,255,.25)", margin: 0 }}
          >
            {status === "connecting"
              ? "Establishing secure voice link…"
              : status === "listening"
                ? "Speak now — JARVIS is listening"
                : status === "thinking"
                  ? "Processing your request…"
                  : status === "speaking"
                    ? "JARVIS is responding…"
                    : ""}
          </p>
        )}
      </div>

      <button
        onClick={onStop}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "13px 30px",
          borderRadius: 99,
          background: "#F43F5E",
          border: "none",
          cursor: "pointer",
          color: "#fff",
          fontSize: 14,
          fontWeight: 700,
          boxShadow: "0 4px 20px rgba(244,63,94,.45)",
          transition: "all .15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform =
            "scale(1.04)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
      >
        <PhoneOff size={16} /> End Voice Session
      </button>
      <p
        style={{
          fontSize: 10,
          color: "rgba(255,255,255,.15)",
          marginTop: 14,
          letterSpacing: "0.08em",
        }}
      >
        SPEAK NATURALLY — JARVIS RESPONDS AUTOMATICALLY
      </p>

      <style>{`
        @keyframes vc-ring{0%{opacity:.12;transform:translate(-50%,-50%) scale(.9)}70%{opacity:0;transform:translate(-50%,-50%) scale(1.3)}100%{opacity:0}}
        @keyframes vc-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        @keyframes vc-wave{0%,100%{transform:scaleY(.4);opacity:.5}50%{transform:scaleY(1.4);opacity:1}}
      `}</style>
    </div>
  );
}

// ── Conversations Sidebar ─────────────────────────────────────────────────────

function ConvSidebar({
  conversations,
  currentId,
  loading,
  onSelect,
  onNew,
  onDelete,
}: {
  conversations: Conversation[];
  currentId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  };

  const groups = groupConversations(conversations);

  return (
    <div
      style={{
        width: 240,
        flexShrink: 0,
        background: "var(--fb-surface)",
        borderRight: "1px solid var(--fb-border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* New Chat button */}
      <div style={{ padding: "12px 10px 8px", flexShrink: 0 }}>
        <button
          onClick={onNew}
          className="j-new-chat"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 12px",
            borderRadius: 10,
            border: "1px solid var(--fb-border)",
            background: "var(--fb-muted)",
            cursor: "pointer",
            fontSize: 13,
            color: "var(--fb-text)",
            fontWeight: 600,
            transition: "all .15s",
          }}
        >
          <Plus size={15} color="#7467F0" />
          New Chat
        </button>
      </div>

      {/* Conversation list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 6px 12px" }}>
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <Loader2
              size={15}
              style={{
                animation: "j-spin 1s linear infinite",
                color: "var(--fb-text-muted)",
              }}
            />
          </div>
        ) : conversations.length === 0 ? (
          <div style={{ textAlign: "center", padding: "28px 12px" }}>
            <MessageSquare
              size={22}
              color="var(--fb-text-muted)"
              style={{ marginBottom: 8, opacity: 0.4 }}
            />
            <p
              style={{
                fontSize: 12,
                color: "var(--fb-text-muted)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              No chats yet.
              <br />
              Start a new conversation.
            </p>
          </div>
        ) : (
          groups.map(({ label, items }) => (
            <div key={label}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--fb-text-muted)",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  padding: "10px 8px 4px",
                  opacity: 0.6,
                }}
              >
                {label}
              </div>
              {items.map((conv) => {
                const isActive = conv.id === currentId;
                const isHovered = hoverId === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => onSelect(conv.id)}
                    onMouseEnter={() => setHoverId(conv.id)}
                    onMouseLeave={() => setHoverId(null)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 8px",
                      borderRadius: 8,
                      cursor: "pointer",
                      background: isActive
                        ? "rgba(116,103,240,.15)"
                        : isHovered
                          ? "var(--fb-surface-hover)"
                          : "transparent",
                      border: isActive
                        ? "1px solid rgba(116,103,240,.25)"
                        : "1px solid transparent",
                      marginBottom: 1,
                      transition: "all .12s",
                    }}
                  >
                    <MessageSquare
                      size={13}
                      color={isActive ? "#7467F0" : "var(--fb-text-muted)"}
                      style={{ flexShrink: 0, opacity: isActive ? 1 : 0.5 }}
                    />
                    <span
                      style={{
                        flex: 1,
                        fontSize: 12.5,
                        color: isActive
                          ? "var(--fb-text)"
                          : "var(--fb-text-muted)",
                        fontWeight: isActive ? 600 : 400,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {conv.title}
                    </span>
                    {(isHovered || isActive) && (
                      <button
                        onClick={(e) => handleDelete(e, conv.id)}
                        disabled={deletingId === conv.id}
                        className="j-del-conv"
                        title="Delete"
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 5,
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          transition: "all .12s",
                          opacity: deletingId === conv.id ? 0.4 : 1,
                        }}
                      >
                        {deletingId === conv.id ? (
                          <Loader2
                            size={10}
                            style={{
                              animation: "j-spin 1s linear infinite",
                              color: "var(--fb-text-muted)",
                            }}
                          />
                        ) : (
                          <Trash2 size={11} color="#F43F5E" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AIAssistantPage() {
  const [, navigate] = useLocation();

  // Conversation state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [convsLoading, setConvsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<"groq" | "gemini">("groq");

  // Voice & recording state
  const [clearing, setClearing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceAgentStatus>("idle");
  const [lastVoiceText, setLastVoiceText] = useState("");
  const [lastVoiceRole, setLastVoiceRole] = useState<"user" | "agent">("agent");
  const [masterName, setMasterName] = useState("");
  const [voiceAgentVoice, setVoiceAgentVoice] = useState("Brian");

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const currentConvIdRef = useRef<string | null>(null);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    currentConvIdRef.current = currentConvId;
  }, [currentConvId]);

  // Load settings
  useEffect(() => {
    api
      .get<any>("/settings")
      .then((s) => {
        if (s && !s.error) {
          setMasterName(s.masterName ?? "");
          setVoiceAgentVoice(s.voiceAgentVoice ?? "Brian");
        }
      })
      .catch(() => {});
  }, []);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    try {
      const rows = await api.get<Conversation[]>("/ai-assistant/conversations");
      setConversations(rows);
      return rows;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    loadConversations().finally(() => setConvsLoading(false));
  }, [loadConversations]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (convId: string) => {
    setHistoryLoading(true);
    setMessages([]);
    try {
      const rows = await api.get<any[]>(
        `/ai-assistant/history?conversationId=${convId}`,
      );
      setMessages(
        rows.map((r) => ({
          id: r.id,
          role: r.role,
          content: r.content,
          actions: r.actions ?? [],
          timestamp: new Date(r.timestamp),
        })),
      );
    } catch {
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Switch to a conversation
  const selectConversation = useCallback(
    (id: string) => {
      if (id === currentConvIdRef.current) return;
      setCurrentConvId(id);
      loadMessages(id);
    },
    [loadMessages],
  );

  // New chat
  const startNewChat = useCallback(async () => {
    // Don't create a conversation yet — it'll be created on first message
    setCurrentConvId(null);
    setMessages([]);
  }, []);

  // Delete a conversation
  const deleteConversation = useCallback(async (id: string) => {
    try {
      await api.delete(`/ai-assistant/conversations/${id}`);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConvIdRef.current === id) {
        setCurrentConvId(null);
        setMessages([]);
      }
    } catch {}
  }, []);

  // Scroll to bottom
  useEffect(() => {
    if (!historyLoading)
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        60,
      );
  }, [messages, loading, historyLoading]);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "user", content: trimmed, timestamp: new Date() },
      ]);
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      setLoading(true);

      const lc = trimmed.toLowerCase();
      if (lc.includes("task") || lc.includes("todo"))
        setActiveTool("get_tasks");
      else if (
        lc.includes("schedul") ||
        lc.includes("calendar") ||
        lc.includes("today") ||
        lc.includes("event")
      )
        setActiveTool("get_schedule");
      else if (lc.includes("note")) setActiveTool("get_notes");
      else if (lc.includes("plan") || lc.includes("time block"))
        setActiveTool("get_daily_schedule");
      else setActiveTool(null);

      try {
        const history = messagesRef.current.map((m) => ({
          role: m.role,
          content: m.content,
        }));
        const convId = currentConvIdRef.current;
        const data = await api.post<{
          message: string;
          actions: Action[];
          conversationId: string;
        }>("/ai-assistant/chat", {
          userMessage: trimmed,
          history,
          conversationId: convId ?? undefined,
          model: selectedModel,
        });
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content: data.message ?? "Sorry, I couldn't generate a response.",
            actions: data.actions ?? [],
            timestamp: new Date(),
          },
        ]);
        // If this was a brand-new conversation, set its ID and refresh the list
        if (!convId && data.conversationId) {
          setCurrentConvId(data.conversationId);
          loadConversations();
        } else {
          // Refresh to update title/updatedAt
          loadConversations();
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Unknown error";
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content: `JARVIS error: ${detail}`,
            actions: [],
            timestamp: new Date(),
          },
        ]);
      } finally {
        setLoading(false);
        setActiveTool(null);
      }
    },
    [loading, loadConversations, selectedModel],
  );

  const clearCurrentChat = async () => {
    if (!currentConvId) {
      setMessages([]);
      return;
    }
    if (!confirm("Clear this conversation's messages?")) return;
    setClearing(true);
    try {
      await api.delete(`/ai-assistant/history?conversationId=${currentConvId}`);
      setMessages([]);
    } catch {}
    setClearing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // ── Push-to-talk ───────────────────────────────────────────────────────────

  const startRecording = async () => {
    setVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        handleTranscribe();
      };
      mr.start(250);
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch {
      setVoiceError(
        "Microphone access denied. Please allow microphone use in your browser.",
      );
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const handleTranscribe = async () => {
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    if (blob.size < 1000) return;
    setTranscribing(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const data = await api.post<{ text: string }>(
        "/ai-assistant/transcribe",
        { audio: base64 },
      );
      if (data.text) {
        setInput(data.text);
        textareaRef.current?.focus();
        setTimeout(autoResize, 50);
      }
    } catch {
      setVoiceError("Transcription failed. Please try again.");
    } finally {
      setTranscribing(false);
    }
  };

  const fmtSecs = (s: number) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // ── Voice Agent ────────────────────────────────────────────────────────────

  const handleVoiceMessage = useCallback((msg: VoiceAgentMessage) => {
    setLastVoiceText(msg.text);
    setLastVoiceRole(msg.role);
    setMessages((prev) => [
      ...prev,
      {
        id: msg.id,
        role: msg.role === "agent" ? "assistant" : "user",
        content: msg.text,
        actions: [],
        timestamp: msg.timestamp,
      },
    ]);
  }, []);
  const handleVoiceStatusChange = useCallback(
    (s: VoiceAgentStatus) => setVoiceStatus(s),
    [],
  );
  const handleVoiceError = useCallback((msg: string) => {
    setVoiceError(msg);
    setVoiceMode(false);
  }, []);

  const { connect, disconnect } = useVoiceAgent({
    masterName,
    voice: voiceAgentVoice,
    onMessage: handleVoiceMessage,
    onStatusChange: handleVoiceStatusChange,
    onError: handleVoiceError,
  });

  const handleStartVoiceMode = useCallback(() => {
    setVoiceError(null);
    setLastVoiceText("");
    setVoiceMode(true);
    connect();
  }, [connect]);
  const handleStopVoiceMode = useCallback(() => {
    disconnect();
    setVoiceMode(false);
    setLastVoiceText("");
  }, [disconnect]);

  const isEmpty = messages.length === 0 && !historyLoading;

  return (
    <>
      <style>{`
        @keyframes j-bounce{0%,80%,100%{transform:translateY(0);opacity:.5}40%{transform:translateY(-5px);opacity:1}}
        @keyframes j-fadein{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        @keyframes j-spin{to{transform:rotate(360deg)}}
        @keyframes j-pulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.25)}50%{box-shadow:0 0 0 5px rgba(239,68,68,0)}}
        @keyframes j-glow{0%,100%{box-shadow:0 2px 8px rgba(16,185,129,.2)}50%{box-shadow:0 2px 18px rgba(16,185,129,.45),0 0 0 4px rgba(16,185,129,.08)}}
        .j-msg{animation:j-fadein .2s ease}
        .j-suggest:hover{border-color:var(--fb-border-strong)!important;background:var(--fb-surface-hover)!important;transform:translateY(-1px)}
        .j-send:hover:not(:disabled){background:#5b50d6!important}
        .j-send:disabled{opacity:.35;cursor:not-allowed}
        .j-clear:hover{background:rgba(244,63,94,.1)!important;color:#f87171!important;border-color:rgba(244,63,94,.3)!important}
        .j-voice-hdr:hover{transform:translateY(-1px);box-shadow:0 6px 22px rgba(16,185,129,.4)!important}
        .j-wrap:hover .j-copy-btn{opacity:1!important}
        .j-copy-btn:hover{background:var(--fb-surface-hover)!important;border-color:var(--fb-border-strong)!important}
        .j-input-box:focus-within{border-color:rgba(116,103,240,.6)!important;box-shadow:0 0 0 3px rgba(116,103,240,.1)!important}
        .j-ptm:hover:not(:disabled){background:var(--fb-surface-hover)!important}
        .j-new-chat:hover{background:var(--fb-surface-hover)!important;border-color:var(--fb-border-strong)!important}
        .j-del-conv:hover{background:rgba(244,63,94,.12)!important}
        .j-toggle-sidebar:hover{background:var(--fb-surface-hover)!important}
      `}</style>

      <div
        style={{
          display: "flex",
          height: "100%",
          minHeight: 0,
          background: "var(--fb-bg)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* ── Conversations Sidebar ── */}
        {sidebarOpen && (
          <ConvSidebar
            conversations={conversations}
            currentId={currentConvId}
            loading={convsLoading}
            onSelect={selectConversation}
            onNew={startNewChat}
            onDelete={deleteConversation}
          />
        )}

        {/* ── Main chat area ── */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Voice overlay */}
          {voiceMode && (
            <VoiceModeOverlay
              status={voiceStatus}
              lastText={lastVoiceText}
              lastRole={lastVoiceRole}
              masterName={masterName}
              onStop={handleStopVoiceMode}
            />
          )}

          {/* ── Header ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 16px",
              background: "var(--fb-surface)",
              borderBottom: "1px solid var(--fb-border)",
              flexShrink: 0,
            }}
          >
            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="j-toggle-sidebar"
              title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background .15s",
              }}
            >
              {sidebarOpen ? (
                <PanelLeftClose size={16} color="var(--fb-text-muted)" />
              ) : (
                <PanelLeftOpen size={16} color="var(--fb-text-muted)" />
              )}
            </button>

            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, #7467F0, #06B6D4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(116,103,240,.35)",
                flexShrink: 0,
              }}
            >
              <Bot size={18} color="#fff" strokeWidth={1.8} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "var(--fb-text)",
                  fontFamily: "Outfit, sans-serif",
                  letterSpacing: "-0.01em",
                }}
              >
                JARVIS
              </div>
              <div style={{ fontSize: 11, color: "var(--fb-text-muted)" }}>
                {masterName ? `Master ${masterName}` : "Personal AI"} ·{" "}
                {selectedModel === "gemini" ? "Gemini Flash" : "Groq AI"}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 6px rgba(16,185,129,.5)",
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  color: "var(--fb-text-muted)",
                  fontWeight: 500,
                }}
              >
                Online
              </span>
            </div>

            {/* ── Model picker ── */}
            <div
              style={{
                display: "flex",
                background: "var(--fb-muted)",
                border: "1px solid var(--fb-border)",
                borderRadius: 20,
                padding: 3,
                gap: 2,
              }}
            >
              {(["groq", "gemini"] as const).map((m) => {
                const active = selectedModel === m;
                const label = m === "groq" ? "⚡ Groq" : "✦ Gemini";
                const activeColor = m === "groq" ? "#7467F0" : "#4285F4";
                return (
                  <button
                    key={m}
                    onClick={() => setSelectedModel(m)}
                    style={{
                      padding: "3px 11px",
                      borderRadius: 16,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 700,
                      transition: "all .15s",
                      background: active ? activeColor : "transparent",
                      color: active ? "#fff" : "var(--fb-text-muted)",
                      boxShadow: active ? `0 1px 6px ${activeColor}55` : "none",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {messages.length > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  background: "rgba(116,103,240,.15)",
                  border: "1px solid rgba(116,103,240,.3)",
                  borderRadius: 20,
                  padding: "3px 10px",
                }}
              >
                <Brain size={11} color="#7467F0" />
                <span
                  style={{ fontSize: 11, color: "#a78bfa", fontWeight: 600 }}
                >
                  {messages.length} msgs
                </span>
              </div>
            )}

            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <button
                onClick={handleStartVoiceMode}
                className="j-voice-hdr"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: "none",
                  background: "linear-gradient(135deg, #10B981, #059669)",
                  cursor: "pointer",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  boxShadow: "0 2px 10px rgba(16,185,129,.3)",
                  transition: "all .15s",
                  animation: "j-glow 2.5s ease-in-out infinite",
                }}
              >
                <Mic size={13} /> Voice
              </button>
              {messages.length > 0 && (
                <button
                  className="j-clear"
                  onClick={clearCurrentChat}
                  disabled={clearing}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 12px",
                    borderRadius: 8,
                    background: "var(--fb-muted)",
                    border: "1px solid var(--fb-border)",
                    cursor: "pointer",
                    fontSize: 12,
                    color: "var(--fb-text-muted)",
                    fontWeight: 500,
                    transition: "all .15s",
                  }}
                >
                  <Trash2 size={13} /> Clear
                </button>
              )}
            </div>
          </div>

          {/* ── Messages ── */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: isEmpty ? 0 : "20px 20px 4px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {historyLoading ? (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  color: "var(--fb-text-muted)",
                }}
              >
                <Loader2
                  size={18}
                  style={{ animation: "j-spin 1s linear infinite" }}
                />
                <span style={{ fontSize: 14 }}>Loading conversation…</span>
              </div>
            ) : isEmpty ? (
              /* ── Empty State ── */
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "32px 24px",
                  maxWidth: 600,
                  margin: "0 auto",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 22,
                    background:
                      "linear-gradient(135deg, #7467F0 0%, #06B6D4 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 22,
                    boxShadow: "0 12px 40px rgba(116,103,240,.4)",
                  }}
                >
                  <Bot size={38} color="#fff" strokeWidth={1.5} />
                </div>
                <h2
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: "var(--fb-text)",
                    margin: 0,
                    marginBottom: 10,
                    letterSpacing: "-0.02em",
                    textAlign: "center",
                    fontFamily: "Outfit, sans-serif",
                  }}
                >
                  {masterName ? `Ready, Master ${masterName}.` : "Meet JARVIS"}
                </h2>
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--fb-text-muted)",
                    margin: 0,
                    marginBottom: 28,
                    textAlign: "center",
                    maxWidth: 360,
                    lineHeight: 1.65,
                  }}
                >
                  Your personal AI system. I read your tasks, schedule, and
                  notes — and create new ones. Chat or go hands-free with Voice
                  Mode.
                </p>

                <button
                  onClick={handleStartVoiceMode}
                  className="j-voice-hdr"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "13px 28px",
                    borderRadius: 99,
                    border: "none",
                    background: "linear-gradient(135deg, #10B981, #059669)",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    marginBottom: 28,
                    boxShadow: "0 6px 24px rgba(16,185,129,.4)",
                    transition: "all .2s",
                    animation: "j-glow 2.5s ease-in-out infinite",
                  }}
                >
                  <Mic size={17} /> Start Voice Conversation
                </button>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    maxWidth: 480,
                    marginBottom: 18,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      background: "var(--fb-border)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--fb-text-muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    or try a prompt
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      background: "var(--fb-border)",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(196px, 1fr))",
                    gap: 8,
                    width: "100%",
                    maxWidth: 510,
                  }}
                >
                  {SUGGESTIONS.map((s) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.label}
                        className="j-suggest"
                        onClick={() => sendMessage(s.label)}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          background: "var(--fb-surface)",
                          border: "1px solid var(--fb-border)",
                          borderRadius: 12,
                          padding: "11px 13px",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all .15s",
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: `${s.color}20`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={14} color={s.color} strokeWidth={2} />
                        </div>
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--fb-text)",
                            fontWeight: 500,
                            lineHeight: 1.45,
                          }}
                        >
                          {s.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 7,
                    marginTop: 24,
                    justifyContent: "center",
                  }}
                >
                  {[
                    "Reads tasks & calendar",
                    "Creates notes & events",
                    "Builds schedules",
                    "Voice chat",
                    "Accountability coach",
                  ].map((cap) => (
                    <span
                      key={cap}
                      style={{
                        fontSize: 11,
                        color: "#a78bfa",
                        background: "rgba(116,103,240,.12)",
                        border: "1px solid rgba(116,103,240,.22)",
                        borderRadius: 20,
                        padding: "3px 10px",
                      }}
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              /* ── Chat messages ── */
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  maxWidth: 800,
                  width: "100%",
                  margin: "0 auto",
                }}
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="j-msg"
                    style={{
                      display: "flex",
                      flexDirection:
                        msg.role === "user" ? "row-reverse" : "row",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    {msg.role === "assistant" && (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 9,
                          flexShrink: 0,
                          background:
                            "linear-gradient(135deg, #7467F0, #06B6D4)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 2px 8px rgba(116,103,240,.3)",
                          marginTop: 2,
                        }}
                      >
                        <Bot size={15} color="#fff" strokeWidth={2} />
                      </div>
                    )}
                    <div
                      style={{
                        maxWidth: "78%",
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        alignItems:
                          msg.role === "user" ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        className={msg.role === "assistant" ? "j-wrap" : ""}
                        style={{ position: "relative" }}
                      >
                        <div
                          style={{
                            background:
                              msg.role === "user"
                                ? "linear-gradient(135deg, #7467F0, #5b50d6)"
                                : "var(--fb-surface)",
                            color: "var(--fb-text)",
                            borderRadius:
                              msg.role === "user"
                                ? "18px 18px 4px 18px"
                                : "4px 18px 18px 18px",
                            padding:
                              msg.role === "user" ? "11px 15px" : "12px 17px",
                            fontSize: 14,
                            lineHeight: 1.65,
                            border:
                              msg.role === "assistant"
                                ? "1px solid var(--fb-border)"
                                : "none",
                            boxShadow:
                              msg.role === "assistant"
                                ? "0 2px 10px rgba(0,0,0,.15)"
                                : "0 4px 14px rgba(116,103,240,.3)",
                            whiteSpace:
                              msg.role === "user" ? "pre-wrap" : undefined,
                            wordBreak: "break-word",
                          }}
                        >
                          {msg.role === "user"
                            ? msg.content
                            : renderMarkdown(msg.content)}
                        </div>
                        {msg.role === "assistant" && (
                          <CopyButton text={msg.content} />
                        )}
                      </div>
                      {msg.role === "assistant" &&
                        msg.actions &&
                        msg.actions.length > 0 && (
                          <div style={{ width: "100%" }}>
                            {msg.actions.map((a, i) => (
                              <ToolResultCard
                                key={i}
                                action={a}
                                onNavigate={navigate}
                              />
                            ))}
                          </div>
                        )}
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--fb-text-muted)",
                          marginTop: 2,
                          opacity: 0.7,
                        }}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div
                    className="j-msg"
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 9,
                        background: "linear-gradient(135deg, #7467F0, #06B6D4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: "0 2px 8px rgba(116,103,240,.3)",
                      }}
                    >
                      <Bot size={15} color="#fff" strokeWidth={2} />
                    </div>
                    <div
                      style={{
                        background: "var(--fb-surface)",
                        border: "1px solid var(--fb-border)",
                        borderRadius: "4px 18px 18px 18px",
                        boxShadow: "0 2px 10px rgba(0,0,0,.15)",
                        minWidth: 80,
                      }}
                    >
                      <TypingIndicator activeTool={activeTool} />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} style={{ height: 4 }} />
              </div>
            )}
          </div>

          {/* ── Error banner ── */}
          {voiceError && (
            <div
              style={{
                margin: "0 16px 6px",
                padding: "10px 14px",
                background: "rgba(244,63,94,.1)",
                border: "1px solid rgba(244,63,94,.28)",
                borderRadius: 10,
                fontSize: 13,
                color: "#f87171",
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexShrink: 0,
              }}
            >
              <AlertCircle size={13} />
              <span style={{ flex: 1 }}>{voiceError}</span>
              <button
                onClick={() => setVoiceError(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#f87171",
                  fontSize: 18,
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* ── Input ── */}
          <div
            style={{
              padding: "10px 16px 14px",
              background: "var(--fb-surface)",
              borderTop: "1px solid var(--fb-border)",
              flexShrink: 0,
            }}
          >
            {(recording || transcribing) && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                  padding: "8px 12px",
                  background: recording
                    ? "rgba(244,63,94,.1)"
                    : "rgba(6,182,212,.1)",
                  border: `1px solid ${recording ? "rgba(244,63,94,.28)" : "rgba(6,182,212,.28)"}`,
                  borderRadius: 8,
                }}
              >
                {transcribing ? (
                  <>
                    <Loader2
                      size={12}
                      color="#06B6D4"
                      style={{ animation: "j-spin 1s linear infinite" }}
                    />
                    <span style={{ fontSize: 12, color: "#06B6D4" }}>
                      Transcribing…
                    </span>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#F43F5E",
                        animation: "j-pulse 1.5s ease-in-out infinite",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        color: "#f87171",
                        fontWeight: 600,
                      }}
                    >
                      Recording {fmtSecs(recSeconds)}
                    </span>
                    <span
                      style={{ fontSize: 11, color: "var(--fb-text-muted)" }}
                    >
                      {" "}
                      — tap stop when done
                    </span>
                  </>
                )}
              </div>
            )}

            <div
              className="j-input-box"
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-end",
                background: "var(--fb-muted)",
                border: "1.5px solid var(--fb-border)",
                borderRadius: 16,
                padding: "7px 9px",
                transition: "all .15s",
              }}
            >
              <button
                className="j-ptm"
                onClick={recording ? stopRecording : startRecording}
                disabled={transcribing}
                title={recording ? "Stop recording" : "Voice to text"}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  border: "none",
                  background: recording
                    ? "rgba(244,63,94,.15)"
                    : "var(--fb-surface)",
                  cursor: transcribing ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background .15s",
                  animation: recording
                    ? "j-pulse 1.5s ease-in-out infinite"
                    : "none",
                }}
              >
                {transcribing ? (
                  <Loader2
                    size={15}
                    color="#06B6D4"
                    style={{ animation: "j-spin 1s linear infinite" }}
                  />
                ) : recording ? (
                  <Square size={15} color="#F43F5E" fill="#F43F5E" />
                ) : (
                  <Mic size={15} color="#7467F0" />
                )}
              </button>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  autoResize();
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  recording
                    ? "Recording…"
                    : masterName
                      ? `Message JARVIS, Master ${masterName}…`
                      : "Ask JARVIS about tasks, schedule, notes…"
                }
                rows={1}
                disabled={loading || recording || transcribing}
                style={{
                  flex: 1,
                  resize: "none",
                  border: "none",
                  background: "transparent",
                  fontSize: 14,
                  color: "var(--fb-text)",
                  outline: "none",
                  lineHeight: 1.6,
                  maxHeight: 140,
                  overflowY: "auto",
                  padding: "5px 0",
                  fontFamily: "inherit",
                }}
              />

              <button
                className="j-send"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading || recording || transcribing}
                title="Send (Enter)"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  border: "none",
                  background: "#7467F0",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background .15s",
                }}
              >
                {loading ? (
                  <Loader2
                    size={14}
                    color="#fff"
                    style={{ animation: "j-spin 1s linear infinite" }}
                  />
                ) : (
                  <Send size={14} color="#fff" />
                )}
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
                marginTop: 7,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "var(--fb-text-muted)",
                  opacity: 0.6,
                }}
              >
                Enter to send · Shift+Enter for new line
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--fb-text-muted)",
                  opacity: 0.4,
                }}
              >
                ·
              </span>
              <span style={{ fontSize: 11, color: "#10B981", fontWeight: 600 }}>
                Voice
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--fb-text-muted)",
                  opacity: 0.6,
                }}
              >
                = real-time AI speech
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
