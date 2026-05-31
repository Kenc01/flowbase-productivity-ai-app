import React from "react";
import PlaceholderPage from "../placeholder";
import { NotebookPen } from "lucide-react";

export default function NotesPage() {
  return (
    <PlaceholderPage
      title="Notes"
      description="Create and organize rich notes, meeting summaries, and ideas."
      icon={<NotebookPen size={28} color="#F43F5E" strokeWidth={1.8} />}
      color="#F43F5E"
    />
  );
}
