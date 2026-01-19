/**
 * Sprint 2B+C: Compiled Document Preview Component
 * 
 * Shows the template compiled with real data injected.
 * Supports AI generation for dynamic blocks and PDF export.
 */

import { useMemo, useState, useRef, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Code, 
  Sparkles, 
  Loader2,
  Download,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { DocumentTemplate, TemplateSchema } from "@/components/plantillas/types";
import type { TemplateSnapshot } from "@/components/propuestas/types";
import {
  compileTemplate,
  type CompilerContext,
  type CompiledDocument,
  type CompiledBlock,
} from "@/lib/template-compiler";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface CompiledDocumentPreviewProps {
  /** Legacy: Full template object (for manual selection) */
  template?: DocumentTemplate;
  /** Template-first: Snapshot from case (preferred) */
  templateSnapshot?: TemplateSnapshot;
  context: CompilerContext;
  /** Pre-generated block contents from edge function */
  blockContents?: Record<string, string>;
  showDebug?: boolean;
  className?: string;
}

export function CompiledDocumentPreview({
  template,
  templateSnapshot,
  context,
  blockContents,
  showDebug = false,
  className = "",
}: CompiledDocumentPreviewProps) {
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [generatingBlockIds, setGeneratingBlockIds] = useState<Set<string>>(new Set());
  const [dynamicContent, setDynamicContent] = useState<Record<string, string>>({});

  // Compile the template with context
  // Priority: templateSnapshot > template (for backwards compatibility)
  const compiled = useMemo<CompiledDocument | null>(() => {
    const schema = (templateSnapshot?.schema_json as TemplateSchema | undefined) 
      || (template?.schema_json as TemplateSchema | null);
    
    if (!schema?.blocks || schema.blocks.length === 0) {
      return null;
    }

    // Merge external blockContents with local dynamicContent
    const mergedBlockContents = { ...blockContents, ...dynamicContent };

    return compileTemplate(schema, context, mergedBlockContents);
  }, [template, templateSnapshot, context, blockContents, dynamicContent]);

  // Get dynamic blocks that need generation
  const dynamicBlocks = useMemo(() => {
    if (!compiled) return [];
    return compiled.blocks.filter(b => b.type === 'dynamic' && b.instructions);
  }, [compiled]);

  // Generate content for dynamic blocks
  const handleGenerateDynamic = useCallback(async () => {
    if (!compiled || dynamicBlocks.length === 0) return;

    setIsGenerating(true);
    const blockIds = new Set(dynamicBlocks.map(b => b.id));
    setGeneratingBlockIds(blockIds);

    try {
      const blocksToGenerate = dynamicBlocks.map(block => ({
        blockId: block.id,
        instructions: block.instructions || '',
        placeholderContent: block.originalContent,
        context: context,
      }));

      const { data, error } = await supabase.functions.invoke('generate-dynamic-content', {
        body: { blocks: blocksToGenerate },
      });

      if (error) throw error;

      if (data?.results) {
        const newContent: Record<string, string> = {};
        let successCount = 0;
        let errorMessages: string[] = [];

        for (const result of data.results) {
          if (result.success && result.content) {
            newContent[result.blockId] = result.content;
            successCount++;
          } else if (result.error) {
            errorMessages.push(result.error);
          }
        }

        setDynamicContent(prev => ({ ...prev, ...newContent }));

        if (successCount === dynamicBlocks.length) {
          toast({
            title: "Contenido generado",
            description: `${successCount} bloque(s) dinámico(s) generados con IA`,
          });
        } else if (successCount > 0) {
          toast({
            title: "Generación parcial",
            description: `${successCount}/${dynamicBlocks.length} bloques generados`,
            variant: "default",
          });
        } else {
          toast({
            title: "Error en generación",
            description: errorMessages[0] || "No se pudo generar contenido",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error generating dynamic content:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al generar contenido",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGeneratingBlockIds(new Set());
    }
  }, [compiled, dynamicBlocks, context, toast]);

  // Export to PDF
  const handleExportPDF = useCallback(async () => {
    if (!contentRef.current) return;

    setIsExporting(true);

    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      // Handle multi-page PDFs
      const pageHeight = pdfHeight - 20; // margins
      const scaledHeight = imgHeight * ratio;
      
      if (scaledHeight <= pageHeight) {
        // Single page
        pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, scaledHeight);
      } else {
        // Multiple pages
        let heightLeft = scaledHeight;
        let position = imgY;
        let page = 0;

        while (heightLeft > 0) {
          if (page > 0) {
            pdf.addPage();
          }
          
          pdf.addImage(
            imgData, 
            'PNG', 
            imgX, 
            position - (page * pageHeight), 
            imgWidth * ratio, 
            scaledHeight
          );
          
          heightLeft -= pageHeight;
          page++;
        }
      }

      // Generate filename
      const clientName = context.client.group_name.replace(/[^a-zA-Z0-9]/g, '_');
      const date = new Date().toISOString().split('T')[0];
      const filename = `Propuesta_${clientName}_${date}.pdf`;

      pdf.save(filename);

      toast({
        title: "PDF exportado",
        description: `Archivo guardado: ${filename}`,
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Error al exportar",
        description: "No se pudo generar el PDF",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [context.client.group_name, toast]);

  // Get block content (with dynamic overrides)
  // Priority: local dynamicContent > external blockContents > compiled content
  const getBlockContent = useCallback((block: CompiledBlock): string => {
    if (block.type === 'dynamic') {
      if (dynamicContent[block.id]) return dynamicContent[block.id];
      if (blockContents?.[block.id]) return blockContents[block.id];
    }
    return block.compiledContent;
  }, [dynamicContent, blockContents]);

  // Check if block was generated by AI
  const isBlockGenerated = useCallback((block: CompiledBlock): boolean => {
    return block.type === 'dynamic' && 
      (!!dynamicContent[block.id] || !!blockContents?.[block.id]);
  }, [dynamicContent, blockContents]);

  if (!compiled) {
    return (
      <div className={`p-6 text-center text-muted-foreground ${className}`}>
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Esta plantilla no tiene bloques configurados.</p>
      </div>
    );
  }

  const hasPendingDynamic = dynamicBlocks.some(b => !dynamicContent[b.id]);

  return (
    <div className={`flex flex-col h-full min-h-0 ${className}`}>
      {/* Header with stats and actions */}
      <div className="p-4 border-b bg-muted/30 flex items-center justify-between flex-wrap gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="font-medium text-sm">
            {templateSnapshot?.template_name || template?.name || 'Plantilla'}
          </span>
          <Badge variant="outline" className="text-xs">
            v{templateSnapshot?.version || template?.version || '1.0'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Stats badges */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
            <span>{compiled.blocks.length} bloques</span>
            {dynamicBlocks.length > 0 && (
              <Badge variant="outline" className="text-xs gap-1 bg-purple-50 text-purple-600 border-purple-200">
                <Sparkles className="h-3 w-3" />
                {dynamicBlocks.length} dinámico(s)
              </Badge>
            )}
            {compiled.warnings.length > 0 && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertTriangle className="h-3 w-3" />
                {compiled.warnings.length}
              </Badge>
            )}
            {compiled.warnings.length === 0 && !hasPendingDynamic && (
              <Badge variant="secondary" className="text-xs gap-1 bg-green-100 text-green-700 border-green-300">
                <CheckCircle className="h-3 w-3" />
                Completo
              </Badge>
            )}
          </div>

          {/* Action buttons */}
          {dynamicBlocks.length > 0 && (
            <Button
              size="sm"
              variant={hasPendingDynamic ? "default" : "outline"}
              onClick={handleGenerateDynamic}
              disabled={isGenerating}
              className="gap-1"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : hasPendingDynamic ? (
                <Sparkles className="h-4 w-4" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {isGenerating ? "Generando..." : hasPendingDynamic ? "Generar IA" : "Regenerar"}
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportPDF}
            disabled={isExporting || hasPendingDynamic}
            className="gap-1"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isExporting ? "Exportando..." : "PDF"}
          </Button>
        </div>
      </div>

      {/* Dynamic blocks pending warning */}
      {hasPendingDynamic && (
        <div className="p-3 border-b bg-purple-50">
          <Alert className="py-2 border-purple-200 bg-purple-50">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <AlertDescription className="text-xs text-purple-700">
              Hay {dynamicBlocks.filter(b => !dynamicContent[b.id]).length} bloque(s) dinámico(s) pendientes. 
              Haz clic en "Generar IA" para crear el contenido.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Warnings - categorized by type */}
      {compiled.warnings.length > 0 && (() => {
        const configErrors = compiled.warnings.filter(w => 
          w.includes('no tiene instrucciones') || w.includes('no tiene fuente')
        );
        const pendingAI = compiled.warnings.filter(w => w.includes('pendiente de generar'));
        const otherWarnings = compiled.warnings.filter(w => 
          !w.includes('no tiene instrucciones') && 
          !w.includes('no tiene fuente') && 
          !w.includes('pendiente de generar')
        );
        
        return (
          <>
            {configErrors.length > 0 && (
              <div className="p-3 border-b">
                <Alert variant="destructive" className="py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Plantilla incompleta:</strong> Esta propuesta usa un snapshot de plantilla con {configErrors.length} bloque(s) mal configurado(s).
                    <p className="mt-1 text-muted-foreground">
                      Esta propuesta fue creada con una plantilla que tenía bloques sin configurar. 
                      Puedes continuar en Vista Clásica o crear una nueva propuesta con la plantilla corregida.
                    </p>
                  </AlertDescription>
                </Alert>
              </div>
            )}
            {pendingAI.length > 0 && !configErrors.length && (
              <div className="p-3 border-b">
                <Alert className="py-2 border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-xs text-amber-700">
                    {pendingAI.length} bloque(s) dinámico(s) pendientes de generación con IA.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            {otherWarnings.length > 0 && (
              <div className="p-3 border-b">
                <Alert variant="destructive" className="py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {otherWarnings.length} variable(s) no pudieron resolverse:
                    <ul className="mt-1 list-disc list-inside">
                      {otherWarnings.slice(0, 3).map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                      {otherWarnings.length > 3 && (
                        <li>...y {otherWarnings.length - 3} más</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </>
        );
      })()}

      {/* Compiled content */}
      <ScrollArea className="flex-1 min-h-0">
        <div ref={contentRef} className="p-6 prose prose-sm max-w-none dark:prose-invert bg-white">
          {compiled.blocks.map((block, index) => {
            const isLoading = generatingBlockIds.has(block.id);
            const wasGenerated = isBlockGenerated(block);
            const content = getBlockContent(block);

            return (
              <div key={block.id} className="mb-4">
                {showDebug && (
                  <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground flex-wrap">
                    <Badge 
                      variant="outline" 
                      className={
                        block.type === 'static' 
                          ? 'bg-blue-50 text-blue-600 border-blue-200' 
                          : block.type === 'dynamic'
                          ? 'bg-purple-50 text-purple-600 border-purple-200'
                          : 'bg-amber-50 text-amber-600 border-amber-200'
                      }
                    >
                      {block.type === 'static' ? '🔒 Fijo' : block.type === 'dynamic' ? '✨ Dinámico' : '📝 Variable'}
                    </Badge>
                    {block.source && (
                      <code className="text-xs bg-muted px-1 rounded">
                        {block.source}
                      </code>
                    )}
                    {block.instructions && (
                      <span className="text-purple-500 italic truncate max-w-[200px]">
                        "{block.instructions.substring(0, 50)}..."
                      </span>
                    )}
                    {(block.wasCompiled || wasGenerated) && (
                      <Badge variant="secondary" className={`text-xs ${wasGenerated ? 'bg-purple-50 text-purple-600' : 'bg-green-50 text-green-600'}`}>
                        {wasGenerated ? '✨ IA' : '✓ Compilado'}
                      </Badge>
                    )}
                  </div>
                )}
                
                <div 
                  className={`template-block ${
                    showDebug 
                      ? block.type === 'static' 
                        ? 'border-l-2 border-blue-300 pl-3' 
                        : block.type === 'dynamic'
                        ? 'border-l-2 border-purple-300 pl-3'
                        : 'border-l-2 border-amber-300 pl-3'
                      : ''
                  } ${isLoading ? 'opacity-50' : ''}`}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2 py-4 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Generando contenido con IA...</span>
                    </div>
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: content }} />
                  )}
                </div>
                
                {index < compiled.blocks.length - 1 && !showDebug && (
                  <Separator className="my-4" />
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Debug footer */}
      {showDebug && (
        <div className="p-3 border-t bg-muted/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <Code className="h-3 w-3" />
            <span>
              Compilado: {new Date(compiled.compiledAt).toLocaleTimeString('es-MX')}
            </span>
            <Separator orientation="vertical" className="h-3" />
            <span>
              Contexto: {context.services.length} servicios, {context.entities.length} entidades
            </span>
            {Object.keys(dynamicContent).length > 0 && (
              <>
                <Separator orientation="vertical" className="h-3" />
                <span className="text-purple-600">
                  {Object.keys(dynamicContent).length} bloque(s) generados por IA
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Builds the compiler context from proposal editor data
 */
export function buildCompilerContext(data: {
  client?: { group_name: string; alias?: string; industry?: string; annual_revenue?: string; employee_count?: number };
  entities?: Array<{ legal_name: string; rfc?: string }>;
  services?: Array<{
    service: { id: string; name: string; description?: string; objectives_template?: string; deliverables_template?: string; standard_text?: string };
    customFee?: number;
    customMonthlyFee?: number;
  }>;
  caseData?: { title: string; notes?: string };
  background?: string;
  recipientName?: string;
  recipientPosition?: string;
  pricing?: {
    initialPayment: number;
    monthlyRetainer: number;
    retainerMonths: number;
  };
  firmSettings?: {
    name: string;
    logo_url?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    closing_text?: string;
    guarantees_text?: string;
    disclaimers_text?: string;
  };
}): CompilerContext {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Build entities list as comma-separated string
  const entitiesList = (data.entities || [])
    .map(e => e.legal_name)
    .filter(Boolean)
    .join(', ') || '[Sin entidades]';

  // Build primary contact salutation
  const primaryContact = data.recipientName
    ? `${data.recipientPosition ? data.recipientPosition + ' ' : ''}${data.recipientName}`
    : '[Destinatario]';

  // Build pricing summary
  const pricingSummary = buildPricingSummary(data.pricing);

  return {
    client: {
      group_name: data.client?.group_name || '[Nombre del Cliente]',
      alias: data.client?.alias,
      industry: data.client?.industry,
      annual_revenue: data.client?.annual_revenue,
      employee_count: data.client?.employee_count,
      contact_name: data.recipientName,
      contact_position: data.recipientPosition,
      // Extended properties
      entities: entitiesList,
      primary_contact: primaryContact,
    },
    entities: (data.entities || []).map(e => ({
      legal_name: e.legal_name,
      rfc: e.rfc || undefined,
    })),
    services: (data.services || [])
      .filter(s => s)
      .map(s => ({
        id: s.service.id,
        name: s.service.name,
        description: s.service.description,
        objectives_template: s.service.objectives_template,
        deliverables_template: s.service.deliverables_template,
        standard_text: s.service.standard_text,
        fee: s.customFee,
        monthly_fee: s.customMonthlyFee,
      })),
    proposal: {
      date: formattedDate,
      title: data.caseData?.title,
      background: data.background,
      total_fee: data.pricing?.initialPayment || 0,
      monthly_retainer: data.pricing?.monthlyRetainer || 0,
      retainer_months: data.pricing?.retainerMonths || 12,
      // Extended property
      pricing_summary: pricingSummary,
    },
    case: {
      title: data.caseData?.title || '[Título del Caso]',
      background: data.background,
      notes: data.caseData?.notes,
    },
    firm: data.firmSettings ? {
      name: data.firmSettings.name,
      logo_url: data.firmSettings.logo_url || undefined,
      address: data.firmSettings.address || undefined,
      phone: data.firmSettings.phone || undefined,
      email: data.firmSettings.email || undefined,
      website: data.firmSettings.website || undefined,
      closing_text: data.firmSettings.closing_text || undefined,
      guarantees_text: data.firmSettings.guarantees_text || undefined,
      disclaimers_text: data.firmSettings.disclaimers_text || undefined,
    } : undefined,
  };
}

/**
 * Builds a formatted pricing summary string
 */
function buildPricingSummary(pricing?: {
  initialPayment: number;
  monthlyRetainer: number;
  retainerMonths: number;
}): string {
  if (!pricing) return '[Honorarios por definir]';

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

  const parts: string[] = [];

  if (pricing.initialPayment > 0) {
    parts.push(`Pago inicial: ${formatCurrency(pricing.initialPayment)}`);
  }

  if (pricing.monthlyRetainer > 0) {
    parts.push(`Iguala mensual: ${formatCurrency(pricing.monthlyRetainer)} (${pricing.retainerMonths} meses)`);
  }

  return parts.length > 0 ? parts.join(' | ') : '[Sin honorarios configurados]';
}
