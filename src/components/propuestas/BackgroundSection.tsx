import { useState } from "react";
import { Check, Pencil, Sparkles, X, Lightbulb, ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BackgroundSectionProps {
  /** Notas crudas del usuario (apuntes de la reunión) */
  userNotes: string;
  /** Antecedentes finales que van en la propuesta */
  proposalBackground: string;
  /** Sugerencia generada por IA basada en las notas */
  aiSuggestion?: string;
  /** Indica si la IA está procesando */
  isAIProcessing?: boolean;
  /** Callback cuando el usuario actualiza sus notas */
  onUpdateNotes: (notes: string) => void;
  /** Callback cuando el usuario acepta/edita los antecedentes de la propuesta */
  onUpdateProposalBackground: (text: string) => void;
  /** Callback para solicitar análisis de IA */
  onRequestAIAnalysis?: () => void;
}

export function BackgroundSection({
  userNotes,
  proposalBackground,
  aiSuggestion,
  isAIProcessing = false,
  onUpdateNotes,
  onUpdateProposalBackground,
  onRequestAIAnalysis,
}: BackgroundSectionProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingAI, setIsEditingAI] = useState(false);
  const [editedNotes, setEditedNotes] = useState(userNotes);
  const [editedAISuggestion, setEditedAISuggestion] = useState(aiSuggestion || "");

  // Sync edited AI suggestion when new one arrives
  if (aiSuggestion && aiSuggestion !== editedAISuggestion && !isEditingAI) {
    setEditedAISuggestion(aiSuggestion);
  }

  const handleSaveNotes = () => {
    onUpdateNotes(editedNotes);
    setIsEditingNotes(false);
  };

  const handleCancelNotes = () => {
    setEditedNotes(userNotes);
    setIsEditingNotes(false);
  };

  const handleSaveAISuggestion = () => {
    setIsEditingAI(false);
  };

  const handleCancelAISuggestion = () => {
    setEditedAISuggestion(aiSuggestion || "");
    setIsEditingAI(false);
  };

  const handleInsertInProposal = () => {
    onUpdateProposalBackground(editedAISuggestion);
  };

  const hasAISuggestion = !!aiSuggestion || !!editedAISuggestion;
  const hasProposalBackground = !!proposalBackground;

  return (
    <div className="space-y-4">
      {/* Sección 1: Notas del usuario */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">MIS NOTAS</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {!isEditingNotes && (
                <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(true)}>
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
          {isEditingNotes ? (
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
                  <Button variant="outline" size="sm" onClick={handleCancelNotes}>
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSaveNotes}>
                    <Check className="h-4 w-4 mr-1" />
                    Guardar
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

      {/* Sección 2: Sugerencia de IA */}
      {(hasAISuggestion || isAIProcessing) && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Lightbulb className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-base font-semibold text-blue-900 dark:text-blue-100">
                  ANTECEDENTES PROPUESTOS POR IA
                </CardTitle>
                <Badge variant="secondary" className="text-xs gap-1">
                  <Sparkles className="h-3 w-3" />
                  Generado
                </Badge>
              </div>
              {!isEditingAI && hasAISuggestion && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsEditingAI(true)}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              )}
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Revisa y edita el texto antes de insertarlo en la propuesta
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAIProcessing ? (
              <div className="flex items-center gap-3 py-4">
                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Analizando tus notas y generando antecedentes profesionales...
                </p>
              </div>
            ) : isEditingAI ? (
              <div className="space-y-3">
                <Textarea
                  value={editedAISuggestion}
                  onChange={(e) => setEditedAISuggestion(e.target.value)}
                  rows={10}
                  className="resize-none bg-white dark:bg-gray-900"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancelAISuggestion}>
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSaveAISuggestion}>
                    <Check className="h-4 w-4 mr-1" />
                    Guardar cambios
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    {editedAISuggestion}
                  </p>
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onRequestAIAnalysis}
                    disabled={isAIProcessing}
                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    Regenerar
                  </Button>
                  
                  <Button 
                    size="sm" 
                    onClick={handleInsertInProposal}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Insertar en propuesta
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
