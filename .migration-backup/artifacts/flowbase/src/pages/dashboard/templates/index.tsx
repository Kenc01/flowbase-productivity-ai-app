import React from "react";
import PlaceholderPage from "../placeholder";
import { Wand2 } from "lucide-react";

export default function TemplatesPage() {
  return (
    <PlaceholderPage
      title="AI Template Builder"
      description="Generate and customize templates for any workflow using AI-powered suggestions."
      icon={<Wand2 size={28} color="#A855F7" strokeWidth={1.8} />}
      color="#A855F7"
    />
  );
}
