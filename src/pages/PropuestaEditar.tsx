import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
} from "@/components/propuestas/types";

export default function PropuestaEditar() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
  const [paymentSplit, setPaymentSplit] = useState("50/50");
  const [pricingMode, setPricingMode] = useState<PricingMode>('per_service');
  const [isPricingConfigOpen, setIsPricingConfigOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [recipientData, setRecipientData] = useState<RecipientData>({
    fullName: "[Nombre del Contacto]",
    position: null,
    salutationPrefix: 'Sr.',
    isCustom: false,
    contactId: null,
  });

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
      return data as Case & { ai_analysis?: AIAnalysis };
    },
    enabled: !!id,
    // Refetch every 2 seconds while AI is still analyzing
    refetchInterval: (query) => {
      const data = query.state.data as (Case & { ai_analysis?: AIAnalysis }) | undefined;
      if (data?.ai_status === 'pending' || data?.ai_status === 'analyzing') {
        return 2000; // Poll every 2 seconds
      }
      return false; // Stop polling when complete
    },
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
      if (template.initial_payment_split) {
        setPaymentSplit(template.initial_payment_split);
      }
      // Automatically switch to global mode when selecting template
      setPricingMode('global');
    }
  };

  const handleUpdatePricing = (updates: {
    initialPayment?: number;
    monthlyRetainer?: number;
    retainerMonths?: number;
    paymentSplit?: string;
  }) => {
    if (updates.initialPayment !== undefined) setCustomInitialPayment(updates.initialPayment);
    if (updates.monthlyRetainer !== undefined) setCustomMonthlyRetainer(updates.monthlyRetainer);
    if (updates.retainerMonths !== undefined) setCustomRetainerMonths(updates.retainerMonths);
    if (updates.paymentSplit !== undefined) setPaymentSplit(updates.paymentSplit);
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
        description: error.message,
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
        paymentSplit,
        monthlyRetainer: customMonthlyRetainer,
        retainerMonths: customRetainerMonths,
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
    };
  }, [client, entities, proposalBackground, services, customInitialPayment, customMonthlyRetainer, customRetainerMonths, paymentSplit, pricingMode, firmSettings, recipientData]);

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
                  } catch (error: any) {
                    toast({
                      title: "Error al guardar notas",
                      description: error.message,
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
                  paymentSplit={paymentSplit}
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
              />
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Preview */}
        <div className="w-1/2 p-6">
          <ProposalPreview
            data={previewData}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
            onDownload={handleDownload}
            onSend={handleSend}
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
      />
    </div>
  );
}
