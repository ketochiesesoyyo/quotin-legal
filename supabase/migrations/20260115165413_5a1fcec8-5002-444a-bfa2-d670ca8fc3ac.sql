-- =====================================================
-- QUOTELEGAL - Database Schema for Legal Proposal System
-- =====================================================

-- 1. Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'abogado', 'asistente');

-- 2. Create enum for case/proposal status
CREATE TYPE public.case_status AS ENUM (
  'nuevo',
  'docs_solicitados',
  'docs_recibidos',
  'en_analisis',
  'borrador',
  'revision',
  'enviada',
  'negociacion',
  'ganada',
  'perdida'
);

-- 3. Create enum for document status
CREATE TYPE public.document_status AS ENUM (
  'pendiente',
  'recibido',
  'validado',
  'rechazado'
);

-- 4. Create enum for urgency levels
CREATE TYPE public.urgency_level AS ENUM (
  'inmediata',
  '30_dias',
  '90_dias'
);

-- 5. Create enum for scope levels
CREATE TYPE public.scope_level AS ENUM (
  'diagnostico',
  'diagnostico_implementacion',
  'acompanamiento_continuo'
);

-- 6. Create enum for sensitivity/complexity levels
CREATE TYPE public.level_indicator AS ENUM (
  'baja',
  'media',
  'alta'
);

-- =====================================================
-- TABLES
-- =====================================================

-- User Roles Table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'asistente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Profiles Table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Firm Settings (despacho configuration)
CREATE TABLE public.firm_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Mi Despacho',
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  guarantees_text TEXT,
  closing_text TEXT,
  disclaimers_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Clients (Grupos empresariales)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name TEXT NOT NULL,
  alias TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Client Contacts
CREATE TABLE public.client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  position TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Client Business Entities (Razones sociales)
CREATE TABLE public.client_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  legal_name TEXT NOT NULL,
  rfc TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Services Catalog
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  standard_text TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Pricing Templates
CREATE TABLE public.pricing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  initial_payment DECIMAL(12,2),
  initial_payment_split TEXT DEFAULT '50/50',
  monthly_retainer DECIMAL(12,2),
  retainer_months INTEGER DEFAULT 12,
  exclusions_text TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Document Templates (Machotes)
CREATE TABLE public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  content JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Document Checklist Items (what documents to request)
CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cases / Proposals
CREATE TABLE public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  status case_status NOT NULL DEFAULT 'nuevo',
  title TEXT NOT NULL,
  -- Brief fields
  need_type TEXT,
  project_reason TEXT,
  urgency urgency_level,
  scope scope_level,
  notes TEXT,
  -- Internal signals
  price_sensitivity level_indicator,
  complexity level_indicator,
  is_recurring_client BOOLEAN DEFAULT false,
  -- Proposal content
  selected_template_id UUID REFERENCES public.document_templates(id),
  selected_pricing_id UUID REFERENCES public.pricing_templates(id),
  custom_initial_payment DECIMAL(12,2),
  custom_monthly_retainer DECIMAL(12,2),
  custom_retainer_months INTEGER,
  proposal_content JSONB,
  -- Tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  result_reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Case Services (selected services for a case)
CREATE TABLE public.case_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  custom_text TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Case Documents (uploaded by client)
CREATE TABLE public.case_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  checklist_item_id UUID REFERENCES public.checklist_items(id),
  name TEXT NOT NULL,
  file_url TEXT,
  status document_status NOT NULL DEFAULT 'pendiente',
  notes TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE,
  validated_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Case Activity Log (timeline)
CREATE TABLE public.case_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Proposal Versions (drafts)
CREATE TABLE public.proposal_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  content JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Audit Log (who changed what)
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create profile and role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  
  -- First user gets admin role, others get asistente
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'asistente');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamps
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_contacts_updated_at BEFORE UPDATE ON public.client_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pricing_templates_updated_at BEFORE UPDATE ON public.pricing_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_templates_updated_at BEFORE UPDATE ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_case_documents_updated_at BEFORE UPDATE ON public.case_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_firm_settings_updated_at BEFORE UPDATE ON public.firm_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Handle new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- User Roles Policies
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Profiles Policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Firm Settings Policies
CREATE POLICY "Authenticated users can view firm settings" ON public.firm_settings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage firm settings" ON public.firm_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Clients Policies
CREATE POLICY "Authenticated users can view clients" ON public.clients
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and abogados can manage clients" ON public.clients
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'abogado'));

-- Client Contacts Policies
CREATE POLICY "Authenticated users can view client contacts" ON public.client_contacts
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and abogados can manage client contacts" ON public.client_contacts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'abogado'));

-- Client Entities Policies
CREATE POLICY "Authenticated users can view client entities" ON public.client_entities
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and abogados can manage client entities" ON public.client_entities
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'abogado'));

-- Services Policies
CREATE POLICY "Authenticated users can view services" ON public.services
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage services" ON public.services
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Pricing Templates Policies
CREATE POLICY "Authenticated users can view pricing templates" ON public.pricing_templates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage pricing templates" ON public.pricing_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Document Templates Policies
CREATE POLICY "Authenticated users can view document templates" ON public.document_templates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage document templates" ON public.document_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Checklist Items Policies
CREATE POLICY "Authenticated users can view checklist items" ON public.checklist_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage checklist items" ON public.checklist_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Cases Policies
CREATE POLICY "Authenticated users can view cases" ON public.cases
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and abogados can manage cases" ON public.cases
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'abogado'));

CREATE POLICY "Asistentes can create and update cases" ON public.cases
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'asistente'));

CREATE POLICY "Asistentes can update cases" ON public.cases
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'asistente'));

-- Case Services Policies
CREATE POLICY "Authenticated users can view case services" ON public.case_services
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and abogados can manage case services" ON public.case_services
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'abogado'));

-- Case Documents Policies
CREATE POLICY "Authenticated users can view case documents" ON public.case_documents
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage case documents" ON public.case_documents
  FOR ALL TO authenticated
  USING (true);

-- Case Activities Policies
CREATE POLICY "Authenticated users can view case activities" ON public.case_activities
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert case activities" ON public.case_activities
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Proposal Versions Policies
CREATE POLICY "Authenticated users can view proposal versions" ON public.proposal_versions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and abogados can manage proposal versions" ON public.proposal_versions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'abogado'));

-- Audit Log Policies
CREATE POLICY "Admins can view audit log" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit log" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert default firm settings
INSERT INTO public.firm_settings (name, guarantees_text, closing_text, disclaimers_text)
VALUES (
  'Mi Despacho Legal',
  E'a) LEGALIDAD 100%: Las propuestas presentadas por nuestra Firma serán en todo momento acorde las disposiciones legales aplicables. Bajo ninguna circunstancia se ofrecerán alternativas al margen de la Ley.\n\nb) AHORRO GARANTIZADO: Los beneficios económicos y/o ahorros fiscales que deriven de nuestras propuestas, invariablemente serán superiores al monto de la inversión realizada en nuestros servicios. En caso contrario, se reembolsará al cliente la parte proporcional hasta cumplir con dicho compromiso.\n\nc) DEFENSA FISCAL SIN COSTO: En caso de que alguna autoridad competente en materia fiscal ejerza facultades de comprobación respecto de las propuestas implementadas por nuestra Firma, la atención del asunto se realizará sin costo para el cliente.\n\nd) CONFIDENCIALIDAD: En todo momento nuestra Firma tratará la información proporcionada concerniente al cliente y sus proyectos, planes de negocios, estrategias corporativas, secretos industriales, operaciones, registros, inversiones, financiamientos, activos, asuntos, tecnologías o cualquier otra información, ya sea oral o escrita, de manera estrictamente confidencial.',
  'Como Firma, es un honor poder colaborar con ustedes brindándoles un servicio de la más alta calidad técnica y profesional. Agradecemos la oportunidad de presentarles esta propuesta de honorarios, y confiamos en la capacidad de nuestra Firma para brindarles un servicio que satisfaga sus necesidades, haciendo uso de nuestra amplia experiencia profesional.\n\nSin otro particular por el momento, reciba un cordial saludo, quedando a sus órdenes para cualquier duda o aclaración al respecto.',
  'La presente propuesta no incluye servicios o gastos adicionales que no se encuentren expresamente previstos tales como son gastos notariales, pago de derechos, cuotas de terceros, legalización o apostilla de documentos, entre otros que sean necesarios y que únicamente serán erogados previa autorización de su parte.'
);

-- Insert default services
INSERT INTO public.services (name, description, standard_text, sort_order) VALUES
('Planeación Fiscal y Estructura Corporativa', 'Análisis y propuesta de alternativas para reducir carga fiscal', 'Análisis y propuesta de alternativas que permita reducir la carga fiscal mediante la implementación de una estructura corporativa eficiente, a fin de generar ahorros en el pago de impuestos.', 1),
('Orden Operativo y Blindaje Patrimonial', 'Análisis y propuesta de estructura operativa para blindaje patrimonial', 'Análisis y propuesta de estructura operativa que permita blindar patrimonialmente a los socios, así como los activos principales del negocio, en el entendido que establecer un orden integral resulta fundamental.', 2),
('Aprovechamiento de Activos', 'Análisis para aprovechar activos tangibles e intangibles', 'Análisis y propuesta de alternativa que permita aprovechar al máximo los activos tangibles e intangibles con que cuenta la Empresa.', 3),
('Ingresos de Socios', 'Alternativas para percibir ingresos con menor impacto fiscal', 'Análisis y propuesta de alternativas que permitan a los socios percibir ingresos con el menor impacto fiscal posible.', 4);

-- Insert default pricing template
INSERT INTO public.pricing_templates (name, initial_payment, initial_payment_split, monthly_retainer, retainer_months, exclusions_text) VALUES
('Estándar Fiscal Completo', 300000.00, '50/50', 54000.00, 12, 'La presente propuesta no incluye servicios o gastos adicionales que no se encuentren expresamente previstos tales como son gastos notariales, pago de derechos, cuotas de terceros, legalización o apostilla de documentos, entre otros que sean necesarios y que únicamente serán erogados previa autorización de su parte.');

-- Insert default checklist items
INSERT INTO public.checklist_items (name, description, is_default, sort_order) VALUES
('Constancia de Situación Fiscal', 'CSF actualizada del SAT', true, 1),
('Opinión de Cumplimiento (32-D)', 'Opinión de cumplimiento de obligaciones fiscales', true, 2),
('Declaración Anual', 'Última declaración anual presentada', true, 3),
('Balanza de Comprobación', 'Balanza de comprobación más reciente', true, 4);

-- Insert default document template
INSERT INTO public.document_templates (name, description, content) VALUES
('Propuesta Estándar DESSÓN', 'Plantilla principal para propuestas de servicios legales', '{
  "sections": [
    {"type": "header", "key": "recipient"},
    {"type": "greeting", "key": "salutation"},
    {"type": "section", "key": "antecedentes", "title": "I. ANTECEDENTES Y ALCANCE DE LOS SERVICIOS"},
    {"type": "section", "key": "servicios", "title": "Servicios Requeridos"},
    {"type": "section", "key": "participacion", "title": "Nuestra Participación"},
    {"type": "section", "key": "honorarios", "title": "II. PROPUESTA DE HONORARIOS"},
    {"type": "section", "key": "garantias", "title": "III. GARANTÍAS DE SATISFACCIÓN"},
    {"type": "section", "key": "cierre", "title": "Cierre"},
    {"type": "signature", "key": "firma"}
  ]
}'::jsonb);