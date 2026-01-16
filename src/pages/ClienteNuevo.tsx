import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ClienteWizard } from "@/components/clientes/ClienteWizard";
import { ArrowLeft } from "lucide-react";

export default function ClienteNuevo() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/clientes")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nuevo Cliente</h1>
          <p className="text-muted-foreground">
            Completa el formulario para agregar un nuevo cliente
          </p>
        </div>
      </div>

      {/* Wizard */}
      <ClienteWizard />
    </div>
  );
}
