-- Add template columns to services for AI content generation
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS objectives_template text,
ADD COLUMN IF NOT EXISTS deliverables_template text;

COMMENT ON COLUMN public.services.objectives_template IS 'Template text describing typical objectives for this service, used by AI for proposal generation';
COMMENT ON COLUMN public.services.deliverables_template IS 'Template text describing typical deliverables for this service, used by AI for proposal generation';