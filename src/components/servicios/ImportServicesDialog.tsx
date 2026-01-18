import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-utils";
import {
  Upload,
  Sparkles,
  Loader2,
  AlertCircle,
  Check,
  ChevronRight,
  ChevronLeft,
  Pencil,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ParsedService {
  name: string;
  description: string;
  standard_text: string;
  fee_type: "one_time" | "monthly" | "both";
}

interface ParsedServiceWithMeta extends ParsedService {
  id: string;
  selected: boolean;
  isDuplicate: boolean;
  duplicateName?: string;
}

interface ImportServicesDialogProps {
  trigger?: React.ReactNode;
}

export function ImportServicesDialog({ trigger }: ImportServicesDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rawText, setRawText] = useState("");
  const [parsedServices, setParsedServices] = useState<ParsedServiceWithMeta[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aiNotes, setAiNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing services to check for duplicates
  const { data: existingServices } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("name");
      if (error) throw error;
      return data;
    },
  });

  // Parse services with AI
  const parseMutation = useMutation({
    mutationFn: async (text: string) => {
      const { data, error } = await supabase.functions.invoke("parse-services-from-text", {
        body: { text },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data as { services: ParsedService[]; confidence: number; notes: string };
    },
    onSuccess: (data) => {
      const existingNames = existingServices?.map((s) => s.name.toLowerCase()) || [];
      
      const servicesWithMeta: ParsedServiceWithMeta[] = data.services.map((service, index) => {
        const nameLower = service.name.toLowerCase();
        const duplicate = existingNames.find(
          (existing) => 
            existing === nameLower || 
            existing.includes(nameLower) || 
            nameLower.includes(existing)
        );
        
        return {
          ...service,
          id: `parsed-${index}-${Date.now()}`,
          selected: !duplicate,
          isDuplicate: !!duplicate,
          duplicateName: duplicate,
        };
      });

      setParsedServices(servicesWithMeta);
      setAiNotes(data.notes || "");
      setStep(2);
    },
    onError: (error) => {
      toast({
        title: "Error al analizar",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  // Import services in batch
  const importMutation = useMutation({
    mutationFn: async (services: ParsedServiceWithMeta[]) => {
      const selectedServices = services.filter((s) => s.selected);
      
      const { error } = await supabase.from("services").insert(
        selectedServices.map((service) => ({
          name: service.name,
          description: service.description || null,
          standard_text: service.standard_text || null,
          fee_type: service.fee_type,
          is_active: true,
        }))
      );
      
      if (error) throw error;
      return selectedServices.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: `${count} servicios importados exitosamente` });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Error al importar",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setIsOpen(false);
    setStep(1);
    setRawText("");
    setParsedServices([]);
    setEditingId(null);
    setAiNotes("");
  };

  const toggleService = (id: string) => {
    setParsedServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
  };

  const updateService = (id: string, updates: Partial<ParsedService>) => {
    setParsedServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const selectedCount = parsedServices.filter((s) => s.selected).length;

  const getFeeTypeLabel = (type: string) => {
    switch (type) {
      case "monthly":
        return "Iguala";
      case "both":
        return "Mixto";
      default:
        return "Único";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? setIsOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Importar con IA
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Importar Servicios con IA
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 py-2 border-b">
          <div
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
              step === 1 ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            <span className="font-medium">1</span>
            <span className="hidden sm:inline">Pegar texto</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
              step === 2 ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            <span className="font-medium">2</span>
            <span className="hidden sm:inline">Revisar</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
              step === 3 ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            <span className="font-medium">3</span>
            <span className="hidden sm:inline">Importar</span>
          </div>
        </div>

        {/* Step 1: Paste Text */}
        {step === 1 && (
          <div className="flex-1 space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pega el texto de tu sitio web o catálogo de servicios</Label>
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Copia y pega aquí el contenido de tu página web, catálogo de servicios, lista de precios, o cualquier documento que describa tus servicios profesionales..."
                className="min-h-[300px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                💡 Tip: Puedes pegar texto de tu página web, un PDF copiado, o cualquier documento con tus servicios listados.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={() => parseMutation.mutate(rawText)}
                disabled={!rawText.trim() || parseMutation.isPending}
              >
                {parseMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analizar con IA
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Review Services */}
        {step === 2 && (
          <div className="flex-1 flex flex-col min-h-0 py-4">
            {parsedServices.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">No se encontraron servicios</h3>
                <p className="text-muted-foreground mb-4">
                  La IA no pudo identificar servicios en el texto proporcionado.
                  Intenta con un texto más detallado.
                </p>
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Volver a intentar
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium">
                      {parsedServices.length} servicios detectados
                    </h3>
                    {aiNotes && (
                      <p className="text-sm text-muted-foreground">{aiNotes}</p>
                    )}
                  </div>
                  <Badge variant="secondary">
                    {selectedCount} seleccionados
                  </Badge>
                </div>

                <ScrollArea className="flex-1 -mx-6 px-6">
                  <div className="space-y-3">
                    {parsedServices.map((service) => (
                      <div
                        key={service.id}
                        className={`border rounded-lg p-4 transition-colors ${
                          service.selected
                            ? "border-primary bg-primary/5"
                            : "border-border bg-muted/30"
                        }`}
                      >
                        {editingId === service.id ? (
                          // Edit Mode
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label className="text-xs">Nombre</Label>
                              <Input
                                value={service.name}
                                onChange={(e) =>
                                  updateService(service.id, { name: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Descripción</Label>
                              <Textarea
                                value={service.description}
                                onChange={(e) =>
                                  updateService(service.id, { description: e.target.value })
                                }
                                rows={2}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Texto Estándar</Label>
                              <Textarea
                                value={service.standard_text}
                                onChange={(e) =>
                                  updateService(service.id, { standard_text: e.target.value })
                                }
                                rows={3}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Tipo de Cobro</Label>
                              <Select
                                value={service.fee_type}
                                onValueChange={(value: "one_time" | "monthly" | "both") =>
                                  updateService(service.id, { fee_type: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="one_time">Pago único</SelectItem>
                                  <SelectItem value="monthly">Iguala mensual</SelectItem>
                                  <SelectItem value="both">Ambos</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                onClick={() => setEditingId(null)}
                              >
                                <Check className="mr-2 h-4 w-4" />
                                Listo
                              </Button>
                            </div>
                          </div>
                        ) : (
                          // View Mode
                          <div className="flex gap-3">
                            <Checkbox
                              checked={service.selected}
                              onCheckedChange={() => toggleService(service.id)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <h4 className="font-medium">{service.name}</h4>
                                  {service.isDuplicate && (
                                    <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                                      <AlertCircle className="h-3 w-3" />
                                      Un servicio similar ya existe
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs shrink-0">
                                    {getFeeTypeLabel(service.fee_type)}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setEditingId(service.id)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              {service.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {service.description}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex justify-between gap-2 pt-4 border-t mt-4">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Atrás
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={selectedCount === 0}
                  >
                    Continuar
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3: Confirm Import */}
        {step === 3 && (
          <div className="flex-1 space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">
                Listo para importar {selectedCount} servicios
              </h3>
              <p className="text-muted-foreground text-sm">
                Los servicios serán agregados a tu catálogo como activos.
              </p>
            </div>

            <div className="border rounded-lg divide-y max-h-[200px] overflow-y-auto">
              {parsedServices
                .filter((s) => s.selected)
                .map((service) => (
                  <div key={service.id} className="p-3 flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                    <span className="font-medium flex-1">{service.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {getFeeTypeLabel(service.fee_type)}
                    </Badge>
                  </div>
                ))}
            </div>

            <div className="flex justify-between gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Atrás
              </Button>
              <Button
                onClick={() => importMutation.mutate(parsedServices)}
                disabled={importMutation.isPending}
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar {selectedCount} Servicios
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
