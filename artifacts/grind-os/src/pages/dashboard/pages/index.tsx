import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FolderOpen, Plus, Star, MoreHorizontal, Search, Grid3X3, List,
  ChevronRight, FileText, ArrowLeft, X, Check, Folder, Archive,
  Clock, Heart, Trash2, Edit3, Copy, Share2, Move, Download,
  ChevronDown, Eye, MessageSquare, Link2, Users, UserPlus, Mail,
  Shield, Crown, Send, CheckCircle2, Mic, Bold, Italic, Underline as UnderlineIcon,
  List as ListIcon, ListOrdered, Code, Highlighter, Minus, Type,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Typography from "@tiptap/extension-typography";
import { api } from "../../../lib/api";

function uid() { return Math.random().toString(36).slice(2, 10); }

// ─── Types ───────────────────────────────────────────────────────────────────

interface Space {
  id: string;
  name: string;
  description: string;
  color: string;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Page {
  id: string;
  spaceId: string | null;
  title: string;
  content: string;
  emoji: string;
  template: string;
  isFavorite: boolean;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Collaborator {
  id: string;
  spaceId: string;
  email: string;
  name: string;
  role: string;
  status: string;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SPACE_COLORS = [
  "#7467F0", "#0EA5E9", "#10B981", "#F59E0B",
  "#F43F5E", "#8B5CF6", "#06B6D4", "#EC4899",
];

const TEMPLATE_LABELS: Record<string, string> = {
  blank: "Blank Page",
  project: "Project Plan",
  meeting: "Meeting Notes",
  prd: "PRD",
  research: "Research Notes",
  task: "Task Plan",
  book_notes: "Book Notes",
  course_notes: "Course Notes",
  skill_blueprint: "Skill Blueprint",
  weekly_reflection: "Weekly Reflection",
  mental_model: "Mental Model",
  sop: "System / SOP",
  insight: "Insight Capture",
  sprint_90: "90-Day Sprint",
};

const TEMPLATE_META: Record<string, { emoji: string; color: string; desc: string; category: string }> = {
  blank:            { emoji: "📄", color: "#6B7280", desc: "Start from scratch",                      category: "general" },
  project:          { emoji: "🗂️", color: "#0EA5E9", desc: "Plan a project with milestones",           category: "general" },
  meeting:          { emoji: "📋", color: "#10B981", desc: "Capture meeting notes & actions",          category: "general" },
  prd:              { emoji: "📐", color: "#7467F0", desc: "Product requirements document",            category: "general" },
  research:         { emoji: "🔬", color: "#F59E0B", desc: "Research notes & findings",               category: "general" },
  task:             { emoji: "✅", color: "#F43F5E", desc: "Task breakdown & execution plan",          category: "general" },
  book_notes:       { emoji: "📖", color: "#7467F0", desc: "Capture key ideas from any book",         category: "mastery" },
  course_notes:     { emoji: "🎓", color: "#06B6D4", desc: "Structure notes from a course or tutorial", category: "mastery" },
  skill_blueprint:  { emoji: "🛠️", color: "#10B981", desc: "Map out a skill you're developing",       category: "mastery" },
  weekly_reflection:{ emoji: "🪞", color: "#8B5CF6", desc: "Review your week — wins, losses, lessons", category: "mastery" },
  mental_model:     { emoji: "🧠", color: "#F59E0B", desc: "Document a mental model or framework",    category: "mastery" },
  sop:              { emoji: "📋", color: "#EC4899", desc: "Build a repeatable system or protocol",   category: "mastery" },
  insight:          { emoji: "💡", color: "#F59E0B", desc: "Capture an insight and how to apply it",  category: "mastery" },
  sprint_90:        { emoji: "🎯", color: "#F43F5E", desc: "90-day focused sprint with daily tracking", category: "mastery" },
};

const STARTER_SPACES = [
  { name: "Second Brain",      color: "#7467F0", emoji: "🧠", desc: "All your knowledge, ideas & insights in one place" },
  { name: "Learning Library",  color: "#06B6D4", emoji: "📚", desc: "Book notes, course takeaways, resources" },
  { name: "Skill Mastery",     color: "#10B981", emoji: "🎯", desc: "Deep skill development blueprints" },
  { name: "Systems & SOPs",    color: "#F59E0B", emoji: "⚙️",  desc: "Repeatable routines, protocols, playbooks" },
  { name: "Personal Growth",   color: "#F43F5E", emoji: "🌱", desc: "Reflections, mindset journals, growth reviews" },
];

function getTemplateContent(template: string, title: string): string {
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  switch (template) {
    case "book_notes": return `<h1>${title}</h1><p><strong>Author:</strong> </p><p><strong>Finished:</strong> ${today}</p><p><strong>Rating:</strong> ⭐⭐⭐⭐⭐</p><h2>📌 Core Idea</h2><p>The book's central thesis in one sentence.</p><h2>🔑 Key Ideas</h2><ul><li></li><li></li><li></li></ul><h2>💬 Best Quotes</h2><blockquote><p></p></blockquote><h2>⚡ How I'll Apply This</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"> </li><li data-type="taskItem" data-checked="false"> </li></ul><h2>🔗 Related Concepts</h2><p></p>`;
    case "course_notes": return `<h1>${title}</h1><p><strong>Platform:</strong> </p><p><strong>Started:</strong> ${today}</p><h2>🎯 Goal</h2><p>What do I want to be able to do after this course?</p><h2>📝 Module Notes</h2><h3>Module 1 — </h3><p></p><h3>Module 2 — </h3><p></p><h2>🧠 Key Takeaways</h2><ul><li></li><li></li></ul><h2>🛠️ Projects / Practice</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"> </li></ul><h2>📌 Resources & Links</h2><ul><li></li></ul>`;
    case "skill_blueprint": return `<h1>${title}</h1><p><strong>Target Level:</strong>  Beginner → Intermediate → Advanced</p><p><strong>Timeline:</strong> </p><h2>🎯 Why I'm Learning This</h2><p></p><h2>📊 Current Level Assessment</h2><p>Honest self-assessment of where I am now.</p><h2>🗺️ Learning Path</h2><h3>Phase 1 — Foundation</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"> </li></ul><h3>Phase 2 — Application</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"> </li></ul><h3>Phase 3 — Mastery</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"> </li></ul><h2>📚 Resources</h2><ul><li></li></ul><h2>🔄 Practice Log</h2><p>Track practice sessions, reflections, and breakthroughs.</p>`;
    case "weekly_reflection": return `<h1>Week of ${today}</h1><h2>🏆 Wins This Week</h2><ul><li></li><li></li><li></li></ul><h2>😤 What Didn't Go Well</h2><ul><li></li></ul><h2>🧠 What I Learned</h2><ul><li></li></ul><h2>📊 Goals Check-in</h2><p>How did I track against my goals this week?</p><h2>⚡ Biggest Insight</h2><p></p><h2>🎯 Focus for Next Week</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"> </li><li data-type="taskItem" data-checked="false"> </li><li data-type="taskItem" data-checked="false"> </li></ul><h2>💬 How I'm Feeling</h2><p>Energy, motivation, mindset going into next week.</p>`;
    case "mental_model": return `<h1>${title}</h1><p><strong>Source:</strong> </p><p><strong>Category:</strong> </p><h2>🧠 What It Is</h2><p>Define the mental model in plain language.</p><h2>⚙️ How It Works</h2><p>The mechanics, the logic, the underlying principle.</p><h2>📍 When to Use It</h2><ul><li></li><li></li></ul><h2>⚠️ When NOT to Use It</h2><ul><li></li></ul><h2>💡 Real-World Examples</h2><ul><li></li><li></li></ul><h2>🔗 Related Models</h2><p></p>`;
    case "sop": return `<h1>${title}</h1><p><strong>Owner:</strong> Me</p><p><strong>Last Updated:</strong> ${today}</p><p><strong>Frequency:</strong> </p><h2>🎯 Purpose</h2><p>Why this system exists and what problem it solves.</p><h2>✅ Prerequisites</h2><ul><li></li></ul><h2>📋 Steps</h2><ol><li><p><strong>Step 1 — </strong></p></li><li><p><strong>Step 2 — </strong></p></li><li><p><strong>Step 3 — </strong></p></li></ol><h2>⚡ Quick Reference</h2><p>The 30-second version of this SOP.</p><h2>🔄 Review Notes</h2><p>What's working, what needs improving.</p>`;
    case "insight": return `<h1>${title}</h1><p><strong>Date:</strong> ${today}</p><p><strong>Source:</strong> </p><h2>💡 The Insight</h2><p>What did I realize? State it clearly in 2-3 sentences.</p><h2>🤔 Why It Matters</h2><p>What does this change? What does it unlock?</p><h2>🔗 What It Connects To</h2><ul><li></li></ul><h2>⚡ How I'll Apply It</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"> </li><li data-type="taskItem" data-checked="false"> </li></ul><h2>📌 Evidence / Examples</h2><p></p>`;
    case "sprint_90": return `<h1>${title}</h1><p><strong>Start:</strong> ${today}</p><p><strong>End:</strong> </p><h2>🎯 The One Big Goal</h2><p>What will be true in 90 days that isn't true today?</p><h2>💥 Why This Matters</h2><p></p><h2>📊 Success Metrics</h2><ul><li></li><li></li></ul><h2>🗺️ 3 Monthly Milestones</h2><h3>Month 1 (Days 1–30)</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"> </li></ul><h3>Month 2 (Days 31–60)</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"> </li></ul><h3>Month 3 (Days 61–90)</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"> </li></ul><h2>🔄 Weekly Review Ritual</h2><p>Every Sunday: review progress, adjust plan, recommit.</p>`;
    case "project": return `<h1>${title}</h1><p><strong>Status:</strong> Planning</p><p><strong>Owner:</strong> Me</p><p><strong>Due:</strong> </p><h2>🎯 Goal</h2><p></p><h2>📋 Milestones</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"> </li><li data-type="taskItem" data-checked="false"> </li><li data-type="taskItem" data-checked="false"> </li></ul><h2>📝 Notes</h2><p></p>`;
    case "meeting": return `<h1>${title}</h1><p><strong>Date:</strong> ${today}</p><p><strong>Attendees:</strong> </p><h2>Agenda</h2><ul><li></li></ul><h2>Discussion</h2><p></p><h2>Action Items</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"> </li></ul>`;
    default: return "";
  }
}

const SORT_OPTIONS = [
  { value: "updated", label: "Recently Updated" },
  { value: "name", label: "Name" },
  { value: "pages", label: "Most Pages" },
  { value: "favorites", label: "Favorites" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  return new Date(iso).toLocaleDateString();
}

function colorLight(hex: string) {
  return hex + "18";
}

// ─── Color Dot ────────────────────────────────────────────────────────────────

function SpaceFolderIcon({ color, size = 28 }: { color: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: 8,
      background: colorLight(color),
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <FolderOpen size={size * 0.55} color={color} strokeWidth={2} />
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ initials, color = "#7467F0", size = 22 }: { initials: string; color?: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: colorLight(color),
      border: `2px solid white`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 600, color, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function Badge({ label, color = "#7467F0" }: { label: string; color?: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: 99,
      background: colorLight(color), color,
      fontSize: 11, fontWeight: 500, whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

// ─── Create Space Modal ───────────────────────────────────────────────────────

function CreateSpaceModal({
  onClose, onSave, initial,
}: {
  onClose: () => void;
  onSave: (data: { name: string; description: string; color: string }) => void;
  initial?: { name?: string; description?: string; color?: string };
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [color, setColor] = useState(initial?.color ?? SPACE_COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim(), color });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: "white", borderRadius: 20, padding: 32, width: "100%", maxWidth: 460,
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <SpaceFolderIcon color={color} size={36} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1f36" }}>
              {initial?.name ? "Edit Space" : "Create New Space"}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              Organize your pages and documents
            </div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4, borderRadius: 6 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
              Space Name *
            </label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Work Projects"
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                border: "1.5px solid #e5e7eb", fontSize: 14, color: "#1a1f36",
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What's this space for?"
              rows={3}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                border: "1.5px solid #e5e7eb", fontSize: 14, color: "#1a1f36",
                outline: "none", resize: "none", boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>
              Color
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {SPACE_COLORS.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: c, border: "none", cursor: "pointer",
                    outline: color === c ? `3px solid ${c}` : "3px solid transparent",
                    outlineOffset: 2, transition: "outline 0.15s",
                  }}
                />
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={!name.trim()}
            style={{
              marginTop: 8, padding: "11px 0", borderRadius: 12,
              background: name.trim() ? "#7467F0" : "#e5e7eb",
              color: name.trim() ? "white" : "#9ca3af",
              border: "none", cursor: name.trim() ? "pointer" : "not-allowed",
              fontSize: 14, fontWeight: 600, transition: "all 0.15s",
            }}
          >
            {initial?.name ? "Save Changes" : "Create Space"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Create Page Modal ────────────────────────────────────────────────────────

function CreatePageModal({
  spaces, defaultSpaceId, onClose, onSave,
}: {
  spaces: Space[];
  defaultSpaceId?: string;
  onClose: () => void;
  onSave: (data: { title: string; spaceId: string; template: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [spaceId, setSpaceId] = useState(defaultSpaceId ?? spaces[0]?.id ?? "");
  const [template, setTemplate] = useState("blank");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !spaceId) return;
    onSave({ title: title.trim(), spaceId, template });
  };

  const selectStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: "1.5px solid #e5e7eb", fontSize: 14, color: "#1a1f36",
    outline: "none", background: "white", boxSizing: "border-box",
    appearance: "none", cursor: "pointer",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: "white", borderRadius: 20, padding: 32, width: "100%", maxWidth: 440,
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#EEF0FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FileText size={18} color="#7467F0" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1f36" }}>Create New Page</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Add a page to a space</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4, borderRadius: 6 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
              Page Name *
            </label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Q4 Roadmap"
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                border: "1.5px solid #e5e7eb", fontSize: 14, color: "#1a1f36",
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
              Add to Space *
            </label>
            <select value={spaceId} onChange={e => setSpaceId(e.target.value)} style={selectStyle}>
              {spaces.filter(s => !s.isArchived).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>
              Template
            </label>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                🎓 Mastery & Growth
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
                {(["book_notes","course_notes","skill_blueprint","weekly_reflection","mental_model","sop","insight","sprint_90"] as const).map(key => {
                  const m = TEMPLATE_META[key];
                  return (
                    <button
                      key={key} type="button"
                      onClick={() => setTemplate(key)}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 8,
                        padding: "8px 10px", borderRadius: 10, cursor: "pointer",
                        border: template === key ? `2px solid ${m.color}` : "1.5px solid #e5e7eb",
                        background: template === key ? m.color + "12" : "white",
                        textAlign: "left", transition: "all 0.15s",
                      }}
                    >
                      <span style={{ fontSize: 16, lineHeight: 1.2, flexShrink: 0 }}>{m.emoji}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: template === key ? m.color : "#1a1f36" }}>{TEMPLATE_LABELS[key]}</div>
                        <div style={{ fontSize: 10, color: "#9ca3af", lineHeight: 1.3, marginTop: 1 }}>{m.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                ⚙️ General
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {(["blank","project","meeting","research","task"] as const).map(key => {
                  const m = TEMPLATE_META[key];
                  return (
                    <button
                      key={key} type="button"
                      onClick={() => setTemplate(key)}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 8,
                        padding: "8px 10px", borderRadius: 10, cursor: "pointer",
                        border: template === key ? `2px solid ${m.color}` : "1.5px solid #e5e7eb",
                        background: template === key ? m.color + "12" : "white",
                        textAlign: "left", transition: "all 0.15s",
                      }}
                    >
                      <span style={{ fontSize: 16, lineHeight: 1.2, flexShrink: 0 }}>{m.emoji}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: template === key ? m.color : "#1a1f36" }}>{TEMPLATE_LABELS[key]}</div>
                        <div style={{ fontSize: 10, color: "#9ca3af", lineHeight: 1.3, marginTop: 1 }}>{m.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={!title.trim() || !spaceId}
            style={{
              marginTop: 8, padding: "11px 0", borderRadius: 12,
              background: title.trim() && spaceId ? "#7467F0" : "#e5e7eb",
              color: title.trim() && spaceId ? "white" : "#9ca3af",
              border: "none", cursor: title.trim() && spaceId ? "pointer" : "not-allowed",
              fontSize: 14, fontWeight: 600, transition: "all 0.15s",
            }}
          >
            {TEMPLATE_META[template]?.emoji ?? "📄"} Create Page
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Page Preview Panel ───────────────────────────────────────────────────────

function PagePreviewPanel({
  page, space, onClose, onDelete, onFavorite,
}: {
  page: Page; space: Space | undefined;
  onClose: () => void;
  onDelete: (id: string) => void;
  onFavorite: (id: string) => void;
}) {
  const templateColor: Record<string, string> = {
    project: "#0EA5E9", meeting: "#10B981", prd: "#7467F0",
    research: "#F59E0B", task: "#F43F5E", blank: "#6b7280",
  };
  const tc = templateColor[page.template] ?? "#6b7280";

  const actions = [
    { icon: Edit3, label: "Rename", color: "#374151" },
    { icon: Move, label: "Move", color: "#374151" },
    { icon: Copy, label: "Duplicate", color: "#374151" },
    { icon: Share2, label: "Share", color: "#374151" },
    { icon: Download, label: "Export", color: "#374151" },
    { icon: Archive, label: "Archive", color: "#F59E0B" },
    { icon: Trash2, label: "Delete", color: "#F43F5E", action: () => onDelete(page.id) },
  ];

  return (
    <div style={{
      width: 300, flexShrink: 0, borderLeft: "1px solid #e5e7eb",
      background: "white", display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: 24 }}>{page.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1f36", lineHeight: 1.3, wordBreak: "break-word" }}>
            {page.title || "Untitled"}
          </div>
          <Badge label={TEMPLATE_LABELS[page.template] ?? page.template} color={tc} />
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 2, borderRadius: 6, flexShrink: 0 }}>
          <X size={16} />
        </button>
      </div>

      {/* Meta */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", flexDirection: "column", gap: 10 }}>
        {space && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SpaceFolderIcon color={space.color} size={18} />
            <span style={{ fontSize: 12, color: "#6b7280" }}>{space.name}</span>
          </div>
        )}
        {page.content && (
          <p style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.5, margin: 0 }}>
            {page.content.slice(0, 120)}{page.content.length > 120 ? "…" : ""}
          </p>
        )}
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#9ca3af", fontSize: 12 }}>
            <MessageSquare size={13} />
            <span>0 comments</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#9ca3af", fontSize: 12 }}>
            <Link2 size={13} />
            <span>0 tasks</span>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>
          Edited {formatRelativeTime(page.updatedAt)}
        </div>
      </div>

      {/* Favorite */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #f3f4f6" }}>
        <button
          onClick={() => onFavorite(page.id)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "none", border: "none", cursor: "pointer",
            color: page.isFavorite ? "#F59E0B" : "#6b7280", fontSize: 13, fontWeight: 500,
            padding: "6px 10px", borderRadius: 8,
            width: "100%",
          }}
        >
          <Star size={14} fill={page.isFavorite ? "#F59E0B" : "none"} />
          {page.isFavorite ? "Remove from favorites" : "Add to favorites"}
        </button>
      </div>

      {/* Actions */}
      <div style={{ padding: "10px 16px", flex: 1, overflowY: "auto" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
          Page Actions
        </div>
        {actions.map(({ icon: Icon, label, color, action }) => (
          <button
            key={label}
            onClick={action}
            style={{
              display: "flex", alignItems: "center", gap: 9,
              width: "100%", padding: "7px 10px", borderRadius: 8,
              background: "none", border: "none", cursor: action ? "pointer" : "default",
              color, fontSize: 13, fontWeight: 500, textAlign: "left",
              transition: "background 0.1s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Invite Collaborators Modal ───────────────────────────────────────────────

function InviteCollaboratorsModal({
  space, collaborators, onClose,
  onInvite, onRemove, onChangeRole,
}: {
  space: Space;
  collaborators: Collaborator[];
  onClose: () => void;
  onInvite: (email: string, name: string, role: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onChangeRole: (id: string, role: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("viewer");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const roleOptions = [
    { value: "viewer", label: "Viewer", desc: "Can read pages", icon: Eye },
    { value: "editor", label: "Editor", desc: "Can edit pages", icon: Edit3 },
    { value: "admin", label: "Admin", desc: "Full access", icon: Crown },
  ];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailRegex.test(email)) { setError("Enter a valid email address"); return; }
    setSending(true); setError("");
    try {
      await onInvite(email.trim(), name.trim(), role);
      setSent(true);
      setEmail(""); setName("");
      setTimeout(() => setSent(false), 2500);
    } catch (err: any) {
      setError(err?.message ?? "Failed to send invite");
    } finally { setSending(false); }
  };

  const getInitials = (email: string, name: string) => {
    if (name) return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    return email.slice(0, 2).toUpperCase();
  };

  const roleColor: Record<string, string> = { viewer: "#6b7280", editor: "#0EA5E9", admin: "#7467F0" };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: "white", borderRadius: 20, width: "100%", maxWidth: 520,
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column", maxHeight: "85vh",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "24px 24px 20px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "#EEF0FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Users size={18} color="#7467F0" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1f36" }}>Invite Collaborators</div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 1, display: "flex", alignItems: "center", gap: 6 }}>
                <SpaceFolderIcon color={space.color} size={14} />
                {space.name}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4, borderRadius: 6, flexShrink: 0 }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Invite form */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
          <form onSubmit={handleInvite}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Mail size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(""); }}
                  placeholder="Email address"
                  autoFocus
                  style={{
                    width: "100%", padding: "9px 11px 9px 30px", borderRadius: 10,
                    border: `1.5px solid ${error ? "#F43F5E" : "#e5e7eb"}`,
                    fontSize: 13, color: "#1a1f36", outline: "none",
                    boxSizing: "border-box", background: "#f9fafb",
                  }}
                />
              </div>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Name (optional)"
                style={{
                  width: 130, padding: "9px 11px", borderRadius: 10,
                  border: "1.5px solid #e5e7eb", fontSize: 13, color: "#1a1f36",
                  outline: "none", background: "#f9fafb",
                }}
              />
            </div>

            {/* Role selector */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {roleOptions.map(({ value, label, desc, icon: Icon }) => (
                <button
                  key={value} type="button"
                  onClick={() => setRole(value)}
                  style={{
                    flex: 1, padding: "8px 10px", borderRadius: 10,
                    border: `1.5px solid ${role === value ? "#7467F0" : "#e5e7eb"}`,
                    background: role === value ? "#EEF0FF" : "white",
                    cursor: "pointer", textAlign: "center", transition: "all 0.15s",
                  }}
                >
                  <Icon size={14} color={role === value ? "#7467F0" : "#9ca3af"} style={{ marginBottom: 3 }} />
                  <div style={{ fontSize: 12, fontWeight: 600, color: role === value ? "#7467F0" : "#374151" }}>{label}</div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>{desc}</div>
                </button>
              ))}
            </div>

            {error && <div style={{ fontSize: 12, color: "#F43F5E", marginBottom: 8 }}>{error}</div>}

            <button
              type="submit"
              disabled={!email.trim() || sending}
              style={{
                width: "100%", padding: "10px 0", borderRadius: 10,
                background: email.trim() && !sending ? "#7467F0" : "#e5e7eb",
                color: email.trim() && !sending ? "white" : "#9ca3af",
                border: "none", cursor: email.trim() && !sending ? "pointer" : "not-allowed",
                fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center",
                justifyContent: "center", gap: 7, transition: "all 0.15s",
              }}
            >
              {sent ? (
                <><CheckCircle2 size={15} /> Invite sent!</>
              ) : sending ? (
                <>Sending…</>
              ) : (
                <><Send size={14} /> Send Invite</>
              )}
            </button>
          </form>
        </div>

        {/* Current collaborators */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            {collaborators.length === 0 ? "No collaborators yet" : `${collaborators.length} collaborator${collaborators.length !== 1 ? "s" : ""}`}
          </div>

          {/* Owner row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
            <Avatar initials="Me" color={space.color} size={32} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1f36" }}>You (Owner)</div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>Workspace owner</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "#7467F0" }}>
              <Crown size={13} /> Owner
            </div>
          </div>

          {collaborators.map(collab => {
            const rc = roleColor[collab.role] ?? "#6b7280";
            return (
              <div key={collab.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
                <Avatar initials={getInitials(collab.email, collab.name)} color={rc} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1f36", display: "flex", alignItems: "center", gap: 6 }}>
                    {collab.name || collab.email}
                    {collab.status === "pending" && (
                      <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 99, background: "#FEF3C7", color: "#D97706", fontWeight: 500 }}>
                        Pending
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{collab.email}</div>
                </div>

                {/* Role selector */}
                <select
                  value={collab.role}
                  onChange={e => onChangeRole(collab.id, e.target.value)}
                  style={{
                    padding: "4px 8px", borderRadius: 8,
                    border: "1.5px solid #e5e7eb", fontSize: 12,
                    color: rc, fontWeight: 600, background: "white",
                    cursor: "pointer", outline: "none",
                  }}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>

                <button
                  onClick={() => onRemove(collab.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", padding: 4, borderRadius: 6 }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#F43F5E")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#d1d5db")}
                >
                  <X size={15} />
                </button>
              </div>
            );
          })}

          {collaborators.length === 0 && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#9ca3af", fontSize: 13 }}>
              <UserPlus size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
              <div>Invite teammates to collaborate on this space.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Space Card ───────────────────────────────────────────────────────────────

function SpaceCard({
  space, pageCount, collaborators, onOpen, onFavorite, onEdit, onDelete, onInvite, viewMode,
}: {
  space: Space; pageCount: number; collaborators: Collaborator[];
  onOpen: () => void; onFavorite: () => void;
  onEdit: () => void; onDelete: () => void; onInvite: () => void;
  viewMode: "grid" | "list";
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = [
    { icon: Edit3, label: "Rename Space", action: onEdit },
    { icon: Plus, label: "Add Page", action: onOpen },
    { icon: Users, label: "Invite Collaborators", action: onInvite, highlight: true },
    { icon: Trash2, label: "Delete Space", action: onDelete, danger: true },
  ];

  if (viewMode === "list") {
    return (
      <div
        style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "12px 16px", borderRadius: 12,
          border: "1px solid #e5e7eb", background: "white",
          cursor: "pointer", transition: "box-shadow 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)")}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
        onClick={onOpen}
      >
        <SpaceFolderIcon color={space.color} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1f36", marginBottom: 2 }}>{space.name}</div>
          <div style={{ fontSize: 12, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{space.description || "No description"}</div>
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" }}>{pageCount} {pageCount === 1 ? "page" : "pages"}</div>
        <div style={{ fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" }}>{formatRelativeTime(space.updatedAt)}</div>
        <button onClick={e => { e.stopPropagation(); onFavorite(); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: space.isFavorite ? "#F59E0B" : "#d1d5db" }}>
          <Star size={16} fill={space.isFavorite ? "#F59E0B" : "none"} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <div
        onClick={onOpen}
        style={{
          borderRadius: 16, border: "1px solid #e5e7eb", background: "white",
          padding: 20, cursor: "pointer", transition: "all 0.15s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; e.currentTarget.style.borderColor = "#d1d5db"; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
      >
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
          <SpaceFolderIcon color={space.color} size={40} />
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <button
              onClick={e => { e.stopPropagation(); onFavorite(); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: space.isFavorite ? "#F59E0B" : "#d1d5db", borderRadius: 6, transition: "color 0.1s" }}
            >
              <Star size={16} fill={space.isFavorite ? "#F59E0B" : "none"} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#9ca3af", borderRadius: 6 }}
            >
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        {/* Name & description */}
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1f36", marginBottom: 5, lineHeight: 1.3 }}>{space.name}</div>
        <div style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.5, marginBottom: 14, minHeight: 36 }}>
          {space.description || "No description"}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid #f3f4f6" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* Owner avatar */}
            <Avatar initials="Me" color={space.color} size={22} />
            {/* Collaborator avatars (up to 3) */}
            {collaborators.slice(0, 3).map((c, i) => {
              const initials = c.name
                ? c.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
                : c.email.slice(0, 2).toUpperCase();
              const roleColor: Record<string, string> = { viewer: "#6b7280", editor: "#0EA5E9", admin: "#7467F0" };
              return (
                <div key={c.id} style={{ marginLeft: -6 }} title={c.name || c.email}>
                  <Avatar initials={initials} color={roleColor[c.role] ?? "#6b7280"} size={22} />
                </div>
              );
            })}
            {collaborators.length > 3 && (
              <div style={{
                marginLeft: -6, width: 22, height: 22, borderRadius: "50%",
                background: "#f3f4f6", border: "2px solid white",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 700, color: "#6b7280",
              }}>
                +{collaborators.length - 3}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#6b7280", fontSize: 12 }}>
              <FileText size={12} />
              <span>{pageCount} {pageCount === 1 ? "page" : "pages"}</span>
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>
              {formatRelativeTime(space.updatedAt)}
            </div>
          </div>
        </div>
      </div>

      {/* Dropdown Menu */}
      {menuOpen && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 50 }} onClick={() => setMenuOpen(false)} />
          <div style={{
            position: "absolute", top: 52, right: 8, zIndex: 100,
            background: "white", borderRadius: 12, padding: "6px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)", border: "1px solid #e5e7eb",
            minWidth: 160,
          }}>
            {menuItems.map(({ icon: Icon, label, action, danger, highlight }: any) => (
              <button
                key={label}
                onClick={e => { e.stopPropagation(); setMenuOpen(false); action(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 9,
                  width: "100%", padding: "8px 12px", borderRadius: 8,
                  background: "none", border: "none", cursor: "pointer",
                  color: danger ? "#F43F5E" : highlight ? "#7467F0" : "#374151",
                  fontSize: 13, fontWeight: highlight ? 600 : 500, textAlign: "left",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = highlight ? "#EEF0FF" : "#f9fafb")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Space Detail View ────────────────────────────────────────────────────────

function SpaceDetailView({
  space, pages, onBack, onNewPage, onPageClick, onPageFavorite, onPageDelete, selectedPageId,
}: {
  space: Space; pages: Page[];
  onBack: () => void;
  onNewPage: () => void;
  onPageClick: (id: string) => void;
  onPageFavorite: (id: string) => void;
  onPageDelete: (id: string) => void;
  selectedPageId: string | null;
}) {
  const [search, setSearch] = useState("");

  const templateColor: Record<string, string> = {
    project: "#0EA5E9", meeting: "#10B981", prd: "#7467F0",
    research: "#F59E0B", task: "#F43F5E", blank: "#6b7280",
  };

  const filtered = pages.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "20px 28px 0", borderBottom: "1px solid #e5e7eb", background: "white", flexShrink: 0 }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, fontSize: 12, color: "#9ca3af" }}>
          <button
            onClick={onBack}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "#7467F0", fontWeight: 500, fontSize: 12, padding: 0 }}
          >
            <ArrowLeft size={13} />
            All Spaces
          </button>
          <ChevronRight size={12} />
          <span style={{ color: "#1a1f36", fontWeight: 600 }}>{space.name}</span>
        </div>

        {/* Title row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <SpaceFolderIcon color={space.color} size={42} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1f36" }}>{space.name}</div>
            {space.description && (
              <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 3 }}>{space.description}</div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 12, color: "#9ca3af", marginRight: 8 }}>
              {pages.length} {pages.length === 1 ? "page" : "pages"}
            </div>
            <button
              onClick={onNewPage}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 16px", borderRadius: 10,
                background: "#7467F0", color: "white",
                border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              }}
            >
              <Plus size={15} />
              New Page
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 20, maxWidth: 340 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search pages…"
            style={{
              width: "100%", padding: "8px 12px 8px 34px", borderRadius: 10,
              border: "1.5px solid #e5e7eb", fontSize: 13, color: "#1a1f36",
              outline: "none", background: "#f9fafb", boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* Pages table */}
      <div style={{ flex: 1, overflow: "auto", padding: "0 28px 24px" }}>
        {filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "64px 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "#EEF0FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileText size={24} color="#7467F0" />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1f36", marginBottom: 4 }}>
                {search ? "No pages found" : "No pages yet"}
              </div>
              <div style={{ fontSize: 13, color: "#9ca3af" }}>
                {search ? "Try a different search" : "Create your first page in this space"}
              </div>
            </div>
            {!search && (
              <button
                onClick={onNewPage}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "9px 18px", borderRadius: 10,
                  background: "#7467F0", color: "white",
                  border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                }}
              >
                <Plus size={15} /> Create Page
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                {["Page Name", "Template", "Last Updated", "Favorite"].map(h => (
                  <th key={h} style={{ padding: "12px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(page => {
                const tc = templateColor[page.template] ?? "#6b7280";
                const isSelected = selectedPageId === page.id;
                return (
                  <tr
                    key={page.id}
                    onClick={() => onPageClick(page.id)}
                    style={{
                      borderBottom: "1px solid #f3f4f6", cursor: "pointer",
                      background: isSelected ? "#fafafa" : "transparent",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => !isSelected && (e.currentTarget.style.background = "#f9fafb")}
                    onMouseLeave={e => !isSelected && (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "14px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 18 }}>{page.emoji}</span>
                        <span style={{ fontSize: 14, fontWeight: 500, color: "#1a1f36" }}>{page.title || "Untitled"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 12px" }}>
                      <Badge label={TEMPLATE_LABELS[page.template] ?? page.template} color={tc} />
                    </td>
                    <td style={{ padding: "14px 12px" }}>
                      <span style={{ fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" }}>{formatRelativeTime(page.updatedAt)}</span>
                    </td>
                    <td style={{ padding: "14px 12px" }}>
                      <button
                        onClick={e => { e.stopPropagation(); onPageFavorite(page.id); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: page.isFavorite ? "#F59E0B" : "#d1d5db", padding: 4 }}
                      >
                        <Star size={15} fill={page.isFavorite ? "#F59E0B" : "none"} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── All Spaces View ──────────────────────────────────────────────────────────

function AllSpacesView({
  spaces, pages, collaboratorsMap,
  onOpenSpace, onFavoriteSpace, onEditSpace, onDeleteSpace,
  onNewSpace, onNewPage, onInviteCollaborators, onCreateStarterSpace, loading,
}: {
  spaces: Space[]; pages: Page[];
  collaboratorsMap: Record<string, Collaborator[]>;
  onOpenSpace: (id: string) => void;
  onFavoriteSpace: (id: string) => void;
  onEditSpace: (space: Space) => void;
  onDeleteSpace: (id: string) => void;
  onNewSpace: () => void;
  onNewPage: () => void;
  onInviteCollaborators: (space: Space) => void;
  onCreateStarterSpace: (starter: typeof STARTER_SPACES[number]) => void;
  loading: boolean;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "favorites" | "recent" | "archived">("all");
  const [sort, setSort] = useState("updated");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortOpen, setSortOpen] = useState(false);

  const pageCountForSpace = (spaceId: string) => pages.filter(p => p.spaceId === spaceId).length;

  const filtered = spaces
    .filter(s => {
      if (filter === "favorites") return s.isFavorite && !s.isArchived;
      if (filter === "archived") return s.isArchived;
      if (filter === "recent") return !s.isArchived;
      return !s.isArchived;
    })
    .filter(s => {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "pages") return pageCountForSpace(b.id) - pageCountForSpace(a.id);
      if (sort === "favorites") return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const tabs: { key: typeof filter; label: string; icon: React.ElementType }[] = [
    { key: "all", label: "All Spaces", icon: FolderOpen },
    { key: "favorites", label: "Favorites", icon: Star },
    { key: "recent", label: "Recently Opened", icon: Clock },
    { key: "archived", label: "Archived", icon: Archive },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "24px 28px 0", background: "white", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1a1f36", margin: 0 }}>All Spaces</h1>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: "4px 0 0" }}>
              {spaces.filter(s => !s.isArchived).length} space{spaces.filter(s => !s.isArchived).length !== 1 ? "s" : ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onNewPage}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 14px", borderRadius: 10,
                border: "1.5px solid #e5e7eb", background: "white",
                color: "#374151", cursor: "pointer", fontSize: 13, fontWeight: 600,
              }}
            >
              <FileText size={14} />
              New Page
            </button>
            <button
              onClick={onNewSpace}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 16px", borderRadius: 10,
                background: "#7467F0", color: "white",
                border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              }}
            >
              <Plus size={15} />
              New Space
            </button>
          </div>
        </div>

        {/* Search + controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 0 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 380 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search spaces or pages…"
              style={{
                width: "100%", padding: "9px 12px 9px 34px", borderRadius: 10,
                border: "1.5px solid #e5e7eb", fontSize: 13, color: "#1a1f36",
                outline: "none", background: "#f9fafb", boxSizing: "border-box",
              }}
            />
          </div>

          {/* View toggle */}
          <div style={{ display: "flex", border: "1.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
            {(["grid", "list"] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: "8px 12px", background: viewMode === mode ? "#7467F0" : "white",
                  color: viewMode === mode ? "white" : "#6b7280",
                  border: "none", cursor: "pointer", display: "flex", alignItems: "center",
                  transition: "all 0.15s",
                }}
              >
                {mode === "grid" ? <Grid3X3 size={15} /> : <List size={15} />}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setSortOpen(o => !o)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 12px", borderRadius: 10,
                border: "1.5px solid #e5e7eb", background: "white",
                color: "#374151", cursor: "pointer", fontSize: 13,
              }}
            >
              {SORT_OPTIONS.find(o => o.value === sort)?.label}
              <ChevronDown size={13} />
            </button>
            {sortOpen && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 50 }} onClick={() => setSortOpen(false)} />
                <div style={{
                  position: "absolute", top: 44, right: 0, zIndex: 100,
                  background: "white", borderRadius: 12, padding: 6,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.12)", border: "1px solid #e5e7eb",
                  minWidth: 180,
                }}>
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setSort(opt.value); setSortOpen(false); }}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        width: "100%", padding: "8px 12px", borderRadius: 8,
                        background: "none", border: "none", cursor: "pointer",
                        color: sort === opt.value ? "#7467F0" : "#374151",
                        fontSize: 13, fontWeight: sort === opt.value ? 600 : 400,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                      onMouseLeave={e => (e.currentTarget.style.background = "none")}
                    >
                      {opt.label}
                      {sort === opt.value && <Check size={13} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 0, marginTop: 16, borderBottom: "1px solid #e5e7eb" }}>
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "10px 16px", background: "none", border: "none",
                cursor: "pointer", fontSize: 13, fontWeight: filter === key ? 600 : 400,
                color: filter === key ? "#7467F0" : "#6b7280",
                borderBottom: `2px solid ${filter === key ? "#7467F0" : "transparent"}`,
                marginBottom: -1, transition: "all 0.15s", whiteSpace: "nowrap",
              }}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: "24px 28px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #EEF0FF", borderTopColor: "#7467F0", animation: "spin 0.8s linear infinite" }} />
          </div>
        ) : filtered.length === 0 ? (
          search || filter !== "all" ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "64px 0" }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: "#EEF0FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FolderOpen size={28} color="#7467F0" />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1f36", marginBottom: 6 }}>
                  {search ? "No spaces found" : filter === "favorites" ? "No favorite spaces" : "No archived spaces"}
                </div>
                <div style={{ fontSize: 13, color: "#9ca3af" }}>
                  {search ? "Try a different search term" : "Nothing here yet"}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 0" }}>
              {/* Hero */}
              <div style={{ textAlign: "center", marginBottom: 36 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🧠</div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1a1f36", margin: "0 0 8px" }}>
                  Build Your Second Brain
                </h2>
                <p style={{ fontSize: 14, color: "#6b7280", margin: 0, lineHeight: 1.6 }}>
                  Spaces are your knowledge vaults. Each one is a focused area of growth —<br />
                  book notes, skill blueprints, systems, reflections, and more.
                </p>
              </div>

              {/* Starter Spaces */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                  Quick Start — Create a Space
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {STARTER_SPACES.map(starter => (
                    <button
                      key={starter.name}
                      onClick={() => onCreateStarterSpace(starter)}
                      style={{
                        display: "flex", alignItems: "center", gap: 14,
                        padding: "16px 18px", borderRadius: 14,
                        border: `1.5px solid ${starter.color}30`,
                        background: starter.color + "0A",
                        cursor: "pointer", textAlign: "left",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = starter.color + "18";
                        (e.currentTarget as HTMLElement).style.borderColor = starter.color + "60";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = starter.color + "0A";
                        (e.currentTarget as HTMLElement).style.borderColor = starter.color + "30";
                      }}
                    >
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: starter.color + "20",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 22, flexShrink: 0,
                      }}>
                        {starter.emoji}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1f36", marginBottom: 2 }}>{starter.name}</div>
                        <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.4 }}>{starter.desc}</div>
                      </div>
                      <div style={{ marginLeft: "auto", color: starter.color, flexShrink: 0 }}>
                        <Plus size={16} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
                <span style={{ fontSize: 12, color: "#9ca3af" }}>or</span>
                <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
              </div>

              {/* Custom create */}
              <div style={{ textAlign: "center" }}>
                <button
                  onClick={onNewSpace}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    padding: "10px 22px", borderRadius: 12,
                    background: "white", color: "#374151",
                    border: "1.5px solid #e5e7eb", cursor: "pointer",
                    fontSize: 13, fontWeight: 600,
                  }}
                >
                  <Plus size={14} /> Create Custom Space
                </button>
              </div>

              {/* What goes in each */}
              <div style={{ marginTop: 36, padding: "20px 24px", background: "#f9fafb", borderRadius: 14, border: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 12 }}>📌 What to Put in Each Space</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px" }}>
                  {[
                    ["🧠 Second Brain", "Insights, ideas, mental models, book notes"],
                    ["📚 Learning Library", "Course notes, tutorials, skill blueprints"],
                    ["🎯 Skill Mastery", "Deep practice logs, progress tracking"],
                    ["⚙️ Systems & SOPs", "Daily routines, protocols, playbooks"],
                    ["🌱 Personal Growth", "Weekly reflections, 90-day sprints, goals"],
                  ].map(([title, desc]) => (
                    <div key={title} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{title}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        ) : viewMode === "grid" ? (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
          }}>
            {filtered.map(space => (
              <SpaceCard
                key={space.id}
                space={space}
                pageCount={pageCountForSpace(space.id)}
                collaborators={collaboratorsMap[space.id] ?? []}
                viewMode="grid"
                onOpen={() => onOpenSpace(space.id)}
                onFavorite={() => onFavoriteSpace(space.id)}
                onEdit={() => onEditSpace(space)}
                onDelete={() => onDeleteSpace(space.id)}
                onInvite={() => onInviteCollaborators(space)}
              />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(space => (
              <SpaceCard
                key={space.id}
                space={space}
                pageCount={pageCountForSpace(space.id)}
                collaborators={collaboratorsMap[space.id] ?? []}
                viewMode="list"
                onOpen={() => onOpenSpace(space.id)}
                onFavorite={() => onFavoriteSpace(space.id)}
                onEdit={() => onEditSpace(space)}
                onDelete={() => onDeleteSpace(space.id)}
                onInvite={() => onInviteCollaborators(space)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page Editor View ─────────────────────────────────────────────────────────

function EditorToolBtn({ onClick, active, title, children }: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      style={{
        width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center",
        justifyContent: "center", border: "none", cursor: "pointer",
        background: active ? "#EEF0FF" : "transparent",
        color: active ? "#7467F0" : "#6B7280",
        transition: "background 0.15s",
      }}
    >{children}</button>
  );
}

function ToolDivider() {
  return <div style={{ width: 1, height: 18, background: "#E5E7EB", margin: "0 4px", flexShrink: 0 }} />;
}

function PageEditorView({
  page, space, spacePageCount,
  onBack, onNewPage, onPageSave,
}: {
  page: Page;
  space: Space;
  spacePageCount: number;
  onBack: () => void;
  onNewPage: () => void;
  onPageSave: (id: string, data: { title?: string; content?: string }) => void;
}) {
  const [title, setTitle] = useState(page.title);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [wordCount, setWordCount] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentContent = useRef(page.content || "");

  const persistSave = useCallback(async (t: string, c: string) => {
    try {
      await api.put(`/pages/${page.id}`, { title: t, content: c });
      onPageSave(page.id, { title: t, content: c });
      setSaveStatus("saved");
    } catch { setSaveStatus("unsaved"); }
  }, [page.id, onPageSave]);

  const scheduleSave = useCallback((t: string, c: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(() => persistSave(t, c), 1500);
  }, [persistSave]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Placeholder.configure({
        placeholder: "Write the page. Use / for blocks, the mic for voice, or AI Refine on selected text.",
      }),
      CharacterCount,
      Underline,
      Highlight.configure({ multicolor: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false }),
      Typography,
    ],
    content: page.content || "",
    onUpdate({ editor }) {
      const html = editor.getHTML();
      currentContent.current = html;
      setWordCount(editor.storage.characterCount?.words() ?? 0);
      scheduleSave(title, html);
    },
  });

  // Re-load editor when page changes
  useEffect(() => {
    setTitle(page.title);
    setSaveStatus("saved");
    currentContent.current = page.content || "";
    if (editor) editor.commands.setContent(page.content || "");
  }, [page.id]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    scheduleSave(val, currentContent.current);
  };

  const timeSince = (d?: string) => {
    if (!d) return "just now";
    const ms = Date.now() - new Date(d).getTime();
    if (ms < 60000) return "just now";
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
    if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
    return `${Math.floor(ms / 86400000)}d ago`;
  };

  const spaceEmoji = space.color ? "🗂" : "📁";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#F8FAFC", overflow: "hidden" }}>
      {/* ── Top nav bar ── */}
      <div style={{
        display: "flex", alignItems: "center", padding: "10px 20px",
        background: "white", borderBottom: "1px solid #E5E7EB", flexShrink: 0, gap: 6,
      }}>
        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: 5, background: "none", border: "none",
            cursor: "pointer", color: "#7467F0", fontSize: 13, fontWeight: 500, padding: "4px 8px",
            borderRadius: 6,
          }}
        >
          <ArrowLeft size={14} />
          {space.name}
        </button>
        <ChevronRight size={12} style={{ color: "#D1D5DB" }} />
        <span style={{ fontSize: 13, color: "#9CA3AF" }}>Pages</span>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {/* Saved status */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span style={{
              color: saveStatus === "saving" ? "#9CA3AF" : saveStatus === "saved" ? "#22C55E" : "#EF4444",
              fontWeight: 500,
            }}>
              {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "Unsaved"}
            </span>
            <span style={{
              background: "#F3F4F6", color: "#6B7280", borderRadius: 6,
              padding: "2px 8px", fontWeight: 500,
            }}>
              {wordCount} {wordCount === 1 ? "word" : "words"}
            </span>
          </div>
          <button
            onClick={onNewPage}
            style={{
              display: "flex", alignItems: "center", gap: 6, background: "#7467F0", color: "white",
              border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <Plus size={14} /> New Page
          </button>
          <button style={{
            width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center",
            justifyContent: "center", background: "white", border: "1px solid #E5E7EB", cursor: "pointer",
            color: "#6B7280",
          }}>
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* ── Space header ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "12px 24px",
        background: "white", borderBottom: "1px solid #E5E7EB", flexShrink: 0,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 20, background: (space.color || "#7467F0") + "18",
          border: `1px solid ${space.color || "#7467F0"}30`,
        }}>
          {spaceEmoji}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>{space.name}</div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 1 }}>{spacePageCount} pages</div>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px 48px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>

          {/* Page title */}
          <input
            value={title}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="Untitled"
            style={{
              width: "100%", fontSize: 30, fontWeight: 700, border: "none", outline: "none",
              background: "transparent", color: "#111827", fontFamily: "inherit",
              padding: 0, marginBottom: 8,
            }}
          />

          {/* Page meta */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#9CA3AF", marginBottom: 24 }}>
            <span>{page.template || "Blank Page"}</span>
            <span>·</span>
            <span>Updated {timeSince((page as any).updatedAt)}</span>
            <span>·</span>
            <span style={{
              background: "#EEF0FF", color: "#7467F0", borderRadius: 4,
              padding: "1px 6px", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em",
            }}>SA</span>
          </div>

          {/* ── Toolbar ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: 2,
            padding: "6px 12px", background: "white",
            border: "1px solid #E5E7EB", borderBottom: "none",
            borderRadius: "10px 10px 0 0", flexWrap: "wrap",
          }}>
            {editor && <>
              <EditorToolBtn
                onClick={() => editor.chain().focus().setParagraph().run()}
                active={editor.isActive("paragraph")} title="Paragraph"
              >
                <Type size={13} />
              </EditorToolBtn>
              <EditorToolBtn
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                active={editor.isActive("heading", { level: 1 })} title="Heading 1"
              >
                <span style={{ fontSize: 11, fontWeight: 700 }}>H1</span>
              </EditorToolBtn>
              <EditorToolBtn
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                active={editor.isActive("heading", { level: 2 })} title="Heading 2"
              >
                <span style={{ fontSize: 11, fontWeight: 700 }}>H2</span>
              </EditorToolBtn>
              <EditorToolBtn
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                active={editor.isActive("heading", { level: 3 })} title="Heading 3"
              >
                <span style={{ fontSize: 11, fontWeight: 700 }}>H3</span>
              </EditorToolBtn>

              <ToolDivider />

              <EditorToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
                <Bold size={13} />
              </EditorToolBtn>
              <EditorToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
                <Italic size={13} />
              </EditorToolBtn>
              <EditorToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
                <UnderlineIcon size={13} />
              </EditorToolBtn>

              <ToolDivider />

              <EditorToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List">
                <ListIcon size={13} />
              </EditorToolBtn>
              <EditorToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered List">
                <ListOrdered size={13} />
              </EditorToolBtn>
              <EditorToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline Code">
                <Code size={13} />
              </EditorToolBtn>
              <EditorToolBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Highlight">
                <Highlighter size={13} />
              </EditorToolBtn>
              <EditorToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Divider">
                <Minus size={13} />
              </EditorToolBtn>

              <ToolDivider />

              {/* Voice button */}
              <button
                style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "4px 10px",
                  borderRadius: 6, border: "none", cursor: "pointer",
                  background: "transparent", color: "#6B7280", fontSize: 12, fontWeight: 500,
                }}
                title="Voice input"
              >
                <Mic size={13} /> Voice
              </button>
            </>}
          </div>

          {/* ── Editor card ── */}
          <div style={{
            background: "white", border: "1px solid #E5E7EB",
            borderRadius: "0 0 10px 10px", minHeight: 360,
            padding: "20px 28px",
          }}>
            {editor && (
              <BubbleMenu editor={editor} shouldShow={({ state }) => {
                const { from, to } = state.selection;
                return from !== to;
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 2, padding: "6px 8px",
                  background: "white", border: "1px solid #E5E7EB", borderRadius: 10,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                }}>
                  <EditorToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
                    <Bold size={12} />
                  </EditorToolBtn>
                  <EditorToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
                    <Italic size={12} />
                  </EditorToolBtn>
                  <EditorToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
                    <UnderlineIcon size={12} />
                  </EditorToolBtn>
                  <EditorToolBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Highlight">
                    <Highlighter size={12} />
                  </EditorToolBtn>
                </div>
              </BubbleMenu>
            )}
            <EditorContent editor={editor} className="tiptap-editor" />
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function PagesSpacesPage() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"spaces" | "space-detail" | "page-editor">("spaces");
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [spacePages, setSpacePages] = useState<Page[]>([]);
  const [spacePagesLoading, setSpacePagesLoading] = useState(false);

  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [invitingSpace, setInvitingSpace] = useState<Space | null>(null);
  const [collaboratorsMap, setCollaboratorsMap] = useState<Record<string, Collaborator[]>>({});

  // Load spaces + all pages
  useEffect(() => {
    Promise.all([
      api.get<Space[]>("/spaces"),
      api.get<Page[]>("/pages"),
    ]).then(([s, p]) => {
      setSpaces(s);
      setPages(p);
      // Load collaborators for each space
      s.forEach(space => {
        api.get<Collaborator[]>(`/collaborators/${space.id}`)
          .then(collabs => setCollaboratorsMap(prev => ({ ...prev, [space.id]: collabs })))
          .catch(() => {});
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Load pages for selected space
  useEffect(() => {
    if (!selectedSpaceId) { setSpacePages([]); return; }
    setSpacePagesLoading(true);
    api.get<Page[]>(`/pages?spaceId=${selectedSpaceId}`)
      .then(setSpacePages)
      .catch(console.error)
      .finally(() => setSpacePagesLoading(false));
  }, [selectedSpaceId]);

  const openSpace = (id: string) => {
    setSelectedSpaceId(id);
    setSelectedPageId(null);
    setEditingPageId(null);
    setView("space-detail");
  };

  const openPageEditor = (pageId: string, spaceId: string) => {
    setSelectedSpaceId(spaceId);
    setEditingPageId(pageId);
    setSelectedPageId(null);
    setView("page-editor");
  };

  const goBack = () => {
    if (view === "page-editor") {
      setEditingPageId(null);
      setView("space-detail");
      return;
    }
    setView("spaces");
    setSelectedSpaceId(null);
    setSelectedPageId(null);
    setEditingPageId(null);
    api.get<Page[]>("/pages").then(setPages).catch(console.error);
  };

  const handleCreateSpace = async (data: { name: string; description: string; color: string }) => {
    const space = { id: uid(), ...data, isFavorite: false, isArchived: false };
    try {
      const created = await api.post<Space>("/spaces", space);
      setSpaces(prev => [created, ...prev]);
    } catch { setSpaces(prev => [space as Space, ...prev]); }
    setShowCreateSpace(false);
  };

  const handleCreateStarterSpace = async (starter: typeof STARTER_SPACES[number]) => {
    const space = { id: uid(), name: starter.name, description: starter.desc, color: starter.color, isFavorite: false, isArchived: false };
    let created: Space = space as Space;
    try { created = await api.post<Space>("/spaces", space); } catch { /* optimistic */ }
    setSpaces(prev => [created, ...prev]);
    openSpace(created.id);
  };

  const handleEditSpace = async (data: { name: string; description: string; color: string }) => {
    if (!editingSpace) return;
    const updated = { ...editingSpace, ...data };
    setSpaces(prev => prev.map(s => s.id === editingSpace.id ? updated : s));
    try { await api.put(`/spaces/${editingSpace.id}`, data); } catch (e) { console.error(e); }
    setEditingSpace(null);
  };

  const handleFavoriteSpace = async (id: string) => {
    setSpaces(prev => prev.map(s => s.id === id ? { ...s, isFavorite: !s.isFavorite } : s));
    const space = spaces.find(s => s.id === id);
    if (space) {
      try { await api.put(`/spaces/${id}`, { ...space, isFavorite: !space.isFavorite }); } catch (e) { console.error(e); }
    }
  };

  const handleDeleteSpace = async (id: string) => {
    setSpaces(prev => prev.filter(s => s.id !== id));
    try { await api.delete(`/spaces/${id}`); } catch (e) { console.error(e); }
    if (selectedSpaceId === id) goBack();
  };

  const handleCreatePage = async (data: { title: string; spaceId: string; template: string }) => {
    const meta = TEMPLATE_META[data.template];
    const content = getTemplateContent(data.template, data.title);
    const page = { id: uid(), title: data.title, spaceId: data.spaceId, template: data.template, content, emoji: meta?.emoji ?? "📄", parentId: null, isFavorite: false };
    let created: Page = page as Page;
    try {
      created = await api.post<Page>("/pages", page);
    } catch { /* use optimistic */ }
    setSpacePages(prev => (data.spaceId === selectedSpaceId ? [created, ...prev] : prev));
    setPages(prev => [created, ...prev]);
    setShowCreatePage(false);
    // Ensure spacePages are loaded for the target space before opening editor
    if (data.spaceId !== selectedSpaceId) {
      setSelectedSpaceId(data.spaceId);
      try {
        const sp = await api.get<Page[]>(`/pages?spaceId=${data.spaceId}`);
        setSpacePages(sp.some(p => p.id === created.id) ? sp : [created, ...sp]);
      } catch { setSpacePages([created]); }
    }
    openPageEditor(created.id, data.spaceId);
  };

  const handlePageSave = useCallback((id: string, data: { title?: string; content?: string }) => {
    const update = (prev: Page[]) => prev.map(p => p.id === id ? { ...p, ...data } : p);
    setPages(update);
    setSpacePages(update);
  }, []);

  const handleFavoritePage = async (id: string) => {
    const update = (prev: Page[]) => prev.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p);
    setSpacePages(update);
    setPages(update);
    const page = spacePages.find(p => p.id === id) ?? pages.find(p => p.id === id);
    if (page) {
      try { await api.put(`/pages/${id}`, { ...page, isFavorite: !page.isFavorite }); } catch (e) { console.error(e); }
    }
  };

  const handleDeletePage = async (id: string) => {
    setSpacePages(prev => prev.filter(p => p.id !== id));
    setPages(prev => prev.filter(p => p.id !== id));
    if (selectedPageId === id) setSelectedPageId(null);
    try { await api.delete(`/pages/${id}`); } catch (e) { console.error(e); }
  };

  const handleInviteCollaborator = async (email: string, name: string, role: string) => {
    if (!invitingSpace) return;
    const collab = { id: uid(), email, name, role };
    const created = await api.post<Collaborator>(`/collaborators/${invitingSpace.id}`, collab);
    setCollaboratorsMap(prev => ({
      ...prev,
      [invitingSpace.id]: [...(prev[invitingSpace.id] ?? []), created],
    }));
  };

  const handleRemoveCollaborator = async (collabId: string) => {
    if (!invitingSpace) return;
    setCollaboratorsMap(prev => ({
      ...prev,
      [invitingSpace.id]: (prev[invitingSpace.id] ?? []).filter(c => c.id !== collabId),
    }));
    try { await api.delete(`/collaborators/${invitingSpace.id}/${collabId}`); } catch (e) { console.error(e); }
  };

  const handleChangeCollaboratorRole = async (collabId: string, role: string) => {
    if (!invitingSpace) return;
    setCollaboratorsMap(prev => ({
      ...prev,
      [invitingSpace.id]: (prev[invitingSpace.id] ?? []).map(c => c.id === collabId ? { ...c, role } : c),
    }));
    try { await api.put(`/collaborators/${invitingSpace.id}/${collabId}`, { role }); } catch (e) { console.error(e); }
  };

  const selectedSpace = spaces.find(s => s.id === selectedSpaceId);
  const selectedPage = spacePages.find(p => p.id === selectedPageId) ?? pages.find(p => p.id === selectedPageId);
  const editingPage = spacePages.find(p => p.id === editingPageId) ?? pages.find(p => p.id === editingPageId);

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", height: "100%", overflow: "hidden", background: "#f8fafc" }}>
        {/* Main content */}
        {view === "spaces" ? (
          <AllSpacesView
            spaces={spaces}
            pages={pages}
            collaboratorsMap={collaboratorsMap}
            loading={loading}
            onOpenSpace={openSpace}
            onFavoriteSpace={handleFavoriteSpace}
            onEditSpace={setEditingSpace}
            onDeleteSpace={handleDeleteSpace}
            onNewSpace={() => setShowCreateSpace(true)}
            onNewPage={() => { if (spaces.length > 0) setShowCreatePage(true); else setShowCreateSpace(true); }}
            onInviteCollaborators={setInvitingSpace}
            onCreateStarterSpace={handleCreateStarterSpace}
          />
        ) : view === "page-editor" && selectedSpace && editingPage ? (
          <PageEditorView
            page={editingPage}
            space={selectedSpace}
            spacePageCount={spacePages.length}
            onBack={goBack}
            onNewPage={() => setShowCreatePage(true)}
            onPageSave={handlePageSave}
          />
        ) : selectedSpace ? (
          <>
            <SpaceDetailView
              space={selectedSpace}
              pages={spacePages}
              onBack={goBack}
              onNewPage={() => setShowCreatePage(true)}
              onPageClick={id => openPageEditor(id, selectedSpace.id)}
              onPageFavorite={handleFavoritePage}
              onPageDelete={handleDeletePage}
              selectedPageId={selectedPageId}
            />
          </>
        ) : null}

        {/* Modals */}
        {showCreateSpace && (
          <CreateSpaceModal
            onClose={() => setShowCreateSpace(false)}
            onSave={handleCreateSpace}
          />
        )}
        {editingSpace && (
          <CreateSpaceModal
            initial={editingSpace}
            onClose={() => setEditingSpace(null)}
            onSave={handleEditSpace}
          />
        )}
        {invitingSpace && (
          <InviteCollaboratorsModal
            space={invitingSpace}
            collaborators={collaboratorsMap[invitingSpace.id] ?? []}
            onClose={() => setInvitingSpace(null)}
            onInvite={handleInviteCollaborator}
            onRemove={handleRemoveCollaborator}
            onChangeRole={handleChangeCollaboratorRole}
          />
        )}
        {showCreatePage && (
          <CreatePageModal
            spaces={spaces}
            defaultSpaceId={selectedSpaceId ?? undefined}
            onClose={() => setShowCreatePage(false)}
            onSave={handleCreatePage}
          />
        )}
      </div>
    </>
  );
}
