import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";

import Clientes from "./pages/Clientes";
import ClienteNuevo from "./pages/ClienteNuevo";
import ClienteDetalle from "./pages/ClienteDetalle";
import ClienteEditar from "./pages/ClienteEditar";
import Propuestas from "./pages/Propuestas";
import PropuestaEditar from "./pages/PropuestaEditar";
import PropuestaRevision from "./pages/PropuestaRevision";
import Documentos from "./pages/Documentos";
import Servicios from "./pages/Servicios";
import Honorarios from "./pages/Honorarios";
import Plantillas from "./pages/Plantillas";
import PlantillaNueva from "./pages/PlantillaNueva";
import PlantillaEditar from "./pages/PlantillaEditar";
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

function ProtectedRouteNoLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Navigate to="/propuestas" replace />} />
          <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
          <Route path="/clientes/nuevo" element={<ProtectedRoute><ClienteNuevo /></ProtectedRoute>} />
          <Route path="/clientes/:id" element={<ProtectedRoute><ClienteDetalle /></ProtectedRoute>} />
          <Route path="/clientes/:id/editar" element={<ProtectedRoute><ClienteEditar /></ProtectedRoute>} />
          <Route path="/propuestas" element={<ProtectedRoute><Propuestas /></ProtectedRoute>} />
          <Route path="/propuestas/:id/editar" element={<ProtectedRouteNoLayout><PropuestaEditar /></ProtectedRouteNoLayout>} />
          <Route path="/propuestas/:id/revision" element={<ProtectedRouteNoLayout><PropuestaRevision /></ProtectedRouteNoLayout>} />
          <Route path="/documentos" element={<ProtectedRoute><Documentos /></ProtectedRoute>} />
          <Route path="/servicios" element={<ProtectedRoute><Servicios /></ProtectedRoute>} />
          <Route path="/honorarios" element={<ProtectedRoute><Honorarios /></ProtectedRoute>} />
          <Route path="/plantillas" element={<ProtectedRoute><Plantillas /></ProtectedRoute>} />
          <Route path="/plantillas/nueva" element={<ProtectedRouteNoLayout><PlantillaNueva /></ProtectedRouteNoLayout>} />
          <Route path="/plantillas/:id/editar" element={<ProtectedRouteNoLayout><PlantillaEditar /></ProtectedRouteNoLayout>} />
          <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
          <Route path="/configuracion" element={<ProtectedRoute><Configuracion /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
