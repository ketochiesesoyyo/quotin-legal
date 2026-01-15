import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Plus, FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Case = Tables<"cases">;
type Client = Tables<"clients">;
type CaseStatus = Enums<"case_status">;

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

export default function Propuestas() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
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
      return data as Case[];
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
      const { data: result, error } = await supabase
        .from("cases")
        .insert({
          title: data.title,
          client_id: data.client_id,
          need_type: data.need_type || null,
          notes: data.notes || null,
          status: "nuevo" as CaseStatus,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      toast({ title: "Propuesta creada exitosamente" });
      setIsOpen(false);
      setFormData({ title: "", client_id: "", need_type: "", notes: "" });
    },
    onError: (error) => {
      toast({ title: "Error al crear propuesta", description: error.message, variant: "destructive" });
    },
  });

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
    createMutation.mutate(formData);
  };

  const getClientName = (clientId: string) => {
    return clients?.find((c) => c.id === clientId)?.group_name || "Sin cliente";
  };

  const getCasesByStatus = (status: CaseStatus) => {
    return cases?.filter((c) => c.status === status) || [];
  };

  const activeStatuses: CaseStatus[] = ["nuevo", "docs_solicitados", "docs_recibidos", "en_analisis", "borrador", "revision", "enviada", "negociacion"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Propuestas</h1>
          <p className="text-muted-foreground">Pipeline de casos y propuestas</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Propuesta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Propuesta</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título del Caso</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_id">Cliente</Label>
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
                <Label htmlFor="need_type">Tipo de Necesidad</Label>
                <Input
                  id="need_type"
                  value={formData.need_type}
                  onChange={(e) => setFormData({ ...formData, need_type: e.target.value })}
                  placeholder="Ej: Consultoría fiscal, Litigio, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || !formData.client_id}>
                  Crear Propuesta
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
                    <Card key={caseItem.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow">
                      <h4 className="font-medium text-sm">{caseItem.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getClientName(caseItem.client_id)}
                      </p>
                      {caseItem.need_type && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          {caseItem.need_type}
                        </Badge>
                      )}
                      <div className="mt-3">
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
