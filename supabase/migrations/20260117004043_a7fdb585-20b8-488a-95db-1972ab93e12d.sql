-- Add 'archivada' to case_status enum
ALTER TYPE public.case_status ADD VALUE IF NOT EXISTS 'archivada';