export interface ClientFormData {
  // Basic info
  group_name: string;
  alias: string;
  notes: string;
  industry: string;
  annual_revenue: string;
  employee_count: number | null;
  
  // Primary contact
  contact: {
    full_name: string;
    position: string;
    email: string;
    phone: string;
  };
}

export interface EntityFormData {
  id?: string;
  legal_name: string;
  rfc: string;
}

export interface DocumentData {
  id?: string;
  entity_id: string;
  document_type: 'csf' | 'opinion_32d' | 'declaracion_anual' | 'balanza';
  file_url: string | null;
  file_name: string | null;
  status: 'pendiente' | 'subido' | 'validado' | 'error';
  notes: string | null;
}

export interface WizardState {
  clientData: ClientFormData;
  entities: EntityFormData[];
  documents: Record<string, DocumentData[]>; // keyed by entity temp id
  currentStep: number;
}

export const DOCUMENT_TYPES = [
  { id: 'csf', name: 'Constancia de Situación Fiscal (CSF)', description: 'Documento emitido por el SAT' },
  { id: 'opinion_32d', name: 'Opinión de Cumplimiento 32-D', description: 'Opinión positiva del SAT' },
  { id: 'declaracion_anual', name: 'Declaración Anual 2024', description: 'Declaración de impuestos anual' },
  { id: 'balanza', name: 'Balanza de Comprobación', description: 'Estado financiero mensual' },
] as const;

export const INDUSTRIES = [
  'Farmacéutico',
  'Manufactura',
  'Tecnología',
  'Servicios Financieros',
  'Retail',
  'Construcción',
  'Agroindustria',
  'Energía',
  'Transporte y Logística',
  'Salud',
  'Educación',
  'Otro',
] as const;

export const REVENUE_RANGES = [
  'Menos de $1M MXN',
  '$1M - $10M MXN',
  '$10M - $50M MXN',
  '$50M - $100M MXN',
  '$100M - $500M MXN',
  'Más de $500M MXN',
] as const;
