-- Create table to store notes history for proposals/cases
CREATE TABLE public.case_notes_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  notes text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.case_notes_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view case notes history"
ON public.case_notes_history
FOR SELECT
USING (true);

CREATE POLICY "Admins and abogados can manage case notes history"
ON public.case_notes_history
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'abogado'::app_role));

CREATE POLICY "Asistentes can insert case notes history"
ON public.case_notes_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'asistente'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_case_notes_history_case_id ON public.case_notes_history(case_id);
CREATE INDEX idx_case_notes_history_created_at ON public.case_notes_history(created_at DESC);