import { useState } from "react";
import { Sparkles, Check, ChevronDown, ChevronUp, Pencil, DollarSign, Calculator, ListOrdered, Wallet, Wand2, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ServiceWithConfidence, PricingMode } from "./types";
import { GeneratedContentPreview } from "./GeneratedContentPreview";

interface ServicesSectionProps {
  services: ServiceWithConfidence[];
  pricingMode: PricingMode;
  onPricingModeChange?: (mode: PricingMode) => void;
  onToggleService: (serviceId: string) => void;
  onUpdateCustomText: (serviceId: string, text: string) => void;
  onUpdateServiceFee: (serviceId: string, fee: number, isMonthly: boolean) => void;
  showModeSelector?: boolean;
  onGenerateContent?: () => void;
  isGeneratingContent?: boolean;
  generatedServicesContent?: string;
  editedServicesContent?: string;
  onInsertServicesContent?: (text: string) => void;
  onSaveServicesContentEdit?: (text: string) => void;
}

// Helper to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

function ServiceCard({
  item,
  index,
  pricingMode,
  onToggle,
  onUpdateCustomText,
  onUpdateFee,
}: {
  item: ServiceWithConfidence;
  index: string;
  pricingMode: PricingMode;
  onToggle: () => void;
  onUpdateCustomText: (text: string) => void;
  onUpdateFee: (fee: number, isMonthly: boolean) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [customText, setCustomText] = useState(item.customText || item.service.standard_text || "");

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-green-600 bg-green-100 dark:bg-green-900/30";
    if (confidence >= 70) return "text-blue-600 bg-blue-100 dark:bg-blue-900/30";
    return "text-muted-foreground bg-muted";
  };

  const handleSaveText = () => {
    onUpdateCustomText(customText);
    setIsEditingText(false);
  };

  // Determine which fees to show based on fee_type
  const feeType = item.service.fee_type || 'one_time';
  const showOneTimeFee = feeType === 'one_time' || feeType === 'both';
  const showMonthlyFee = feeType === 'monthly' || feeType === 'both';

  // Get current fee values (use custom if set, otherwise suggested)
  const currentFee = item.customFee ?? (item.service.suggested_fee ? Number(item.service.suggested_fee) : 0);
  const currentMonthlyFee = item.customMonthlyFee ?? (item.service.suggested_monthly_fee ? Number(item.service.suggested_monthly_fee) : 0);
  
  // Check if fees have been modified from suggested
  const feeModified = item.customFee !== undefined && item.customFee !== Number(item.service.suggested_fee || 0);
  const monthlyFeeModified = item.customMonthlyFee !== undefined && item.customMonthlyFee !== Number(item.service.suggested_monthly_fee || 0);

  // Calculate subtotal for this service
  const serviceSubtotal = (showOneTimeFee ? currentFee : 0) + (showMonthlyFee ? currentMonthlyFee : 0);

  // Can edit fees in both per_service and summed modes
  const canEditFees = pricingMode === 'per_service' || pricingMode === 'summed';
  // Show individual prices in per_service and summed modes (to see what you're editing)
  const showIndividualPrices = pricingMode === 'per_service' || pricingMode === 'summed';

  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        item.isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-muted-foreground/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={item.isSelected}
          onCheckedChange={onToggle}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="font-medium text-sm">
                {index}) {item.service.name}
              </h4>
              {item.service.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {item.service.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="secondary" className={`text-xs ${getConfidenceColor(item.confidence)}`}>
                {item.confidence}% confianza
              </Badge>
              {item.confidence >= 80 && (
                <Badge variant="outline" className="text-xs gap-1 text-primary">
                  <Sparkles className="h-3 w-3" />
                  IA
                </Badge>
              )}
            </div>
          </div>

          {/* Price display (only visible when selected AND in per_service mode) */}
          {item.isSelected && showIndividualPrices && (
            <div className="mt-3 flex items-center gap-4 flex-wrap">
              {showOneTimeFee && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Inicial:</span>
                  <span className={`text-sm font-semibold ${feeModified ? 'text-amber-600' : ''}`}>
                    {formatCurrency(currentFee)}
                  </span>
                  {feeModified && (
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                      Editado
                    </Badge>
                  )}
                </div>
              )}
              {showMonthlyFee && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Mensual:</span>
                  <span className={`text-sm font-semibold ${monthlyFeeModified ? 'text-amber-600' : ''}`}>
                    {formatCurrency(currentMonthlyFee)}
                  </span>
                  {monthlyFeeModified && (
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                      Editado
                    </Badge>
                  )}
                </div>
              )}
              {(showOneTimeFee || showMonthlyFee) && serviceSubtotal > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Subtotal: {formatCurrency(serviceSubtotal)}
                </Badge>
              )}
            </div>
          )}

          {/* Standard text (always visible when selected) */}
          {item.isSelected && (
            <div className="mt-3 bg-muted/30 rounded-lg p-3">
              <Label className="text-xs font-medium mb-2 block text-muted-foreground">Texto estándar del servicio</Label>
              {isEditingText ? (
                <div className="space-y-2">
                  <Textarea
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    rows={4}
                    className="text-sm resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingText(false)}
                    >
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveText}>
                      <Check className="h-4 w-4 mr-1" />
                      Guardar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {customText || "Sin texto definido para este servicio."}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => setIsEditingText(true)}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Personalizar texto
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Fee editing collapsible (in per_service and summed modes) */}
          {item.isSelected && canEditFees && (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="mt-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between h-8">
                  <span className="text-xs">Editar honorarios</span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-4">
                {/* Fee editing */}
                <div className="bg-muted/30 rounded-lg p-3 space-y-3">
                  <Label className="text-xs font-medium">Honorarios para esta propuesta</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {showOneTimeFee && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Pago inicial</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          <Input
                            type="number"
                            value={currentFee}
                            onChange={(e) => onUpdateFee(parseFloat(e.target.value) || 0, false)}
                            className="pl-7 h-8 text-sm"
                            placeholder="0"
                          />
                        </div>
                        {item.service.suggested_fee && Number(item.service.suggested_fee) > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Sugerido: {formatCurrency(Number(item.service.suggested_fee))}
                          </p>
                        )}
                      </div>
                    )}
                    {showMonthlyFee && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Iguala mensual</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          <Input
                            type="number"
                            value={currentMonthlyFee}
                            onChange={(e) => onUpdateFee(parseFloat(e.target.value) || 0, true)}
                            className="pl-7 h-8 text-sm"
                            placeholder="0"
                          />
                        </div>
                        {item.service.suggested_monthly_fee && Number(item.service.suggested_monthly_fee) > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Sugerido: {formatCurrency(Number(item.service.suggested_monthly_fee))}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>
    </div>
  );
}

export function ServicesSection({
  services,
  pricingMode,
  onPricingModeChange,
  onToggleService,
  onUpdateCustomText,
  onUpdateServiceFee,
  showModeSelector = true,
  onGenerateContent,
  isGeneratingContent = false,
  generatedServicesContent,
  editedServicesContent,
  onInsertServicesContent,
  onSaveServicesContentEdit,
}: ServicesSectionProps) {
  const [isServicesCollapsed, setIsServicesCollapsed] = useState(false);
  const preSelectedCount = services.filter((s) => s.confidence >= 80).length;
  const selectedCount = services.filter((s) => s.isSelected).length;
  const selectedServices = services.filter((s) => s.isSelected);

  // Calculate totals from selected services
  const totalOneTime = selectedServices.reduce((sum, s) => {
    const feeType = s.service.fee_type || 'one_time';
    if (feeType === 'one_time' || feeType === 'both') {
      const fee = s.customFee ?? (s.service.suggested_fee ? Number(s.service.suggested_fee) : 0);
      return sum + fee;
    }
    return sum;
  }, 0);

  const totalMonthly = selectedServices.reduce((sum, s) => {
    const feeType = s.service.fee_type || 'one_time';
    if (feeType === 'monthly' || feeType === 'both') {
      const fee = s.customMonthlyFee ?? (s.service.suggested_monthly_fee ? Number(s.service.suggested_monthly_fee) : 0);
      return sum + fee;
    }
    return sum;
  }, 0);

  const getLetter = (index: number) => String.fromCharCode(97 + index); // a, b, c, d...

  const getPricingModeDescription = (mode: PricingMode) => {
    switch (mode) {
      case 'per_service':
        return 'Cada servicio muestra su precio individual en la propuesta';
      case 'summed':
        return 'Solo se muestra el total de todos los servicios';
      case 'global':
        return 'Usar honorarios globales configurados manualmente';
    }
  };

  const hasGeneratedContent = !!generatedServicesContent || !!editedServicesContent;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">SERVICIOS RECOMENDADOS</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs gap-1">
              <Sparkles className="h-3 w-3" />
              IA PRE-SELECCIONÓ {preSelectedCount}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsServicesCollapsed(!isServicesCollapsed)}
              className="h-8 w-8 p-0"
            >
              {isServicesCollapsed ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {selectedCount} servicio{selectedCount !== 1 ? "s" : ""} seleccionado{selectedCount !== 1 ? "s" : ""}
          {isServicesCollapsed && " (lista colapsada)"}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pricing Mode Selector - only show if showModeSelector is true */}
        {showModeSelector && onPricingModeChange && !isServicesCollapsed && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <Label className="text-sm font-medium">¿Cómo calcular honorarios?</Label>
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
        )}
        
        {/* Services list - collapsible */}
        {!isServicesCollapsed && (
          <div className="space-y-3">
            {services.map((item, index) => (
              <ServiceCard
                key={item.service.id}
                item={item}
                index={getLetter(index)}
                pricingMode={pricingMode}
                onToggle={() => onToggleService(item.service.id)}
                onUpdateCustomText={(text) => onUpdateCustomText(item.service.id, text)}
                onUpdateFee={(fee, isMonthly) => onUpdateServiceFee(item.service.id, fee, isMonthly)}
              />
            ))}

            {services.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay servicios disponibles</p>
              </div>
            )}
          </div>
        )}
        
        {/* Collapsed state summary */}
        {isServicesCollapsed && selectedCount > 0 && (
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{selectedCount} servicios</span> seleccionados
              {(totalOneTime > 0 || totalMonthly > 0) && (
                <>
                  {" · "}
                  {totalOneTime > 0 && <span>Inicial: {formatCurrency(totalOneTime)}</span>}
                  {totalOneTime > 0 && totalMonthly > 0 && " · "}
                  {totalMonthly > 0 && <span>Mensual: {formatCurrency(totalMonthly)}</span>}
                </>
              )}
            </p>
            <Button
              variant="link"
              size="sm"
              onClick={() => setIsServicesCollapsed(false)}
              className="p-0 h-auto mt-1"
            >
              Ver lista completa
            </Button>
          </div>
        )}

        {/* Totals summary - show in per_service and summed modes */}
        {(pricingMode === 'per_service' || pricingMode === 'summed') && selectedCount > 0 && (totalOneTime > 0 || totalMonthly > 0) && !isServicesCollapsed && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total de servicios seleccionados:</span>
              <div className="flex items-center gap-4">
                {totalOneTime > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Pago inicial</p>
                    <p className="font-bold">{formatCurrency(totalOneTime)}</p>
                  </div>
                )}
                {totalMonthly > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Mensual</p>
                    <p className="font-bold">{formatCurrency(totalMonthly)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AI Content Generation Button */}
        {onGenerateContent && selectedCount > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Button
              onClick={onGenerateContent}
              disabled={isGeneratingContent}
              className="w-full gap-2"
              variant={hasGeneratedContent ? "outline" : "default"}
            >
              <Wand2 className="h-4 w-4" />
              {hasGeneratedContent ? "Regenerar contenido" : "Generar contenido de servicios"}
            </Button>
          </div>
        )}

        {/* Generated Content Preview */}
        {onInsertServicesContent && (generatedServicesContent || editedServicesContent || isGeneratingContent) && (
          <GeneratedContentPreview
            title="Contenido de servicios generado"
            generatedContent={generatedServicesContent}
            editedContent={editedServicesContent}
            isGenerating={isGeneratingContent}
            onInsertInProposal={onInsertServicesContent}
            onSaveEdit={onSaveServicesContentEdit}
            onRequestRegenerate={onGenerateContent}
          />
        )}
      </CardContent>
    </Card>
  );
}
