/**
 * Sprint 3: Audit History Component
 * 
 * Shows audit log entries for a record.
 */

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, User, FileText, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useAuditHistory, summarizeChanges, type AuditEntry } from "@/hooks/useAuditLog";
import { useState } from "react";

interface AuditHistoryProps {
  tableName: string;
  recordId: string | undefined;
}

export function AuditHistory({ tableName, recordId }: AuditHistoryProps) {
  const { data: entries = [], isLoading } = useAuditHistory(tableName, recordId);
  const [isOpen, setIsOpen] = useState(false);

  if (entries.length === 0 || !recordId) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "d MMM, HH:mm", { locale: es });
  };

  const getActionLabel = (action: string): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } => {
    const actions: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      create: { label: "Creado", variant: "default" },
      update: { label: "Actualizado", variant: "secondary" },
      delete: { label: "Eliminado", variant: "destructive" },
      status_change: { label: "Estado", variant: "outline" },
      ai_analysis: { label: "IA", variant: "default" },
      proposal_generated: { label: "Generado", variant: "default" },
      proposal_sent: { label: "Enviado", variant: "default" },
      version_created: { label: "Versión", variant: "secondary" },
    };
    return actions[action] || { label: action, variant: "outline" };
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Actividad</span>
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-2">
        <div className="border rounded-lg bg-card">
          <div className="p-2 border-b">
            <span className="text-xs font-medium">Registro de Actividad</span>
          </div>
          
          <ScrollArea className="max-h-[200px]">
            <div className="divide-y">
              {entries.map((entry) => {
                const { label, variant } = getActionLabel(entry.action);
                const changes = summarizeChanges(
                  entry.old_values as Record<string, unknown> | null,
                  entry.new_values as Record<string, unknown> | null
                );

                return (
                  <div key={entry.id} className="p-2 hover:bg-muted/50">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={variant} className="text-xs h-5">
                          {label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(entry.created_at)}
                        </span>
                      </div>
                    </div>
                    
                    {changes.length > 0 && changes[0] !== "Sin cambios significativos" && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {changes.slice(0, 2).join(" • ")}
                        {changes.length > 2 && ` +${changes.length - 2}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
