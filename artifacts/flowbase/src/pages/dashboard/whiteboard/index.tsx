import React, {
  useState, useEffect, useCallback, useRef, lazy, Suspense,
} from "react";
import {
  Plus, Trash2, Pencil, Check, X, Download, Sparkles,
  MoreHorizontal, Clock, Loader2, Search, Star, StarOff,
  Share2, ChevronDown, ChevronLeft, FolderPlus, LayoutGrid,
  List, Undo2, Redo2,
} from "lucide-react";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";

// ─── Types ─────────────────────────────────────────────────────────────────
interface Whiteboard {
  id: string;
  title: string;
  color: string;
  elements: string;
  appState: string;
  createdAt?: string;
  updatedAt?: string;
  starred?: boolean;
}
type SaveStatus = "saved" | "saving" | "unsaved";

// ─── Lazy Excalidraw ────────────────────────────────────────────────────────
const ExcalidrawLazy = lazy(() =>
  import("@excalidraw/excalidraw").then((m) => ({ default: m.Excalidraw }))
);

// ─── Helpers ────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const BOARD_COLORS = [
  "#7C3AED", "#4F46E5", "#0891B2", "#059669",
  "#D97706", "#DC2626", "#DB2777", "#475569",
];

// ─── Board Thumbnail ────────────────────────────────────────────────────────
function BoardThumbnail({ color, title }: { color: string; title: string }) {
  const lines = [
    { x: 12, y: 18, w: 40, h: 8, opacity: 0.7 },
    { x: 12, y: 30, w: 30, h: 5, opacity: 0.5 },
    { x: 12, y: 39, w: 35, h: 5, opacity: 0.5 },
    { x: 58, y: 18, w: 28, h: 24, opacity: 0.6, rect: true },
    { x: 12, y: 50, w: 20, h: 14, opacity: 0.4, rect: true },
    { x: 36, y: 50, w: 18, h: 14, opacity: 0.4, rect: true },
  ];
  return (
    <div style={{
      width: "100%", height: 60, borderRadius: 8, overflow: "hidden",
      background: `linear-gradient(135deg, ${color}15, ${color}08)`,
      border: `1px solid ${color}25`,
      position: "relative", flexShrink: 0,
    }}>
      <svg width="100%" height="100%" viewBox="0 0 96 60" preserveAspectRatio="none">
        {lines.map((l, i) =>
          l.rect ? (
            <rect key={i} x={l.x} y={l.y} width={l.w} height={l.h}
              rx="3" fill={color} opacity={l.opacity} />
          ) : (
            <rect key={i} x={l.x} y={l.y} width={l.w} height={l.h}
              rx="2" fill={color} opacity={l.opacity} />
          )
        )}
        <circle cx="72" cy="48" r="6" fill={color} opacity="0.3" />
        <line x1="58" y1="42" x2="66" y2="42" stroke={color} strokeWidth="1.5" opacity="0.5" />
      </svg>
      <div style={{
        position: "absolute", bottom: 4, left: 6,
        fontSize: 7, fontWeight: 600, color, opacity: 0.6,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        maxWidth: "calc(100% - 12px)",
      }}>
        {title}
      </div>
    </div>
  );
}

// ─── Rename Input ───────────────────────────────────────────────────────────
function RenameInput({ value, onSave, onCancel }: { value: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [v, setV] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (v.trim()) onSave(v.trim()); }}
      style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, minWidth: 0 }}>
      <input ref={ref} value={v} onChange={(e) => setV(e.target.value)}
        style={{
          flex: 1, background: "var(--fb-surface)", border: "1px solid #7C3AED",
          borderRadius: 6, padding: "3px 7px", fontSize: 13, color: "var(--fb-text)",
          outline: "none", minWidth: 0,
        }}
        onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }} />
      <button type="submit" style={{ padding: 3, cursor: "pointer", color: "#10b981", background: "none", border: "none", flexShrink: 0 }}>
        <Check size={13} />
      </button>
      <button type="button" onClick={onCancel} style={{ padding: 3, cursor: "pointer", color: "var(--fb-muted)", background: "none", border: "none", flexShrink: 0 }}>
        <X size={13} />
      </button>
    </form>
  );
}

// ─── AI Dialog ─────────────────────────────────────────────────────────────
function AIDialog({ onClose, onGenerate }: { onClose: () => void; onGenerate: (p: string) => Promise<void> }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const SUGGESTIONS = [
    "User login flowchart with error handling and password reset",
    "Mind map of React ecosystem: hooks, routing, state, testing",
    "Microservices architecture for e-commerce platform",
    "User onboarding journey from landing page to activation",
    "Software release process with QA and deployment stages",
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true); setError("");
    try { await onGenerate(prompt.trim()); onClose(); }
    catch (err: any) { setError(err?.message ?? "Generation failed"); }
    finally { setLoading(false); }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "var(--fb-card)", borderRadius: 18,
        border: "1px solid var(--fb-border)", padding: 32,
        width: "min(540px, 92vw)", boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg, #7C3AED, #4F46E5)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Sparkles size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: "var(--fb-text)" }}>AI Diagram Generator</div>
            <div style={{ fontSize: 12, color: "var(--fb-muted)", marginTop: 1 }}>Describe a diagram and AI will place it on your board</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--fb-muted)", padding: 6, borderRadius: 8 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder='Describe your diagram… e.g. "User authentication flowchart with login, signup, and OAuth"'
            rows={4}
            style={{
              width: "100%", background: "var(--fb-surface)", border: "1.5px solid var(--fb-border)",
              borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "var(--fb-text)",
              resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box",
              lineHeight: 1.5,
            }}
            onFocus={(e) => { e.target.style.borderColor = "#7C3AED"; }}
            onBlur={(e) => { e.target.style.borderColor = "var(--fb-border)"; }} />

          <div style={{ margin: "14px 0 18px" }}>
            <div style={{ fontSize: 11, color: "var(--fb-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              Quick prompts
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {SUGGESTIONS.slice(0, 3).map((s) => (
                <button key={s} type="button" onClick={() => setPrompt(s)}
                  style={{
                    background: "var(--fb-surface)", border: "1px solid var(--fb-border)",
                    borderRadius: 8, padding: "7px 12px", fontSize: 12.5, color: "var(--fb-muted)",
                    cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { const t = e.currentTarget; t.style.borderColor = "#7C3AED"; t.style.color = "var(--fb-text)"; t.style.background = "#7C3AED10"; }}
                  onMouseLeave={(e) => { const t = e.currentTarget; t.style.borderColor = "var(--fb-border)"; t.style.color = "var(--fb-muted)"; t.style.background = "var(--fb-surface)"; }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "9px 13px", fontSize: 13, color: "#dc2626", marginBottom: 14 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={onClose}
              style={{
                flex: 1, padding: "11px 16px", borderRadius: 10,
                background: "var(--fb-surface)", border: "1px solid var(--fb-border)",
                color: "var(--fb-text)", fontSize: 14, cursor: "pointer", fontWeight: 500,
              }}>
              Cancel
            </button>
            <button type="submit" disabled={loading || !prompt.trim()}
              style={{
                flex: 2, padding: "11px 16px", borderRadius: 10,
                background: loading || !prompt.trim() ? "#7C3AED60" : "linear-gradient(135deg, #7C3AED, #4F46E5)",
                border: "none", color: "#fff", fontSize: 14, cursor: loading ? "wait" : "pointer",
                fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "opacity 0.15s",
              }}>
              {loading
                ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Generating…</>
                : <><Sparkles size={15} /> Generate Diagram</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────
export default function WhiteboardPage() {
  const [boards, setBoards] = useState<Whiteboard[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [panelOpen, setPanelOpen] = useState(true);

  const excalidrawRef = useRef<any>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedElements = useRef<string>("[]");

  const activeBoard = boards.find((b) => b.id === activeId) ?? null;
  const filteredBoards = boards.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase())
  );

  // ── Load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    api.get<Whiteboard[]>("/whiteboards").then((data) => {
      const sorted = [...data].sort((a, b) =>
        new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()
      );
      setBoards(sorted);
      if (sorted.length > 0) {
        setActiveId(sorted[0].id);
        lastSavedElements.current = sorted[0].elements ?? "[]";
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // ── Create ──────────────────────────────────────────────────────────────
  const createBoard = useCallback(async () => {
    const id = uid();
    const color = BOARD_COLORS[Math.floor(Math.random() * BOARD_COLORS.length)];
    const nb: Whiteboard = { id, title: "Untitled Board", color, elements: "[]", appState: "{}" };
    setBoards((prev) => [nb, ...prev]);
    setActiveId(id);
    lastSavedElements.current = "[]";
    setSaveStatus("saving");
    try {
      const saved = await api.post<Whiteboard>("/whiteboards", nb);
      setBoards((prev) => prev.map((b) => b.id === id ? saved : b));
      setSaveStatus("saved");
    } catch { setSaveStatus("unsaved"); }
  }, []);

  // ── Delete ──────────────────────────────────────────────────────────────
  const deleteBoard = useCallback(async (id: string) => {
    setBoards((prev) => {
      const next = prev.filter((b) => b.id !== id);
      if (activeId === id) { setActiveId(next[0]?.id ?? null); }
      return next;
    });
    setMenuOpenId(null);
    await api.delete(`/whiteboards/${id}`).catch(() => {});
  }, [activeId]);

  // ── Rename ──────────────────────────────────────────────────────────────
  const renameBoard = useCallback(async (id: string, title: string) => {
    setBoards((prev) => prev.map((b) => b.id === id ? { ...b, title } : b));
    setRenamingId(null);
    await api.put(`/whiteboards/${id}`, { title }).catch(() => {});
  }, []);

  // ── Save (debounced) ────────────────────────────────────────────────────
  const scheduleSave = useCallback((id: string, elemJson: string, asJson: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("unsaved");
    saveTimer.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await api.put(`/whiteboards/${id}`, { elements: elemJson, appState: asJson });
        lastSavedElements.current = elemJson;
        setBoards((prev) => prev.map((b) => b.id === id ? { ...b, elements: elemJson, updatedAt: new Date().toISOString() } : b));
        setSaveStatus("saved");
      } catch { setSaveStatus("unsaved"); }
    }, 1800);
  }, []);

  const handleChange = useCallback((elements: readonly any[], appState: any) => {
    if (!activeId) return;
    const json = JSON.stringify(elements);
    if (json === lastSavedElements.current) { setSaveStatus("saved"); return; }
    scheduleSave(activeId, json, JSON.stringify({ zoom: appState.zoom, scrollX: appState.scrollX, scrollY: appState.scrollY }));
  }, [activeId, scheduleSave]);

  // ── Export PNG ──────────────────────────────────────────────────────────
  const exportPNG = useCallback(async () => {
    if (!excalidrawRef.current) return;
    try {
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const blob = await exportToBlob({
        elements: excalidrawRef.current.getSceneElements(),
        appState: { ...excalidrawRef.current.getAppState(), exportWithDarkMode: false },
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
    } catch (err) { console.error("Export failed:", err); }
  }, [activeBoard]);

  // ── AI Generate ─────────────────────────────────────────────────────────
  const generateDiagram = useCallback(async (prompt: string) => {
    const data = await api.post<{ elements: any[]; title: string }>("/ai-diagram", { prompt });
    if (!excalidrawRef.current) return;
    const existing = excalidrawRef.current.getSceneElements() ?? [];
    const shifted = data.elements.map((el: any) => ({ ...el, x: el.x + 120, y: el.y + (existing.length > 0 ? 80 : 0) }));
    excalidrawRef.current.updateScene({ elements: [...existing, ...shifted] });
  }, []);

  const switchBoard = useCallback((board: Whiteboard) => {
    setActiveId(board.id);
    lastSavedElements.current = board.elements ?? "[]";
    setMenuOpenId(null);
  }, []);

  const initialElements = React.useMemo(() => {
    if (!activeBoard) return [];
    try { return JSON.parse(activeBoard.elements); } catch { return []; }
  }, [activeBoard?.id]);

  const initialAppState = React.useMemo(() => {
    if (!activeBoard) return {};
    try { return JSON.parse(activeBoard.appState); } catch { return {}; }
  }, [activeBoard?.id]);

  useEffect(() => {
    if (!menuOpenId) return;
    const close = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-menu]")) setMenuOpenId(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpenId]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--fb-bg)" }}>

      {/* ── App Sidebar ── */}
      <Sidebar />

      {/* ── Whiteboard List Panel ── */}
      <div style={{
        width: panelOpen ? 240 : 0,
        minWidth: panelOpen ? 240 : 0,
        maxWidth: panelOpen ? 240 : 0,
        overflow: "hidden",
        transition: "all 0.22s cubic-bezier(.4,0,.2,1)",
        borderRight: "1px solid var(--fb-border)",
        display: "flex", flexDirection: "column",
        background: "var(--fb-card)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

          {/* Panel header */}
          <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid var(--fb-border)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: "var(--fb-text)" }}>Your Whiteboards</span>
              <div style={{ display: "flex", gap: 2 }}>
                <button
                  onClick={() => setViewMode(v => v === "list" ? "grid" : "list")}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fb-muted)", padding: 4, borderRadius: 6 }}
                  title={viewMode === "list" ? "Grid view" : "List view"}>
                  {viewMode === "list" ? <LayoutGrid size={14} /> : <List size={14} />}
                </button>
              </div>
            </div>

            {/* New board button */}
            <button onClick={createBoard}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                background: "linear-gradient(135deg, #7C3AED, #4F46E5)",
                border: "none", borderRadius: 9, padding: "8px 14px",
                color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                marginBottom: 10, boxShadow: "0 2px 8px #7C3AED30",
              }}>
              <Plus size={14} /> New Whiteboard
            </button>

            {/* Search */}
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--fb-muted)" }} />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search whiteboards…"
                style={{
                  width: "100%", background: "var(--fb-surface)", border: "1px solid var(--fb-border)",
                  borderRadius: 8, padding: "6px 10px 6px 28px", fontSize: 12.5,
                  color: "var(--fb-text)", outline: "none", boxSizing: "border-box",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#7C3AED"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--fb-border)"; }} />
            </div>
          </div>

          {/* Boards list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
                <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "var(--fb-muted)" }} />
              </div>
            ) : filteredBoards.length === 0 ? (
              <div style={{ textAlign: "center", padding: "28px 12px", color: "var(--fb-muted)", fontSize: 12.5 }}>
                <div style={{ fontSize: 30, marginBottom: 8 }}>🎨</div>
                {search ? "No boards match your search." : "No whiteboards yet.\nCreate one to start!"}
              </div>
            ) : (
              <>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--fb-muted)", padding: "4px 4px 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  RECENT
                </div>
                {viewMode === "grid" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {filteredBoards.map((board) => (
                      <BoardGridItem key={board.id} board={board} isActive={board.id === activeId}
                        onSelect={() => switchBoard(board)}
                        onRename={() => setRenamingId(board.id)}
                        onDelete={() => deleteBoard(board.id)}
                        menuOpen={menuOpenId === board.id}
                        onMenuToggle={() => setMenuOpenId(menuOpenId === board.id ? null : board.id)} />
                    ))}
                  </div>
                ) : (
                  filteredBoards.map((board) => (
                    <BoardListItem key={board.id} board={board} isActive={board.id === activeId}
                      isRenaming={renamingId === board.id}
                      onSelect={() => switchBoard(board)}
                      onRenameStart={() => setRenamingId(board.id)}
                      onRenameSave={(t) => renameBoard(board.id, t)}
                      onRenameCancel={() => setRenamingId(null)}
                      onDelete={() => deleteBoard(board.id)}
                      menuOpen={menuOpenId === board.id}
                      onMenuToggle={() => setMenuOpenId(menuOpenId === board.id ? null : board.id)} />
                  ))
                )}
              </>
            )}
          </div>

          {/* Panel footer */}
          <div style={{ borderTop: "1px solid var(--fb-border)", padding: "10px 12px" }}>
            <button style={{
              display: "flex", alignItems: "center", gap: 7, background: "none", border: "none",
              cursor: "pointer", color: "var(--fb-muted)", fontSize: 12.5, padding: "4px 0",
            }}>
              <FolderPlus size={14} /> New Folder
            </button>
          </div>
        </div>
      </div>

      {/* ── Canvas Area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Top Bar */}
        <div style={{
          height: 52, display: "flex", alignItems: "center",
          padding: "0 14px", borderBottom: "1px solid var(--fb-border)",
          background: "var(--fb-card)", gap: 8, flexShrink: 0,
        }}>
          {/* Toggle panel */}
          <button onClick={() => setPanelOpen(o => !o)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--fb-muted)", padding: 5, borderRadius: 7,
              display: "flex", alignItems: "center",
            }}>
            <ChevronLeft size={16} style={{ transform: panelOpen ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.2s" }} />
          </button>

          <div style={{ width: 1, height: 20, background: "var(--fb-border)" }} />

          {/* Board info */}
          {activeBoard ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
              <div style={{
                width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                background: `linear-gradient(135deg, ${activeBoard.color}, ${activeBoard.color}99)`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg viewBox="0 0 20 20" width="12" height="12" fill="none">
                  <rect x="3" y="3" width="6" height="6" rx="1.5" fill="white" opacity="0.9" />
                  <rect x="11" y="3" width="6" height="6" rx="1.5" fill="white" opacity="0.6" />
                  <rect x="3" y="11" width="6" height="6" rx="1.5" fill="white" opacity="0.6" />
                  <rect x="11" y="11" width="6" height="6" rx="1.5" fill="white" opacity="0.3" />
                </svg>
              </div>
              <span style={{
                fontWeight: 600, fontSize: 14, color: "var(--fb-text)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {activeBoard.title}
              </span>

              {/* Save status */}
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "var(--fb-muted)", flexShrink: 0 }}>
                {saveStatus === "saving" && <><Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> Saving…</>}
                {saveStatus === "saved" && <>· Last saved {timeAgo(activeBoard.updatedAt)}</>}
                {saveStatus === "unsaved" && <>· Unsaved changes</>}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, fontSize: 14, color: "var(--fb-muted)" }}>No board selected</div>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Actions */}
          {activeBoard && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={() => setShowAI(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "linear-gradient(135deg, #7C3AED, #4F46E5)",
                  border: "none", borderRadius: 9, padding: "6px 14px",
                  color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  boxShadow: "0 2px 8px #7C3AED30",
                }}>
                <Sparkles size={13} /> AI Diagram
              </button>

              <button onClick={exportPNG}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "var(--fb-surface)", border: "1px solid var(--fb-border)",
                  borderRadius: 9, padding: "6px 12px",
                  color: "var(--fb-text)", fontSize: 13, fontWeight: 500, cursor: "pointer",
                }}>
                <Download size={13} /> Export
              </button>

              <div style={{ width: 1, height: 20, background: "var(--fb-border)" }} />

              <button
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "var(--fb-surface)", border: "1px solid var(--fb-border)",
                  borderRadius: 9, padding: "6px 12px",
                  color: "var(--fb-text)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>
                <Share2 size={13} /> Share
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
              <div style={{ fontSize: 60, marginBottom: 18 }}>🎨</div>
              <div style={{ fontWeight: 700, fontSize: 20, color: "var(--fb-text)", marginBottom: 8 }}>Start creating</div>
              <div style={{ fontSize: 14, marginBottom: 28, textAlign: "center", maxWidth: 280 }}>
                Create a new whiteboard to start drawing, diagramming, and collaborating
              </div>
              <button onClick={createBoard}
                style={{
                  display: "flex", alignItems: "center", gap: 9,
                  background: "linear-gradient(135deg, #7C3AED, #4F46E5)",
                  border: "none", borderRadius: 12, padding: "12px 24px",
                  color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 4px 16px #7C3AED40",
                }}>
                <Plus size={17} /> New Whiteboard
              </button>
            </div>
          ) : (
            <Suspense fallback={
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "#7C3AED" }} />
                <span style={{ fontSize: 13, color: "var(--fb-muted)" }}>Loading canvas…</span>
              </div>
            }>
              <div style={{ width: "100%", height: "100%" }}>
                <ExcalidrawLazy
                  key={activeBoard.id}
                  excalidrawAPI={(apiFn: any) => { excalidrawRef.current = apiFn; }}
                  initialData={{
                    elements: initialElements,
                    appState: {
                      viewBackgroundColor: "#ffffff",
                      ...initialAppState,
                    },
                    scrollToContent: initialElements.length > 0,
                  }}
                  onChange={handleChange}
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
            </Suspense>
          )}
        </div>
      </div>

      {/* AI Dialog */}
      {showAI && (
        <AIDialog onClose={() => setShowAI(false)} onGenerate={generateDiagram} />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .excalidraw { height: 100% !important; }
        .excalidraw-container { height: 100% !important; }
      `}</style>
    </div>
  );
}

// ─── Board List Item ────────────────────────────────────────────────────────
function BoardListItem({
  board, isActive, isRenaming,
  onSelect, onRenameStart, onRenameSave, onRenameCancel, onDelete,
  menuOpen, onMenuToggle,
}: {
  board: Whiteboard; isActive: boolean; isRenaming: boolean;
  onSelect: () => void; onRenameStart: () => void;
  onRenameSave: (t: string) => void; onRenameCancel: () => void;
  onDelete: () => void; menuOpen: boolean; onMenuToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 10, padding: "8px 8px", marginBottom: 3,
        cursor: "pointer", position: "relative",
        background: isActive ? `${board.color}12` : hovered ? "var(--fb-surface)" : "transparent",
        border: `1px solid ${isActive ? board.color + "35" : "transparent"}`,
        transition: "all 0.14s",
      }}>
      {/* Thumbnail */}
      <BoardThumbnail color={board.color} title={board.title} />

      {/* Info row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: board.color, flexShrink: 0 }} />

        {isRenaming ? (
          <RenameInput value={board.title} onSave={onRenameSave} onCancel={onRenameCancel} />
        ) : (
          <>
            <span style={{
              flex: 1, fontSize: 12.5, fontWeight: isActive ? 600 : 500,
              color: "var(--fb-text)", whiteSpace: "nowrap",
              overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {board.title}
            </span>
            <button
              data-menu
              onClick={(e) => { e.stopPropagation(); onMenuToggle(); }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--fb-muted)", padding: 3, borderRadius: 5,
                opacity: hovered || menuOpen ? 1 : 0, transition: "opacity 0.15s",
                flexShrink: 0,
              }}>
              <MoreHorizontal size={13} />
            </button>
          </>
        )}
      </div>

      {!isRenaming && (
        <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 2, paddingLeft: 14 }}>
          <Clock size={9} color="var(--fb-muted)" />
          <span style={{ fontSize: 10.5, color: "var(--fb-muted)" }}>Edited {timeAgo(board.updatedAt)}</span>
        </div>
      )}

      {/* Dropdown menu */}
      {menuOpen && (
        <div data-menu onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute", right: 6, top: 44, zIndex: 100,
            background: "var(--fb-card)", border: "1px solid var(--fb-border)",
            borderRadius: 10, padding: 5, minWidth: 138,
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          }}>
          <MenuBtn icon={<Pencil size={13} />} label="Rename" onClick={onRenameStart} />
          <div style={{ borderTop: "1px solid var(--fb-border)", margin: "4px 0" }} />
          <MenuBtn icon={<Trash2 size={13} />} label="Delete" onClick={onDelete} danger />
        </div>
      )}
    </div>
  );
}

// ─── Board Grid Item ────────────────────────────────────────────────────────
function BoardGridItem({
  board, isActive, onSelect, onRename, onDelete, menuOpen, onMenuToggle,
}: {
  board: Whiteboard; isActive: boolean; onSelect: () => void;
  onRename: () => void; onDelete: () => void;
  menuOpen: boolean; onMenuToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={onSelect} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 10, padding: 6, cursor: "pointer", position: "relative",
        background: isActive ? `${board.color}12` : hovered ? "var(--fb-surface)" : "transparent",
        border: `1px solid ${isActive ? board.color + "35" : "transparent"}`,
        transition: "all 0.14s",
      }}>
      <BoardThumbnail color={board.color} title={board.title} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 5, gap: 4 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fb-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {board.title}
        </span>
        <button data-menu onClick={(e) => { e.stopPropagation(); onMenuToggle(); }}
          style={{
            background: "none", border: "none", cursor: "pointer", color: "var(--fb-muted)",
            padding: 2, borderRadius: 4, opacity: hovered || menuOpen ? 1 : 0, transition: "opacity 0.15s", flexShrink: 0,
          }}>
          <MoreHorizontal size={12} />
        </button>
      </div>
      {menuOpen && (
        <div data-menu onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute", right: 4, top: 74, zIndex: 100,
            background: "var(--fb-card)", border: "1px solid var(--fb-border)",
            borderRadius: 10, padding: 5, minWidth: 130,
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          }}>
          <MenuBtn icon={<Pencil size={13} />} label="Rename" onClick={onRename} />
          <div style={{ borderTop: "1px solid var(--fb-border)", margin: "4px 0" }} />
          <MenuBtn icon={<Trash2 size={13} />} label="Delete" onClick={onDelete} danger />
        </div>
      )}
    </div>
  );
}

// ─── Menu Button ────────────────────────────────────────────────────────────
function MenuBtn({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        width: "100%", background: hovered ? (danger ? "#fef2f2" : "var(--fb-surface)") : "none",
        border: "none", padding: "7px 10px", borderRadius: 7,
        cursor: "pointer", color: danger ? "#ef4444" : "var(--fb-text)", fontSize: 12.5,
        transition: "background 0.12s",
      }}>
      {icon} {label}
    </button>
  );
}
