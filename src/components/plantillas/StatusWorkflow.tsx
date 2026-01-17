import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import type { TemplateStatus } from "./types";
import { 
  Save, 
  Brain, 
  Check, 
  CheckCircle2, 
  Zap, 
  ArrowRight,
  Loader2 
} from "lucide-react";

interface StatusWorkflowProps {
  currentStatus: TemplateStatus;
  onSaveDraft: () => void;
  onAnalyze: () => void;
  onApprove: () => void;
  onActivate: () => void;
  isSaving?: boolean;
  isAnalyzing?: boolean;
  isApproving?: boolean;
  isActivating?: boolean;
  canAnalyze?: boolean;
  canApprove?: boolean;
  canActivate?: boolean;
}

export function StatusWorkflow({
  currentStatus,
  onSaveDraft,
  onAnalyze,
  onApprove,
  onActivate,
  isSaving = false,
  isAnalyzing = false,
  isApproving = false,
  isActivating = false,
  canAnalyze = true,
  canApprove = true,
  canActivate = true,
}: StatusWorkflowProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <StatusBadge status={currentStatus} />

      {currentStatus === 'draft' && (
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onSaveDraft}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Borrador
          </Button>
          <Button
            onClick={onAnalyze}
            disabled={isAnalyzing || !canAnalyze}
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            Analizar con IA
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </>
      )}

      {currentStatus === 'analyzed' && (
        <p className="text-sm text-muted-foreground">
          Revisa las sugerencias de la IA abajo y confirma el schema
        </p>
      )}

      {currentStatus === 'reviewed' && (
        <Button
          onClick={onApprove}
          disabled={isApproving || !canApprove}
        >
          {isApproving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
          Aprobar para Producción
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      )}

      {currentStatus === 'approved' && (
        <Button
          onClick={onActivate}
          disabled={isActivating || !canActivate}
          className="bg-green-600 hover:bg-green-700"
        >
          {isActivating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Zap className="h-4 w-4 mr-2" />
          )}
          Activar Plantilla
        </Button>
      )}

      {currentStatus === 'active' && (
        <div className="flex items-center gap-2 text-green-600">
          <Check className="h-5 w-5" />
          <span className="font-medium">Plantilla activa y lista para usar</span>
        </div>
      )}
    </div>
  );
}
