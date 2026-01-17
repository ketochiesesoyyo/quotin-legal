// ============================================
// Sprint 1: Enterprise Template System Types
// ============================================

// Estados del workflow de plantilla
export type TemplateStatus = 'draft' | 'analyzed' | 'reviewed' | 'approved' | 'active';

// Tipos de origen del contenido
export type SourceType = 'manual' | 'docx';

// SPRINT 1: Solo static y variable
// 'dynamic' existe en el tipo pero está DESHABILITADO en la UI
export type BlockType = 'static' | 'variable';
// Para P2: export type BlockType = 'static' | 'variable' | 'dynamic';

// Estructura de un bloque de plantilla
export interface TemplateBlock {
  id: string;
  type: BlockType;
  content: string;
  order: number;
  // Para bloques variable
  source?: string;           // e.g., "service.objectives_template", "client.name"
  variableName?: string;     // e.g., "objectives", "client_name"
  required?: boolean;
  format?: 'richtext' | 'text' | 'list';
  // SPRINT 1: 'instructions' solo para P2 cuando se habilite 'dynamic'
  // instructions?: string;
}

// Schema de la plantilla (FUENTE DE VERDAD)
export interface TemplateSchema {
  blocks: TemplateBlock[];
  version: string;
}

// Derive variables from schema at runtime (no separate column)
export function deriveVariablesFromSchema(schema: TemplateSchema): string[] {
  return schema.blocks
    .filter(block => block.type === 'variable' && block.variableName)
    .map(block => block.variableName!);
}

// Resultado del análisis IA (output estructurado)
export interface AIAnalysisBlock {
  block_id: string;
  suggested_type: BlockType; // Solo 'static' | 'variable' en Sprint 1
  confidence: number;
  reason: string;
  suggested_source?: string;
  suggested_variable_name?: string;
}

export interface AIAnalysisResult {
  detected_blocks: AIAnalysisBlock[];
  warnings: string[];
  confidence_score: number;
  analyzed_at: string;
}

// Tipo completo de plantilla desde BD
export interface DocumentTemplate {
  id: string;
  name: string;
  description: string | null;
  content: Record<string, unknown>;
  is_active: boolean | null;
  status: TemplateStatus;
  source_type: SourceType;
  version: string;
  parent_template_id: string | null;
  canonical_content: Record<string, unknown>;
  schema_json: TemplateSchema;
  ai_instructions: Record<string, unknown>;
  analysis_result: AIAnalysisResult | null;
  analyzed_at: string | null;
  created_by: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

// SPRINT 1: Limitaciones de DOCX documentadas
export const DOCX_LIMITATIONS = {
  supported: ['Párrafos', 'Negritas', 'Cursivas', 'Listas simples', 'Títulos'],
  notSupported: ['Tablas complejas', 'Encabezados/pies de página', 'Notas al pie', 
                 'Imágenes', 'Formas', 'Comentarios', 'Control de cambios'],
  warningMessage: 'Este documento contiene elementos no soportados que serán convertidos a texto plano.'
} as const;

// Status configuration for UI
export const STATUS_CONFIG: Record<TemplateStatus, { label: string; color: string; icon: string }> = {
  draft: { label: 'Borrador', color: 'bg-muted text-muted-foreground', icon: 'FileEdit' },
  analyzed: { label: 'Analizado', color: 'bg-blue-500/20 text-blue-700', icon: 'Brain' },
  reviewed: { label: 'Revisado', color: 'bg-amber-500/20 text-amber-700', icon: 'CheckCircle' },
  approved: { label: 'Aprobado', color: 'bg-green-500/20 text-green-700', icon: 'CheckCircle2' },
  active: { label: 'Activo', color: 'bg-green-600 text-white', icon: 'Zap' },
};

// Available variable sources
export const VARIABLE_SOURCES = [
  { value: 'client.group_name', label: 'Nombre del cliente' },
  { value: 'client.rfc', label: 'RFC del cliente' },
  { value: 'service.objectives_template', label: 'Objetivos del servicio' },
  { value: 'service.deliverables_template', label: 'Entregables del servicio' },
  { value: 'case.background', label: 'Antecedentes del caso' },
  { value: 'case.title', label: 'Título del caso' },
  { value: 'proposal.date', label: 'Fecha de la propuesta' },
  { value: 'proposal.total_fee', label: 'Honorarios totales' },
] as const;
