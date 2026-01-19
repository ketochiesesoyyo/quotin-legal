import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { 
  Plus, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Brain, 
  Loader2, 
  AlertCircle, 
  Target, 
  AlertTriangle, 
  Lightbulb, 
  HelpCircle,
  MoreHorizontal,
  Eye,
  Pencil,
  ArrowRightLeft,
  Archive,
  Send,
  FileEdit
} from "lucide-react";
import type { Tables, Enums } from "@/integrations/supabase/types";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { TableSearch } from "@/components/ui/table-search";

type Case = Tables<"cases">;
type Client = Tables<"clients">;
type Profile = Tables<"profiles">;
type CaseService = Tables<"case_services">;
type CaseStatus = Enums<"case_status">;

interface AIAnalysis {
  objective: string;
  risks: string[];
  suggestedServices: string[];
  missingInfo: string[];
  summary: string;
  nextStatus: string;
}

// Simplified status for the new design
type ProposalStatus = "draft" | "enviada" | "aceptada" | "rechazada";

const PROPOSAL_STATUS_CONFIG: Record<ProposalStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: "Borrador", color: "bg-muted text-muted-foreground", icon: <FileEdit className="h-4 w-4" /> },
  enviada: { label: "Enviada", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: <Send className="h-4 w-4" /> },
  aceptada: { label: "Aceptada", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: <CheckCircle className="h-4 w-4" /> },
  rechazada: { label: "Rechazada", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: <XCircle className="h-4 w-4" /> },
};

// Map case_status to our simplified proposal status
const mapCaseStatusToProposalStatus = (status: CaseStatus): ProposalStatus => {
  switch (status) {
    case "ganada":
      return "aceptada";
    case "perdida":
      return "rechazada";
    case "enviada":
    case "negociacion":
      return "enviada";
    default:
      return "draft";
  }
};

// Map proposal status back to case_status for updates
const mapProposalStatusToCaseStatus = (status: ProposalStatus): CaseStatus => {
  switch (status) {
    case "aceptada":
      return "ganada";
    case "rechazada":
      return "perdida";
    case "enviada":
      return "enviada";
    default:
      return "borrador";
  }
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
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<(Case & { ai_analysis?: AIAnalysis }) | null>(null);
  const [viewProposalCase, setViewProposalCase] = useState<Case | null>(null);
  const [statusChangeCase, setStatusChangeCase] = useState<Case | null>(null);
  const [formData, setFormData] = useState({
    client_id: "",
    need_type: "",
    notes: "",
    selected_template_id: "",  // Template selection for Template-First architecture
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch cases with related data (excluding archived)
  const { data: cases, isLoading } = useQuery({
    queryKey: ["cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .neq("status", "archivada")
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

  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: caseServices } = useQuery({
    queryKey: ["case_services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("case_services").select("*");
      if (error) throw error;
      return data as CaseService[];
    },
  });

  // Fetch active templates for selector
  const { data: activeTemplates } = useQuery({
    queryKey: ["active-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select("id, name, description")
        .eq("status", "active")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const client = clients?.find(c => c.id === data.client_id);
      const title = `${client?.group_name || 'Cliente'} - ${data.need_type || 'Nueva propuesta'}`;
      
      // Use edge function for server-side template snapshot creation
      const { data: result, error } = await supabase.functions.invoke('create-case', {
        body: {
          title,
          client_id: data.client_id,
          need_type: data.need_type || null,
          notes: data.notes || null,
          selected_template_id: data.selected_template_id || null,
        }
      });
      
      if (error) throw error;
      return result;
    },
    onSuccess: async (newCase) => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      setIsOpen(false);
      setFormData({ client_id: "", need_type: "", notes: "", selected_template_id: "" });
      
      // Navigate to editor immediately - analysis will run in background
      const hasTemplate = !!newCase.selected_template_id;
      toast({ 
        title: "Propuesta creada", 
        description: hasTemplate 
          ? "Plantilla asignada. Analizando con IA... Redirigiendo al editor." 
          : "Analizando con IA... Redirigiendo al editor."
      });
      
      // Start AI analysis in background
      analyzeProposalInBackground(newCase.id);
      
      // Navigate to editor
      navigate(`/propuestas/${newCase.id}/editar`);
    },
    onError: (error) => {
      toast({ title: "Error al crear propuesta", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const analyzeProposalInBackground = async (caseId: string) => {
    try {
      const response = await supabase.functions.invoke("analyze-proposal", {
        body: { caseId },
      });
      
      if (response.error) {
        console.error("Analysis error:", response.error);
        toast({ 
          title: "Error en análisis IA", 
          description: response.error.message || "No se pudo analizar la propuesta",
          variant: "destructive" 
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["case", caseId] });
        toast({ 
          title: "Análisis IA completado", 
          description: "La propuesta ha sido actualizada con las sugerencias de la IA" 
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
      setStatusChangeCase(null);
    },
    onError: (error) => {
      toast({ title: "Error al actualizar estado", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const archiveProposalMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cases").update({ status: "archivada" as CaseStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      toast({ title: "Propuesta archivada", description: "La propuesta ha sido archivada correctamente" });
    },
    onError: (error) => {
      toast({ title: "Error al archivar", description: getErrorMessage(error), variant: "destructive" });
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

  const getAssignedUserName = (userId: string | null) => {
    if (!userId) return "Sin asignar";
    const profile = profiles?.find((p) => p.user_id === userId);
    return profile?.full_name || "Usuario";
  };

  const getServicesCount = (caseId: string) => {
    return caseServices?.filter((cs) => cs.case_id === caseId).length || 0;
  };

  const calculateTotalCost = (caseItem: Case) => {
    const initialPayment = caseItem.custom_initial_payment || 0;
    const monthlyRetainer = caseItem.custom_monthly_retainer || 0;
    const retainerMonths = caseItem.custom_retainer_months || 0;
    const total = Number(initialPayment) + (Number(monthlyRetainer) * Number(retainerMonths));
    return total;
  };

  const formatCurrency = (amount: number) => {
    if (amount === 0) return "Por definir";
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Prepare data for sorting with computed fields
  const casesWithComputedFields = useMemo(() => {
    return cases?.map((caseItem) => ({
      ...caseItem,
      clientName: getClientName(caseItem.client_id),
      assignedName: getAssignedUserName(caseItem.assigned_to),
      servicesCount: getServicesCount(caseItem.id),
      totalCost: calculateTotalCost(caseItem),
    }));
  }, [cases, clients, profiles, caseServices]);

  const { sortConfig, handleSort, searchQuery, setSearchQuery, filteredData } = useTableSort(
    casesWithComputedFields,
    { key: "created_at", direction: "desc" }
  );

  // KPI calculations
  const getProposalsByStatus = (status: ProposalStatus) => {
    return cases?.filter((c) => mapCaseStatusToProposalStatus(c.status) === status) || [];
  };

  const kpiData = {
    aceptadas: getProposalsByStatus("aceptada").length,
    enviadas: getProposalsByStatus("enviada").length,
    rechazadas: getProposalsByStatus("rechazada").length,
    drafts: getProposalsByStatus("draft").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Propuestas</h1>
          <p className="text-muted-foreground">Gestión de propuestas comerciales</p>
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

              {/* Template Selector - Template-First Architecture */}
              <div className="space-y-2">
                <Label htmlFor="selected_template_id">Plantilla de Documento (Opcional)</Label>
                <Select
                  value={formData.selected_template_id}
                  onValueChange={(value) => setFormData({ ...formData, selected_template_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin plantilla (modo libre)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin plantilla (modo libre)</SelectItem>
                    {activeTemplates?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Si seleccionas una plantilla, la IA generará contenido siguiendo su estructura exacta.
                </p>
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

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aceptadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{kpiData.aceptadas}</div>
            <p className="text-xs text-muted-foreground">Propuestas ganadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Enviadas</CardTitle>
            <Send className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{kpiData.enviadas}</div>
            <p className="text-xs text-muted-foreground">En espera de respuesta</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rechazadas</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{kpiData.rechazadas}</div>
            <p className="text-xs text-muted-foreground">Propuestas perdidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Borradores</CardTitle>
            <FileEdit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.drafts}</div>
            <p className="text-xs text-muted-foreground">En proceso de elaboración</p>
          </CardContent>
        </Card>
      </div>

      {/* Proposals Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Todas las Propuestas</CardTitle>
          <TableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar propuesta..."
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredData && filteredData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    sortKey="title"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  >
                    Propuesta
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="clientName"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  >
                    Cliente
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="need_type"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  >
                    Tipo de Necesidad
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="servicesCount"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                    className="text-center"
                  >
                    Servicios
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="totalCost"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                    className="text-right"
                  >
                    Costo Total
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="status"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  >
                    Estatus
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="assignedName"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  >
                    Responsable
                  </SortableTableHead>
                  <th className="w-[50px]"></th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((caseItem) => {
                  const proposalStatus = mapCaseStatusToProposalStatus(caseItem.status);
                  const statusConfig = PROPOSAL_STATUS_CONFIG[proposalStatus];
                  const isDraft = proposalStatus === "draft";
                  
                  return (
                    <TableRow key={caseItem.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {caseItem.title}
                        </div>
                      </TableCell>
                      <TableCell>{caseItem.clientName}</TableCell>
                      <TableCell>
                        {caseItem.need_type ? (
                          <Badge variant="outline">{caseItem.need_type}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Sin definir</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{caseItem.servicesCount}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(caseItem.totalCost)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig.color}>
                          <span className="flex items-center gap-1">
                            {statusConfig.icon}
                            {statusConfig.label}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{caseItem.assignedName}</span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isDraft && (
                              <DropdownMenuItem onClick={() => {
                                window.location.href = `/propuestas/${caseItem.id}/editar`;
                              }}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar Propuesta
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setStatusChangeCase(caseItem)}>
                              <ArrowRightLeft className="mr-2 h-4 w-4" />
                              Cambiar Estatus
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setViewProposalCase(caseItem)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Propuesta
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => archiveProposalMutation.mutate(caseItem.id)}
                              disabled={archiveProposalMutation.isPending}
                              className="text-muted-foreground"
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Archivar Propuesta
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay propuestas</h3>
              <p className="text-muted-foreground mb-4">Crea tu primera propuesta para comenzar</p>
              <Button onClick={() => setIsOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Propuesta
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Proposal Modal */}
      <Dialog open={!!viewProposalCase} onOpenChange={(open) => !open && setViewProposalCase(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {viewProposalCase?.title}
            </DialogTitle>
          </DialogHeader>
          {viewProposalCase && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Cliente</Label>
                  <p className="font-medium">{getClientName(viewProposalCase.client_id)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Tipo de Necesidad</Label>
                  <p className="font-medium">{viewProposalCase.need_type || "Sin definir"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Estatus</Label>
                  <Badge className={PROPOSAL_STATUS_CONFIG[mapCaseStatusToProposalStatus(viewProposalCase.status)].color}>
                    {PROPOSAL_STATUS_CONFIG[mapCaseStatusToProposalStatus(viewProposalCase.status)].label}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Costo Total</Label>
                  <p className="font-medium">{formatCurrency(calculateTotalCost(viewProposalCase))}</p>
                </div>
              </div>

              {/* Notes */}
              {viewProposalCase.notes && (
                <div>
                  <Label className="text-muted-foreground text-xs">Notas de la Conversación</Label>
                  <div className="mt-2 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{viewProposalCase.notes}</p>
                  </div>
                </div>
              )}

              {/* AI Analysis */}
              {(viewProposalCase as Case & { ai_analysis?: AIAnalysis }).ai_analysis && (
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    Análisis de IA
                  </h4>
                  
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h5 className="font-medium flex items-center gap-2 mb-2 text-sm">
                      <Target className="h-4 w-4 text-green-500" />
                      Objetivo del Cliente
                    </h5>
                    <p className="text-sm">{(viewProposalCase as Case & { ai_analysis: AIAnalysis }).ai_analysis.objective}</p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4">
                    <h5 className="font-medium flex items-center gap-2 mb-2 text-sm">
                      <FileText className="h-4 w-4 text-blue-500" />
                      Resumen
                    </h5>
                    <p className="text-sm">{(viewProposalCase as Case & { ai_analysis: AIAnalysis }).ai_analysis.summary}</p>
                  </div>

                  {(viewProposalCase as Case & { ai_analysis: AIAnalysis }).ai_analysis.risks.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4">
                      <h5 className="font-medium flex items-center gap-2 mb-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Riesgos Identificados
                      </h5>
                      <ul className="text-sm space-y-1">
                        {(viewProposalCase as Case & { ai_analysis: AIAnalysis }).ai_analysis.risks.map((risk, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-amber-500">•</span> {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(viewProposalCase as Case & { ai_analysis: AIAnalysis }).ai_analysis.suggestedServices.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
                      <h5 className="font-medium flex items-center gap-2 mb-2 text-sm">
                        <Lightbulb className="h-4 w-4 text-blue-500" />
                        Servicios Sugeridos
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {(viewProposalCase as Case & { ai_analysis: AIAnalysis }).ai_analysis.suggestedServices.map((service, i) => (
                          <Badge key={i} variant="secondary">{service}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {(viewProposalCase as Case & { ai_analysis: AIAnalysis }).ai_analysis.missingInfo.length > 0 && (
                    <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4">
                      <h5 className="font-medium flex items-center gap-2 mb-2 text-sm">
                        <HelpCircle className="h-4 w-4 text-purple-500" />
                        Información Faltante
                      </h5>
                      <ul className="text-sm space-y-1">
                        {(viewProposalCase as Case & { ai_analysis: AIAnalysis }).ai_analysis.missingInfo.map((info, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-purple-500">•</span> {info}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Proposal Content (if generated) */}
              {viewProposalCase.proposal_content && (
                <div>
                  <Label className="text-muted-foreground text-xs">Contenido de la Propuesta</Label>
                  <div className="mt-2 p-4 bg-muted/50 rounded-lg">
                    <pre className="text-sm whitespace-pre-wrap font-sans">
                      {JSON.stringify(viewProposalCase.proposal_content, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Status Modal */}
      <Dialog open={!!statusChangeCase} onOpenChange={(open) => !open && setStatusChangeCase(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Estatus</DialogTitle>
          </DialogHeader>
          {statusChangeCase && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Cambia el estatus de: <strong>{statusChangeCase.title}</strong>
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(PROPOSAL_STATUS_CONFIG) as ProposalStatus[]).map((status) => {
                  const config = PROPOSAL_STATUS_CONFIG[status];
                  const isCurrentStatus = mapCaseStatusToProposalStatus(statusChangeCase.status) === status;
                  
                  return (
                    <Button
                      key={status}
                      variant={isCurrentStatus ? "default" : "outline"}
                      className="justify-start"
                      onClick={() => {
                        updateStatusMutation.mutate({
                          id: statusChangeCase.id,
                          status: mapProposalStatusToCaseStatus(status),
                        });
                      }}
                      disabled={updateStatusMutation.isPending}
                    >
                      {config.icon}
                      <span className="ml-2">{config.label}</span>
                      {isCurrentStatus && <span className="ml-auto text-xs">(actual)</span>}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
