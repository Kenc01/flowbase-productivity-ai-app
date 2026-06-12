import React, { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import {
  Bot, KanbanSquare, NotebookPen, PenLine, Wand2, Calendar, BookOpen,
  LayoutDashboard, Users, Settings, Sparkles, Zap, ArrowRight,
  CheckCircle2, Star, ChevronDown, Menu, X, Play,
  Lightbulb, BarChart3, FileText, Layers, Brain, Shield,
  Github, Twitter, MessageSquare, Clock, Target, Flame,
  Globe, Lock, Cpu, TrendingUp, Award, Infinity as InfinityIcon,
  ListTodo, StickyNote, AlarmClock, Palette, Share2, MousePointer,
  ChevronRight, Minus, Plus,
} from "lucide-react";

// ── Design tokens ─────────────────────────────────────────────────────────────
const V = "#7467F0";
const C = "#06B6D4";
const G = `linear-gradient(135deg, ${V}, ${C})`;
const DARK = "hsl(246 80% 7%)";
const DARK2 = "hsl(246 60% 11%)";
const DARK3 = "hsl(246 50% 14%)";

// ── Lucide icon wrapper for gradient ─────────────────────────────────────────
function GIcon({ Icon, color, size = 22 }: { Icon: React.ElementType; color: string; size?: number }) {
  return (
    <div style={{ width: size + 12, height: size + 12, borderRadius: (size + 12) * 0.28, background: color + "1a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={size} color={color} strokeWidth={1.8} />
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const navLinks = ["Features", "How It Works", "Pricing", "FAQ"];

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? "rgba(12,8,40,0.92)" : "transparent",
      backdropFilter: scrolled ? "blur(16px)" : "none",
      borderBottom: scrolled ? "1px solid rgba(116,103,240,0.18)" : "none",
      transition: "all 0.3s ease",
    }}>
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", gap: 32 }}>
        {/* Logo */}
        <a href="#" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <img src="/logo.png" alt="Grind OS" style={{ width: 34, height: 34, borderRadius: 9, objectFit: "cover" }} />
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: "1.15rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>Grind OS</span>
        </a>

        {/* Desktop nav */}
        <div style={{ display: "flex", gap: 6, marginLeft: 8, flex: 1 }} className="fb-nav-links">
          {navLinks.map(n => (
            <a key={n} href={`#${n.toLowerCase().replace(/\s+/g, "-")}`}
              style={{ padding: "6px 14px", borderRadius: 7, fontSize: "0.88rem", fontWeight: 500, color: "rgba(255,255,255,0.75)", textDecoration: "none", transition: "color 0.15s,background 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.75)"; e.currentTarget.style.background = "transparent"; }}>
              {n}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }} className="fb-nav-cta">
          <Link href="/sign-in" style={{ padding: "7px 16px", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600, color: "rgba(255,255,255,0.8)", textDecoration: "none", transition: "color 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}>
            Sign in
          </Link>
          <Link href="/sign-up" style={{ padding: "8px 20px", borderRadius: 8, background: G, fontSize: "0.85rem", fontWeight: 700, color: "#fff", textDecoration: "none", boxShadow: "0 4px 16px rgba(116,103,240,0.45)", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5 }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 22px rgba(116,103,240,0.6)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(116,103,240,0.45)"; e.currentTarget.style.transform = "translateY(0)"; }}>
            Get Started <ArrowRight size={13} strokeWidth={2.5} />
          </Link>
        </div>

        {/* Mobile burger */}
        <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "none", padding: 4 }} className="fb-burger">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div style={{ background: "rgba(12,8,40,0.98)", borderBottom: "1px solid rgba(116,103,240,0.2)", padding: "12px 24px 20px" }}>
          {navLinks.map(n => (
            <a key={n} href={`#${n.toLowerCase().replace(/\s+/g, "-")}`} onClick={() => setOpen(false)}
              style={{ display: "block", padding: "10px 0", fontSize: "0.95rem", color: "rgba(255,255,255,0.8)", textDecoration: "none", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {n}
            </a>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <Link href="/sign-in" style={{ flex: 1, textAlign: "center", padding: "10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: "0.9rem", fontWeight: 600, textDecoration: "none" }}>Sign In</Link>
            <Link href="/sign-up" style={{ flex: 1, textAlign: "center", padding: "10px", borderRadius: 8, background: G, color: "#fff", fontSize: "0.9rem", fontWeight: 600, textDecoration: "none" }}>Get Started</Link>
          </div>
        </div>
      )}
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", padding: "100px 24px 80px", background: `linear-gradient(160deg, hsl(246 80% 7%) 0%, hsl(246 60% 11%) 50%, hsl(195 70% 9%) 100%)` }}>
      {/* Ambient glows */}
      <div style={{ position: "absolute", top: "10%", left: "20%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(116,103,240,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "15%", right: "15%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.14) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Badge */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 100, background: "rgba(116,103,240,0.15)", border: "1px solid rgba(116,103,240,0.35)", marginBottom: 28 }}>
        <Sparkles size={13} color={V} />
        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#c4beff", letterSpacing: "0.02em" }}>AI-Powered Productivity Workspace</span>
      </div>

      {/* Headline */}
      <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(2.4rem, 5.5vw, 4rem)", fontWeight: 800, color: "#fff", textAlign: "center", lineHeight: 1.12, letterSpacing: "-0.03em", maxWidth: 860, margin: "0 0 22px", position: "relative" }}>
        Your AI Workspace for{" "}
        <span style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Notes, Tasks, Boards &amp; Collaboration
        </span>
      </h1>

      {/* Sub */}
      <p style={{ fontSize: "clamp(1rem, 2vw, 1.15rem)", color: "rgba(255,255,255,0.62)", textAlign: "center", maxWidth: 620, lineHeight: 1.7, margin: "0 0 38px" }}>
        Grind OS unifies your Kanban boards, notes, whiteboards, calendar, and AI assistant into one beautifully designed workspace. Stop switching apps. Start building.
      </p>

      {/* CTAs */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 48 }}>
        <Link href="/sign-up" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 28px", borderRadius: 10, background: G, color: "#fff", fontSize: "0.95rem", fontWeight: 700, textDecoration: "none", boxShadow: "0 6px 24px rgba(116,103,240,0.5)", transition: "all 0.18s" }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 32px rgba(116,103,240,0.6)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(116,103,240,0.5)"; }}>
          Get Started Free <ArrowRight size={15} strokeWidth={2.5} />
        </Link>
        <a href="#how-it-works" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 28px", borderRadius: 10, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "#fff", fontSize: "0.95rem", fontWeight: 600, textDecoration: "none", transition: "all 0.18s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}>
          <Play size={15} fill="#fff" /> Watch Demo
        </a>
      </div>

      {/* Trust badges */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginBottom: 56 }}>
        {[
          { icon: Brain, label: "AI Assistant" },
          { icon: Users, label: "Real-time Collaboration" },
          { icon: Shield, label: "Privacy First" },
          { icon: Zap, label: "Lightning Fast" },
        ].map(b => {
          const Icon = b.icon;
          return (
            <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: 100, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <Icon size={13} color={C} strokeWidth={2} />
              <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{b.label}</span>
            </div>
          );
        })}
      </div>

      {/* Dashboard mockup */}
      <div style={{ width: "100%", maxWidth: 900, borderRadius: 18, overflow: "hidden", border: "1px solid rgba(116,103,240,0.28)", boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)", position: "relative" }}>
        <div style={{ background: "rgba(116,103,240,0.12)", backdropFilter: "blur(20px)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid rgba(116,103,240,0.2)" }}>
          {["#F43F5E", "#F59E0B", "#10B981"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
          <div style={{ flex: 1, height: 18, borderRadius: 4, background: "rgba(255,255,255,0.06)", maxWidth: 300, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)" }}>grind-os.app/dashboard</span>
          </div>
        </div>
        <div style={{ background: "rgba(10,7,30,0.85)", backdropFilter: "blur(20px)", padding: "20px", display: "grid", gridTemplateColumns: "180px 1fr", gap: 16, minHeight: 340 }}>
          {/* Fake sidebar */}
          <div style={{ borderRight: "1px solid rgba(255,255,255,0.06)", paddingRight: 14, display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ width: 100, height: 22, borderRadius: 5, background: G, marginBottom: 16, opacity: 0.8 }} />
            {[["#7467F0", "Dashboard"], ["#06B6D4", "Calendar"], ["#F43F5E", "Kanban"], ["#10B981", "Notes"], ["#6366F1", "Whiteboard"], ["#A855F7", "AI Templates"]].map(([c, l]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, background: l === "Dashboard" ? "rgba(116,103,240,0.2)" : "transparent" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
                <div style={{ width: 60, height: 8, borderRadius: 3, background: l === "Dashboard" ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)" }} />
              </div>
            ))}
          </div>
          {/* Fake content area */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
              {[["#7467F0", "48", "Tasks"], ["#10B981", "32", "Done"], ["#06B6D4", "12", "Events"], ["#A855F7", "7", "Notes"]].map(([c, v, l]) => (
                <div key={l} style={{ borderRadius: 8, padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: c, fontFamily: "'Outfit',sans-serif" }}>{v}</div>
                  <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, flex: 1 }}>
              {["Upcoming Calendar", "Task Summary", "AI Insights", "Recent Activity"].map(t => (
                <div key={t} style={{ borderRadius: 8, padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "rgba(255,255,255,0.45)", marginBottom: 8 }}>{t.toUpperCase()}</div>
                  {[70, 45, 85, 55].map((w, i) => (
                    <div key={i} style={{ height: 7, borderRadius: 3, background: "rgba(255,255,255,0.07)", marginBottom: 5, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${w}%`, background: G, borderRadius: 3 }} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────
const FEATURES = [
  { Icon: Bot, color: "#7467F0", title: "AI Assistant", desc: "Chat with your AI to create tasks, notes, calendar events, and get smart productivity insights — all hands-free." },
  { Icon: LayoutDashboard, color: "#06B6D4", title: "Smart Dashboard", desc: "A real-time overview of all your activity — tasks, events, notes, and AI insights in one beautiful view." },
  { Icon: Calendar, color: "#F59E0B", title: "Calendar & Reminders", desc: "Schedule events, set reminders, and track deadlines. Color-coded by category for effortless planning." },
  { Icon: KanbanSquare, color: "#10B981", title: "Kanban Task Boards", desc: "Drag-and-drop boards with priorities, due dates, labels, and real-time collaboration support." },
  { Icon: NotebookPen, color: "#F43F5E", title: "Notion-style Notes", desc: "Rich text notes with full formatting, color-coded cards, pinning, and AI-powered content refinement." },
  { Icon: PenLine, color: "#6366F1", title: "Miro-style Whiteboard", desc: "Infinite canvas for sketching, diagramming, and visual thinking. Powered by Excalidraw." },
  { Icon: Wand2, color: "#A855F7", title: "AI Template Builder", desc: "Generate fully functional mini-apps — habit trackers, budget planners, workout logs — in seconds using AI." },
  { Icon: Users, color: "#EC4899", title: "Live Collaboration", desc: "Real-time multi-user presence on Kanban boards with live cursors, edits, and team awareness via Liveblocks." },
  { Icon: Settings, color: "#64748B", title: "Custom Workspace", desc: "Personalize your experience with custom categories, themes, and settings for every feature." },
];

function Features() {
  return (
    <section id="features" style={{ padding: "100px 24px", background: "#fff" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 100, background: "#f0edff", marginBottom: 16 }}>
            <Sparkles size={12} color={V} />
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: V, textTransform: "uppercase", letterSpacing: "0.06em" }}>Features</span>
          </div>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(1.8rem,4vw,2.6rem)", fontWeight: 800, color: "#0f0a2e", margin: "0 0 14px", letterSpacing: "-0.025em" }}>
            Everything you need,<br /><span style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>in one workspace</span>
          </h2>
          <p style={{ fontSize: "1rem", color: "#6b7280", maxWidth: 520, margin: "0 auto", lineHeight: 1.65 }}>
            Nine powerful tools that work seamlessly together, all accessible from a single unified interface.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 18 }}>
          {FEATURES.map(f => {
            const Icon = f.Icon;
            return (
              <div key={f.title} style={{ padding: "22px 24px", borderRadius: 14, border: "1px solid #f0f0f8", background: "#fff", transition: "all 0.2s", cursor: "default", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 36px rgba(116,103,240,0.12)"; e.currentTarget.style.borderColor = f.color + "40"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.04)"; e.currentTarget.style.borderColor = "#f0f0f8"; }}>
                <div style={{ width: 44, height: 44, borderRadius: 11, background: f.color + "14", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <Icon size={20} color={f.color} strokeWidth={1.8} />
                </div>
                <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "1rem", fontWeight: 700, color: "#0f0a2e", margin: "0 0 7px" }}>{f.title}</h3>
                <p style={{ fontSize: "0.85rem", color: "#6b7280", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: "01", Icon: Layers, color: "#7467F0", title: "Organize Your Workspace", desc: "Set up your boards, notes, and calendar in minutes. Import your existing projects or start fresh with AI-generated templates." },
    { n: "02", Icon: Brain, color: "#06B6D4", title: "Let AI Plan & Create", desc: "Ask the AI assistant to create tasks, schedule events, write notes, generate templates, or summarize your work — all in plain English." },
    { n: "03", Icon: TrendingUp, color: "#10B981", title: "Collaborate & Track Progress", desc: "Invite your team, track task completion, and review AI-powered insights on your productivity trends — in real time." },
  ];
  return (
    <section id="how-it-works" style={{ padding: "100px 24px", background: "linear-gradient(160deg, hsl(246 80% 7%) 0%, hsl(246 60% 11%) 60%, hsl(195 70% 9%) 100%)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 800, height: 800, borderRadius: "50%", background: "radial-gradient(circle, rgba(116,103,240,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 1060, margin: "0 auto", position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 100, background: "rgba(116,103,240,0.15)", border: "1px solid rgba(116,103,240,0.3)", marginBottom: 16 }}>
            <Zap size={12} color={V} />
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#c4beff", textTransform: "uppercase", letterSpacing: "0.06em" }}>How It Works</span>
          </div>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(1.8rem,4vw,2.6rem)", fontWeight: 800, color: "#fff", margin: "0 0 14px", letterSpacing: "-0.025em" }}>Up and running in <span style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>3 simple steps</span></h2>
          <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.5)", maxWidth: 480, margin: "0 auto", lineHeight: 1.65 }}>No complex setup. No steep learning curve. Just open and start building.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 24 }}>
          {steps.map((s, i) => {
            const Icon = s.Icon;
            return (
              <div key={s.n} style={{ position: "relative", padding: "28px 28px", borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 18 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: s.color + "18", border: `1px solid ${s.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={22} color={s.color} strokeWidth={1.8} />
                  </div>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: "2.2rem", fontWeight: 800, color: s.color, opacity: 0.25, lineHeight: 1 }}>{s.n}</div>
                </div>
                <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "1.1rem", fontWeight: 700, color: "#fff", margin: "0 0 10px" }}>{s.title}</h3>
                <p style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.65, margin: 0 }}>{s.desc}</p>
                {i < steps.length - 1 && (
                  <div style={{ position: "absolute", right: -13, top: "50%", transform: "translateY(-50%)", width: 26, height: 26, borderRadius: "50%", background: DARK2, border: "1px solid rgba(116,103,240,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }} className="fb-step-arrow">
                    <ChevronRight size={13} color={V} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── AI Features ───────────────────────────────────────────────────────────────
function AIFeatures() {
  const items = [
    { Icon: ListTodo, color: "#7467F0", label: "Create tasks from chat" },
    { Icon: AlarmClock, color: "#06B6D4", label: "Add calendar reminders" },
    { Icon: FileText, color: "#F43F5E", label: "Refine note content with AI" },
    { Icon: BarChart3, color: "#10B981", label: "Generate AI diagrams" },
    { Icon: Wand2, color: "#A855F7", label: "Build mini-app templates" },
    { Icon: Lightbulb, color: "#F59E0B", label: "Get productivity insights" },
    { Icon: StickyNote, color: "#EC4899", label: "Summarize your notes" },
    { Icon: Target, color: "#64748B", label: "Read your schedule & tasks" },
  ];

  return (
    <section style={{ padding: "100px 24px", background: "#fafafe" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
        {/* Left: text */}
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 100, background: "#f0edff", marginBottom: 20 }}>
            <Bot size={12} color={V} />
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: V, textTransform: "uppercase", letterSpacing: "0.06em" }}>AI Assistant</span>
          </div>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(1.6rem,3.5vw,2.3rem)", fontWeight: 800, color: "#0f0a2e", margin: "0 0 16px", lineHeight: 1.2, letterSpacing: "-0.025em" }}>
            Your AI does the heavy lifting.<br /><span style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>You focus on what matters.</span>
          </h2>
          <p style={{ fontSize: "0.95rem", color: "#6b7280", lineHeight: 1.7, margin: "0 0 28px" }}>
            Grind OS AI (powered by Groq's Llama 3.3) understands your workspace context and takes real actions — it doesn't just answer questions, it works for you.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map(item => {
              const Icon = item.Icon;
              return (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 14px", borderRadius: 9, background: "#fff", border: "1px solid #ebebf8", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = item.color + "40"; e.currentTarget.style.boxShadow = `0 4px 14px ${item.color}14`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#ebebf8"; e.currentTarget.style.boxShadow = "none"; }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: item.color + "14", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={13} color={item.color} strokeWidth={2} />
                  </div>
                  <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#374151" }}>{item.label}</span>
                  <CheckCircle2 size={14} color="#10B981" strokeWidth={2} style={{ marginLeft: "auto" }} />
                </div>
              );
            })}
          </div>
        </div>
        {/* Right: chat mockup */}
        <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid rgba(116,103,240,0.2)", boxShadow: "0 24px 60px rgba(116,103,240,0.18)", background: "linear-gradient(160deg, hsl(246 80% 9%) 0%, hsl(246 60% 13%) 100%)" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: G, display: "flex", alignItems: "center", justifyContent: "center" }}><Bot size={16} color="#fff" /></div>
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fff" }}>Grind OS AI</div>
              <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)" }}>Powered by Groq · Llama 3.3</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981" }} />
              <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.4)" }}>Online</span>
            </div>
          </div>
          <div style={{ padding: "18px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { role: "user", text: "What's my schedule today and what tasks do I have?" },
              { role: "ai", text: "You have 2 events today: Team standup at 10am and Design review at 2pm. For tasks, you have 5 pending — 2 high priority.", action: true },
              { role: "user", text: "Add a reminder for client call tomorrow at 3pm" },
              { role: "ai", text: "Done! Added 'Client call' to your calendar for tomorrow at 3pm.", action: true },
            ].map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "82%", padding: "10px 13px", borderRadius: m.role === "user" ? "14px 14px 3px 14px" : "14px 14px 14px 3px", background: m.role === "user" ? G : "rgba(255,255,255,0.06)", border: m.role === "ai" ? "1px solid rgba(255,255,255,0.08)" : "none", fontSize: "0.78rem", color: "#fff", lineHeight: 1.55 }}>
                  {m.text}
                  {m.action && (
                    <div style={{ marginTop: 7, padding: "5px 8px", borderRadius: 6, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.25)", fontSize: "0.68rem", color: "#6ee7b7", display: "flex", alignItems: "center", gap: 5 }}>
                      <CheckCircle2 size={11} color="#10B981" /> Action taken
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", gap: 8, padding: "9px 12px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <span style={{ flex: 1, fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>Ask anything…</span>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: G, display: "flex", alignItems: "center", justifyContent: "center" }}><ArrowRight size={12} color="#fff" /></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Collaboration ─────────────────────────────────────────────────────────────
function Collaboration() {
  return (
    <section style={{ padding: "100px 24px", background: "linear-gradient(160deg, hsl(246 80% 7%), hsl(246 60% 12%))", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", right: "5%", top: "10%", width: 450, height: 450, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
        {/* Kanban mockup */}
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <KanbanSquare size={16} color={V} />
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#fff" }}>Sprint Board</span>
            </div>
            <div style={{ display: "flex", gap: -5 }}>
              {["#F43F5E", "#7467F0", "#10B981", "#F59E0B"].map((c, i) => (
                <div key={c} style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: "2px solid rgba(10,7,30,0.8)", marginLeft: i > 0 ? -7 : 0 }} />
              ))}
              <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.5)", marginLeft: 6, alignSelf: "center" }}>4 online</span>
            </div>
          </div>
          <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { col: "To Do", color: "#6366F1", tasks: ["Design new onboarding", "Write API docs"] },
              { col: "In Progress", color: "#F59E0B", tasks: ["Dashboard refactor", "AI chat polish"] },
              { col: "Done", color: "#10B981", tasks: ["Auth setup", "DB schema"] },
            ].map(col => (
              <div key={col.col}>
                <div style={{ fontSize: "0.65rem", fontWeight: 700, color: col.color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: col.color }} />{col.col}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {col.tasks.map(t => (
                    <div key={t} style={{ padding: "8px 10px", borderRadius: 7, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)", fontSize: "0.7rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.4 }}>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: "8px 14px 14px", display: "flex", gap: 6 }}>
            {["Live sync", "4 active users", "Liveblocks"].map(b => (
              <div key={b} style={{ padding: "3px 9px", borderRadius: 100, background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)", fontSize: "0.65rem", color: C }}>{b}</div>
            ))}
          </div>
        </div>
        {/* Text */}
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 100, background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)", marginBottom: 20 }}>
            <Users size={12} color={C} />
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: C, textTransform: "uppercase", letterSpacing: "0.06em" }}>Collaboration</span>
          </div>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(1.6rem,3.5vw,2.3rem)", fontWeight: 800, color: "#fff", margin: "0 0 16px", letterSpacing: "-0.025em" }}>
            Your team, in perfect sync.<br /><span style={{ background: `linear-gradient(135deg,${C},${V})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>In real time.</span>
          </h2>
          <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, margin: "0 0 28px" }}>
            Powered by Liveblocks, Grind OS delivers live presence, instant updates, and collaborative editing without any additional setup.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { Icon: Share2, color: C, title: "Shared Kanban Boards", desc: "Everyone's changes appear instantly — no refresh needed." },
              { Icon: MousePointer, color: V, title: "Live Cursors & Presence", desc: "See exactly where your teammates are working in real time." },
              { Icon: Globe, color: "#10B981", title: "Team Workspace", desc: "Invite collaborators to boards and track who's online." },
            ].map(f => {
              const Icon = f.Icon;
              return (
                <div key={f.title} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: f.color + "18", border: `1px solid ${f.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={17} color={f.color} strokeWidth={1.8} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff", marginBottom: 3 }}>{f.title}</div>
                    <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.55 }}>{f.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Use Cases ─────────────────────────────────────────────────────────────────
function UseCases() {
  const cases = [
    { Icon: Target, color: "#7467F0", bg: "#f0edff", title: "Founders", desc: "Plan sprints, manage product roadmaps, write investor notes, and get AI-powered business insights." },
    { Icon: BookOpen, color: "#06B6D4", bg: "#ecfeff", title: "Students", desc: "Organize study notes, track assignment deadlines, and use AI to summarize complex topics." },
    { Icon: Users, color: "#10B981", bg: "#f0fdf4", title: "Teams", desc: "Collaborate on shared boards, assign tasks, and track project progress in real time." },
    { Icon: Palette, color: "#A855F7", bg: "#faf5ff", title: "Creators", desc: "Brainstorm on whiteboards, outline content with notes, and use AI to generate creative frameworks." },
    { Icon: BarChart3, color: "#F59E0B", bg: "#fffbeb", title: "Project Managers", desc: "Run Kanban sprints, sync team calendars, and generate project status reports with one click." },
    { Icon: Flame, color: "#F43F5E", bg: "#fff1f2", title: "Personal Productivity", desc: "Build habit trackers, journal with smart notes, and let AI plan your week for you." },
  ];
  return (
    <section style={{ padding: "100px 24px", background: "#fff" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 100, background: "#f0edff", marginBottom: 16 }}>
            <Star size={12} color={V} />
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: V, textTransform: "uppercase", letterSpacing: "0.06em" }}>Use Cases</span>
          </div>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(1.8rem,4vw,2.6rem)", fontWeight: 800, color: "#0f0a2e", margin: "0 0 14px", letterSpacing: "-0.025em" }}>Built for <span style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>every kind of work</span></h2>
          <p style={{ fontSize: "1rem", color: "#6b7280", maxWidth: 480, margin: "0 auto", lineHeight: 1.65 }}>From solo founders to large teams — Grind OS adapts to your workflow.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 18 }}>
          {cases.map(c => {
            const Icon = c.Icon;
            return (
              <div key={c.title} style={{ padding: "22px 24px", borderRadius: 14, background: c.bg, border: `1px solid ${c.color}18`, transition: "all 0.2s", cursor: "default" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 12px 36px ${c.color}18`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ width: 44, height: 44, borderRadius: 11, background: c.color + "18", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <Icon size={20} color={c.color} strokeWidth={1.8} />
                </div>
                <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "1rem", fontWeight: 700, color: "#0f0a2e", margin: "0 0 8px" }}>{c.title}</h3>
                <p style={{ fontSize: "0.85rem", color: "#6b7280", lineHeight: 1.6, margin: 0 }}>{c.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────
function Pricing() {
  const plans = [
    {
      name: "Free", price: "$0", period: "forever", color: "#6b7280", popular: false,
      features: ["3 Kanban boards", "Unlimited notes", "Basic calendar", "5 AI chats/day", "1 whiteboard", "Community support"],
      cta: "Start Free",
    },
    {
      name: "Pro", price: "$12", period: "per month", color: V, popular: true,
      features: ["Unlimited boards", "Unlimited notes & pages", "Full calendar + reminders", "Unlimited AI chats", "Unlimited whiteboards", "AI Template Builder", "Priority support"],
      cta: "Get Pro",
    },
    {
      name: "Team", price: "$29", period: "per month", color: "#10B981", popular: false,
      features: ["Everything in Pro", "Real-time collaboration", "Live cursors & presence", "Team workspace", "Admin controls", "Advanced analytics", "Dedicated support"],
      cta: "Start Team Trial",
    },
  ];
  return (
    <section id="pricing" style={{ padding: "100px 24px", background: "#fafafe" }}>
      <div style={{ maxWidth: 1020, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 100, background: "#f0edff", marginBottom: 16 }}>
            <Award size={12} color={V} />
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: V, textTransform: "uppercase", letterSpacing: "0.06em" }}>Pricing</span>
          </div>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(1.8rem,4vw,2.6rem)", fontWeight: 800, color: "#0f0a2e", margin: "0 0 14px", letterSpacing: "-0.025em" }}>Simple, transparent <span style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>pricing</span></h2>
          <p style={{ fontSize: "1rem", color: "#6b7280", maxWidth: 440, margin: "0 auto" }}>No hidden fees. No surprise charges. Cancel anytime.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20, alignItems: "stretch" }}>
          {plans.map(p => (
            <div key={p.name} style={{ position: "relative", padding: "28px 26px", borderRadius: 16, background: p.popular ? "linear-gradient(160deg, hsl(246 80% 9%), hsl(246 60% 13%))" : "#fff", border: p.popular ? `1px solid ${V}40` : "1px solid #ebebf8", boxShadow: p.popular ? "0 20px 60px rgba(116,103,240,0.25)" : "0 4px 20px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column" }}>
              {p.popular && (
                <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", padding: "4px 16px", borderRadius: 100, background: G, fontSize: "0.72rem", fontWeight: 700, color: "#fff", whiteSpace: "nowrap", boxShadow: "0 4px 14px rgba(116,103,240,0.4)" }}>Most Popular</div>
              )}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: p.popular ? "rgba(255,255,255,0.7)" : "#6b7280", marginBottom: 8 }}>{p.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: "2.4rem", fontWeight: 800, color: p.popular ? "#fff" : "#0f0a2e" }}>{p.price}</span>
                  <span style={{ fontSize: "0.82rem", color: p.popular ? "rgba(255,255,255,0.5)" : "#9ca3af" }}>/{p.period}</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1, marginBottom: 24 }}>
                {p.features.map(f => (
                  <div key={f} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                    <CheckCircle2 size={15} color={p.popular ? "#10B981" : p.color} strokeWidth={2} style={{ marginTop: 1, flexShrink: 0 }} />
                    <span style={{ fontSize: "0.85rem", color: p.popular ? "rgba(255,255,255,0.75)" : "#374151" }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/sign-up" style={{ display: "block", textAlign: "center", padding: "12px", borderRadius: 10, background: p.popular ? G : "transparent", border: p.popular ? "none" : `1.5px solid ${p.color}50`, color: p.popular ? "#fff" : p.color, fontSize: "0.9rem", fontWeight: 700, textDecoration: "none", transition: "all 0.18s", boxShadow: p.popular ? "0 6px 20px rgba(116,103,240,0.4)" : "none" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; if (!p.popular) e.currentTarget.style.background = p.color + "10"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; if (!p.popular) e.currentTarget.style.background = "transparent"; }}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────
function Testimonials() {
  const items = [
    { name: "Sarah Chen", role: "Founder, Luminary Labs", avatar: "SC", color: "#7467F0", stars: 5, text: "Grind OS replaced four separate tools for my team. The AI assistant alone saves us two hours every day — it genuinely understands what we need and takes action." },
    { name: "Marcus Rivera", role: "Product Manager, Axiom", avatar: "MR", color: "#10B981", stars: 5, text: "The real-time collaboration on Kanban is flawless. We run daily standups using Grind OS and everyone stays perfectly in sync. The live presence feature is addictive." },
    { name: "Priya Nair", role: "PhD Student, MIT", avatar: "PN", color: "#F43F5E", stars: 5, text: "As a student managing research, coursework, and projects, Grind OS is a lifesaver. The AI summarizes my notes before exams and I've never felt more organized." },
  ];
  return (
    <section style={{ padding: "100px 24px", background: "#fff" }}>
      <div style={{ maxWidth: 1060, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 100, background: "#f0edff", marginBottom: 16 }}>
            <Star size={12} color={V} />
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: V, textTransform: "uppercase", letterSpacing: "0.06em" }}>Testimonials</span>
          </div>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(1.8rem,4vw,2.6rem)", fontWeight: 800, color: "#0f0a2e", margin: "0 0 14px", letterSpacing: "-0.025em" }}>Loved by <span style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>productive people</span></h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 20 }}>
          {items.map(t => (
            <div key={t.name} style={{ padding: "26px 24px", borderRadius: 16, background: "#fafafe", border: "1px solid #ebebf8", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 12px 36px rgba(116,103,240,0.1)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ display: "flex", gap: 2, marginBottom: 16 }}>
                {Array.from({ length: t.stars }).map((_, i) => <Star key={i} size={14} color="#F59E0B" fill="#F59E0B" />)}
              </div>
              <p style={{ fontSize: "0.9rem", color: "#374151", lineHeight: 1.7, margin: "0 0 20px", fontStyle: "italic" }}>"{t.text}"</p>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: t.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, color: "#fff", flexShrink: 0 }}>{t.avatar}</div>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f0a2e" }}>{t.name}</div>
                  <div style={{ fontSize: "0.73rem", color: "#9ca3af" }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const items = [
    { q: "How does the AI Assistant work?", a: "Grind OS AI is powered by Groq's Llama 3.3 model. It has tools that let it take real actions in your workspace — creating tasks, adding calendar events, writing notes, and reading your live data to answer questions about your schedule and tasks." },
    { q: "Is real-time collaboration available on all plans?", a: "Real-time collaboration (live cursors, presence, and instant board sync) is available on the Team plan. It's built on Liveblocks for enterprise-grade reliability." },
    { q: "Can I import my existing Notion notes?", a: "We're building an import tool for Notion, Markdown, and CSV formats. In the meantime, you can paste content directly into the rich text notes editor or ask the AI to restructure imported text." },
    { q: "How does the AI Template Builder work?", a: "Describe the mini-app you want (e.g. 'a daily habit tracker with streaks and categories') and the AI generates a fully interactive app structure — complete with sections, tables, checklists, and progress bars — in seconds." },
    { q: "Is my data private and secure?", a: "Yes. All data is stored in your private Neon PostgreSQL database. We never share or sell your data. AI queries use Groq's API which is not used for model training." },
    { q: "What happens to my whiteboard and notes?", a: "All notes, whiteboards, and boards are auto-saved and synced to your account. You can access them from any device after logging in." },
  ];
  return (
    <section id="faq" style={{ padding: "100px 24px", background: "#fafafe" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 100, background: "#f0edff", marginBottom: 16 }}>
            <MessageSquare size={12} color={V} />
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: V, textTransform: "uppercase", letterSpacing: "0.06em" }}>FAQ</span>
          </div>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(1.8rem,4vw,2.6rem)", fontWeight: 800, color: "#0f0a2e", margin: "0 0 14px", letterSpacing: "-0.025em" }}>Got <span style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>questions?</span></h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item, i) => (
            <div key={i} style={{ borderRadius: 12, background: "#fff", border: `1px solid ${open === i ? V + "30" : "#ebebf8"}`, overflow: "hidden", transition: "border-color 0.2s" }}>
              <button onClick={() => setOpen(open === i ? null : i)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: 12 }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#0f0a2e" }}>{item.q}</span>
                <div style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 6, background: open === i ? V + "14" : "#f0f0f8", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}>
                  {open === i ? <Minus size={13} color={V} /> : <Plus size={13} color="#9ca3af" />}
                </div>
              </button>
              {open === i && (
                <div style={{ padding: "0 20px 16px", fontSize: "0.86rem", color: "#6b7280", lineHeight: 1.7 }}>{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ─────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section style={{ padding: "100px 24px", background: "linear-gradient(160deg, hsl(246 80% 7%) 0%, hsl(246 60% 11%) 50%, hsl(195 70% 9%) 100%)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 900, height: 900, borderRadius: "50%", background: "radial-gradient(circle, rgba(116,103,240,0.12) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center", position: "relative" }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: G, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 8px 32px rgba(116,103,240,0.5)" }}>
          <InfinityIcon size={30} color="#fff" strokeWidth={1.8} />
        </div>
        <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(2rem,5vw,3.2rem)", fontWeight: 800, color: "#fff", margin: "0 0 16px", letterSpacing: "-0.03em", lineHeight: 1.15 }}>
          Build your entire productivity system<br /><span style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>in one AI workspace</span>
        </h2>
        <p style={{ fontSize: "1.05rem", color: "rgba(255,255,255,0.55)", margin: "0 0 36px", lineHeight: 1.65 }}>
          Join thousands of founders, students, and teams who've made Grind OS their everything workspace. Free to start, no credit card needed.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/sign-up" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", borderRadius: 11, background: G, color: "#fff", fontSize: "1rem", fontWeight: 700, textDecoration: "none", boxShadow: "0 8px 28px rgba(116,103,240,0.55)", transition: "all 0.18s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 36px rgba(116,103,240,0.65)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(116,103,240,0.55)"; }}>
            Start for Free <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
          <Link href="/sign-in" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "14px 28px", borderRadius: 11, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: "1rem", fontWeight: 600, textDecoration: "none", transition: "background 0.18s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}>
            Sign In
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: "hsl(246 80% 5%)", borderTop: "1px solid rgba(116,103,240,0.15)", padding: "56px 24px 36px" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 48 }}>
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: G, display: "flex", alignItems: "center", justifyContent: "center" }}><Zap size={15} color="#fff" strokeWidth={2.5} /></div>
              <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>Grind OS</span>
            </div>
            <p style={{ fontSize: "0.84rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.7, maxWidth: 280, margin: "0 0 20px" }}>The AI-powered productivity workspace that combines everything you need into one beautiful app.</p>
            <div style={{ display: "flex", gap: 10 }}>
              {[Github, Twitter, MessageSquare].map((Icon, i) => (
                <a key={i} href="#" style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}>
                  <Icon size={14} color="rgba(255,255,255,0.6)" />
                </a>
              ))}
            </div>
          </div>
          {/* Product */}
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Product</div>
            {["Dashboard", "Kanban", "Calendar", "Notes", "Whiteboard", "AI Assistant", "Templates"].map(l => (
              <Link key={l} href="/dashboard" style={{ display: "block", fontSize: "0.84rem", color: "rgba(255,255,255,0.45)", textDecoration: "none", marginBottom: 8, transition: "color 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}>
                {l}
              </Link>
            ))}
          </div>
          {/* Resources */}
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Resources</div>
            {["Documentation", "API Reference", "Changelog", "Status", "Blog"].map(l => (
              <a key={l} href="#" style={{ display: "block", fontSize: "0.84rem", color: "rgba(255,255,255,0.45)", textDecoration: "none", marginBottom: 8, transition: "color 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}>
                {l}
              </a>
            ))}
          </div>
          {/* Legal */}
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Legal</div>
            {["Privacy Policy", "Terms of Service", "Cookie Policy", "Security", "GDPR"].map(l => (
              <a key={l} href="#" style={{ display: "block", fontSize: "0.84rem", color: "rgba(255,255,255,0.45)", textDecoration: "none", marginBottom: 8, transition: "color 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}>
                {l}
              </a>
            ))}
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.3)" }}>© 2026 Grind OS. All rights reserved.</span>
          <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.3)" }}>Built with ♥ and a lot of AI ✨</span>
        </div>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        @media (max-width: 768px) {
          .fb-nav-links { display: none !important; }
          .fb-nav-cta { display: none !important; }
          .fb-burger { display: flex !important; }
          .fb-step-arrow { display: none !important; }
        }
        @media (max-width: 900px) {
          [style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
          [style*="grid-template-columns: 2fr 1fr 1fr 1fr"] { grid-template-columns: 1fr 1fr !important; }
          [style*="grid-template-columns: 180px 1fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div style={{ fontFamily: "'Inter',sans-serif", overflowX: "hidden" }}>
        <Navbar />
        <Hero />
        <Features />
        <HowItWorks />
        <AIFeatures />
        <Collaboration />
        <UseCases />
        <Pricing />
        <Testimonials />
        <FAQ />
        <FinalCTA />
        <Footer />
      </div>
    </>
  );
}
