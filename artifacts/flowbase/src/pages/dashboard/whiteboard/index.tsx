import React, {
  useState, useEffect, useCallback, useRef, lazy, Suspense,
} from "react";
import {
  Plus, Trash2, Pencil, Check, X, Download, Sparkles,
  MoreHorizontal, Clock, Loader2, ChevronLeft,
} from "lucide-react";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Whiteboard {
  id: string;
  title: string;
  color: string;
  elements: string;
  appState: string;
  createdAt?: string;
  updatedAt?: string;
}

type SaveStatus = "saved" | "saving" | "unsaved";

// ─── Lazy Excalidraw ──────────────────────────────────────────────────────────

const ExcalidrawLazy = lazy(() =>
  import("@excalidraw/excalidraw").then((m) => ({ default: m.Excalidraw }))
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const BOARD_COLORS = [
  "#4F46E5", "#7C3AED", "#DB2777", "#DC2626",
  "#D97706", "#059669", "#0891B2", "#475569",
];

// ─── Rename Input ─────────────────────────────────────────────────────────────

function RenameInput({
  value, onSave, onCancel,
}: { value: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [v, setV] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (v.trim()) onSave(v.trim()); }}
      style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}
    >
      <input
        ref={ref}
        value={v}
        onChange={(e) => setV(e.target.value)}
        style={{
          flex: 1, background: "var(--fb-surface)", border: "1px solid var(--fb-border)",
          borderRadius: 6, padding: "2px 6px", fontSize: 13, color: "var(--fb-text)",
          outline: "none",
        }}
        onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}
      />
      <button type="submit" style={{ padding: 2, cursor: "pointer", color: "var(--fb-emerald)", background: "none", border: "none" }}>
        <Check size={14} />
      </button>
      <button type="button" onClick={onCancel} style={{ padding: 2, cursor: "pointer", color: "var(--fb-muted)", background: "none", border: "none" }}>
        <X size={14} />
      </button>
    </form>
  );
}

// ─── AI Dialog ────────────────────────────────────────────────────────────────

function AIDialog({
  onClose, onGenerate,
}: { onClose: () => void; onGenerate: (prompt: string) => Promise<void> }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const SUGGESTIONS = [
    "User authentication flowchart with login, signup, and password reset",
    "Mind map of React ecosystem: hooks, state management, routing, testing",
    "Microservices architecture for an e-commerce platform",
    "Software development lifecycle process diagram",
    "User onboarding journey map from landing page to activation",
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    try {
      await onGenerate(prompt.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "var(--fb-card)", borderRadius: 16,
        border: "1px solid var(--fb-border)", padding: 28,
        width: "min(520px, 90vw)", boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Sparkles size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--fb-text)" }}>AI Diagram Generator</div>
            <div style={{ fontSize: 12, color: "var(--fb-muted)" }}>Describe your diagram and AI will draw it</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--fb-muted)", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your diagram... e.g. 'A flowchart showing the user login process with error handling'"
            rows={4}
            style={{
              width: "100%", background: "var(--fb-surface)", border: "1px solid var(--fb-border)",
              borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "var(--fb-text)",
              resize: "vertical", outline: "none", fontFamily: "inherit",
              boxSizing: "border-box",
            }}
            onFocus={(e) => { e.target.style.borderColor = "#4F46E5"; }}
            onBlur={(e) => { e.target.style.borderColor = "var(--fb-border)"; }}
          />

          <div style={{ marginTop: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "var(--fb-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Suggestions
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {SUGGESTIONS.slice(0, 3).map((s) => (
                <button
                  key={s} type="button"
                  onClick={() => setPrompt(s)}
                  style={{
                    background: "var(--fb-surface)", border: "1px solid var(--fb-border)",
                    borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "var(--fb-muted)",
                    cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.borderColor = "#4F46E5"; (e.target as HTMLElement).style.color = "var(--fb-text)"; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.borderColor = "var(--fb-border)"; (e.target as HTMLElement).style.color = "var(--fb-muted)"; }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#dc2626", marginBottom: 12 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: "10px 16px", borderRadius: 10,
              background: "var(--fb-surface)", border: "1px solid var(--fb-border)",
              color: "var(--fb-text)", fontSize: 14, cursor: "pointer", fontWeight: 500,
            }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              style={{
                flex: 2, padding: "10px 16px", borderRadius: 10,
                background: loading || !prompt.trim() ? "#6366f180" : "linear-gradient(135deg, #4F46E5, #7C3AED)",
                border: "none", color: "#fff", fontSize: 14, cursor: loading ? "wait" : "pointer",
                fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {loading ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Generating…</> : <><Sparkles size={16} /> Generate Diagram</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WhiteboardPage() {
  const [boards, setBoards] = useState<Whiteboard[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  const excalidrawRef = useRef<any>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedElements = useRef<string>("[]");

  const activeBoard = boards.find((b) => b.id === activeId) ?? null;

  // ── Load boards ──────────────────────────────────────────────────────────────
  useEffect(() => {
    api.get<Whiteboard[]>("/whiteboards").then((data) => {
      setBoards(data.sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()));
      if (data.length > 0) {
        setActiveId(data[0].id);
        lastSavedElements.current = data[0].elements ?? "[]";
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // ── Create board ─────────────────────────────────────────────────────────────
  const createBoard = useCallback(async () => {
    const id = uid();
    const color = BOARD_COLORS[Math.floor(Math.random() * BOARD_COLORS.length)];
    const newBoard: Whiteboard = { id, title: "Untitled Board", color, elements: "[]", appState: "{}" };
    setBoards((prev) => [newBoard, ...prev]);
    setActiveId(id);
    lastSavedElements.current = "[]";
    setSaveStatus("saving");
    try {
      const saved = await api.post<Whiteboard>("/whiteboards", newBoard);
      setBoards((prev) => prev.map((b) => b.id === id ? saved : b));
      setSaveStatus("saved");
    } catch {
      setSaveStatus("unsaved");
    }
  }, []);

  // ── Delete board ─────────────────────────────────────────────────────────────
  const deleteBoard = useCallback(async (id: string) => {
    setBoards((prev) => {
      const next = prev.filter((b) => b.id !== id);
      if (activeId === id) setActiveId(next[0]?.id ?? null);
      return next;
    });
    setMenuOpenId(null);
    await api.delete(`/whiteboards/${id}`).catch(() => {});
  }, [activeId]);

  // ── Rename board ─────────────────────────────────────────────────────────────
  const renameBoard = useCallback(async (id: string, title: string) => {
    setBoards((prev) => prev.map((b) => b.id === id ? { ...b, title } : b));
    setRenamingId(null);
    await api.put(`/whiteboards/${id}`, { title }).catch(() => {});
  }, []);

  // ── Save elements (debounced) ────────────────────────────────────────────────
  const scheduleSave = useCallback((id: string, elementsJson: string, appStateJson: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("unsaved");
    saveTimer.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await api.put(`/whiteboards/${id}`, { elements: elementsJson, appState: appStateJson });
        lastSavedElements.current = elementsJson;
        setBoards((prev) => prev.map((b) => b.id === id ? { ...b, elements: elementsJson, updatedAt: new Date().toISOString() } : b));
        setSaveStatus("saved");
      } catch {
        setSaveStatus("unsaved");
      }
    }, 1800);
  }, []);

  // ── Excalidraw onChange ──────────────────────────────────────────────────────
  const handleChange = useCallback((elements: readonly any[], appState: any) => {
    if (!activeId) return;
    const json = JSON.stringify(elements);
    if (json === lastSavedElements.current) { setSaveStatus("saved"); return; }
    const appStateJson = JSON.stringify({
      zoom: appState.zoom,
      scrollX: appState.scrollX,
      scrollY: appState.scrollY,
    });
    scheduleSave(activeId, json, appStateJson);
  }, [activeId, scheduleSave]);

  // ── Export PNG ──────────────────────────────────────────────────────────────
  const exportPNG = useCallback(async () => {
    if (!excalidrawRef.current) return;
    try {
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const elements = excalidrawRef.current.getSceneElements();
      const appState = excalidrawRef.current.getAppState();
      const blob = await exportToBlob({
        elements,
        appState: { ...appState, exportWithDarkMode: false },
        files: excalidrawRef.current.getFiles(),
        mimeType: "image/png",
        quality: 1,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeBoard?.title ?? "whiteboard"}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
  }, [activeBoard]);

  // ── AI Diagram generation ────────────────────────────────────────────────────
  const generateDiagram = useCallback(async (prompt: string) => {
    const data = await api.post<{ elements: any[]; title: string }>("/ai-diagram", { prompt });
    if (!excalidrawRef.current) return;
    const existing = excalidrawRef.current.getSceneElements() ?? [];
    // Offset new elements to avoid overlap
    const offsetX = 100;
    const offsetY = existing.length > 0 ? 100 : 0;
    const shifted = data.elements.map((el: any) => ({ ...el, x: el.x + offsetX, y: el.y + offsetY }));
    excalidrawRef.current.updateScene({ elements: [...existing, ...shifted] });
  }, []);

  // ── Parse saved elements for active board ────────────────────────────────────
  const initialElements = React.useMemo(() => {
    if (!activeBoard) return [];
    try { return JSON.parse(activeBoard.elements); } catch { return []; }
  }, [activeBoard?.id]);

  const initialAppState = React.useMemo(() => {
    if (!activeBoard) return {};
    try { return JSON.parse(activeBoard.appState); } catch { return {}; }
  }, [activeBoard?.id]);

  // ── Close menu on outside click ──────────────────────────────────────────────
  useEffect(() => {
    if (!menuOpenId) return;
    const close = () => setMenuOpenId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpenId]);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--fb-bg)" }}>
      {/* ── App Sidebar ── */}
      <Sidebar />

      {/* ── Whiteboard List Panel ── */}
      <div style={{
        width: panelOpen ? 260 : 0,
        minWidth: panelOpen ? 260 : 0,
        overflow: "hidden",
        transition: "width 0.2s ease, min-width 0.2s ease",
        borderRight: "1px solid var(--fb-border)",
        display: "flex",
        flexDirection: "column",
        background: "var(--fb-card)",
        flexShrink: 0,
      }}>
        {/* Panel Header */}
        <div style={{
          padding: "16px 14px 12px",
          borderBottom: "1px solid var(--fb-border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--fb-text)" }}>Whiteboards</div>
          <button
            onClick={createBoard}
            title="New whiteboard"
            style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
              border: "none", borderRadius: 8, padding: "5px 10px",
              color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            <Plus size={13} /> New
          </button>
        </div>

        {/* Board List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 6px" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
              <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "var(--fb-muted)" }} />
            </div>
          ) : boards.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--fb-muted)", fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🎨</div>
              No whiteboards yet.<br />Create one to start drawing!
            </div>
          ) : (
            boards.map((board) => {
              const isActive = board.id === activeId;
              return (
                <div
                  key={board.id}
                  onClick={() => { setActiveId(board.id); lastSavedElements.current = board.elements ?? "[]"; }}
                  style={{
                    borderRadius: 10,
                    padding: "8px 10px",
                    marginBottom: 4,
                    cursor: "pointer",
                    background: isActive ? `${board.color}18` : "transparent",
                    border: `1px solid ${isActive ? board.color + "40" : "transparent"}`,
                    transition: "all 0.15s",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--fb-surface)"; }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {/* Color dot */}
                    <div style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: board.color, flexShrink: 0,
                    }} />

                    {renamingId === board.id ? (
                      <RenameInput
                        value={board.title}
                        onSave={(t) => renameBoard(board.id, t)}
                        onCancel={() => setRenamingId(null)}
                      />
                    ) : (
                      <>
                        <div style={{
                          flex: 1, fontSize: 13, fontWeight: isActive ? 600 : 400,
                          color: isActive ? "var(--fb-text)" : "var(--fb-muted)",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {board.title}
                        </div>

                        {/* Menu button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === board.id ? null : board.id); }}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--fb-muted)", padding: 2, borderRadius: 4,
                            opacity: isActive ? 1 : 0,
                            transition: "opacity 0.15s",
                          }}
                          className="board-menu-btn"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </>
                    )}
                  </div>

                  {renamingId !== board.id && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, paddingLeft: 18 }}>
                      <Clock size={10} color="var(--fb-muted)" />
                      <span style={{ fontSize: 11, color: "var(--fb-muted)" }}>{timeAgo(board.updatedAt)}</span>
                    </div>
                  )}

                  {/* Dropdown menu */}
                  {menuOpenId === board.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: "absolute", right: 8, top: 36, zIndex: 100,
                        background: "var(--fb-card)", border: "1px solid var(--fb-border)",
                        borderRadius: 10, padding: 6, minWidth: 140,
                        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                      }}
                    >
                      <button
                        onClick={() => { setRenamingId(board.id); setMenuOpenId(null); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          width: "100%", background: "none", border: "none",
                          padding: "7px 10px", borderRadius: 7, cursor: "pointer",
                          color: "var(--fb-text)", fontSize: 13,
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--fb-surface)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
                      >
                        <Pencil size={13} /> Rename
                      </button>
                      {BOARD_COLORS.map((c) => null).filter(Boolean)}
                      <div style={{ borderTop: "1px solid var(--fb-border)", margin: "4px 0" }} />
                      <button
                        onClick={() => deleteBoard(board.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          width: "100%", background: "none", border: "none",
                          padding: "7px 10px", borderRadius: 7, cursor: "pointer",
                          color: "#ef4444", fontSize: 13,
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#fef2f2"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Main Canvas Area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Top Bar */}
        <div style={{
          height: 52,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          borderBottom: "1px solid var(--fb-border)",
          background: "var(--fb-card)",
          gap: 10,
          flexShrink: 0,
        }}>
          {/* Toggle panel */}
          <button
            onClick={() => setPanelOpen((o) => !o)}
            title={panelOpen ? "Hide panel" : "Show panel"}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--fb-muted)", padding: 4, borderRadius: 6,
              display: "flex", alignItems: "center",
            }}
          >
            <ChevronLeft size={16} style={{ transform: panelOpen ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.2s" }} />
          </button>

          {/* Board name */}
          {activeBoard ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: activeBoard.color }} />
              <span style={{ fontWeight: 600, fontSize: 14, color: "var(--fb-text)" }}>{activeBoard.title}</span>
            </div>
          ) : (
            <span style={{ fontSize: 14, color: "var(--fb-muted)" }}>No board selected</span>
          )}

          {/* Save status */}
          <div style={{ marginLeft: 8, fontSize: 12, color: "var(--fb-muted)", display: "flex", alignItems: "center", gap: 4 }}>
            {saveStatus === "saving" && <><Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Saving…</>}
            {saveStatus === "saved" && <><Check size={12} color="#10b981" /> Saved</>}
            {saveStatus === "unsaved" && "Unsaved"}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Actions */}
          {activeBoard && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => setShowAI(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                  border: "none", borderRadius: 8, padding: "6px 12px",
                  color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                <Sparkles size={14} /> AI Diagram
              </button>
              <button
                onClick={exportPNG}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "var(--fb-surface)", border: "1px solid var(--fb-border)",
                  borderRadius: 8, padding: "6px 12px",
                  color: "var(--fb-text)", fontSize: 13, fontWeight: 500, cursor: "pointer",
                }}
              >
                <Download size={14} /> Export PNG
              </button>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          {!activeBoard ? (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              color: "var(--fb-muted)",
            }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🎨</div>
              <div style={{ fontWeight: 600, fontSize: 18, color: "var(--fb-text)", marginBottom: 8 }}>
                No whiteboard open
              </div>
              <div style={{ fontSize: 14, marginBottom: 24 }}>
                Create a new whiteboard to start drawing
              </div>
              <button
                onClick={createBoard}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                  border: "none", borderRadius: 10, padding: "10px 20px",
                  color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}
              >
                <Plus size={16} /> New Whiteboard
              </button>
            </div>
          ) : (
            <Suspense fallback={
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "#4F46E5" }} />
              </div>
            }>
              <ExcalidrawCanvas
                key={activeBoard.id}
                excalidrawRef={excalidrawRef}
                initialElements={initialElements}
                initialAppState={initialAppState}
                onChange={handleChange}
              />
            </Suspense>
          )}
        </div>
      </div>

      {/* AI Dialog */}
      {showAI && (
        <AIDialog
          onClose={() => setShowAI(false)}
          onGenerate={generateDiagram}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .board-menu-btn { opacity: 0 !important; }
        div:hover > * > .board-menu-btn { opacity: 1 !important; }
        .excalidraw { height: 100% !important; }
        .excalidraw-container { height: 100% !important; }
      `}</style>
    </div>
  );
}

// ─── Excalidraw Canvas Wrapper ────────────────────────────────────────────────

function ExcalidrawCanvas({
  excalidrawRef,
  initialElements,
  initialAppState,
  onChange,
}: {
  excalidrawRef: React.MutableRefObject<any>;
  initialElements: any[];
  initialAppState: any;
  onChange: (elements: readonly any[], appState: any) => void;
}) {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ExcalidrawLazy
        excalidrawAPI={(api: any) => { excalidrawRef.current = api; }}
        initialData={{
          elements: initialElements,
          appState: {
            viewBackgroundColor: "#ffffff",
            ...initialAppState,
          },
          scrollToContent: initialElements.length > 0,
        }}
        onChange={onChange}
        UIOptions={{
          canvasActions: {
            loadScene: true,
            saveToActiveFile: false,
            export: false,
            saveAsImage: false,
          },
        }}
      />
    </div>
  );
}
