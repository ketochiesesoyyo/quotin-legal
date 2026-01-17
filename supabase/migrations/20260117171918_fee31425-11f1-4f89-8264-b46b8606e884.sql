-- Sprint 1: Enterprise Template System - Schema Extension

-- Add new columns for template workflow and structure
ALTER TABLE document_templates
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft' 
    CHECK (status IN ('draft', 'analyzed', 'reviewed', 'approved', 'active')),
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'manual'
    CHECK (source_type IN ('manual', 'docx')),
  ADD COLUMN IF NOT EXISTS version text DEFAULT 'v1.0',
  ADD COLUMN IF NOT EXISTS parent_template_id uuid REFERENCES document_templates(id),
  ADD COLUMN IF NOT EXISTS canonical_content jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS schema_json jsonb DEFAULT '{"blocks":[],"version":"1.0"}',
  ADD COLUMN IF NOT EXISTS ai_instructions jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS analysis_result jsonb,
  ADD COLUMN IF NOT EXISTS analyzed_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id);

-- Add constraints for audit fields (reviewed_by required when reviewed_at is set)
ALTER TABLE document_templates
  ADD CONSTRAINT reviewed_requires_user 
    CHECK (reviewed_at IS NULL OR reviewed_by IS NOT NULL);

ALTER TABLE document_templates
  ADD CONSTRAINT approved_requires_user
    CHECK (approved_at IS NULL OR approved_by IS NOT NULL);

-- Populate services with objectives and deliverables templates
UPDATE services SET 
  objectives_template = '1. Identificar contingencias fiscales existentes y evaluar riesgos
2. Validar el cumplimiento de obligaciones fiscales federales y locales
3. Diseñar estrategia de optimización tributaria apegada a derecho
4. Implementar estructura corporativa eficiente para operaciones futuras',
  deliverables_template = '• Diagnóstico fiscal integral con hallazgos priorizados
• Matriz de riesgos fiscales con nivel de exposición
• Propuesta de estructura corporativa óptima
• Plan de implementación con cronograma y responsables
• Memorándum ejecutivo de recomendaciones'
WHERE name ILIKE '%Planeación Fiscal%' OR name ILIKE '%Fiscal%';

UPDATE services SET 
  objectives_template = '1. Separar patrimonio personal del empresarial de forma legal
2. Proteger activos ante contingencias fiscales o comerciales
3. Estructurar correctamente la operación diaria
4. Formalizar relaciones entre entidades del grupo',
  deliverables_template = '• Análisis de estructura corporativa actual
• Propuesta de blindaje patrimonial
• Contratos de protección entre partes relacionadas
• Manual operativo con políticas internas
• Actas de asamblea necesarias'
WHERE name ILIKE '%Orden Operativo%' OR name ILIKE '%Blindaje%';

UPDATE services SET 
  objectives_template = '1. Identificar activos tangibles e intangibles subutilizados
2. Generar flujos de efectivo adicionales mediante aprovechamiento
3. Optimizar el uso fiscal de los activos existentes
4. Crear mecanismos de monetización sostenibles',
  deliverables_template = '• Inventario valorado de activos disponibles
• Análisis de opciones de aprovechamiento
• Propuesta de esquema de uso con beneficios fiscales
• Contratos necesarios para implementación
• Proyección financiera del esquema propuesto'
WHERE name ILIKE '%Aprovechamiento%' OR name ILIKE '%Activos%';

UPDATE services SET 
  objectives_template = '1. Formalizar los retiros de recursos de los socios
2. Optimizar la carga fiscal personal de los socios
3. Documentar correctamente las operaciones entre socios y empresa
4. Establecer políticas claras de distribución de utilidades',
  deliverables_template = '• Diagnóstico de situación actual de retiros
• Esquema óptimo de retiro de recursos
• Contratos y documentación soporte
• Calendario de implementación
• Proyección de ahorro fiscal estimado'
WHERE name ILIKE '%Ingresos%' OR name ILIKE '%Socios%';