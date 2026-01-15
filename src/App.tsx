import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
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
          <Route path="/clientes" element={<ProtectedRoute><div className="text-2xl">Clientes - Próximamente</div></ProtectedRoute>} />
          <Route path="/propuestas" element={<ProtectedRoute><div className="text-2xl">Propuestas - Próximamente</div></ProtectedRoute>} />
          <Route path="/documentos" element={<ProtectedRoute><div className="text-2xl">Documentos - Próximamente</div></ProtectedRoute>} />
          <Route path="/servicios" element={<ProtectedRoute><div className="text-2xl">Servicios - Próximamente</div></ProtectedRoute>} />
          <Route path="/honorarios" element={<ProtectedRoute><div className="text-2xl">Honorarios - Próximamente</div></ProtectedRoute>} />
          <Route path="/plantillas" element={<ProtectedRoute><div className="text-2xl">Plantillas - Próximamente</div></ProtectedRoute>} />
          <Route path="/usuarios" element={<ProtectedRoute><div className="text-2xl">Usuarios - Próximamente</div></ProtectedRoute>} />
          <Route path="/configuracion" element={<ProtectedRoute><div className="text-2xl">Configuración - Próximamente</div></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
