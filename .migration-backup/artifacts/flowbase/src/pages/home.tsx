import React from "react";
import { Link } from "wouter";

export default function Home() {
  return (
    <main style={styles.container}>
      <div style={styles.hero}>
        <div style={styles.badge}>FlowBase Workspace 🚀</div>
        <h1 style={styles.title}>
          Your All-in-One <span style={styles.gradient}>Productivity Hub</span>
        </h1>
        <p style={styles.subtitle}>
          FlowBase combines the power of Notion and Miro into one beautiful, AI-powered productivity workspace. Manage tasks, notes, boards, and more.
        </p>
        <div style={styles.ctaGroup}>
          <Link href="/dashboard" style={styles.primaryCta}>
            Go to Dashboard
          </Link>
          <a href="#features" style={styles.secondaryCta}>
            Explore Features
          </a>
        </div>
      </div>

      <section id="features" style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.icon}>⚡</div>
          <h3 style={styles.cardTitle}>AI Assistant</h3>
          <p style={styles.cardText}>Summarize notes, generate templates, and plan your week with an intelligent AI assistant.</p>
        </div>
        <div style={styles.card}>
          <div style={styles.icon}>📋</div>
          <h3 style={styles.cardTitle}>Task & Kanban</h3>
          <p style={styles.cardText}>Organize work with powerful task management and visual kanban boards.</p>
        </div>
        <div style={styles.card}>
          <div style={styles.icon}>📝</div>
          <h3 style={styles.cardTitle}>Notes & Pages</h3>
          <p style={styles.cardText}>Create rich notes, whiteboards, and collaborative spaces for your team.</p>
        </div>
      </section>

      <footer style={styles.footer}>
        FlowBase — Your Productivity Workspace
      </footer>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#09090b",
    color: "#fafafa",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: "2rem",
    boxSizing: "border-box",
  },
  hero: {
    textAlign: "center",
    maxWidth: "800px",
    marginBottom: "4rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  badge: {
    display: "inline-block",
    padding: "0.5rem 1rem",
    borderRadius: "9999px",
    backgroundColor: "#27272a",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#38bdf8",
    marginBottom: "1.5rem",
    border: "1px solid #3f3f46",
  },
  title: {
    fontSize: "3rem",
    fontWeight: 800,
    letterSpacing: "-0.025em",
    lineHeight: 1.2,
    margin: "0 0 1rem 0",
  },
  gradient: {
    background: "linear-gradient(to right, #38bdf8, #818cf8, #c084fc)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    fontSize: "1.125rem",
    color: "#a1a1aa",
    lineHeight: 1.6,
    margin: "0 0 2rem 0",
    maxWidth: "600px",
  },
  ctaGroup: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  primaryCta: {
    padding: "0.75rem 1.5rem",
    borderRadius: "8px",
    backgroundColor: "#7467F0",
    color: "#fff",
    fontWeight: 600,
    textDecoration: "none",
    transition: "opacity 0.2s",
  },
  secondaryCta: {
    padding: "0.75rem 1.5rem",
    borderRadius: "8px",
    backgroundColor: "transparent",
    color: "#fafafa",
    fontWeight: 600,
    textDecoration: "none",
    border: "1px solid #3f3f46",
    transition: "background-color 0.2s",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "2rem",
    width: "100%",
    maxWidth: "1000px",
    marginBottom: "4rem",
  },
  card: {
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    borderRadius: "12px",
    padding: "1.5rem",
    transition: "transform 0.2s, border-color 0.2s",
  },
  icon: {
    fontSize: "2rem",
    marginBottom: "1rem",
  },
  cardTitle: {
    fontSize: "1.25rem",
    fontWeight: 600,
    margin: "0 0 0.5rem 0",
  },
  cardText: {
    fontSize: "0.875rem",
    color: "#a1a1aa",
    lineHeight: 1.5,
    margin: 0,
  },
  footer: {
    fontSize: "0.875rem",
    color: "#71717a",
    marginTop: "auto",
  },
};
