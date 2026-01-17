import { useState } from "react";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { PaymentInstallment } from "./types";

interface InstallmentsEditorProps {
  installments: PaymentInstallment[];
  onChange: (installments: PaymentInstallment[]) => void;
  totalAmount: number;
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

// Common installment descriptions
const COMMON_DESCRIPTIONS = [
  "al momento de aceptación de la presente propuesta",
  "al momento de presentación de la propuesta de reestructura",
  "al momento de la firma del contrato",
  "al momento de entrega del dictamen",
  "a los 30 días de iniciado el proyecto",
  "al finalizar la primera etapa",
];

export function InstallmentsEditor({
  installments,
  onChange,
  totalAmount,
}: InstallmentsEditorProps) {
  const totalPercentage = installments.reduce((sum, i) => sum + i.percentage, 0);
  const isValid = totalPercentage === 100;

  const handleAddInstallment = () => {
    const remaining = 100 - totalPercentage;
    onChange([
      ...installments,
      {
        percentage: remaining > 0 ? remaining : 25,
        description: "",
      },
    ]);
  };

  const handleRemoveInstallment = (index: number) => {
    onChange(installments.filter((_, i) => i !== index));
  };

  const handleUpdateInstallment = (
    index: number,
    field: keyof PaymentInstallment,
    value: string | number
  ) => {
    const updated = installments.map((inst, i) =>
      i === index ? { ...inst, [field]: value } : inst
    );
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">
          División del pago inicial
        </Label>
        <Badge
          variant={isValid ? "secondary" : "destructive"}
          className="text-xs"
        >
          {totalPercentage}% de 100%
        </Badge>
      </div>

      {!isValid && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          Los porcentajes deben sumar 100%
        </div>
      )}

      <div className="space-y-2">
        {installments.map((inst, index) => {
          const amount = (totalAmount * inst.percentage) / 100;
          return (
            <div
              key={index}
              className="p-3 bg-muted/30 rounded-lg space-y-2 border border-border"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Pago {index + 1}
                </span>
                {installments.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-auto text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveInstallment(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-[80px_1fr] gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">%</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={inst.percentage}
                    onChange={(e) =>
                      handleUpdateInstallment(
                        index,
                        "percentage",
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">
                      Descripción
                    </Label>
                    <span className="text-xs font-medium">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                  <Input
                    type="text"
                    value={inst.description}
                    onChange={(e) =>
                      handleUpdateInstallment(index, "description", e.target.value)
                    }
                    placeholder="al momento de..."
                    className="h-8 text-sm"
                    list={`descriptions-${index}`}
                  />
                  <datalist id={`descriptions-${index}`}>
                    {COMMON_DESCRIPTIONS.map((desc) => (
                      <option key={desc} value={desc} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleAddInstallment}
      >
        <Plus className="h-4 w-4 mr-1" />
        Agregar tramo
      </Button>
    </div>
  );
}
