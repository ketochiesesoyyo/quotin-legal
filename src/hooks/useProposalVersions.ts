/**
 * Sprint 3: Proposal Versions Hook
 * 
 * Manages saving and retrieving proposal versions for audit trail.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-utils";

export interface TextOverrideData {
  sectionId: string;
  originalText: string;
  newText: string;
  isAIGenerated: boolean;
  instruction?: string;
  timestamp: string; // ISO timestamp for history tracking
}

export interface ProposalVersionContent {
  background?: string;
  services: Array<{
    serviceId: string;
    serviceName: string;
    customText?: string;
    customFee?: number;
    customMonthlyFee?: number;
  }>;
  pricing: {
    initialPayment: number;
    monthlyRetainer: number;
    retainerMonths: number;
    pricingMode: string;
  };
  recipient?: {
    fullName: string;
    position?: string | null;
  };
  generatedContent?: unknown;
  documentTemplateId?: string;
  dynamicBlocksContent?: Record<string, string>;
  textOverrides?: TextOverrideData[]; // New field for inline edits
}

export interface ProposalVersion {
  id: string;
  case_id: string;
  version_number: number;
  content: ProposalVersionContent;
  created_at: string;
  created_by: string | null;
}

/**
 * Hook for managing proposal versions
 */
export function useProposalVersions(caseId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all versions for a case
  const versionsQuery = useQuery({
    queryKey: ["proposal_versions", caseId],
    queryFn: async (): Promise<ProposalVersion[]> => {
      if (!caseId) return [];
      
      const { data, error } = await supabase
        .from("proposal_versions")
        .select("*")
        .eq("case_id", caseId)
        .order("version_number", { ascending: false });

      if (error) throw error;
      
      // Parse content JSON
      return (data || []).map(v => ({
        ...v,
        content: (typeof v.content === 'string' 
          ? JSON.parse(v.content) 
          : v.content) as ProposalVersionContent,
      }));
    },
    enabled: !!caseId,
  });

  // Get latest version number
  const latestVersionNumber = versionsQuery.data?.[0]?.version_number ?? 0;

  // Save a new version
  const saveVersionMutation = useMutation({
    mutationFn: async (content: ProposalVersionContent): Promise<ProposalVersion> => {
      if (!caseId) throw new Error("Case ID is required");

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      const newVersionNumber = latestVersionNumber + 1;

      // Cast content to Json compatible type
      const contentJson = JSON.parse(JSON.stringify(content));

      const { data, error } = await supabase
        .from("proposal_versions")
        .insert([{
          case_id: caseId,
          version_number: newVersionNumber,
          content: contentJson,
          created_by: user?.id || null,
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        ...data,
        content: data.content as unknown as ProposalVersionContent,
      };
    },
    onSuccess: (newVersion) => {
      queryClient.invalidateQueries({ queryKey: ["proposal_versions", caseId] });
      toast({
        title: "Versión guardada",
        description: `Versión ${newVersion.version_number} creada`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error al guardar versión",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  // Get a specific version
  const getVersion = async (versionId: string): Promise<ProposalVersion | null> => {
    const { data, error } = await supabase
      .from("proposal_versions")
      .select("*")
      .eq("id", versionId)
      .single();

    if (error) {
      console.error("Error fetching version:", error);
      return null;
    }

    return {
      ...data,
      content: (typeof data.content === 'string'
        ? JSON.parse(data.content)
        : data.content) as ProposalVersionContent,
    };
  };

  // Compare two versions (simple diff)
  const compareVersions = (v1: ProposalVersionContent, v2: ProposalVersionContent): string[] => {
    const changes: string[] = [];

    // Compare services
    const v1Services = new Set(v1.services.map(s => s.serviceId));
    const v2Services = new Set(v2.services.map(s => s.serviceId));
    
    const addedServices = v2.services.filter(s => !v1Services.has(s.serviceId));
    const removedServices = v1.services.filter(s => !v2Services.has(s.serviceId));
    
    if (addedServices.length > 0) {
      changes.push(`+ Servicios añadidos: ${addedServices.map(s => s.serviceName).join(', ')}`);
    }
    if (removedServices.length > 0) {
      changes.push(`- Servicios removidos: ${removedServices.map(s => s.serviceName).join(', ')}`);
    }

    // Compare pricing
    if (v1.pricing.initialPayment !== v2.pricing.initialPayment) {
      changes.push(`Pago inicial: $${v1.pricing.initialPayment.toLocaleString()} → $${v2.pricing.initialPayment.toLocaleString()}`);
    }
    if (v1.pricing.monthlyRetainer !== v2.pricing.monthlyRetainer) {
      changes.push(`Iguala mensual: $${v1.pricing.monthlyRetainer.toLocaleString()} → $${v2.pricing.monthlyRetainer.toLocaleString()}`);
    }
    if (v1.pricing.retainerMonths !== v2.pricing.retainerMonths) {
      changes.push(`Meses de iguala: ${v1.pricing.retainerMonths} → ${v2.pricing.retainerMonths}`);
    }

    // Compare background
    if (v1.background !== v2.background) {
      changes.push("Antecedentes modificados");
    }

    // Compare recipient
    if (v1.recipient?.fullName !== v2.recipient?.fullName) {
      changes.push(`Destinatario: ${v1.recipient?.fullName || 'N/A'} → ${v2.recipient?.fullName || 'N/A'}`);
    }

    return changes.length > 0 ? changes : ["Sin cambios detectados"];
  };

  return {
    versions: versionsQuery.data || [],
    isLoading: versionsQuery.isLoading,
    latestVersionNumber,
    saveVersion: saveVersionMutation.mutateAsync,
    isSaving: saveVersionMutation.isPending,
    getVersion,
    compareVersions,
    refetch: versionsQuery.refetch,
  };
}
