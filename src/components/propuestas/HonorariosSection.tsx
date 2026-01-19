import { useState } from "react";
import { 
  DollarSign, 
  ChevronDown, 
  ChevronUp,
  ListOrdered,
  Calculator,
  Wallet,
  Settings2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { InstallmentsEditor } from "./InstallmentsEditor";
import type { ServiceWithConfidence, PricingMode, PaymentInstallment } from "./types";
import type { PricingTemplate } from "./types";

// Helper to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

interface HonorariosSectionProps {
  pricingMode: PricingMode;
  onPricingModeChange: (mode: PricingMode) => void;
  
  // Servicios seleccionados (para calcular totales en modo per_service/summed)
  selectedServices: ServiceWithConfidence[];
  
  // Templates de pricing (para modo global)
  pricingTemplates: PricingTemplate[];
  selectedPricingId: string | null;
  
  // Valores actuales
  customInitialPayment: number;
  customMonthlyRetainer: number;
  customRetainerMonths: number;
  installments: PaymentInstallment[];
  retainerStartDescription: string;
  canCancelWithoutPenalty: boolean;
  
  // Callbacks
  onSelectTemplate: (templateId: string) => void;
  onUpdatePricing: (updates: {
    initialPayment?: number;
    monthlyRetainer?: number;
    retainerMonths?: number;
    installments?: PaymentInstallment[];
    retainerStartDescription?: string;
    canCancelWithoutPenalty?: boolean;
  }) => void;
  onUpdateServiceFee: (serviceId: string, fee: number, isMonthly: boolean) => void;
  
  // Para habilitar edición
  isConfirmed: boolean;
}

export function HonorariosSection({
  pricingMode,
  onPricingModeChange,
  selectedServices,
  pricingTemplates,
  selectedPricingId,
  customInitialPayment,
  customMonthlyRetainer,
  customRetainerMonths,
  installments,
  retainerStartDescription,
  canCancelWithoutPenalty,
  onSelectTemplate,
  onUpdatePricing,
  onUpdateServiceFee,
  isConfirmed,
}: HonorariosSectionProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isInstallmentsOpen, setIsInstallmentsOpen] = useState(false);

  // Calculate totals from selected services
  const serviceTotals = selectedServices.reduce(
    (acc, s) => {
      const feeType = s.service.fee_type || 'one_time';
      if (feeType === 'one_time' || feeType === 'both') {
        const fee = s.customFee ?? (s.service.suggested_fee ? Number(s.service.suggested_fee) : 0);
        acc.oneTime += fee;
      }
      if (feeType === 'monthly' || feeType === 'both') {
        const fee = s.customMonthlyFee ?? (s.service.suggested_monthly_fee ? Number(s.service.suggested_monthly_fee) : 0);
        acc.monthly += fee;
      }
      return acc;
    },
    { oneTime: 0, monthly: 0 }
  );

  // Determine which values to show based on pricing mode
  const displayInitial = pricingMode === 'global' ? customInitialPayment : serviceTotals.oneTime;
  const displayMonthly = pricingMode === 'global' ? customMonthlyRetainer : serviceTotals.monthly;
  const totalAmount = displayInitial + (displayMonthly * customRetainerMonths);

  const getPricingModeDescription = (mode: PricingMode) => {
    switch (mode) {
      case 'per_service':
        return 'Cada servicio muestra su precio individual';
      case 'summed':
        return 'Solo se muestra el total sumado';
      case 'global':
        return 'Honorarios configurados manualmente';
    }
  };

  return (
    <Card className={!isConfirmed ? "border-dashed border-muted-foreground/30 opacity-70" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            II. PROPUESTA DE HONORARIOS
          </CardTitle>
          {totalAmount > 0 && (
            <Badge variant="secondary" className="text-sm font-semibold">
              Total: {formatCurrency(totalAmount)}
            </Badge>
          )}
        </div>
        {!isConfirmed && (
          <p className="text-sm text-amber-600">
            Confirma los servicios primero para configurar honorarios
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Selector de modo de pricing */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <Label className="text-sm font-medium">¿Cómo calcular honorarios?</Label>
          <ToggleGroup
            type="single"
            value={pricingMode}
            onValueChange={(value) => value && onPricingModeChange(value as PricingMode)}
            className="justify-start flex-wrap gap-2"
            disabled={!isConfirmed}
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
              Sumatoria
            </ToggleGroupItem>
            <ToggleGroupItem
              value="global"
              className="flex items-center gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <Wallet className="h-4 w-4" />
              Global
            </ToggleGroupItem>
          </ToggleGroup>
          <p className="text-xs text-muted-foreground">
            {getPricingModeDescription(pricingMode)}
          </p>
        </div>

        {/* Edición de honorarios por servicio (solo en per_service mode) */}
        {pricingMode === 'per_service' && isConfirmed && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Honorarios por servicio</h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {selectedServices.map((item) => {
                const feeType = item.service.fee_type || 'one_time';
                const showOneTime = feeType === 'one_time' || feeType === 'both';
                const showMonthly = feeType === 'monthly' || feeType === 'both';
                const currentFee = item.customFee ?? (item.service.suggested_fee ? Number(item.service.suggested_fee) : 0);
                const currentMonthly = item.customMonthlyFee ?? (item.service.suggested_monthly_fee ? Number(item.service.suggested_monthly_fee) : 0);

                return (
                  <div key={item.service.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                    <span className="text-sm flex-1 truncate">{item.service.name}</span>
                    <div className="flex items-center gap-2">
                      {showOneTime && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">$</span>
                          <Input
                            type="number"
                            value={currentFee}
                            onChange={(e) => onUpdateServiceFee(item.service.id, parseFloat(e.target.value) || 0, false)}
                            className="w-24 h-7 text-xs"
                          />
                        </div>
                      )}
                      {showMonthly && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">/mes $</span>
                          <Input
                            type="number"
                            value={currentMonthly}
                            onChange={(e) => onUpdateServiceFee(item.service.id, parseFloat(e.target.value) || 0, true)}
                            className="w-24 h-7 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Resumen de totales (summed mode) */}
        {pricingMode === 'summed' && isConfirmed && (
          <div className="bg-primary/5 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-medium">Resumen de honorarios</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Pago inicial (total)</p>
                <p className="text-lg font-bold">{formatCurrency(serviceTotals.oneTime)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Iguala mensual (total)</p>
                <p className="text-lg font-bold">{formatCurrency(serviceTotals.monthly)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Basado en {selectedServices.length} servicio{selectedServices.length !== 1 ? 's' : ''} seleccionado{selectedServices.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Honorarios globales (global mode) */}
        {pricingMode === 'global' && isConfirmed && (
          <div className="space-y-4">
            {/* Selector de plantilla */}
            {pricingTemplates.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Usar plantilla de honorarios</Label>
                <div className="flex flex-wrap gap-2">
                  {pricingTemplates.map((template) => (
                    <Button
                      key={template.id}
                      variant={selectedPricingId === template.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => onSelectTemplate(template.id)}
                    >
                      {template.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Edición manual */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Pago inicial</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={customInitialPayment}
                    onChange={(e) => onUpdatePricing({ initialPayment: parseFloat(e.target.value) || 0 })}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Iguala mensual</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={customMonthlyRetainer}
                    onChange={(e) => onUpdatePricing({ monthlyRetainer: parseFloat(e.target.value) || 0 })}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Meses de iguala */}
        {isConfirmed && displayMonthly > 0 && (
          <div className="space-y-2">
            <Label className="text-sm">Meses de iguala</Label>
            <Input
              type="number"
              value={customRetainerMonths}
              onChange={(e) => onUpdatePricing({ retainerMonths: parseInt(e.target.value) || 12 })}
              className="w-24"
              min={1}
              max={36}
            />
          </div>
        )}

        {/* Configuración avanzada */}
        {isConfirmed && (
          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Configuración avanzada
                </span>
                {isAdvancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              {/* Esquema de pagos del pago inicial */}
              <InstallmentsEditor
                installments={installments}
                totalAmount={displayInitial}
                onChange={(newInstallments) => onUpdatePricing({ installments: newInstallments })}
              />
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
