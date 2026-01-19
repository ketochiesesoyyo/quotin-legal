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

// Text override for inline editing in preview
export interface TextOverride {
  sectionId: string;
  originalText: string;
  newText: string;
  isAIGenerated: boolean;
  instruction?: string; // AI instruction if AI-generated
  timestamp: string; // ISO timestamp for history tracking
}

// Pricing mode for proposal fee calculation
export type PricingMode = 'per_service' | 'summed' | 'global';

// Payment installment for initial payment (e.g., 50% at signing, 50% at delivery)
export interface PaymentInstallment {
  percentage: number;  // e.g., 50
  description: string; // e.g., "al momento de aceptación de la presente propuesta"
}

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
  salutationPrefix?: 'Sr.' | 'Sra.';
}

export interface RecipientData {
  fullName: string;
  position: string | null;
  salutationPrefix: 'Sr.' | 'Sra.';
  isCustom: boolean;
  contactId?: string | null;
}

// AI-generated proposal content
export interface ServiceDescription {
  serviceId: string;
  expandedText: string;
  objectives: string[];
  deliverables?: string[];
}

export interface GeneratedProposalContent {
  transitionText: string;
  serviceDescriptions: ServiceDescription[];
  closingText: string;
  generatedAt: string;
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

  // Optional narrative block for services (when user inserts the generated services text)
  servicesNarrative?: string;
  
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
    installments: PaymentInstallment[]; // Replaces paymentSplit for detailed control
    paymentSplit?: string; // Keep for backward compatibility
    monthlyRetainer: number;
    retainerMonths: number;
    retainerStartDescription: string; // e.g., "El inicio de esta etapa será a libre decisión del cliente"
    canCancelWithoutPenalty: boolean;
    exclusionsText?: string | null;
    totalAmount: number;
    roi: string;
  };
  
  // Firm settings
  firmSettings?: FirmSettings;
  
  // AI-generated content (optional - generated on demand)
  generatedContent?: GeneratedProposalContent;
}
