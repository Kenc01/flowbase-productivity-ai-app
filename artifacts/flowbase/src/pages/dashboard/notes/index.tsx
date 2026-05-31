import React, { useState, useEffect, useCallback, useRef } from "react";
import { NotebookPen, Plus, Trash2, Pin, Search, X, Check } from "lucide-react";
import { api } from "../../../lib/api";

function uid() { return Math.random().toString(36).slice(2, 10); }

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const NOTE_COLORS = [
  "#F43F5E","#F59E0B","#10B981","#06B6D4",
  "#7467F0","#A855F7","#EC4899","#14B8A6",
];

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const createNote = useCallback(async () => {
    const note: Note = { id: uid(), title: "Untitled Note", content: "", color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)], pinned: false };
    setNotes(p => [note, ...p]);
    setActiveId(note.id);
    try { await api.post("/notes", note); } catch (e) { console.error(e); }
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    setNotes(p => {
      const remaining = p.filter(n => n.id !== id);
      setActiveId(remaining[0]?.id ?? null);
      return remaining;
    });
    try { await api.delete(`/notes/${id}`); } catch (e) { console.error(e); }
  }, []);

  const updateNote = useCallback((id: string, patch: Partial<Note>) => {
    setNotes(p => p.map(n => n.id === id ? { ...n, ...patch } : n));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      try {
        const note = notes.find(n => n.id === id);
        if (note) await api.put(`/notes/${id}`, { ...note, ...patch });
      } catch (e) { console.error(e); }
      setSaving(false);
    }, 600);
  }, [notes]);

  const togglePin = useCallback(async (id: string, pinned: boolean) => {
    setNotes(p => p.map(n => n.id === id ? { ...n, pinned } : n));
    try { const note = notes.find(n => n.id === id); if (note) await api.put(`/notes/${id}`, { ...note, pinned }); } catch (e) { console.error(e); }
  }, [notes]);

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );
  const pinned = filtered.filter(n => n.pinned);
  const unpinned = filtered.filter(n => !n.pinned);
  const sorted = [...pinned, ...unpinned];

  const fmtDate = (s?: string) => {
    if (!s) return "";
    return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full" style={{ background: "var(--fb-bg)" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "#F43F5E22", borderTopColor: "#F43F5E" }} />
        <p className="text-sm" style={{ color: "var(--fb-text-muted)" }}>Loading notes…</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "var(--fb-bg)" }}>

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <div className="w-64 shrink-0 flex flex-col border-r" style={{ borderColor: "var(--fb-border)", background: "var(--fb-surface)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--fb-border)" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#FFE4EA" }}>
              <NotebookPen size={14} color="#F43F5E" strokeWidth={2} />
            </div>
            <span className="text-sm font-semibold" style={{ color: "var(--fb-text)" }}>Notes</span>
          </div>
          <button onClick={createNote}
            className="w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "#FFE4EA", color: "#F43F5E" }}>
            <Plus size={12} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 shrink-0">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: "var(--fb-muted)", border: "1px solid var(--fb-border)" }}>
            <Search size={12} style={{ color: "var(--fb-text-muted)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search notes…"
              className="flex-1 text-xs outline-none bg-transparent"
              style={{ color: "var(--fb-text)" }} />
            {search && (
              <button onClick={() => setSearch("")}><X size={10} style={{ color: "var(--fb-text-muted)" }} /></button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 pb-3 flex flex-col gap-1">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 px-3">
              <NotebookPen size={28} style={{ color: "var(--fb-border)" }} />
              <p className="text-xs text-center" style={{ color: "var(--fb-text-muted)" }}>
                {search ? "No notes match your search." : "No notes yet.\nClick + to create one."}
              </p>
            </div>
          ) : sorted.map(note => (
            <div key={note.id}
              onClick={() => setActiveId(note.id)}
              className="group relative px-3 py-2.5 rounded-xl cursor-pointer transition-all"
              style={{
                background: activeId === note.id ? note.color + "18" : "transparent",
                border: `1px solid ${activeId === note.id ? note.color + "44" : "transparent"}`,
              }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: note.color }} />
                <span className="flex-1 text-xs font-semibold truncate" style={{ color: "var(--fb-text)" }}>
                  {note.title || "Untitled"}
                </span>
                {note.pinned && <Pin size={9} style={{ color: note.color }} className="shrink-0" />}
              </div>
              <p className="text-xs pl-3.5 leading-relaxed" style={{
                color: "var(--fb-text-muted)",
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden"
              }}>
                {note.content || "No content"}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 shrink-0 text-xs" style={{ borderTop: "1px solid var(--fb-border)", color: "var(--fb-text-muted)" }}>
          {notes.length} {notes.length === 1 ? "note" : "notes"}
        </div>
      </div>

      {/* ── Editor ──────────────────────────────────────────────── */}
      {!activeNote ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#FFE4EA" }}>
              <NotebookPen size={28} color="#F43F5E" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold mb-1" style={{ color: "var(--fb-text)" }}>No note selected</p>
              <p className="text-xs" style={{ color: "var(--fb-text-muted)" }}>Select a note or create a new one.</p>
            </div>
            <button onClick={createNote}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "#F43F5E" }}>
              <Plus size={15} /> New Note
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

          {/* Editor toolbar */}
          <div className="flex items-center gap-3 px-6 py-3 shrink-0" style={{ borderBottom: "1px solid var(--fb-border)" }}>

            {/* Color picker */}
            <div className="flex gap-1.5">
              {NOTE_COLORS.map(c => (
                <button key={c} onClick={() => updateNote(activeNote.id, { color: c })}
                  className="w-5 h-5 rounded-full transition-all"
                  style={{ background: c, outline: activeNote.color === c ? `2px solid ${c}` : "none", outlineOffset: "2px", transform: activeNote.color === c ? "scale(1.2)" : "scale(1)" }} />
              ))}
            </div>

            <div className="flex-1" />

            {/* Save indicator */}
            {saving ? (
              <span className="text-xs" style={{ color: "var(--fb-text-muted)" }}>Saving…</span>
            ) : (
              <span className="flex items-center gap-1 text-xs" style={{ color: "#10B981" }}>
                <Check size={11} /> Saved
              </span>
            )}

            {/* Pin */}
            <button onClick={() => togglePin(activeNote.id, !activeNote.pinned)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: activeNote.pinned ? activeNote.color + "18" : "var(--fb-muted)",
                color: activeNote.pinned ? activeNote.color : "var(--fb-text-muted)",
                border: `1px solid ${activeNote.pinned ? activeNote.color + "44" : "var(--fb-border)"}`,
              }}>
              <Pin size={11} /> {activeNote.pinned ? "Pinned" : "Pin"}
            </button>

            {/* Delete */}
            <button onClick={() => deleteNote(activeNote.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors"
              style={{ color: "#F43F5E", border: "1px solid #F43F5E22" }}>
              <Trash2 size={11} /> Delete
            </button>
          </div>

          {/* Color bar */}
          <div className="h-1 shrink-0" style={{ background: activeNote.color }} />

          {/* Title */}
          <div className="px-8 pt-6 shrink-0">
            <input
              value={activeNote.title}
              onChange={e => updateNote(activeNote.id, { title: e.target.value })}
              placeholder="Note title…"
              className="w-full text-2xl font-bold outline-none bg-transparent"
              style={{ color: "var(--fb-text)", borderBottom: "1px solid var(--fb-border)", paddingBottom: "8px" }}
            />
          </div>

          {/* Metadata */}
          {activeNote.createdAt && (
            <div className="px-8 pt-2 shrink-0">
              <span className="text-xs" style={{ color: "var(--fb-text-muted)" }}>
                Created {fmtDate(activeNote.createdAt)}
              </span>
            </div>
          )}

          {/* Content */}
          <textarea
            value={activeNote.content}
            onChange={e => updateNote(activeNote.id, { content: e.target.value })}
            placeholder="Start writing your note…"
            className="flex-1 px-8 py-4 outline-none resize-none text-sm leading-relaxed bg-transparent"
            style={{ color: "var(--fb-text)" }}
          />
        </div>
      )}
    </div>
  );
}
