import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Bot, Send, Mic, Square, Loader2, CheckCircle2, AlertCircle,
  ArrowRight, Sparkles, Calendar, StickyNote, Kanban, LayoutTemplate,
  Trash2, Brain, Volume2, PhoneOff, Radio, Copy, Check, Zap,
  Clock, Tag, Star, ChevronRight, ListTodo, BarChart3, MicOff,
} from "lucide-react";
import { api } from "@/lib/api";
import { useVoiceAgent, type VoiceAgentMessage, type VoiceAgentStatus } from "@/hooks/useVoiceAgent";

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

// ── Constants ─────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { icon: Calendar,     label: "What's on my calendar today?",  color: "#06B6D4" },
  { icon: ListTodo,     label: "What tasks do I need to do?",   color: "#7467F0" },
  { icon: StickyNote,   label: "Show me my recent notes",        color: "#F59E0B" },
  { icon: Kanban,       label: "Create a task for tomorrow",     color: "#10B981" },
  { icon: BarChart3,    label: "Plan my day with time blocks",   color: "#8B5CF6" },
  { icon: Sparkles,     label: "Help me focus for 2 hours",      color: "#F43F5E" },
];

const PRIORITY_COLOR: Record<string, string> = {
  high: "#F43F5E", medium: "#F59E0B", low: "#10B981",
};

const TOOL_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  get_schedule:       { icon: Calendar,      label: "Calendar",      color: "#06B6D4" },
  get_tasks:          { icon: ListTodo,      label: "Tasks",         color: "#7467F0" },
  get_notes:          { icon: StickyNote,    label: "Notes",         color: "#F59E0B" },
  get_daily_schedule: { icon: Clock,         label: "Schedule",      color: "#8B5CF6" },
  create_kanban_task: { icon: Kanban,        label: "Kanban",        color: "#7467F0" },
  create_kanban_board:{ icon: Kanban,        label: "Kanban",        color: "#7467F0" },
  create_calendar_event:{ icon: Calendar,    label: "Calendar",      color: "#06B6D4" },
  create_note:        { icon: StickyNote,    label: "Notes",         color: "#F59E0B" },
  create_schedule_block:{ icon: Clock,       label: "Schedule",      color: "#8B5CF6" },
  clear_daily_schedule: { icon: Trash2,      label: "Schedule",      color: "#6B7280" },
  generate_ai_template: { icon: LayoutTemplate, label: "Templates",  color: "#F43F5E" },
};

function uid() { return Math.random().toString(36).slice(2, 14); }
function fmt(h: number, m: number) {
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${m.toString().padStart(2, "0")} ${ampm}`;
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("### ")) {
      nodes.push(<div key={i} style={{ fontSize: 13, fontWeight: 700, color: "#7467F0", marginTop: 10, marginBottom: 4 }}>{inlineRender(line.slice(4))}</div>);
    } else if (line.startsWith("## ")) {
      nodes.push(<div key={i} style={{ fontSize: 14, fontWeight: 700, color: "#1a1f36", marginTop: 12, marginBottom: 4 }}>{inlineRender(line.slice(3))}</div>);
    } else if (line.startsWith("# ")) {
      nodes.push(<div key={i} style={{ fontSize: 15, fontWeight: 800, color: "#1a1f36", marginTop: 12, marginBottom: 6 }}>{inlineRender(line.slice(2))}</div>);
    } else if (line.match(/^[-*] /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} style={{ margin: "6px 0", paddingLeft: 18, listStyle: "none" }}>
          {items.map((it, j) => (
            <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 3 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#7467F0", flexShrink: 0, marginTop: 7 }} />
              <span>{inlineRender(it)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    } else if (line.match(/^\d+\. /)) {
      const items: string[] = [];
      let startNum = parseInt(line);
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      nodes.push(
        <ol key={`ol-${i}`} style={{ margin: "6px 0", paddingLeft: 20 }}>
          {items.map((it, j) => (
            <li key={j} style={{ marginBottom: 3, color: "#374151" }}>{inlineRender(it)}</li>
          ))}
        </ol>
      );
      continue;
    } else if (line.trim() === "") {
      if (nodes.length > 0) nodes.push(<div key={i} style={{ height: 6 }} />);
    } else {
      nodes.push(<div key={i} style={{ lineHeight: 1.65 }}>{inlineRender(line)}</div>);
    }
    i++;
  }
  return nodes;
}

function inlineRender(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
      return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} style={{ background: "#f0f0f8", color: "#7467F0", borderRadius: 4, padding: "1px 5px", fontSize: "0.9em", fontFamily: "monospace" }}>{part.slice(1, -1)}</code>;
    return part;
  });
}

// ── Tool Result Cards ─────────────────────────────────────────────────────────

function ToolResultCard({ action, onNavigate }: { action: Action; onNavigate: (h: string) => void }) {
  const meta = TOOL_META[action.tool] ?? { icon: Sparkles, label: "Action", color: "#7467F0" };
  const Icon = meta.icon;
  const isCreate = action.tool.startsWith("create_");
  const isRead = action.tool.startsWith("get_");
  const result = action.result;

  return (
    <div style={{
      marginTop: 8,
      background: isCreate ? (action.success ? "#f0fdf4" : "#fff1f2") : "#f8f9ff",
      border: `1px solid ${isCreate ? (action.success ? "#bbf7d0" : "#fecdd3") : "#e0e4ff"}`,
      borderRadius: 12,
      overflow: "hidden",
    }}>
      {/* Card header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: `1px solid ${isCreate ? (action.success ? "#dcfce7" : "#fde8e8") : "#e8e9f5"}` }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: meta.color + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {isCreate
            ? <CheckCircle2 size={12} color={action.success ? "#10B981" : "#F43F5E"} />
            : <Icon size={12} color={meta.color} />}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: isCreate ? (action.success ? "#15803d" : "#b91c1c") : meta.color, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {isCreate ? (action.success ? "Created" : "Failed") : `Read ${meta.label}`}
        </span>
        {action.link && (
          <button onClick={() => onNavigate(action.link!)} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#7467F0", fontWeight: 600, padding: "2px 6px" }}>
            View <ChevronRight size={11} />
          </button>
        )}
      </div>

      {/* Card body — rich data rendering */}
      <div style={{ padding: "8px 12px" }}>
        {/* Tasks list */}
        {action.tool === "get_tasks" && Array.isArray(result) && result.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {result.slice(0, 6).map((task: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: PRIORITY_COLOR[task.priority] ?? "#9ca3af", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "#374151", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</span>
                <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>{task.columnName}</span>
              </div>
            ))}
            {result.length > 6 && <span style={{ fontSize: 11, color: "#9ca3af" }}>+{result.length - 6} more</span>}
          </div>
        )}

        {/* Calendar events */}
        {action.tool === "get_schedule" && Array.isArray(result) && result.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {result.slice(0, 5).map((ev: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#7467F0", minWidth: 60 }}>{ev.date}</span>
                <span style={{ fontSize: 12, color: "#374151", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</span>
                <span style={{ fontSize: 10, background: "#e0e4ff", color: "#7467F0", borderRadius: 4, padding: "1px 5px" }}>{ev.type}</span>
              </div>
            ))}
            {result.length > 5 && <span style={{ fontSize: 11, color: "#9ca3af" }}>+{result.length - 5} more</span>}
          </div>
        )}

        {/* Notes list */}
        {action.tool === "get_notes" && Array.isArray(result) && result.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {result.slice(0, 6).map((note: any, i: number) => (
              <span key={i} style={{ fontSize: 11, background: note.color + "22", color: note.color, border: `1px solid ${note.color}44`, borderRadius: 20, padding: "2px 8px" }}>
                {note.symbol} {note.title}
              </span>
            ))}
            {result.length > 6 && <span style={{ fontSize: 11, color: "#9ca3af" }}>+{result.length - 6} more</span>}
          </div>
        )}

        {/* Daily schedule blocks */}
        {action.tool === "get_daily_schedule" && result?.blocks && result.blocks.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {result.blocks.slice(0, 6).map((b: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, color: "#7467F0", fontWeight: 600, minWidth: 70 }}>{fmt(b.startHour, b.startMin)}</span>
                <span style={{ fontSize: 12, color: "#374151" }}>{b.label}</span>
                <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: "auto" }}>{b.type}</span>
              </div>
            ))}
          </div>
        )}

        {/* Fallback: summary text */}
        {((!result || (Array.isArray(result) && result.length === 0)) || (action.tool.startsWith("create_") || action.tool === "clear_daily_schedule" || action.tool === "generate_ai_template")) && (
          <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{action.summary}</p>
        )}
      </div>
    </div>
  );
}

// ── Typing Indicator ──────────────────────────────────────────────────────────

function TypingIndicator({ activeTool }: { activeTool?: string | null }) {
  const meta = activeTool ? (TOOL_META[activeTool] ?? null) : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px" }}>
      {meta ? (
        <>
          <Loader2 size={13} color={meta.color} style={{ animation: "jarvis-spin 1s linear infinite", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#9ca3af" }}>
            Reading {meta.label.toLowerCase()}…
          </span>
        </>
      ) : (
        [0, 1, 2].map((i) => (
          <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#7467F0", opacity: 0.6, animation: `jarvis-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
        ))
      )}
    </div>
  );
}

// ── Message Copy Button ───────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="jarvis-copy-btn" title="Copy"
      style={{ width: 26, height: 26, borderRadius: 6, background: "none", border: "1px solid #e8e9f0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", opacity: 0, position: "absolute", top: 8, right: 8 }}>
      {copied ? <Check size={12} color="#10B981" /> : <Copy size={12} color="#9ca3af" />}
    </button>
  );
}

// ── Voice Mode Overlay ────────────────────────────────────────────────────────

function VoiceModeOverlay({ status, lastText, lastRole, masterName, onStop }: {
  status: VoiceAgentStatus; lastText: string; lastRole: "user" | "agent"; masterName: string; onStop: () => void;
}) {
  const statusConfig: Record<VoiceAgentStatus, { label: string; color: string; pulse: boolean }> = {
    idle:       { label: "Voice ready",   color: "#7467F0", pulse: false },
    connecting: { label: "Connecting…",   color: "#F59E0B", pulse: false },
    listening:  { label: "Listening…",    color: "#10B981", pulse: true  },
    thinking:   { label: "Thinking…",     color: "#7467F0", pulse: false },
    speaking:   { label: "Speaking…",     color: "#06B6D4", pulse: true  },
    stopping:   { label: "Ending…",       color: "#6B7280", pulse: false },
    error:      { label: "Error",         color: "#F43F5E", pulse: false },
  };
  const cfg = statusConfig[status] ?? statusConfig.idle;
  const name = masterName.trim() || "sir";

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(8, 6, 22, 0.97)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0 }}>
      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", color: "#3a3a5c", textTransform: "uppercase", marginBottom: 4 }}>JARVIS VOICE</div>
        <div style={{ fontSize: 12, color: "#4a5568" }}>Master {name}</div>
      </div>

      <div style={{ position: "relative", marginBottom: 32 }}>
        {cfg.pulse && [1, 2, 3].map((i) => (
          <div key={i} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 80 + i * 50, height: 80 + i * 50, borderRadius: "50%", border: `1.5px solid ${cfg.color}`, opacity: 0.15 / i, animation: `vc-ring 2s ease-out ${i * 0.35}s infinite` }} />
        ))}
        <div style={{ width: 100, height: 100, borderRadius: "50%", background: `radial-gradient(circle at 35% 35%, ${cfg.color}cc, ${cfg.color}44)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 40px ${cfg.color}44, 0 0 80px ${cfg.color}18`, animation: cfg.pulse ? "vc-breathe 1.8s ease-in-out infinite" : "none" }}>
          {status === "listening" && <Mic size={38} color="#fff" strokeWidth={1.6} />}
          {status === "thinking" && <Brain size={38} color="#fff" strokeWidth={1.6} style={{ animation: "jarvis-spin 2s linear infinite" }} />}
          {status === "speaking" && <Volume2 size={38} color="#fff" strokeWidth={1.6} />}
          {status === "connecting" && <Radio size={38} color="#fff" strokeWidth={1.6} />}
          {(status === "idle" || status === "stopping" || status === "error") && <Mic size={38} color="#fff" strokeWidth={1.6} />}
        </div>
        {(status === "listening" || status === "speaking") && (
          <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "center", marginTop: 18 }}>
            {[0,1,2,3,4,5,6].map((i) => (
              <div key={i} style={{ width: 3, borderRadius: 99, background: cfg.color, animation: `vc-wave 1s ease-in-out ${i * 0.1}s infinite`, height: `${10 + Math.sin(i * 1.2) * 8 + 6}px` }} />
            ))}
          </div>
        )}
      </div>

      <p style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0, marginBottom: 8 }}>{cfg.label}</p>

      <div style={{ minHeight: 56, maxWidth: 480, width: "90%", textAlign: "center", marginBottom: 36 }}>
        {lastText ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: "#3a3a5c", textTransform: "uppercase" }}>
              {lastRole === "agent" ? "JARVIS" : "You said"}
            </span>
            <p style={{ fontSize: 14, color: lastRole === "agent" ? "#06B6D4" : "#a0aec0", margin: 0, fontStyle: "italic", lineHeight: 1.6 }}>"{lastText}"</p>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "#3a3a5c", margin: 0 }}>
            {status === "connecting" ? "Establishing secure voice link…"
              : status === "listening" ? "Speak now — JARVIS is listening"
              : status === "thinking" ? "Processing your request…"
              : status === "speaking" ? "JARVIS is responding…"
              : ""}
          </p>
        )}
      </div>

      <button onClick={onStop}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 32px", borderRadius: 99, background: "#F43F5E", border: "none", cursor: "pointer", color: "#fff", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 20px rgba(244,63,94,0.4)", transition: "all 0.15s" }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.04)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
      >
        <PhoneOff size={16} />
        End Voice Session
      </button>
      <p style={{ fontSize: 10, color: "#2d2d4a", marginTop: 14, letterSpacing: "0.06em" }}>SPEAK NATURALLY — JARVIS RESPONDS AUTOMATICALLY</p>

      <style>{`
        @keyframes vc-ring{0%{opacity:.15;transform:translate(-50%,-50%) scale(.9)}70%{opacity:0;transform:translate(-50%,-50%) scale(1.3)}100%{opacity:0}}
        @keyframes vc-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        @keyframes vc-wave{0%,100%{transform:scaleY(.4);opacity:.5}50%{transform:scaleY(1.4);opacity:1}}
      `}</style>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AIAssistantPage() {
  const [, navigate] = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
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

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    api.get<any>("/settings").then((s) => {
      if (s && !s.error) { setMasterName(s.masterName ?? ""); setVoiceAgentVoice(s.voiceAgentVoice ?? "Brian"); }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    api.get<any[]>("/ai-assistant/history")
      .then((rows) => setMessages(rows.map((r) => ({ id: r.id, role: r.role, content: r.content, actions: r.actions ?? [], timestamp: new Date(r.timestamp) }))))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    if (!historyLoading) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }, [messages, loading, historyLoading]);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: Message = { id: uid(), role: "user", content: trimmed, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);
    setActiveTool(null);

    // Predict which tool might be called based on message keywords
    const lc = trimmed.toLowerCase();
    if (lc.includes("task") || lc.includes("todo") || lc.includes("do")) setActiveTool("get_tasks");
    else if (lc.includes("schedul") || lc.includes("calendar") || lc.includes("event") || lc.includes("today")) setActiveTool("get_schedule");
    else if (lc.includes("note")) setActiveTool("get_notes");
    else if (lc.includes("plan") || lc.includes("time block")) setActiveTool("get_daily_schedule");

    try {
      const history = messagesRef.current.map((m) => ({ role: m.role, content: m.content }));
      const data = await api.post<{ message: string; actions: Action[] }>("/ai-assistant/chat", { userMessage: trimmed, history });
      setMessages((prev) => [...prev, {
        id: uid(), role: "assistant",
        content: data.message ?? "Sorry, I couldn't generate a response.",
        actions: data.actions ?? [], timestamp: new Date(),
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: uid(), role: "assistant",
        content: "Something went wrong connecting to JARVIS. Please try again.",
        actions: [], timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      setActiveTool(null);
    }
  }, [loading]);

  const clearHistory = async () => {
    if (!confirm("Clear your entire conversation history?")) return;
    setClearing(true);
    try { await api.delete("/ai-assistant/history"); setMessages([]); } catch {}
    setClearing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  // ── Push-to-talk ───────────────────────────────────────────────────────────

  const startRecording = async () => {
    setVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); handleTranscribe(); };
      mr.start(250);
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch {
      setVoiceError("Microphone access denied. Please allow microphone use in your browser.");
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
      const data = await api.post<{ text: string }>("/ai-assistant/transcribe", { audio: base64 });
      if (data.text) { setInput(data.text); textareaRef.current?.focus(); setTimeout(autoResize, 50); }
    } catch { setVoiceError("Transcription failed. Please try again."); }
    finally { setTranscribing(false); }
  };

  const fmtSecs = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // ── Voice Agent ────────────────────────────────────────────────────────────

  const handleVoiceMessage = useCallback((msg: VoiceAgentMessage) => {
    setLastVoiceText(msg.text);
    setLastVoiceRole(msg.role);
    setMessages(prev => [...prev, { id: msg.id, role: msg.role === "agent" ? "assistant" : "user", content: msg.text, actions: [], timestamp: msg.timestamp }]);
  }, []);

  const handleVoiceStatusChange = useCallback((s: VoiceAgentStatus) => { setVoiceStatus(s); }, []);
  const handleVoiceError = useCallback((msg: string) => { setVoiceError(msg); setVoiceMode(false); }, []);

  const { connect, disconnect } = useVoiceAgent({
    masterName, voice: voiceAgentVoice,
    onMessage: handleVoiceMessage,
    onStatusChange: handleVoiceStatusChange,
    onError: handleVoiceError,
  });

  const handleStartVoiceMode = useCallback(() => {
    setVoiceError(null); setLastVoiceText(""); setVoiceMode(true); connect();
  }, [connect]);

  const handleStopVoiceMode = useCallback(() => {
    disconnect(); setVoiceMode(false); setLastVoiceText("");
  }, [disconnect]);

  const isEmpty = messages.length === 0 && !historyLoading;
  const displayName = masterName.trim() || "there";

  return (
    <>
      <style>{`
        @keyframes jarvis-bounce{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-5px);opacity:1}}
        @keyframes jarvis-fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes jarvis-spin{to{transform:rotate(360deg)}}
        @keyframes jarvis-pulse-ring{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.3)}50%{box-shadow:0 0 0 6px rgba(239,68,68,0)}}
        @keyframes jarvis-glow{0%,100%{box-shadow:0 2px 8px rgba(16,185,129,.25)}50%{box-shadow:0 2px 20px rgba(16,185,129,.5),0 0 0 4px rgba(16,185,129,.1)}}
        .jarvis-msg{animation:jarvis-fadein .22s ease}
        .jarvis-suggest:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(116,103,240,.18)!important;border-color:#c4b5fd!important}
        .jarvis-send:hover:not(:disabled){background:#5b50d6!important}
        .jarvis-send:disabled{opacity:.4;cursor:not-allowed}
        .jarvis-clear:hover{background:#fff1f2!important;color:#dc2626!important;border-color:#fecdd3!important}
        .jarvis-voice-btn:hover{transform:translateY(-1px);box-shadow:0 6px 24px rgba(16,185,129,.45)!important}
        .jarvis-msg-wrap:hover .jarvis-copy-btn{opacity:1!important}
        .jarvis-copy-btn:hover{background:#f0f0f8!important;border-color:#c4b5fd!important}
        .jarvis-input-wrap:focus-within{border-color:#a78bfa!important;box-shadow:0 0 0 3px rgba(116,103,240,.12)!important}
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f4f5ff", overflow: "hidden", position: "relative" }}>

        {/* Voice overlay */}
        {voiceMode && (
          <VoiceModeOverlay status={voiceStatus} lastText={lastVoiceText} lastRole={lastVoiceRole} masterName={masterName} onStop={handleStopVoiceMode} />
        )}

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", background: "#fff", borderBottom: "1px solid #eaebf8", flexShrink: 0, zIndex: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #7467F0 0%, #06B6D4 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(116,103,240,.3)", flexShrink: 0 }}>
            <Bot size={20} color="#fff" strokeWidth={1.8} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0f0e2e", letterSpacing: "-0.01em" }}>JARVIS</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>
              {masterName ? `Master ${masterName} · Groq AI` : "Personal AI · Powered by Groq"}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px rgba(16,185,129,.5)" }} />
            <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Online</span>
          </div>

          {messages.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#f0f0ff", border: "1px solid #ddd6fe", borderRadius: 20, padding: "3px 10px" }}>
              <Brain size={11} color="#7467F0" />
              <span style={{ fontSize: 11, color: "#7467F0", fontWeight: 600 }}>{messages.length} remembered</span>
            </div>
          )}

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {/* Quick Voice Mode button in header */}
            <button onClick={handleStartVoiceMode} title="Start voice conversation"
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, border: "none", background: "linear-gradient(135deg, #10B981, #06B6D4)", cursor: "pointer", color: "#fff", fontSize: 12, fontWeight: 700, boxShadow: "0 2px 10px rgba(16,185,129,.3)", transition: "all .15s", animation: "jarvis-glow 2.5s ease-in-out infinite" }}
              className="jarvis-voice-btn"
            >
              <Mic size={13} />
              Voice
            </button>

            {messages.length > 0 && (
              <button className="jarvis-clear" onClick={clearHistory} disabled={clearing} title="Clear conversation"
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, background: "#f8f9ff", border: "1px solid #e8e9f0", cursor: "pointer", fontSize: 12, color: "#9ca3af", fontWeight: 500, transition: "all .15s" }}>
                <Trash2 size={13} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Messages ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: isEmpty ? 0 : "20px 20px 4px", display: "flex", flexDirection: "column" }}>

          {historyLoading ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "#9ca3af" }}>
              <Loader2 size={18} style={{ animation: "jarvis-spin 1s linear infinite" }} />
              <span style={{ fontSize: 14 }}>Loading conversation…</span>
            </div>
          ) : isEmpty ? (
            /* ── Empty State ── */
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", maxWidth: 640, margin: "0 auto", width: "100%" }}>
              <div style={{ width: 80, height: 80, borderRadius: 24, background: "linear-gradient(135deg, #7467F0 0%, #06B6D4 100%)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22, boxShadow: "0 12px 40px rgba(116,103,240,.35)" }}>
                <Bot size={38} color="#fff" strokeWidth={1.6} />
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0f0e2e", margin: 0, marginBottom: 10, letterSpacing: "-0.02em", textAlign: "center" }}>
                {masterName ? `Ready, Master ${masterName}.` : "Meet JARVIS"}
              </h2>
              <p style={{ fontSize: 14, color: "#6b7280", margin: 0, marginBottom: 28, textAlign: "center", maxWidth: 380, lineHeight: 1.65 }}>
                Your personal AI system. I can read your tasks, schedule, notes — and create new ones. Ask me anything, or start a real-time voice conversation.
              </p>

              {/* Voice CTA */}
              <button onClick={handleStartVoiceMode} className="jarvis-voice-btn"
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 28px", borderRadius: 99, border: "none", background: "linear-gradient(135deg, #10B981, #06B6D4)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 28, boxShadow: "0 6px 24px rgba(16,185,129,.35)", transition: "all .2s", animation: "jarvis-glow 2.5s ease-in-out infinite" }}>
                <Mic size={18} />
                Start Voice Conversation
              </button>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", maxWidth: 480, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: "#e8e9f0" }} />
                <span style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>or try a prompt</span>
                <div style={{ flex: 1, height: 1, background: "#e8e9f0" }} />
              </div>

              {/* Suggestion grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, width: "100%", maxWidth: 520 }}>
                {SUGGESTIONS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button key={s.label} className="jarvis-suggest" onClick={() => sendMessage(s.label)}
                      style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#fff", border: "1px solid #e8e9f0", borderRadius: 12, padding: "11px 14px", cursor: "pointer", textAlign: "left", transition: "all .18s", boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon size={15} color={s.color} strokeWidth={2} />
                      </div>
                      <span style={{ fontSize: 12, color: "#374151", fontWeight: 500, lineHeight: 1.45 }}>{s.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Capabilities footer */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 28, justifyContent: "center" }}>
                {["Reads your tasks", "Reads calendar & notes", "Creates tasks & events", "Builds schedules", "Voice chat", "Accountability coaching"].map((cap) => (
                  <span key={cap} style={{ fontSize: 11, color: "#7467F0", background: "#f0f0ff", border: "1px solid #ddd6fe", borderRadius: 20, padding: "3px 10px" }}>{cap}</span>
                ))}
              </div>
            </div>
          ) : (
            /* ── Chat Messages ── */
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 800, width: "100%", margin: "0 auto" }}>
              {messages.map((msg) => (
                <div key={msg.id} className="jarvis-msg" style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", alignItems: "flex-start", gap: 10 }}>

                  {/* JARVIS avatar */}
                  {msg.role === "assistant" && (
                    <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: "linear-gradient(135deg, #7467F0, #06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(116,103,240,.3)", marginTop: 2 }}>
                      <Bot size={16} color="#fff" strokeWidth={2} />
                    </div>
                  )}

                  <div style={{ maxWidth: "76%", minWidth: 0, display: "flex", flexDirection: "column", gap: 2, alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                    {/* Bubble */}
                    <div className={msg.role === "assistant" ? "jarvis-msg-wrap" : ""} style={{ position: "relative" }}>
                      <div style={{
                        background: msg.role === "user" ? "linear-gradient(135deg, #7467F0, #5b50d6)" : "#fff",
                        color: msg.role === "user" ? "#fff" : "#1a1f36",
                        borderRadius: msg.role === "user" ? "20px 20px 4px 20px" : "4px 20px 20px 20px",
                        padding: msg.role === "user" ? "11px 16px" : "13px 18px",
                        fontSize: 14,
                        lineHeight: 1.65,
                        border: msg.role === "assistant" ? "1px solid #eaebf8" : "none",
                        boxShadow: msg.role === "assistant" ? "0 2px 12px rgba(0,0,0,.06)" : "0 4px 12px rgba(116,103,240,.25)",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}>
                        {msg.role === "user" ? msg.content : renderMarkdown(msg.content)}
                      </div>
                      {msg.role === "assistant" && <CopyButton text={msg.content} />}
                    </div>

                    {/* Tool result cards */}
                    {msg.role === "assistant" && msg.actions && msg.actions.length > 0 && (
                      <div style={{ width: "100%", display: "flex", flexDirection: "column" }}>
                        {msg.actions.map((a, i) => <ToolResultCard key={i} action={a} onNavigate={navigate} />)}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div style={{ fontSize: 10, color: "#c0c4d8", marginTop: 2 }}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="jarvis-msg" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #7467F0, #06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(116,103,240,.3)" }}>
                    <Bot size={16} color="#fff" strokeWidth={2} />
                  </div>
                  <div style={{ background: "#fff", border: "1px solid #eaebf8", borderRadius: "4px 20px 20px 20px", boxShadow: "0 2px 12px rgba(0,0,0,.06)", minWidth: 80 }}>
                    <TypingIndicator activeTool={activeTool} />
                  </div>
                </div>
              )}

              <div ref={bottomRef} style={{ height: 4 }} />
            </div>
          )}
        </div>

        {/* ── Voice error banner ── */}
        {voiceError && (
          <div style={{ margin: "0 20px 6px", padding: "10px 14px", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 10, fontSize: 13, color: "#b91c1c", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <AlertCircle size={14} />
            <span style={{ flex: 1 }}>{voiceError}</span>
            <button onClick={() => setVoiceError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#b91c1c", fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
          </div>
        )}

        {/* ── Input Area ── */}
        <div style={{ padding: "10px 20px 16px", background: "#fff", borderTop: "1px solid #eaebf8", flexShrink: 0 }}>

          {/* Recording status bar */}
          {(recording || transcribing) && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "8px 12px", background: recording ? "#fff1f2" : "#f0f9ff", border: `1px solid ${recording ? "#fecdd3" : "#bae6fd"}`, borderRadius: 8 }}>
              {transcribing
                ? <><Loader2 size={13} color="#0284c7" style={{ animation: "jarvis-spin 1s linear infinite" }} /><span style={{ fontSize: 12, color: "#0284c7" }}>Transcribing…</span></>
                : <><div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", animation: "jarvis-pulse-ring 1.5s ease-in-out infinite" }} /><span style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>Recording {fmtSecs(recSeconds)}</span><span style={{ fontSize: 11, color: "#9ca3af" }}> — tap stop when done</span></>
              }
            </div>
          )}

          {/* Input row */}
          <div className="jarvis-input-wrap" style={{ display: "flex", gap: 8, alignItems: "flex-end", background: "#f8f9ff", border: "1.5px solid #e4e5f5", borderRadius: 18, padding: "8px 10px", transition: "all .15s" }}>

            {/* Push-to-talk */}
            <button onClick={recording ? stopRecording : startRecording} disabled={transcribing} title={recording ? "Stop recording" : "Click to record voice message"}
              style={{ width: 36, height: 36, borderRadius: 10, border: "none", background: recording ? "#fef2f2" : "#fff", cursor: transcribing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background .15s", boxShadow: "0 1px 4px rgba(0,0,0,.07)", animation: recording ? "jarvis-pulse-ring 1.5s ease-in-out infinite" : "none" }}>
              {transcribing
                ? <Loader2 size={16} color="#0284c7" style={{ animation: "jarvis-spin 1s linear infinite" }} />
                : recording ? <Square size={16} color="#ef4444" fill="#ef4444" /> : <Mic size={16} color="#7467F0" />}
            </button>

            {/* Text input */}
            <textarea ref={textareaRef} value={input}
              onChange={(e) => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKeyDown}
              placeholder={
                recording ? "Recording…" :
                masterName ? `Message JARVIS, Master ${masterName}…` :
                "Ask JARVIS about your tasks, schedule, or anything…"
              }
              rows={1}
              disabled={loading || recording || transcribing}
              style={{ flex: 1, resize: "none", border: "none", background: "transparent", fontSize: 14, color: "#1a1f36", outline: "none", lineHeight: 1.6, maxHeight: 140, overflowY: "auto", padding: "6px 0", fontFamily: "inherit" }}
            />

            {/* Voice mode CTA */}
            <button onClick={handleStartVoiceMode} title="Start JARVIS voice conversation — real-time speech AI"
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 14px", height: 36, borderRadius: 10, border: "none", background: "linear-gradient(135deg, #10B981, #059669)", cursor: "pointer", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0, whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(16,185,129,.35)", transition: "all .15s", animation: "jarvis-glow 2.5s ease-in-out infinite" }}
              className="jarvis-voice-btn">
              <Volume2 size={13} />
              Voice
            </button>

            {/* Send */}
            <button className="jarvis-send" onClick={() => sendMessage(input)} disabled={!input.trim() || loading || recording || transcribing} title="Send (Enter)"
              style={{ width: 36, height: 36, borderRadius: 10, border: "none", background: "#7467F0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background .15s" }}>
              {loading
                ? <Loader2 size={15} color="#fff" style={{ animation: "jarvis-spin 1s linear infinite" }} />
                : <Send size={15} color="#fff" />}
            </button>
          </div>

          {/* Footer hint */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "#c0c4d8" }}>Enter to send · Shift+Enter for new line</span>
            <span style={{ fontSize: 11, color: "#c0c4d8" }}>·</span>
            <span style={{ fontSize: 11, color: "#10B981", fontWeight: 600 }}>Voice Mode</span>
            <span style={{ fontSize: 11, color: "#c0c4d8" }}>= real-time AI speech</span>
          </div>
        </div>
      </div>
    </>
  );
}
