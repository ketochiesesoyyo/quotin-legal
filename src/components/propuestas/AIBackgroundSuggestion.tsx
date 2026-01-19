import { useState } from "react";
import { Check, Pencil, Sparkles, X, Lightbulb, ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AIBackgroundSuggestionProps {
  aiSuggestion?: string;
  editedSuggestion?: string;
  isAIProcessing?: boolean;
  onInsertInProposal: (text: string) => void;
  onSaveEdit?: (text: string) => void;
  onRequestRegenerate?: () => void;
}

export function AIBackgroundSuggestion({
  aiSuggestion,
  editedSuggestion: externalEditedSuggestion,
  isAIProcessing = false,
  onInsertInProposal,
  onSaveEdit,
  onRequestRegenerate,
}: AIBackgroundSuggestionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [localEditedSuggestion, setLocalEditedSuggestion] = useState(externalEditedSuggestion || aiSuggestion || "");

  // Use external edited suggestion if provided, otherwise use local
  const displayText = externalEditedSuggestion || localEditedSuggestion;

  // Sync when new AI suggestion arrives (only if no external edited version and not editing)
  if (aiSuggestion && !externalEditedSuggestion && aiSuggestion !== localEditedSuggestion && !isEditing) {
    setLocalEditedSuggestion(aiSuggestion);
  }

  const handleSave = () => {
    // Notify parent about the edit so it persists in parent state
    if (onSaveEdit) {
      onSaveEdit(localEditedSuggestion);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalEditedSuggestion(externalEditedSuggestion || aiSuggestion || "");
    setIsEditing(false);
  };

  const handleInsert = () => {
    onInsertInProposal(localEditedSuggestion);
  };

  const hasContent = !!aiSuggestion || !!displayText;

  if (!hasContent && !isAIProcessing) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <Lightbulb className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              ANTECEDENTES PROPUESTOS POR IA
            </span>
            <Badge variant="secondary" className="text-xs gap-1">
              <Sparkles className="h-3 w-3" />
              Generado
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {!isEditing && hasContent && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsEditing(true)}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
              >
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100">
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`} />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Revisa y edita el texto antes de insertarlo en la propuesta
            </p>
            
            {isAIProcessing ? (
              <div className="flex items-center gap-3 py-4">
                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Analizando tus notas y generando antecedentes profesionales...
                </p>
              </div>
            ) : isEditing ? (
              <div className="space-y-3">
                <Textarea
                  value={localEditedSuggestion}
                  onChange={(e) => setLocalEditedSuggestion(e.target.value)}
                  rows={10}
                  className="resize-none bg-white dark:bg-gray-900"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Check className="h-4 w-4 mr-1" />
                    Guardar cambios
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    {displayText}
                  </p>
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onRequestRegenerate}
                    disabled={isAIProcessing}
                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    Regenerar
                  </Button>
                  
                  <Button 
                    size="sm" 
                    onClick={handleInsert}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Insertar en propuesta
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
