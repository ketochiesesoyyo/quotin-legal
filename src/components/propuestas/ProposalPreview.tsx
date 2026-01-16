import { FileText, Download, Send, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { ProposalPreviewData } from "./types";

interface ProposalPreviewProps {
  data: ProposalPreviewData;
  isGenerating: boolean;
  onGenerate: () => void;
  onDownload: () => void;
  onSend: () => void;
}

export function ProposalPreview({
  data,
  isGenerating,
  onGenerate,
  onDownload,
  onSend,
}: ProposalPreviewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const hasContent = data.background || data.selectedServices.length > 0;

  return (
    <div className="h-full flex flex-col bg-card border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Vista previa
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onDownload} disabled={!hasContent}>
              <Download className="h-4 w-4 mr-1" />
              Descargar
            </Button>
            <Button variant="outline" size="sm" onClick={onSend} disabled={!hasContent}>
              <Send className="h-4 w-4 mr-1" />
              Enviar
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {!hasContent ? (
            <div className="text-center py-20">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">Vista previa vacía</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Completa las secciones del editor para ver cómo quedará la propuesta final
              </p>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {/* Document Header */}
              <div className="text-center mb-8">
                <h1 className="text-xl font-bold mb-2">PROPUESTA DE SERVICIOS LEGALES</h1>
                <p className="text-muted-foreground">
                  Preparada para: <strong>{data.clientName}</strong>
                </p>
              </div>

              <Separator className="my-6" />

              {/* Antecedentes */}
              {data.background && (
                <section className="mb-6">
                  <h2 className="text-base font-bold mb-3 text-primary">I. ANTECEDENTES</h2>
                  <p className="text-sm leading-relaxed">{data.background}</p>
                </section>
              )}

              {/* Servicios */}
              {data.selectedServices.length > 0 && (
                <section className="mb-6">
                  <h2 className="text-base font-bold mb-3 text-primary">II. ALCANCE DE SERVICIOS</h2>
                  <p className="text-sm mb-4">
                    Para atender las necesidades identificadas, proponemos los siguientes servicios:
                  </p>
                  <div className="space-y-4">
                    {data.selectedServices.map((item, index) => (
                      <div key={item.service.id} className="pl-4 border-l-2 border-primary/30">
                        <h3 className="font-semibold text-sm">
                          {String.fromCharCode(97 + index)}) {item.service.name}
                        </h3>
                        {(item.customText || item.service.standard_text) && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.customText || item.service.standard_text}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Honorarios */}
              {data.pricing.baseAmount > 0 && (
                <section className="mb-6">
                  <h2 className="text-base font-bold mb-3 text-primary">III. HONORARIOS</h2>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Monto Total</p>
                        <p className="font-bold text-lg">{formatCurrency(data.pricing.baseAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Esquema de Pago</p>
                        <p className="font-medium">{data.pricing.paymentScheme}</p>
                      </div>
                    </div>
                    {data.pricing.roi && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-green-600">
                          <strong>ROI Estimado:</strong> {data.pricing.roi}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Footer */}
              <Separator className="my-6" />
              <p className="text-xs text-center text-muted-foreground">
                Esta propuesta tiene vigencia de 30 días a partir de su fecha de envío.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Generate Button */}
      <div className="p-4 border-t bg-muted/30">
        <Button
          className="w-full"
          size="lg"
          onClick={onGenerate}
          disabled={isGenerating || !hasContent}
        >
          {isGenerating ? (
            <>Generando propuesta...</>
          ) : (
            <>
              <FileText className="h-5 w-5 mr-2" />
              Generar Propuesta
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
