import { DollarSign, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InstallmentsEditor } from "./InstallmentsEditor";
import type { PricingTemplate, PaymentInstallment } from "./types";

interface PricingSectionProps {
  templates: PricingTemplate[];
  selectedTemplateId: string | null;
  customInitialPayment: number;
  customMonthlyRetainer: number;
  customRetainerMonths: number;
  installments: PaymentInstallment[];
  retainerStartDescription: string;
  canCancelWithoutPenalty: boolean;
  onSelectTemplate: (templateId: string) => void;
  onUpdatePricing: (updates: {
    initialPayment?: number;
    monthlyRetainer?: number;
    retainerMonths?: number;
    installments?: PaymentInstallment[];
    retainerStartDescription?: string;
    canCancelWithoutPenalty?: boolean;
  }) => void;
}

export function PricingSection({
  templates,
  selectedTemplateId,
  customInitialPayment,
  customMonthlyRetainer,
  customRetainerMonths,
  installments,
  retainerStartDescription,
  canCancelWithoutPenalty,
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

        {/* Installments Editor */}
        {customInitialPayment > 0 && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <InstallmentsEditor
              installments={installments}
              onChange={(newInstallments) =>
                onUpdatePricing({ installments: newInstallments })
              }
              totalAmount={customInitialPayment}
            />
          </div>
        )}

        {/* Iguala mensual section */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
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

          {/* Retainer start description */}
          {customMonthlyRetainer > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <Label className="text-xs text-muted-foreground">
                Descripción de inicio de la iguala
              </Label>
              <Textarea
                value={retainerStartDescription}
                onChange={(e) =>
                  onUpdatePricing({ retainerStartDescription: e.target.value })
                }
                placeholder="El inicio de esta etapa será a libre decisión del cliente"
                className="text-sm resize-none"
                rows={2}
              />
              
              <div className="flex items-center justify-between pt-2">
                <Label className="text-xs text-muted-foreground">
                  Cliente puede cancelar sin penalidad
                </Label>
                <Switch
                  checked={canCancelWithoutPenalty}
                  onCheckedChange={(checked) =>
                    onUpdatePricing({ canCancelWithoutPenalty: checked })
                  }
                />
              </div>
            </div>
          )}
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
