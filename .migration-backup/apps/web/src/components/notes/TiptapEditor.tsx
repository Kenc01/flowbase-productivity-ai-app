import React, { useEffect, useCallback, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Typography from "@tiptap/extension-typography";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Highlighter, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, CheckSquare, Quote, Code, Minus,
  Heading1, Heading2, Heading3, Link2, Sparkles,
  ChevronDown, Loader2,
} from "lucide-react";
import { api } from "../../lib/api";


// ─── Types ─────────────────────────────────────────────────────────────────────

export interface TiptapEditorHandle {
  /** Insert transcribed text at cursor position (or append if no selection) */
  insertTranscript: (text: string) => void;
}

interface EditorProps {
  content: string;
  onChange: (html: string) => void;
  noteId: string;
  /** Called after insertTranscript so the parent can trigger auto-save */
  onRequestSave?: () => void;
}

// ─── AI Actions ────────────────────────────────────────────────────────────

const AI_ACTIONS = [
  { id: "grammar",   label: "Fix Grammar",        icon: "✓" },
  { id: "rephrase",  label: "Rephrase",            icon: "↻" },
  { id: "shorter",   label: "Make Shorter",        icon: "↓" },
  { id: "longer",    label: "Make Longer",         icon: "↑" },
  { id: "simplify",  label: "Simplify Language",   icon: "≈" },
  { id: "formal",    label: "Formal Tone",         icon: "🎩" },
  { id: "casual",    label: "Casual Tone",         icon: "😊" },
  { id: "confident", label: "Confident Tone",      icon: "💪" },
];

// ─── Toolbar Button ────────────────────────────────────────────────────────

function ToolBtn({ onClick, active, title, children }: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-105"
      style={{
        background: active ? "#EEF0FF" : "transparent",
        color: active ? "#7467F0" : "var(--fb-text-muted)",
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 mx-0.5 shrink-0" style={{ background: "var(--fb-border)" }} />;
}

// ─── Slash Command Menu ────────────────────────────────────────────────────

const SLASH_COMMANDS = [
  { label: "Heading 1",   icon: "H1", action: (e: any) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: "Heading 2",   icon: "H2", action: (e: any) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "Heading 3",   icon: "H3", action: (e: any) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: "Bullet List", icon: "•",  action: (e: any) => e.chain().focus().toggleBulletList().run() },
  { label: "Numbered List",icon: "1.", action: (e: any) => e.chain().focus().toggleOrderedList().run() },
  { label: "Task List",   icon: "☑",  action: (e: any) => e.chain().focus().toggleTaskList().run() },
  { label: "Quote",       icon: "❝",  action: (e: any) => e.chain().focus().toggleBlockquote().run() },
  { label: "Code Block",  icon: "</>", action: (e: any) => e.chain().focus().toggleCodeBlock().run() },
  { label: "Divider",     icon: "—",  action: (e: any) => e.chain().focus().setHorizontalRule().run() },
];

// ─── Main Editor ────────────────────────────────────────────────────────────

const TiptapEditor = forwardRef<TiptapEditorHandle, EditorProps>(function TiptapEditor(
  { content, onChange, noteId, onRequestSave },
  ref
) {
  const [wordCount, setWordCount] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMenu, setAiMenu] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [slashMenu, setSlashMenu] = useState<{ top: number; left: number } | null>(null);
  const [slashQuery, setSlashQuery] = useState("");
  const slashRef = useRef<HTMLDivElement>(null);
  const aiMenuRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false, underline: false, link: false }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") return "Heading…";
          return "Write something, or type / for commands…";
        },
      }),
      CharacterCount,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
      Highlight.configure({ multicolor: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false }),
      Typography,
    ],
    content,
    onUpdate({ editor }) {
      const html = editor.getHTML();
      onChange(html);
      setWordCount(editor.storage.characterCount?.words() ?? 0);
    },
  });

  // ── Imperative handle for STT text insertion ───────────────────────────────
  useImperativeHandle(ref, () => ({
    insertTranscript(text: string) {
      if (!editor || !text.trim()) return;

      // Ensure there's a space before the inserted text if the cursor is
      // not at the beginning of a block
      const { state } = editor;
      const { from, to } = state.selection;
      const docSize = state.doc.content.size;
      const insertPos = from === to ? from : to; // prefer end of selection

      // Check if we need a leading space
      let prefix = "";
      if (insertPos > 0) {
        const charBefore = state.doc.textBetween(Math.max(0, insertPos - 1), insertPos);
        if (charBefore && charBefore !== " " && charBefore !== "\n") {
          prefix = " ";
        }
      }

      // Add trailing space for natural flow between turns
      const insertText = prefix + text.trim() + " ";

      editor
        .chain()
        .focus()
        .insertContentAt(insertPos, insertText)
        .run();

      // Trigger auto-save
      onRequestSave?.();
    },
  }), [editor, onRequestSave]);

  // Update content when note switches
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "");
      setWordCount(editor.storage.characterCount?.words() ?? 0);
    }
  }, [noteId, content]);

  // Slash command detection
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      const { state, view } = editor;
      const { from } = state.selection;
      const textBefore = state.doc.textBetween(Math.max(0, from - 30), from, "\n");
      const match = textBefore.match(/\/(\w*)$/);
      if (match) {
        setSlashQuery(match[1]);
        const coords = view.coordsAtPos(from);
        const editorRect = view.dom.getBoundingClientRect();
        setSlashMenu({ top: coords.bottom - editorRect.top + 4, left: coords.left - editorRect.left });
      } else {
        setSlashMenu(null);
      }
    };
    editor.on("transaction", handler);
    return () => { editor.off("transaction", handler); };
  }, [editor]);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (slashRef.current && !slashRef.current.contains(e.target as Node)) setSlashMenu(null);
      if (aiMenuRef.current && !aiMenuRef.current.contains(e.target as Node)) setAiMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const applySlashCommand = useCallback((cmd: typeof SLASH_COMMANDS[0]) => {
    if (!editor) return;
    // Delete the /query text
    const { from } = editor.state.selection;
    const textBefore = editor.state.doc.textBetween(Math.max(0, from - 30), from, "\n");
    const match = textBefore.match(/\/(\w*)$/);
    if (match) {
      editor.chain().focus().deleteRange({ from: from - match[0].length, to: from }).run();
    }
    cmd.action(editor);
    setSlashMenu(null);
  }, [editor]);

  const runAiRefine = useCallback(async (action: string) => {
    if (!editor || aiLoading) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");
    if (!selectedText.trim()) return;

    setAiLoading(true);
    setAiMenu(false);
    setAiError(null);
    try {
      const { result } = await api.post<{ result: string }>("/ai-refine", { text: selectedText, action });
      if (result) {
        editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, result).run();
      }
    } catch (err: any) {
      console.error("AI refine failed:", err);
      // Extract the error message from the API response if available
      const msg = err?.message?.includes("→")
        ? err.message.split("→")[1]?.trim()
        : (err?.message ?? "AI refine failed. Check your GEMINI_API_KEY.");
      setAiError(msg);
      setTimeout(() => setAiError(null), 5000);
    } finally {
      setAiLoading(false);
    }
  }, [editor, aiLoading]);

  const filteredSlash = SLASH_COMMANDS.filter(c =>
    c.label.toLowerCase().includes(slashQuery.toLowerCase())
  );

  if (!editor) return null;

  return (
    <div className="relative flex flex-col h-full">
      {/* ── Sticky Toolbar ── */}
      <div
        className="flex items-center gap-0.5 px-3 py-2 shrink-0 flex-wrap"
        style={{ borderBottom: "1px solid var(--fb-border)", background: "var(--fb-surface)" }}
      >
        {/* Text style */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
          <Bold size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
          <Italic size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
          <UnderlineIcon size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
          <Strikethrough size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Highlight">
          <Highlighter size={13} />
        </ToolBtn>

        <Divider />

        {/* Headings */}
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1">
          <Heading1 size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
          <Heading2 size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">
          <Heading3 size={13} />
        </ToolBtn>

        <Divider />

        {/* Alignment */}
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align Left">
          <AlignLeft size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align Center">
          <AlignCenter size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align Right">
          <AlignRight size={13} />
        </ToolBtn>

        <Divider />

        {/* Lists */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List">
          <List size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered List">
          <ListOrdered size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive("taskList")} title="Task List">
          <CheckSquare size={13} />
        </ToolBtn>

        <Divider />

        {/* Block */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote">
          <Quote size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline Code">
          <Code size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Divider">
          <Minus size={13} />
        </ToolBtn>
      </div>

      {/* ── Editor area ── */}
      <div className="relative flex-1 overflow-y-auto">

        {/* Bubble Menu */}
        {editor && (
          <BubbleMenu
            editor={editor}
            shouldShow={({ editor, state }) => {
              const { from, to } = state.selection;
              return from !== to && !editor.isActive("image");
            }}
          >
            <div
              className="flex items-center gap-0.5 px-2 py-1.5 rounded-xl shadow-xl"
              style={{ background: "var(--fb-surface)", border: "1px solid var(--fb-border)" }}
            >
              <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
                <Bold size={12} />
              </ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
                <Italic size={12} />
              </ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
                <UnderlineIcon size={12} />
              </ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Highlight">
                <Highlighter size={12} />
              </ToolBtn>

              <div className="w-px h-4 mx-0.5" style={{ background: "var(--fb-border)" }} />

              {/* AI Refine button */}
              <div className="relative" ref={aiMenuRef}>
                <button
                  onMouseDown={e => { e.preventDefault(); setAiMenu(m => !m); }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                  style={{ background: aiLoading ? "var(--fb-muted)" : "#EEF0FF", color: "#7467F0" }}
                  disabled={aiLoading}
                  title="AI Refine"
                >
                  {aiLoading
                    ? <Loader2 size={11} className="animate-spin" />
                    : <Sparkles size={11} />}
                  <span>AI Refine</span>
                  <ChevronDown size={10} />
                </button>

                {aiMenu && (
                  <div
                    className="absolute left-0 top-full mt-1 rounded-xl shadow-xl py-1 min-w-44 z-50"
                    style={{ background: "var(--fb-surface)", border: "1px solid var(--fb-border)" }}
                  >
                    {AI_ACTIONS.map(a => (
                      <button
                        key={a.id}
                        onMouseDown={e => { e.preventDefault(); runAiRefine(a.id); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-purple-50 transition-colors text-left"
                        style={{ color: "var(--fb-text)" }}
                      >
                        <span className="w-5 text-center">{a.icon}</span>
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </BubbleMenu>
        )}

        {/* Slash command menu */}
        {slashMenu && filteredSlash.length > 0 && (
          <div
            ref={slashRef}
            className="absolute rounded-xl shadow-xl py-1 min-w-48 z-50"
            style={{
              top: slashMenu.top,
              left: slashMenu.left,
              background: "var(--fb-surface)",
              border: "1px solid var(--fb-border)",
            }}
          >
            <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--fb-text-muted)" }}>
              Commands
            </p>
            {filteredSlash.map(cmd => (
              <button
                key={cmd.label}
                onMouseDown={e => { e.preventDefault(); applySlashCommand(cmd); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-purple-50 transition-colors text-left"
                style={{ color: "var(--fb-text)" }}
              >
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: "#EEF0FF", color: "#7467F0" }}>
                  {cmd.icon}
                </span>
                {cmd.label}
              </button>
            ))}
          </div>
        )}

        <EditorContent
          editor={editor}
          className="tiptap-editor"
        />
      </div>

      {/* ── Status bar ── */}
      <div
        className="flex items-center justify-between px-5 py-2 shrink-0 text-xs"
        style={{ borderTop: "1px solid var(--fb-border)", color: "var(--fb-text-muted)" }}
      >
        <span>{wordCount} {wordCount === 1 ? "word" : "words"}</span>
        {aiLoading && (
          <span className="flex items-center gap-1.5" style={{ color: "#7467F0" }}>
            <Loader2 size={11} className="animate-spin" /> AI refining…
          </span>
        )}
        {aiError && !aiLoading && (
          <span
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg"
            style={{ color: "#F43F5E", background: "#FEE2E2" }}
          >
            ⚠ {aiError}
          </span>
        )}
      </div>
    </div>
  );
});

export default TiptapEditor;
