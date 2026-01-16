import type { Tables, Enums } from "@/integrations/supabase/types";

export type Case = Tables<"cases">;
export type Client = Tables<"clients">;
export type ClientEntity = Tables<"client_entities">;
export type ClientDocument = Tables<"client_documents">;
export type ClientContact = Tables<"client_contacts">;
export type Service = Tables<"services">;
export type CaseService = Tables<"case_services">;
export type PricingTemplate = Tables<"pricing_templates">;
export type CaseStatus = Enums<"case_status">;

// Pricing mode for proposal fee calculation
export type PricingMode = 'per_service' | 'summed' | 'global';

export interface AIAnalysis {
  objective: string;
  risks: string[];
  suggestedServices: string[];
  missingInfo: string[];
  summary: string;
  nextStatus: string;
}

export interface ServiceWithConfidence {
  service: Service;
  confidence: number;
  isSelected: boolean;
  customText?: string;
  customFee?: number;
  customMonthlyFee?: number;
}

export interface ProposalEditorState {
  // Client info
  client: Client | null;
  entities: ClientEntity[];
  documents: ClientDocument[];
  
  // AI Analysis
  aiAnalysis: AIAnalysis | null;
  
  // Background section
  background: string;
  isBackgroundEdited: boolean;
  
  // Services
  services: ServiceWithConfidence[];
  
  // Pricing
  selectedPricingId: string | null;
  customInitialPayment: number;
  customMonthlyRetainer: number;
  customRetainerMonths: number;
  paymentSplit: string;
  
  // Progress
  progress: number;
  completedSteps: string[];
}

export interface FirmSettings {
  name: string;
  logo_url?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  guarantees_text?: string | null;
  disclaimers_text?: string | null;
  closing_text?: string | null;
}

export interface PrimaryContact {
  fullName: string;
  position?: string | null;
}

export interface EntityInfo {
  legalName: string;
  rfc?: string | null;
}

export interface ProposalPreviewData {
  // Document date
  documentDate: string;
  
  // Primary contact
  primaryContact: PrimaryContact | null;
  
  // Client info
  clientName: string;
  groupAlias: string;
  industry: string;
  entityCount: number;
  annualRevenue: string;
  employeeCount: number;
  
  // Entities list
  entities: EntityInfo[];
  
  // Background
  background: string;
  
  // Validated data (optional for now)
  validatedData: {
    rfc: string | null;
    opinion32d: string | null;
    declaredIncome: string | null;
    unusedDeductions: string | null;
  };
  
  // Selected services
  selectedServices: ServiceWithConfidence[];
  
  // Pricing mode
  pricingMode: PricingMode;
  
  // Pricing details
  pricing: {
    initialPayment: number;
    initialPaymentDescription: string;
    paymentSplit: string;
    monthlyRetainer: number;
    retainerMonths: number;
    exclusionsText?: string | null;
    totalAmount: number;
    roi: string;
  };
  
  // Firm settings
  firmSettings?: FirmSettings;
}
