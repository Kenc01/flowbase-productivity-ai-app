import { useEffect, useState } from "react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import LandingPage from "@/pages/landing/index";
import FeaturesPage from "@/pages/landing/FeaturesPage";
import PricingPage from "@/pages/landing/PricingPage";
import FaqPage from "@/pages/landing/FaqPage";
import DashboardLayout from "@/pages/dashboard/DashboardLayout";
import DashboardPage from "@/pages/dashboard/index";
import AIAssistantPage from "@/pages/dashboard/ai-assistant/index";
import CalendarPage from "@/pages/dashboard/calendar/index";
import KanbanPage from "@/pages/dashboard/kanban/index";
import NotesPage from "@/pages/dashboard/notes/index";
import DeepWorkPage from "@/pages/dashboard/deep-work/index";
import GoalMapPage from "@/pages/dashboard/goal-map/index";
import PagesSpacesPage from "@/pages/dashboard/pages/index";
import SettingsPage from "@/pages/dashboard/settings/index";
import DailySchedulePage from "@/pages/dashboard/daily-schedule/index";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const queryClient = new QueryClient();

export interface ReplitUser {
  id: string;
  name: string;
  profileImage: string;
}

function useReplitUser() {
  const [user, setUser] = useState<ReplitUser | null | undefined>(undefined);

  useEffect(() => {
    const userId = document.querySelector<HTMLMetaElement>('meta[name="replit-user-id"]')?.content;
    const userName = document.querySelector<HTMLMetaElement>('meta[name="replit-user-name"]')?.content;
    const userImage = document.querySelector<HTMLMetaElement>('meta[name="replit-user-profile-image"]')?.content;

    if (userId && userName) {
      setUser({ id: userId, name: userName, profileImage: userImage ?? "" });
    } else {
      setUser(null);
    }
  }, []);

  return user;
}

function HomeRoute() {
  const user = useReplitUser();
  if (user === undefined) return null;
  if (user) return <Redirect to="/dashboard" />;
  return <LandingPage />;
}

function DashboardRoute({ children }: { children: React.ReactNode }) {
  const user = useReplitUser();
  if (user === undefined) return null;
  if (!user) {
    window.location.href = "/__replauthlogin?redirect=" + encodeURIComponent(window.location.pathname);
    return null;
  }
  return <DashboardLayout>{children}</DashboardLayout>;
}

function Router() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Switch>
          <Route path="/" component={HomeRoute} />
          <Route path="/features" component={FeaturesPage} />
          <Route path="/pricing" component={PricingPage} />
          <Route path="/faq" component={FaqPage} />
          <Route path="/dashboard">
            <DashboardRoute>
              <DashboardPage />
            </DashboardRoute>
          </Route>
          <Route path="/dashboard/ai-assistant">
            <DashboardRoute>
              <AIAssistantPage />
            </DashboardRoute>
          </Route>
          <Route path="/dashboard/calendar">
            <DashboardRoute>
              <CalendarPage />
            </DashboardRoute>
          </Route>
          <Route path="/dashboard/kanban">
            <DashboardRoute>
              <KanbanPage />
            </DashboardRoute>
          </Route>
          <Route path="/dashboard/notes">
            <DashboardRoute>
              <NotesPage />
            </DashboardRoute>
          </Route>
          <Route path="/dashboard/deep-work">
            <DashboardRoute>
              <DeepWorkPage />
            </DashboardRoute>
          </Route>
          <Route path="/dashboard/goal-map">
            <DashboardRoute>
              <GoalMapPage />
            </DashboardRoute>
          </Route>
          <Route path="/dashboard/pages">
            <DashboardRoute>
              <PagesSpacesPage />
            </DashboardRoute>
          </Route>
          <Route path="/dashboard/settings">
            <DashboardRoute>
              <SettingsPage />
            </DashboardRoute>
          </Route>
          <Route path="/dashboard/daily-schedule">
            <DashboardRoute>
              <DailySchedulePage />
            </DashboardRoute>
          </Route>
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <Router />
    </WouterRouter>
  );
}

export default App;
