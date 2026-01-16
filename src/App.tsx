import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import ClienteNuevo from "./pages/ClienteNuevo";
import Propuestas from "./pages/Propuestas";
import Documentos from "./pages/Documentos";
import Servicios from "./pages/Servicios";
import Honorarios from "./pages/Honorarios";
import Plantillas from "./pages/Plantillas";
import Usuarios from "./pages/Usuarios";
import Configuracion from "./pages/Configuracion";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
          <Route path="/clientes/nuevo" element={<ProtectedRoute><ClienteNuevo /></ProtectedRoute>} />
          <Route path="/propuestas" element={<ProtectedRoute><Propuestas /></ProtectedRoute>} />
          <Route path="/documentos" element={<ProtectedRoute><Documentos /></ProtectedRoute>} />
          <Route path="/servicios" element={<ProtectedRoute><Servicios /></ProtectedRoute>} />
          <Route path="/honorarios" element={<ProtectedRoute><Honorarios /></ProtectedRoute>} />
          <Route path="/plantillas" element={<ProtectedRoute><Plantillas /></ProtectedRoute>} />
          <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
          <Route path="/configuracion" element={<ProtectedRoute><Configuracion /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
