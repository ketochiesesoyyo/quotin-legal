-- Phase 0: Add fields for Template-First architecture
-- Add field for generated block contents from template mode
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS generated_block_contents jsonb DEFAULT NULL;

-- Add field for template snapshot (immutable copy at assignment time)
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS template_snapshot jsonb DEFAULT NULL;

-- Add timestamp for content generation
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS content_generated_at timestamptz DEFAULT NULL;

-- Index for performance on template lookups
CREATE INDEX IF NOT EXISTS idx_cases_selected_template_id 
ON cases(selected_template_id);

-- Documentation comments
COMMENT ON COLUMN cases.generated_block_contents IS 'AI-generated content for template dynamic blocks: {block_id: content}';
COMMENT ON COLUMN cases.template_snapshot IS 'Immutable snapshot of template schema_json and ai_instructions at assignment time';
COMMENT ON COLUMN cases.content_generated_at IS 'Timestamp of last AI content generation';