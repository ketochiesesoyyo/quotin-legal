-- Add draft_content column to cases for editable document HTML
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS draft_content TEXT;

-- Add comment explaining the purpose
COMMENT ON COLUMN public.cases.draft_content IS 'Editable HTML content of the proposal document, cloned from template on creation';