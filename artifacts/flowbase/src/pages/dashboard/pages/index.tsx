import React from "react";
import PlaceholderPage from "../placeholder";
import { BookOpen } from "lucide-react";

export default function PagesSpacesPage() {
  return (
    <PlaceholderPage
      title="Pages / Spaces"
      description="Build shared knowledge bases, wikis, and collaborative spaces for your team."
      icon={<BookOpen size={28} color="#0EA5E9" strokeWidth={1.8} />}
      color="#0EA5E9"
    />
  );
}
