import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Send, Download, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PropuestaRevision = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: caseData, isLoading } = useQuery({
    queryKey: ["case-revision", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cases")
        .select(`
          *,
          clients (group_name, alias)
        `)
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Cargando revisión...</p>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Propuesta no encontrada</p>
          <Button onClick={() => navigate("/propuestas")}>
            Volver a propuestas
          </Button>
        </div>
      </div>
    );
  }

  const clientName = caseData.clients?.alias || caseData.clients?.group_name || "Cliente";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate(`/propuestas/${id}/editar`)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">{caseData.title}</h1>
                <p className="text-sm text-muted-foreground">{clientName}</p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Borrador guardado
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Revisión de Propuesta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Tu propuesta ha sido guardada como borrador. Desde aquí puedes:
              </p>
              
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-dashed">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="p-3 rounded-full bg-primary/10">
                        <Download className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-medium">Descargar PDF</h3>
                      <p className="text-sm text-muted-foreground">
                        Genera un documento PDF para revisión interna
                      </p>
                      <Button variant="outline" className="mt-2" disabled>
                        Próximamente
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="p-3 rounded-full bg-primary/10">
                        <Send className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-medium">Enviar al Cliente</h3>
                      <p className="text-sm text-muted-foreground">
                        Envía la propuesta por correo electrónico
                      </p>
                      <Button variant="outline" className="mt-2" disabled>
                        Próximamente
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button 
              variant="outline"
              onClick={() => navigate(`/propuestas/${id}/editar`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a editar
            </Button>
            <Button onClick={() => navigate("/propuestas")}>
              Ir a propuestas
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropuestaRevision;
