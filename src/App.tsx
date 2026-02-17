import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProjectProvider, useProject } from "@/contexts/ProjectContext";
import Layout from "@/components/Layout";
import ProjectSelector from "./pages/ProjectSelector";
import Dashboard from "./pages/Dashboard";
import BOM from "./pages/BOM";
import Materials from "./pages/Materials";
import Tasks from "./pages/Tasks";
import PartRequests from "./pages/PartRequests";
import PickingOrders from "./pages/PickingOrders";
import Issues from "./pages/Issues";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { selectedProject, selectedVersion } = useProject();
  if (!selectedProject || !selectedVersion) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<ProjectSelector />} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/bom" element={<ProtectedRoute><BOM /></ProtectedRoute>} />
    <Route path="/materials" element={<ProtectedRoute><Materials /></ProtectedRoute>} />
    <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
    <Route path="/part-requests" element={<ProtectedRoute><PartRequests /></ProtectedRoute>} />
    <Route path="/picking-orders" element={<ProtectedRoute><PickingOrders /></ProtectedRoute>} />
    <Route path="/issues" element={<ProtectedRoute><Issues /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ProjectProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ProjectProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
