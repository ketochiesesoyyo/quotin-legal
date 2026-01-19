/**
 * Sprint 2: Template Compiler Service
 * 
 * Uses Handlebars to compile document templates with contextual data.
 * Takes a TemplateSchema and injects client, service, case, and proposal variables.
 */

import Handlebars from 'handlebars';
import type { TemplateSchema, TemplateBlock } from '@/components/plantillas/types';

// ============================================
// Context Types
// ============================================

export interface ClientContext {
  group_name: string;
  alias?: string;
  industry?: string;
  annual_revenue?: string;
  employee_count?: number;
  contact_name?: string;
  contact_position?: string;
  // Extended properties for template sources
  entities?: string;        // Comma-separated list of entity legal names
  primary_contact?: string; // Formatted salutation (position + name)
}

export interface EntityContext {
  legal_name: string;
  rfc?: string;
}

export interface ServiceContext {
  id: string;
  name: string;
  description?: string;
  objectives_template?: string;
  deliverables_template?: string;
  standard_text?: string;
  fee?: number;
  monthly_fee?: number;
}

export interface ProposalContext {
  date: string;
  title?: string;
  background?: string;
  total_fee: number;
  monthly_retainer: number;
  retainer_months: number;
  // Extended properties for template sources
  pricing_summary?: string; // Formatted pricing summary
  services_narrative?: string; // Narrative description of selected services
}

export interface CaseContext {
  title: string;
  background?: string;
  notes?: string;
}

export interface FirmContext {
  name: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  closing_text?: string;
  guarantees_text?: string;
  disclaimers_text?: string;
}

export interface CompilerContext {
  client: ClientContext;
  entities: EntityContext[];
  services: ServiceContext[];
  proposal: ProposalContext;
  case: CaseContext;
  firm?: FirmContext;
}

// ============================================
// Compiled Output
// ============================================

export interface CompiledBlock {
  id: string;
  type: 'static' | 'variable' | 'dynamic';
  originalContent: string;
  compiledContent: string;
  variableName?: string;
  source?: string;
  instructions?: string;
  wasCompiled: boolean;
  generatedByAI?: boolean;
  aiError?: string;
}

export interface CompiledDocument {
  blocks: CompiledBlock[];
  html: string;
  text: string;
  compiledAt: string;
  warnings: string[];
  hasDynamicBlocks: boolean;
}

// ============================================
// Handlebars Helpers
// ============================================

// Register custom helpers
Handlebars.registerHelper('formatCurrency', (amount: number) => {
  if (typeof amount !== 'number') return '$0.00';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount);
});

Handlebars.registerHelper('formatDate', (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
});

Handlebars.registerHelper('uppercase', (str: string) => {
  return typeof str === 'string' ? str.toUpperCase() : '';
});

Handlebars.registerHelper('lowercase', (str: string) => {
  return typeof str === 'string' ? str.toLowerCase() : '';
});

Handlebars.registerHelper('each_service', function(this: any, options: Handlebars.HelperOptions) {
  const services = this.services as ServiceContext[];
  if (!services || services.length === 0) return '';
  
  let result = '';
  services.forEach((service, index) => {
    result += options.fn({ ...service, index, letter: String.fromCharCode(97 + index) });
  });
  return result;
});

Handlebars.registerHelper('each_entity', function(this: any, options: Handlebars.HelperOptions) {
  const entities = this.entities as EntityContext[];
  if (!entities || entities.length === 0) return '';
  
  let result = '';
  entities.forEach((entity, index) => {
    result += options.fn({ ...entity, index });
  });
  return result;
});

Handlebars.registerHelper('ifEquals', function(this: any, arg1: any, arg2: any, options: Handlebars.HelperOptions) {
  return arg1 === arg2 ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('ifGreaterThan', function(this: any, arg1: number, arg2: number, options: Handlebars.HelperOptions) {
  return arg1 > arg2 ? options.fn(this) : options.inverse(this);
});

// ============================================
// Compiler Functions
// ============================================

/**
 * Resolves a dot-notation path from the context
 * e.g., "client.group_name" → context.client.group_name
 */
function resolveSource(source: string, context: CompilerContext): string {
  const parts = source.split('.');
  let value: any = context;
  
  for (const part of parts) {
    if (value === undefined || value === null) return '';
    value = value[part];
  }
  
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Compiles a single template block (static or variable)
 * Dynamic blocks are handled separately by generateDynamicContent
 */
function compileBlock(block: TemplateBlock, context: CompilerContext): CompiledBlock {
  const result: CompiledBlock = {
    id: block.id,
    type: block.type,
    originalContent: block.content,
    compiledContent: block.content,
    variableName: block.variableName,
    source: block.source,
    instructions: block.instructions,
    wasCompiled: false,
    generatedByAI: false,
  };

  if (block.type === 'static') {
    // Static blocks are passed through but we still compile any Handlebars expressions
    try {
      const template = Handlebars.compile(block.content, { noEscape: true });
      result.compiledContent = template(context);
      result.wasCompiled = result.compiledContent !== block.content;
    } catch {
      // If compilation fails, use original content
      result.compiledContent = block.content;
    }
    return result;
  }

  if (block.type === 'dynamic') {
    // Dynamic blocks need AI generation - mark as pending
    // The actual generation happens via generateDynamicContent
    result.compiledContent = block.content; // Keep placeholder until AI generates
    result.wasCompiled = false;
    return result;
  }

  // Variable block - resolve from source
  if (block.source) {
    const resolved = resolveSource(block.source, context);
    if (resolved) {
      result.compiledContent = resolved;
      result.wasCompiled = true;
    }
  }

  // Also try Handlebars compilation on variable blocks
  if (!result.wasCompiled && block.content.includes('{{')) {
    try {
      const template = Handlebars.compile(block.content, { noEscape: true });
      result.compiledContent = template(context);
      result.wasCompiled = result.compiledContent !== block.content;
    } catch {
      // Keep original content
    }
  }

  return result;
}

/**
 * Compiles a complete template schema with the provided context
 * Note: Dynamic blocks will use blockContents if provided, otherwise show placeholder
 * 
 * @param schema - The template schema with blocks
 * @param context - The compiler context with client, services, etc.
 * @param blockContents - Optional pre-generated content for dynamic blocks (from edge function)
 */
export function compileTemplate(
  schema: TemplateSchema,
  context: CompilerContext,
  blockContents?: Record<string, string>
): CompiledDocument {
  const warnings: string[] = [];
  const compiledBlocks: CompiledBlock[] = [];

  // Sort blocks by order
  const sortedBlocks = [...schema.blocks].sort((a, b) => a.order - b.order);

  let hasDynamicBlocks = false;

  for (const block of sortedBlocks) {
    // Handle dynamic blocks with pre-generated content
    if (block.type === 'dynamic') {
      hasDynamicBlocks = true;
      
      // Check if we have pre-generated content for this block
      if (blockContents && blockContents[block.id]) {
        compiledBlocks.push({
          id: block.id,
          type: 'dynamic',
          originalContent: block.content,
          compiledContent: blockContents[block.id],
          variableName: block.variableName,
          source: block.source,
          instructions: block.instructions,
          wasCompiled: true,
          generatedByAI: true,
        });
      } else {
        // No pre-generated content - show placeholder
        if (!block.instructions || block.instructions.trim() === '') {
          warnings.push(`Bloque dinámico "${block.variableName || block.id || 'sin nombre'}" no tiene instrucciones de IA configuradas. Configúralo en el editor de plantillas.`);
        } else {
          warnings.push(`Bloque dinámico "${block.variableName || block.id}" pendiente de generar con IA.`);
        }
        compiledBlocks.push({
          id: block.id,
          type: 'dynamic',
          originalContent: block.content,
          compiledContent: `[PENDIENTE: ${block.content || block.variableName || block.id}]`,
          variableName: block.variableName,
          source: block.source,
          instructions: block.instructions,
          wasCompiled: false,
          generatedByAI: false,
        });
      }
      continue;
    }

    // Handle static and variable blocks
    const compiled = compileBlock(block, context);
    compiledBlocks.push(compiled);

    // Track unresolved variables with better error messages
    if (block.type === 'variable') {
      if (!block.source) {
        warnings.push(`Variable "${block.variableName || block.id}" no tiene fuente de datos configurada. Configura la fuente en el editor de plantillas.`);
      } else if (!compiled.wasCompiled) {
        warnings.push(`Variable "${block.variableName || block.id}" no se pudo resolver desde "${block.source}". Verifica que los datos del contexto estén disponibles.`);
      }
    }
  }

  // Generate combined HTML and text
  const html = compiledBlocks
    .map(b => `<div class="template-block template-block-${b.type}" data-block-id="${b.id}">${b.compiledContent}</div>`)
    .join('\n');

  const text = compiledBlocks
    .map(b => b.compiledContent.replace(/<[^>]*>/g, ''))
    .join('\n\n');

  return {
    blocks: compiledBlocks,
    html,
    text,
    compiledAt: new Date().toISOString(),
    warnings,
    hasDynamicBlocks,
  };
}

/**
 * Compiles a raw HTML/text template string (not block-based)
 */
export function compileRawTemplate(
  content: string,
  context: CompilerContext
): { html: string; text: string; warnings: string[] } {
  const warnings: string[] = [];
  
  try {
    const template = Handlebars.compile(content, { noEscape: true });
    const html = template(context);
    const text = html.replace(/<[^>]*>/g, '');
    
    return { html, text, warnings };
  } catch (error) {
    warnings.push(`Error al compilar plantilla: ${error}`);
    return { html: content, text: content.replace(/<[^>]*>/g, ''), warnings };
  }
}

/**
 * Validates that all required variables in the schema can be resolved
 */
export function validateContext(
  schema: TemplateSchema,
  context: CompilerContext
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const block of schema.blocks) {
    if (block.type === 'variable' && block.required && block.source) {
      const resolved = resolveSource(block.source, context);
      if (!resolved) {
        missing.push(block.source);
      }
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Validates template blocks for completeness (before activation)
 * Returns issues that would prevent proper compilation
 */
export function validateTemplateBlocks(
  schema: TemplateSchema
): { valid: boolean; issues: { blockId: string; blockName: string; issue: string }[] } {
  const issues: { blockId: string; blockName: string; issue: string }[] = [];

  for (const block of schema.blocks) {
    const blockName = block.variableName || block.id;

    if (block.type === 'variable') {
      if (!block.source || block.source.trim() === '') {
        issues.push({
          blockId: block.id,
          blockName,
          issue: 'Falta la fuente de datos (source)'
        });
      }
      if (!block.variableName || block.variableName.trim() === '') {
        issues.push({
          blockId: block.id,
          blockName: block.id,
          issue: 'Falta el nombre de variable'
        });
      }
    }

    if (block.type === 'dynamic') {
      if (!block.instructions || block.instructions.trim() === '') {
        issues.push({
          blockId: block.id,
          blockName,
          issue: 'Falta las instrucciones para la IA'
        });
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Extracts all variable sources used in a schema
 */
export function extractVariableSources(schema: TemplateSchema): string[] {
  return schema.blocks
    .filter(b => b.type === 'variable' && b.source)
    .map(b => b.source!);
}
