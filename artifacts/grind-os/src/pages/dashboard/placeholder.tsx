import React from "react";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export default function PlaceholderPage({ title, description, icon, color }: PlaceholderPageProps) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--fb-bg)",
        gap: "16px",
        padding: "40px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "16px",
          background: `${color}18`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "8px",
        }}
      >
        {icon}
      </div>
      <h2
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "var(--fb-text)",
          margin: 0,
        }}
      >
        {title}
      </h2>
      <p style={{ fontSize: "0.88rem", color: "var(--fb-text-muted)", margin: 0, maxWidth: "360px" }}>
        {description}
      </p>
      <div
        style={{
          marginTop: "8px",
          padding: "8px 18px",
          borderRadius: "8px",
          background: `${color}14`,
          border: `1px solid ${color}30`,
          color: color,
          fontSize: "0.78rem",
          fontWeight: 600,
        }}
      >
        Coming soon
      </div>
    </div>
  );
}
