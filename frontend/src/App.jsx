import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { NavBar } from "./components/NavBar/NavBar";
import { GuestBanner } from "./components/GuestBanner/GuestBanner";
import { WorkoutPage } from "./pages/WorkoutPage";
import { CheckinPage } from "./pages/CheckinPage";
import { CalculatorsPage } from "./pages/CalculatorsPage";
import { StatsPage } from "./pages/StatsPage";
import { useAuth } from "@/contexts/AuthContext";
import { AuthForm } from "@/components/Auth/AuthForm";

const App = () => {
  const { user, loading, authScreen } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <AuthForm initialMode={authScreen ?? "signin"} />;
  }

  return (
    <BrowserRouter>
      <NavBar />
      <GuestBanner />
      <Routes>
        <Route path="/" element={<WorkoutPage />} />
        <Route path="/checkin" element={<CheckinPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/calculators" element={<CalculatorsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
