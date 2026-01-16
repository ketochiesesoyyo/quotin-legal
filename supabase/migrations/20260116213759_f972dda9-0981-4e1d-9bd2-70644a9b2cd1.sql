-- Add pricing_mode column to cases table
-- Values: 'per_service' (default), 'summed', 'global'
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS pricing_mode text DEFAULT 'per_service';

-- Add comment for documentation
COMMENT ON COLUMN public.cases.pricing_mode IS 'Determines how fees are calculated: per_service (itemized), summed (total only), global (manual/template)';