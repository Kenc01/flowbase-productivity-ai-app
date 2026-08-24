import {
  ClerkProvider,
  useAuth,
  useUser,
  RedirectToSignIn,
  SignIn,
  SignUp,
} from "@clerk/react";
import { useEffect } from "react";
import {
  Switch,
  Route,
  useLocation,
  Router as WouterRouter,
  Redirect,
} from "wouter";
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
import { setApiTokenProvider } from "@/lib/api";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

const queryClient = new QueryClient();

function HomeRoute() {
  const { isSignedIn, isLoaded } = useUser();
  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect to="/dashboard" />;
  return <LandingPage />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();
  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;
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
          <Route path="/sign-in/:rest*">
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "100vh",
                background: "#08051c",
              }}
            >
              <SignIn
                routing="path"
                path="/sign-in"
                signUpUrl="/sign-up"
                forceRedirectUrl="/dashboard"
              />
            </div>
          </Route>
          <Route path="/sign-in">
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "100vh",
                background: "#08051c",
              }}
            >
              <SignIn
                routing="path"
                path="/sign-in"
                signUpUrl="/sign-up"
                forceRedirectUrl="/dashboard"
              />
            </div>
          </Route>
          <Route path="/sign-up/:rest*">
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "100vh",
                background: "#08051c",
              }}
            >
              <SignUp
                routing="path"
                path="/sign-up"
                signInUrl="/sign-in"
                forceRedirectUrl="/dashboard"
              />
            </div>
          </Route>
          <Route path="/sign-up">
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "100vh",
                background: "#08051c",
              }}
            >
              <SignUp
                routing="path"
                path="/sign-up"
                signInUrl="/sign-in"
                forceRedirectUrl="/dashboard"
              />
            </div>
          </Route>
          <Route path="/dashboard">
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          </Route>
          <Route path="/dashboard/ai-assistant">
            <ProtectedRoute>
              <AIAssistantPage />
            </ProtectedRoute>
          </Route>
          <Route path="/dashboard/calendar">
            <ProtectedRoute>
              <CalendarPage />
            </ProtectedRoute>
          </Route>
          <Route path="/dashboard/kanban">
            <ProtectedRoute>
              <KanbanPage />
            </ProtectedRoute>
          </Route>
          <Route path="/dashboard/notes">
            <ProtectedRoute>
              <NotesPage />
            </ProtectedRoute>
          </Route>
          <Route path="/dashboard/deep-work">
            <ProtectedRoute>
              <DeepWorkPage />
            </ProtectedRoute>
          </Route>
          <Route path="/dashboard/goal-map">
            <ProtectedRoute>
              <GoalMapPage />
            </ProtectedRoute>
          </Route>
          <Route path="/dashboard/pages">
            <ProtectedRoute>
              <PagesSpacesPage />
            </ProtectedRoute>
          </Route>
          <Route path="/dashboard/settings">
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          </Route>
          <Route path="/dashboard/daily-schedule">
            <ProtectedRoute>
              <DailySchedulePage />
            </ProtectedRoute>
          </Route>
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function ApiAuthBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    setApiTokenProvider(getToken);
  }, [getToken]);

  return null;
}

function App() {
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
    >
      <ApiAuthBridge />
      <WouterRouter base={basePath}>
        <Router />
      </WouterRouter>
    </ClerkProvider>
  );
}

export default App;
