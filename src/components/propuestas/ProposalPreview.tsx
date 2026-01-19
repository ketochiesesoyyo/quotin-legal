import { useState, useCallback, useRef, useMemo } from "react";
import { FileText, Eye, ArrowRight, Sparkles, Pencil, MousePointer2, History, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EditableSection } from "./EditableSection";
import { TextSelectionToolbar } from "./TextSelectionToolbar";
import { EditHistoryPanel } from "./EditHistoryPanel";
import type { ProposalPreviewData, ServiceDescription, TextOverride } from "./types";

interface ProposalPreviewProps {
  data: ProposalPreviewData;
  isGenerating: boolean;
  onGenerate: () => void;
  // New props for inline editing
  textOverrides?: TextOverride[];
  onTextOverride?: (override: TextOverride) => void;
  onRestoreOriginal?: (sectionId: string) => void;
  onAIRewrite?: (originalText: string, instruction: string, sectionId: string) => Promise<string>;
  clientContext?: {
    clientName: string;
    industry: string | null;
  };
}

// Fixed transition texts - used as fallbacks when AI content not generated
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

// Helper to convert number to Spanish words (for amounts)
const numberToSpanishWords = (num: number): string => {
  if (num === 0) return "cero";
  
  const units = ["", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
  const teens = ["diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve"];
  const tens = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
  const hundreds = ["", "cien", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];
  
  const convertThousands = (n: number): string => {
    if (n === 0) return "";
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      if (n === 21) return "veintiún";
      if (n < 30) return n === 20 ? "veinte" : "veinti" + units[n % 10];
      return tens[Math.floor(n / 10)] + (n % 10 ? " y " + units[n % 10] : "");
    }
    if (n < 1000) {
      if (n === 100) return "cien";
      return hundreds[Math.floor(n / 100)] + (n % 100 ? " " + convertThousands(n % 100) : "");
    }
    if (n < 1000000) {
      const thousands = Math.floor(n / 1000);
      const remainder = n % 1000;
      if (thousands === 1) return "mil" + (remainder ? " " + convertThousands(remainder) : "");
      return convertThousands(thousands) + " mil" + (remainder ? " " + convertThousands(remainder) : "");
    }
    return num.toLocaleString("es-MX");
  };
  
  const integerPart = Math.floor(num);
  const result = convertThousands(integerPart);
  
  // Capitalize first letter
  return result.charAt(0).toUpperCase() + result.slice(1);
};

// Helper to get last name
const getLastName = (fullName: string) => {
  const parts = fullName.trim().split(" ");
  // If more than 2 parts, take the one after first name (handling compound names)
  if (parts.length >= 2) {
    // Try to detect common patterns
    return parts[parts.length - 2] || parts[1];
  }
  return parts[0];
};

interface SelectionState {
  text: string;
  sectionId: string;
  position: { top: number; left: number };
}

export function ProposalPreview({
  data,
  isGenerating,
  onGenerate,
  textOverrides = [],
  onTextOverride,
  onRestoreOriginal,
  onAIRewrite,
  clientContext,
}: ProposalPreviewProps) {
  const hasContent = data.background || data.selectedServices.length > 0;
  const firmName = data.firmSettings?.name || "Nuestra Firma";
  const hasGeneratedContent = !!data.generatedContent;
  
  // Reference to preview container for relative positioning
  const previewContainerRef = useRef<HTMLDivElement>(null);
  
  // State for text selection toolbar
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [isRewriting, setIsRewriting] = useState(false);
  
  // Explicit toggle for edit mode
  const [isEditModeActive, setIsEditModeActive] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  // Check if editing is enabled (has handlers AND mode is active)
  const canEdit = !!onTextOverride;
  const isEditingEnabled = canEdit && isEditModeActive;
  
  // Helper to get override for a section
  const getOverride = useCallback((sectionId: string): TextOverride | undefined => {
    return textOverrides.find(o => o.sectionId === sectionId);
  }, [textOverrides]);
  
  // Helper to get text with override applied
  const getTextWithOverride = useCallback((sectionId: string, originalText: string): string => {
    const override = getOverride(sectionId);
    return override?.newText || originalText;
  }, [getOverride]);
  
  // Handler for text selection - calculates position relative to container
  const handleTextSelection = useCallback((selectionData: {
    text: string;
    sectionId: string;
    position: { top: number; left: number };
  }) => {
    if (!isEditingEnabled || !previewContainerRef.current) return;
    
    // Get container bounds to calculate relative position
    const containerRect = previewContainerRef.current.getBoundingClientRect();
    
    // Adjust position to be relative to the container
    const adjustedPosition = {
      top: selectionData.position.top - containerRect.top,
      left: selectionData.position.left - containerRect.left,
    };
    
    setSelection({
      ...selectionData,
      position: adjustedPosition,
    });
  }, [isEditingEnabled]);
  
  // Handler for manual edit
  const handleManualEdit = useCallback((newText: string) => {
    if (!selection || !onTextOverride) return;
    
    onTextOverride({
      sectionId: selection.sectionId,
      originalText: selection.text,
      newText,
      isAIGenerated: false,
      timestamp: new Date().toISOString(),
    });
    
    setSelection(null);
  }, [selection, onTextOverride]);
  
  // Handler for AI rewrite
  const handleAIRewriteRequest = useCallback(async (instruction: string): Promise<string> => {
    if (!selection || !onAIRewrite) {
      throw new Error("No selection or AI rewrite handler");
    }
    
    setIsRewriting(true);
    try {
      const result = await onAIRewrite(selection.text, instruction, selection.sectionId);
      return result;
    } finally {
      setIsRewriting(false);
    }
  }, [selection, onAIRewrite]);
  
  // Accept AI rewrite result
  const handleAcceptAIRewrite = useCallback((newText: string, instruction: string) => {
    if (!selection || !onTextOverride) return;
    
    onTextOverride({
      sectionId: selection.sectionId,
      originalText: selection.text,
      newText,
      isAIGenerated: true,
      instruction,
      timestamp: new Date().toISOString(),
    });
    
    setSelection(null);
  }, [selection, onTextOverride]);
  
  // Helper to get generated description for a service
  const getGeneratedServiceDescription = (serviceId: string): ServiceDescription | undefined => {
    return data.generatedContent?.serviceDescriptions?.find(sd => sd.serviceId === serviceId);
  };
  
  // Count edits
  const editCount = textOverrides.length;
  
  // Helper to get section labels for history panel
  const getSectionLabel = useMemo(() => {
    return (sectionId: string): string => {
      if (sectionId === "background") return "Antecedentes";
      if (sectionId.startsWith("service-")) {
        const serviceId = sectionId.replace("service-", "");
        const service = data.selectedServices.find(s => s.service.id === serviceId);
        return service?.service.name || "Servicio";
      }
      if (sectionId === "transition") return "Texto de transición";
      if (sectionId === "closing") return "Cierre";
      return sectionId;
    };
  }, [data.selectedServices]);
  
  return (
    <div className="h-full flex flex-col bg-card border rounded-lg overflow-hidden min-h-0 max-w-full isolate">
      {/* Header */}
      <div className="p-4 border-b bg-muted/30 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Vista previa
          </h2>
          <div className="flex items-center gap-2">
            {/* History toggle button */}
            {editCount > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isHistoryOpen ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                    >
                      <History className="h-4 w-4" />
                      <span className="text-xs">{editCount}</span>
                      {isHistoryOpen ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isHistoryOpen ? "Ocultar historial" : "Ver historial de ediciones"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Toggle edit mode button */}
            {canEdit && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isEditModeActive ? "default" : "outline"}
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        setIsEditModeActive(!isEditModeActive);
                        setSelection(null);
                      }}
                    >
                      <MousePointer2 className="h-4 w-4" />
                      {isEditModeActive ? "Modo edición activo" : "Editar texto"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isEditModeActive 
                      ? "Selecciona texto en la vista previa para editarlo manualmente o con IA"
                      : "Activa el modo de edición para modificar texto directamente"
                    }
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        
        {/* Active edit mode indicator */}
        {isEditModeActive && (
          <div className="mt-2 flex items-center gap-2 text-xs text-primary bg-primary/5 border border-primary/20 rounded-md p-2">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>
              <strong>Modo edición activo:</strong> Selecciona cualquier texto para editarlo manualmente o reescribirlo con IA
            </span>
          </div>
        )}
        
        {/* History panel (collapsible) */}
        {isHistoryOpen && editCount > 0 && (
          <div className="mt-3 border rounded-lg bg-background max-h-64 overflow-hidden">
            <EditHistoryPanel
              overrides={textOverrides}
              onRestore={(sectionId) => {
                onRestoreOriginal?.(sectionId);
              }}
              getSectionLabel={getSectionLabel}
            />
          </div>
        )}
      </div>

      {/* Preview Content */}
      <ScrollArea className="flex-1 min-h-0 overflow-hidden">
        <div ref={previewContainerRef} className="p-6 relative max-w-full">
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
              {/* ============ MEMBRETE ============ */}
              <div className="text-center mb-6">
                {data.firmSettings?.logo_url && (
                  <img
                    src={data.firmSettings.logo_url}
                    alt={firmName}
                    className="h-14 mx-auto mb-3 object-contain"
                  />
                )}
                {data.firmSettings && (
                  <p className="text-xs text-muted-foreground">
                    {[data.firmSettings.phone, data.firmSettings.website]
                      .filter(Boolean)
                      .join(" | ")}
                  </p>
                )}
                {data.firmSettings?.address && (
                  <p className="text-xs text-muted-foreground">{data.firmSettings.address}</p>
                )}
              </div>

              <Separator className="my-4" />

              {/* ============ FECHA ============ */}
              <div className="text-right mb-6">
                <p className="text-sm">Ciudad de México, a {data.documentDate}</p>
              </div>

              {/* ============ DESTINATARIO ============ */}
              <div className="mb-6">
                <p className="font-semibold text-sm uppercase">
                  {data.primaryContact?.salutationPrefix || 'Sr.'} {data.primaryContact?.fullName || "[Nombre del Contacto]"}
                </p>
                {data.primaryContact?.position && (
                  <p className="text-sm text-muted-foreground">{data.primaryContact.position}</p>
                )}
                {data.entities.length > 0 ? (
                  <div className="mt-1">
                    {data.entities.map((entity, idx) => (
                      <p key={idx} className="text-sm">
                        {entity.legalName}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">[Razón Social]</p>
                )}
                <p className="font-semibold mt-2 text-sm">PRESENTE</p>
              </div>

              {/* ============ SALUDO ============ */}
              <div className="mb-6">
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

              {/* ============ I. ANTECEDENTES Y ALCANCE DE LOS SERVICIOS ============ */}
              <section className="mb-6">
                <h2 className="text-base font-bold mb-4 text-primary">
                  I. ANTECEDENTES Y ALCANCE DE LOS SERVICIOS
                </h2>

                {/* Background / Client description - EDITABLE */}
                {data.background && (
                  <EditableSection
                    sectionId="background"
                    override={getOverride("background")}
                    onTextSelection={handleTextSelection}
                    onRestoreOriginal={onRestoreOriginal ? () => onRestoreOriginal("background") : undefined}
                  >
                    <p className="text-sm leading-relaxed mb-4 whitespace-pre-line">
                      {getTextWithOverride("background", data.background)}
                    </p>
                  </EditableSection>
                )}

                {/* Client summary if no background */}
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

                {/* Services list */}
                {data.selectedServices.length > 0 && (
                  <>
                    <p className="text-sm mb-4">
                      Finalmente, sabemos que gracias al crecimiento sostenido que han tenido, las
                      Empresas requieren la implementación de los siguientes servicios:
                    </p>
                    <div className="space-y-4 mb-4">
                      {data.selectedServices.map((item, index) => {
                        const generatedDesc = getGeneratedServiceDescription(item.service.id);
                        const originalText = generatedDesc?.expandedText || item.customText || item.service.standard_text || item.service.description || "";
                        const sectionId = `service-${item.service.id}`;
                        const displayText = getTextWithOverride(sectionId, originalText);
                        
                        return (
                          <EditableSection
                            key={item.service.id}
                            sectionId={sectionId}
                            override={getOverride(sectionId)}
                            onTextSelection={handleTextSelection}
                            onRestoreOriginal={onRestoreOriginal ? () => onRestoreOriginal(sectionId) : undefined}
                            className="pl-4"
                          >
                            <p className="text-sm">
                              <strong>{String.fromCharCode(97 + index)}) {item.service.name}:</strong>{" "}
                              {displayText}
                            </p>
                            {/* Show AI-generated objectives if available */}
                            {generatedDesc?.objectives && generatedDesc.objectives.length > 0 && (
                              <div className="mt-2 ml-4">
                                <p className="text-xs text-muted-foreground mb-1">Objetivos:</p>
                                <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                                  {generatedDesc.objectives.map((obj, idx) => (
                                    <li key={idx}>{obj}</li>
                                  ))}
                                </ol>
                              </div>
                            )}
                          </EditableSection>
                        );
                      })}
                    </div>

                    {/* AI-generated badge */}
                    {hasGeneratedContent && (
                      <div className="flex items-center gap-2 mb-4">
                        <Badge variant="outline" className="text-xs gap-1 text-primary border-primary/30">
                          <Sparkles className="h-3 w-3" />
                          Contenido generado con IA
                        </Badge>
                      </div>
                    )}

                    {/* Transition text - EDITABLE */}
                    {hasGeneratedContent ? (
                      <>
                        <EditableSection
                          sectionId="transition"
                          override={getOverride("transition")}
                          onTextSelection={handleTextSelection}
                          onRestoreOriginal={onRestoreOriginal ? () => onRestoreOriginal("transition") : undefined}
                        >
                          <p className="text-sm leading-relaxed mb-4">
                            {getTextWithOverride("transition", data.generatedContent?.transitionText || "")}
                          </p>
                        </EditableSection>
                        {/* Closing text from AI - EDITABLE */}
                        {data.generatedContent?.closingText && (
                          <EditableSection
                            sectionId="closing-section"
                            override={getOverride("closing-section")}
                            onTextSelection={handleTextSelection}
                            onRestoreOriginal={onRestoreOriginal ? () => onRestoreOriginal("closing-section") : undefined}
                          >
                            <p className="text-sm leading-relaxed mb-4">
                              {getTextWithOverride("closing-section", data.generatedContent.closingText)}
                            </p>
                          </EditableSection>
                        )}
                      </>
                    ) : (
                      <div className="my-6 p-4 border-2 border-dashed border-muted-foreground/30 rounded-lg text-center">
                        <Sparkles className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">
                          Haz clic en <strong>"Generar contenido con IA"</strong> en la sección de servicios para crear el texto personalizado de la propuesta.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </section>

              {/* ============ II. PROPUESTA DE HONORARIOS ============ */}
              {(data.pricing.totalAmount > 0 || data.selectedServices.length > 0) && (
                <section className="mb-6">
                  <h2 className="text-base font-bold mb-4 text-primary">II. PROPUESTA DE HONORARIOS</h2>

                  <EditableSection
                    sectionId="pricing-intro"
                    override={getOverride("pricing-intro")}
                    onTextSelection={handleTextSelection}
                    onRestoreOriginal={onRestoreOriginal ? () => onRestoreOriginal("pricing-intro") : undefined}
                  >
                    <p className="text-sm leading-relaxed mb-4">
                      {getTextWithOverride("pricing-intro", FIXED_TEXTS.introHonorarios)}
                    </p>
                  </EditableSection>

                  <div className="space-y-4 mb-4">
                    {/* Services pricing - only show in per_service mode with fees only (no descriptions) */}
                    {data.pricingMode === 'per_service' && data.selectedServices.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Desglose por servicio:</p>
                        {data.selectedServices.map((item, index) => {
                          const feeType = item.service.fee_type || 'one_time';
                          const showOneTime = feeType === 'one_time' || feeType === 'both';
                          const showMonthly = feeType === 'monthly' || feeType === 'both';
                          const fee = item.customFee ?? (item.service.suggested_fee ? Number(item.service.suggested_fee) : 0);
                          const monthlyFee = item.customMonthlyFee ?? (item.service.suggested_monthly_fee ? Number(item.service.suggested_monthly_fee) : 0);
                          const hasFee = (showOneTime && fee > 0) || (showMonthly && monthlyFee > 0);

                          if (!hasFee) return null;

                          return (
                            <div key={item.service.id} className="pl-4 flex justify-between items-start">
                              <span className="text-sm">
                                {String.fromCharCode(97 + index)}) {item.service.name}
                              </span>
                              <span className="text-sm text-right">
                                {showOneTime && fee > 0 && (
                                  <span className="font-medium">{formatCurrency(fee)}</span>
                                )}
                                {showOneTime && fee > 0 && showMonthly && monthlyFee > 0 && " + "}
                                {showMonthly && monthlyFee > 0 && (
                                  <span className="font-medium">{formatCurrency(monthlyFee)}/mes</span>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Summed mode - just show totals, no service list */}
                    {data.pricingMode === 'summed' && (
                      <p className="text-sm pl-4">
                        Los honorarios corresponden al paquete de servicios descritos en la sección anterior.
                      </p>
                    )}

                    {/* Global mode - no service breakdown */}
                    {data.pricingMode === 'global' && (
                      <p className="text-sm pl-4">
                        Los honorarios incluyen todos los servicios descritos en la sección de Antecedentes y Alcance.
                      </p>
                    )}

                    {/* Initial payment with installments */}
                    {data.pricing.initialPayment > 0 && (
                      <div className="pl-4 mt-4 pt-2 border-t border-dashed">
                        <p className="text-sm mb-2">
                          <strong>a) Pago inicial</strong> en cantidad de{" "}
                          <strong>{formatCurrency(data.pricing.initialPayment)}</strong>{" "}
                          ({numberToSpanishWords(data.pricing.initialPayment)} pesos 00/100 M.N.) más IVA
                          {data.pricing.initialPaymentDescription && (
                            <> correspondiente al {data.pricing.initialPaymentDescription}</>
                          )}
                          .
                        </p>
                        
                        {/* Installments breakdown */}
                        {data.pricing.installments && data.pricing.installments.length > 1 && (
                          <p className="text-sm ml-4 mb-2">
                            Dicho honorario será cubierto{" "}
                            {data.pricing.installments.map((inst, idx) => {
                              const isLast = idx === data.pricing.installments.length - 1;
                              const isSecondToLast = idx === data.pricing.installments.length - 2;
                              
                              return (
                                <span key={idx}>
                                  un {inst.percentage}%
                                  {inst.description && <> {inst.description}</>}
                                  {isLast ? "." : isSecondToLast ? " y el " : ", "}
                                </span>
                              );
                            })}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Monthly retainer */}
                    {data.pricing.monthlyRetainer > 0 && (
                      <div className="pl-4">
                        <p className="text-sm mb-2">
                          <strong>b) Una iguala mensual</strong> en cantidad de{" "}
                          <strong>{formatCurrency(data.pricing.monthlyRetainer)}</strong>{" "}
                          ({numberToSpanishWords(data.pricing.monthlyRetainer)} pesos 00/100 M.N.) más IVA
                          por un plazo de {data.pricing.retainerMonths} meses a fin de realizar las
                          labores de ejecución, implementación y acompañamiento de la propuesta.
                        </p>
                        
                        {/* Retainer start description */}
                        {data.pricing.retainerStartDescription && (
                          <p className="text-sm ml-4 mb-2">
                            {data.pricing.retainerStartDescription}
                            {data.pricing.canCancelWithoutPenalty && (
                              <>, por lo que, en caso de optar por no continuar con el servicio, 
                              podrá libremente hacerlo sin penalidad alguna bastando una comunicación 
                              escrita o por correo electrónico</>
                            )}
                            .
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Exclusions */}
                  {data.pricing.exclusionsText && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {data.pricing.exclusionsText}
                    </p>
                  )}
                  {!data.pricing.exclusionsText && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      La presente propuesta no incluye servicios o gastos adicionales que no se
                      encuentren expresamente previstos tales como son gastos notariales, pago de
                      derechos, cuotas de terceros, legalización o apostilla de documentos, entre
                      otros que sean necesarios y que únicamente serán erogados previa autorización de
                      su parte.
                    </p>
                  )}
                </section>
              )}

              {/* ============ III. GARANTÍAS DE SATISFACCIÓN ============ */}
              {data.firmSettings?.guarantees_text && (
                <section className="mb-6">
                  <h2 className="text-base font-bold mb-4 text-primary">
                    III. GARANTÍAS DE SATISFACCIÓN
                  </h2>
                  <EditableSection
                    sectionId="guarantees"
                    override={getOverride("guarantees")}
                    onTextSelection={handleTextSelection}
                    onRestoreOriginal={onRestoreOriginal ? () => onRestoreOriginal("guarantees") : undefined}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-line">
                      {getTextWithOverride("guarantees", data.firmSettings.guarantees_text)}
                    </p>
                  </EditableSection>
                </section>
              )}

              {/* ============ CIERRE ============ */}
              <section className="mb-6">
                <Separator className="my-4" />
                <EditableSection
                  sectionId="closing-farewell"
                  override={getOverride("closing-farewell")}
                  onTextSelection={handleTextSelection}
                  onRestoreOriginal={onRestoreOriginal ? () => onRestoreOriginal("closing-farewell") : undefined}
                >
                  {data.firmSettings?.closing_text ? (
                    <p className="text-sm leading-relaxed whitespace-pre-line">
                      {getTextWithOverride("closing-farewell", data.firmSettings.closing_text)}
                    </p>
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-line">
                      {getTextWithOverride("closing-farewell", FIXED_TEXTS.despedida)}
                    </p>
                  )}
                </EditableSection>
                <p className="font-bold text-sm mt-6 text-center">{firmName}</p>
              </section>

              {/* ============ BLOQUE DE ACEPTACIÓN ============ */}
              <section className="mt-8 pt-4 border-t border-dashed">
                <p className="text-sm leading-relaxed mb-6">{FIXED_TEXTS.aceptacion}</p>
                <p className="text-sm font-semibold mb-2">FIRMA DE CONFORMIDAD Y ACEPTACIÓN:</p>
                <div className="border-b border-foreground w-64 h-8"></div>
              </section>

              {/* ============ FOOTER ============ */}
              <div className="mt-8 text-center">
                <p className="text-xs text-muted-foreground">
                  Esta propuesta tiene vigencia de 30 días a partir de su fecha de envío.
                </p>
              </div>
            </div>
          )}
          
          {/* Text Selection Toolbar - positioned within the preview container */}
          {selection && isEditingEnabled && (
            <div 
              className="absolute z-50"
              style={{
                top: selection.position.top - 50, // Position above the selection
                left: Math.max(10, Math.min(selection.position.left, 300)),
                transform: 'translateX(-50%)',
              }}
            >
              <TextSelectionToolbar
                selectedText={selection.text}
                onClose={() => setSelection(null)}
                onManualEdit={handleManualEdit}
                onAIRewrite={async (instruction) => {
                  const result = await handleAIRewriteRequest(instruction);
                  handleAcceptAIRewrite(result, instruction);
                  return result;
                }}
                isRewriting={isRewriting}
              />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Generate Button */}
      <div className="p-4 border-t bg-muted/30 shrink-0">
        <Button
          className="w-full"
          size="lg"
          onClick={onGenerate}
          disabled={isGenerating || !hasContent}
        >
          {isGenerating ? (
            <>Guardando...</>
          ) : (
            <>
              <ArrowRight className="h-5 w-5 mr-2" />
              Siguiente paso
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
