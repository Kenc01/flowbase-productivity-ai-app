import React, { useState, useEffect, useCallback, useRef } from "react";
import { BookOpen, Plus, Trash2, ChevronRight, ChevronDown, FileText, Check, X } from "lucide-react";
import { api } from "../../../lib/api";

function uid() { return Math.random().toString(36).slice(2, 10); }

interface Page {
  id: string;
  title: string;
  content: string;
  emoji: string;
  parentId: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const PAGE_EMOJIS = ["📄","📝","📌","🗒️","📋","🗃️","📚","🔖","💡","🎯","🚀","⚡","🌟","🔧","🎨"];

function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="text-2xl hover:scale-110 transition-transform">
        {value}
      </button>
      {open && (
        <div className="absolute top-9 left-0 z-50 p-2 rounded-xl shadow-xl grid grid-cols-5 gap-1"
          style={{ background: "var(--fb-surface)", border: "1px solid var(--fb-border)" }}>
          {PAGE_EMOJIS.map(e => (
            <button key={e} onClick={() => { onChange(e); setOpen(false); }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base hover:bg-gray-100 transition-colors">
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PageTreeItem({ page, pages, activeId, depth, expanded, onToggle, onSelect, onDelete, onAdd }: {
  page: Page; pages: Page[]; activeId: string | null; depth: number;
  expanded: Set<string>; onToggle: (id: string) => void;
  onSelect: (id: string) => void; onDelete: (id: string) => void;
  onAdd: (parentId: string) => void;
}) {
  const children = pages.filter(p => p.parentId === page.id);
  const isExpanded = expanded.has(page.id);
  const isActive = page.id === activeId;

  return (
    <div>
      <div className="group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-all"
        style={{
          paddingLeft: `${8 + depth * 16}px`,
          background: isActive ? "#EEF0FF" : "transparent",
          color: isActive ? "#7467F0" : "var(--fb-text)",
        }}
        onClick={() => onSelect(page.id)}>
        <button onClick={e => { e.stopPropagation(); onToggle(page.id); }}
          className="w-4 h-4 flex items-center justify-center shrink-0 opacity-50 hover:opacity-100"
          style={{ visibility: children.length > 0 ? "visible" : "hidden" }}>
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <span className="text-sm mr-1">{page.emoji}</span>
        <span className="flex-1 text-xs font-medium truncate">{page.title || "Untitled"}</span>
        <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity shrink-0">
          <button onClick={e => { e.stopPropagation(); onAdd(page.id); }}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-white"
            title="Add sub-page">
            <Plus size={9} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(page.id); }}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-red-50"
            style={{ color: "#F43F5E" }} title="Delete page">
            <Trash2 size={9} />
          </button>
        </div>
      </div>
      {isExpanded && children.map(child => (
        <PageTreeItem key={child.id} page={child} pages={pages} activeId={activeId} depth={depth + 1}
          expanded={expanded} onToggle={onToggle} onSelect={onSelect} onDelete={onDelete} onAdd={onAdd} />
      ))}
    </div>
  );
}

export default function PagesSpacesPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.get<Page[]>("/pages")
      .then(data => {
        setPages(data);
        if (data.length > 0) setActiveId(data[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activePage = pages.find(p => p.id === activeId) ?? null;
  const rootPages = pages.filter(p => !p.parentId);

  const createPage = useCallback(async (parentId: string | null = null) => {
    const page: Page = { id: uid(), title: "Untitled Page", content: "", emoji: "📄", parentId };
    setPages(prev => [...prev, page]);
    setActiveId(page.id);
    if (parentId) setExpanded(prev => new Set([...prev, parentId]));
    try { await api.post("/pages", page); } catch (e) { console.error(e); }
  }, []);

  const deletePage = useCallback(async (id: string) => {
    const deleteIds = new Set<string>();
    const collect = (pid: string) => {
      deleteIds.add(pid);
      pages.filter(p => p.parentId === pid).forEach(p => collect(p.id));
    };
    collect(id);
    setPages(prev => {
      const remaining = prev.filter(p => !deleteIds.has(p.id));
      setActiveId(prev => deleteIds.has(prev ?? "") ? (remaining[0]?.id ?? null) : prev);
      return remaining;
    });
    try { await Promise.all([...deleteIds].map(did => api.delete(`/pages/${did}`))); } catch (e) { console.error(e); }
  }, [pages]);

  const updatePage = useCallback((id: string, patch: Partial<Page>) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      try {
        const page = pages.find(p => p.id === id);
        if (page) await api.put(`/pages/${id}`, { ...page, ...patch });
      } catch (e) { console.error(e); }
      setSaving(false);
    }, 600);
  }, [pages]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full" style={{ background: "var(--fb-bg)" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "#0EA5E922", borderTopColor: "#0EA5E9" }} />
        <p className="text-sm" style={{ color: "var(--fb-text-muted)" }}>Loading pages…</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "var(--fb-bg)" }}>

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <div className="w-60 shrink-0 flex flex-col border-r" style={{ borderColor: "var(--fb-border)", background: "var(--fb-surface)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--fb-border)" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#E0F2FE" }}>
              <BookOpen size={14} color="#0EA5E9" strokeWidth={2} />
            </div>
            <span className="text-sm font-semibold" style={{ color: "var(--fb-text)" }}>Pages</span>
          </div>
          <button onClick={() => createPage(null)}
            className="w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "#E0F2FE", color: "#0EA5E9" }}>
            <Plus size={12} />
          </button>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto py-2 px-1">
          {rootPages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 px-3">
              <FileText size={28} style={{ color: "var(--fb-border)" }} />
              <p className="text-xs text-center" style={{ color: "var(--fb-text-muted)" }}>
                No pages yet.{"\n"}Click + to create one.
              </p>
            </div>
          ) : rootPages.map(page => (
            <PageTreeItem key={page.id} page={page} pages={pages} activeId={activeId} depth={0}
              expanded={expanded} onToggle={toggleExpand} onSelect={setActiveId}
              onDelete={deletePage} onAdd={parentId => createPage(parentId)} />
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 shrink-0 text-xs" style={{ borderTop: "1px solid var(--fb-border)", color: "var(--fb-text-muted)" }}>
          {pages.length} {pages.length === 1 ? "page" : "pages"}
        </div>
      </div>

      {/* ── Editor ──────────────────────────────────────────────── */}
      {!activePage ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#E0F2FE" }}>
              <BookOpen size={28} color="#0EA5E9" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold mb-1" style={{ color: "var(--fb-text)" }}>No page selected</p>
              <p className="text-xs" style={{ color: "var(--fb-text-muted)" }}>Select a page or create a new one.</p>
            </div>
            <button onClick={() => createPage(null)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "#0EA5E9" }}>
              <Plus size={15} /> New Page
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">

          {/* Breadcrumb + toolbar */}
          <div className="flex items-center gap-3 px-8 py-3 shrink-0" style={{ borderBottom: "1px solid var(--fb-border)" }}>
            <FileText size={13} style={{ color: "var(--fb-text-muted)" }} />
            {activePage.parentId && (
              <>
                <span className="text-xs" style={{ color: "var(--fb-text-muted)" }}>
                  {pages.find(p => p.id === activePage.parentId)?.title ?? "Parent"}
                </span>
                <ChevronRight size={12} style={{ color: "var(--fb-text-muted)" }} />
              </>
            )}
            <span className="text-xs font-medium" style={{ color: "var(--fb-text)" }}>{activePage.title}</span>
            <div className="flex-1" />
            {saving ? (
              <span className="text-xs" style={{ color: "var(--fb-text-muted)" }}>Saving…</span>
            ) : (
              <span className="flex items-center gap-1 text-xs" style={{ color: "#10B981" }}>
                <Check size={11} /> Saved
              </span>
            )}
            <button onClick={() => createPage(activePage.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-blue-50"
              style={{ color: "#0EA5E9", border: "1px solid #0EA5E922" }}>
              <Plus size={11} /> Sub-page
            </button>
            <button onClick={() => deletePage(activePage.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors"
              style={{ color: "#F43F5E", border: "1px solid #F43F5E22" }}>
              <Trash2 size={11} /> Delete
            </button>
          </div>

          {/* Editor area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-12 py-10">

              {/* Emoji + Title */}
              <div className="flex items-start gap-4 mb-6">
                <EmojiPicker value={activePage.emoji} onChange={e => updatePage(activePage.id, { emoji: e })} />
                <input
                  value={activePage.title}
                  onChange={e => updatePage(activePage.id, { title: e.target.value })}
                  placeholder="Untitled Page"
                  className="flex-1 text-3xl font-bold outline-none bg-transparent"
                  style={{ color: "var(--fb-text)" }}
                />
              </div>

              {/* Content */}
              <textarea
                value={activePage.content}
                onChange={e => updatePage(activePage.id, { content: e.target.value })}
                placeholder={"Start writing your page…\n\nYou can use this as a wiki, documentation, or notes space."}
                className="w-full outline-none resize-none bg-transparent text-sm leading-relaxed"
                style={{ color: "var(--fb-text)", minHeight: "400px" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
