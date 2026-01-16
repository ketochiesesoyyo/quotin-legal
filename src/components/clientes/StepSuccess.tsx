import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Users, Building, FileText, ArrowRight, Plus } from "lucide-react";
import { ClientFormData, EntityFormData, DocumentData } from "./types";

interface StepSuccessProps {
  clientData: ClientFormData;
  entities: EntityFormData[];
  documents: Record<string, DocumentData[]>;
  clientId: string;
}

export function StepSuccess({ clientData, entities, documents, clientId }: StepSuccessProps) {
  const navigate = useNavigate();

  const totalDocuments = Object.values(documents).reduce(
    (sum, docs) => sum + docs.filter((d) => d.status !== "pendiente").length,
    0
  );

  const validatedDocuments = Object.values(documents).reduce(
    (sum, docs) => sum + docs.filter((d) => d.status === "validado").length,
    0
  );

  const isComplete = totalDocuments > 0 && totalDocuments === validatedDocuments;

  return (
    <div className="space-y-8">
      {/* Success Icon */}
      <div className="flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 animate-in zoom-in duration-300">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">¡Cliente Creado Exitosamente!</h2>
        <p className="text-muted-foreground mt-2">
          {clientData.group_name} ha sido agregado a tu cartera de clientes
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{entities.length}</p>
                <p className="text-sm text-muted-foreground">Razones Sociales</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalDocuments}</p>
                <p className="text-sm text-muted-foreground">Documentos Subidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{validatedDocuments}</p>
                <p className="text-sm text-muted-foreground">Documentos Validados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Card */}
      <Card className={isComplete ? "border-green-500/50" : "border-yellow-500/50"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isComplete ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Expediente Completo
              </>
            ) : (
              <>
                <FileText className="h-5 w-5 text-yellow-500" />
                Expediente Incompleto
              </>
            )}
          </CardTitle>
          <CardDescription>
            {isComplete
              ? "Todos los documentos han sido subidos y validados"
              : "Puedes agregar más documentos desde el expediente del cliente"}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Próximos Pasos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate(`/clientes/${clientId}`)}
            className="p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left"
          >
            <Users className="h-8 w-8 text-primary mb-2" />
            <p className="font-medium">Ver Expediente</p>
            <p className="text-sm text-muted-foreground">
              Accede a todos los detalles del cliente
            </p>
          </button>

          <button
            onClick={() => navigate("/propuestas", { state: { clientId } })}
            className="p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left"
          >
            <FileText className="h-8 w-8 text-primary mb-2" />
            <p className="font-medium">Crear Propuesta</p>
            <p className="text-sm text-muted-foreground">
              Genera una propuesta para este cliente
            </p>
          </button>

          <button
            onClick={() => navigate("/clientes/nuevo")}
            className="p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left"
          >
            <Plus className="h-8 w-8 text-primary mb-2" />
            <p className="font-medium">Nuevo Cliente</p>
            <p className="text-sm text-muted-foreground">
              Agrega otro cliente a tu cartera
            </p>
          </button>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button variant="outline" size="lg" onClick={() => navigate("/clientes")}>
          Ver Todos los Clientes
        </Button>
        <Button size="lg" onClick={() => navigate("/propuestas", { state: { clientId } })}>
          Crear Propuesta Ahora
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
