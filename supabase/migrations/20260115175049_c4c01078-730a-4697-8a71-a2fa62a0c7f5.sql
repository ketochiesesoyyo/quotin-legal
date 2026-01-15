-- Add AI analysis columns to cases table
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS ai_analysis jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_analyzed_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_status text DEFAULT 'pending' CHECK (ai_status IN ('pending', 'analyzing', 'completed', 'error'));