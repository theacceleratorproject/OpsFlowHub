import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProjectProvider, useProject } from "@/contexts/ProjectContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const ProjectSelector = lazy(() => import("./pages/ProjectSelector"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const BOM = lazy(() => import("./pages/BOM"));
const Materials = lazy(() => import("./pages/Materials"));
const Tasks = lazy(() => import("./pages/Tasks"));
const PartRequests = lazy(() => import("./pages/PartRequests"));
const PickingOrders = lazy(() => import("./pages/PickingOrders"));
const Issues = lazy(() => import("./pages/Issues"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  const { selectedProject, selectedVersion } = useProject();

  if (loading) {
    return <PageLoader />;
  }

  if (!session) return <Navigate to="/login" replace />;
  if (!selectedProject || !selectedVersion) return <Navigate to="/" replace />;

  return <Layout>{children}</Layout>;
};

const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AppRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<AuthGate><ProjectSelector /></AuthGate>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/bom" element={<ProtectedRoute><BOM /></ProtectedRoute>} />
      <Route path="/materials" element={<ProtectedRoute><Materials /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
      <Route path="/part-requests" element={<ProtectedRoute><PartRequests /></ProtectedRoute>} />
      <Route path="/picking-orders" element={<ProtectedRoute><PickingOrders /></ProtectedRoute>} />
      <Route path="/issues" element={<ProtectedRoute><Issues /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
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
