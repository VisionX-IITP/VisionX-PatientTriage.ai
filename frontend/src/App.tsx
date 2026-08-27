import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AppShell from "./components/layout/AppShell";
import Login from "./pages/Login";
import CommandCenter from "./pages/CommandCenter";
import Queue from "./pages/Queue";
import AddPatient from "./pages/AddPatient";
import PatientDetail from "./pages/PatientDetail";
import Alerts from "./pages/Alerts";
import Analytics from "./pages/Analytics";
import Audit from "./pages/Audit";
import Simulation from "./pages/Simulation";
import Settings from "./pages/Settings";
import SystemHealth from "./pages/SystemHealth";

function Protected({ children }: any) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><CommandCenter /></Protected>} />
      <Route path="/queue" element={<Protected><Queue /></Protected>} />
      <Route path="/add" element={<Protected><AddPatient /></Protected>} />
      <Route path="/patient/:id" element={<Protected><PatientDetail /></Protected>} />
      <Route path="/alerts" element={<Protected><Alerts /></Protected>} />
      <Route path="/analytics" element={<Protected><Analytics /></Protected>} />
      <Route path="/audit" element={<Protected><Audit /></Protected>} />
      <Route path="/simulation" element={<Protected><Simulation /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="/health" element={<Protected><SystemHealth /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
