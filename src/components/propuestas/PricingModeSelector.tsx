import { Sparkles, Calculator, ListOrdered, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { PricingMode } from "./types";

interface PricingModeSelectorProps {
  pricingMode: PricingMode;
  onPricingModeChange: (mode: PricingMode) => void;
  preSelectedCount: number;
  selectedCount: number;
}

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

export function PricingModeSelector({
  pricingMode,
  onPricingModeChange,
  preSelectedCount,
  selectedCount,
}: PricingModeSelectorProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">CONFIGURACIÓN DE HONORARIOS</CardTitle>
          <Badge variant="secondary" className="text-xs gap-1">
            <Sparkles className="h-3 w-3" />
            IA PRE-SELECCIONÓ {preSelectedCount}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {selectedCount} servicio{selectedCount !== 1 ? "s" : ""} seleccionado{selectedCount !== 1 ? "s" : ""}
        </p>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
