import { lazy, Suspense, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { MotionConfig } from "motion/react";
import { Toaster, toast } from "sonner";
import { NavBar } from "./components/NavBar/NavBar";
import { WorkoutTimerBar } from "./components/WorkoutTimerBar/WorkoutTimerBar";
import { ReloadPrompt } from "./components/ReloadPrompt/ReloadPrompt";
import { GuestBanner } from "./components/GuestBanner/GuestBanner";
import { StorageWarningBanner } from "./components/StorageWarningBanner/StorageWarningBanner";
import { GuestMigrationPrompt } from "./components/GuestMigrationPrompt/GuestMigrationPrompt";
import { useAuth } from "@/contexts/AuthContext";
import { WorkoutTimerProvider } from "@/contexts/WorkoutTimerContext";
import { AuthForm } from "@/components/Auth/AuthForm";

// Route-level code splitting: each page loads on first visit instead of
// riding in the main chunk.
const WorkoutPage = lazy(() =>
  import("./pages/WorkoutPage").then((m) => ({ default: m.WorkoutPage })),
);
const CheckinPage = lazy(() =>
  import("./pages/CheckinPage").then((m) => ({ default: m.CheckinPage })),
);
const CalculatorsPage = lazy(() =>
  import("./pages/CalculatorsPage").then((m) => ({
    default: m.CalculatorsPage,
  })),
);
const StatsPage = lazy(() =>
  import("./pages/StatsPage").then((m) => ({ default: m.StatsPage })),
);

const AppLayout = () => (
  <>
    {/* One sticky container: the timer bar stacks under the nav instead of
        fighting it for top-0 (nav height varies when links wrap). */}
    <div className="sticky top-0 z-10">
      <NavBar />
      <WorkoutTimerBar />
    </div>
    <GuestBanner />
    <StorageWarningBanner />
    <GuestMigrationPrompt />
    <Suspense fallback={null}>
      <Outlet />
    </Suspense>
  </>
);

// Also bounces freshly signed-in users home: the session update re-renders
// this route into the redirect.
const AuthPage = () => {
  const { session } = useAuth();
  if (session) return <Navigate to="/" replace />;
  return <AuthForm />;
};

const App = () => {
  const { loading } = useAuth();

  // services/sync.js announces a permanently dropped op this way so the
  // service layer stays UI-free.
  useEffect(() => {
    const onDropped = () =>
      toast.error("A change couldn't be synced and was discarded.");
    window.addEventListener("sync:op-dropped", onDropped);
    return () => window.removeEventListener("sync:op-dropped", onDropped);
  }, []);

  if (loading) {
    return null;
  }

  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <WorkoutTimerProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<WorkoutPage />} />
              <Route path="/checkin" element={<CheckinPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/calculators" element={<CalculatorsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </WorkoutTimerProvider>
        <ReloadPrompt />
        <Toaster
          position="bottom-center"
          mobileOffset={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        />
      </BrowserRouter>
    </MotionConfig>
  );
};

export default App;
