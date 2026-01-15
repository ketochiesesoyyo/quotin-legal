import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Clock, CheckCircle, XCircle, Brain, Loader2, AlertCircle, Target, AlertTriangle, Lightbulb, HelpCircle } from "lucide-react";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Case = Tables<"cases">;
type Client = Tables<"clients">;
type CaseStatus = Enums<"case_status">;

interface AIAnalysis {
  objective: string;
  risks: string[];
  suggestedServices: string[];
  missingInfo: string[];
  summary: string;
  nextStatus: string;
}

const STATUS_CONFIG: Record<CaseStatus, { label: string; color: string }> = {
  nuevo: { label: "Nuevo", color: "bg-blue-100 text-blue-800" },
  docs_solicitados: { label: "Docs Solicitados", color: "bg-yellow-100 text-yellow-800" },
  docs_recibidos: { label: "Docs Recibidos", color: "bg-orange-100 text-orange-800" },
  en_analisis: { label: "En Análisis", color: "bg-purple-100 text-purple-800" },
  borrador: { label: "Borrador", color: "bg-indigo-100 text-indigo-800" },
  revision: { label: "Revisión", color: "bg-pink-100 text-pink-800" },
  enviada: { label: "Enviada", color: "bg-cyan-100 text-cyan-800" },
  negociacion: { label: "Negociación", color: "bg-amber-100 text-amber-800" },
  ganada: { label: "Ganada", color: "bg-green-100 text-green-800" },
  perdida: { label: "Perdida", color: "bg-red-100 text-red-800" },
};

const NEED_TYPES = [
  "Consultoría fiscal",
  "Litigio",
  "Derecho corporativo",
  "Propiedad intelectual",
  "Derecho laboral",
  "Fusiones y adquisiciones",
  "Cumplimiento regulatorio",
  "Otro",
];

export default function Propuestas() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<(Case & { ai_analysis?: AIAnalysis }) | null>(null);
  const [formData, setFormData] = useState({
    client_id: "",
    need_type: "",
    notes: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cases, isLoading } = useQuery({
    queryKey: ["cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as (Case & { ai_analysis?: AIAnalysis; ai_status?: string })[];
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*");
      if (error) throw error;
      return data as Client[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const client = clients?.find(c => c.id === data.client_id);
      const title = `${client?.group_name || 'Cliente'} - ${data.need_type || 'Nueva propuesta'}`;
      
      const { data: result, error } = await supabase
        .from("cases")
        .insert({
          title,
          client_id: data.client_id,
          need_type: data.need_type || null,
          notes: data.notes || null,
          status: "nuevo" as CaseStatus,
          ai_status: "pending",
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: async (newCase) => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      toast({ 
        title: "Propuesta creada", 
        description: "La IA está analizando las notas..." 
      });
      setIsOpen(false);
      setFormData({ client_id: "", need_type: "", notes: "" });
      
      // Trigger AI analysis
      analyzeProposal(newCase.id);
    },
    onError: (error) => {
      toast({ title: "Error al crear propuesta", description: error.message, variant: "destructive" });
    },
  });

  const analyzeProposal = async (caseId: string) => {
    try {
      const response = await supabase.functions.invoke("analyze-proposal", {
        body: { caseId },
      });
      
      if (response.error) {
        console.error("Analysis error:", response.error);
        toast({ 
          title: "Error en análisis", 
          description: response.error.message || "No se pudo analizar la propuesta",
          variant: "destructive" 
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["cases"] });
        toast({ 
          title: "Análisis completado", 
          description: "La IA ha procesado las notas y actualizado la propuesta" 
        });
      }
    } catch (error) {
      console.error("Error calling analyze function:", error);
      toast({ 
        title: "Error de conexión", 
        description: "No se pudo conectar con el servicio de IA",
        variant: "destructive" 
      });
    }
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CaseStatus }) => {
      const { error } = await supabase.from("cases").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      toast({ title: "Estado actualizado" });
    },
    onError: (error) => {
      toast({ title: "Error al actualizar estado", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.notes.trim()) {
      toast({ 
        title: "Notas requeridas", 
        description: "Por favor ingresa las notas de la conversación",
        variant: "destructive" 
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const getClientName = (clientId: string) => {
    return clients?.find((c) => c.id === clientId)?.group_name || "Sin cliente";
  };

  const getCasesByStatus = (status: CaseStatus) => {
    return cases?.filter((c) => c.status === status) || [];
  };

  const activeStatuses: CaseStatus[] = ["nuevo", "docs_solicitados", "docs_recibidos", "en_analisis", "borrador", "revision", "enviada", "negociacion"];

  const getAIStatusIcon = (aiStatus?: string) => {
    switch (aiStatus) {
      case "analyzing":
        return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />;
      case "completed":
        return <Brain className="h-3 w-3 text-green-500" />;
      case "error":
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Propuestas</h1>
          <p className="text-muted-foreground">Pipeline de casos y propuestas con análisis inteligente</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Propuesta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Nueva Propuesta con Análisis IA
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_id">Cliente *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.group_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="need_type">Tipo de Necesidad *</Label>
                  <Select
                    value={formData.need_type}
                    onValueChange={(value) => setFormData({ ...formData, need_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {NEED_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes" className="flex items-center gap-2">
                  Notas de la Conversación *
                  <span className="text-xs text-muted-foreground font-normal">
                    (La IA analizará estas notas automáticamente)
                  </span>
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={8}
                  placeholder="Pega aquí las notas completas de la conversación con el cliente. La IA extraerá: objetivo del cliente, riesgos, servicios sugeridos e información faltante..."
                  className="resize-none"
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  ¿Qué hará la IA?
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <Target className="h-3 w-3 text-green-500" /> Extraer el objetivo del cliente
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 text-amber-500" /> Identificar riesgos mencionados
                  </li>
                  <li className="flex items-center gap-2">
                    <Lightbulb className="h-3 w-3 text-blue-500" /> Sugerir servicios del catálogo
                  </li>
                  <li className="flex items-center gap-2">
                    <HelpCircle className="h-3 w-3 text-purple-500" /> Detectar información faltante
                  </li>
                </ul>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || !formData.client_id || !formData.need_type || !formData.notes.trim()}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      Crear y Analizar
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cases?.filter((c) => !["ganada", "perdida"].includes(c.status)).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En Negociación</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getCasesByStatus("negociacion").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ganadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getCasesByStatus("ganada").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Perdidas</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getCasesByStatus("perdida").length}</div>
          </CardContent>
        </Card>
      </div>

      {/* AI Analysis Detail Modal */}
      <Dialog open={!!selectedCase} onOpenChange={(open) => !open && setSelectedCase(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCase?.title}</DialogTitle>
          </DialogHeader>
          {selectedCase?.ai_analysis ? (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-green-500" />
                  Objetivo del Cliente
                </h4>
                <p className="text-sm">{selectedCase.ai_analysis.objective}</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Resumen
                </h4>
                <p className="text-sm">{selectedCase.ai_analysis.summary}</p>
              </div>

              {selectedCase.ai_analysis.risks.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Riesgos Identificados
                  </h4>
                  <ul className="text-sm space-y-1">
                    {selectedCase.ai_analysis.risks.map((risk, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-500">•</span> {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedCase.ai_analysis.suggestedServices.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-blue-500" />
                    Servicios Sugeridos
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCase.ai_analysis.suggestedServices.map((service, i) => (
                      <Badge key={i} variant="secondary">{service}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedCase.ai_analysis.missingInfo.length > 0 && (
                <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <HelpCircle className="h-4 w-4 text-purple-500" />
                    Información Faltante
                  </h4>
                  <ul className="text-sm space-y-1">
                    {selectedCase.ai_analysis.missingInfo.map((info, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-purple-500">•</span> {info}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2">
                <p className="text-xs text-muted-foreground">
                  Nota: La IA solo sugiere, las decisiones finales son del equipo legal.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay análisis de IA disponible para esta propuesta.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  if (selectedCase) {
                    analyzeProposal(selectedCase.id);
                    setSelectedCase(null);
                  }
                }}
              >
                <Brain className="mr-2 h-4 w-4" />
                Ejecutar Análisis
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-4 overflow-x-auto">
          {activeStatuses.map((status) => (
            <Card key={status} className="min-w-[280px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  {STATUS_CONFIG[status].label}
                  <Badge variant="secondary" className="ml-2">
                    {getCasesByStatus(status).length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {getCasesByStatus(status).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin propuestas</p>
                ) : (
                  getCasesByStatus(status).map((caseItem) => (
                    <Card 
                      key={caseItem.id} 
                      className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedCase(caseItem as Case & { ai_analysis?: AIAnalysis })}
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-sm flex-1">{caseItem.title}</h4>
                        {getAIStatusIcon((caseItem as any).ai_status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getClientName(caseItem.client_id)}
                      </p>
                      {caseItem.need_type && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          {caseItem.need_type}
                        </Badge>
                      )}
                      {(caseItem as any).ai_analysis && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                          <Brain className="h-3 w-3" />
                          <span>Análisis disponible</span>
                        </div>
                      )}
                      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={caseItem.status}
                          onValueChange={(value) =>
                            updateStatusMutation.mutate({ id: caseItem.id, status: value as CaseStatus })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                {config.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
