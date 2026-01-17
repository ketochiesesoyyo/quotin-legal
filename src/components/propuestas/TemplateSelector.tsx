/**
 * Sprint 2: Template Selector Component
 * 
 * Allows user to select an active document template for the proposal.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle, Eye, Loader2 } from "lucide-react";
import type { DocumentTemplate, TemplateSchema } from "@/components/plantillas/types";

interface TemplateSelectorProps {
  selectedTemplateId: string | null;
  onSelectTemplate: (template: DocumentTemplate | null) => void;
  onPreviewTemplate?: (template: DocumentTemplate) => void;
}

export function TemplateSelector({
  selectedTemplateId,
  onSelectTemplate,
  onPreviewTemplate,
}: TemplateSelectorProps) {
  // Fetch active document templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["active_document_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select("*")
        .eq("status", "active")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as unknown as DocumentTemplate[];
    },
  });

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const handleSelect = (templateId: string) => {
    if (templateId === "none") {
      onSelectTemplate(null);
    } else {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        onSelectTemplate(template);
      }
    }
  };

  const getVariableCount = (template: DocumentTemplate): number => {
    const schema = template.schema_json as TemplateSchema | null;
    if (!schema?.blocks) return 0;
    return schema.blocks.filter((b) => b.type === "variable").length;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando plantillas...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay plantillas activas disponibles.</p>
            <p className="text-xs mt-1">
              Crea y activa una plantilla desde el módulo de Plantillas.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Plantilla de Documento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select
          value={selectedTemplateId || "none"}
          onValueChange={handleSelect}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar plantilla..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-muted-foreground">Sin plantilla (formato clásico)</span>
            </SelectItem>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center gap-2">
                  <span>{template.name}</span>
                  <Badge variant="outline" className="text-xs">
                    v{template.version}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedTemplate && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{selectedTemplate.name}</span>
              <Badge variant="secondary" className="text-xs gap-1">
                <CheckCircle className="h-3 w-3" />
                Activa
              </Badge>
            </div>
            
            {selectedTemplate.description && (
              <p className="text-xs text-muted-foreground">
                {selectedTemplate.description}
              </p>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {getVariableCount(selectedTemplate)} variables configuradas
              </span>
              <span>Versión {selectedTemplate.version}</span>
            </div>

            {onPreviewTemplate && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => onPreviewTemplate(selectedTemplate)}
              >
                <Eye className="h-3 w-3 mr-2" />
                Vista previa de plantilla
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
