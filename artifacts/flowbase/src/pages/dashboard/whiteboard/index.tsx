import React from "react";
import PlaceholderPage from "../placeholder";
import { PenLine } from "lucide-react";

export default function WhiteboardPage() {
  return (
    <PlaceholderPage
      title="Whiteboard"
      description="Brainstorm, sketch, and collaborate visually on an infinite canvas."
      icon={<PenLine size={28} color="#4F46E5" strokeWidth={1.8} />}
      color="#4F46E5"
    />
  );
}
