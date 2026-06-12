import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  NotebookPen, Plus, Search, X, Pin, PinOff,
  Trash2, Copy, MoreHorizontal, Clock, Star,
  FileText, Inbox, Smile, Mic, MicOff, Loader2,
  Maximize2, Minimize2, Download, Tag, ChevronDown,
  Layers, Zap,
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
  tags: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// Quick-start templates
const TEMPLATES = [
  {
    icon: "📋", label: "Meeting Notes",
    title: "Meeting Notes",
    symbol: "📋",
    color: "#7467F0",
    content: `<h2>Meeting Notes</h2><p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p><p><strong>Attendees:</strong> </p><h3>Agenda</h3><ul><li></li></ul><h3>Discussion</h3><p></p><h3>Action Items</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"> </li></ul>`,
    tags: ["meetings"],
  },
  {
    icon: "📓", label: "Daily Journal",
    title: `Journal – ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}`,
    symbol: "📓",
    color: "#10B981",
    content: `<h2>Daily Journal</h2><h3>Gratitude</h3><ul><li></li><li></li><li></li></ul><h3>What happened today</h3><p></p><h3>How I'm feeling</h3><p></p><h3>Goals for tomorrow</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"> </li></ul>`,
    tags: ["journal"],
  },
  {
    icon: "🚀", label: "Project Brief",
    title: "Project Brief",
    symbol: "🚀",
    color: "#F59E0B",
    content: `<h2>Project Brief</h2><p><strong>Project:</strong> </p><p><strong>Goal:</strong> </p><h3>Overview</h3><p></p><h3>Key Requirements</h3><ul><li></li></ul><h3>Timeline</h3><p></p><h3>Resources</h3><ul><li></li></ul>`,
    tags: ["work", "projects"],
  },
  {
    icon: "💡", label: "Idea Dump",
    title: "Idea Dump",
    symbol: "💡",
    color: "#A855F7",
    content: `<h2>Idea Dump 💡</h2><p>Let it flow — no filtering, just ideas.</p><ul><li></li><li></li><li></li></ul>`,
    tags: ["ideas"],
  },
  {
    icon: "📊", label: "Weekly Review",
    title: `Week of ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    symbol: "📊",
    color: "#06B6D4",
    content: `<h2>Weekly Review</h2><h3>Wins 🏆</h3><ul><li></li></ul><h3>Challenges</h3><ul><li></li></ul><h3>Learnings</h3><ul><li></li></ul><h3>Next week's focus</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"> </li></ul>`,
    tags: ["reviews"],
  },
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

function parseTags(raw: string): string[] {
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

function serializeTags(tags: string[]): string { return JSON.stringify(tags); }

function readTime(content: string): number {
  const words = stripHtml(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

// ─── Symbol Picker ────────────────────────────────────────────────────────────

function SymbolPicker({ current, onSelect, onClose }: { current: string; onSelect: (s: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);
  return (
    <div ref={ref} className="absolute left-0 top-full mt-1 rounded-2xl shadow-2xl p-3 z-50"
      style={{ background: "var(--fb-surface)", border: "1px solid var(--fb-border)", width: "220px" }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: "var(--fb-text-muted)" }}>Choose a symbol</p>
      <div className="grid grid-cols-8 gap-0.5">
        {NOTE_SYMBOLS.map(sym => (
          <button key={sym} onClick={() => { onSelect(sym); onClose(); }}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-base transition-all hover:scale-125"
            style={{ background: sym === current ? "var(--fb-muted)" : "transparent", outline: sym === current ? "2px solid #7467F0" : "none", outlineOffset: "1px" }}>
            {sym}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Tag Chip ─────────────────────────────────────────────────────────────────

const TAG_PALETTE = ["#7467F0", "#06B6D4", "#10B981", "#F59E0B", "#F43F5E", "#A855F7", "#EC4899", "#14B8A6"];

function tagColor(tag: string): string {
  let hash = 0;
  for (const c of tag) hash = (hash * 31 + c.charCodeAt(0)) & 0xff;
  return TAG_PALETTE[hash % TAG_PALETTE.length];
}

function TagChip({ tag, onRemove, small }: { tag: string; onRemove?: () => void; small?: boolean }) {
  const c = tagColor(tag);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      background: `${c}18`, color: c,
      borderRadius: 99, padding: small ? "1px 6px" : "2px 8px",
      fontSize: small ? "0.6rem" : "0.65rem", fontWeight: 700,
      border: `1px solid ${c}30`,
    }}>
      {tag}
      {onRemove && (
        <button onClick={onRemove} style={{ background: "transparent", border: "none", color: c, cursor: "pointer", padding: 0, display: "flex", lineHeight: 1 }}>
          <X size={9} />
        </button>
      )}
    </span>
  );
}

// ─── Tag Input ────────────────────────────────────────────────────────────────

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState("");
  const commit = () => {
    const t = input.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput("");
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
      {tags.map(t => (
        <TagChip key={t} tag={t} onRemove={() => onChange(tags.filter(x => x !== t))} />
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); }
          if (e.key === "Backspace" && !input && tags.length) onChange(tags.slice(0, -1));
        }}
        onBlur={commit}
        placeholder={tags.length === 0 ? "Add tags…" : ""}
        style={{
          border: "none", outline: "none", background: "transparent",
          fontSize: "0.7rem", color: "var(--fb-text)", minWidth: 60, flex: 1,
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}

// ─── Note Card ────────────────────────────────────────────────────────────────

function NoteCard({
  note, isActive, onClick, onPin, onDuplicate, onDelete, onColorChange, onRename, onSymbolChange,
}: {
  note: Note; isActive: boolean;
  onClick: () => void; onPin: () => void; onDuplicate: () => void;
  onDelete: () => void; onColorChange: (c: string) => void;
  onRename: (t: string) => void; onSymbolChange: (s: string) => void;
}) {
  const [menu, setMenu] = useState(false);
  const [colorPicker, setColorPicker] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(note.title);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const tags = parseTags(note.tags);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) { setMenu(false); setColorPicker(false); }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => { if (renaming) renameRef.current?.select(); }, [renaming]);

  const preview = stripHtml(note.content).slice(0, 80) || "No content yet…";
  const rt = readTime(note.content);

  const commitRename = () => {
    const t = renameVal.trim();
    if (t && t !== note.title) onRename(t);
    else setRenameVal(note.title);
    setRenaming(false);
  };

  return (
    <div onClick={onClick} className="group relative rounded-2xl p-3 cursor-pointer transition-all hover:shadow-md"
      style={{ background: isActive ? `${note.color}12` : "var(--fb-surface)", border: `1.5px solid ${isActive ? note.color + "55" : "var(--fb-border)"}` }}>
      <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full" style={{ background: note.color }} />
      <div className="flex items-start gap-2 pl-2">
        <div className="shrink-0 w-7 h-7 rounded-xl flex items-center justify-center text-base mt-0.5" style={{ background: `${note.color}18` }}>
          {note.symbol || "📝"}
        </div>
        <div className="flex-1 min-w-0">
          {renaming ? (
            <input ref={renameRef} value={renameVal} onChange={e => setRenameVal(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") { setRenameVal(note.title); setRenaming(false); } }}
              onClick={e => e.stopPropagation()}
              className="w-full text-sm font-semibold outline-none bg-transparent border-b"
              style={{ color: "var(--fb-text)", borderColor: note.color }}
            />
          ) : (
            <p className="text-sm font-semibold truncate" style={{ color: "var(--fb-text)" }}>
              {note.pinned && <Star size={10} className="inline mr-1 mb-0.5" style={{ color: note.color, fill: note.color }} />}
              {note.title}
            </p>
          )}
          <p className="text-xs mt-0.5 leading-relaxed line-clamp-2" style={{ color: "var(--fb-text-muted)" }}>{preview}</p>
          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-1.5">
              {tags.slice(0, 3).map(t => <TagChip key={t} tag={t} small />)}
              {tags.length > 3 && <span style={{ fontSize: "0.6rem", color: "var(--fb-text-muted)" }}>+{tags.length - 3}</span>}
            </div>
          )}
        </div>
        {/* Context menu */}
        <div className="relative shrink-0" ref={menuRef}>
          <button onClick={e => { e.stopPropagation(); setMenu(m => !m); setColorPicker(false); }}
            className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:bg-gray-100"
            style={{ color: "var(--fb-text-muted)" }}>
            <MoreHorizontal size={13} />
          </button>
          {menu && (
            <div className="absolute right-0 top-7 rounded-xl shadow-xl py-1 min-w-40 z-30"
              style={{ background: "var(--fb-surface)", border: "1px solid var(--fb-border)" }}
              onClick={e => e.stopPropagation()}>
              <button onClick={() => { setRenaming(true); setMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 text-left" style={{ color: "var(--fb-text)" }}>
                <FileText size={11} /> Rename
              </button>
              <button onClick={() => { onPin(); setMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 text-left" style={{ color: "var(--fb-text)" }}>
                {note.pinned ? <><PinOff size={11} /> Unpin</> : <><Pin size={11} /> Pin</>}
              </button>
              <button onClick={() => { onDuplicate(); setMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 text-left" style={{ color: "var(--fb-text)" }}>
                <Copy size={11} /> Duplicate
              </button>
              <button onClick={() => setColorPicker(p => !p)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 text-left" style={{ color: "var(--fb-text)" }}>
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: note.color }} /> Color
              </button>
              {colorPicker && (
                <div className="flex flex-wrap gap-1.5 px-3 py-2">
                  {NOTE_COLORS.map(c => (
                    <button key={c.hex} onClick={() => { onColorChange(c.hex); setMenu(false); setColorPicker(false); }}
                      className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ background: c.hex, borderColor: note.color === c.hex ? "#1a1f36" : "transparent" }}
                      title={c.label} />
                  ))}
                </div>
              )}
              <div className="my-1 h-px" style={{ background: "var(--fb-border)" }} />
              <button onClick={() => { onDelete(); setMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-red-50 text-left" style={{ color: "#F43F5E" }}>
                <Trash2 size={11} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Footer */}
      <div className="flex items-center gap-2 mt-2 pl-2">
        <Clock size={9} style={{ color: "var(--fb-text-muted)" }} />
        <span className="text-[10px]" style={{ color: "var(--fb-text-muted)" }}>{timeAgo(note.updatedAt || note.createdAt)}</span>
        <span className="text-[10px] ml-auto" style={{ color: "var(--fb-text-muted)", opacity: 0.6 }}>~{rt} min</span>
      </div>
    </div>
  );
}

// ─── Template Picker ──────────────────────────────────────────────────────────

function TemplatePicker({ onCreate, onClose }: { onCreate: (t: typeof TEMPLATES[0]) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);
  return (
    <div ref={ref} style={{
      position: "absolute", top: "100%", left: 0, marginTop: 4,
      background: "var(--fb-surface)", border: "1px solid var(--fb-border)",
      borderRadius: 14, padding: "8px", width: 220, boxShadow: "0 16px 40px rgba(0,0,0,0.2)", zIndex: 50,
    }}>
      <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--fb-text-muted)", textTransform: "uppercase", letterSpacing: 0.5, padding: "2px 6px 6px" }}>Templates</p>
      {TEMPLATES.map(t => (
        <button key={t.label} onClick={() => { onCreate(t); onClose(); }}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 8,
            padding: "7px 8px", borderRadius: 9, border: "none",
            background: "transparent", cursor: "pointer", textAlign: "left", transition: "background 0.12s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--fb-muted)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <span style={{ fontSize: "1rem" }}>{t.icon}</span>
          <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--fb-text)" }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Live Transcript Preview ──────────────────────────────────────────────────

function TranscriptPreview({ text, noteColor }: { text: string; noteColor: string }) {
  if (!text) return null;
  return (
    <div className="mx-6 mt-3 mb-0 px-4 py-2.5 rounded-xl flex items-start gap-3"
      style={{ background: `${noteColor}0D`, border: `1px solid ${noteColor}30`, borderLeft: `3px solid ${noteColor}` }}>
      <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="w-0.5 rounded-full"
            style={{ background: noteColor, height: `${8 + (i % 3) * 4}px`, animation: "stt-wave 0.8s ease-in-out infinite", animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
      <p className="text-sm italic leading-snug flex-1" style={{ color: "var(--fb-text-muted)" }}>{text}</p>
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
        <p className="text-sm" style={{ color: "var(--fb-text-muted)" }}>Pick a note from the left, or create a new one.</p>
      </div>
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
  const [focusMode, setFocusMode] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [tagInputOpen, setTagInputOpen] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesRef = useRef<Note[]>([]);
  const editorRef = useRef<TiptapEditorHandle>(null);
  const templateBtnRef = useRef<HTMLDivElement>(null);

  // ── STT ───────────────────────────────────────────────────────────────────
  const [sttStatus, setSttStatus] = useState<StreamingStatus>("idle");
  const [partialTranscript, setPartialTranscript] = useState("");
  const [sttError, setSttError] = useState<string | null>(null);

  useEffect(() => { notesRef.current = notes; }, [notes]);

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

  // ── Tag helpers ───────────────────────────────────────────────────────────

  const allTags = Array.from(new Set(notes.flatMap(n => parseTags(n.tags)))).sort();

  const updateTags = useCallback((id: string, tags: string[]) => {
    updateNote(id, { tags: serializeTags(tags) });
  }, []);

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const createNote = useCallback(async (template?: typeof TEMPLATES[0]) => {
    const color = template?.color ?? NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)].hex;
    const symbol = template?.symbol ?? NOTE_SYMBOLS[Math.floor(Math.random() * 16)];
    const note: Note = {
      id: uid(),
      title: template?.title ?? "Untitled Note",
      content: template?.content ?? "",
      color, symbol, pinned: false,
      tags: serializeTags(template?.tags ?? []),
    };
    setNotes(p => [note, ...p]);
    setActiveId(note.id);
    try { await api.post("/notes", note); } catch (e) { console.error(e); }
  }, []);

  function updateNote(id: string, patch: Partial<Note>) {
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
  }

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

  const permanentDelete = useCallback((id: string) => setTrash(p => p.filter(n => n.id !== id)), []);

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
  }, []);

  // ── Export ────────────────────────────────────────────────────────────────

  const exportMarkdown = useCallback(() => {
    const md = editorRef.current?.getMarkdown();
    if (!md || !activeNote) return;
    const full = `# ${activeNote.title}\n\n${md}`;
    const blob = new Blob([full], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeNote.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeNote]);

  // ── STT handlers ──────────────────────────────────────────────────────────

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
    if (sttStatus === "idle") { setSttError(null); startRecording(); }
    else { stopRecording(); }
  }, [sttStatus, startRecording, stopRecording]);

  useEffect(() => {
    if (sttStatus !== "idle") { stopRecording(); setPartialTranscript(""); }
  }, [activeId]);

  // ── Focus mode keyboard shortcut ──────────────────────────────────────────

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "F") { e.preventDefault(); setFocusMode(f => !f); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filtered = notes
    .filter(n => {
      const q = search.toLowerCase();
      const matchSearch = !q || n.title.toLowerCase().includes(q) || stripHtml(n.content).toLowerCase().includes(q);
      const matchTag = !activeTagFilter || parseTags(n.tags).includes(activeTagFilter);
      return matchSearch && matchTag;
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
      <style>{`
        @keyframes stt-wave { 0%, 100% { transform: scaleY(0.5); opacity: 0.6; } 50% { transform: scaleY(1); opacity: 1; } }
        @keyframes stt-ring { 0% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.4); } 70% { box-shadow: 0 0 0 8px rgba(244, 63, 94, 0); } 100% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); } }
        .stt-btn-recording { animation: stt-ring 1.4s ease-out infinite; }
      `}</style>

      <div className="flex h-full overflow-hidden" style={{ background: "var(--fb-bg)" }}>

        {/* ── Left Panel (hidden in focus mode) ── */}
        {!focusMode && (
          <div className="flex flex-col shrink-0 overflow-hidden"
            style={{ width: "288px", borderRight: "1px solid var(--fb-border)", background: "var(--fb-surface)" }}>

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
                <div className="flex items-center gap-1">
                  {/* Templates button */}
                  <div className="relative" ref={templateBtnRef}>
                    <button onClick={() => setShowTemplates(s => !s)} title="Templates"
                      className="w-7 h-7 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                      style={{ background: "var(--fb-muted)", color: "var(--fb-text-muted)" }}>
                      <Layers size={13} />
                    </button>
                    {showTemplates && (
                      <TemplatePicker
                        onCreate={t => createNote(t)}
                        onClose={() => setShowTemplates(false)}
                      />
                    )}
                  </div>
                  {/* New note button */}
                  <button onClick={() => createNote()} title="New Note"
                    className="w-7 h-7 rounded-xl flex items-center justify-center text-white transition-all hover:scale-110 hover:shadow-md"
                    style={{ background: "#7467F0" }}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "var(--fb-muted)", border: "1px solid var(--fb-border)" }}>
                <Search size={13} style={{ color: "var(--fb-text-muted)" }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search notes…"
                  className="flex-1 text-xs outline-none bg-transparent"
                  style={{ color: "var(--fb-text)" }}
                />
                {search && <button onClick={() => setSearch("")}><X size={11} style={{ color: "var(--fb-text-muted)" }} /></button>}
              </div>

              {/* Tag filter row */}
              {allTags.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-2">
                  <button onClick={() => setActiveTagFilter(null)}
                    style={{
                      fontSize: "0.6rem", fontWeight: 700, padding: "2px 7px", borderRadius: 99,
                      background: activeTagFilter === null ? "#7467F0" : "var(--fb-muted)",
                      color: activeTagFilter === null ? "#fff" : "var(--fb-text-muted)",
                      border: "none", cursor: "pointer",
                    }}>
                    All
                  </button>
                  {allTags.map(tag => (
                    <button key={tag} onClick={() => setActiveTagFilter(activeTagFilter === tag ? null : tag)}
                      style={{
                        fontSize: "0.6rem", fontWeight: 700, padding: "2px 7px", borderRadius: 99,
                        background: activeTagFilter === tag ? tagColor(tag) : `${tagColor(tag)}18`,
                        color: activeTagFilter === tag ? "#fff" : tagColor(tag),
                        border: "none", cursor: "pointer",
                      }}>
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Note list */}
            <div className="flex-1 overflow-y-auto px-3 pb-2 flex flex-col gap-1.5">
              {filtered.length === 0 && !search && !activeTagFilter && (
                <div className="flex flex-col items-center gap-3 py-10">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "#EEF0FF" }}>
                    <NotebookPen size={18} color="#7467F0" strokeWidth={1.5} />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--fb-text)" }}>No notes yet</p>
                    <p className="text-xs" style={{ color: "var(--fb-text-muted)" }}>Click + or use a template to get started.</p>
                  </div>
                </div>
              )}
              {(search || activeTagFilter) && filtered.length === 0 && (
                <p className="text-xs text-center py-8" style={{ color: "var(--fb-text-muted)" }}>
                  No notes match{search ? ` "${search}"` : ""}{activeTagFilter ? ` #${activeTagFilter}` : ""}
                </p>
              )}

              {pinned.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-wider px-1 pt-1" style={{ color: "var(--fb-text-muted)" }}>Pinned</p>
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

            {/* Trash */}
            <div className="shrink-0 px-3 pb-3" style={{ borderTop: "1px solid var(--fb-border)" }}>
              <button onClick={() => setTrashOpen(o => !o)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:bg-gray-50 mt-2"
                style={{ color: "var(--fb-text-muted)" }}>
                <Inbox size={13} />
                Trash
                {trash.length > 0 && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#FEE2E2", color: "#F43F5E" }}>{trash.length}</span>
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
                        <button onClick={() => restoreNote(note)} className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0" style={{ color: "#7467F0", background: "#EEF0FF" }}>Restore</button>
                        <button onClick={() => permanentDelete(note.id)} className="text-[10px] shrink-0" style={{ color: "#F43F5E" }}>✕</button>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Right Editor ── */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: focusMode ? "var(--fb-bg)" : "var(--fb-bg)" }}>
          {activeNote ? (
            <>
              {/* Note header */}
              <div className="flex items-center justify-between px-6 py-3 shrink-0"
                style={{ borderBottom: "1px solid var(--fb-border)", background: "var(--fb-surface)" }}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Symbol button */}
                  <div className="relative shrink-0">
                    <button onClick={() => setSymbolPickerOpen(o => !o)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-xl transition-all hover:scale-110 hover:shadow-md"
                      style={{ background: `${activeNote.color}20` }} title="Change symbol">
                      {activeNote.symbol || "📝"}
                    </button>
                    {symbolPickerOpen && (
                      <SymbolPicker current={activeNote.symbol || "📝"}
                        onSelect={symbol => updateNote(activeNote.id, { symbol })}
                        onClose={() => setSymbolPickerOpen(false)}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <input value={activeNote.title} onChange={e => updateNote(activeNote.id, { title: e.target.value })}
                      className="w-full text-base font-bold outline-none bg-transparent"
                      style={{ color: "var(--fb-text)" }} placeholder="Note title…"
                    />
                    {/* Tags row */}
                    <div className="mt-0.5" style={{ maxWidth: 400 }}>
                      <TagInput
                        tags={parseTags(activeNote.tags)}
                        onChange={tags => updateNote(activeNote.id, { tags: serializeTags(tags) })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {/* Save status */}
                  <span className="text-xs transition-all" style={{ color: saving === "saving" ? "#F59E0B" : saving === "saved" ? "#10B981" : "transparent" }}>
                    {saving === "saving" ? "Saving…" : "Saved ✓"}
                  </span>

                  {/* Speak to Note */}
                  <button onClick={handleSpeakClick} disabled={isBusy}
                    title={isRecording ? "Stop Recording" : "Speak to Note"}
                    className={["flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                      isRecording ? "stt-btn-recording" : "hover:scale-105",
                      isBusy ? "opacity-60 cursor-not-allowed" : "cursor-pointer"].join(" ")}
                    style={{
                      background: isRecording ? "#F43F5E" : isConnecting ? "#F59E0B" : "#EEF0FF",
                      color: isRecording || isConnecting ? "#fff" : "#7467F0",
                    }}>
                    {isConnecting || isStopping ? <Loader2 size={13} className="animate-spin" />
                      : isRecording ? (
                        <><span className="relative flex items-center justify-center w-3 h-3">
                          <span className="absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#fff", animation: "ping 1s cubic-bezier(0,0,0.2,1) infinite" }} />
                          <MicOff size={11} />
                        </span>Stop</>
                      ) : <Mic size={13} />
                    }
                    <span>{isConnecting ? "Connecting…" : isStopping ? "Stopping…" : isRecording ? "Recording" : "Speak"}</span>
                  </button>

                  {/* Pin */}
                  <button onClick={() => togglePin(activeNote.id)}
                    className="w-7 h-7 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: activeNote.pinned ? "#FEF6DC" : "var(--fb-muted)" }}
                    title={activeNote.pinned ? "Unpin" : "Pin"}>
                    <Star size={13} style={{ color: activeNote.pinned ? "#F59E0B" : "var(--fb-text-muted)", fill: activeNote.pinned ? "#F59E0B" : "none" }} />
                  </button>

                  {/* Color picker */}
                  <div className="relative group/cp">
                    <button className="w-6 h-6 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-110"
                      style={{ background: activeNote.color }} title="Note color" />
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
                  <button onClick={() => setSymbolPickerOpen(o => !o)}
                    className="w-7 h-7 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: "var(--fb-muted)" }} title="Change symbol">
                    <Smile size={13} style={{ color: "var(--fb-text-muted)" }} />
                  </button>

                  {/* Export Markdown */}
                  <button onClick={exportMarkdown}
                    className="w-7 h-7 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: "var(--fb-muted)" }} title="Export as Markdown (.md)">
                    <Download size={13} style={{ color: "var(--fb-text-muted)" }} />
                  </button>

                  {/* Focus mode toggle */}
                  <button onClick={() => setFocusMode(f => !f)}
                    className="w-7 h-7 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: focusMode ? "#EEF0FF" : "var(--fb-muted)" }}
                    title={focusMode ? "Exit Focus Mode (⌘⇧F)" : "Focus Mode (⌘⇧F)"}>
                    {focusMode
                      ? <Minimize2 size={13} style={{ color: "#7467F0" }} />
                      : <Maximize2 size={13} style={{ color: "var(--fb-text-muted)" }} />
                    }
                  </button>
                </div>
              </div>

              {/* STT error */}
              {sttError && (
                <div className="mx-6 mt-3 px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm"
                  style={{ background: "#FEE2E2", border: "1px solid #FECACA", color: "#F43F5E" }}>
                  <MicOff size={14} />
                  <span className="flex-1">{sttError}</span>
                  <button onClick={() => setSttError(null)} className="shrink-0 opacity-60 hover:opacity-100"><X size={12} /></button>
                </div>
              )}

              {/* Live transcript */}
              {isRecording && <TranscriptPreview text={partialTranscript} noteColor={activeNote.color} />}

              {/* Editor */}
              <div className={["flex-1 overflow-hidden", focusMode ? "max-w-3xl mx-auto w-full px-0" : ""].join(" ")}>
                <TiptapEditor
                  ref={editorRef}
                  key={activeNote.id}
                  content={activeNote.content}
                  onChange={updateContent}
                  noteId={activeNote.id}
                  focusMode={focusMode}
                  onRequestSave={() => {
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
