import React from "react";
import {
  ArrowRight, Sparkles, Mic, Brain, Users, Shield, Zap,
  Bot, KanbanSquare, NotebookPen, Calendar, PenLine, Wand2,
  CheckCircle2, Play, Target, TrendingUp, Layers, Star,
  LayoutDashboard, Clock,
} from "lucide-react";
import { LandingPage } from "./LandingLayout";

const V = "#7467F0";
const C = "#06B6D4";
const G = `linear-gradient(135deg, #7467F0, #06B6D4)`;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function navHref(path: string) {
  return `${basePath}${path}`;
}

function Hero() {
  return (
    <section style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", position: "relative",
      overflow: "hidden", padding: "100px 28px 80px",
      background: "linear-gradient(160deg, #08051c 0%, #0d0826 50%, #080e20 100%)",
    }}>
      {/* Ambient glows */}
      <div style={{ position: "absolute", top: "8%", left: "15%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(116,103,240,0.14) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "10%", right: "10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)", width: 800, height: 800, borderRadius: "50%", background: "radial-gradient(circle, rgba(116,103,240,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* New badge */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 100, background: "rgba(116,103,240,0.12)", border: "1px solid rgba(116,103,240,0.3)", marginBottom: 32 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
        <Mic size={12} color="#c4beff" />
        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#c4beff", letterSpacing: "0.03em" }}>Introducing JARVIS Voice Agent — AI that listens and acts</span>
      </div>

      {/* Headline */}
      <h1 style={{
        fontFamily: "'Outfit',sans-serif", fontSize: "clamp(2.6rem, 5.5vw, 4.2rem)",
        fontWeight: 900, color: "#fff", textAlign: "center", lineHeight: 1.1,
        letterSpacing: "-0.035em", maxWidth: 880, margin: "0 0 24px",
      }}>
        The AI workspace that
        <br />
        <span style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          works while you think
        </span>
      </h1>

      {/* Subheadline */}
      <p style={{
        fontSize: "clamp(1rem, 2vw, 1.18rem)", color: "rgba(255,255,255,0.55)",
        textAlign: "center", maxWidth: 580, lineHeight: 1.75, margin: "0 0 40px",
      }}>
        Grind OS combines a JARVIS-style voice AI agent, smart task management, real-time collaboration, and a full productivity suite — all in one beautifully designed workspace.
      </p>

      {/* CTAs */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 52 }}>
        <a href={navHref("/sign-up")}
          style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "14px 32px", borderRadius: 11, background: G, color: "#fff", fontSize: "0.95rem", fontWeight: 700, textDecoration: "none", boxShadow: "0 8px 28px rgba(116,103,240,0.5)", transition: "all 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 36px rgba(116,103,240,0.65)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(116,103,240,0.5)"; }}>
          Start for free <ArrowRight size={15} strokeWidth={2.5} />
        </a>
        <a href={navHref("/features")}
          style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "14px 28px", borderRadius: 11, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)", fontSize: "0.95rem", fontWeight: 600, textDecoration: "none", transition: "all 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}>
          <Sparkles size={15} color="#c4beff" /> Explore features
        </a>
      </div>

      {/* Trust badges */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 64 }}>
        {[
          { Icon: Mic, label: "JARVIS Voice Agent", color: V },
          { Icon: Brain, label: "Groq AI Assistant", color: C },
          { Icon: Users, label: "Live Collaboration", color: "#10B981" },
          { Icon: Shield, label: "Private by default", color: "#F59E0B" },
          { Icon: Zap, label: "Real-time sync", color: "#EC4899" },
        ].map(b => {
          const Icon = b.Icon;
          return (
            <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: 100, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
              <Icon size={12} color={b.color} strokeWidth={2} />
              <span style={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.65)", fontWeight: 500 }}>{b.label}</span>
            </div>
          );
        })}
      </div>

      {/* Dashboard mockup */}
      <div style={{
        width: "100%", maxWidth: 960, borderRadius: 20, overflow: "hidden",
        border: "1px solid rgba(116,103,240,0.25)",
        boxShadow: "0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03), 0 0 80px rgba(116,103,240,0.12)",
        position: "relative",
      }}>
        {/* Browser chrome */}
        <div style={{ background: "rgba(116,103,240,0.1)", backdropFilter: "blur(20px)", padding: "11px 18px", display: "flex", alignItems: "center", gap: 9, borderBottom: "1px solid rgba(116,103,240,0.18)" }}>
          {["#F43F5E", "#F59E0B", "#10B981"].map(c => (
            <div key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />
          ))}
          <div style={{ flex: 1, height: 20, borderRadius: 5, background: "rgba(255,255,255,0.05)", maxWidth: 320, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "0.63rem", color: "rgba(255,255,255,0.25)" }}>app.grind-os.com/dashboard</span>
          </div>
        </div>
        {/* Dashboard content */}
        <div style={{ background: "rgba(8,5,28,0.92)", backdropFilter: "blur(20px)", padding: "20px 20px", display: "grid", gridTemplateColumns: "190px 1fr", gap: 18, minHeight: 360 }}>
          {/* Sidebar */}
          <div style={{ borderRight: "1px solid rgba(255,255,255,0.05)", paddingRight: 14, display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ height: 24, borderRadius: 6, background: G, marginBottom: 18, opacity: 0.7, width: 90 }} />
            {[
              ["#7467F0", "Dashboard", true], ["#EC4899", "JARVIS AI", false],
              ["#06B6D4", "Calendar", false], ["#F43F5E", "Kanban", false],
              ["#10B981", "Notes", false], ["#6366F1", "Whiteboard", false],
              ["#A855F7", "Templates", false],
            ].map(([c, l, active]) => (
              <div key={String(l)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 9px", borderRadius: 7, background: active ? "rgba(116,103,240,0.18)" : "transparent", border: active ? "1px solid rgba(116,103,240,0.2)" : "1px solid transparent" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: String(c), flexShrink: 0 }} />
                <div style={{ height: 8, borderRadius: 3, background: active ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.12)", width: active ? 70 : 55 }} />
              </div>
            ))}
          </div>
          {/* Main content */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
              {[["#7467F0", "48", "Tasks"], ["#10B981", "32", "Done"], ["#06B6D4", "12", "Events"], ["#EC4899", "JARVIS", "Active"]].map(([c, v, l]) => (
                <div key={String(l)} style={{ borderRadius: 10, padding: "10px 13px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: l === "Active" ? "0.75rem" : "1.4rem", fontWeight: 800, color: String(c) }}>{v}</div>
                  <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.35)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>{l}</div>
                </div>
              ))}
            </div>
            {/* Content area */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, flex: 1 }}>
              {/* JARVIS chat preview */}
              <div style={{ borderRadius: 10, padding: "12px 13px", background: "rgba(116,103,240,0.06)", border: "1px solid rgba(116,103,240,0.2)" }}>
                <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#c4beff", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} /> JARVIS Online
                </div>
                {["Good morning, Master. 3 tasks due today.", "Shall I brief your schedule?"].map((t, i) => (
                  <div key={i} style={{ fontSize: "0.65rem", color: i === 0 ? "rgba(255,255,255,0.7)" : "rgba(116,103,240,0.8)", marginBottom: 5, padding: "5px 8px", borderRadius: 6, background: "rgba(255,255,255,0.03)" }}>{t}</div>
                ))}
              </div>
              {/* Kanban preview */}
              <div style={{ borderRadius: 10, padding: "12px 13px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 9, textTransform: "uppercase", letterSpacing: "0.06em" }}>Sprint Board</div>
                {[["#6366F1", "Design system"], ["#F59E0B", "API integration"], ["#10B981", "Auth — Done"]].map(([c, t]) => (
                  <div key={String(t)} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: String(c), flexShrink: 0 }} />
                    <div style={{ height: 7, borderRadius: 3, background: "rgba(255,255,255,0.1)", flex: 1 }} />
                  </div>
                ))}
              </div>
              {/* Calendar preview */}
              <div style={{ borderRadius: 10, padding: "12px 13px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 9, textTransform: "uppercase", letterSpacing: "0.06em" }}>Today</div>
                {[["#7467F0", "10am Team standup"], ["#06B6D4", "2pm Design review"], ["#10B981", "4pm 1:1 with Alex"]].map(([c, t]) => (
                  <div key={String(t)} style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.55)", marginBottom: 5, display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 3, height: 16, borderRadius: 2, background: String(c), flexShrink: 0 }} />{t}
                  </div>
                ))}
              </div>
              {/* Goal / stats */}
              <div style={{ borderRadius: 10, padding: "12px 13px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 9, textTransform: "uppercase", letterSpacing: "0.06em" }}>Progress</div>
                {[["#7467F0", 75], ["#10B981", 92], ["#06B6D4", 58]].map(([c, w], i) => (
                  <div key={i} style={{ marginBottom: 7 }}>
                    <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${w}%`, background: String(c), borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickFeatures() {
  const features = [
    { Icon: Mic, color: "#EC4899", title: "JARVIS Voice Agent", desc: "Real-time speech AI that listens, thinks, and talks back. Create tasks, read your schedule, and control your workspace — hands-free.", new: true },
    { Icon: Bot, color: V, title: "Groq AI Assistant", desc: "Text-based AI powered by Llama 3.3. Creates tasks, adds events, writes notes, and generates insights — all through a simple chat." },
    { Icon: KanbanSquare, color: "#10B981", title: "Kanban Boards", desc: "Drag-and-drop project boards with priorities, due dates, and real-time collaboration for your whole team." },
    { Icon: NotebookPen, color: "#F43F5E", title: "Rich Notes", desc: "Notion-style rich text notes with formatting, pinning, color coding, and AI-powered content refinement." },
    { Icon: Calendar, color: "#F59E0B", title: "Calendar", desc: "Full calendar with events, reminders, and time-block support. JARVIS can read and create events by voice." },
    { Icon: PenLine, color: "#6366F1", title: "Whiteboard", desc: "Infinite canvas for visual thinking, sketching, and diagramming. Powered by Excalidraw." },
    { Icon: Wand2, color: "#A855F7", title: "AI Templates", desc: "Generate fully interactive mini-apps — habit trackers, budget planners, workout logs — by describing what you need." },
    { Icon: Users, color: C, title: "Live Collaboration", desc: "Real-time presence on Kanban boards with live cursors, instant sync, and team awareness. Powered by Liveblocks." },
    { Icon: LayoutDashboard, color: "#64748B", title: "Smart Dashboard", desc: "A unified command center showing your tasks, events, notes, and AI insights at a glance." },
  ];

  return (
    <section style={{ padding: "96px 28px", background: "#fff" }}>
      <div style={{ maxWidth: 1140, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 100, background: "#f0edff", marginBottom: 16 }}>
            <Sparkles size={12} color={V} />
            <span style={{ fontSize: "0.73rem", fontWeight: 700, color: V, textTransform: "uppercase", letterSpacing: "0.07em" }}>Everything in one place</span>
          </div>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(1.9rem,4vw,2.7rem)", fontWeight: 800, color: "#0a0720", margin: "0 0 14px", letterSpacing: "-0.03em" }}>
            Built for how you actually work
          </h2>
          <p style={{ fontSize: "1rem", color: "#6b7280", maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>
            Nine powerful tools that talk to each other, powered by the AI that ties them all together.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(310px,1fr))", gap: 16 }}>
          {features.map(f => {
            const Icon = f.Icon;
            return (
              <div key={f.title}
                style={{ position: "relative", padding: "22px 24px", borderRadius: 14, border: "1px solid #ededf8", background: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", transition: "all 0.2s", cursor: "default" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 14px 40px ${f.color}18`; e.currentTarget.style.borderColor = f.color + "35"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.04)"; e.currentTarget.style.borderColor = "#ededf8"; }}>
                {f.new && (
                  <div style={{ position: "absolute", top: 14, right: 14, padding: "2px 9px", borderRadius: 100, background: "linear-gradient(135deg,#EC4899,#7467F0)", fontSize: "0.63rem", fontWeight: 700, color: "#fff", letterSpacing: "0.04em" }}>NEW</div>
                )}
                <div style={{ width: 44, height: 44, borderRadius: 11, background: f.color + "12", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <Icon size={20} color={f.color} strokeWidth={1.8} />
                </div>
                <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "0.98rem", fontWeight: 700, color: "#0a0720", margin: "0 0 7px" }}>{f.title}</h3>
                <p style={{ fontSize: "0.84rem", color: "#6b7280", lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", marginTop: 40 }}>
          <a href={navHref("/features")}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 26px", borderRadius: 10, border: "1.5px solid rgba(116,103,240,0.35)", color: V, fontSize: "0.88rem", fontWeight: 700, textDecoration: "none", transition: "all 0.18s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(116,103,240,0.06)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
            See full feature details <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}

function JarvisSpotlight() {
  return (
    <section style={{ padding: "96px 28px", background: "linear-gradient(160deg, #08051c 0%, #0d0826 50%, #080e20 100%)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: "30%", top: "50%", transform: "translate(-50%,-50%)", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", right: "5%", bottom: "10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(116,103,240,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }} className="fb-split-grid">
        {/* Left: text */}
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 100, background: "rgba(236,72,153,0.12)", border: "1px solid rgba(236,72,153,0.25)", marginBottom: 22 }}>
            <Mic size={12} color="#EC4899" />
            <span style={{ fontSize: "0.73rem", fontWeight: 700, color: "#EC4899", textTransform: "uppercase", letterSpacing: "0.07em" }}>JARVIS Voice Agent</span>
            <div style={{ padding: "1px 7px", borderRadius: 4, background: "rgba(236,72,153,0.2)", fontSize: "0.6rem", fontWeight: 700, color: "#EC4899" }}>NEW</div>
          </div>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(1.7rem,3.8vw,2.5rem)", fontWeight: 800, color: "#fff", margin: "0 0 18px", letterSpacing: "-0.03em", lineHeight: 1.2 }}>
            Your personal AI.<br />
            <span style={{ background: "linear-gradient(135deg, #EC4899, #7467F0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              It speaks. It listens.<br />It acts.
            </span>
          </h2>
          <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.75, margin: "0 0 30px" }}>
            JARVIS is a real-time voice AI agent powered by AssemblyAI. It captures your voice, understands your intent, and responds in a natural voice — while taking real actions in your workspace.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {[
              { label: "Customizable persona", desc: 'Set your name — JARVIS calls you "Master [Name]"' },
              { label: "7 voice options", desc: "Brian, Ava, Aria, Christopher, Eric, Liam, Emma" },
              { label: "Real action tools", desc: "Creates tasks, reads schedule, writes notes, and more" },
              { label: "Barge-in support", desc: "Interrupt JARVIS mid-sentence — it stops and listens" },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <CheckCircle2 size={17} color="#10B981" strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff" }}>{item.label}</span>
                  <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.45)" }}> — {item.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <a href={navHref("/sign-up")}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 32, padding: "12px 26px", borderRadius: 10, background: "linear-gradient(135deg, #EC4899, #7467F0)", color: "#fff", fontSize: "0.9rem", fontWeight: 700, textDecoration: "none", boxShadow: "0 8px 24px rgba(236,72,153,0.35)", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(236,72,153,0.5)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(236,72,153,0.35)"; }}>
            <Mic size={15} /> Try JARVIS now
          </a>
        </div>

        {/* Right: voice mockup */}
        <div style={{ borderRadius: 20, overflow: "hidden", border: "1px solid rgba(236,72,153,0.2)", boxShadow: "0 30px 80px rgba(0,0,0,0.5), 0 0 60px rgba(236,72,153,0.08)", background: "linear-gradient(160deg, #0d0826, #10062a)" }}>
          {/* Header */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: "linear-gradient(135deg, #EC4899, #7467F0)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Mic size={18} color="#fff" strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>JARVIS</div>
              <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)" }}>Voice Agent · AssemblyAI · Real-time</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 8px #10B981" }} />
              <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)" }}>Listening</span>
            </div>
          </div>
          {/* Waveform */}
          <div style={{ padding: "22px 20px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
            {[12, 22, 36, 28, 18, 42, 30, 16, 38, 24, 14, 32, 20, 44, 26, 18, 34, 22, 40, 16].map((h, i) => (
              <div key={i} style={{ width: 3, height: h, borderRadius: 3, background: `linear-gradient(to top, #EC4899, #7467F0)`, opacity: 0.6 + (i % 3) * 0.15 }} />
            ))}
          </div>
          {/* Conversation */}
          <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { from: "user", text: "Hey JARVIS, what's on my schedule today?" },
              { from: "jarvis", text: "Good morning, Master Alex. You have a team standup at 10am and a design review at 2pm. Three tasks are overdue — shall I move them to tomorrow?" },
              { from: "user", text: "Yes, push them all to tomorrow 9am." },
              { from: "jarvis", text: "Done. Three tasks rescheduled to tomorrow at 9am. Anything else, Master Alex?" },
            ].map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "85%", padding: "9px 13px", borderRadius: m.from === "user" ? "13px 13px 3px 13px" : "13px 13px 13px 3px", background: m.from === "user" ? "rgba(116,103,240,0.25)" : "rgba(255,255,255,0.05)", border: `1px solid ${m.from === "user" ? "rgba(116,103,240,0.3)" : "rgba(255,255,255,0.07)"}`, fontSize: "0.75rem", color: "#fff", lineHeight: 1.55 }}>
                  {m.from === "jarvis" && <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#EC4899", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>JARVIS</div>}
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          {/* Persona badge */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
            <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)" }}>Persona: Brian · Configured in Settings → AI Settings</span>
          </div>
        </div>
      </div>

      <style>{`@media (max-width: 740px) { .fb-split-grid { grid-template-columns: 1fr !important; gap: 40px !important; } }`}</style>
    </section>
  );
}

function SocialProof() {
  const stats = [
    { value: "10+", label: "Productivity tools", color: V },
    { value: "7", label: "JARVIS voices", color: "#EC4899" },
    { value: "Real-time", label: "Collaboration sync", color: "#10B981" },
    { value: "0ms", label: "Voice latency target", color: C },
  ];

  return (
    <section style={{ padding: "72px 28px", background: "#fafafe", borderTop: "1px solid #f0eff8", borderBottom: "1px solid #f0eff8" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 32, textAlign: "center" }}>
        {stats.map(s => (
          <div key={s.label}>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: "2.2rem", fontWeight: 900, color: s.color, letterSpacing: "-0.03em", marginBottom: 6 }}>{s.value}</div>
            <div style={{ fontSize: "0.85rem", color: "#9ca3af", fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section style={{ padding: "96px 28px", background: "linear-gradient(160deg, #08051c, #0d0826)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 800, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(116,103,240,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center", position: "relative" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 100, background: "rgba(116,103,240,0.12)", border: "1px solid rgba(116,103,240,0.25)", marginBottom: 24 }}>
          <Sparkles size={12} color="#c4beff" />
          <span style={{ fontSize: "0.73rem", fontWeight: 600, color: "#c4beff" }}>Free to start, no credit card required</span>
        </div>
        <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(2rem,4.5vw,3rem)", fontWeight: 900, color: "#fff", margin: "0 0 18px", letterSpacing: "-0.035em", lineHeight: 1.15 }}>
          Ready to meet your<br />
          <span style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>personal JARVIS?</span>
        </h2>
        <p style={{ fontSize: "1.05rem", color: "rgba(255,255,255,0.5)", margin: "0 0 36px", lineHeight: 1.7 }}>
          Join Grind OS and get access to every tool, JARVIS voice agent, and live collaboration — all in one place.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href={navHref("/sign-up")}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 36px", borderRadius: 11, background: G, color: "#fff", fontSize: "1rem", fontWeight: 700, textDecoration: "none", boxShadow: "0 8px 28px rgba(116,103,240,0.5)", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 14px 36px rgba(116,103,240,0.65)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(116,103,240,0.5)"; }}>
            Get started free <ArrowRight size={16} strokeWidth={2.5} />
          </a>
          <a href={navHref("/pricing")}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", borderRadius: 11, border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", fontSize: "1rem", fontWeight: 600, textDecoration: "none", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
            View pricing
          </a>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <LandingPage>
      <Hero />
      <QuickFeatures />
      <JarvisSpotlight />
      <SocialProof />
      <CTA />
    </LandingPage>
  );
}
