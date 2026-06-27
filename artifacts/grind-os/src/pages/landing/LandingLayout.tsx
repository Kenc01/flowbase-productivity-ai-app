import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight, Menu, X,
  Github, Twitter, Linkedin,
} from "lucide-react";

const V = "#7467F0";
const G = `linear-gradient(135deg, #7467F0, #06B6D4)`;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function navHref(path: string) {
  return `${basePath}${path}`;
}

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const navLinks = [
    { label: "Features", path: "/features" },
    { label: "Pricing", path: "/pricing" },
    { label: "FAQ", path: "/faq" },
  ];

  const isActive = (path: string) => location === path;

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
      background: scrolled ? "rgba(8,5,28,0.92)" : "transparent",
      backdropFilter: scrolled ? "blur(20px)" : "none",
      borderBottom: scrolled ? "1px solid rgba(116,103,240,0.15)" : "none",
      transition: "all 0.3s ease",
    }}>
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 28px", height: 64, display: "flex", alignItems: "center", gap: 8 }}>

        {/* Logo */}
        <a href={navHref("/")} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginRight: 12 }}>
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Grind OS" width={32} height={32} style={{ borderRadius: 9, display: "block" }} />
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: "1.1rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
            Grind OS
          </span>
        </a>

        {/* Desktop nav links */}
        <div style={{ display: "flex", gap: 2, flex: 1 }} className="fb-nav-links">
          {navLinks.map(n => (
            <a key={n.label} href={navHref(n.path)}
              style={{
                padding: "6px 16px", borderRadius: 8, fontSize: "0.875rem", fontWeight: 500,
                color: isActive(n.path) ? "#fff" : "rgba(255,255,255,0.6)",
                background: isActive(n.path) ? "rgba(116,103,240,0.18)" : "transparent",
                textDecoration: "none", transition: "all 0.15s",
                border: isActive(n.path) ? "1px solid rgba(116,103,240,0.3)" : "1px solid transparent",
              }}
              onMouseEnter={e => { if (!isActive(n.path)) { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; } }}
              onMouseLeave={e => { if (!isActive(n.path)) { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; e.currentTarget.style.background = "transparent"; } }}>
              {n.label}
            </a>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }} className="fb-nav-cta">
          <a href={navHref("/sign-in")}
            style={{ padding: "7px 16px", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600, color: "rgba(255,255,255,0.7)", textDecoration: "none", transition: "color 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}>
            Sign in
          </a>
          <a href={navHref("/sign-up")}
            style={{ padding: "8px 20px", borderRadius: 8, background: G, fontSize: "0.85rem", fontWeight: 700, color: "#fff", textDecoration: "none", boxShadow: "0 4px 18px rgba(116,103,240,0.5)", display: "flex", alignItems: "center", gap: 5, transition: "all 0.18s" }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 24px rgba(116,103,240,0.7)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 18px rgba(116,103,240,0.5)"; e.currentTarget.style.transform = "translateY(0)"; }}>
            Get Started <ArrowRight size={13} strokeWidth={2.5} />
          </a>
        </div>

        {/* Mobile burger */}
        <button onClick={() => setOpen(!open)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "none", padding: 4 }}
          className="fb-burger">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div style={{ background: "rgba(8,5,28,0.98)", borderBottom: "1px solid rgba(116,103,240,0.2)", padding: "16px 28px 24px" }}>
          {navLinks.map(n => (
            <a key={n.label} href={navHref(n.path)} onClick={() => setOpen(false)}
              style={{ display: "block", padding: "12px 0", fontSize: "0.95rem", fontWeight: 500, color: isActive(n.path) ? "#c4beff" : "rgba(255,255,255,0.75)", textDecoration: "none", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {n.label}
            </a>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <a href={navHref("/sign-in")} style={{ flex: 1, textAlign: "center", padding: "11px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.18)", color: "#fff", fontSize: "0.9rem", fontWeight: 600, textDecoration: "none" }}>Sign In</a>
            <a href={navHref("/sign-up")} style={{ flex: 1, textAlign: "center", padding: "11px", borderRadius: 9, background: G, color: "#fff", fontSize: "0.9rem", fontWeight: 700, textDecoration: "none" }}>Get Started</a>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 680px) {
          .fb-nav-links { display: none !important; }
          .fb-nav-cta { display: none !important; }
          .fb-burger { display: flex !important; margin-left: auto; }
        }
      `}</style>
    </nav>
  );
}

export function LandingFooter() {
  return (
    <footer style={{ background: "#06040f", borderTop: "1px solid rgba(116,103,240,0.12)", padding: "56px 28px 32px" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 48 }} className="fb-footer-grid">

          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
              <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Grind OS" width={30} height={30} style={{ borderRadius: 8, display: "block" }} />
              <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: "1rem", fontWeight: 800, color: "#fff" }}>Grind OS</span>
            </div>
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.7, maxWidth: 260, margin: "0 0 20px" }}>
              Your AI-powered productivity workspace. JARVIS voice agent, smart tools, real-time collaboration — all in one place.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              {[Twitter, Github, Linkedin].map((Icon, i) => (
                <div key={i} style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(116,103,240,0.2)"; e.currentTarget.style.borderColor = "rgba(116,103,240,0.4)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}>
                  <Icon size={15} color="rgba(255,255,255,0.5)" />
                </div>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Product</div>
            {["Features", "Pricing", "FAQ", "Changelog"].map(l => (
              <a key={l} href={navHref(`/${l.toLowerCase()}`)}
                style={{ display: "block", fontSize: "0.875rem", color: "rgba(255,255,255,0.5)", textDecoration: "none", marginBottom: 10, transition: "color 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}>
                {l}
              </a>
            ))}
          </div>

          {/* Company */}
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Company</div>
            {["About", "Blog", "Careers", "Contact"].map(l => (
              <a key={l} href="#"
                style={{ display: "block", fontSize: "0.875rem", color: "rgba(255,255,255,0.5)", textDecoration: "none", marginBottom: 10, transition: "color 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}>
                {l}
              </a>
            ))}
          </div>

          {/* Legal */}
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Legal</div>
            {["Privacy Policy", "Terms of Service", "Cookie Policy", "Security"].map(l => (
              <a key={l} href="#"
                style={{ display: "block", fontSize: "0.875rem", color: "rgba(255,255,255,0.5)", textDecoration: "none", marginBottom: 10, transition: "color 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}>
                {l}
              </a>
            ))}
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.3)" }}>© 2026 Grind OS. All rights reserved.</span>
          <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.2)" }}>Built with Groq · AssemblyAI · Liveblocks · Neon</span>
        </div>
      </div>
      <style>{`
        @media (max-width: 720px) { .fb-footer-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 480px) { .fb-footer-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </footer>
  );
}

export function LandingPage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "#08051c", fontFamily: "'Inter',sans-serif" }}>
      <LandingNav />
      <main style={{ flex: 1 }}>
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}
