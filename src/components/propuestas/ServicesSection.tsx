import { useState } from "react";
import { Sparkles, Check, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { ServiceWithConfidence } from "./types";

interface ServicesSectionProps {
  services: ServiceWithConfidence[];
  onToggleService: (serviceId: string) => void;
  onUpdateCustomText: (serviceId: string, text: string) => void;
}

function ServiceCard({
  item,
  index,
  onToggle,
  onUpdateCustomText,
}: {
  item: ServiceWithConfidence;
  index: string;
  onToggle: () => void;
  onUpdateCustomText: (text: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [customText, setCustomText] = useState(item.customText || item.service.standard_text || "");

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-green-600 bg-green-100 dark:bg-green-900/30";
    if (confidence >= 70) return "text-blue-600 bg-blue-100 dark:bg-blue-900/30";
    return "text-muted-foreground bg-muted";
  };

  const handleSaveText = () => {
    onUpdateCustomText(customText);
    setIsEditingText(false);
  };

  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        item.isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-muted-foreground/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={item.isSelected}
          onCheckedChange={onToggle}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="font-medium text-sm">
                {index}) {item.service.name}
              </h4>
              {item.service.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {item.service.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="secondary" className={`text-xs ${getConfidenceColor(item.confidence)}`}>
                {item.confidence}% confianza
              </Badge>
              {item.confidence >= 80 && (
                <Badge variant="outline" className="text-xs gap-1 text-primary">
                  <Sparkles className="h-3 w-3" />
                  IA
                </Badge>
              )}
            </div>
          </div>

          {item.isSelected && (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="mt-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between h-8">
                  <span className="text-xs">Texto del servicio</span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                {isEditingText ? (
                  <div className="space-y-2">
                    <Textarea
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      rows={4}
                      className="text-sm resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingText(false)}
                      >
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={handleSaveText}>
                        <Check className="h-4 w-4 mr-1" />
                        Guardar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">
                      {customText || "Sin texto definido para este servicio."}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => setIsEditingText(true)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Personalizar texto
                    </Button>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>
    </div>
  );
}

export function ServicesSection({
  services,
  onToggleService,
  onUpdateCustomText,
}: ServicesSectionProps) {
  const preSelectedCount = services.filter((s) => s.confidence >= 80).length;
  const selectedCount = services.filter((s) => s.isSelected).length;

  const getLetter = (index: number) => String.fromCharCode(97 + index); // a, b, c, d...

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">SERVICIOS RECOMENDADOS</CardTitle>
          <Badge variant="secondary" className="text-xs gap-1">
            <Sparkles className="h-3 w-3" />
            IA PRE-SELECCIONÓ {preSelectedCount}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {selectedCount} servicio{selectedCount !== 1 ? "s" : ""} seleccionado{selectedCount !== 1 ? "s" : ""}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {services.map((item, index) => (
          <ServiceCard
            key={item.service.id}
            item={item}
            index={getLetter(index)}
            onToggle={() => onToggleService(item.service.id)}
            onUpdateCustomText={(text) => onUpdateCustomText(item.service.id, text)}
          />
        ))}

        {services.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay servicios disponibles</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
