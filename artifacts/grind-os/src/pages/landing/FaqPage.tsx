import React, { useState } from "react";
import { ChevronDown, MessageSquare, Sparkles, ArrowRight } from "lucide-react";
import { LandingPage } from "./LandingLayout";

const V = "#7467F0";
const G = `linear-gradient(135deg, #7467F0, #06B6D4)`;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
function navHref(path: string) { return `${basePath}${path}`; }

const FAQS = [
  {
    category: "JARVIS & Voice Agent",
    items: [
      {
        q: "What is the JARVIS Voice Agent?",
        a: "JARVIS is a real-time voice AI agent powered by AssemblyAI's Voice Agent API. It captures your microphone input as raw PCM16 audio at 24kHz, processes it in real time, and responds with natural speech. Unlike simple voice assistants, JARVIS can take real actions in your workspace — creating tasks, reading your schedule, adding calendar events, and more."
      },
      {
        q: "How do I customize JARVIS?",
        a: "Go to Settings → AI Settings → JARVIS Persona. You can set your name (JARVIS will greet and address you as 'Master [Your Name]') and choose from 7 available voices: Brian, Ava, Aria, Christopher, Eric, Liam, and Emma."
      },
      {
        q: "What actions can JARVIS perform by voice?",
        a: "JARVIS currently supports 6 tool actions: get your schedule, get your task list, read your notes, create a new Kanban task, create a calendar event, and get your full daily schedule. More tools are being added continuously."
      },
      {
        q: "Can I interrupt JARVIS while it's speaking?",
        a: "Yes. JARVIS supports barge-in — you can start speaking while JARVIS is responding and it will immediately stop and listen to you. This makes conversations feel natural rather than robotic."
      },
      {
        q: "Is JARVIS available on all plans?",
        a: "JARVIS Voice Agent is available on all plans, with limited usage on Free and unlimited usage on Pro and Team."
      },
    ],
  },
  {
    category: "AI Assistant",
    items: [
      {
        q: "How does the text AI Assistant work?",
        a: "The AI Assistant is powered by Groq's ultra-fast Llama 3.3 70B model. It has access to tool-calling, meaning it can take real actions in your workspace — not just give text responses. Ask it to create tasks, add calendar events, write notes, or summarize your productivity, and it will actually do those things."
      },
      {
        q: "What tools does the AI Assistant have?",
        a: "The AI can: create Kanban tasks, read your tasks, create calendar events, read your schedule, create notes, and generate productivity insights. More tools are being added as the platform grows."
      },
      {
        q: "Is my AI data used for training?",
        a: "No. Groq's API is not used for model training. Your prompts and responses are not stored or used to improve models. Your data stays private."
      },
    ],
  },
  {
    category: "Features & Workspace",
    items: [
      {
        q: "What productivity tools does Grind OS include?",
        a: "Grind OS includes: a JARVIS Voice Agent, AI text assistant, Kanban project boards, rich text notes, a full calendar with reminders, an infinite whiteboard (Excalidraw), an AI template builder for mini-apps, a daily schedule planner, a goal map, and a smart dashboard — all from a single workspace."
      },
      {
        q: "How does real-time collaboration work?",
        a: "Grind OS uses Liveblocks for real-time synchronization. On the Team plan, multiple users can be on the same Kanban board simultaneously — you'll see live cursors, presence indicators showing who's online, and instant updates when anyone makes a change. No manual refresh required."
      },
      {
        q: "What is the AI Template Builder?",
        a: "Describe any mini-app in plain English — for example, 'a daily habit tracker with streaks and categories' — and the AI will generate a fully interactive structure with tables, checklists, and progress tracking in seconds. You can save and reuse any template."
      },
      {
        q: "Can I import from Notion or other apps?",
        a: "An import tool for Notion, Markdown, and CSV is on the roadmap. For now, you can paste content into the rich text editor or ask the AI assistant to restructure imported text."
      },
      {
        q: "Is my data saved automatically?",
        a: "Yes. All notes, boards, whiteboard content, and settings are auto-saved and synced to your private Neon PostgreSQL database. You can access everything from any device after logging in."
      },
    ],
  },
  {
    category: "Pricing & Account",
    items: [
      {
        q: "Is there a free plan?",
        a: "Yes. The Free plan gives you access to 3 Kanban boards, unlimited notes, a basic calendar, 5 AI chat messages per day, 1 whiteboard, and limited JARVIS Voice Agent usage — forever, no credit card required."
      },
      {
        q: "Can I try Pro for free?",
        a: "Every new account gets a 14-day Pro trial with full access to all features, including unlimited AI, unlimited boards, JARVIS Voice Agent, and AI templates — completely free, no credit card needed."
      },
      {
        q: "Can I cancel anytime?",
        a: "Yes. There are no contracts or lock-in periods. You can downgrade or cancel your subscription at any time from your account settings. Your data remains accessible even on the Free plan."
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit cards (Visa, Mastercard, American Express) and PayPal. All payments are processed securely."
      },
    ],
  },
  {
    category: "Privacy & Security",
    items: [
      {
        q: "Where is my data stored?",
        a: "All your data is stored in a private Neon PostgreSQL database. We use Clerk for authentication (industry-leading security) and Liveblocks for real-time sync. No third-party has access to your workspace content."
      },
      {
        q: "Is Grind OS secure?",
        a: "Yes. Authentication is handled by Clerk with industry-standard OAuth and JWT tokens. All API requests require authentication. Your workspace data is private to your account and never shared with other users."
      },
    ],
  },
];

function PageHero() {
  return (
    <section style={{ padding: "120px 28px 72px", background: "linear-gradient(160deg, #08051c 0%, #0d0826 60%, #080e20 100%)", textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: "50%", top: "40%", transform: "translate(-50%,-50%)", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(116,103,240,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 100, background: "rgba(116,103,240,0.12)", border: "1px solid rgba(116,103,240,0.3)", marginBottom: 24 }}>
          <MessageSquare size={12} color="#c4beff" />
          <span style={{ fontSize: "0.73rem", fontWeight: 700, color: "#c4beff", textTransform: "uppercase", letterSpacing: "0.07em" }}>FAQ</span>
        </div>
        <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(2.2rem,5vw,3.5rem)", fontWeight: 900, color: "#fff", margin: "0 0 18px", letterSpacing: "-0.035em", lineHeight: 1.15 }}>
          Frequently asked<br />
          <span style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>questions</span>
        </h1>
        <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.75, margin: 0 }}>
          Everything you need to know about Grind OS, JARVIS, and your workspace.
        </p>
      </div>
    </section>
  );
}

function FaqContent() {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => {
    setOpenMap(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section style={{ padding: "64px 28px 96px", background: "#fff" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        {FAQS.map(section => (
          <div key={section.category} style={{ marginBottom: 48 }}>
            {/* Category header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ height: 1, flex: 1, background: "#f0eff8" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 100, background: "#f5f4ff", border: "1px solid rgba(116,103,240,0.2)" }}>
                <Sparkles size={11} color={V} />
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: V, textTransform: "uppercase", letterSpacing: "0.07em" }}>{section.category}</span>
              </div>
              <div style={{ height: 1, flex: 1, background: "#f0eff8" }} />
            </div>

            {/* Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {section.items.map((item, idx) => {
                const key = `${section.category}-${idx}`;
                const isOpen = openMap[key];
                return (
                  <div key={key}
                    style={{ borderRadius: 12, border: isOpen ? `1px solid rgba(116,103,240,0.25)` : "1px solid #ededf8", overflow: "hidden", transition: "border-color 0.2s", background: isOpen ? "#fdfcff" : "#fff" }}>
                    <button
                      onClick={() => toggle(key)}
                      style={{
                        width: "100%", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
                        background: "none", border: "none", cursor: "pointer", gap: 16, textAlign: "left",
                      }}>
                      <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: "0.95rem", fontWeight: 700, color: isOpen ? "#0a0720" : "#1f1b4b", lineHeight: 1.4 }}>{item.q}</span>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: isOpen ? "rgba(116,103,240,0.1)" : "#f5f4ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                        <ChevronDown size={16} color={isOpen ? V : "#9ca3af"} strokeWidth={2.5}
                          style={{ transition: "transform 0.25s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
                      </div>
                    </button>
                    {isOpen && (
                      <div style={{ padding: "0 20px 20px" }}>
                        <div style={{ height: 1, background: "rgba(116,103,240,0.1)", marginBottom: 16 }} />
                        <p style={{ fontSize: "0.88rem", color: "#4b5563", lineHeight: 1.8, margin: 0 }}>{item.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Still have questions */}
        <div style={{ marginTop: 48, padding: "28px 32px", borderRadius: 16, background: "linear-gradient(135deg, #f5f3ff, #ecfeff)", border: "1px solid rgba(116,103,240,0.18)", textAlign: "center" }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: "1.1rem", fontWeight: 700, color: "#0a0720", marginBottom: 8 }}>Still have questions?</div>
          <p style={{ fontSize: "0.88rem", color: "#6b7280", margin: "0 0 20px", lineHeight: 1.65 }}>
            Can't find what you're looking for? Reach out and we'll get back to you within 24 hours.
          </p>
          <a href="mailto:hello@grind-os.com"
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 22px", borderRadius: 9, background: G, color: "#fff", fontSize: "0.875rem", fontWeight: 700, textDecoration: "none", boxShadow: "0 6px 18px rgba(116,103,240,0.35)", transition: "all 0.18s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 10px 24px rgba(116,103,240,0.5)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(116,103,240,0.35)"; }}>
            Contact support <ArrowRight size={13} strokeWidth={2.5} />
          </a>
        </div>
      </div>
    </section>
  );
}

export default function FaqPage() {
  return (
    <LandingPage>
      <PageHero />
      <FaqContent />
    </LandingPage>
  );
}
