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
import { ServicesSection } from "@/components/propuestas/ServicesSection";
import { PricingSection } from "@/components/propuestas/PricingSection";
import { ProposalPreview } from "@/components/propuestas/ProposalPreview";
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
} from "@/components/propuestas/types";

export default function PropuestaEditar() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for editor
  const [background, setBackground] = useState("");
  const [isBackgroundEdited, setIsBackgroundEdited] = useState(false);
  const [services, setServices] = useState<ServiceWithConfidence[]>([]);
  const [selectedPricingId, setSelectedPricingId] = useState<string | null>(null);
  const [customInitialPayment, setCustomInitialPayment] = useState(0);
  const [customMonthlyRetainer, setCustomMonthlyRetainer] = useState(0);
  const [customRetainerMonths, setCustomRetainerMonths] = useState(12);
  const [paymentSplit, setPaymentSplit] = useState("50/50");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | undefined>();

  // Fetch case data
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

  // Initialize state from case data
  useEffect(() => {
    if (caseData) {
      // Set background from AI analysis or notes
      const aiAnalysis = caseData.ai_analysis as AIAnalysis | null;
      if (aiAnalysis?.summary) {
        setBackground(aiAnalysis.summary);
      } else if (caseData.notes) {
        setBackground(`Derivado de la conversación con el cliente, se identificó la siguiente necesidad: ${caseData.notes.substring(0, 300)}...`);
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
    }
  }, [caseData]);

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
    if (background) completed++;
    if (services.some((s) => s.isSelected)) completed++;
    if (customInitialPayment > 0 || customMonthlyRetainer > 0) completed++;

    return Math.round((completed / total) * 100);
  }, [client, clientDocuments, background, services, customInitialPayment, customMonthlyRetainer]);

  const progressSteps = useMemo(() => [
    { id: "client", label: "Cliente seleccionado", completed: !!client, active: !client },
    { id: "docs", label: "Documentos validados", completed: clientDocuments.length > 0, active: !!client && clientDocuments.length === 0 },
    { id: "context", label: "Contexto capturado", completed: !!background, active: clientDocuments.length > 0 && !background },
    { id: "services", label: "Servicios seleccionados", completed: services.some((s) => s.isSelected), active: !!background && !services.some((s) => s.isSelected) },
    { id: "pricing", label: "Honorarios configurados", completed: customInitialPayment > 0 || customMonthlyRetainer > 0, active: services.some((s) => s.isSelected) && customInitialPayment === 0 && customMonthlyRetainer === 0 },
  ], [client, clientDocuments, background, services, customInitialPayment, customMonthlyRetainer]);

  // Handlers
  const handleToggleService = (serviceId: string) => {
    setServices((prev) =>
      prev.map((s) =>
        s.service.id === serviceId ? { ...s, isSelected: !s.isSelected } : s
      )
    );
  };

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
          status: "borrador",
        })
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
    toast({ title: "Propuesta generada", description: "La propuesta ha sido guardada correctamente" });
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
      primaryContact: primaryContact
        ? {
            fullName: primaryContact.full_name,
            position: primaryContact.position,
          }
        : null,
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
      background,
      validatedData: {
        rfc: entities[0]?.rfc || null,
        opinion32d: null,
        declaredIncome: null,
        unusedDeductions: null,
      },
      selectedServices: selectedServicesData,
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
  }, [client, entities, background, services, customInitialPayment, customMonthlyRetainer, customRetainerMonths, paymentSplit, firmSettings, primaryContact]);

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
                background={background}
                isAIGenerated={!isBackgroundEdited}
                aiSuggestion={aiSuggestion}
                onUpdate={(text) => {
                  setBackground(text);
                  setIsBackgroundEdited(true);
                }}
                onApplySuggestion={() => {
                  if (aiSuggestion) {
                    setBackground(background + " " + aiSuggestion);
                    setAiSuggestion(undefined);
                  }
                }}
                onDismissSuggestion={() => setAiSuggestion(undefined)}
              />

              {/* Validated Data */}
              <ValidatedDataSection data={validatedData} />

              {/* Services */}
              <ServicesSection
                services={services}
                onToggleService={handleToggleService}
                onUpdateCustomText={handleUpdateCustomText}
              />

              {/* Pricing */}
              <PricingSection
                templates={pricingTemplates}
                selectedTemplateId={selectedPricingId}
                customInitialPayment={customInitialPayment}
                customMonthlyRetainer={customMonthlyRetainer}
                customRetainerMonths={customRetainerMonths}
                paymentSplit={paymentSplit}
                estimatedSavings={estimatedSavings}
                onSelectTemplate={handleSelectTemplate}
                onUpdatePricing={handleUpdatePricing}
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
    </div>
  );
}
