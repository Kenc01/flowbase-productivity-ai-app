import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useAuth } from "@clerk/react";
import { setTokenGetter } from "@/lib/api";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import LandingPage from "@/pages/landing/index";
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

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#7467F0",
    colorForeground: "#1a1f36",
    colorMutedForeground: "#6b7280",
    colorDanger: "#f43f5e",
    colorBackground: "#ffffff",
    colorInput: "#f8fafc",
    colorInputForeground: "#1a1f36",
    colorNeutral: "#e2e8f0",
    fontFamily: "'Inter', sans-serif",
    borderRadius: "10px",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl shadow-slate-200/60",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-slate-900 font-bold",
    headerSubtitle: "text-slate-500",
    socialButtonsBlockButtonText: "text-slate-700 font-medium",
    formFieldLabel: "text-slate-700 font-medium",
    footerActionLink: "text-violet-600 font-semibold hover:text-violet-700",
    footerActionText: "text-slate-500",
    dividerText: "text-slate-400",
    identityPreviewEditButton: "text-violet-600",
    formFieldSuccessText: "text-emerald-600",
    alertText: "text-slate-700",
    logoBox: "flex justify-center",
    logoImage: "h-10 w-10",
    socialButtonsBlockButton: "border border-slate-200 hover:bg-slate-50 transition-colors",
    formButtonPrimary: "bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-colors",
    formFieldInput: "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:ring-violet-400/20",
    footerAction: "border-t border-slate-100",
    dividerLine: "bg-slate-200",
    alert: "border border-red-100 bg-red-50",
    otpCodeFieldInput: "border-slate-200 focus:border-violet-400",
    formFieldRow: "mb-1",
    main: "px-2",
  },
};

const queryClient = new QueryClient();

function SignInPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, hsl(246 80% 14%) 0%, hsl(246 60% 18%) 50%, hsl(195 80% 12%) 100%)",
        padding: "24px 16px",
        gap: "16px",
      }}
    >
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
      <a
        href={`${basePath}/`}
        style={{
          color: "rgba(255,255,255,0.6)",
          fontSize: "14px",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          transition: "color 0.2s",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
      >
        ← Back to home
      </a>
    </div>
  );
}

function SignUpPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, hsl(246 80% 14%) 0%, hsl(246 60% 18%) 50%, hsl(195 80% 12%) 100%)",
        padding: "24px 16px",
        gap: "16px",
      }}
    >
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
      <a
        href={`${basePath}/`}
        style={{
          color: "rgba(255,255,255,0.6)",
          fontSize: "14px",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          transition: "color 0.2s",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
      >
        ← Back to home
      </a>
    </div>
  );
}

function HomeRoute() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function DashboardRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">
        <DashboardLayout>{children}</DashboardLayout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

// Injects Clerk session token into every api.ts request
function ApiTokenProvider() {
  const { getToken } = useAuth();
  useEffect(() => {
    setTokenGetter(() => getToken());
  }, [getToken]);
  return null;
}

function Router() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to your Grind OS workspace",
          },
        },
        signUp: {
          start: {
            title: "Create your workspace",
            subtitle: "Get started with Grind OS today",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ApiTokenProvider />
          <ClerkQueryClientCacheInvalidator />
          <Switch>
            <Route path="/" component={HomeRoute} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
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
    </ClerkProvider>
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
