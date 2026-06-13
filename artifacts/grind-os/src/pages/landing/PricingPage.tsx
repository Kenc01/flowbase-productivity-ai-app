import React from "react";
import {
  CheckCircle2, ArrowRight, Sparkles, Zap, Award, Shield,
  Bot, Mic, Users, KanbanSquare, Wand2, BarChart3, Clock,
} from "lucide-react";
import { LandingPage } from "./LandingLayout";

const V = "#7467F0";
const C = "#06B6D4";
const G = `linear-gradient(135deg, #7467F0, #06B6D4)`;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
function navHref(path: string) { return `${basePath}${path}`; }

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    color: "#64748B",
    popular: false,
    tagline: "Start exploring Grind OS",
    features: [
      "3 Kanban boards",
      "Unlimited notes",
      "Basic calendar",
      "5 AI chat messages/day",
      "1 whiteboard",
      "JARVIS Voice Agent (limited)",
      "Community support",
    ],
    cta: "Start Free",
    ctaHref: "/sign-up",
  },
  {
    name: "Pro",
    price: "$12",
    period: "per month",
    color: V,
    popular: true,
    tagline: "Everything you need to grind",
    features: [
      "Unlimited Kanban boards",
      "Unlimited notes & pages",
      "Full calendar + reminders",
      "Unlimited AI chat",
      "Unlimited whiteboards",
      "JARVIS Voice Agent (unlimited)",
      "AI Template Builder",
      "Daily Schedule planner",
      "Goal Map tracking",
      "Priority support",
    ],
    cta: "Get Pro",
    ctaHref: "/sign-up",
  },
  {
    name: "Team",
    price: "$29",
    period: "per month",
    color: "#10B981",
    popular: false,
    tagline: "For teams that move fast",
    features: [
      "Everything in Pro",
      "Real-time collaboration (Liveblocks)",
      "Live cursors & presence",
      "Shared team workspace",
      "Admin controls & permissions",
      "Usage analytics dashboard",
      "Shared JARVIS persona",
      "Priority + dedicated support",
    ],
    cta: "Start Team Trial",
    ctaHref: "/sign-up",
  },
];

function PageHero() {
  return (
    <section style={{ padding: "120px 28px 72px", background: "linear-gradient(160deg, #08051c 0%, #0d0826 60%, #080e20 100%)", textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: "50%", top: "40%", transform: "translate(-50%,-50%)", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(116,103,240,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 100, background: "rgba(116,103,240,0.12)", border: "1px solid rgba(116,103,240,0.3)", marginBottom: 24 }}>
          <Award size={12} color="#c4beff" />
          <span style={{ fontSize: "0.73rem", fontWeight: 700, color: "#c4beff", textTransform: "uppercase", letterSpacing: "0.07em" }}>Pricing</span>
        </div>
        <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(2.2rem,5vw,3.5rem)", fontWeight: 900, color: "#fff", margin: "0 0 18px", letterSpacing: "-0.035em", lineHeight: 1.15 }}>
          Simple, transparent<br />
          <span style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>pricing</span>
        </h1>
        <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.75, margin: 0 }}>
          No hidden fees. No surprise charges. Start free and upgrade when you're ready.
        </p>
      </div>
    </section>
  );
}

function PricingCards() {
  return (
    <section style={{ padding: "0 28px 80px", background: "linear-gradient(to bottom, #0d0826 0%, #fff 30%)" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 20, alignItems: "stretch" }}>
          {plans.map(p => (
            <div key={p.name} style={{
              position: "relative", borderRadius: 18,
              padding: p.popular ? "36px 28px 28px" : "28px",
              background: p.popular ? "linear-gradient(160deg, #0d0826, #160940)" : "#fff",
              border: p.popular ? `1px solid ${V}45` : "1px solid #ededf8",
              boxShadow: p.popular ? "0 24px 72px rgba(116,103,240,0.28), 0 0 0 1px rgba(116,103,240,0.1)" : "0 4px 20px rgba(0,0,0,0.05)",
              display: "flex", flexDirection: "column",
              transform: p.popular ? "scale(1.03)" : "none",
            }}>
              {p.popular && (
                <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", padding: "5px 20px", borderRadius: 100, background: G, fontSize: "0.72rem", fontWeight: 800, color: "#fff", whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(116,103,240,0.5)", letterSpacing: "0.03em" }}>
                  ✦ Most Popular
                </div>
              )}

              {/* Plan header */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: p.popular ? "rgba(255,255,255,0.5)" : "#9ca3af", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>{p.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: "2.8rem", fontWeight: 900, color: p.popular ? "#fff" : "#0a0720", letterSpacing: "-0.04em" }}>{p.price}</span>
                  <span style={{ fontSize: "0.82rem", color: p.popular ? "rgba(255,255,255,0.4)" : "#9ca3af" }}>/{p.period}</span>
                </div>
                <div style={{ fontSize: "0.83rem", color: p.popular ? "rgba(255,255,255,0.5)" : "#6b7280" }}>{p.tagline}</div>
              </div>

              <div style={{ height: 1, background: p.popular ? "rgba(255,255,255,0.07)" : "#f0eff8", marginBottom: 20 }} />

              {/* Features */}
              <div style={{ display: "flex", flexDirection: "column", gap: 11, flex: 1, marginBottom: 28 }}>
                {p.features.map(f => (
                  <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <CheckCircle2 size={15} color={p.popular ? "#10B981" : p.color} strokeWidth={2} style={{ marginTop: 1, flexShrink: 0 }} />
                    <span style={{ fontSize: "0.85rem", color: p.popular ? "rgba(255,255,255,0.75)" : "#374151", lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <a href={navHref(p.ctaHref)}
                style={{
                  display: "block", textAlign: "center", padding: "13px",
                  borderRadius: 11,
                  background: p.popular ? G : "transparent",
                  border: p.popular ? "none" : `1.5px solid ${p.color}50`,
                  color: p.popular ? "#fff" : p.color,
                  fontSize: "0.92rem", fontWeight: 700, textDecoration: "none",
                  boxShadow: p.popular ? "0 6px 22px rgba(116,103,240,0.45)" : "none",
                  transition: "all 0.18s",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; if (p.popular) e.currentTarget.style.boxShadow = "0 10px 30px rgba(116,103,240,0.6)"; else e.currentTarget.style.background = p.color + "10"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; if (p.popular) e.currentTarget.style.boxShadow = "0 6px 22px rgba(116,103,240,0.45)"; else e.currentTarget.style.background = "transparent"; }}>
                {p.cta}
              </a>
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", fontSize: "0.82rem", color: "rgba(255,255,255,0.25)", marginTop: 32 }}>
          All plans include a 14-day free trial of Pro. No credit card required to start.
        </p>
      </div>
    </section>
  );
}

function ComparisonTable() {
  const rows = [
    { label: "Kanban boards", free: "3 boards", pro: "Unlimited", team: "Unlimited" },
    { label: "Notes & pages", free: "Unlimited", pro: "Unlimited", team: "Unlimited" },
    { label: "Whiteboards", free: "1", pro: "Unlimited", team: "Unlimited" },
    { label: "AI chat (Groq)", free: "5/day", pro: "Unlimited", team: "Unlimited" },
    { label: "JARVIS Voice Agent", free: "Limited", pro: "Unlimited", team: "Unlimited" },
    { label: "AI Template Builder", free: false, pro: true, team: true },
    { label: "Daily Schedule", free: true, pro: true, team: true },
    { label: "Goal Map", free: false, pro: true, team: true },
    { label: "Live collaboration", free: false, pro: false, team: true },
    { label: "Live cursors & presence", free: false, pro: false, team: true },
    { label: "Admin controls", free: false, pro: false, team: true },
    { label: "Usage analytics", free: false, pro: false, team: true },
    { label: "Support", free: "Community", pro: "Priority", team: "Dedicated" },
  ];

  const cellStyle = (val: string | boolean, highlight = false): React.CSSProperties => ({
    padding: "13px 16px",
    textAlign: "center" as const,
    fontSize: "0.83rem",
    color: val === false ? "#d1d5db" : highlight ? "#fff" : "#374151",
    background: highlight ? "rgba(116,103,240,0.04)" : "transparent",
    borderBottom: "1px solid #f0eff8",
  });

  const renderVal = (val: string | boolean, highlight = false) => {
    if (val === true) return <CheckCircle2 size={16} color="#10B981" strokeWidth={2.5} style={{ margin: "0 auto", display: "block" }} />;
    if (val === false) return <span style={{ color: "#d1d5db", fontSize: "1rem" }}>–</span>;
    return <span style={{ fontWeight: 600, color: highlight ? "#c4beff" : "#374151" }}>{val}</span>;
  };

  return (
    <section style={{ padding: "64px 28px", background: "#fff" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(1.6rem,3.5vw,2.2rem)", fontWeight: 800, color: "#0a0720", textAlign: "center", margin: "0 0 40px", letterSpacing: "-0.03em" }}>
          Full feature comparison
        </h2>
        <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #ededf8", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", background: "#fafafe", borderBottom: "2px solid #ededf8" }}>
            <div style={{ padding: "14px 18px", fontSize: "0.78rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>Feature</div>
            {["Free", "Pro", "Team"].map((h, i) => (
              <div key={h} style={{ padding: "14px 16px", textAlign: "center", fontSize: "0.82rem", fontWeight: 800, color: i === 1 ? V : "#374151", background: i === 1 ? "rgba(116,103,240,0.04)" : "transparent" }}>{h}</div>
            ))}
          </div>
          {/* Rows */}
          {rows.map(row => (
            <div key={row.label} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
              <div style={{ padding: "13px 18px", fontSize: "0.84rem", color: "#374151", borderBottom: "1px solid #f0eff8", fontWeight: 500 }}>{row.label}</div>
              <div style={cellStyle(row.free)}>{renderVal(row.free)}</div>
              <div style={cellStyle(row.pro, true)}>{renderVal(row.pro, true)}</div>
              <div style={cellStyle(row.team)}>{renderVal(row.team)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Guarantee() {
  return (
    <section style={{ padding: "64px 28px", background: "#fafafe" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 20 }}>
          {[
            { Icon: Shield, color: V, title: "No credit card needed", desc: "Start the Free plan or trial Pro without entering any payment details." },
            { Icon: Zap, color: "#10B981", title: "Cancel anytime", desc: "No lock-in contracts. Downgrade or cancel your subscription at any time." },
            { Icon: Award, color: "#F59E0B", title: "14-day Pro trial", desc: "Every new account gets 14 days of Pro features — completely free." },
          ].map(f => {
            const Icon = f.Icon;
            return (
              <div key={f.title} style={{ padding: "22px 24px", borderRadius: 14, background: "#fff", border: "1px solid #ededf8", display: "flex", gap: 14, alignItems: "flex-start", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: f.color + "12", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={19} color={f.color} strokeWidth={1.8} />
                </div>
                <div>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: "0.95rem", fontWeight: 700, color: "#0a0720", marginBottom: 5 }}>{f.title}</div>
                  <div style={{ fontSize: "0.82rem", color: "#6b7280", lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PricingCTA() {
  return (
    <section style={{ padding: "80px 28px", background: "linear-gradient(160deg, #08051c, #0d0826)", textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 700, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(116,103,240,0.09) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", maxWidth: 560, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(1.9rem,4vw,2.8rem)", fontWeight: 900, color: "#fff", margin: "0 0 16px", letterSpacing: "-0.035em" }}>
          Start free today
        </h2>
        <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.45)", margin: "0 0 32px", lineHeight: 1.7 }}>
          No commitment. All features available from day one. Meet your JARVIS.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href={navHref("/sign-up")}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 32px", borderRadius: 10, background: G, color: "#fff", fontSize: "0.95rem", fontWeight: 700, textDecoration: "none", boxShadow: "0 8px 24px rgba(116,103,240,0.45)", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(116,103,240,0.6)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(116,103,240,0.45)"; }}>
            Get started free <ArrowRight size={15} strokeWidth={2.5} />
          </a>
          <a href={navHref("/faq")}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 24px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)", fontSize: "0.95rem", fontWeight: 600, textDecoration: "none", transition: "all 0.18s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
            Read FAQ
          </a>
        </div>
      </div>
    </section>
  );
}

export default function PricingPage() {
  return (
    <LandingPage>
      <PageHero />
      <PricingCards />
      <ComparisonTable />
      <Guarantee />
      <PricingCTA />
    </LandingPage>
  );
}
