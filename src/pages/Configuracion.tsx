import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { Building2, Save } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type FirmSettings = Tables<"firm_settings">;

export default function Configuracion() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    logo_url: "",
    guarantees_text: "",
    disclaimers_text: "",
    closing_text: "",
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["firm_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firm_settings")
        .select("*")
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data as FirmSettings | null;
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        name: settings.name || "",
        address: settings.address || "",
        phone: settings.phone || "",
        email: settings.email || "",
        website: settings.website || "",
        logo_url: settings.logo_url || "",
        guarantees_text: settings.guarantees_text || "",
        disclaimers_text: settings.disclaimers_text || "",
        closing_text: settings.closing_text || "",
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (settings) {
        const { error } = await supabase
          .from("firm_settings")
          .update({
            name: data.name,
            address: data.address || null,
            phone: data.phone || null,
            email: data.email || null,
            website: data.website || null,
            logo_url: data.logo_url || null,
            guarantees_text: data.guarantees_text || null,
            disclaimers_text: data.disclaimers_text || null,
            closing_text: data.closing_text || null,
          })
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("firm_settings")
          .insert({
            name: data.name,
            address: data.address || null,
            phone: data.phone || null,
            email: data.email || null,
            website: data.website || null,
            logo_url: data.logo_url || null,
            guarantees_text: data.guarantees_text || null,
            disclaimers_text: data.disclaimers_text || null,
            closing_text: data.closing_text || null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["firm_settings"] });
      toast({ title: "Configuración guardada exitosamente" });
    },
    onError: (error) => {
      toast({ title: "Error al guardar configuración", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configuración</h1>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">Configuración del despacho y textos fijos</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Datos del Despacho
            </CardTitle>
            <CardDescription>
              Esta información aparecerá en los documentos y propuestas generadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Despacho</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Sitio Web</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo_url">URL del Logo</Label>
              <Input
                id="logo_url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Textos Fijos para Propuestas</CardTitle>
            <CardDescription>
              Estos textos se incluirán automáticamente en las propuestas generadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guarantees_text">Texto de Garantías</Label>
              <Textarea
                id="guarantees_text"
                value={formData.guarantees_text}
                onChange={(e) => setFormData({ ...formData, guarantees_text: e.target.value })}
                rows={4}
                placeholder="Describe las garantías que ofrece el despacho..."
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="disclaimers_text">Texto de Disclaimers</Label>
              <Textarea
                id="disclaimers_text"
                value={formData.disclaimers_text}
                onChange={(e) => setFormData({ ...formData, disclaimers_text: e.target.value })}
                rows={4}
                placeholder="Avisos legales y limitaciones de responsabilidad..."
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="closing_text">Texto de Cierre</Label>
              <Textarea
                id="closing_text"
                value={formData.closing_text}
                onChange={(e) => setFormData({ ...formData, closing_text: e.target.value })}
                rows={4}
                placeholder="Texto de despedida y llamado a la acción..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            Guardar Configuración
          </Button>
        </div>
      </form>
    </div>
  );
}
