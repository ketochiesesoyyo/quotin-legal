import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage, formatErrorForToast, withRetry } from "@/lib/error-utils";
import { useProposalVersions, type ProposalVersionContent } from "@/hooks/useProposalVersions";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Loader2 } from "lucide-react";
import { EditorHeader } from "@/components/propuestas/EditorHeader";
import { ProgressIndicator } from "@/components/propuestas/ProgressIndicator";
import { UserNotesSection } from "@/components/propuestas/UserNotesSection";
import { AIBackgroundSuggestion } from "@/components/propuestas/AIBackgroundSuggestion";
import { ValidatedDataSection } from "@/components/propuestas/ValidatedDataSection";
import { PricingModeSelector } from "@/components/propuestas/PricingModeSelector";
import { ServicesSection } from "@/components/propuestas/ServicesSection";
import { PricingSection } from "@/components/propuestas/PricingSection";
import { ProposalFullPreview } from "@/components/propuestas/ProposalFullPreview";
import { RecipientSection, type RecipientData } from "@/components/propuestas/RecipientSection";
import { TemplateSelector } from "@/components/propuestas/TemplateSelector";
import { buildCompilerContext } from "@/components/propuestas/CompiledDocumentPreview";
import { ProposalDocumentEditor } from "@/components/propuestas/ProposalDocumentEditor";
import { HonorariosGenerator } from "@/components/propuestas/HonorariosGenerator";
import { DocumentSidebar } from "@/components/propuestas/DocumentSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { generateFullDocumentHTML, parseDocumentHTML, insertIntoSection } from "@/lib/document-html-utils";
import type { DocumentTemplate, TemplateSchema } from "@/components/plantillas/types";
import type {
  Case,
  Client,
  ClientEntity,
  ClientDocument,
  ClientContact,
  Service,
  CaseService,
  PricingTemplate,
  AIAnalysis,
  ServiceWithConfidence,
  ProposalPreviewData,
  FirmSettings,
  PricingMode,
  PaymentInstallment,
  GeneratedProposalContent,
  TextOverride,
  TemplateSnapshot,
  TemplateGenerationResponse,
} from "@/components/propuestas/types";

export default function PropuestaEditar() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Track AI status for polling
  const [aiStatusForPolling, setAiStatusForPolling] = useState<string | null>(null);

  // State for editor
  const [userNotes, setUserNotes] = useState(""); // Notas crudas del usuario
  const [proposalBackground, setProposalBackground] = useState(""); // Antecedentes finales
  const [aiSuggestion, setAiSuggestion] = useState<string | undefined>(); // Sugerencia de IA
  const [editedAiSuggestion, setEditedAiSuggestion] = useState<string | undefined>(); // Sugerencia editada manualmente
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [services, setServices] = useState<ServiceWithConfidence[]>([]);
  const [selectedPricingId, setSelectedPricingId] = useState<string | null>(null);
  const [customInitialPayment, setCustomInitialPayment] = useState(0);
  const [customMonthlyRetainer, setCustomMonthlyRetainer] = useState(0);
  const [customRetainerMonths, setCustomRetainerMonths] = useState(12);
  const [installments, setInstallments] = useState<PaymentInstallment[]>([
    { percentage: 50, description: "al momento de aceptación de la presente propuesta" },
    { percentage: 50, description: "al momento de presentación de la propuesta de reestructura" },
  ]);
  const [retainerStartDescription, setRetainerStartDescription] = useState(
    "El inicio de esta etapa será a libre decisión del cliente"
  );
  const [canCancelWithoutPenalty, setCanCancelWithoutPenalty] = useState(true);
  const [pricingMode, setPricingMode] = useState<PricingMode>('per_service');
  const [isPricingConfigOpen, setIsPricingConfigOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedProposalContent | null>(null);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [generatedServicesContent, setGeneratedServicesContent] = useState<string | undefined>();
  const [editedServicesContent, setEditedServicesContent] = useState<string | undefined>();
  const [servicesNarrative, setServicesNarrative] = useState<string>("");
  const [honorariosNarrative, setHonorariosNarrative] = useState<string>("");
  const [recipientData, setRecipientData] = useState<RecipientData>({
    fullName: "[Nombre del Contacto]",
    position: null,
    salutationPrefix: 'Sr.',
    isCustom: false,
    contactId: null,
  });
  
  // Document template state (Sprint 2)
  const [selectedDocumentTemplate, setSelectedDocumentTemplate] = useState<DocumentTemplate | null>(null);

  // Sprint 4: Text overrides for inline preview editing (kept for version tracking)
  const [textOverrides, setTextOverrides] = useState<TextOverride[]>([]);

  // Template-first architecture: pre-generated block contents
  const [generatedBlockContents, setGeneratedBlockContents] = useState<Record<string, string>>({});

  // Simplified flow: draft content for unified document editing
  const [draftContent, setDraftContent] = useState<string>("");
  const [showDocumentSidebar, setShowDocumentSidebar] = useState(true);

  // Ref for scrolling to Antecedentes section
  const antecedentesRef = useRef<HTMLDivElement>(null);

  // Sprint 3: Proposal versions and audit logging
  const { saveVersion, versions, latestVersionNumber, isSaving: isSavingVersion } = useProposalVersions(id);
  const { log: logAudit } = useAuditLog();

  // Fetch case data - refetch while AI is analyzing
  const { data: caseData, isLoading: loadingCase } = useQuery({
    queryKey: ["case", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      // Update polling status when data is fetched
      setAiStatusForPolling(data?.ai_status ?? null);
      return data as Case & { ai_analysis?: AIAnalysis };
    },
    enabled: !!id,
    // Refetch every 2 seconds while AI is still analyzing
    refetchInterval: 
      aiStatusForPolling === 'pending' || aiStatusForPolling === 'analyzing'
        ? 2000
        : false,
  });

  // Fetch client
  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ["client", caseData?.client_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", caseData!.client_id)
        .single();
      if (error) throw error;
      return data as Client;
    },
    enabled: !!caseData?.client_id,
  });

  // Fetch entities
  const { data: entities = [] } = useQuery({
    queryKey: ["entities", caseData?.client_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_entities")
        .select("*")
        .eq("client_id", caseData!.client_id);
      if (error) throw error;
      return data as ClientEntity[];
    },
    enabled: !!caseData?.client_id,
  });

  // Fetch client documents
  const { data: clientDocuments = [] } = useQuery({
    queryKey: ["client_documents", entities.map((e) => e.id)],
    queryFn: async () => {
      if (entities.length === 0) return [];
      const { data, error } = await supabase
        .from("client_documents")
        .select("*")
        .in(
          "entity_id",
          entities.map((e) => e.id)
        );
      if (error) throw error;
      return data as ClientDocument[];
    },
    enabled: entities.length > 0,
  });

  // Fetch all services
  const { data: allServices = [] } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as Service[];
    },
  });

  // Fetch case services
  const { data: caseServices = [] } = useQuery({
    queryKey: ["case_services", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("case_services")
        .select("*")
        .eq("case_id", id!);
      if (error) throw error;
      return data as CaseService[];
    },
    enabled: !!id,
  });

  // Fetch pricing templates
  const { data: pricingTemplates = [] } = useQuery({
    queryKey: ["pricing_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_templates")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data as PricingTemplate[];
    },
  });

  // Fetch firm settings
  const { data: firmSettings } = useQuery({
    queryKey: ["firm_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firm_settings")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data as FirmSettings | null;
    },
  });

  // Fetch primary contact
  const { data: primaryContact } = useQuery({
    queryKey: ["primary_contact", caseData?.client_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", caseData!.client_id)
        .eq("is_primary", true)
        .maybeSingle();
      if (error) throw error;
      return data as ClientContact | null;
    },
    enabled: !!caseData?.client_id,
  });

  // Fetch all client contacts for recipient selector
  const { data: allContacts = [] } = useQuery({
    queryKey: ["client_contacts", caseData?.client_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", caseData!.client_id)
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return data as ClientContact[];
    },
    enabled: !!caseData?.client_id,
  });

  // Initialize state from case data
  useEffect(() => {
    if (caseData) {
      // Set user notes from case.notes
      if (caseData.notes) {
        setUserNotes(caseData.notes);
      }
      // Set proposal background from AI analysis summary if available
      const aiAnalysis = caseData.ai_analysis as AIAnalysis | null;
      if (aiAnalysis?.summary) {
        setProposalBackground(aiAnalysis.summary);
      }

      // Set pricing
      if (caseData.custom_initial_payment) {
        setCustomInitialPayment(Number(caseData.custom_initial_payment));
      }
      if (caseData.custom_monthly_retainer) {
        setCustomMonthlyRetainer(Number(caseData.custom_monthly_retainer));
      }
      if (caseData.custom_retainer_months) {
        setCustomRetainerMonths(Number(caseData.custom_retainer_months));
      }
      if (caseData.selected_pricing_id) {
        setSelectedPricingId(caseData.selected_pricing_id);
      }
      // Set pricing mode from case data
      if ((caseData as any).pricing_mode) {
        setPricingMode((caseData as any).pricing_mode as PricingMode);
      }

      // Template-first: Rehydrate generated block contents
      if ((caseData as any).generated_block_contents) {
        setGeneratedBlockContents((caseData as any).generated_block_contents as Record<string, string>);
      }

      // Unified document editing: hydrate draft content
      if ((caseData as any).draft_content) {
        setDraftContent(((caseData as any).draft_content as string) || "");
      }

      // Classic preview persistence: hydrate proposal_content (if present)
      const proposalContent = (caseData as any).proposal_content as any;
      if (proposalContent) {
        if (typeof proposalContent.background === "string") {
          setProposalBackground(proposalContent.background);
        }
        if (typeof proposalContent.servicesNarrative === "string") {
          setServicesNarrative(proposalContent.servicesNarrative);
        }
        if (typeof proposalContent.honorariosNarrative === "string") {
          setHonorariosNarrative(proposalContent.honorariosNarrative);
        }
        if (Array.isArray(proposalContent.textOverrides)) {
          setTextOverrides(proposalContent.textOverrides);
        }
        if (proposalContent.generatedContent) {
          setGeneratedContent(proposalContent.generatedContent);
        }
      }
    }
  }, [caseData]);

  // Template-first: Detect if case has template mode
  const hasTemplate = useMemo(() => {
    return !!(caseData as any)?.selected_template_id && !!(caseData as any)?.template_snapshot;
  }, [(caseData as any)?.selected_template_id, (caseData as any)?.template_snapshot]);

  const templateSnapshot = useMemo(() => {
    return (caseData as any)?.template_snapshot as TemplateSnapshot | null;
  }, [(caseData as any)?.template_snapshot]);

  // Initialize recipient from primary contact
  useEffect(() => {
    if (primaryContact) {
      const firstName = primaryContact.full_name.split(" ")[0].toLowerCase();
      const femaleNames = ["maria", "ana", "carmen", "laura", "patricia", "martha", "rosa", "guadalupe", "elena", "adriana", "claudia", "gabriela", "monica", "veronica", "alejandra", "sandra", "lucia", "fernanda", "diana", "paola"];
      const prefix: 'Sr.' | 'Sra.' = femaleNames.some((n) => firstName.includes(n)) ? "Sra." : "Sr.";
      
      setRecipientData({
        fullName: primaryContact.full_name,
        position: primaryContact.position,
        salutationPrefix: prefix,
        isCustom: false,
        contactId: primaryContact.id,
      });
    }
  }, [primaryContact]);

  // Initialize services with AI suggestions
  useEffect(() => {
    if (allServices.length > 0 && caseData) {
      const aiAnalysis = caseData.ai_analysis as AIAnalysis | null;
      const suggestedServiceNames = aiAnalysis?.suggestedServices || [];
      const existingCaseServiceIds = caseServices.map((cs) => cs.service_id);

      const servicesWithConfidence: ServiceWithConfidence[] = allServices.map(
        (service) => {
          // Check if service name matches AI suggestions
          const isSuggested = suggestedServiceNames.some(
            (name) =>
              service.name.toLowerCase().includes(name.toLowerCase()) ||
              name.toLowerCase().includes(service.name.toLowerCase())
          );
          
          // Check if already selected in case_services
          const existingCaseService = caseServices.find(
            (cs) => cs.service_id === service.id
          );
          const isSelected = !!existingCaseService || isSuggested;

          return {
            service,
            confidence: isSuggested ? 85 + Math.floor(Math.random() * 15) : 50 + Math.floor(Math.random() * 20),
            isSelected,
            customText: existingCaseService?.custom_text || undefined,
            customFee: existingCaseService?.custom_fee ? Number(existingCaseService.custom_fee) : undefined,
            customMonthlyFee: existingCaseService?.custom_monthly_fee ? Number(existingCaseService.custom_monthly_fee) : undefined,
          };
        }
      );

      // Sort by confidence (highest first)
      servicesWithConfidence.sort((a, b) => b.confidence - a.confidence);

      setServices(servicesWithConfidence);
    }
  }, [allServices, caseData, caseServices]);

  // Calculate progress
  const progress = useMemo(() => {
    let completed = 0;
    const total = 5;

    if (client) completed++;
    if (clientDocuments.length > 0) completed++;
    if (proposalBackground) completed++;
    if (services.some((s) => s.isSelected)) completed++;
    if (customInitialPayment > 0 || customMonthlyRetainer > 0) completed++;

    return Math.round((completed / total) * 100);
  }, [client, clientDocuments, proposalBackground, services, customInitialPayment, customMonthlyRetainer]);

  const progressSteps = useMemo(() => [
    { id: "client", label: "Cliente seleccionado", completed: !!client, active: !client },
    { id: "docs", label: "Documentos validados", completed: clientDocuments.length > 0, active: !!client && clientDocuments.length === 0 },
    { id: "context", label: "Contexto capturado", completed: !!proposalBackground, active: clientDocuments.length > 0 && !proposalBackground },
    { id: "services", label: "Servicios seleccionados", completed: services.some((s) => s.isSelected), active: !!proposalBackground && !services.some((s) => s.isSelected) },
    { id: "pricing", label: "Honorarios configurados", completed: customInitialPayment > 0 || customMonthlyRetainer > 0, active: services.some((s) => s.isSelected) && customInitialPayment === 0 && customMonthlyRetainer === 0 },
  ], [client, clientDocuments, proposalBackground, services, customInitialPayment, customMonthlyRetainer]);

  // Handlers
  const handleToggleService = (serviceId: string) => {
    setServices((prev) => {
      const updated = prev.map((s) => {
        if (s.service.id === serviceId) {
          const newIsSelected = !s.isSelected;
          // Initialize custom fees from suggested when selecting
          if (newIsSelected && s.customFee === undefined) {
            return {
              ...s,
              isSelected: newIsSelected,
              customFee: s.service.suggested_fee ? Number(s.service.suggested_fee) : undefined,
              customMonthlyFee: s.service.suggested_monthly_fee ? Number(s.service.suggested_monthly_fee) : undefined,
            };
          }
          return { ...s, isSelected: newIsSelected };
        }
        return s;
      });
      
      // Recalculate pricing based on selected services
      recalculatePricingFromServices(updated);
      
      return updated;
    });
  };

  const handleUpdateServiceFee = (serviceId: string, fee: number, isMonthly: boolean) => {
    setServices((prev) => {
      const updated = prev.map((s) =>
        s.service.id === serviceId
          ? isMonthly
            ? { ...s, customMonthlyFee: fee }
            : { ...s, customFee: fee }
          : s
      );
      
      // Recalculate pricing
      recalculatePricingFromServices(updated);
      
      return updated;
    });
  };

  const recalculatePricingFromServices = (servicesList: ServiceWithConfidence[]) => {
    // Only recalculate if not in global mode
    if (pricingMode === 'global') return;
    
    const selectedServices = servicesList.filter((s) => s.isSelected);
    let totalOneTime = 0;
    let totalMonthly = 0;
    
    selectedServices.forEach((s) => {
      const feeType = s.service.fee_type || 'one_time';
      if (feeType === 'one_time' || feeType === 'both') {
        const fee = s.customFee ?? (s.service.suggested_fee ? Number(s.service.suggested_fee) : 0);
        totalOneTime += fee;
      }
      if (feeType === 'monthly' || feeType === 'both') {
        const fee = s.customMonthlyFee ?? (s.service.suggested_monthly_fee ? Number(s.service.suggested_monthly_fee) : 0);
        totalMonthly += fee;
      }
    });
    
    // Update pricing state
    if (totalOneTime > 0 || totalMonthly > 0) {
      setCustomInitialPayment(totalOneTime);
      setCustomMonthlyRetainer(totalMonthly);
      setSelectedPricingId(null); // Clear template since using service-based pricing
    }
  };

  // Handler for pricing mode change
  const handlePricingModeChange = (mode: PricingMode) => {
    setPricingMode(mode);
    
    // Clear honorarios narrative so the preview updates to new mode format
    setHonorariosNarrative("");
    
    // If switching to global, open the pricing config panel
    if (mode === 'global') {
      setIsPricingConfigOpen(true);
    }
    
    // If switching to per_service or summed, recalculate from services
    if (mode !== 'global') {
      recalculatePricingFromServices(services);
    }
  };

  // Calculate totals from services for display in PricingSection
  const servicesTotals = useMemo(() => {
    const selectedServices = services.filter((s) => s.isSelected);
    let totalOneTime = 0;
    let totalMonthly = 0;
    
    selectedServices.forEach((s) => {
      const feeType = s.service.fee_type || 'one_time';
      if (feeType === 'one_time' || feeType === 'both') {
        const fee = s.customFee ?? (s.service.suggested_fee ? Number(s.service.suggested_fee) : 0);
        totalOneTime += fee;
      }
      if (feeType === 'monthly' || feeType === 'both') {
        const fee = s.customMonthlyFee ?? (s.service.suggested_monthly_fee ? Number(s.service.suggested_monthly_fee) : 0);
        totalMonthly += fee;
      }
    });
    
    return { totalOneTime, totalMonthly };
  }, [services]);

  const handleUpdateCustomText = (serviceId: string, text: string) => {
    setServices((prev) =>
      prev.map((s) =>
        s.service.id === serviceId ? { ...s, customText: text } : s
      )
    );
  };

  const handleSelectTemplate = (templateId: string | null) => {
    if (!templateId) {
      setSelectedPricingId(null);
      return;
    }
    
    const template = pricingTemplates.find((t) => t.id === templateId);
    if (template) {
      setSelectedPricingId(templateId);
      setCustomInitialPayment(Number(template.initial_payment) || 0);
      setCustomMonthlyRetainer(Number(template.monthly_retainer) || 0);
      setCustomRetainerMonths(Number(template.retainer_months) || 12);
      // Convert template split to installments if available
      if (template.initial_payment_split) {
        const parts = template.initial_payment_split.split("/").map(p => parseInt(p.trim()));
        const defaultDescriptions = [
          "al momento de aceptación de la presente propuesta",
          "al momento de presentación de la propuesta de reestructura",
          "al completar la implementación",
          "al finalizar el proyecto"
        ];
        const newInstallments = parts.map((percentage, idx) => ({
          percentage,
          description: defaultDescriptions[idx] || `en el pago ${idx + 1}`,
        }));
        setInstallments(newInstallments);
      } else {
        // Default to 100% single payment if no split defined
        setInstallments([
          { percentage: 100, description: "al momento de aceptación de la presente propuesta" }
        ]);
      }
      // Automatically switch to global mode when selecting template
      setPricingMode('global');
    }
  };

  const handleUpdatePricing = (updates: {
    initialPayment?: number;
    monthlyRetainer?: number;
    retainerMonths?: number;
    installments?: PaymentInstallment[];
    retainerStartDescription?: string;
    canCancelWithoutPenalty?: boolean;
  }) => {
    if (updates.initialPayment !== undefined) setCustomInitialPayment(updates.initialPayment);
    if (updates.monthlyRetainer !== undefined) setCustomMonthlyRetainer(updates.monthlyRetainer);
    if (updates.retainerMonths !== undefined) setCustomRetainerMonths(updates.retainerMonths);
    if (updates.installments !== undefined) setInstallments(updates.installments);
    if (updates.retainerStartDescription !== undefined) setRetainerStartDescription(updates.retainerStartDescription);
    if (updates.canCancelWithoutPenalty !== undefined) setCanCancelWithoutPenalty(updates.canCancelWithoutPenalty);
    // When manually updating pricing, switch to global mode
    setPricingMode('global');
    setSelectedPricingId(null); // Clear template when customizing
  };

  // Save mutation with versioning and audit logging
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Capture old values for audit log
      const oldValues = caseData ? {
        custom_initial_payment: caseData.custom_initial_payment,
        custom_monthly_retainer: caseData.custom_monthly_retainer,
        custom_retainer_months: caseData.custom_retainer_months,
        pricing_mode: (caseData as any).pricing_mode,
        draft_content: (caseData as any).draft_content,
        proposal_content: (caseData as any).proposal_content,
        status: caseData.status,
      } : null;

      // Update case with retry logic
      await withRetry(async () => {
        const { error: caseError } = await supabase
          .from("cases")
          .update({
            custom_initial_payment: customInitialPayment,
            custom_monthly_retainer: customMonthlyRetainer,
            custom_retainer_months: customRetainerMonths,
            selected_pricing_id: selectedPricingId,
            pricing_mode: pricingMode,
            // Persist latest content snapshots so subsequent loads show what the user last saw/edited
            draft_content: draftContent || null,
            generated_block_contents: generatedBlockContents as any,
            proposal_content: {
              background: proposalBackground,
              servicesNarrative,
              honorariosNarrative,
              textOverrides,
              generatedContent,
              recipient: recipientData,
              documentTemplateId: selectedDocumentTemplate?.id ?? null,
              pricingMode,
            } as any,
            status: "borrador",
          } as any)
          .eq("id", id!);

        if (caseError) throw caseError;
      }, { maxRetries: 2 });

      // Delete existing case services
      await supabase.from("case_services").delete().eq("case_id", id!);

      // Insert selected services
      const selectedServices = services.filter((s) => s.isSelected);
      if (selectedServices.length > 0) {
        const { error: servicesError } = await supabase.from("case_services").insert(
          selectedServices.map((s, index) => ({
            case_id: id!,
            service_id: s.service.id,
            custom_text: s.customText || null,
            custom_fee: s.customFee || null,
            custom_monthly_fee: s.customMonthlyFee || null,
            sort_order: index,
          }))
        );
        if (servicesError) throw servicesError;
      }

      // Log audit entry
      logAudit({
        action: "update",
        tableName: "cases",
        recordId: id!,
        oldValues,
        newValues: {
          custom_initial_payment: customInitialPayment,
          custom_monthly_retainer: customMonthlyRetainer,
          custom_retainer_months: customRetainerMonths,
          pricing_mode: pricingMode,
          status: "borrador",
        },
      });

      // Save proposal version
      const versionContent: ProposalVersionContent = {
        background: proposalBackground,
        services: selectedServices.map(s => ({
          serviceId: s.service.id,
          serviceName: s.service.name,
          customText: s.customText,
          customFee: s.customFee,
          customMonthlyFee: s.customMonthlyFee,
        })),
        pricing: {
          initialPayment: customInitialPayment,
          monthlyRetainer: customMonthlyRetainer,
          retainerMonths: customRetainerMonths,
          pricingMode,
        },
        recipient: {
          fullName: recipientData.fullName,
          position: recipientData.position,
        },
        generatedContent,
        documentTemplateId: selectedDocumentTemplate?.id,
        dynamicBlocksContent: generatedBlockContents,
        textOverrides: textOverrides.length > 0 ? textOverrides : undefined,
      };

      try {
        await saveVersion(versionContent);
      } catch (versionError) {
        // Version saving should not block the main save
        console.error("Error saving version:", versionError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case", id] });
      queryClient.invalidateQueries({ queryKey: ["case_services", id] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      toast({ 
        title: "Propuesta guardada",
        description: `Versión ${latestVersionNumber + 1} creada`,
      });
    },
    onError: (error) => {
      const { title, description } = formatErrorForToast(error);
      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await saveMutation.mutateAsync();
      // Navigate to the review step after saving
      navigate(`/propuestas/${id}/revision`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsGenerating(true);
    try {
      await saveMutation.mutateAsync();
    } finally {
      setIsGenerating(false);
    }
  };


  const handleDownload = () => {
    toast({ title: "Descarga", description: "Funcionalidad próximamente disponible" });
  };

  const handleSend = () => {
    toast({ title: "Enviar", description: "Funcionalidad próximamente disponible" });
  };

  // Handler for AI background analysis - calls real edge function
  const handleRequestAIAnalysis = async () => {
    if (!userNotes.trim()) {
      toast({
        title: "Notas requeridas",
        description: "Por favor ingresa notas de la reunión antes de generar los antecedentes",
        variant: "destructive",
      });
      return;
    }

    setIsAIProcessing(true);
    try {
      // First, save the notes to the database so the edge function can read them
      await supabase
        .from("cases")
        .update({ notes: userNotes })
        .eq("id", id!);

      // Call the analyze-proposal edge function
      const { data, error } = await supabase.functions.invoke('analyze-proposal', {
        body: { caseId: id },
      });

      if (error) {
        console.error("AI Analysis error:", error);
        throw new Error(error.message || "Error al analizar la propuesta");
      }

      // Extract the analysis results
      const analysis = data?.analysis;
      if (!analysis) {
        throw new Error("No se recibió análisis del servidor");
      }

      // Build the background text from the analysis
      const clientName = client?.alias || client?.group_name || "la Empresa";
      const industry = client?.industry || "sus actividades comerciales";
      const entityCount = entities.length;

      // Use the AI-generated summary and objective to create a rich background
      let generatedBackground = "";

      if (analysis.summary) {
        generatedBackground = analysis.summary;
      } else {
        // Fallback: build from objective and other analysis data
        generatedBackground = `Derivado de la información que amablemente nos ha sido proporcionada, sabemos que ${clientName} se dedica principalmente a ${industry}.`;

        if (entityCount > 0) {
          generatedBackground += ` Asimismo, sabemos que actualmente operan con ${entityCount} razón${entityCount !== 1 ? 'es' : ''} social${entityCount !== 1 ? 'es' : ''}.`;
        }

        if (analysis.objective) {
          generatedBackground += `\n\n${analysis.objective}`;
        }
      }

      // Add transition text if risks were identified
      if (analysis.risks && analysis.risks.length > 0) {
        generatedBackground += `\n\nPor lo anterior, será necesario analizar esquemas que permitan atender las necesidades identificadas, en total apego a derecho, implementando una estructura sólida de cara a los objetivos planteados.`;
      }

      setAiSuggestion(generatedBackground);
      setEditedAiSuggestion(undefined); // Clear any previous edits

      // Update local state with AI analysis for service suggestions
      queryClient.invalidateQueries({ queryKey: ["case", id] });

      toast({
        title: "Análisis completado",
        description: "Los antecedentes fueron generados por IA. Revisa y edita antes de insertar.",
      });

      // Scroll to Antecedentes section with smooth animation
      setTimeout(() => {
        antecedentesRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    } catch (error) {
      console.error("Error in AI analysis:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo generar los antecedentes",
        variant: "destructive",
      });
    } finally {
      setIsAIProcessing(false);
    }
  };

  // Generate AI content for proposal
  const handleGenerateContent = async () => {
    // Template-first mode: generate dynamic block contents
    if (hasTemplate && caseData) {
      setIsGeneratingContent(true);
      try {
        const response = await supabase.functions.invoke('generate-proposal-content', {
          body: {
            caseId: caseData.id,
            mode: 'template',
          },
        });

        if (response.error) {
          throw new Error(response.error.message || 'Error al generar contenido');
        }

        const data = response.data as TemplateGenerationResponse;
        
        // Update local state (DB was already updated by edge function)
        setGeneratedBlockContents(data.block_contents);
        
        // Show warnings if any
        if (data.warnings?.length > 0) {
          toast({
            title: "Generación completada con advertencias",
            description: `${data.warnings.length} bloque(s) con problemas`,
            variant: "default",
          });
        } else {
          toast({
            title: "Contenido generado",
            description: "Bloques dinámicos generados exitosamente",
          });
        }
      } catch (error) {
        console.error("Error generating template content:", error);
        toast({
          title: "Error al generar contenido",
          description: getErrorMessage(error),
          variant: "destructive",
        });
      } finally {
        setIsGeneratingContent(false);
      }
      return;
    }

    // Freeform mode (legacy)
    const selectedServices = services.filter(s => s.isSelected);
    if (selectedServices.length === 0) {
      toast({
        title: "Sin servicios seleccionados",
        description: "Selecciona al menos un servicio para generar el contenido",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingContent(true);
    try {
      const aiAnalysis = caseData?.ai_analysis as AIAnalysis | null;
      
      const response = await supabase.functions.invoke('generate-proposal-content', {
        body: {
          caseId: caseData?.id,
          mode: 'freeform',
          selectedServices: selectedServices.map(s => ({
            id: s.service.id,
            name: s.service.name,
            standardText: s.customText || s.service.standard_text,
            objectivesTemplate: (s.service as any).objectives_template || null,
            deliverablesTemplate: (s.service as any).deliverables_template || null,
          })),
          clientContext: {
            clientName: client?.group_name || "Cliente",
            groupAlias: client?.alias || null,
            industry: client?.industry || null,
            entityCount: entities.length,
            employeeCount: client?.employee_count || 0,
            annualRevenue: client?.annual_revenue || null,
            entities: entities.map(e => ({
              legalName: e.legal_name,
              rfc: e.rfc,
            })),
          },
          aiAnalysis: aiAnalysis ? {
            objective: aiAnalysis.objective,
            risks: aiAnalysis.risks || [],
            summary: aiAnalysis.summary,
          } : null,
          background: proposalBackground,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Error al generar contenido');
      }

      const content = response.data as GeneratedProposalContent;
      setGeneratedContent(content);
      
      // Generate consolidated services text for the preview
      const servicesText = content.serviceDescriptions.map((desc, index) => {
        const service = selectedServices.find(s => s.service.id === desc.serviceId);
        const serviceName = service?.service.name || `Servicio ${index + 1}`;
        let text = `${String.fromCharCode(97 + index)}) ${serviceName}\n\n${desc.expandedText}`;
        
        if (desc.objectives && desc.objectives.length > 0) {
          text += `\n\nObjetivos:\n${desc.objectives.map(o => `• ${o}`).join('\n')}`;
        }
        
        if (desc.deliverables && desc.deliverables.length > 0) {
          text += `\n\nEntregables:\n${desc.deliverables.map(d => `• ${d}`).join('\n')}`;
        }
        
        return text;
      }).join('\n\n---\n\n');
      
      setGeneratedServicesContent(servicesText);
      setEditedServicesContent(undefined); // Reset any manual edits
      
      toast({
        title: "Contenido generado",
        description: "El contenido de la propuesta ha sido generado con IA",
      });
    } catch (error) {
      console.error("Error generating content:", error);
      toast({
        title: "Error al generar contenido",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsGeneratingContent(false);
    }
  };

  // Handlers for text overrides (inline preview editing)
  const handleTextOverride = (override: TextOverride) => {
    setTextOverrides(prev => {
      // Check if override for this section already exists
      const existingIndex = prev.findIndex(o => o.sectionId === override.sectionId);
      if (existingIndex >= 0) {
        // Update existing
        const updated = [...prev];
        updated[existingIndex] = override;
        return updated;
      }
      // Add new
      return [...prev, override];
    });
  };

  const handleRestoreOriginal = (sectionId: string) => {
    setTextOverrides(prev => prev.filter(o => o.sectionId !== sectionId));
  };

  const handleAIRewrite = async (originalText: string, instruction: string, sectionId: string): Promise<string> => {
    try {
      const response = await supabase.functions.invoke('rewrite-text', {
        body: {
          originalText,
          instruction,
          context: {
            clientName: client?.group_name || "Cliente",
            industry: client?.industry || null,
            sectionType: sectionId.includes('background') ? 'background' 
              : sectionId.includes('service') ? 'service'
              : sectionId.includes('pricing') ? 'pricing'
              : 'transition',
          },
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Error al reescribir texto');
      }

      return response.data?.rewrittenText || originalText;
    } catch (error) {
      console.error("Error rewriting text:", error);
      toast({
        title: "Error al reescribir",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      throw error;
    }
  };

  // Build preview data
  const previewData: ProposalPreviewData = useMemo(() => {
    const selectedServicesData = services.filter((s) => s.isSelected);
    const totalCost = customInitialPayment + customMonthlyRetainer * customRetainerMonths;
    const estimatedSavings = totalCost * 2.4; // Placeholder ROI calculation

    // Format date in Spanish
    const documentDate = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });

    return {
      documentDate,
      primaryContact: {
        fullName: recipientData.fullName,
        position: recipientData.position,
        salutationPrefix: recipientData.salutationPrefix,
      },
      clientName: client?.group_name || "Cliente",
      groupAlias: client?.alias || client?.group_name || "",
      industry: client?.industry || "",
      entityCount: entities.length,
      annualRevenue: client?.annual_revenue || "No especificado",
      employeeCount: client?.employee_count || 0,
      entities: entities.map((e) => ({
        legalName: e.legal_name,
        rfc: e.rfc,
      })),
      background: proposalBackground,
      servicesNarrative,
      honorariosNarrative,
      validatedData: {
        rfc: entities[0]?.rfc || null,
        opinion32d: null,
        declaredIncome: null,
        unusedDeductions: null,
      },
      selectedServices: selectedServicesData,
      pricingMode,
      pricing: {
        initialPayment: customInitialPayment,
        initialPaymentDescription: "estudio, análisis y propuesta de reestructura corporativa y fiscal",
        installments,
        monthlyRetainer: customMonthlyRetainer,
        retainerMonths: customRetainerMonths,
        retainerStartDescription,
        canCancelWithoutPenalty,
        exclusionsText: null,
        totalAmount: totalCost,
        roi: totalCost > 0 ? `${(estimatedSavings / totalCost).toFixed(1)}x` : "",
      },
      firmSettings: firmSettings
        ? {
            name: firmSettings.name,
            logo_url: firmSettings.logo_url,
            address: firmSettings.address,
            phone: firmSettings.phone,
            email: firmSettings.email,
            website: firmSettings.website,
            guarantees_text: firmSettings.guarantees_text,
            disclaimers_text: firmSettings.disclaimers_text,
            closing_text: firmSettings.closing_text,
          }
        : undefined,
      generatedContent: generatedContent || undefined,
    };
  }, [client, entities, proposalBackground, servicesNarrative, honorariosNarrative, services, customInitialPayment, customMonthlyRetainer, customRetainerMonths, installments, retainerStartDescription, canCancelWithoutPenalty, pricingMode, firmSettings, recipientData, generatedContent]);

  // Build compiler context for template-based preview
  const compilerContext = useMemo(() => {
    return buildCompilerContext({
      client: client ? {
        group_name: client.group_name,
        alias: client.alias || undefined,
        industry: client.industry || undefined,
        annual_revenue: client.annual_revenue || undefined,
        employee_count: client.employee_count || undefined,
      } : undefined,
      entities: entities.map(e => ({
        legal_name: e.legal_name,
        rfc: e.rfc || undefined,
      })),
      services: services
        .filter(s => s.isSelected)
        .map(s => ({
          service: {
            id: s.service.id,
            name: s.service.name,
            description: s.service.description || undefined,
            objectives_template: s.service.objectives_template || undefined,
            deliverables_template: s.service.deliverables_template || undefined,
            standard_text: s.service.standard_text || undefined,
          },
          customFee: s.customFee,
          customMonthlyFee: s.customMonthlyFee,
        })),
      caseData: {
        title: caseData?.title || '',
        notes: caseData?.notes || undefined,
      },
      background: proposalBackground,
      servicesNarrative: servicesNarrative,
      recipientName: recipientData.fullName,
      recipientPosition: recipientData.position || undefined,
      pricing: {
        initialPayment: customInitialPayment,
        monthlyRetainer: customMonthlyRetainer,
        retainerMonths: customRetainerMonths,
      },
      firmSettings: firmSettings ? {
        name: firmSettings.name,
        logo_url: firmSettings.logo_url || undefined,
        address: firmSettings.address || undefined,
        phone: firmSettings.phone || undefined,
        email: firmSettings.email || undefined,
        website: firmSettings.website || undefined,
        closing_text: firmSettings.closing_text || undefined,
        guarantees_text: firmSettings.guarantees_text || undefined,
        disclaimers_text: firmSettings.disclaimers_text || undefined,
      } : undefined,
    });
  }, [client, entities, services, caseData, proposalBackground, recipientData, customInitialPayment, customMonthlyRetainer, customRetainerMonths, firmSettings]);

  // Validated data for display
  const validatedData = useMemo(() => ({
    rfc: entities[0]?.rfc || null,
    opinion32d: null, // Would come from documents
    declaredIncome: null, // Would come from documents
    unusedDeductions: null, // Would come from AI analysis
  }), [entities]);

  // Estimated savings (placeholder)
  const estimatedSavings = useMemo(() => {
    const aiAnalysis = caseData?.ai_analysis as AIAnalysis | null;
    // This would ideally come from AI analysis
    return 2800000; // Placeholder
  }, [caseData]);

  if (loadingCase || loadingClient) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Propuesta no encontrada</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-muted/30">
      {/* Header */}
      <EditorHeader
        client={client || null}
        entityCount={entities.length}
        employeeCount={client?.employee_count || 0}
        annualRevenue={client?.annual_revenue || "No especificado"}
      />

      {/* Two Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Editor */}
        <div className="w-1/2 border-r overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* Progress */}
              <ProgressIndicator steps={progressSteps} progress={progress} />

              {/* ========== MIS NOTAS ========== */}
              <UserNotesSection
                userNotes={userNotes}
                isSaving={isSavingNotes}
                isAIProcessing={isAIProcessing}
                hasAISuggestion={!!aiSuggestion}
                onUpdateNotes={setUserNotes}
                onSaveNotes={async (notes: string) => {
                  setIsSavingNotes(true);
                  try {
                    const { error: caseError } = await supabase
                      .from("cases")
                      .update({ notes } as any)
                      .eq("id", id!);
                    
                    if (caseError) throw caseError;
                    
                    const { data: { user } } = await supabase.auth.getUser();
                    const { error: historyError } = await supabase
                      .from("case_notes_history")
                      .insert({
                        case_id: id!,
                        notes,
                        created_by: user?.id,
                      } as any);
                    
                    if (historyError) throw historyError;
                    
                    toast({ title: "Notas guardadas", description: "Se ha creado una versión en el historial" });
                    queryClient.invalidateQueries({ queryKey: ["case", id] });
                  } catch (error) {
                    toast({
                      title: "Error al guardar notas",
                      description: getErrorMessage(error),
                      variant: "destructive",
                    });
                  } finally {
                    setIsSavingNotes(false);
                  }
                }}
                onRequestAIAnalysis={handleRequestAIAnalysis}
              />

              {/* ========== DESTINATARIO DE LA PROPUESTA ========== */}
              <RecipientSection
                availableContacts={allContacts}
                recipient={recipientData}
                onUpdateRecipient={setRecipientData}
              />

              {/* ========== SELECCIÓN DE PLANTILLA ========== */}
              <TemplateSelector
                selectedTemplateId={selectedDocumentTemplate?.id || null}
                onSelectTemplate={(template) => {
                  setSelectedDocumentTemplate(template);
                }}
              />

              {/* ========== I. ANTECEDENTES Y ALCANCE DE LOS SERVICIOS ========== */}
              <Card ref={antecedentesRef}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">I. ANTECEDENTES Y ALCANCE DE LOS SERVICIOS</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Revisa los antecedentes generados y confirma los servicios para la propuesta
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* AI-Generated Background Suggestion */}
                  <AIBackgroundSuggestion
                    aiSuggestion={aiSuggestion}
                    editedSuggestion={editedAiSuggestion}
                    isAIProcessing={isAIProcessing}
                    onInsertInProposal={(text) => {
                      setProposalBackground(text);
                      // Also update draftContent to keep editor in sync
                      const currentHtml = draftContent || generateFullDocumentHTML(previewData);
                      const updatedHtml = insertIntoSection(currentHtml, 'background', text);
                      setDraftContent(updatedHtml);
                      toast({
                        title: "Antecedentes insertados",
                        description: "El texto ha sido insertado en el documento",
                      });
                    }}
                    onSaveEdit={(text) => {
                      setEditedAiSuggestion(text);
                      toast({
                        title: "Cambios guardados",
                        description: "Los cambios están listos para insertar en la propuesta",
                      });
                    }}
                    onRequestRegenerate={handleRequestAIAnalysis}
                  />

                  {/* Services List */}
                  <ServicesSection
                    services={services}
                    pricingMode={pricingMode}
                    onToggleService={handleToggleService}
                    onUpdateCustomText={handleUpdateCustomText}
                    onUpdateServiceFee={handleUpdateServiceFee}
                    showModeSelector={false}
                    onGenerateContent={handleGenerateContent}
                    isGeneratingContent={isGeneratingContent}
                    generatedServicesContent={generatedServicesContent}
                    editedServicesContent={editedServicesContent}
                    onInsertServicesContent={(text) => {
                      setServicesNarrative(text);
                      // Update draftContent to keep editor in sync
                      const currentHtml = draftContent || generateFullDocumentHTML(previewData);
                      const updatedHtml = insertIntoSection(currentHtml, 'services-narrative', text);
                      setDraftContent(updatedHtml);
                      toast({
                        title: "Servicios insertados",
                        description: "La sección I se actualizó en el documento",
                      });
                    }}
                    onSaveServicesContentEdit={(text) => {
                      setEditedServicesContent(text);
                      toast({
                        title: "Cambios guardados",
                        description: "Los cambios están listos para insertar en la propuesta",
                      });
                    }}
                  />
                </CardContent>
              </Card>

              {/* ========== II. PROPUESTA DE HONORARIOS ========== */}
              <HonorariosGenerator
                selectedServices={services.filter(s => s.isSelected)}
                pricingMode={pricingMode}
                onPricingModeChange={handlePricingModeChange}
                initialPayment={customInitialPayment}
                monthlyRetainer={customMonthlyRetainer}
                retainerMonths={customRetainerMonths}
                paymentInstallments={installments}
                onInitialPaymentChange={setCustomInitialPayment}
                onMonthlyRetainerChange={setCustomMonthlyRetainer}
                onRetainerMonthsChange={setCustomRetainerMonths}
                onInstallmentsChange={setInstallments}
                clientObjective={caseData?.need_type || "los servicios solicitados"}
                pricingTemplates={pricingTemplates}
                selectedTemplateId={selectedPricingId}
                onTemplateSelect={handleSelectTemplate}
                onUpdateServiceFee={(serviceId, customFee, customMonthlyFee) => {
                  setServices(prev => prev.map(s => 
                    s.service.id === serviceId 
                      ? { ...s, customFee: customFee ?? undefined, customMonthlyFee: customMonthlyFee ?? undefined }
                      : s
                  ));
                }}
                onInsertHonorarios={(text) => {
                  // Set the honorarios narrative for the preview
                  setHonorariosNarrative(text);
                  // Update draftContent to keep editor in sync
                  const currentHtml = draftContent || generateFullDocumentHTML(previewData);
                  const updatedHtml = insertIntoSection(currentHtml, 'honorarios-narrative', text);
                  setDraftContent(updatedHtml);
                  toast({
                    title: "Honorarios insertados",
                    description: "La sección II se actualizó en el documento",
                  });
                }}
              />

              {/* ========== III. GARANTÍAS DE SATISFACCIÓN ========== */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">III. GARANTÍAS DE SATISFACCIÓN</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Texto fijo definido en la plantilla seleccionada
                  </p>
                </CardHeader>
                <CardContent>
                  {selectedDocumentTemplate ? (
                    <div className="bg-muted/30 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">
                        {firmSettings?.guarantees_text || 
                          "Las garantías de satisfacción se cargarán desde la configuración del despacho o la plantilla seleccionada."}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">Selecciona una plantilla para ver las garantías configuradas</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Document Editor */}
        <div className="w-1/2 p-6 flex flex-col min-h-0">
          <ProposalDocumentEditor
            caseId={id!}
            initialContent={draftContent || generateFullDocumentHTML(previewData)}
            onContentChange={(content) => {
              setDraftContent(content);
              // Parse HTML and sync back to preview states for version tracking
              const parsed = parseDocumentHTML(content);
              if (parsed.background !== undefined) {
                setProposalBackground(parsed.background);
              }
              if (parsed.servicesNarrative !== undefined) {
                setServicesNarrative(parsed.servicesNarrative);
              }
              if (parsed.honorariosNarrative !== undefined) {
                setHonorariosNarrative(parsed.honorariosNarrative);
              }
            }}
            clientContext={{
              clientName: client?.group_name || "Cliente",
              groupAlias: client?.alias || undefined,
              industry: client?.industry,
              entities: entities.map(e => ({ legalName: e.legal_name, rfc: e.rfc })),
              primaryContact: recipientData.fullName !== "[Nombre del Contacto]" ? {
                fullName: recipientData.fullName,
                position: recipientData.position,
                salutationPrefix: recipientData.salutationPrefix,
              } : undefined,
            }}
            services={services.filter(s => s.isSelected).map(s => ({
              id: s.service.id,
              name: s.service.name,
              description: s.service.description,
              customText: s.customText,
              fee: s.customFee,
              monthlyFee: s.customMonthlyFee,
            }))}
            onSave={async (content) => {
              // Update local state first
              setDraftContent(content);
              // Use the main save mutation to persist everything consistently
              await saveMutation.mutateAsync();
            }}
            onExportPDF={() => setShowFullPreview(true)}
            isSaving={saveMutation.isPending}
          />
        </div>
      </div>

      {/* Full Preview Modal */}
      <ProposalFullPreview
        open={showFullPreview}
        onOpenChange={setShowFullPreview}
        data={previewData}
        progress={progress}
        isSaving={saveMutation.isPending}
        onSaveDraft={handleSaveDraft}
        onDownloadPDF={handleDownload}
        onSendToClient={handleSend}
        htmlContent={draftContent}
      />
    </div>
  );
}
