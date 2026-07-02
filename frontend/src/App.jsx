import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { NavBar } from "./components/NavBar/NavBar";
import { GuestBanner } from "./components/GuestBanner/GuestBanner";
import { WorkoutPage } from "./pages/WorkoutPage";
import { CheckinPage } from "./pages/CheckinPage";
import { CalculatorsPage } from "./pages/CalculatorsPage";
import { StatsPage } from "./pages/StatsPage";
import { useAuth } from "@/contexts/AuthContext";
import { AuthForm } from "@/components/Auth/AuthForm";

const AppLayout = () => (
  <>
    <NavBar />
    <GuestBanner />
    <Outlet />
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

  if (loading) {
    return null;
  }

  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
};

export default App;
