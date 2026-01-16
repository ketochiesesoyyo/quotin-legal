import type { Tables, Enums } from "@/integrations/supabase/types";

export type Case = Tables<"cases">;
export type Client = Tables<"clients">;
export type ClientEntity = Tables<"client_entities">;
export type ClientDocument = Tables<"client_documents">;
export type Service = Tables<"services">;
export type CaseService = Tables<"case_services">;
export type PricingTemplate = Tables<"pricing_templates">;
export type CaseStatus = Enums<"case_status">;

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

export interface ProposalPreviewData {
  clientName: string;
  entityCount: number;
  annualRevenue: string;
  employeeCount: number;
  background: string;
  validatedData: {
    rfc: string | null;
    opinion32d: string | null;
    declaredIncome: string | null;
    unusedDeductions: string | null;
  };
  selectedServices: ServiceWithConfidence[];
  pricing: {
    baseAmount: number;
    paymentScheme: string;
    roi: string;
  };
  firmSettings?: FirmSettings;
}
