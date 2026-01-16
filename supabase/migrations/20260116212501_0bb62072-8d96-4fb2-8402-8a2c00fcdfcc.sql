-- Add custom fee fields to case_services table for per-service pricing in proposals
ALTER TABLE public.case_services 
ADD COLUMN custom_fee NUMERIC(12,2) DEFAULT NULL,
ADD COLUMN custom_monthly_fee NUMERIC(12,2) DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.case_services.custom_fee IS 'Custom one-time fee for this service in this case, overrides suggested_fee from services table';
COMMENT ON COLUMN public.case_services.custom_monthly_fee IS 'Custom monthly fee for this service in this case, overrides suggested_monthly_fee from services table';