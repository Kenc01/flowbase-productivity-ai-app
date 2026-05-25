import React from "react";
import PlaceholderPage from "../placeholder";
import { Bot } from "lucide-react";

export default function AIAssistantPage() {
  return (
    <PlaceholderPage
      title="AI Assistant"
      description="Ask anything — summarize notes, generate templates, plan your week with FlowBase AI."
      icon={<Bot size={28} color="#06B6D4" strokeWidth={1.8} />}
      color="#06B6D4"
    />
  );
}
