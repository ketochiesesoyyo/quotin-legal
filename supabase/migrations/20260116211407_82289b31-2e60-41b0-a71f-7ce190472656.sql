-- Add pricing fields to services table
ALTER TABLE public.services
ADD COLUMN fee_type text DEFAULT 'one_time' CHECK (fee_type IN ('one_time', 'monthly', 'both')),
ADD COLUMN suggested_fee numeric DEFAULT NULL,
ADD COLUMN suggested_monthly_fee numeric DEFAULT NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.services.fee_type IS 'Type of fee: one_time (pago único), monthly (iguala mensual), both (ambos)';
COMMENT ON COLUMN public.services.suggested_fee IS 'Suggested one-time fee for this service';
COMMENT ON COLUMN public.services.suggested_monthly_fee IS 'Suggested monthly retainer for this service';