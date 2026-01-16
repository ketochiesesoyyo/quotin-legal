import { useState } from "react";
import { DollarSign, TrendingUp, ChevronDown, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { PricingTemplate, PricingMode } from "./types";

interface PricingSectionProps {
  templates: PricingTemplate[];
  selectedTemplateId: string | null;
  customInitialPayment: number;
  customMonthlyRetainer: number;
  customRetainerMonths: number;
  paymentSplit: string;
  estimatedSavings: number;
  servicesTotalOneTime: number;
  servicesTotalMonthly: number;
  pricingMode: PricingMode;
  onSelectTemplate: (templateId: string) => void;
  onUpdatePricing: (updates: {
    initialPayment?: number;
    monthlyRetainer?: number;
    retainerMonths?: number;
    paymentSplit?: string;
  }) => void;
}

export function PricingSection({
  templates,
  selectedTemplateId,
  customInitialPayment,
  customMonthlyRetainer,
  customRetainerMonths,
  paymentSplit,
  estimatedSavings,
  servicesTotalOneTime,
  servicesTotalMonthly,
  pricingMode,
  onSelectTemplate,
  onUpdatePricing,
}: PricingSectionProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const totalCost =
    customInitialPayment + customMonthlyRetainer * customRetainerMonths;
  const roi = totalCost > 0 ? (estimatedSavings / totalCost).toFixed(1) : "0";

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPaymentSchemeText = () => {
    if (customRetainerMonths > 0 && customMonthlyRetainer > 0) {
      const parts = paymentSplit.split("/");
      if (parts.length > 1) {
        return `${parts.length} pagos: ${paymentSplit}`;
      }
      return `${customRetainerMonths} mensualidades`;
    }
    return "Pago único";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">HONORARIOS</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsConfigOpen(!isConfigOpen)}
          >
            <Settings className="h-4 w-4 mr-1" />
            Configurar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Services-based pricing info - only show when not using global mode */}
        {pricingMode !== 'global' && (servicesTotalOneTime > 0 || servicesTotalMonthly > 0) && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">
              {pricingMode === 'per_service' 
                ? 'Calculado desde servicios (desglose en propuesta):' 
                : 'Calculado desde servicios (solo total en propuesta):'}
            </p>
            <div className="flex gap-4 text-sm">
              {servicesTotalOneTime > 0 && (
                <span className="text-blue-600 dark:text-blue-400">
                  Único: <strong>{formatCurrency(servicesTotalOneTime)}</strong>
                </span>
              )}
              {servicesTotalMonthly > 0 && (
                <span className="text-blue-600 dark:text-blue-400">
                  Mensual: <strong>{formatCurrency(servicesTotalMonthly)}</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Global mode indicator */}
        {pricingMode === 'global' && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
              Modo global activo: Los precios individuales de servicios serán ignorados. 
              Configura los honorarios manualmente o selecciona una plantilla.
            </p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">MONTO BASE</p>
            <p className="font-bold text-lg">{formatCurrency(totalCost)}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">ESQUEMA DE PAGO</p>
            <p className="font-medium text-sm">{getPaymentSchemeText()}</p>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-xs text-muted-foreground mb-1">ROI ESTIMADO</p>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="font-bold text-lg text-green-600">{roi}x</span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              Ahorro de {formatCurrency(estimatedSavings)} vs inversión de{" "}
              {formatCurrency(totalCost)}
            </p>
          </div>
        </div>

        {/* Configuration Panel */}
        <Collapsible open={isConfigOpen} onOpenChange={setIsConfigOpen}>
          <CollapsibleContent>
            <div className="border rounded-lg p-4 mt-4 space-y-4 bg-muted/30">
              {/* Template Selector */}
              <div className="space-y-2">
                <Label>Plantilla de honorarios</Label>
                <Select
                  value={selectedTemplateId || "custom"}
                  onValueChange={(value) => {
                    if (value !== "custom") {
                      onSelectTemplate(value);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una plantilla" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Personalizado</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Initial Payment */}
                <div className="space-y-2">
                  <Label>Pago inicial</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={customInitialPayment}
                      onChange={(e) =>
                        onUpdatePricing({
                          initialPayment: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="pl-9"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Payment Split */}
                <div className="space-y-2">
                  <Label>División del pago inicial</Label>
                  <Select
                    value={paymentSplit}
                    onValueChange={(value) =>
                      onUpdatePricing({ paymentSplit: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">Pago único (100%)</SelectItem>
                      <SelectItem value="50/50">2 pagos (50/50)</SelectItem>
                      <SelectItem value="50/25/25">3 pagos (50/25/25)</SelectItem>
                      <SelectItem value="40/30/30">3 pagos (40/30/30)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Monthly Retainer */}
                <div className="space-y-2">
                  <Label>Iguala mensual</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={customMonthlyRetainer}
                      onChange={(e) =>
                        onUpdatePricing({
                          monthlyRetainer: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="pl-9"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Retainer Months */}
                <div className="space-y-2">
                  <Label>Meses de iguala</Label>
                  <Input
                    type="number"
                    value={customRetainerMonths}
                    onChange={(e) =>
                      onUpdatePricing({
                        retainerMonths: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="12"
                    min="0"
                    max="60"
                  />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
