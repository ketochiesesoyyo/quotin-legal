import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { Loader2 } from "lucide-react";
import { EditorHeader } from "@/components/propuestas/EditorHeader";
import { ProgressIndicator } from "@/components/propuestas/ProgressIndicator";
import { BackgroundSection } from "@/components/propuestas/BackgroundSection";
import { ValidatedDataSection } from "@/components/propuestas/ValidatedDataSection";
import { PricingModeSelector } from "@/components/propuestas/PricingModeSelector";
import { ServicesSection } from "@/components/propuestas/ServicesSection";
import { PricingSection } from "@/components/propuestas/PricingSection";
import { ProposalPreview } from "@/components/propuestas/ProposalPreview";
import { ProposalFullPreview } from "@/components/propuestas/ProposalFullPreview";
import { RecipientSection, type RecipientData } from "@/components/propuestas/RecipientSection";
import { TemplateSelector } from "@/components/propuestas/TemplateSelector";
import { CompiledDocumentPreview, buildCompilerContext } from "@/components/propuestas/CompiledDocumentPreview";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { DocumentTemplate } from "@/components/plantillas/types";
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
  const [recipientData, setRecipientData] = useState<RecipientData>({
    fullName: "[Nombre del Contacto]",
    position: null,
    salutationPrefix: 'Sr.',
    isCustom: false,
    contactId: null,
  });
  
  // Document template state (Sprint 2)
  const [selectedDocumentTemplate, setSelectedDocumentTemplate] = useState<DocumentTemplate | null>(null);
  const [previewMode, setPreviewMode] = useState<'classic' | 'template'>('classic');

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
    }
  }, [caseData]);

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

  const handleSelectTemplate = (templateId: string) => {
    const template = pricingTemplates.find((t) => t.id === templateId);
    if (template) {
      setSelectedPricingId(templateId);
      setCustomInitialPayment(Number(template.initial_payment) || 0);
      setCustomMonthlyRetainer(Number(template.monthly_retainer) || 0);
      setCustomRetainerMonths(Number(template.retainer_months) || 12);
      // Convert template split to installments if available
      if (template.initial_payment_split) {
        const parts = template.initial_payment_split.split("/").map(p => parseInt(p.trim()));
        const newInstallments = parts.map((percentage, idx) => ({
          percentage,
          description: idx === 0 
            ? "al momento de aceptación de la presente propuesta" 
            : idx === parts.length - 1 
              ? "al momento de presentación de la propuesta" 
              : `en el pago ${idx + 1}`,
        }));
        setInstallments(newInstallments);
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

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Update case
      const { error: caseError } = await supabase
        .from("cases")
        .update({
          custom_initial_payment: customInitialPayment,
          custom_monthly_retainer: customMonthlyRetainer,
          custom_retainer_months: customRetainerMonths,
          selected_pricing_id: selectedPricingId,
          pricing_mode: pricingMode,
          status: "borrador",
        } as any)
        .eq("id", id!);

      if (caseError) throw caseError;

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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case", id] });
      queryClient.invalidateQueries({ queryKey: ["case_services", id] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      toast({ title: "Propuesta guardada" });
    },
    onError: (error) => {
      toast({
        title: "Error al guardar",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    await saveMutation.mutateAsync();
    setIsGenerating(false);
    setShowFullPreview(true); // Open full preview modal after saving
  };

  const handleSaveDraft = async () => {
    setIsGenerating(true);
    await saveMutation.mutateAsync();
    setIsGenerating(false);
  };

  const handleDownload = () => {
    toast({ title: "Descarga", description: "Funcionalidad próximamente disponible" });
  };

  const handleSend = () => {
    toast({ title: "Enviar", description: "Funcionalidad próximamente disponible" });
  };

  // Generate AI content for proposal
  const handleGenerateContent = async () => {
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
  }, [client, entities, proposalBackground, services, customInitialPayment, customMonthlyRetainer, customRetainerMonths, installments, retainerStartDescription, canCancelWithoutPenalty, pricingMode, firmSettings, recipientData, generatedContent]);

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

              {/* Background */}
              <BackgroundSection
                caseId={id!}
                userNotes={userNotes}
                proposalBackground={proposalBackground}
                aiSuggestion={aiSuggestion}
                isAIProcessing={isAIProcessing}
                isSaving={isSavingNotes}
                onUpdateNotes={setUserNotes}
                onSaveNotes={async (notes: string) => {
                  setIsSavingNotes(true);
                  try {
                    // Update case notes
                    const { error: caseError } = await supabase
                      .from("cases")
                      .update({ notes } as any)
                      .eq("id", id!);
                    
                    if (caseError) throw caseError;
                    
                    // Save to notes history
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
                onUpdateProposalBackground={setProposalBackground}
                onRequestAIAnalysis={async () => {
                  if (!userNotes.trim()) return;
                  setIsAIProcessing(true);
                  try {
                    // Simulate AI processing - in production this would call the edge function
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                    
                    // Generate professional background text (this would come from AI in production)
                    const clientName = client?.alias || client?.group_name || "la Empresa";
                    const industry = client?.industry || "sus actividades comerciales";
                    const entityCount = entities.length;
                    const employeeCount = client?.employee_count || 0;
                    
                    const generatedBackground = `Derivado de la información que amablemente nos ha sido proporcionada, sabemos que ${clientName} se dedica principalmente a ${industry}. Asimismo, sabemos que actualmente operan con ${entityCount} razón${entityCount !== 1 ? 'es' : ''} social${entityCount !== 1 ? 'es' : ''}, así como una plantilla laboral de aproximadamente ${employeeCount} colaboradores, sumado a los activos tangibles e intangibles propios de su operación.

Finalmente, sabemos que gracias al crecimiento sostenido que han tenido, las Empresas requieren la implementación de servicios especializados que permitan optimizar su estructura corporativa y fiscal, blindar patrimonialmente a los socios, y aprovechar al máximo los activos con que cuenta la organización.

Por lo anterior, será necesario analizar esquemas que permitan eficientizar, en la medida de lo posible y con total apego a derecho, los recursos económicos, humanos y materiales con que cuentan, así como implementar una estructura corporativa sólida de cara a las proyecciones de crecimiento que se tienen.`;
                    
                    setAiSuggestion(generatedBackground);
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "No se pudo generar los antecedentes",
                      variant: "destructive",
                    });
                  } finally {
                    setIsAIProcessing(false);
                  }
                }}
              />

              {/* Recipient Section - who the proposal is addressed to */}
              <RecipientSection
                availableContacts={allContacts}
                recipient={recipientData}
                onUpdateRecipient={setRecipientData}
              />

              {/* Validated Data */}
              <ValidatedDataSection data={validatedData} />

              {/* Document Template Selector (Sprint 2) */}
              <TemplateSelector
                selectedTemplateId={selectedDocumentTemplate?.id || null}
                onSelectTemplate={(template) => {
                  setSelectedDocumentTemplate(template);
                  // Switch to template preview mode when a template is selected
                  if (template) {
                    setPreviewMode('template');
                  }
                }}
              />

              {/* Pricing Mode Selector - always visible */}
              <PricingModeSelector
                pricingMode={pricingMode}
                onPricingModeChange={handlePricingModeChange}
                preSelectedCount={services.filter(s => s.confidence >= 80).length}
                selectedCount={services.filter(s => s.isSelected).length}
              />

              {/* Pricing Section - appears BEFORE services when in global mode */}
              {pricingMode === 'global' && (
                <PricingSection
                  templates={pricingTemplates}
                  selectedTemplateId={selectedPricingId}
                  customInitialPayment={customInitialPayment}
                  customMonthlyRetainer={customMonthlyRetainer}
                  customRetainerMonths={customRetainerMonths}
                  installments={installments}
                  retainerStartDescription={retainerStartDescription}
                  canCancelWithoutPenalty={canCancelWithoutPenalty}
                  onSelectTemplate={handleSelectTemplate}
                  onUpdatePricing={handleUpdatePricing}
                />
              )}

              {/* Services List - without mode selector since it's now separate */}
              <ServicesSection
                services={services}
                pricingMode={pricingMode}
                onToggleService={handleToggleService}
                onUpdateCustomText={handleUpdateCustomText}
                onUpdateServiceFee={handleUpdateServiceFee}
                showModeSelector={false}
                onGenerateContent={handleGenerateContent}
                isGeneratingContent={isGeneratingContent}
                hasGeneratedContent={!!generatedContent}
              />
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Preview with Tabs */}
        <div className="w-1/2 p-6 flex flex-col">
          <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as 'classic' | 'template')} className="flex-1 flex flex-col">
            <TabsList className="mb-4">
              <TabsTrigger value="classic">Vista Clásica</TabsTrigger>
              <TabsTrigger value="template" disabled={!selectedDocumentTemplate}>
                Plantilla Compilada
              </TabsTrigger>
            </TabsList>
            <TabsContent value="classic" className="flex-1 m-0">
              <ProposalPreview
                data={previewData}
                isGenerating={isGenerating}
                onGenerate={handleGenerate}
              />
            </TabsContent>
            <TabsContent value="template" className="flex-1 m-0">
              {selectedDocumentTemplate ? (
                <div className="h-full border rounded-lg overflow-hidden bg-card">
                  <CompiledDocumentPreview
                    template={selectedDocumentTemplate}
                    context={compilerContext}
                    showDebug={true}
                  />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Selecciona una plantilla para ver la vista previa compilada
                </div>
              )}
            </TabsContent>
          </Tabs>
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
      />
    </div>
  );
}
