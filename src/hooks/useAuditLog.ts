/**
 * Sprint 3: Audit Log Hook
 * 
 * Provides utilities for logging changes to the audit_log table.
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

export type AuditAction = 
  | "create" 
  | "update" 
  | "delete" 
  | "status_change" 
  | "ai_analysis" 
  | "proposal_generated"
  | "proposal_sent"
  | "document_uploaded"
  | "version_created";

export interface AuditEntry {
  id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values: Json | null;
  new_values: Json | null;
  user_id: string | null;
  created_at: string;
}

export interface LogEntryParams {
  action: AuditAction;
  tableName: string;
  recordId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

/**
 * Hook for audit logging
 */
export function useAuditLog() {
  // Log an audit entry
  const logMutation = useMutation({
    mutationFn: async ({
      action,
      tableName,
      recordId,
      oldValues,
      newValues,
    }: LogEntryParams): Promise<void> => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("audit_log")
        .insert({
          action,
          table_name: tableName,
          record_id: recordId,
          old_values: oldValues as Json || null,
          new_values: newValues as Json || null,
          user_id: user?.id || null,
        });

      if (error) {
        console.error("Failed to log audit entry:", error);
        // Don't throw - audit logging should not block the main operation
      }
    },
  });

  /**
   * Log an action without blocking
   */
  const logAsync = (params: LogEntryParams): void => {
    logMutation.mutate(params);
  };

  /**
   * Log an action and wait for completion
   */
  const logSync = async (params: LogEntryParams): Promise<void> => {
    await logMutation.mutateAsync(params);
  };

  return {
    log: logAsync,
    logSync,
    isLogging: logMutation.isPending,
  };
}

/**
 * Hook to fetch audit log entries for a specific record
 */
export function useAuditHistory(tableName: string, recordId: string | undefined) {
  return useQuery({
    queryKey: ["audit_log", tableName, recordId],
    queryFn: async (): Promise<AuditEntry[]> => {
      if (!recordId) return [];

      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .eq("table_name", tableName)
        .eq("record_id", recordId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching audit history:", error);
        return [];
      }

      return data as AuditEntry[];
    },
    enabled: !!recordId,
  });
}

/**
 * Helper to create a change summary from old and new values
 */
export function summarizeChanges(
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null
): string[] {
  const changes: string[] = [];
  
  if (!oldValues && newValues) {
    return ["Registro creado"];
  }
  
  if (oldValues && !newValues) {
    return ["Registro eliminado"];
  }
  
  if (!oldValues || !newValues) {
    return changes;
  }

  // Find changed fields
  const allKeys = new Set([
    ...Object.keys(oldValues),
    ...Object.keys(newValues),
  ]);

  for (const key of allKeys) {
    const oldVal = oldValues[key];
    const newVal = newValues[key];
    
    // Skip internal fields
    if (key === 'updated_at' || key === 'created_at') continue;
    
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      const fieldName = formatFieldName(key);
      
      if (oldVal === null || oldVal === undefined) {
        changes.push(`${fieldName} establecido`);
      } else if (newVal === null || newVal === undefined) {
        changes.push(`${fieldName} eliminado`);
      } else {
        changes.push(`${fieldName} modificado`);
      }
    }
  }

  return changes.length > 0 ? changes : ["Sin cambios significativos"];
}

/**
 * Format field names for display
 */
function formatFieldName(key: string): string {
  const fieldNameMap: Record<string, string> = {
    status: "Estado",
    notes: "Notas",
    title: "Título",
    custom_initial_payment: "Pago inicial",
    custom_monthly_retainer: "Iguala mensual",
    custom_retainer_months: "Meses de iguala",
    pricing_mode: "Modo de precios",
    selected_template_id: "Plantilla",
    background: "Antecedentes",
    ai_analysis: "Análisis IA",
    proposal_content: "Contenido de propuesta",
  };

  return fieldNameMap[key] || key.replace(/_/g, " ");
}
