import React from "react";
import PlaceholderPage from "../placeholder";
import { KanbanSquare } from "lucide-react";

export default function KanbanPage() {
  return (
    <PlaceholderPage
      title="Task / Kanban"
      description="Manage your sprints and tasks visually with drag-and-drop kanban boards."
      icon={<KanbanSquare size={28} color="#10B981" strokeWidth={1.8} />}
      color="#10B981"
    />
  );
}
