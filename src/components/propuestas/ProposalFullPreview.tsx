import { ArrowLeft, Download, Send, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import type { ProposalPreviewData } from "./types";
import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface ProposalFullPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ProposalPreviewData;
  progress: number;
  isSaving: boolean;
  onSaveDraft: () => void;
  onDownloadPDF: () => void;
  onSendToClient: () => void;
}

// Fixed transition texts
const FIXED_TEXTS = {
  introSaludo: (firmName: string, serviceType: string) =>
    `Con el gusto de saludarle, en primer lugar, agradecemos la oportunidad de considerar a ${firmName} como sus asesores legales en relación con ${serviceType}.`,

  transicion:
    "Por lo anterior, será necesario analizar esquemas que permitan eficientizar, en la medida de lo posible y con total apego a derecho, los recursos económicos, humanos y materiales con que cuentan, así como implementar una estructura corporativa sólida de cara a las proyecciones de crecimiento que se tienen.",

  introParticipacion:
    "Por lo anterior, y tomando en consideración las necesidades concretas que se tienen, nuestra participación consistirá en lo siguiente:",

  introHonorarios:
    "La presente propuesta de honorarios se realiza con base en la experiencia del personal solicitado, así como el número de horas hombre que se dedicarán en el estudio, análisis, desarrollo, implementación y seguimiento continuo de la propuesta. Por tal motivo, se propone el siguiente esquema de honorarios:",

  despedida:
    "Como Firma, es un honor poder colaborar con ustedes brindándoles un servicio de la más alta calidad técnica y profesional. Agradecemos la oportunidad de presentarles esta propuesta de honorarios, y confiamos en la capacidad de nuestra Firma para brindarles un servicio que satisfaga sus necesidades, haciendo uso de nuestra amplia experiencia profesional.\n\nSin otro particular por el momento, reciba un cordial saludo, quedando a sus órdenes para cualquier duda o aclaración al respecto.",

  aceptacion:
    "En caso de aceptar la propuesta de honorarios que se describe en el cuerpo de la presente, les agradeceremos nos lo indiquen a fin de hacerles llegar una liga que permita hacerlo de forma electrónica.",
};

// Helper to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Helper to get last name
const getLastName = (fullName: string) => {
  const parts = fullName.trim().split(" ");
  if (parts.length >= 2) {
    return parts[parts.length - 2] || parts[1];
  }
  return parts[0];
};

export function ProposalFullPreview({
  open,
  onOpenChange,
  data,
  progress,
  isSaving,
  onSaveDraft,
  onDownloadPDF,
  onSendToClient,
}: ProposalFullPreviewProps) {
  const firmName = data.firmSettings?.name || "Nuestra Firma";
  const isComplete = progress >= 80;
  const contentRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;
    
    setIsGeneratingPDF(true);
    try {
      const element = contentRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgScaledWidth = imgWidth * ratio;
      const imgScaledHeight = imgHeight * ratio;
      
      // Handle multi-page if content is taller than one page
      const pageHeight = pdfHeight;
      const totalPages = Math.ceil((imgScaledHeight * (imgWidth / imgScaledWidth)) / (pageHeight * (imgWidth / pdfWidth)));
      
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();
        const yOffset = -page * pageHeight * (imgWidth / pdfWidth) / ratio;
        pdf.addImage(imgData, 'PNG', 0, yOffset * ratio, imgScaledWidth, imgScaledHeight);
      }
      
      const fileName = `Propuesta_${data.clientName || 'Cliente'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[95vh] p-0 gap-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a editar
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold">Vista previa final</span>
              <Badge variant={isComplete ? "default" : "secondary"} className="ml-2">
                {progress}% completo
              </Badge>
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto p-8">
            <div ref={contentRef} className="bg-white dark:bg-card rounded-lg border shadow-sm p-8">
              {/* ============ MEMBRETE ============ */}
              <div className="text-center mb-8">
                {data.firmSettings?.logo_url && (
                  <img
                    src={data.firmSettings.logo_url}
                    alt={firmName}
                    className="h-16 mx-auto mb-4 object-contain"
                  />
                )}
                <h1 className="text-xl font-bold text-primary">{firmName}</h1>
                {data.firmSettings && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {[data.firmSettings.phone, data.firmSettings.website]
                      .filter(Boolean)
                      .join(" | ")}
                  </p>
                )}
                {data.firmSettings?.address && (
                  <p className="text-sm text-muted-foreground">{data.firmSettings.address}</p>
                )}
              </div>

              <Separator className="my-6" />

              {/* ============ FECHA ============ */}
              <div className="text-right mb-8">
                <p className="text-sm">Ciudad de México, a {data.documentDate}</p>
              </div>

              {/* ============ DESTINATARIO ============ */}
              <div className="mb-8">
                <p className="font-semibold text-sm uppercase">
                  {data.primaryContact?.salutationPrefix || 'Sr.'} {data.primaryContact?.fullName || "[Nombre del Contacto]"}
                </p>
                {data.primaryContact?.position && (
                  <p className="text-sm text-muted-foreground">{data.primaryContact.position}</p>
                )}
                {data.entities.length > 0 ? (
                  <div className="mt-1">
                    {data.entities.map((entity, idx) => (
                      <p key={idx} className="text-sm font-medium">
                        {entity.legalName}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">[Razón Social]</p>
                )}
                <p className="font-semibold mt-3 text-sm">PRESENTE</p>
              </div>

              {/* ============ SALUDO ============ */}
              <div className="mb-8">
                <p className="text-sm mb-4">
                  <strong>Estimado {data.primaryContact?.salutationPrefix || 'Sr.'} {getLastName(data.primaryContact?.fullName || "Apellido")}:</strong>
                </p>
                <p className="text-sm leading-relaxed">
                  {FIXED_TEXTS.introSaludo(
                    firmName,
                    "el análisis y planeación corporativo-fiscal requerido"
                  )}{" "}
                  {data.groupAlias && (
                    <>
                      (en adelante indistintamente como "<strong>{data.groupAlias}</strong>" o "las Empresas").
                    </>
                  )}
                </p>
              </div>

              {/* ============ I. ANTECEDENTES Y ALCANCE ============ */}
              <section className="mb-8">
                <h2 className="text-base font-bold mb-4 text-primary border-b pb-2">
                  I. ANTECEDENTES Y ALCANCE DE LOS SERVICIOS
                </h2>

                {data.background && (
                  <p className="text-sm leading-relaxed mb-4 whitespace-pre-line">
                    {data.background}
                  </p>
                )}

                {!data.background && data.industry && (
                  <p className="text-sm leading-relaxed mb-4">
                    Derivado de la información que amablemente nos ha sido proporcionada, sabemos
                    que {data.groupAlias || data.clientName} se dedica principalmente a{" "}
                    {data.industry.toLowerCase()}.
                    {data.entityCount > 0 && (
                      <> Asimismo, sabemos que actualmente operan con {data.entityCount} razones sociales</>
                    )}
                    {data.employeeCount > 0 && (
                      <>, así como una plantilla laboral de aproximadamente {data.employeeCount} colaboradores</>
                    )}
                    .
                  </p>
                )}

                {data.selectedServices.length > 0 && (
                  <>
                    <p className="text-sm mb-4">
                      Finalmente, sabemos que gracias al crecimiento sostenido que han tenido, las
                      Empresas requieren la implementación de los siguientes servicios:
                    </p>
                    <div className="space-y-3 mb-4 pl-4">
                      {data.selectedServices.map((item, index) => (
                        <div key={item.service.id}>
                          <p className="text-sm">
                            <strong>{String.fromCharCode(97 + index)}) {item.service.name}:</strong>{" "}
                            {item.customText || item.service.standard_text || item.service.description}
                          </p>
                        </div>
                      ))}
                    </div>

                    <p className="text-sm leading-relaxed mb-4">{FIXED_TEXTS.transicion}</p>
                    <p className="text-sm leading-relaxed">{FIXED_TEXTS.introParticipacion}</p>
                  </>
                )}
              </section>

              {/* ============ II. PROPUESTA DE HONORARIOS ============ */}
              {(data.pricing.totalAmount > 0 || data.selectedServices.length > 0) && (
                <section className="mb-8">
                  <h2 className="text-base font-bold mb-4 text-primary border-b pb-2">
                    II. PROPUESTA DE HONORARIOS
                  </h2>

                  <p className="text-sm leading-relaxed mb-4">{FIXED_TEXTS.introHonorarios}</p>

                  <div className="space-y-4 mb-4">
                    {data.selectedServices.length > 0 && (
                      <div className="space-y-3 pl-4">
                        {data.selectedServices.map((item, index) => {
                          const serviceText = item.customText || item.service.standard_text || item.service.description;
                          
                          if (data.pricingMode === 'per_service') {
                            const feeType = item.service.fee_type || 'one_time';
                            const showOneTime = feeType === 'one_time' || feeType === 'both';
                            const showMonthly = feeType === 'monthly' || feeType === 'both';
                            const fee = item.customFee ?? (item.service.suggested_fee ? Number(item.service.suggested_fee) : 0);
                            const monthlyFee = item.customMonthlyFee ?? (item.service.suggested_monthly_fee ? Number(item.service.suggested_monthly_fee) : 0);
                            const hasFee = (showOneTime && fee > 0) || (showMonthly && monthlyFee > 0);

                            return (
                              <div key={item.service.id}>
                                <p className="text-sm mb-1">
                                  <strong>{String.fromCharCode(97 + index)}) {item.service.name}:</strong>
                                </p>
                                {serviceText && (
                                  <p className="text-sm mb-2 ml-4 text-muted-foreground">
                                    {serviceText}
                                  </p>
                                )}
                                {hasFee && (
                                  <p className="text-sm ml-4">
                                    <strong>Honorarios:</strong>{" "}
                                    {showOneTime && fee > 0 && (
                                      <>
                                        Un pago de <strong>{formatCurrency(fee)}</strong> más IVA
                                        {showMonthly && monthlyFee > 0 ? ", más " : "."}
                                      </>
                                    )}
                                    {showMonthly && monthlyFee > 0 && (
                                      <>
                                        una iguala mensual de <strong>{formatCurrency(monthlyFee)}</strong> más IVA.
                                      </>
                                    )}
                                  </p>
                                )}
                              </div>
                            );
                          }

                          return (
                            <div key={item.service.id}>
                              <p className="text-sm mb-1">
                                <strong>{String.fromCharCode(97 + index)}) {item.service.name}:</strong>
                              </p>
                              {serviceText && (
                                <p className="text-sm ml-4 text-muted-foreground">
                                  {serviceText}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {data.pricing.initialPayment > 0 && (
                      <div className="pl-4 mt-4 pt-3 border-t border-dashed">
                        <p className="text-sm">
                          <strong>Total pago inicial:</strong>{" "}
                          <strong className="text-primary">{formatCurrency(data.pricing.initialPayment)}</strong> más IVA.
                          {data.pricing.paymentSplit && data.pricing.paymentSplit !== "100" && (
                            <> Dicho honorario podrá ser cubierto en {data.pricing.paymentSplit.split("/").length} exhibiciones ({data.pricing.paymentSplit}).</>
                          )}
                        </p>
                      </div>
                    )}

                    {data.pricing.monthlyRetainer > 0 && (
                      <div className="pl-4">
                        <p className="text-sm">
                          <strong>Total iguala mensual:</strong>{" "}
                          <strong className="text-primary">{formatCurrency(data.pricing.monthlyRetainer)}</strong> más IVA por
                          un plazo de {data.pricing.retainerMonths} meses.
                        </p>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {data.pricing.exclusionsText || 
                      "La presente propuesta no incluye servicios o gastos adicionales que no se encuentren expresamente previstos tales como gastos notariales, pago de derechos, cuotas de terceros, legalización o apostilla de documentos, entre otros."}
                  </p>
                </section>
              )}

              {/* ============ III. GARANTÍAS ============ */}
              {data.firmSettings?.guarantees_text && (
                <section className="mb-8">
                  <h2 className="text-base font-bold mb-4 text-primary border-b pb-2">
                    III. GARANTÍAS DE SATISFACCIÓN
                  </h2>
                  <p className="text-sm leading-relaxed whitespace-pre-line">
                    {data.firmSettings.guarantees_text}
                  </p>
                </section>
              )}

              {/* ============ CIERRE ============ */}
              <section className="mb-8">
                <Separator className="my-6" />
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {data.firmSettings?.closing_text || FIXED_TEXTS.despedida}
                </p>
              </section>

              {/* ============ FIRMA ============ */}
              <div className="mt-8 pt-4">
                <p className="text-sm font-semibold">{firmName}</p>
              </div>

              {/* ============ ACEPTACIÓN ============ */}
              <section className="mt-8 pt-6 border-t">
                <h3 className="text-sm font-bold mb-3 text-primary">ACEPTACIÓN</h3>
                <p className="text-sm leading-relaxed">{FIXED_TEXTS.aceptacion}</p>
              </section>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
          <div className="text-sm text-muted-foreground">
            {!isComplete && (
              <span className="text-amber-600 dark:text-amber-400">
                ⚠️ La propuesta aún no está completa ({progress}%)
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleDownloadPDF} disabled={isGeneratingPDF}>
              {isGeneratingPDF ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isGeneratingPDF ? "Generando..." : "Descargar PDF"}
            </Button>
            <Button onClick={onSendToClient} disabled={!isComplete}>
              <Send className="h-4 w-4 mr-2" />
              Enviar al cliente
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
