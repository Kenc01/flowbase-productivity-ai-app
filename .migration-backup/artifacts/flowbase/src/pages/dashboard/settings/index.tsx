import React from "react";
import PlaceholderPage from "../placeholder";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <PlaceholderPage
      title="Settings"
      description="Customize your FlowBase workspace, notifications, integrations, and account preferences."
      icon={<Settings size={28} color="#94A3B8" strokeWidth={1.8} />}
      color="#94A3B8"
    />
  );
}
