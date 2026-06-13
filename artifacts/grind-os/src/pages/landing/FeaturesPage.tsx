import React from "react";
import {
  Mic, Bot, KanbanSquare, NotebookPen, Calendar, PenLine, Wand2,
  Users, LayoutDashboard, CheckCircle2, ArrowRight, Sparkles,
  Clock, Target, Brain, Zap, Globe, Share2, MousePointer,
  ListTodo, AlarmClock, FileText, BarChart3, Lightbulb, StickyNote,
  Shield, Lock, Cpu, TrendingUp, Flame,
} from "lucide-react";
import { LandingPage } from "./LandingLayout";

const V = "#7467F0";
const C = "#06B6D4";
const G = `linear-gradient(135deg, #7467F0, #06B6D4)`;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function navHref(path: string) { return `${basePath}${path}`; }

function PageHero() {
  return (
    <section style={{ padding: "120px 28px 72px", background: "linear-gradient(160deg, #08051c 0%, #0d0826 60%, #080e20 100%)", textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: "50%", top: "40%", transform: "translate(-50%,-50%)", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(116,103,240,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", maxWidth: 700, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 100, background: "rgba(116,103,240,0.12)", border: "1px solid rgba(116,103,240,0.3)", marginBottom: 24 }}>
          <Sparkles size={12} color="#c4beff" />
          <span style={{ fontSize: "0.73rem", fontWeight: 700, color: "#c4beff", textTransform: "uppercase", letterSpacing: "0.07em" }}>All Features</span>
        </div>
        <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(2.2rem,5vw,3.5rem)", fontWeight: 900, color: "#fff", margin: "0 0 20px", letterSpacing: "-0.035em", lineHeight: 1.15 }}>
          Every tool you need,<br />
          <span style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>perfectly connected</span>
        </h1>
        <p style={{ fontSize: "1.05rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.75, margin: 0 }}>
          From a JARVIS-style voice agent to real-time Kanban collaboration — Grind OS is the only productivity workspace you'll ever need.
        </p>
      </div>
    </section>
  );
}

function JarvisSection() {
  return (
    <section style={{ padding: "80px 28px", background: "linear-gradient(160deg, #08051c, #10062a)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", right: "10%", top: "20%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 100, background: "rgba(236,72,153,0.12)", border: "1px solid rgba(236,72,153,0.3)", marginBottom: 28 }}>
          <Mic size={12} color="#EC4899" />
          <span style={{ fontSize: "0.73rem", fontWeight: 700, color: "#EC4899", textTransform: "uppercase", letterSpacing: "0.07em" }}>Featured — JARVIS Voice Agent</span>
          <div style={{ padding: "2px 8px", borderRadius: 4, background: "rgba(236,72,153,0.25)", fontSize: "0.6rem", fontWeight: 800, color: "#EC4899", letterSpacing: "0.04em" }}>NEW</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }} className="fb-jarvis-grid">
          <div>
            <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(1.8rem,4vw,2.6rem)", fontWeight: 800, color: "#fff", margin: "0 0 18px", letterSpacing: "-0.03em", lineHeight: 1.2 }}>
              Real-time voice AI.<br />
              <span style={{ background: "linear-gradient(135deg,#EC4899,#7467F0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Speech in. Speech out.</span>
            </h2>
            <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.8, margin: "0 0 28px" }}>
              JARVIS is not a chatbot you type to. It's a real-time voice agent powered by AssemblyAI's Voice Agent API. It captures your microphone as raw PCM16 audio at 24kHz, processes it in real time, and responds with natural speech — in the voice you choose.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 32 }}>
              {[
                { Icon: Mic, color: "#EC4899", label: "PCM16 audio capture", desc: "Real-time 24kHz mic capture via AudioWorklet" },
                { Icon: Cpu, color: V, label: "7 voice personas", desc: "Brian, Ava, Aria, Christopher, Eric, Liam, Emma" },
                { Icon: Bot, color: C, label: "Barge-in support", desc: "Interrupt mid-sentence — JARVIS stops and listens" },
                { Icon: ListTodo, color: "#10B981", label: "6 action tools", desc: "Tasks, calendar, notes, schedule — all by voice" },
              ].map(f => {
                const Icon = f.Icon;
                return (
                  <div key={f.label} style={{ padding: "14px 16px", borderRadius: 11, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <Icon size={14} color={f.color} strokeWidth={2} />
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#fff" }}>{f.label}</span>
                    </div>
                    <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "16px 18px", borderRadius: 11, background: "rgba(116,103,240,0.08)", border: "1px solid rgba(116,103,240,0.2)" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#c4beff", marginBottom: 8 }}>Persona customization in Settings</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["Set your name", "Pick a voice", "JARVIS greets you as Master [Name]"].map(t => (
                  <div key={t} style={{ padding: "3px 9px", borderRadius: 6, background: "rgba(116,103,240,0.15)", fontSize: "0.7rem", color: "#c4beff", fontWeight: 500 }}>{t}</div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid rgba(236,72,153,0.2)", boxShadow: "0 30px 80px rgba(0,0,0,0.5), 0 0 60px rgba(236,72,153,0.06)", background: "#0a0320" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#EC4899,#7467F0)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Mic size={16} color="#fff" strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#fff" }}>JARVIS — Active</div>
                <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.3)" }}>Voice: Brian · Master: Alex</div>
              </div>
              <div style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 8px #10B981" }} />
            </div>
            <div style={{ padding: "18px 16px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { from: "jarvis", text: "Grind OS online. Good morning, Master Alex. Three tasks due today and you have four meetings. Ready when you are." },
                { from: "user", text: "Mark the design review task as done." },
                { from: "jarvis", text: "Task marked complete. Two tasks remain today, Master Alex. Shall I move your standup notes into the project board?" },
              ].map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "88%", padding: "10px 13px", borderRadius: m.from === "user" ? "13px 13px 3px 13px" : "13px 13px 13px 3px", background: m.from === "user" ? "rgba(116,103,240,0.22)" : "rgba(255,255,255,0.05)", border: `1px solid ${m.from === "user" ? "rgba(116,103,240,0.3)" : "rgba(255,255,255,0.07)"}`, fontSize: "0.77rem", color: "#fff", lineHeight: 1.55 }}>
                    {m.from === "jarvis" && <div style={{ fontSize: "0.58rem", fontWeight: 700, color: "#EC4899", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>JARVIS</div>}
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
              {[8, 16, 28, 20, 12, 32, 22, 10, 30, 18, 8, 26, 14, 34, 20].map((h, i) => (
                <div key={i} style={{ width: 3, height: h, borderRadius: 3, background: "linear-gradient(to top, #EC4899, #7467F0)", opacity: 0.5 + (i % 3) * 0.2 }} />
              ))}
            </div>
            <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.2)", textAlign: "center" }}>Powered by AssemblyAI Voice Agents · Real-time WebSocket</div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 760px) { .fb-jarvis-grid { grid-template-columns: 1fr !important; gap: 40px !important; } }`}</style>
    </section>
  );
}

const ALL_FEATURES = [
  {
    Icon: Bot, color: V, title: "Groq AI Assistant",
    desc: "Text-based AI chat powered by Groq's Llama 3.3 70B. Understands natural language and takes real actions in your workspace.",
    bullets: ["Create tasks & calendar events", "Write and refine notes", "Read your live schedule", "Generate productivity insights"],
  },
  {
    Icon: KanbanSquare, color: "#10B981", title: "Kanban Boards",
    desc: "Drag-and-drop project management with priorities, due dates, labels, and real-time team collaboration.",
    bullets: ["Multiple boards & columns", "Priority & due date tracking", "Live collaboration via Liveblocks", "AI can add tasks automatically"],
  },
  {
    Icon: NotebookPen, color: "#F43F5E", title: "Rich Text Notes",
    desc: "Notion-style notes with full formatting support, pinning, color-coded cards, and AI-assisted content.",
    bullets: ["Bold, italic, headings, lists", "Pin important notes", "Color-coded categories", "AI can write & refine notes"],
  },
  {
    Icon: Calendar, color: "#F59E0B", title: "Calendar",
    desc: "Full calendar with event management, reminders, and time-block scheduling. Fully integrated with AI voice and text commands.",
    bullets: ["Create and manage events", "Color-coded categories", "JARVIS can read & create events", "Daily schedule view"],
  },
  {
    Icon: PenLine, color: "#6366F1", title: "Excalidraw Whiteboard",
    desc: "Infinite canvas for visual thinking, wireframing, and diagramming — powered by Excalidraw.",
    bullets: ["Freehand drawing tools", "Shapes & connectors", "Text annotations", "Export as PNG/SVG"],
  },
  {
    Icon: Wand2, color: "#A855F7", title: "AI Template Builder",
    desc: "Describe any mini-app and AI generates it — habit trackers, budget planners, workout logs, reading lists, and more.",
    bullets: ["Plain-English descriptions", "Fully interactive structures", "Tables, checklists, progress bars", "Save & reuse templates"],
  },
  {
    Icon: Users, color: C, title: "Live Collaboration",
    desc: "Real-time multi-user presence powered by Liveblocks. See who's online, where they're working, and their changes instantly.",
    bullets: ["Live cursors & presence", "Instant board sync", "Shared workspace", "No refresh needed"],
  },
  {
    Icon: LayoutDashboard, color: "#64748B", title: "Smart Dashboard",
    desc: "A unified command center giving you a real-time overview of all your tasks, events, notes, and AI-powered insights.",
    bullets: ["Unified activity view", "Task & event summary", "AI productivity insights", "Quick navigation"],
  },
  {
    Icon: Clock, color: "#0EA5E9", title: "Daily Schedule",
    desc: "Plan your day with time blocks, set priorities, and let JARVIS read your schedule aloud whenever you need it.",
    bullets: ["Time block planning", "Daily priority view", "JARVIS reads schedule by voice", "Integrated with calendar"],
  },
];

function AllFeaturesGrid() {
  return (
    <section style={{ padding: "80px 28px", background: "#fff" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(1.7rem,3.5vw,2.3rem)", fontWeight: 800, color: "#0a0720", margin: "0 0 12px", letterSpacing: "-0.03em" }}>
            The full feature set
          </h2>
          <p style={{ fontSize: "0.95rem", color: "#6b7280", maxWidth: 440, margin: "0 auto", lineHeight: 1.7 }}>
            Every feature is connected. AI can act on all of them.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
          {ALL_FEATURES.map(f => {
            const Icon = f.Icon;
            return (
              <div key={f.title}
                style={{ padding: "24px 26px", borderRadius: 16, border: "1px solid #ededf8", background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", transition: "all 0.2s", cursor: "default" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 14px 44px ${f.color}16`; e.currentTarget.style.borderColor = f.color + "30"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.04)"; e.currentTarget.style.borderColor = "#ededf8"; }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 11, background: f.color + "12", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={20} color={f.color} strokeWidth={1.8} />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "1rem", fontWeight: 700, color: "#0a0720", margin: "0 0 4px" }}>{f.title}</h3>
                    <p style={{ fontSize: "0.82rem", color: "#6b7280", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {f.bullets.map(b => (
                    <div key={b} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircle2 size={13} color={f.color} strokeWidth={2} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: "0.8rem", color: "#374151" }}>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CollabSection() {
  return (
    <section style={{ padding: "80px 28px", background: "linear-gradient(160deg, #08051c, #0d0826)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", right: "5%", top: "20%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }} className="fb-collab-grid">
        {/* Kanban mockup */}
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <KanbanSquare size={15} color={C} />
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fff" }}>Sprint Board</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              {["#EC4899", "#7467F0", "#10B981", "#F59E0B"].map((c, i) => (
                <div key={c} style={{ width: 22, height: 22, borderRadius: "50%", background: c, border: "2px solid rgba(8,5,28,0.8)", marginLeft: i > 0 ? -6 : 0 }} />
              ))}
              <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", marginLeft: 8 }}>4 online</span>
            </div>
          </div>
          <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { col: "To Do", color: "#6366F1", tasks: ["Design system", "API docs", "Onboarding flow"] },
              { col: "In Progress", color: "#F59E0B", tasks: ["Dashboard UI", "AI chat polish"] },
              { col: "Done", color: "#10B981", tasks: ["Auth", "DB schema", "Voice agent"] },
            ].map(col => (
              <div key={col.col}>
                <div style={{ fontSize: "0.6rem", fontWeight: 700, color: col.color, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: col.color }} />{col.col}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {col.tasks.map(t => (
                    <div key={t} style={{ padding: "7px 9px", borderRadius: 7, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", fontSize: "0.67rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.4 }}>{t}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: "8px 14px 14px", display: "flex", gap: 6 }}>
            {["Live sync", "4 active", "Liveblocks"].map(b => (
              <div key={b} style={{ padding: "3px 9px", borderRadius: 100, background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", fontSize: "0.62rem", color: C }}>{b}</div>
            ))}
          </div>
        </div>
        {/* Text */}
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 100, background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.25)", marginBottom: 20 }}>
            <Users size={12} color={C} />
            <span style={{ fontSize: "0.73rem", fontWeight: 700, color: C, textTransform: "uppercase", letterSpacing: "0.07em" }}>Live Collaboration</span>
          </div>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(1.6rem,3.5vw,2.2rem)", fontWeight: 800, color: "#fff", margin: "0 0 16px", letterSpacing: "-0.03em" }}>
            Your team, in perfect sync.<br />
            <span style={{ background: `linear-gradient(135deg,${C},${V})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>In real time.</span>
          </h2>
          <p style={{ fontSize: "0.93rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.75, margin: "0 0 28px" }}>
            Powered by Liveblocks, Grind OS delivers live presence, instant board updates, and collaborative editing without any additional configuration.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { Icon: Share2, color: C, title: "Shared Kanban Boards", desc: "Everyone's changes appear instantly — no refresh needed." },
              { Icon: MousePointer, color: V, title: "Live Cursors & Presence", desc: "See exactly where your teammates are working in real time." },
              { Icon: Globe, color: "#10B981", title: "Team Workspace", desc: "Invite collaborators and track who's online at all times." },
            ].map(f => {
              const Icon = f.Icon;
              return (
                <div key={f.title} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: f.color + "15", border: `1px solid ${f.color}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={17} color={f.color} strokeWidth={1.8} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#fff", marginBottom: 3 }}>{f.title}</div>
                    <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.55 }}>{f.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 760px) { .fb-collab-grid { grid-template-columns: 1fr !important; gap: 40px !important; } }`}</style>
    </section>
  );
}

function FeatureCTA() {
  return (
    <section style={{ padding: "80px 28px", background: "#fafafe", textAlign: "center" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 800, color: "#0a0720", margin: "0 0 16px", letterSpacing: "-0.03em" }}>
          Start using all of this <span style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>for free</span>
        </h2>
        <p style={{ fontSize: "0.95rem", color: "#6b7280", margin: "0 0 32px", lineHeight: 1.7 }}>No credit card required. Every feature available from day one.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href={navHref("/sign-up")}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 30px", borderRadius: 10, background: G, color: "#fff", fontSize: "0.95rem", fontWeight: 700, textDecoration: "none", boxShadow: "0 8px 24px rgba(116,103,240,0.4)", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(116,103,240,0.55)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(116,103,240,0.4)"; }}>
            Get started free <ArrowRight size={15} strokeWidth={2.5} />
          </a>
          <a href={navHref("/pricing")}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 24px", borderRadius: 10, border: "1.5px solid rgba(116,103,240,0.3)", color: V, fontSize: "0.95rem", fontWeight: 700, textDecoration: "none", transition: "all 0.18s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(116,103,240,0.05)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
            View pricing
          </a>
        </div>
      </div>
    </section>
  );
}

export default function FeaturesPage() {
  return (
    <LandingPage>
      <PageHero />
      <JarvisSection />
      <AllFeaturesGrid />
      <CollabSection />
      <FeatureCTA />
    </LandingPage>
  );
}
