import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { TableSearch } from "@/components/ui/table-search";
import { useTableSort } from "@/hooks/useTableSort";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { Plus, Briefcase, MoreHorizontal, Pencil, Trash2, DollarSign, Upload } from "lucide-react";
import { ImportServicesDialog } from "@/components/servicios/ImportServicesDialog";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Tables } from "@/integrations/supabase/types";

type Service = Tables<"services">;

export default function Servicios() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    standard_text: "",
    is_active: true,
    fee_type: "one_time" as "one_time" | "monthly" | "both",
    suggested_fee: "",
    suggested_monthly_fee: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: services, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Service[];
    },
  });

  const { sortConfig, handleSort, searchQuery, setSearchQuery, filteredData } = useTableSort(services);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: result, error } = await supabase
        .from("services")
        .insert({
          name: data.name,
          description: data.description || null,
          standard_text: data.standard_text || null,
          is_active: data.is_active,
          fee_type: data.fee_type,
          suggested_fee: data.suggested_fee ? parseFloat(data.suggested_fee) : null,
          suggested_monthly_fee: data.suggested_monthly_fee ? parseFloat(data.suggested_monthly_fee) : null,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Servicio creado exitosamente" });
      setIsOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Error al crear servicio", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("services")
        .update({
          name: data.name,
          description: data.description || null,
          standard_text: data.standard_text || null,
          is_active: data.is_active,
          fee_type: data.fee_type,
          suggested_fee: data.suggested_fee ? parseFloat(data.suggested_fee) : null,
          suggested_monthly_fee: data.suggested_monthly_fee ? parseFloat(data.suggested_monthly_fee) : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Servicio actualizado exitosamente" });
      setIsOpen(false);
      setEditingService(null);
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Error al actualizar servicio", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Servicio eliminado exitosamente" });
    },
    onError: (error) => {
      toast({ title: "Error al eliminar servicio", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ 
      name: "", 
      description: "", 
      standard_text: "", 
      is_active: true,
      fee_type: "one_time",
      suggested_fee: "",
      suggested_monthly_fee: "",
    });
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      standard_text: service.standard_text || "",
      is_active: service.is_active ?? true,
      fee_type: (service.fee_type as "one_time" | "monthly" | "both") || "one_time",
      suggested_fee: service.suggested_fee?.toString() || "",
      suggested_monthly_fee: service.suggested_monthly_fee?.toString() || "",
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const activeServices = services?.filter((s) => s.is_active) || [];
  const inactiveServices = services?.filter((s) => !s.is_active) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Servicios</h1>
          <p className="text-muted-foreground">Catálogo de servicios y textos estándar</p>
        </div>
        <div className="flex gap-2">
          <ImportServicesDialog />
          <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) {
              setEditingService(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Servicio
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingService ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Servicio</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="standard_text">Texto Estándar para Propuestas</Label>
                <Textarea
                  id="standard_text"
                  value={formData.standard_text}
                  onChange={(e) => setFormData({ ...formData, standard_text: e.target.value })}
                  rows={4}
                  placeholder="Este texto se insertará automáticamente en las propuestas..."
                />
              </div>
              
              {/* Pricing Section */}
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  Honorarios Sugeridos
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fee_type">Tipo de Cobro</Label>
                  <Select
                    value={formData.fee_type}
                    onValueChange={(value: "one_time" | "monthly" | "both") => 
                      setFormData({ ...formData, fee_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">Pago único</SelectItem>
                      <SelectItem value="monthly">Iguala mensual</SelectItem>
                      <SelectItem value="both">Ambos (pago inicial + iguala)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(formData.fee_type === "one_time" || formData.fee_type === "both") && (
                  <div className="space-y-2">
                    <Label htmlFor="suggested_fee">
                      {formData.fee_type === "both" ? "Pago Inicial Sugerido" : "Honorario Sugerido"}
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="suggested_fee"
                        type="number"
                        className="pl-7"
                        value={formData.suggested_fee}
                        onChange={(e) => setFormData({ ...formData, suggested_fee: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}

                {(formData.fee_type === "monthly" || formData.fee_type === "both") && (
                  <div className="space-y-2">
                    <Label htmlFor="suggested_monthly_fee">Iguala Mensual Sugerida</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="suggested_monthly_fee"
                        type="number"
                        className="pl-7"
                        value={formData.suggested_monthly_fee}
                        onChange={(e) => setFormData({ ...formData, suggested_monthly_fee: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Servicio activo</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingService ? "Guardar Cambios" : "Crear Servicio"}
                </Button>
              </div>
            </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Servicios Activos</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeServices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Servicios Inactivos</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveServices.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Catálogo de Servicios</CardTitle>
          <TableSearch 
            value={searchQuery} 
            onChange={setSearchQuery} 
            placeholder="Buscar servicio..."
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : services?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay servicios registrados. Crea el primero.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead sortKey="name" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort}>Nombre</SortableTableHead>
                  <SortableTableHead sortKey="description" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort}>Descripción</SortableTableHead>
                  <SortableTableHead sortKey="fee_type" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort}>Tipo de Cobro</SortableTableHead>
                  <TableHead className="text-right">Honorarios</TableHead>
                  <SortableTableHead sortKey="is_active" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort}>Estado</SortableTableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData?.map((service) => {
                  const formatCurrency = (amount: number | null) => 
                    amount ? new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount) : null;
                  
                  const getFeeTypeLabel = (type: string | null) => {
                    switch (type) {
                      case "monthly": return "Iguala";
                      case "both": return "Mixto";
                      default: return "Único";
                    }
                  };

                  const getPricingDisplay = () => {
                    const parts: string[] = [];
                    if (service.suggested_fee) {
                      parts.push(formatCurrency(service.suggested_fee) || "");
                    }
                    if (service.suggested_monthly_fee) {
                      parts.push(`${formatCurrency(service.suggested_monthly_fee)}/mes`);
                    }
                    return parts.length > 0 ? parts.join(" + ") : "-";
                  };

                  return (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {service.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getFeeTypeLabel(service.fee_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {getPricingDisplay()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={service.is_active ? "default" : "secondary"}>
                          {service.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(service)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteMutation.mutate(service.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
