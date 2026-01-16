import { Check, AlertTriangle, FileCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ValidatedData {
  rfc: string | null;
  opinion32d: { status: string; validUntil: string } | null;
  declaredIncome: number | null;
  unusedDeductions: number | null;
}

interface ValidatedDataSectionProps {
  data: ValidatedData;
}

export function ValidatedDataSection({ data }: ValidatedDataSectionProps) {
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "No disponible";
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
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">DATOS VALIDADOS</CardTitle>
          <Badge variant="secondary" className="text-xs gap-1">
            <FileCheck className="h-3 w-3" />
            De Documentos
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* RFC */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">RFC VALIDADO</p>
            {data.rfc ? (
              <p className="font-mono font-semibold">{data.rfc}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No disponible</p>
            )}
          </div>

          {/* Opinión 32-D */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">OPINIÓN 32-D</p>
            {data.opinion32d ? (
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">{data.opinion32d.status}</span>
                <span className="text-xs text-muted-foreground">
                  (vigente hasta {data.opinion32d.validUntil})
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No disponible</p>
            )}
          </div>

          {/* Ingresos Declarados */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">INGRESOS DECLARADOS 2024</p>
            <p className="font-semibold">{formatCurrency(data.declaredIncome)}</p>
          </div>

          {/* Deducciones No Aprovechadas */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">DEDUCCIONES NO APROVECHADAS</p>
            {data.unusedDeductions && data.unusedDeductions > 0 ? (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="font-semibold text-amber-600">
                  {formatCurrency(data.unusedDeductions)} detectados
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No detectadas</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
