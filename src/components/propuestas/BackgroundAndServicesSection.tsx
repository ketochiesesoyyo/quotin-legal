import { useState, useRef, useEffect } from "react";
import { 
  FileText, 
  Sparkles, 
  Loader2, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  Edit3,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ServiceWithConfidence } from "./types";

interface BackgroundAndServicesSectionProps {
  // Estado de AI
  aiSuggestion: string | null;
  isAIProcessing: boolean;
  hasGenerated: boolean;
  
  // Servicios
  services: ServiceWithConfidence[];
  
  // Estado de confirmación
  isConfirmed: boolean;
  
  // Callbacks
  onUpdateBackground: (text: string) => void;
  onToggleService: (serviceId: string) => void;
  onConfirm: () => void;
  onRegenerate: () => void;
  onEdit: () => void;
  
  // Ref para scroll
  sectionRef?: React.RefObject<HTMLDivElement>;
}

export function BackgroundAndServicesSection({
  aiSuggestion,
  isAIProcessing,
  hasGenerated,
  services,
  isConfirmed,
  onUpdateBackground,
  onToggleService,
  onConfirm,
  onRegenerate,
  onEdit,
  sectionRef,
}: BackgroundAndServicesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editedBackground, setEditedBackground] = useState(aiSuggestion || "");
  const [isEditing, setIsEditing] = useState(false);
  
  // Sync edited background with AI suggestion when it changes
  useEffect(() => {
    if (aiSuggestion) {
      setEditedBackground(aiSuggestion);
    }
  }, [aiSuggestion]);

  const selectedCount = services.filter((s) => s.isSelected).length;
  const suggestedServices = services.filter((s) => s.confidence >= 80);
  const otherServices = services.filter((s) => s.confidence < 80);

  const handleSaveBackground = () => {
    onUpdateBackground(editedBackground);
    setIsEditing(false);
  };

  const getLetter = (index: number) => String.fromCharCode(97 + index);

  // If not generated yet, show placeholder
  if (!hasGenerated && !isAIProcessing) {
    return (
      <Card className="border-dashed border-muted-foreground/30" ref={sectionRef}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            I. ANTECEDENTES Y ALCANCE
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mb-3 opacity-50" />
            <p className="text-sm">
              Escribe las notas de la reunión y haz clic en "Generar con IA" 
              para crear los antecedentes automáticamente.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isAIProcessing) {
    return (
      <Card ref={sectionRef}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            I. ANTECEDENTES Y ALCANCE
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Generando antecedentes con IA...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      ref={sectionRef}
      className={isConfirmed ? "border-green-500/50 bg-green-50/30 dark:bg-green-950/10" : "border-primary/30"}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                {isConfirmed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <FileText className="h-5 w-5 text-primary" />
                )}
                I. ANTECEDENTES Y ALCANCE
              </CardTitle>
              <div className="flex items-center gap-2">
                {isConfirmed && (
                  <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30">
                    <Check className="h-3 w-3 mr-1" />
                    Confirmado
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs gap-1">
                  <Sparkles className="h-3 w-3" />
                  Generado por IA
                </Badge>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedCount} servicio{selectedCount !== 1 ? "s" : ""} seleccionado{selectedCount !== 1 ? "s" : ""}
            </p>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Antecedentes generados */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Antecedentes</h4>
                {!isConfirmed && !isEditing && (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit3 className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                )}
              </div>
              
              {isEditing ? (
                <div className="space-y-3">
                  <Textarea
                    value={editedBackground}
                    onChange={(e) => setEditedBackground(e.target.value)}
                    rows={8}
                    className="text-sm resize-none"
                    placeholder="Edita los antecedentes generados..."
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditedBackground(aiSuggestion || "");
                        setIsEditing(false);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveBackground}>
                      <Check className="h-4 w-4 mr-1" />
                      Guardar cambios
                    </Button>
                  </div>
                </div>
              ) : (
                <ScrollArea className="max-h-[200px]">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {editedBackground || aiSuggestion}
                    </p>
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Servicios sugeridos */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                Servicios sugeridos
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {suggestedServices.length} recomendados
                </Badge>
              </h4>
              
              <div className="space-y-2">
                {suggestedServices.map((item, index) => (
                  <ServiceCheckItem
                    key={item.service.id}
                    item={item}
                    index={getLetter(index)}
                    onToggle={() => onToggleService(item.service.id)}
                    disabled={isConfirmed}
                  />
                ))}
              </div>
              
              {/* Otros servicios colapsable */}
              {otherServices.length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Ver {otherServices.length} servicios adicionales
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-2">
                    {otherServices.map((item, index) => (
                      <ServiceCheckItem
                        key={item.service.id}
                        item={item}
                        index={getLetter(suggestedServices.length + index)}
                        onToggle={() => onToggleService(item.service.id)}
                        disabled={isConfirmed}
                      />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex items-center justify-between pt-4 border-t">
              {isConfirmed ? (
                <>
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Antecedentes y servicios confirmados
                  </p>
                  <Button variant="outline" size="sm" onClick={onEdit}>
                    <Edit3 className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={onRegenerate}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Regenerar
                  </Button>
                  <Button onClick={onConfirm} disabled={selectedCount === 0}>
                    <Check className="h-4 w-4 mr-1" />
                    Confirmar servicios ({selectedCount})
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// Componente auxiliar para item de servicio
function ServiceCheckItem({
  item,
  index,
  onToggle,
  disabled,
}: {
  item: ServiceWithConfidence;
  index: string;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-green-600 bg-green-100 dark:bg-green-900/30";
    if (confidence >= 70) return "text-blue-600 bg-blue-100 dark:bg-blue-900/30";
    return "text-muted-foreground bg-muted";
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
        item.isSelected
          ? "border-primary bg-primary/5"
          : "border-transparent bg-muted/30 hover:bg-muted/50"
      } ${disabled ? "opacity-70" : ""}`}
    >
      <Checkbox
        checked={item.isSelected}
        onCheckedChange={onToggle}
        disabled={disabled}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {index}) {item.service.name}
        </p>
        {item.service.description && (
          <p className="text-xs text-muted-foreground truncate">
            {item.service.description}
          </p>
        )}
      </div>
      <Badge variant="secondary" className={`text-xs shrink-0 ${getConfidenceColor(item.confidence)}`}>
        {item.confidence}%
      </Badge>
    </div>
  );
}
