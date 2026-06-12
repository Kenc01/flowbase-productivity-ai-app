import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  NotebookPen, Plus, Search, X, Pin, PinOff,
  Trash2, Copy, MoreHorizontal, Clock, Star,
  FileText, Inbox, Smile, Mic, MicOff, Loader2,
} from "lucide-react";
import { api } from "../../../lib/api";
import TiptapEditor, { type TiptapEditorHandle } from "../../../components/notes/TiptapEditor";
import { useAssemblyAIStreaming, type StreamingStatus } from "../../../hooks/useAssemblyAIStreaming";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  symbol: string;
  pinned: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTE_COLORS = [
  { hex: "#7467F0", label: "Violet" },
  { hex: "#06B6D4", label: "Cyan" },
  { hex: "#10B981", label: "Emerald" },
  { hex: "#F59E0B", label: "Amber" },
  { hex: "#F43F5E", label: "Rose" },
  { hex: "#A855F7", label: "Purple" },
  { hex: "#EC4899", label: "Pink" },
  { hex: "#14B8A6", label: "Teal" },
  { hex: "#64748B", label: "Slate" },
];

const NOTE_SYMBOLS = [
  "📝", "📓", "📔", "📒", "📕", "📗", "📘", "📙",
  "💡", "⭐", "🔥", "💎", "🎯", "🚀", "🌟", "✨",
  "💼", "🗂️", "📌", "🔖", "🏷️", "📎", "✏️", "🖊️",
  "💭", "💬", "🧠", "🎨", "🎵", "📊", "📈", "🔑",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
  "🌈", "☁️", "⚡", "🌙", "☀️", "🌺", "🍀", "🦋",
];

function uid() { return Math.random().toString(36).slice(2, 10); }

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

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// ─── Symbol Picker ────────────────────────────────────────────────────────────

function SymbolPicker({ current, onSelect, onClose }: {
  current: string;
  onSelect: (symbol: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-1 rounded-2xl shadow-2xl p-3 z-50"
      style={{ background: "var(--fb-surface)", border: "1px solid var(--fb-border)", width: "220px" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: "var(--fb-text-muted)" }}>
        Choose a symbol
      </p>
      <div className="grid grid-cols-8 gap-0.5">
        {NOTE_SYMBOLS.map(sym => (
          <button
            key={sym}
            onClick={() => { onSelect(sym); onClose(); }}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-base transition-all hover:scale-125 hover:bg-gray-100"
            style={{
              background: sym === current ? "var(--fb-muted)" : "transparent",
              outline: sym === current ? "2px solid #7467F0" : "none",
              outlineOffset: "1px",
            }}
            title={sym}
          >
            {sym}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Note Card ────────────────────────────────────────────────────────────────

function NoteCard({
  note, isActive, onClick, onPin, onDuplicate, onDelete, onColorChange, onRename, onSymbolChange,
}: {
  note: Note;
  isActive: boolean;
  onClick: () => void;
  onPin: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onColorChange: (color: string) => void;
  onRename: (title: string) => void;
  onSymbolChange: (symbol: string) => void;
}) {
  const [menu, setMenu] = useState(false);
  const [colorPicker, setColorPicker] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(note.title);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(false);
        setColorPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (renaming) renameRef.current?.select();
  }, [renaming]);

  const preview = stripHtml(note.content).slice(0, 90) || "No content yet…";

  const commitRename = () => {
    const trimmed = renameVal.trim();
    if (trimmed && trimmed !== note.title) onRename(trimmed);
    else setRenameVal(note.title);
    setRenaming(false);
  };

  return (
    <div
      onClick={onClick}
      className="group relative rounded-2xl p-3.5 cursor-pointer transition-all hover:shadow-md"
      style={{
        background: isActive ? `${note.color}12` : "var(--fb-surface)",
        border: `1.5px solid ${isActive ? note.color + "55" : "var(--fb-border)"}`,
      }}
    >
      {/* Color bar */}
      <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full" style={{ background: note.color }} />

      <div className="flex items-start gap-2 pl-2">
        {/* Symbol badge */}
        <div
          className="shrink-0 w-7 h-7 rounded-xl flex items-center justify-center text-base mt-0.5"
          style={{ background: `${note.color}18` }}
        >
          {note.symbol || "📝"}
        </div>

        <div className="flex-1 min-w-0">
          {renaming ? (
            <input
              ref={renameRef}
              value={renameVal}
              onChange={e => setRenameVal(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") { setRenameVal(note.title); setRenaming(false); }
              }}
              onClick={e => e.stopPropagation()}
              className="w-full text-sm font-semibold outline-none bg-transparent border-b"
              style={{ color: "var(--fb-text)", borderColor: note.color }}
            />
          ) : (
            <p className="text-sm font-semibold truncate" style={{ color: "var(--fb-text)" }}>
              {note.pinned && (
                <Star size={10} className="inline mr-1 mb-0.5" style={{ color: note.color, fill: note.color }} />
              )}
              {note.title}
            </p>
          )}
          <p className="text-xs mt-0.5 leading-relaxed line-clamp-2" style={{ color: "var(--fb-text-muted)" }}>
            {preview}
          </p>
        </div>

        {/* Context menu */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={e => { e.stopPropagation(); setMenu(m => !m); setColorPicker(false); }}
            className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:bg-gray-100"
            style={{ color: "var(--fb-text-muted)" }}
          >
            <MoreHorizontal size={13} />
          </button>

          {menu && (
            <div
              className="absolute right-0 top-7 rounded-xl shadow-xl py-1 min-w-40 z-30"
              style={{ background: "var(--fb-surface)", border: "1px solid var(--fb-border)" }}
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => { setRenaming(true); setMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 text-left"
                style={{ color: "var(--fb-text)" }}>
                <FileText size={11} /> Rename
              </button>
              <button onClick={() => { onPin(); setMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 text-left"
                style={{ color: "var(--fb-text)" }}>
                {note.pinned ? <><PinOff size={11} /> Unpin</> : <><Pin size={11} /> Pin</>}
              </button>
              <button onClick={() => { onDuplicate(); setMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 text-left"
                style={{ color: "var(--fb-text)" }}>
                <Copy size={11} /> Duplicate
              </button>
              <button
                onClick={() => setColorPicker(p => !p)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 text-left"
                style={{ color: "var(--fb-text)" }}>
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: note.color }} />
                Color
              </button>
              {colorPicker && (
                <div className="flex flex-wrap gap-1.5 px-3 py-2">
                  {NOTE_COLORS.map(c => (
                    <button
                      key={c.hex}
                      onClick={() => { onColorChange(c.hex); setMenu(false); setColorPicker(false); }}
                      className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ background: c.hex, borderColor: note.color === c.hex ? "#1a1f36" : "transparent" }}
                      title={c.label}
                    />
                  ))}
                </div>
              )}
              <div className="my-1 h-px" style={{ background: "var(--fb-border)" }} />
              <button onClick={() => { onDelete(); setMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-red-50 text-left"
                style={{ color: "#F43F5E" }}>
                <Trash2 size={11} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1.5 mt-2 pl-2">
        <Clock size={9} style={{ color: "var(--fb-text-muted)" }} />
        <span className="text-[10px]" style={{ color: "var(--fb-text-muted)" }}>
          {timeAgo(note.updatedAt || note.createdAt)}
        </span>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyEditor() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#EEF0FF" }}>
        <NotebookPen size={28} color="#7467F0" strokeWidth={1.5} />
      </div>
      <div className="text-center">
        <p className="text-base font-semibold mb-1" style={{ color: "var(--fb-text)" }}>No note selected</p>
        <p className="text-sm" style={{ color: "var(--fb-text-muted)" }}>
          Pick a note from the left, or create a new one.
        </p>
      </div>
    </div>
  );
}

// ─── Live Transcript Preview Banner ─────────────────────────────────────────

function TranscriptPreview({ text, noteColor }: { text: string; noteColor: string }) {
  if (!text) return null;
  return (
    <div
      className="mx-6 mt-3 mb-0 px-4 py-2.5 rounded-xl flex items-start gap-3 animate-pulse-subtle"
      style={{
        background: `${noteColor}0D`,
        border: `1px solid ${noteColor}30`,
        borderLeft: `3px solid ${noteColor}`,
      }}
    >
      {/* Waveform dots */}
      <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="w-0.5 rounded-full"
            style={{
              background: noteColor,
              height: `${8 + (i % 3) * 4}px`,
              animation: `stt-wave 0.8s ease-in-out infinite`,
              animationDelay: `${i * 0.12}s`,
            }}
          />
        ))}
      </div>
      <p className="text-sm italic leading-snug flex-1" style={{ color: "var(--fb-text-muted)" }}>
        {text}
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [trashOpen, setTrashOpen] = useState(false);
  const [trash, setTrash] = useState<Note[]>([]);
  const [symbolPickerOpen, setSymbolPickerOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesRef = useRef<Note[]>([]);

  // ── STT state ────────────────────────────────────────────────────────────
  const [sttStatus, setSttStatus] = useState<StreamingStatus>("idle");
  const [partialTranscript, setPartialTranscript] = useState("");
  const [sttError, setSttError] = useState<string | null>(null);
  const editorRef = useRef<TiptapEditorHandle>(null);

  useEffect(() => { notesRef.current = notes; }, [notes]);

  // Load notes
  useEffect(() => {
    api.get<Note[]>("/notes")
      .then(data => {
        setNotes(data);
        if (data.length > 0) setActiveId(data[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activeNote = notes.find(n => n.id === activeId) ?? null;

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const createNote = useCallback(async () => {
    const color = NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)].hex;
    const symbol = NOTE_SYMBOLS[Math.floor(Math.random() * 16)];
    const note: Note = { id: uid(), title: "Untitled Note", content: "", color, symbol, pinned: false };
    setNotes(p => [note, ...p]);
    setActiveId(note.id);
    try { await api.post("/notes", note); } catch (e) { console.error(e); }
  }, []);

  const updateNote = useCallback((id: string, patch: Partial<Note>) => {
    setNotes(p => p.map(n => n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n));
    setSaving("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const note = notesRef.current.find(n => n.id === id);
      if (!note) return;
      try {
        await api.put(`/notes/${id}`, { ...note, ...patch });
        setSaving("saved");
        setTimeout(() => setSaving("idle"), 1500);
      } catch (e) { console.error(e); setSaving("idle"); }
    }, 800);
  }, []);

  const updateContent = useCallback((html: string) => {
    if (!activeId) return;
    setNotes(p => p.map(n => n.id === activeId ? { ...n, content: html, updatedAt: new Date().toISOString() } : n));
    setSaving("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const note = notesRef.current.find(n => n.id === activeId);
      if (!note) return;
      try {
        await api.put(`/notes/${activeId}`, { ...note, content: html });
        setSaving("saved");
        setTimeout(() => setSaving("idle"), 1500);
      } catch (e) { console.error(e); setSaving("idle"); }
    }, 1000);
  }, [activeId]);

  const deleteNote = useCallback((id: string) => {
    const note = notesRef.current.find(n => n.id === id);
    if (note) setTrash(p => [{ ...note }, ...p]);
    setNotes(p => {
      const remaining = p.filter(n => n.id !== id);
      if (activeId === id) setActiveId(remaining[0]?.id ?? null);
      return remaining;
    });
    api.delete(`/notes/${id}`).catch(console.error);
  }, [activeId]);

  const restoreNote = useCallback(async (note: Note) => {
    setTrash(p => p.filter(n => n.id !== note.id));
    setNotes(p => [note, ...p]);
    setActiveId(note.id);
    try { await api.post("/notes", note); } catch (e) { console.error(e); }
  }, []);

  const permanentDelete = useCallback((id: string) => {
    setTrash(p => p.filter(n => n.id !== id));
  }, []);

  const duplicateNote = useCallback(async (note: Note) => {
    const dup: Note = { ...note, id: uid(), title: `${note.title} (copy)`, pinned: false };
    setNotes(p => [dup, ...p]);
    setActiveId(dup.id);
    try { await api.post("/notes", dup); } catch (e) { console.error(e); }
  }, []);

  const togglePin = useCallback((id: string) => {
    const note = notesRef.current.find(n => n.id === id);
    if (!note) return;
    updateNote(id, { pinned: !note.pinned });
  }, [updateNote]);

  // ── STT handlers ─────────────────────────────────────────────────────────

  const handleFinalTranscript = useCallback((text: string) => {
    editorRef.current?.insertTranscript(text);
    setPartialTranscript("");
  }, []);

  const handleSttError = useCallback((msg: string) => {
    setSttError(msg);
    setTimeout(() => setSttError(null), 6000);
  }, []);

  const { startRecording, stopRecording } = useAssemblyAIStreaming({
    onPartialTranscript: setPartialTranscript,
    onFinalTranscript: handleFinalTranscript,
    onError: handleSttError,
    onStatusChange: setSttStatus,
  });

  const handleSpeakClick = useCallback(() => {
    if (sttStatus === "idle") {
      setSttError(null);
      startRecording();
    } else {
      stopRecording();
    }
  }, [sttStatus, startRecording, stopRecording]);

  // Stop recording if note changes
  useEffect(() => {
    if (sttStatus !== "idle") {
      stopRecording();
      setPartialTranscript("");
    }
  }, [activeId]);

  // ── Filtering & sorting ───────────────────────────────────────────────────

  const filtered = notes
    .filter(n => {
      const q = search.toLowerCase();
      return !q || n.title.toLowerCase().includes(q) || stripHtml(n.content).toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
    });

  const pinned = filtered.filter(n => n.pinned);
  const unpinned = filtered.filter(n => !n.pinned);

  const isRecording = sttStatus === "recording";
  const isConnecting = sttStatus === "connecting";
  const isStopping = sttStatus === "stopping";
  const isBusy = isConnecting || isStopping;

  if (loading) return (
    <div className="flex items-center justify-center h-full" style={{ background: "var(--fb-bg)" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "#7467F022", borderTopColor: "#7467F0" }} />
        <p className="text-sm" style={{ color: "var(--fb-text-muted)" }}>Loading notes…</p>
      </div>
    </div>
  );

  return (
    <>
      {/* ── STT waveform animation keyframes ── */}
      <style>{`
        @keyframes stt-wave {
          0%, 100% { transform: scaleY(0.5); opacity: 0.6; }
          50% { transform: scaleY(1); opacity: 1; }
        }
        @keyframes stt-ring {
          0% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(244, 63, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); }
        }
        .stt-btn-recording {
          animation: stt-ring 1.4s ease-out infinite;
        }
      `}</style>

      <div className="flex h-full overflow-hidden" style={{ background: "var(--fb-bg)" }}>

        {/* ── Left Panel ── */}
        <div
          className="flex flex-col shrink-0 overflow-hidden"
          style={{ width: "272px", borderRight: "1px solid var(--fb-border)", background: "var(--fb-surface)" }}
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-3 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "#EEF0FF" }}>
                  <NotebookPen size={14} color="#7467F0" />
                </div>
                <h2 className="text-sm font-bold" style={{ color: "var(--fb-text)" }}>Notes</h2>
                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: "#EEF0FF", color: "#7467F0" }}>
                  {notes.length}
                </span>
              </div>
              <button
                onClick={createNote}
                className="w-7 h-7 rounded-xl flex items-center justify-center text-white transition-all hover:scale-110 hover:shadow-md"
                style={{ background: "#7467F0" }}
                title="New Note"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "var(--fb-muted)", border: "1px solid var(--fb-border)" }}>
              <Search size={13} style={{ color: "var(--fb-text-muted)" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search notes…"
                className="flex-1 text-xs outline-none bg-transparent"
                style={{ color: "var(--fb-text)" }}
              />
              {search && (
                <button onClick={() => setSearch("")}>
                  <X size={11} style={{ color: "var(--fb-text-muted)" }} />
                </button>
              )}
            </div>
          </div>

          {/* Note list */}
          <div className="flex-1 overflow-y-auto px-3 pb-2 flex flex-col gap-1.5">
            {filtered.length === 0 && !search && (
              <div className="flex flex-col items-center gap-3 py-10">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "#EEF0FF" }}>
                  <NotebookPen size={18} color="#7467F0" strokeWidth={1.5} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--fb-text)" }}>No notes yet</p>
                  <p className="text-xs" style={{ color: "var(--fb-text-muted)" }}>Click + to create your first note.</p>
                </div>
              </div>
            )}
            {search && filtered.length === 0 && (
              <p className="text-xs text-center py-8" style={{ color: "var(--fb-text-muted)" }}>No notes match "{search}"</p>
            )}

            {/* Pinned section */}
            {pinned.length > 0 && (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wider px-1 pt-1" style={{ color: "var(--fb-text-muted)" }}>
                  Pinned
                </p>
                {pinned.map(note => (
                  <NoteCard key={note.id} note={note} isActive={activeId === note.id}
                    onClick={() => setActiveId(note.id)}
                    onPin={() => togglePin(note.id)}
                    onDuplicate={() => duplicateNote(note)}
                    onDelete={() => deleteNote(note.id)}
                    onColorChange={color => updateNote(note.id, { color })}
                    onRename={title => updateNote(note.id, { title })}
                    onSymbolChange={symbol => updateNote(note.id, { symbol })}
                  />
                ))}
              </>
            )}

            {/* All / Recent */}
            {unpinned.length > 0 && (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wider px-1 pt-1" style={{ color: "var(--fb-text-muted)" }}>
                  {pinned.length > 0 ? "Recent" : "All Notes"}
                </p>
                {unpinned.map(note => (
                  <NoteCard key={note.id} note={note} isActive={activeId === note.id}
                    onClick={() => setActiveId(note.id)}
                    onPin={() => togglePin(note.id)}
                    onDuplicate={() => duplicateNote(note)}
                    onDelete={() => deleteNote(note.id)}
                    onColorChange={color => updateNote(note.id, { color })}
                    onRename={title => updateNote(note.id, { title })}
                    onSymbolChange={symbol => updateNote(note.id, { symbol })}
                  />
                ))}
              </>
            )}
          </div>

          {/* Trash section */}
          <div className="shrink-0 px-3 pb-3" style={{ borderTop: "1px solid var(--fb-border)" }}>
            <button
              onClick={() => setTrashOpen(o => !o)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:bg-gray-50 mt-2"
              style={{ color: "var(--fb-text-muted)" }}
            >
              <Inbox size={13} />
              Trash
              {trash.length > 0 && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#FEE2E2", color: "#F43F5E" }}>
                  {trash.length}
                </span>
              )}
            </button>

            {trashOpen && (
              <div className="mt-1 flex flex-col gap-1">
                {trash.length === 0
                  ? <p className="text-[10px] text-center py-2" style={{ color: "var(--fb-text-muted)" }}>Trash is empty</p>
                  : trash.map(note => (
                    <div key={note.id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl" style={{ background: "var(--fb-muted)" }}>
                      <span className="text-sm shrink-0">{note.symbol || "📝"}</span>
                      <span className="flex-1 text-xs truncate" style={{ color: "var(--fb-text-muted)" }}>{note.title}</span>
                      <button onClick={() => restoreNote(note)}
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                        style={{ color: "#7467F0", background: "#EEF0FF" }}>
                        Restore
                      </button>
                      <button onClick={() => permanentDelete(note.id)} className="text-[10px] shrink-0" style={{ color: "#F43F5E" }}>✕</button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Editor ── */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "var(--fb-bg)" }}>
          {activeNote ? (
            <>
              {/* Note header */}
              <div
                className="flex items-center justify-between px-8 py-3.5 shrink-0"
                style={{ borderBottom: "1px solid var(--fb-border)", background: "var(--fb-surface)" }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Symbol button — click to open picker */}
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setSymbolPickerOpen(o => !o)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-xl transition-all hover:scale-110 hover:shadow-md"
                      style={{ background: `${activeNote.color}20` }}
                      title="Change symbol"
                    >
                      {activeNote.symbol || "📝"}
                    </button>
                    {symbolPickerOpen && (
                      <SymbolPicker
                        current={activeNote.symbol || "📝"}
                        onSelect={symbol => updateNote(activeNote.id, { symbol })}
                        onClose={() => setSymbolPickerOpen(false)}
                      />
                    )}
                  </div>

                  <input
                    value={activeNote.title}
                    onChange={e => updateNote(activeNote.id, { title: e.target.value })}
                    className="flex-1 text-lg font-bold outline-none bg-transparent truncate"
                    style={{ color: "var(--fb-text)" }}
                    placeholder="Note title…"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {/* Save status */}
                  <span className="text-xs transition-all" style={{
                    color: saving === "saving" ? "#F59E0B" : saving === "saved" ? "#10B981" : "transparent",
                  }}>
                    {saving === "saving" ? "Saving…" : "Saved ✓"}
                  </span>

                  {/* ── Speak to Note button ── */}
                  <div className="relative">
                    <button
                      id="speak-to-note-btn"
                      onClick={handleSpeakClick}
                      disabled={isBusy}
                      title={isRecording ? "Stop Recording" : "Speak to Note"}
                      className={[
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                        isRecording
                          ? "stt-btn-recording"
                          : "hover:scale-105",
                        isBusy ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
                      ].join(" ")}
                      style={{
                        background: isRecording
                          ? "#F43F5E"
                          : isConnecting
                          ? "#F59E0B"
                          : "#EEF0FF",
                        color: isRecording || isConnecting ? "#fff" : "#7467F0",
                      }}
                    >
                      {isConnecting ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : isStopping ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : isRecording ? (
                        <>
                          {/* Pulsing mic indicator */}
                          <span className="relative flex items-center justify-center w-3 h-3">
                            <span
                              className="absolute inline-flex h-full w-full rounded-full opacity-75"
                              style={{ background: "#fff", animation: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite" }}
                            />
                            <MicOff size={11} />
                          </span>
                          Stop
                        </>
                      ) : (
                        <Mic size={13} />
                      )}
                      <span>
                        {isConnecting
                          ? "Connecting…"
                          : isStopping
                          ? "Stopping…"
                          : isRecording
                          ? "Recording"
                          : "Speak to Note"}
                      </span>
                    </button>
                  </div>

                  {/* Pin */}
                  <button onClick={() => togglePin(activeNote.id)}
                    className="w-7 h-7 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: activeNote.pinned ? "#FEF6DC" : "var(--fb-muted)" }}
                    title={activeNote.pinned ? "Unpin" : "Pin"}>
                    <Star size={13} style={{ color: activeNote.pinned ? "#F59E0B" : "var(--fb-text-muted)", fill: activeNote.pinned ? "#F59E0B" : "none" }} />
                  </button>

                  {/* Color picker */}
                  <div className="relative group/cp">
                    <button
                      className="w-6 h-6 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-110"
                      style={{ background: activeNote.color }}
                      title="Note color"
                    />
                    <div className="absolute right-0 top-8 rounded-xl shadow-xl p-2.5 hidden group-hover/cp:flex flex-wrap gap-1.5 z-20"
                      style={{ background: "var(--fb-surface)", border: "1px solid var(--fb-border)" }}>
                      {NOTE_COLORS.map(c => (
                        <button key={c.hex} onClick={() => updateNote(activeNote.id, { color: c.hex })}
                          className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-125"
                          style={{ background: c.hex, borderColor: activeNote.color === c.hex ? "#1a1f36" : "transparent" }}
                          title={c.label} />
                      ))}
                    </div>
                  </div>

                  {/* Symbol picker shortcut */}
                  <button
                    onClick={() => setSymbolPickerOpen(o => !o)}
                    className="w-7 h-7 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: "var(--fb-muted)" }}
                    title="Change symbol"
                  >
                    <Smile size={13} style={{ color: "var(--fb-text-muted)" }} />
                  </button>
                </div>
              </div>

              {/* STT error banner */}
              {sttError && (
                <div
                  className="mx-6 mt-3 px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm"
                  style={{ background: "#FEE2E2", border: "1px solid #FECACA", color: "#F43F5E" }}
                >
                  <MicOff size={14} />
                  <span className="flex-1">{sttError}</span>
                  <button onClick={() => setSttError(null)} className="shrink-0 opacity-60 hover:opacity-100">
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Live transcript preview */}
              {isRecording && (
                <TranscriptPreview text={partialTranscript} noteColor={activeNote.color} />
              )}

              {/* Tiptap editor */}
              <div className="flex-1 overflow-hidden">
                <TiptapEditor
                  ref={editorRef}
                  key={activeNote.id}
                  content={activeNote.content}
                  onChange={updateContent}
                  noteId={activeNote.id}
                  onRequestSave={() => {
                    // updateContent is already called inside insertTranscript via onChange;
                    // this is an additional explicit save trigger to ensure debounce fires
                    const note = notesRef.current.find(n => n.id === activeId);
                    if (!note) return;
                    setSaving("saving");
                    if (saveTimer.current) clearTimeout(saveTimer.current);
                    saveTimer.current = setTimeout(async () => {
                      const latest = notesRef.current.find(n => n.id === activeId);
                      if (!latest) return;
                      try {
                        await api.put(`/notes/${activeId}`, latest);
                        setSaving("saved");
                        setTimeout(() => setSaving("idle"), 1500);
                      } catch (e) { console.error(e); setSaving("idle"); }
                    }, 600);
                  }}
                />
              </div>
            </>
          ) : (
            <EmptyEditor />
          )}
        </div>
      </div>
    </>
  );
}
