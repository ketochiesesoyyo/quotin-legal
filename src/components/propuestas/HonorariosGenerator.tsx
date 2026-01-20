import { useState } from "react";
import { Calculator, ListOrdered, Wallet, Wand2, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GeneratedContentPreview } from "./GeneratedContentPreview";
import type { ServiceWithConfidence, PricingMode, PaymentInstallment, PricingTemplate } from "./types";
import { formatCurrency, numberToWords } from "@/lib/number-to-words";

interface HonorariosGeneratorProps {
  selectedServices: ServiceWithConfidence[];
  pricingMode: PricingMode;
  onPricingModeChange: (mode: PricingMode) => void;
  initialPayment: number;
  monthlyRetainer: number;
  retainerMonths: number;
  paymentInstallments: PaymentInstallment[];
  onInitialPaymentChange: (value: number) => void;
  onMonthlyRetainerChange: (value: number) => void;
  onRetainerMonthsChange: (value: number) => void;
  onInstallmentsChange: (installments: PaymentInstallment[]) => void;
  clientObjective?: string;
  onInsertHonorarios: (text: string) => void;
  // New: Pricing templates
  pricingTemplates?: PricingTemplate[];
  selectedTemplateId?: string | null;
  onTemplateSelect?: (templateId: string | null) => void;
}

export function HonorariosGenerator({
  selectedServices,
  pricingMode,
  onPricingModeChange,
  initialPayment,
  monthlyRetainer,
  retainerMonths,
  paymentInstallments,
  onInitialPaymentChange,
  onMonthlyRetainerChange,
  onRetainerMonthsChange,
  onInstallmentsChange,
  clientObjective = "los servicios solicitados",
  onInsertHonorarios,
  pricingTemplates = [],
  selectedTemplateId,
  onTemplateSelect,
}: HonorariosGeneratorProps) {
  // Find selected template for exclusions text
  const selectedTemplate = pricingTemplates.find(t => t.id === selectedTemplateId);
  const [generatedText, setGeneratedText] = useState<string>("");
  const [editedText, setEditedText] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const getPricingModeDescription = (mode: PricingMode) => {
    switch (mode) {
      case "per_service":
        return "Lista cada servicio con su precio individual y muestra la sumatoria al final";
      case "summed":
        return "Lista solo los nombres de los servicios y muestra un solo total al final";
      case "global":
        return "Texto narrativo profesional con montos en letra (estilo formal)";
    }
  };

  // Calculate totals from selected services
  const calculateTotals = () => {
    let totalInitial = 0;
    let totalMonthly = 0;

    selectedServices.forEach((s) => {
      const feeType = s.service.fee_type || "one_time";
      if (feeType === "one_time" || feeType === "both") {
        const fee = s.customFee ?? (s.service.suggested_fee ? Number(s.service.suggested_fee) : 0);
        totalInitial += fee;
      }
      if (feeType === "monthly" || feeType === "both") {
        const fee = s.customMonthlyFee ?? (s.service.suggested_monthly_fee ? Number(s.service.suggested_monthly_fee) : 0);
        totalMonthly += fee;
      }
    });

    return { totalInitial, totalMonthly };
  };

  const generatePerServiceText = (): string => {
    const lines: string[] = ["II. PROPUESTA DE HONORARIOS.", ""];
    
    selectedServices.forEach((s, index) => {
      const letter = String.fromCharCode(97 + index); // a, b, c...
      const feeType = s.service.fee_type || "one_time";
      const hasInitial = feeType === "one_time" || feeType === "both";
      const hasMonthly = feeType === "monthly" || feeType === "both";
      
      const initialFee = s.customFee ?? (s.service.suggested_fee ? Number(s.service.suggested_fee) : 0);
      const monthlyFee = s.customMonthlyFee ?? (s.service.suggested_monthly_fee ? Number(s.service.suggested_monthly_fee) : 0);

      lines.push(`${letter}) ${s.service.name}`);
      
      if (hasInitial && initialFee > 0) {
        lines.push(`   • Pago inicial: ${formatCurrency(initialFee)} + IVA`);
      }
      if (hasMonthly && monthlyFee > 0) {
        lines.push(`   • Iguala mensual: ${formatCurrency(monthlyFee)} + IVA`);
      }
      lines.push("");
    });

    // Add totals
    const { totalInitial, totalMonthly } = calculateTotals();
    lines.push("─".repeat(30));
    lines.push("TOTAL:");
    if (totalInitial > 0) {
      lines.push(`• Pago inicial: ${formatCurrency(totalInitial)} + IVA`);
    }
    if (totalMonthly > 0) {
      lines.push(`• Iguala mensual: ${formatCurrency(totalMonthly)} + IVA`);
    }

    return lines.join("\n");
  };

  const generateSummedText = (): string => {
    const lines: string[] = [
      "II. PROPUESTA DE HONORARIOS.",
      "",
      "Los servicios incluidos en esta propuesta son:",
    ];

    selectedServices.forEach((s) => {
      lines.push(`• ${s.service.name}`);
    });

    lines.push("");
    lines.push("Por tal motivo, se propone el siguiente esquema de honorarios:");

    const { totalInitial, totalMonthly } = calculateTotals();
    
    if (totalInitial > 0) {
      lines.push(`• Pago inicial: ${formatCurrency(totalInitial)} + IVA`);
    }
    if (totalMonthly > 0) {
      lines.push(`• Iguala mensual: ${formatCurrency(totalMonthly)} + IVA por un plazo de ${retainerMonths} meses`);
    }

    return lines.join("\n");
  };

  const generateGlobalText = (): string => {
    // Use global values (not calculated from services)
    const initial = initialPayment;
    const monthly = monthlyRetainer;

    const lines: string[] = [
      "II. PROPUESTA DE HONORARIOS.",
      "",
      "La presente propuesta de honorarios se realiza con base en la experiencia del personal solicitado, así como el número de horas hombre que se dedicarán en el estudio, análisis, desarrollo, implementación y seguimiento continuo de la propuesta.",
      "",
      "Por tal motivo, se propone el siguiente esquema de honorarios:",
      "",
    ];

    if (initial > 0) {
      lines.push(`a) Un pago inicial en cantidad de ${formatCurrency(initial)} (${numberToWords(initial)}) más IVA correspondiente al estudio, análisis y propuesta de ${clientObjective}.`);
      lines.push("");
      
      // Add installment details if available
      if (paymentInstallments.length > 0) {
        const installmentText = paymentInstallments
          .map((inst) => `un ${inst.percentage}% ${inst.description}`)
          .join(" y ");
        lines.push(`Dicho honorario será cubierto ${installmentText}.`);
        lines.push("");
      }
    }

    if (monthly > 0) {
      const letterPrefix = initial > 0 ? "b)" : "a)";
      lines.push(`${letterPrefix} Una iguala mensual en cantidad de ${formatCurrency(monthly)} (${numberToWords(monthly)}) más IVA por un plazo de ${retainerMonths} meses a fin de realizar las labores de ejecución, implementación y acompañamiento de la propuesta.`);
    }

    // Add exclusions text from template if available
    if (selectedTemplate?.exclusions_text) {
      lines.push("");
      lines.push(selectedTemplate.exclusions_text);
    }

    return lines.join("\n");
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    
    // Small delay to show loading state
    setTimeout(() => {
      let text = "";
      
      switch (pricingMode) {
        case "per_service":
          text = generatePerServiceText();
          break;
        case "summed":
          text = generateSummedText();
          break;
        case "global":
          text = generateGlobalText();
          break;
      }
      
      setGeneratedText(text);
      setEditedText("");
      setIsGenerating(false);
    }, 300);
  };

  const handleSaveEdit = (text: string) => {
    setEditedText(text);
  };

  const handleRegenerate = () => {
    setEditedText("");
    handleGenerate();
  };

  const handleInsert = (text: string) => {
    onInsertHonorarios(text);
  };

  const hasSelectedServices = selectedServices.length > 0;
  const canGenerate = pricingMode === "global" 
    ? (initialPayment > 0 || monthlyRetainer > 0)
    : hasSelectedServices;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">GENERAR HONORARIOS</CardTitle>
        <p className="text-sm text-muted-foreground">
          Selecciona el modo y genera el texto para la sección de honorarios
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pricing Mode Selector */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <Label className="text-sm font-medium">Modo de honorarios</Label>
          <ToggleGroup
            type="single"
            value={pricingMode}
            onValueChange={(value) => value && onPricingModeChange(value as PricingMode)}
            className="justify-start flex-wrap gap-2"
          >
            <ToggleGroupItem
              value="per_service"
              className="flex items-center gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <ListOrdered className="h-4 w-4" />
              Por servicio
            </ToggleGroupItem>
            <ToggleGroupItem
              value="summed"
              className="flex items-center gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <Calculator className="h-4 w-4" />
              Sumatoria total
            </ToggleGroupItem>
            <ToggleGroupItem
              value="global"
              className="flex items-center gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <Wallet className="h-4 w-4" />
              Global / Plantilla
            </ToggleGroupItem>
          </ToggleGroup>
          <p className="text-xs text-muted-foreground">
            {getPricingModeDescription(pricingMode)}
          </p>
        </div>

        {/* Global mode: Manual fee inputs */}
        {pricingMode === "global" && (
          <div className="space-y-4">
            {/* Pricing Template Selector */}
            {pricingTemplates.length > 0 && onTemplateSelect && (
              <div className="bg-primary/5 rounded-lg p-4 space-y-3 border border-primary/20">
                <Label className="text-sm font-medium">
                  Usar plantilla de honorarios (opcional)
                </Label>
                <Select
                  value={selectedTemplateId || "none"}
                  onValueChange={(value) => onTemplateSelect(value === "none" ? null : value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Seleccionar plantilla..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin plantilla - configurar manualmente</SelectItem>
                    {pricingTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <span>{template.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {template.initial_payment ? `${formatCurrency(Number(template.initial_payment))}` : ""}
                            {template.initial_payment && template.monthly_retainer ? " + " : ""}
                            {template.monthly_retainer ? `${formatCurrency(Number(template.monthly_retainer))}/mes` : ""}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate && (
                  <p className="text-xs text-muted-foreground">
                    Plantilla seleccionada: {selectedTemplate.initial_payment_split || "100"}% de distribución
                    {selectedTemplate.exclusions_text && " • Incluye texto de exclusiones"}
                  </p>
                )}
              </div>
            )}

            {/* Fee amounts */}
            <div className="bg-accent/50 rounded-lg p-4 space-y-4 border border-accent">
              <Label className="text-sm font-medium">
                Configurar honorarios globales
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Pago inicial</Label>
                  <Input
                    type="number"
                    value={initialPayment || ""}
                    onChange={(e) => onInitialPaymentChange(parseFloat(e.target.value) || 0)}
                    placeholder="300000"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Iguala mensual</Label>
                  <Input
                    type="number"
                    value={monthlyRetainer || ""}
                    onChange={(e) => onMonthlyRetainerChange(parseFloat(e.target.value) || 0)}
                    placeholder="54000"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Meses de iguala</Label>
                  <Input
                    type="number"
                    value={retainerMonths}
                    onChange={(e) => onRetainerMonthsChange(parseInt(e.target.value) || 12)}
                    placeholder="12"
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* Payment installments editor - only show when initial payment > 0 */}
            {initialPayment > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-4 border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Distribución del pago inicial</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Define cómo se dividirá el pago de {formatCurrency(initialPayment)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Redistribute percentages equally among all installments
                      const newCount = paymentInstallments.length + 1;
                      const equalPercentage = Math.floor(100 / newCount);
                      const remainder = 100 - (equalPercentage * newCount);
                      
                      // Redistribute existing installments
                      const redistributed = paymentInstallments.map((inst, idx) => ({
                        ...inst,
                        percentage: equalPercentage + (idx === 0 ? remainder : 0)
                      }));
                      
                      // Add new installment
                      redistributed.push({
                        percentage: equalPercentage,
                        description: "al completar la siguiente etapa"
                      });
                      
                      onInstallmentsChange(redistributed);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar parcialidad
                  </Button>
                </div>

                <div className="space-y-3">
                  {paymentInstallments.map((installment, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                      <div className="w-20 shrink-0">
                        <Label className="text-xs text-muted-foreground">Porcentaje</Label>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={installment.percentage}
                            onChange={(e) => {
                              const updated = [...paymentInstallments];
                              updated[index] = { ...updated[index], percentage: parseInt(e.target.value) || 0 };
                              onInstallmentsChange(updated);
                            }}
                            className="h-8 text-sm"
                            min={0}
                            max={100}
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatCurrency(initialPayment * (installment.percentage / 100))}
                        </p>
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Condición de pago</Label>
                        <Input
                          value={installment.description}
                          onChange={(e) => {
                            const updated = [...paymentInstallments];
                            updated[index] = { ...updated[index], description: e.target.value };
                            onInstallmentsChange(updated);
                          }}
                          placeholder="al momento de..."
                          className="h-8 text-sm"
                        />
                      </div>
                      {paymentInstallments.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive shrink-0 mt-5"
                          onClick={() => {
                            onInstallmentsChange(paymentInstallments.filter((_, i) => i !== index));
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Validation message */}
                {(() => {
                  const totalPercentage = paymentInstallments.reduce((sum, i) => sum + i.percentage, 0);
                  if (totalPercentage !== 100) {
                    return (
                      <p className="text-xs text-destructive">
                        ⚠️ Los porcentajes suman {totalPercentage}%. Deben sumar 100%.
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate || isGenerating}
          className="w-full"
        >
          <Wand2 className="h-4 w-4 mr-2" />
          Generar texto de honorarios
        </Button>

        {/* Validation message */}
        {!canGenerate && (
          <p className="text-xs text-muted-foreground text-center">
            {pricingMode === "global"
              ? "Configura al menos un monto (pago inicial o iguala mensual)"
              : "Selecciona al menos un servicio para generar los honorarios"}
          </p>
        )}

        {/* Generated Content Preview */}
        {(generatedText || isGenerating) && (
          <GeneratedContentPreview
            title="Vista previa de honorarios"
            generatedContent={generatedText}
            editedContent={editedText}
            isGenerating={isGenerating}
            onInsertInProposal={handleInsert}
            onSaveEdit={handleSaveEdit}
            onRequestRegenerate={handleRegenerate}
          />
        )}
      </CardContent>
    </Card>
  );
}
