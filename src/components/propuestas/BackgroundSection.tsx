import { useState } from "react";
import { Check, Pencil, Sparkles, X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BackgroundSectionProps {
  background: string;
  isAIGenerated: boolean;
  aiSuggestion?: string;
  onUpdate: (text: string) => void;
  onApplySuggestion?: () => void;
  onDismissSuggestion?: () => void;
}

export function BackgroundSection({
  background,
  isAIGenerated,
  aiSuggestion,
  onUpdate,
  onApplySuggestion,
  onDismissSuggestion,
}: BackgroundSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(background);

  const handleSave = () => {
    onUpdate(editedText);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedText(background);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">ANTECEDENTES</CardTitle>
          <div className="flex items-center gap-2">
            {isAIGenerated && !isEditing && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Sparkles className="h-3 w-3" />
                Generado por IA
              </Badge>
            )}
            {!isEditing && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check className="h-4 w-4 mr-1" />
                Guardar
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {background || "Sin antecedentes definidos. La IA generará este contenido automáticamente."}
          </p>
        )}

        {aiSuggestion && !isEditing && (
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Sugerencia de IA
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  "{aiSuggestion}"
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="text-blue-600 border-blue-300" onClick={onApplySuggestion}>
                    Aplicar sugerencia
                  </Button>
                  <Button size="sm" variant="ghost" className="text-blue-600" onClick={onDismissSuggestion}>
                    Descartar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
