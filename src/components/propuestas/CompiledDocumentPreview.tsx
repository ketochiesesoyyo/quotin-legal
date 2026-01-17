/**
 * Sprint 2: Compiled Document Preview Component
 * 
 * Shows the template compiled with real data injected.
 * Updates in real-time as context data changes.
 */

import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { FileText, AlertTriangle, CheckCircle, Code } from "lucide-react";
import type { DocumentTemplate, TemplateSchema, TemplateBlock } from "@/components/plantillas/types";
import {
  compileTemplate,
  type CompilerContext,
  type CompiledDocument,
} from "@/lib/template-compiler";

interface CompiledDocumentPreviewProps {
  template: DocumentTemplate;
  context: CompilerContext;
  showDebug?: boolean;
  className?: string;
}

export function CompiledDocumentPreview({
  template,
  context,
  showDebug = false,
  className = "",
}: CompiledDocumentPreviewProps) {
  // Compile the template with context
  const compiled = useMemo<CompiledDocument | null>(() => {
    const schema = template.schema_json as TemplateSchema | null;
    if (!schema?.blocks || schema.blocks.length === 0) {
      return null;
    }

    return compileTemplate(schema, context);
  }, [template, context]);

  if (!compiled) {
    return (
      <div className={`p-6 text-center text-muted-foreground ${className}`}>
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Esta plantilla no tiene bloques configurados.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header with stats */}
      <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="font-medium text-sm">{template.name}</span>
          <Badge variant="outline" className="text-xs">
            v{template.version}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{compiled.blocks.length} bloques</span>
          {compiled.warnings.length > 0 && (
            <Badge variant="destructive" className="text-xs gap-1">
              <AlertTriangle className="h-3 w-3" />
              {compiled.warnings.length}
            </Badge>
          )}
          {compiled.warnings.length === 0 && (
            <Badge variant="secondary" className="text-xs gap-1 bg-green-100 text-green-700 border-green-300">
              <CheckCircle className="h-3 w-3" />
              Completo
            </Badge>
          )}
        </div>
      </div>

      {/* Warnings */}
      {compiled.warnings.length > 0 && (
        <div className="p-3 border-b">
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {compiled.warnings.length} variable(s) no pudieron resolverse:
              <ul className="mt-1 list-disc list-inside">
                {compiled.warnings.slice(0, 3).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
                {compiled.warnings.length > 3 && (
                  <li>...y {compiled.warnings.length - 3} más</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Compiled content */}
      <ScrollArea className="flex-1">
        <div className="p-6 prose prose-sm max-w-none dark:prose-invert">
          {compiled.blocks.map((block, index) => (
            <div key={block.id} className="mb-4">
              {showDebug && (
                <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
                  <Badge 
                    variant="outline" 
                    className={block.type === 'static' 
                      ? 'bg-blue-50 text-blue-600 border-blue-200' 
                      : 'bg-amber-50 text-amber-600 border-amber-200'
                    }
                  >
                    {block.type === 'static' ? '🔒 Fijo' : '📝 Variable'}
                  </Badge>
                  {block.source && (
                    <code className="text-xs bg-muted px-1 rounded">
                      {block.source}
                    </code>
                  )}
                  {block.wasCompiled && (
                    <Badge variant="secondary" className="text-xs bg-green-50 text-green-600">
                      ✓ Compilado
                    </Badge>
                  )}
                </div>
              )}
              
              <div 
                className={`template-block ${
                  showDebug 
                    ? block.type === 'static' 
                      ? 'border-l-2 border-blue-300 pl-3' 
                      : 'border-l-2 border-amber-300 pl-3'
                    : ''
                }`}
                dangerouslySetInnerHTML={{ __html: block.compiledContent }}
              />
              
              {index < compiled.blocks.length - 1 && !showDebug && (
                <Separator className="my-4" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Debug footer */}
      {showDebug && (
        <div className="p-3 border-t bg-muted/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Code className="h-3 w-3" />
            <span>
              Compilado: {new Date(compiled.compiledAt).toLocaleTimeString('es-MX')}
            </span>
            <Separator orientation="vertical" className="h-3" />
            <span>
              Contexto: {context.services.length} servicios, {context.entities.length} entidades
            </span>
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

  return {
    client: {
      group_name: data.client?.group_name || '[Nombre del Cliente]',
      alias: data.client?.alias,
      industry: data.client?.industry,
      annual_revenue: data.client?.annual_revenue,
      employee_count: data.client?.employee_count,
      contact_name: data.recipientName,
      contact_position: data.recipientPosition,
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
