import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProjectProvider, useProject } from "@/contexts/ProjectContext";
import Layout from "@/components/Layout";
import Login from "./pages/Login";
import ProjectSelector from "./pages/ProjectSelector";
import Dashboard from "./pages/Dashboard";
import BOM from "./pages/BOM";
import Materials from "./pages/Materials";
import Tasks from "./pages/Tasks";
import PartRequests from "./pages/PartRequests";
import PickingOrders from "./pages/PickingOrders";
import Issues from "./pages/Issues";
import GateReadiness from "./pages/GateReadiness";
import ShortageAlerts from "./pages/ShortageAlerts";
import ECNTracker from "./pages/ECNTracker";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 300_000 } },
});

const AuthLoading = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PublicOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { selectedProject, selectedVersion } = useProject();
  if (!selectedProject || !selectedVersion) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
};

/** Root route: if a project is already selected (e.g. auto-selected), redirect to dashboard */
const RootRoute = () => {
  const { selectedProject, selectedVersion, autoSelecting } = useProject();
  if (autoSelecting) return <AuthLoading />;
  if (selectedProject && selectedVersion) return <Navigate to="/dashboard" replace />;
  return <ProjectSelector />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
    <Route path="/" element={<RequireAuth><RootRoute /></RequireAuth>} />
    <Route path="/dashboard" element={<RequireAuth><ProtectedRoute><Dashboard /></ProtectedRoute></RequireAuth>} />
    <Route path="/bom" element={<RequireAuth><ProtectedRoute><BOM /></ProtectedRoute></RequireAuth>} />
    <Route path="/materials" element={<RequireAuth><ProtectedRoute><Materials /></ProtectedRoute></RequireAuth>} />
    <Route path="/tasks" element={<RequireAuth><ProtectedRoute><Tasks /></ProtectedRoute></RequireAuth>} />
    <Route path="/part-requests" element={<RequireAuth><ProtectedRoute><PartRequests /></ProtectedRoute></RequireAuth>} />
    <Route path="/picking-orders" element={<RequireAuth><ProtectedRoute><PickingOrders /></ProtectedRoute></RequireAuth>} />
    <Route path="/issues" element={<RequireAuth><ProtectedRoute><Issues /></ProtectedRoute></RequireAuth>} />
    <Route path="/gate-readiness" element={<RequireAuth><ProtectedRoute><GateReadiness /></ProtectedRoute></RequireAuth>} />
    <Route path="/shortages" element={<RequireAuth><ProtectedRoute><ShortageAlerts /></ProtectedRoute></RequireAuth>} />
    <Route path="/ecns" element={<RequireAuth><ProtectedRoute><ECNTracker /></ProtectedRoute></RequireAuth>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <ProjectProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ProjectProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
