import { ShieldCheck, ExternalLink, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";

interface GuaranteesSectionProps {
  guaranteesText: string | null;
  disclaimersText?: string | null;
  closingText?: string | null;
  canEdit?: boolean;
}

export function GuaranteesSection({
  guaranteesText,
  disclaimersText,
  closingText,
  canEdit = false,
}: GuaranteesSectionProps) {
  const hasContent = guaranteesText || disclaimersText || closingText;

  return (
    <Card className="border-muted-foreground/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            III. GARANTÍAS DE SATISFACCIÓN
          </CardTitle>
          <Badge variant="outline" className="text-xs text-muted-foreground">
            <Info className="h-3 w-3 mr-1" />
            Texto fijo
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Este texto viene de la configuración de la firma
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasContent ? (
          <ScrollArea className="max-h-[250px]">
            <div className="space-y-4">
              {/* Garantías */}
              {guaranteesText && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Garantías</h4>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm whitespace-pre-line">{guaranteesText}</p>
                  </div>
                </div>
              )}

              {/* Disclaimers */}
              {disclaimersText && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Limitaciones</h4>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm whitespace-pre-line">{disclaimersText}</p>
                  </div>
                </div>
              )}

              {/* Closing */}
              {closingText && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Cierre</h4>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm whitespace-pre-line">{closingText}</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <ShieldCheck className="h-8 w-8 mb-3 opacity-50" />
            <p className="text-sm">
              No hay texto de garantías configurado.
            </p>
            {canEdit && (
              <p className="text-xs mt-1">
                Puedes configurarlo en los ajustes de la firma.
              </p>
            )}
          </div>
        )}

        {/* Link para editar si tiene permisos */}
        {canEdit && (
          <div className="pt-2 border-t">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <Link to="/configuracion">
                <ExternalLink className="h-4 w-4 mr-1" />
                Editar en Configuración
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
