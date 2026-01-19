import { useState } from "react";
import { Check, Pencil, Sparkles, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UserNotesSectionProps {
  userNotes: string;
  isSaving?: boolean;
  isAIProcessing?: boolean;
  hasAISuggestion?: boolean;
  onUpdateNotes: (notes: string) => void;
  onSaveNotes: (notes: string) => Promise<void>;
  onRequestAIAnalysis?: () => void;
}

export function UserNotesSection({
  userNotes,
  isSaving = false,
  isAIProcessing = false,
  hasAISuggestion = false,
  onUpdateNotes,
  onSaveNotes,
  onRequestAIAnalysis,
}: UserNotesSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState(userNotes);

  // Sync edited notes when prop changes (e.g., from DB load)
  if (userNotes !== editedNotes && !isEditing) {
    setEditedNotes(userNotes);
  }

  const handleSave = async () => {
    await onSaveNotes(editedNotes);
    onUpdateNotes(editedNotes);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedNotes(userNotes);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">MIS NOTAS</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Escribe aquí tus apuntes de la reunión o llamada con el cliente
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editedNotes}
              onChange={(e) => setEditedNotes(e.target.value)}
              rows={6}
              className="resize-none"
              placeholder="Ej: El cliente tiene 4 empresas, quieren reducir impuestos, tienen problemas con el SAT..."
            />
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRequestAIAnalysis}
                disabled={!editedNotes.trim() || isAIProcessing}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                {isAIProcessing ? "Analizando..." : "Generar con IA"}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  <Check className="h-4 w-4 mr-1" />
                  {isSaving ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {userNotes || "Sin notas. Haz clic en Editar para agregar tus apuntes de la reunión."}
            </p>
            {userNotes && !hasAISuggestion && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRequestAIAnalysis}
                disabled={isAIProcessing}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                {isAIProcessing ? "Analizando..." : "Generar antecedentes con IA"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
