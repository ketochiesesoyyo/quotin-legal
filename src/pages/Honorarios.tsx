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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, DollarSign, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Tables } from "@/integrations/supabase/types";

type PricingTemplate = Tables<"pricing_templates">;

export default function Honorarios() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PricingTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    initial_payment: "",
    initial_payment_split: "50/50",
    monthly_retainer: "",
    retainer_months: "12",
    exclusions_text: "",
    is_active: true,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["pricing_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PricingTemplate[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: result, error } = await supabase
        .from("pricing_templates")
        .insert({
          name: data.name,
          initial_payment: data.initial_payment ? parseFloat(data.initial_payment) : null,
          initial_payment_split: data.initial_payment_split || null,
          monthly_retainer: data.monthly_retainer ? parseFloat(data.monthly_retainer) : null,
          retainer_months: data.retainer_months ? parseInt(data.retainer_months) : 12,
          exclusions_text: data.exclusions_text || null,
          is_active: data.is_active,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing_templates"] });
      toast({ title: "Plantilla de honorarios creada exitosamente" });
      setIsOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Error al crear plantilla", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("pricing_templates")
        .update({
          name: data.name,
          initial_payment: data.initial_payment ? parseFloat(data.initial_payment) : null,
          initial_payment_split: data.initial_payment_split || null,
          monthly_retainer: data.monthly_retainer ? parseFloat(data.monthly_retainer) : null,
          retainer_months: data.retainer_months ? parseInt(data.retainer_months) : 12,
          exclusions_text: data.exclusions_text || null,
          is_active: data.is_active,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing_templates"] });
      toast({ title: "Plantilla actualizada exitosamente" });
      setIsOpen(false);
      setEditingTemplate(null);
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Error al actualizar plantilla", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pricing_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing_templates"] });
      toast({ title: "Plantilla eliminada exitosamente" });
    },
    onError: (error) => {
      toast({ title: "Error al eliminar plantilla", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      initial_payment: "",
      initial_payment_split: "50/50",
      monthly_retainer: "",
      retainer_months: "12",
      exclusions_text: "",
      is_active: true,
    });
  };

  const handleEdit = (template: PricingTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      initial_payment: template.initial_payment?.toString() || "",
      initial_payment_split: template.initial_payment_split || "50/50",
      monthly_retainer: template.monthly_retainer?.toString() || "",
      retainer_months: template.retainer_months?.toString() || "12",
      exclusions_text: template.exclusions_text || "",
      is_active: template.is_active ?? true,
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Honorarios</h1>
          <p className="text-muted-foreground">Plantillas de precios y esquemas de pago</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setEditingTemplate(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Plantilla
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "Editar Plantilla" : "Nueva Plantilla de Honorarios"}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Estos valores sirven como base para prellenar las propuestas. Podrás editarlos al momento de crear cada propuesta.
              </p>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la Plantilla</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Paquete Básico, Plan Premium..."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="initial_payment">Pago Inicial (MXN)</Label>
                  <Input
                    id="initial_payment"
                    type="number"
                    value={formData.initial_payment}
                    onChange={(e) => setFormData({ ...formData, initial_payment: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="initial_payment_split">Esquema de Pago Inicial</Label>
                  <Input
                    id="initial_payment_split"
                    value={formData.initial_payment_split}
                    onChange={(e) => setFormData({ ...formData, initial_payment_split: e.target.value })}
                    placeholder="Ej: 50/50, 30/70..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly_retainer">Iguala Mensual (MXN)</Label>
                  <Input
                    id="monthly_retainer"
                    type="number"
                    value={formData.monthly_retainer}
                    onChange={(e) => setFormData({ ...formData, monthly_retainer: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retainer_months">Duración (meses)</Label>
                  <Input
                    id="retainer_months"
                    type="number"
                    value={formData.retainer_months}
                    onChange={(e) => setFormData({ ...formData, retainer_months: e.target.value })}
                    placeholder="12"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="exclusions_text">Texto de Exclusiones</Label>
                <Textarea
                  id="exclusions_text"
                  value={formData.exclusions_text}
                  onChange={(e) => setFormData({ ...formData, exclusions_text: e.target.value })}
                  rows={3}
                  placeholder="Servicios no incluidos en esta propuesta..."
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Plantilla activa</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingTemplate ? "Guardar Cambios" : "Crear Plantilla"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Plantillas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Plantillas Activas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates?.filter((t) => t.is_active).length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plantillas de Honorarios</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : templates?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay plantillas registradas. Crea la primera.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Pago Inicial</TableHead>
                  <TableHead>Iguala Mensual</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates?.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>{formatCurrency(template.initial_payment)}</TableCell>
                    <TableCell>{formatCurrency(template.monthly_retainer)}</TableCell>
                    <TableCell>{template.retainer_months} meses</TableCell>
                    <TableCell>
                      <Badge variant={template.is_active ? "default" : "secondary"}>
                        {template.is_active ? "Activa" : "Inactiva"}
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
                          <DropdownMenuItem onClick={() => handleEdit(template)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteMutation.mutate(template.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
