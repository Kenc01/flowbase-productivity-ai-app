import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Bot, Send, Mic, Square, Loader2, CheckCircle2,
  AlertCircle, ArrowRight, Sparkles, Calendar, StickyNote,
  Kanban, LayoutTemplate, Trash2, CornerDownLeft, Brain,
} from "lucide-react";
import { api } from "@/lib/api";

interface Action {
  tool: string;
  summary: string;
  success: boolean;
  link?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: Action[];
  timestamp: Date;
}

const SUGGESTIONS = [
  { icon: Calendar, label: "What's my schedule today?", color: "#06B6D4" },
  { icon: Kanban, label: "What tasks do I have?", color: "#7467F0" },
  { icon: StickyNote, label: "Show me my notes", color: "#F59E0B" },
  { icon: Kanban, label: "Create a task for tomorrow", color: "#10B981" },
  { icon: LayoutTemplate, label: "Generate a habit tracker template", color: "#F43F5E" },
  { icon: Sparkles, label: "Plan my week", color: "#8B5CF6" },
];

const TOOL_LABELS: Record<string, string> = {
  get_schedule: "Schedule",
  get_tasks: "Tasks",
  get_notes: "Notes",
  create_kanban_task: "Kanban Task",
  create_kanban_board: "Kanban Board",
  create_calendar_event: "Calendar Event",
  create_note: "Note",
  generate_ai_template: "AI Template",
};

const TOOL_ICONS: Record<string, React.ElementType> = {
  get_schedule: Calendar,
  get_tasks: Kanban,
  get_notes: StickyNote,
  create_kanban_task: Kanban,
  create_kanban_board: Kanban,
  create_calendar_event: Calendar,
  create_note: StickyNote,
  generate_ai_template: LayoutTemplate,
};

const READ_TOOLS = new Set(["get_schedule", "get_tasks", "get_notes"]);

function uid() {
  return Math.random().toString(36).slice(2, 14);
}

function ActionCard({ action, onNavigate }: { action: Action; onNavigate: (h: string) => void }) {
  const Icon = TOOL_ICONS[action.tool] ?? Sparkles;
  const isRead = READ_TOOLS.has(action.tool);
  const bg = isRead ? "#f0f9ff" : (action.success ? "#f0fdf4" : "#fff1f2");
  const border = isRead ? "#bae6fd" : (action.success ? "#bbf7d0" : "#fecdd3");
  const textColor = isRead ? "#0369a1" : (action.success ? "#15803d" : "#b91c1c");

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      background: bg, border: `1px solid ${border}`,
      borderRadius: 10, padding: "10px 14px", marginTop: 8,
    }}>
      {isRead
        ? <Icon size={15} color={textColor} style={{ marginTop: 2, flexShrink: 0 }} />
        : action.success
          ? <CheckCircle2 size={15} color={textColor} style={{ marginTop: 2, flexShrink: 0 }} />
          : <AlertCircle size={15} color={textColor} style={{ marginTop: 2, flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: textColor, marginBottom: 2 }}>
          {isRead ? `Read ${TOOL_LABELS[action.tool]}` : `${TOOL_LABELS[action.tool] ?? "Action"} ${action.success ? "created" : "failed"}`}
        </div>
        <div style={{ fontSize: 12, color: textColor, opacity: 0.85 }}>{action.summary}</div>
      </div>
      {action.link && (
        <button
          onClick={() => onNavigate(action.link!)}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "none", border: "none", cursor: "pointer",
            fontSize: 12, color: "#7467F0", fontWeight: 600, padding: "2px 6px",
            borderRadius: 6, whiteSpace: "nowrap", flexShrink: 0,
          }}
        >
          View <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "12px 16px" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "#7467F0", opacity: 0.6,
          animation: `fb-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

export default function AIAssistantPage() {
  const [, navigate] = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load chat history on mount
  useEffect(() => {
    api.get<any[]>("/ai-assistant/history")
      .then((rows) => {
        setMessages(rows.map((r) => ({
          id: r.id,
          role: r.role,
          content: r.content,
          actions: r.actions ?? [],
          timestamp: new Date(r.timestamp),
        })));
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    if (!historyLoading) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, historyLoading]);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: uid(), role: "user", content: trimmed, timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);

    try {
      // Build history from current messages (excluding the one we just added locally)
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      const data = await api.post<{ message: string; actions: Action[] }>(
        "/ai-assistant/chat",
        { userMessage: trimmed, history }
      );

      const aiMsg: Message = {
        id: uid(),
        role: "assistant",
        content: data.message ?? "Sorry, I couldn't generate a response.",
        actions: data.actions ?? [],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [...prev, {
        id: uid(), role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
        actions: [], timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  const clearHistory = async () => {
    if (!confirm("Clear your entire conversation history?")) return;
    setClearing(true);
    try {
      await api.delete("/ai-assistant/history");
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

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const isEmpty = messages.length === 0 && !historyLoading;

  return (
    <>
      <style>{`
        @keyframes fb-bounce { 0%,80%,100%{transform:translateY(0);opacity:0.4}40%{transform:translateY(-6px);opacity:1} }
        @keyframes fb-fadein { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fb-spin { to { transform: rotate(360deg); } }
        @keyframes fb-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.3)}50%{box-shadow:0 0 0 8px rgba(239,68,68,0)} }
        .fb-msg { animation: fb-fadein 0.25s ease; }
        .fb-suggest:hover { transform:translateY(-2px);box-shadow:0 6px 20px rgba(116,103,240,0.15)!important; }
        .fb-send-btn:hover:not(:disabled) { background:#5b50d6!important; }
        .fb-send-btn:disabled { opacity:0.45;cursor:not-allowed; }
        .fb-voice-btn:hover:not(:disabled) { background:#f3f2ff!important; }
        .fb-clear:hover { background:#fff1f2!important; color:#dc2626!important; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f8f9ff", overflow: "hidden" }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 24px", background: "#fff",
          borderBottom: "1px solid #e8e9f0", flexShrink: 0,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: "linear-gradient(135deg, #7467F0, #06B6D4)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Bot size={20} color="#fff" strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1f36" }}>AI Assistant</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Powered by Groq · Llama 3.3</div>
          </div>

          {/* Memory badge */}
          {messages.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "#f0f4ff", border: "1px solid #ddd6fe",
              borderRadius: 20, padding: "3px 10px", marginLeft: 4,
            }}>
              <Brain size={12} color="#7467F0" />
              <span style={{ fontSize: 11, color: "#7467F0", fontWeight: 600 }}>
                {messages.length} message{messages.length !== 1 ? "s" : ""} remembered
              </span>
            </div>
          )}

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginRight: 4 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981" }} />
              <span style={{ fontSize: 12, color: "#6b7280" }}>Online</span>
            </div>
            {messages.length > 0 && (
              <button
                className="fb-clear"
                onClick={clearHistory}
                disabled={clearing}
                title="Clear conversation"
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 8,
                  background: "#f8f9ff", border: "1px solid #e8e9f0",
                  cursor: "pointer", fontSize: 12, color: "#6b7280",
                  fontWeight: 500, transition: "all 0.15s",
                }}
              >
                <Trash2 size={13} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: "auto", padding: isEmpty ? 0 : "24px", display: "flex", flexDirection: "column" }}>
          {historyLoading ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "#9ca3af" }}>
              <Loader2 size={18} style={{ animation: "fb-spin 1s linear infinite" }} />
              <span style={{ fontSize: 14 }}>Loading your conversation…</span>
            </div>
          ) : isEmpty ? (
            /* Empty state */
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
              <div style={{
                width: 72, height: 72, borderRadius: 20,
                background: "linear-gradient(135deg, #7467F0 0%, #06B6D4 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 20, boxShadow: "0 8px 32px rgba(116,103,240,0.3)",
              }}>
                <Bot size={34} color="#fff" strokeWidth={1.8} />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1f36", margin: 0, marginBottom: 8 }}>
                Hi, I'm FlowBase AI
              </h2>
              <p style={{ fontSize: 14, color: "#6b7280", margin: 0, marginBottom: 32, textAlign: "center", maxWidth: 420 }}>
                Your smart workspace assistant. Ask me about your schedule, tasks, and notes — or tell me to create things for you.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12, width: "100%", maxWidth: 560 }}>
                {SUGGESTIONS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button key={s.label} className="fb-suggest" onClick={() => sendMessage(s.label)} style={{
                      display: "flex", alignItems: "flex-start", gap: 10,
                      background: "#fff", border: "1px solid #e8e9f0", borderRadius: 12,
                      padding: "12px 14px", cursor: "pointer", textAlign: "left",
                      transition: "all 0.18s ease", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                        background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon size={15} color={s.color} strokeWidth={2} />
                      </div>
                      <span style={{ fontSize: 13, color: "#374151", fontWeight: 500, lineHeight: 1.4 }}>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 760, width: "100%", margin: "0 auto" }}>
              {messages.map((msg) => (
                <div key={msg.id} className="fb-msg" style={{
                  display: "flex",
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                  alignItems: "flex-start", gap: 10,
                }}>
                  {msg.role === "assistant" && (
                    <div style={{
                      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                      background: "linear-gradient(135deg, #7467F0, #06B6D4)",
                      display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2,
                    }}>
                      <Bot size={17} color="#fff" strokeWidth={2} />
                    </div>
                  )}
                  <div style={{ maxWidth: "78%", minWidth: 0 }}>
                    <div style={{
                      background: msg.role === "user" ? "linear-gradient(135deg, #7467F0, #6366f1)" : "#fff",
                      color: msg.role === "user" ? "#fff" : "#1a1f36",
                      borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      padding: "12px 16px", fontSize: 14, lineHeight: 1.6,
                      border: msg.role === "assistant" ? "1px solid #e8e9f0" : "none",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      whiteSpace: "pre-wrap", wordBreak: "break-word",
                    }}>
                      {msg.content}
                    </div>
                    {msg.actions && msg.actions.length > 0 && (
                      <div style={{ marginTop: 4 }}>
                        {msg.actions.map((a, i) => (
                          <ActionCard key={i} action={a} onNavigate={navigate} />
                        ))}
                      </div>
                    )}
                    <div style={{
                      fontSize: 11, color: "#9ca3af", marginTop: 5,
                      textAlign: msg.role === "user" ? "right" : "left",
                    }}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="fb-msg" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: "linear-gradient(135deg, #7467F0, #06B6D4)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Bot size={17} color="#fff" strokeWidth={2} />
                  </div>
                  <div style={{
                    background: "#fff", border: "1px solid #e8e9f0",
                    borderRadius: "18px 18px 18px 4px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}>
                    <TypingIndicator />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Voice error */}
        {voiceError && (
          <div style={{
            margin: "0 24px 8px", padding: "10px 14px",
            background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 8,
            fontSize: 13, color: "#b91c1c", display: "flex", alignItems: "center", gap: 8,
          }}>
            <AlertCircle size={14} />
            {voiceError}
            <button onClick={() => setVoiceError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#b91c1c", fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* Input area */}
        <div style={{ padding: "14px 24px 20px", background: "#fff", borderTop: "1px solid #e8e9f0", flexShrink: 0 }}>
          {(recording || transcribing) && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
              padding: "8px 14px",
              background: recording ? "#fff1f2" : "#f0f9ff",
              border: `1px solid ${recording ? "#fecdd3" : "#bae6fd"}`,
              borderRadius: 8,
            }}>
              {transcribing
                ? <><Loader2 size={14} color="#0284c7" style={{ animation: "fb-spin 1s linear infinite" }} /><span style={{ fontSize: 13, color: "#0284c7" }}>Transcribing your voice…</span></>
                : <><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "fb-pulse 1.5s ease-in-out infinite" }} /><span style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>Recording {formatTime(recSeconds)}</span><span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 4 }}>Click stop when done</span></>}
            </div>
          )}

          <div style={{
            display: "flex", gap: 10, alignItems: "flex-end",
            background: "#f8f9ff", border: "1.5px solid #e0e0f0",
            borderRadius: 16, padding: "10px 12px", transition: "border-color 0.15s",
          }}>
            {/* Mic button */}
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={transcribing}
              title={recording ? "Stop recording" : "Voice input"}
              style={{
                width: 36, height: 36, borderRadius: 10, border: "none",
                background: recording ? "#fef2f2" : "#fff",
                cursor: transcribing ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "background 0.15s",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                animation: recording ? "fb-pulse 1.5s ease-in-out infinite" : "none",
              }}
            >
              {transcribing
                ? <Loader2 size={17} color="#0284c7" style={{ animation: "fb-spin 1s linear infinite" }} />
                : recording
                  ? <Square size={17} color="#ef4444" fill="#ef4444" />
                  : <Mic size={17} color="#7467F0" />}
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKeyDown}
              placeholder={recording ? "Recording…" : "Ask about your schedule, tasks, notes… or tell me to create something"}
              rows={1}
              disabled={loading || recording || transcribing}
              style={{
                flex: 1, resize: "none", border: "none", background: "transparent",
                fontSize: 14, color: "#1a1f36", outline: "none",
                lineHeight: 1.6, maxHeight: 160, overflowY: "auto",
                padding: "4px 0", fontFamily: "inherit",
              }}
            />

            <button
              className="fb-send-btn"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading || recording || transcribing}
              title="Send (Enter)"
              style={{
                width: 36, height: 36, borderRadius: 10, border: "none",
                background: "#7467F0", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "background 0.15s",
              }}
            >
              {loading
                ? <Loader2 size={17} color="#fff" style={{ animation: "fb-spin 1s linear infinite" }} />
                : <Send size={16} color="#fff" />}
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "#c4c4d4" }}>
              <CornerDownLeft size={10} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />
              Enter to send · Shift+Enter for new line · Click mic to speak
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
