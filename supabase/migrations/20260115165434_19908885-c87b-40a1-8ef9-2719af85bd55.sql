-- Fix overly permissive RLS policies

-- Drop the permissive policies
DROP POLICY IF EXISTS "Authenticated users can manage case documents" ON public.case_documents;
DROP POLICY IF EXISTS "Authenticated users can insert case activities" ON public.case_activities;
DROP POLICY IF EXISTS "System can insert audit log" ON public.audit_log;

-- Create more restrictive policies for case_documents
CREATE POLICY "Admins and abogados can manage case documents" ON public.case_documents
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'abogado'));

CREATE POLICY "Asistentes can insert and update case documents" ON public.case_documents
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'asistente'));

CREATE POLICY "Asistentes can update case documents" ON public.case_documents
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'asistente'));

-- Create more restrictive policy for case_activities
CREATE POLICY "Authenticated users can insert own activities" ON public.case_activities
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create more restrictive policy for audit_log
CREATE POLICY "Authenticated users can insert own audit entries" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());