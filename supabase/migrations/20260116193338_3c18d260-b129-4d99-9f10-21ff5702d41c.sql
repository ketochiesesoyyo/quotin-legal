-- Add new fields to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS annual_revenue TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS employee_count INTEGER;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'incompleto';

-- Create client_documents table for documents per entity
CREATE TABLE IF NOT EXISTS client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES client_entities(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL, -- 'csf', 'opinion_32d', 'declaracion_anual', 'balanza'
  file_url TEXT,
  file_name TEXT,
  status TEXT DEFAULT 'pendiente', -- 'pendiente', 'subido', 'validado', 'error'
  notes TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE,
  validated_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_documents
CREATE POLICY "Authenticated users can view client documents"
ON client_documents FOR SELECT
USING (true);

CREATE POLICY "Admins and abogados can manage client documents"
ON client_documents FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'abogado'::app_role));

CREATE POLICY "Asistentes can insert client documents"
ON client_documents FOR INSERT
WITH CHECK (has_role(auth.uid(), 'asistente'::app_role));

CREATE POLICY "Asistentes can update client documents"
ON client_documents FOR UPDATE
USING (has_role(auth.uid(), 'asistente'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_client_documents_updated_at
BEFORE UPDATE ON client_documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for client documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can view client documents files"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload client documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'client-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update client documents files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'client-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete client documents files"
ON storage.objects FOR DELETE
USING (bucket_id = 'client-documents' AND auth.role() = 'authenticated');