import React from "react";
import PlaceholderPage from "../placeholder";
import { CalendarDays } from "lucide-react";

export default function CalendarPage() {
  return (
    <PlaceholderPage
      title="Calendar"
      description="View and manage your schedule, meetings, and deadlines in one place."
      icon={<CalendarDays size={28} color="#F59E0B" strokeWidth={1.8} />}
      color="#F59E0B"
    />
  );
}
