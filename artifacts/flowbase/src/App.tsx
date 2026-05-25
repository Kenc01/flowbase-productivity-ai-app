import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import DashboardLayout from "@/pages/dashboard/DashboardLayout";
import DashboardPage from "@/pages/dashboard/index";
import AIAssistantPage from "@/pages/dashboard/ai-assistant/index";
import CalendarPage from "@/pages/dashboard/calendar/index";
import KanbanPage from "@/pages/dashboard/kanban/index";
import NotesPage from "@/pages/dashboard/notes/index";
import WhiteboardPage from "@/pages/dashboard/whiteboard/index";
import PagesSpacesPage from "@/pages/dashboard/pages/index";
import TemplatesPage from "@/pages/dashboard/templates/index";
import SettingsPage from "@/pages/dashboard/settings/index";

const queryClient = new QueryClient();

function DashboardWithLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard">
        <DashboardWithLayout>
          <DashboardPage />
        </DashboardWithLayout>
      </Route>
      <Route path="/dashboard/ai-assistant">
        <DashboardWithLayout>
          <AIAssistantPage />
        </DashboardWithLayout>
      </Route>
      <Route path="/dashboard/calendar">
        <DashboardWithLayout>
          <CalendarPage />
        </DashboardWithLayout>
      </Route>
      <Route path="/dashboard/kanban">
        <DashboardWithLayout>
          <KanbanPage />
        </DashboardWithLayout>
      </Route>
      <Route path="/dashboard/notes">
        <DashboardWithLayout>
          <NotesPage />
        </DashboardWithLayout>
      </Route>
      <Route path="/dashboard/whiteboard">
        <DashboardWithLayout>
          <WhiteboardPage />
        </DashboardWithLayout>
      </Route>
      <Route path="/dashboard/pages">
        <DashboardWithLayout>
          <PagesSpacesPage />
        </DashboardWithLayout>
      </Route>
      <Route path="/dashboard/templates">
        <DashboardWithLayout>
          <TemplatesPage />
        </DashboardWithLayout>
      </Route>
      <Route path="/dashboard/settings">
        <DashboardWithLayout>
          <SettingsPage />
        </DashboardWithLayout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
