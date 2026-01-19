import { useState } from "react";
import { Sparkles, Pencil, Check, X, RefreshCw, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface GeneratedContentPreviewProps {
  title: string;
  generatedContent?: string;
  editedContent?: string;
  isGenerating?: boolean;
  onInsertInProposal: (text: string) => void;
  onSaveEdit?: (text: string) => void;
  onRequestRegenerate?: () => void;
}

export function GeneratedContentPreview({
  title,
  generatedContent,
  editedContent: externalEditedContent,
  isGenerating = false,
  onInsertInProposal,
  onSaveEdit,
  onRequestRegenerate,
}: GeneratedContentPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [localEditedContent, setLocalEditedContent] = useState(externalEditedContent || generatedContent || "");

  // Use external edited content if provided, otherwise use local
  const displayText = externalEditedContent || localEditedContent;

  // Sync when new generated content arrives (only if no external edited version and not editing)
  if (generatedContent && !externalEditedContent && generatedContent !== localEditedContent && !isEditing) {
    setLocalEditedContent(generatedContent);
  }

  const handleSave = () => {
    // Notify parent about the edit so it persists in parent state
    if (onSaveEdit) {
      onSaveEdit(localEditedContent);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalEditedContent(externalEditedContent || generatedContent || "");
    setIsEditing(false);
  };

  const handleInsert = () => {
    onInsertInProposal(localEditedContent);
  };

  const hasContent = !!generatedContent || !!displayText;
  const hasBeenEdited = externalEditedContent && externalEditedContent !== generatedContent;

  if (!hasContent && !isGenerating) {
    return null;
  }

  return (
    <div className="mt-4 pt-4 border-t border-dashed border-primary/30">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-0 h-auto hover:bg-transparent"
          >
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="font-medium text-sm">{title}</span>
              {hasBeenEdited && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                  Editado
                </Badge>
              )}
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-3 space-y-3">
          {isGenerating ? (
            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
              <div>
                <p className="text-sm font-medium">Generando contenido...</p>
                <p className="text-xs text-muted-foreground">
                  Analizando servicios seleccionados
                </p>
              </div>
            </div>
          ) : isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={localEditedContent}
                onChange={(e) => setLocalEditedContent(e.target.value)}
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
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-primary/20">
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {displayText}
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar manualmente
                </Button>
                {onRequestRegenerate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRequestRegenerate}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Regenerar
                  </Button>
                )}
                <Button size="sm" onClick={handleInsert} className="ml-auto">
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Insertar en propuesta
                </Button>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
