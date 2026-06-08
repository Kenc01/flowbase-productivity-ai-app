import React, {
  useState, useEffect, useCallback, useRef, lazy, Suspense,
} from "react";
import {
  Plus, Trash2, Pencil, Check, X, Download, Sparkles,
  MoreHorizontal, Loader2, StickyNote, Ellipsis,
} from "lucide-react";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";

// ─── Types ──────────────────────────────────────────────────────────────────
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

// ─── Lazy Excalidraw ─────────────────────────────────────────────────────────
const ExcalidrawLazy = lazy(() =>
  import("@excalidraw/excalidraw").then((m) => ({ default: m.Excalidraw }))
);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const BOARD_COLORS = [
  "#7C3AED","#4F46E5","#0891B2","#059669",
  "#D97706","#DC2626","#DB2777","#475569",
];

// Color palettes
const STROKE_COLORS = ["#1e1e1e","#e03131","#f08c00","#2f9e44","#1971c2","#7048e8","#c2255c","#343a40"];
const FILL_COLORS   = ["#1e1e1e","#ffc9c9","#b2f2bb","#a5d8ff","#d0bfff","#fcc2d7","#fff9db","transparent"];
const TEXT_COLORS   = ["#1e1e1e","#e03131","#f08c00","#2f9e44","#1971c2","#7048e8"];
const STICKY_COLORS = [
  { bg: "#fff9db", stroke: "#e9b50d" },
  { bg: "#ffc9c9", stroke: "#e03131" },
  { bg: "#b2f2bb", stroke: "#2f9e44" },
  { bg: "#a5d8ff", stroke: "#1971c2" },
  { bg: "#d0bfff", stroke: "#7048e8" },
  { bg: "#f8f9fa", stroke: "#868e96" },
  { bg: "#ffffff", stroke: "#ced4da" },
];

// ─── Color Swatch ─────────────────────────────────────────────────────────────
function Swatch({
  color, active, onClick, outline,
}: {
  color: string; active?: boolean; onClick: () => void; outline?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={color}
      style={{
        width: 18, height: 18, borderRadius: 4, cursor: "pointer",
        border: active ? "2px solid #7C3AED" : `1.5px solid ${color === "transparent" ? "#ced4da" : color === "#ffffff" ? "#ced4da" : "rgba(0,0,0,0.15)"}`,
        background: color === "transparent"
          ? "repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%) 0 0 / 8px 8px"
          : color,
        flexShrink: 0, outline: "none", padding: 0,
        boxSizing: "border-box",
        transform: active ? "scale(1.15)" : "scale(1)",
        transition: "transform 0.12s",
      }}
    />
  );
}

// ─── Sticky Color Swatch ──────────────────────────────────────────────────────
function StickySwatch({
  sc, onClick,
}: {
  sc: { bg: string; stroke: string }; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title="Add sticky note"
      style={{
        width: 20, height: 20, borderRadius: 4, cursor: "pointer",
        background: sc.bg,
        border: `1.5px solid ${sc.stroke}`,
        flexShrink: 0, outline: "none", padding: 0,
        transition: "transform 0.12s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.2)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    />
  );
}

// ─── Rename Input ─────────────────────────────────────────────────────────────
function RenameInput({
  value, onSave, onCancel,
}: {
  value: string; onSave: (v: string) => void; onCancel: () => void;
}) {
  const [v, setV] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (v.trim()) onSave(v.trim()); }}
      style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, minWidth: 0 }}
    >
      <input
        ref={ref} value={v} onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}
        style={{
          flex: 1, background: "var(--fb-surface)", border: "1px solid #7C3AED",
          borderRadius: 5, padding: "2px 6px", fontSize: 13, color: "var(--fb-text)",
          outline: "none", minWidth: 0,
        }}
      />
      <button type="submit" style={{ padding: 2, cursor: "pointer", color: "#10b981", background: "none", border: "none" }}>
        <Check size={12} />
      </button>
      <button type="button" onClick={onCancel} style={{ padding: 2, cursor: "pointer", color: "var(--fb-muted)", background: "none", border: "none" }}>
        <X size={12} />
      </button>
    </form>
  );
}

// ─── AI Dialog ───────────────────────────────────────────────────────────────
function AIDialog({
  onClose, onGenerate,
}: {
  onClose: () => void; onGenerate: (p: string) => Promise<void>;
}) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const SUGGESTIONS = [
    "User login flowchart with error handling and password reset",
    "Mind map of React ecosystem: hooks, routing, state, testing",
    "Microservices architecture for e-commerce platform",
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
      background: "rgba(0,0,0,0.55)", backdropFilter: "blur(5px)",
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
            background: "linear-gradient(135deg, #7C3AED, #4F46E5)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Sparkles size={17} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--fb-text)" }}>AI Diagram Generator</div>
            <div style={{ fontSize: 12, color: "var(--fb-muted)" }}>Describe a diagram and AI will draw it on your board</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--fb-muted)" }}>
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <textarea
            value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder='e.g. "User authentication flowchart with login, signup, and OAuth"'
            rows={3}
            style={{
              width: "100%", background: "var(--fb-surface)", border: "1.5px solid var(--fb-border)",
              borderRadius: 10, padding: "10px 12px", fontSize: 13.5, color: "var(--fb-text)",
              resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box",
            }}
            onFocus={(e) => { e.target.style.borderColor = "#7C3AED"; }}
            onBlur={(e) => { e.target.style.borderColor = "var(--fb-border)"; }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 4, margin: "12px 0 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fb-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Quick prompts</div>
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => setPrompt(s)}
                style={{
                  background: "var(--fb-surface)", border: "1px solid var(--fb-border)",
                  borderRadius: 7, padding: "6px 10px", fontSize: 12.5, color: "var(--fb-muted)",
                  cursor: "pointer", textAlign: "left",
                }}
                onMouseEnter={(e) => { const t = e.currentTarget; t.style.borderColor = "#7C3AED"; t.style.color = "var(--fb-text)"; }}
                onMouseLeave={(e) => { const t = e.currentTarget; t.style.borderColor = "var(--fb-border)"; t.style.color = "var(--fb-muted)"; }}>
                {s}
              </button>
            ))}
          </div>
          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "8px 12px", fontSize: 12.5, color: "#dc2626", marginBottom: 12 }}>
              {error}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: "9px 14px", borderRadius: 9, background: "var(--fb-surface)", border: "1px solid var(--fb-border)", color: "var(--fb-text)", fontSize: 13.5, cursor: "pointer", fontWeight: 500 }}>
              Cancel
            </button>
            <button type="submit" disabled={loading || !prompt.trim()}
              style={{
                flex: 2, padding: "9px 14px", borderRadius: 9,
                background: loading || !prompt.trim() ? "#7C3AED60" : "linear-gradient(135deg, #7C3AED, #4F46E5)",
                border: "none", color: "#fff", fontSize: 13.5, cursor: loading ? "wait" : "pointer",
                fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
              {loading
                ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />Generating…</>
                : <><Sparkles size={14} />Generate Diagram</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function WhiteboardPage() {
  const [boards, setBoards] = useState<Whiteboard[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(false);

  // Active color selections
  const [strokeColor, setStrokeColor] = useState(STROKE_COLORS[0]);
  const [fillColor, setFillColor] = useState("transparent");
  const [textColor, setTextColor] = useState(STROKE_COLORS[0]);

  const excalidrawRef = useRef<any>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedJson = useRef<string>("[]");

  const activeBoard = boards.find((b) => b.id === activeId) ?? null;

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    api.get<Whiteboard[]>("/whiteboards").then((data) => {
      const sorted = [...data].sort(
        (a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()
      );
      setBoards(sorted);
      if (sorted.length > 0) {
        setActiveId(sorted[0].id);
        lastSavedJson.current = sorted[0].elements ?? "[]";
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // ── Create ────────────────────────────────────────────────────────────────
  const createBoard = useCallback(async () => {
    const id = uid();
    const color = BOARD_COLORS[Math.floor(Math.random() * BOARD_COLORS.length)];
    const nb: Whiteboard = { id, title: "Untitled whiteboard", color, elements: "[]", appState: "{}" };
    setBoards((prev) => [nb, ...prev]);
    setActiveId(id);
    lastSavedJson.current = "[]";
    setSaveStatus("saving");
    try {
      const saved = await api.post<Whiteboard>("/whiteboards", nb);
      setBoards((prev) => prev.map((b) => b.id === id ? saved : b));
      setSaveStatus("saved");
    } catch { setSaveStatus("unsaved"); }
  }, []);

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteBoard = useCallback(async (id: string) => {
    setBoards((prev) => {
      const next = prev.filter((b) => b.id !== id);
      if (activeId === id) setActiveId(next[0]?.id ?? null);
      return next;
    });
    setMenuOpenId(null);
    await api.delete(`/whiteboards/${id}`).catch(() => {});
  }, [activeId]);

  // ── Rename ────────────────────────────────────────────────────────────────
  const renameBoard = useCallback(async (id: string, title: string) => {
    setBoards((prev) => prev.map((b) => b.id === id ? { ...b, title } : b));
    setRenamingId(null);
    await api.put(`/whiteboards/${id}`, { title }).catch(() => {});
  }, []);

  // ── Auto-save (debounced) ─────────────────────────────────────────────────
  const scheduleSave = useCallback((id: string, elemJson: string, asJson: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("unsaved");
    saveTimer.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await api.put(`/whiteboards/${id}`, { elements: elemJson, appState: asJson });
        lastSavedJson.current = elemJson;
        setBoards((prev) => prev.map((b) =>
          b.id === id ? { ...b, elements: elemJson, updatedAt: new Date().toISOString() } : b
        ));
        setSaveStatus("saved");
      } catch { setSaveStatus("unsaved"); }
    }, 1800);
  }, []);

  const handleChange = useCallback((elements: readonly any[], appState: any) => {
    if (!activeId) return;
    const json = JSON.stringify(elements);
    if (json === lastSavedJson.current) { setSaveStatus("saved"); return; }
    scheduleSave(
      activeId, json,
      JSON.stringify({ zoom: appState.zoom, scrollX: appState.scrollX, scrollY: appState.scrollY })
    );
  }, [activeId, scheduleSave]);

  // ── Color → Excalidraw ────────────────────────────────────────────────────
  const applyStroke = useCallback((color: string) => {
    setStrokeColor(color);
    excalidrawRef.current?.updateScene({ appState: { currentItemStrokeColor: color } });
  }, []);
  const applyFill = useCallback((color: string) => {
    setFillColor(color);
    excalidrawRef.current?.updateScene({
      appState: {
        currentItemBackgroundColor: color === "transparent" ? "transparent" : color,
        currentItemFillStyle: color === "transparent" ? "solid" : "solid",
      },
    });
  }, []);
  const applyText = useCallback((color: string) => {
    setTextColor(color);
    excalidrawRef.current?.updateScene({ appState: { currentItemStrokeColor: color } });
  }, []);

  // ── Add Sticky Note ───────────────────────────────────────────────────────
  const addSticky = useCallback((sc: { bg: string; stroke: string }) => {
    if (!excalidrawRef.current) return;
    const existing = excalidrawRef.current.getSceneElements() ?? [];
    const appState = excalidrawRef.current.getAppState();
    const cx = (appState.scrollX ?? 0) * -1 + 300;
    const cy = (appState.scrollY ?? 0) * -1 + 200;
    const sticky = {
      id: uid(),
      type: "rectangle" as const,
      x: cx + Math.random() * 40 - 20,
      y: cy + Math.random() * 40 - 20,
      width: 160,
      height: 120,
      angle: 0,
      strokeColor: sc.stroke,
      backgroundColor: sc.bg,
      fillStyle: "solid" as const,
      strokeWidth: 1,
      strokeStyle: "solid" as const,
      roughness: 0,
      opacity: 100,
      groupIds: [],
      roundness: { type: 3 },
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
      frameId: null,
      seed: Math.floor(Math.random() * 100000),
      version: 1,
      versionNonce: Math.floor(Math.random() * 100000),
      index: `a${existing.length}`,
    };
    excalidrawRef.current.updateScene({ elements: [...existing, sticky] });
  }, []);

  // ── Export PNG ────────────────────────────────────────────────────────────
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

  // ── AI Generate ───────────────────────────────────────────────────────────
  const generateDiagram = useCallback(async (prompt: string) => {
    const data = await api.post<{ elements: any[]; title: string }>("/ai-diagram", { prompt });
    if (!excalidrawRef.current) return;
    const existing = excalidrawRef.current.getSceneElements() ?? [];
    const shifted = data.elements.map((el: any) => ({ ...el, x: el.x + 80, y: el.y + 80 }));
    excalidrawRef.current.updateScene({ elements: [...existing, ...shifted] });
  }, []);

  const switchBoard = useCallback((board: Whiteboard) => {
    setActiveId(board.id);
    lastSavedJson.current = board.elements ?? "[]";
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

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpenId) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-menu]")) setMenuOpenId(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpenId]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--fb-bg)" }}>

      {/* ── App Sidebar ── */}
      <Sidebar />

      {/* ── Board List Panel ── */}
      <div style={{
        width: 220, flexShrink: 0,
        borderRight: "1px solid var(--fb-border)",
        display: "flex", flexDirection: "column",
        background: "var(--fb-card)",
        overflow: "hidden",
      }}>
        {/* Panel header */}
        <div style={{ padding: "16px 14px 10px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
            <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--fb-text)" }}>Whiteboards</span>
            <button
              onClick={createBoard}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                background: "linear-gradient(135deg, #7C3AED, #4F46E5)",
                border: "none", borderRadius: 7, padding: "4px 10px",
                color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              }}>
              <Plus size={12} /> New
            </button>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--fb-muted)", marginBottom: 10 }}>
            {boards.length} {boards.length === 1 ? "board" : "boards"}
          </div>
        </div>

        {/* Board list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: "var(--fb-muted)" }} />
            </div>
          ) : boards.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 12px", color: "var(--fb-muted)", fontSize: 12.5 }}>
              No whiteboards yet.<br />Create one to start!
            </div>
          ) : (
            boards.map((board) => (
              <BoardItem
                key={board.id}
                board={board}
                isActive={board.id === activeId}
                isRenaming={renamingId === board.id}
                onSelect={() => switchBoard(board)}
                onRenameStart={() => setRenamingId(board.id)}
                onRenameSave={(t) => renameBoard(board.id, t)}
                onRenameCancel={() => setRenamingId(null)}
                onDelete={() => deleteBoard(board.id)}
                menuOpen={menuOpenId === board.id}
                onMenuToggle={() => setMenuOpenId(menuOpenId === board.id ? null : board.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Canvas Area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* ── Title bar ── */}
        <div style={{
          height: 40, display: "flex", alignItems: "center",
          padding: "0 16px", borderBottom: "1px solid var(--fb-border)",
          background: "var(--fb-card)", gap: 8, flexShrink: 0,
        }}>
          {activeBoard ? (
            <>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "#22c55e", flexShrink: 0,
              }} />
              <span style={{ fontWeight: 600, fontSize: 13.5, color: "var(--fb-text)" }}>
                {activeBoard.title}
              </span>
              <span style={{ fontSize: 12, color: "var(--fb-muted)" }}>
                {saveStatus === "saving" && "Saving..."}
                {saveStatus === "saved" && ""}
                {saveStatus === "unsaved" && "Unsaved changes"}
              </span>
            </>
          ) : (
            <span style={{ fontSize: 13, color: "var(--fb-muted)" }}>No board selected</span>
          )}
        </div>

        {/* ── Color toolbar ── */}
        {activeBoard && (
          <div style={{
            borderBottom: "1px solid var(--fb-border)",
            background: "var(--fb-card)",
            padding: "6px 14px",
            display: "flex", flexDirection: "column", gap: 5, flexShrink: 0,
          }}>
            {/* Row 1: Stroke / Fill / Text */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 11.5, color: "var(--fb-muted)", fontWeight: 500, minWidth: 32 }}>Stroke</span>
                <div style={{ display: "flex", gap: 3 }}>
                  {STROKE_COLORS.map((c) => (
                    <Swatch key={c} color={c} active={strokeColor === c} onClick={() => applyStroke(c)} />
                  ))}
                </div>
              </div>
              <div style={{ width: 1, height: 16, background: "var(--fb-border)", flexShrink: 0 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 11.5, color: "var(--fb-muted)", fontWeight: 500, minWidth: 18 }}>Fill</span>
                <div style={{ display: "flex", gap: 3 }}>
                  {FILL_COLORS.map((c) => (
                    <Swatch key={c} color={c} active={fillColor === c} onClick={() => applyFill(c)} />
                  ))}
                </div>
              </div>
              <div style={{ width: 1, height: 16, background: "var(--fb-border)", flexShrink: 0 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 11.5, color: "var(--fb-muted)", fontWeight: 500, minWidth: 24 }}>Text</span>
                <div style={{ display: "flex", gap: 3 }}>
                  {TEXT_COLORS.map((c) => (
                    <Swatch key={c} color={c} active={textColor === c} onClick={() => applyText(c)} />
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2: Sticky colors */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11.5, color: "var(--fb-muted)", fontWeight: 500, minWidth: 32 }}>Sticky</span>
              <div style={{ display: "flex", gap: 3 }}>
                {STICKY_COLORS.map((sc, i) => (
                  <StickySwatch key={i} sc={sc} onClick={() => addSticky(sc)} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Action buttons ── */}
        {activeBoard && (
          <div style={{
            height: 38, display: "flex", alignItems: "center",
            padding: "0 14px", borderBottom: "1px solid var(--fb-border)",
            background: "var(--fb-card)", gap: 6, flexShrink: 0,
          }}>
            <ActionBtn icon={<StickyNote size={13} />} label="Sticky"
              onClick={() => addSticky(STICKY_COLORS[0])} />
            <ActionBtn icon={<Sparkles size={13} />} label="AI Diagram"
              onClick={() => setShowAI(true)} />
            <ActionBtn icon={<Download size={13} />} label="Export PNG"
              onClick={exportPNG} primary />
            <button
              style={{
                background: "none", border: "1px solid var(--fb-border)",
                borderRadius: 7, padding: "4px 8px", cursor: "pointer",
                color: "var(--fb-muted)", display: "flex", alignItems: "center",
              }}>
              <Ellipsis size={14} />
            </button>
          </div>
        )}

        {/* ── Excalidraw canvas ── */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          {!activeBoard ? (
            <div style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", color: "var(--fb-muted)",
            }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>🎨</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: "var(--fb-text)", marginBottom: 6 }}>No board selected</div>
              <div style={{ fontSize: 13, marginBottom: 22, textAlign: "center", maxWidth: 260 }}>
                Create a whiteboard to start drawing
              </div>
              <button onClick={createBoard}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "linear-gradient(135deg, #7C3AED, #4F46E5)",
                  border: "none", borderRadius: 10, padding: "10px 22px",
                  color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
                }}>
                <Plus size={15} /> New Whiteboard
              </button>
            </div>
          ) : (
            <Suspense fallback={
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "#7C3AED" }} />
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
                      currentItemStrokeColor: strokeColor,
                      currentItemBackgroundColor: fillColor === "transparent" ? "transparent" : fillColor,
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
      `}</style>
    </div>
  );
}

// ─── Board Item ───────────────────────────────────────────────────────────────
function BoardItem({
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
        borderRadius: 9, padding: "8px 10px", marginBottom: 2,
        cursor: "pointer", position: "relative",
        background: isActive
          ? `${board.color}18`
          : hovered ? "var(--fb-surface)" : "transparent",
        border: `1px solid ${isActive ? board.color + "40" : "transparent"}`,
        transition: "all 0.13s",
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: board.color, flexShrink: 0,
        }} />
        {isRenaming ? (
          <RenameInput value={board.title} onSave={onRenameSave} onCancel={onRenameCancel} />
        ) : (
          <>
            <span style={{
              flex: 1, fontSize: 13, fontWeight: isActive ? 600 : 400,
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
                color: "var(--fb-muted)", padding: 2, borderRadius: 4,
                opacity: hovered || menuOpen ? 1 : 0, transition: "opacity 0.13s", flexShrink: 0,
              }}>
              <MoreHorizontal size={13} />
            </button>
          </>
        )}
      </div>
      {!isRenaming && (
        <div style={{ fontSize: 11, color: "var(--fb-muted)", marginTop: 2, paddingLeft: 16 }}>
          {timeAgo(board.updatedAt)}
        </div>
      )}

      {/* Dropdown */}
      {menuOpen && (
        <div data-menu onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute", right: 6, top: 34, zIndex: 200,
            background: "var(--fb-card)", border: "1px solid var(--fb-border)",
            borderRadius: 9, padding: 4, minWidth: 130,
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          }}>
          <MnuBtn icon={<Pencil size={12} />} label="Rename" onClick={onRenameStart} />
          <div style={{ borderTop: "1px solid var(--fb-border)", margin: "3px 0" }} />
          <MnuBtn icon={<Trash2 size={12} />} label="Delete" onClick={onDelete} danger />
        </div>
      )}
    </div>
  );
}

// ─── Action Button ────────────────────────────────────────────────────────────
function ActionBtn({
  icon, label, onClick, primary,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        background: primary
          ? hov ? "#dc2626" : "#ef4444"
          : hov ? "var(--fb-surface)" : "transparent",
        border: primary ? "none" : "1px solid var(--fb-border)",
        borderRadius: 7, padding: "4px 10px",
        color: primary ? "#fff" : "var(--fb-text)",
        fontSize: 12.5, fontWeight: 500, cursor: "pointer",
        transition: "all 0.12s",
      }}>
      {icon} {label}
    </button>
  );
}

// ─── Menu Button ──────────────────────────────────────────────────────────────
function MnuBtn({
  icon, label, onClick, danger,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 7, width: "100%",
        background: hov ? (danger ? "#fef2f2" : "var(--fb-surface)") : "none",
        border: "none", padding: "6px 9px", borderRadius: 6,
        cursor: "pointer", color: danger ? "#ef4444" : "var(--fb-text)",
        fontSize: 12.5, transition: "background 0.1s",
      }}>
      {icon} {label}
    </button>
  );
}
