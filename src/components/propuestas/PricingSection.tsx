import { DollarSign, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PricingTemplate } from "./types";

interface PricingSectionProps {
  templates: PricingTemplate[];
  selectedTemplateId: string | null;
  customInitialPayment: number;
  customMonthlyRetainer: number;
  customRetainerMonths: number;
  paymentSplit: string;
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
  onSelectTemplate,
  onUpdatePricing,
}: PricingSectionProps) {

  const totalCost =
    customInitialPayment + customMonthlyRetainer * customRetainerMonths;

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
        <CardTitle className="text-base font-semibold">HONORARIOS GLOBALES</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Selector */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Plantilla de honorarios</Label>
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

        {/* 5 Input Cards Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Pago inicial */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <Label className="text-xs text-muted-foreground">Pago inicial</Label>
            <div className="relative">
              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                value={customInitialPayment}
                onChange={(e) =>
                  onUpdatePricing({
                    initialPayment: parseFloat(e.target.value) || 0,
                  })
                }
                className="pl-8 h-9"
                placeholder="0"
              />
            </div>
          </div>

          {/* División del pago inicial */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <Label className="text-xs text-muted-foreground">División del pago</Label>
            <Select
              value={paymentSplit}
              onValueChange={(value) =>
                onUpdatePricing({ paymentSplit: value })
              }
            >
              <SelectTrigger className="h-9">
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

          {/* Iguala mensual */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <Label className="text-xs text-muted-foreground">Iguala mensual</Label>
            <div className="relative">
              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                value={customMonthlyRetainer}
                onChange={(e) =>
                  onUpdatePricing({
                    monthlyRetainer: parseFloat(e.target.value) || 0,
                  })
                }
                className="pl-8 h-9"
                placeholder="0"
              />
            </div>
          </div>

          {/* Meses de iguala */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <Label className="text-xs text-muted-foreground">Meses de iguala</Label>
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                value={customRetainerMonths}
                onChange={(e) =>
                  onUpdatePricing({
                    retainerMonths: parseInt(e.target.value) || 0,
                  })
                }
                className="pl-8 h-9"
                placeholder="12"
                min="0"
                max="60"
              />
            </div>
          </div>
        </div>

        {/* Total Summary */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total del proyecto:</span>
            <span className="text-lg font-bold">{formatCurrency(totalCost)}</span>
          </div>
          {customMonthlyRetainer > 0 && customRetainerMonths > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(customInitialPayment)} inicial + {formatCurrency(customMonthlyRetainer)} × {customRetainerMonths} meses
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
