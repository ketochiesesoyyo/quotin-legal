import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemplateEditor } from "@/components/plantillas/TemplateEditor";
import { FileUploader } from "@/components/plantillas/FileUploader";
import { StatusWorkflow } from "@/components/plantillas/StatusWorkflow";
import { AIAnalysisPanel } from "@/components/plantillas/AIAnalysisPanel";
import type { 
  TemplateBlock, 
  TemplateSchema, 
  SourceType, 
  AIAnalysisResult 
} from "@/components/plantillas/types";
import { ArrowLeft, FileText, PenTool, Upload } from "lucide-react";

export default function PlantillaNueva() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("manual");
  const [content, setContent] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [blocks, setBlocks] = useState<TemplateBlock[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [status, setStatus] = useState<'draft' | 'analyzed'>('draft');
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const schema: TemplateSchema = {
        blocks,
        version: "1.0",
      };

      const { data, error } = await supabase
        .from("document_templates")
        .insert({
          name,
          description: description || null,
          source_type: sourceType,
          status: 'draft',
          canonical_content: JSON.parse(JSON.stringify({ text: content, html: htmlContent })),
          schema_json: JSON.parse(JSON.stringify(schema)),
          content: JSON.parse(JSON.stringify({ html: htmlContent })),
          is_active: false,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setTemplateId(data.id);
      queryClient.invalidateQueries({ queryKey: ["document_templates"] });
      toast({ title: "Borrador guardado exitosamente" });
    },
    onError: (error) => {
      toast({
        title: "Error al guardar",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!templateId) throw new Error("No template ID");

      const schema: TemplateSchema = {
        blocks,
        version: "1.0",
      };

      const { error } = await supabase
        .from("document_templates")
        .update({
          name,
          description: description || null,
          canonical_content: JSON.parse(JSON.stringify({ text: content, html: htmlContent })),
          schema_json: JSON.parse(JSON.stringify(schema)),
          content: JSON.parse(JSON.stringify({ html: htmlContent })),
        })
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document_templates"] });
      toast({ title: "Borrador actualizado" });
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  // Analyze with AI mutation
  const analyzeMutation = useMutation({
    mutationFn: async () => {
      // First, save the template if not saved
      let currentTemplateId = templateId;
      
      if (!currentTemplateId) {
        const schema: TemplateSchema = { blocks, version: "1.0" };
        const { data, error } = await supabase
          .from("document_templates")
          .insert({
            name,
            description: description || null,
            source_type: sourceType,
            status: 'draft',
            canonical_content: JSON.parse(JSON.stringify({ text: content, html: htmlContent })),
            schema_json: JSON.parse(JSON.stringify(schema)),
            content: JSON.parse(JSON.stringify({ html: htmlContent })),
            is_active: false,
            created_by: user?.id,
          })
          .select()
          .single();

        if (error) throw error;
        currentTemplateId = data.id;
        setTemplateId(data.id);
      }

      // Call the analyze-template edge function
      const { data, error } = await supabase.functions.invoke('analyze-template', {
        body: {
          template_id: currentTemplateId,
          canonical_content: { text: content, html: htmlContent, blocks },
          context: 'legal_proposals',
        },
      });

      if (error) throw error;
      return data as AIAnalysisResult;
    },
    onSuccess: async (result) => {
      setAnalysisResult(result);
      setStatus('analyzed');

      // Update template with analysis result
      if (templateId) {
        await supabase
          .from("document_templates")
          .update({
            status: 'analyzed',
            analysis_result: JSON.parse(JSON.stringify(result)),
            analyzed_at: new Date().toISOString(),
          })
          .eq("id", templateId);
      }

      queryClient.invalidateQueries({ queryKey: ["document_templates"] });
      toast({ title: "Análisis completado" });
    },
    onError: (error) => {
      toast({
        title: "Error en el análisis",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  // Confirm schema mutation (move to reviewed)
  const confirmSchemaMutation = useMutation({
    mutationFn: async (decisions: Array<{
      block_id: string;
      modified_type?: 'static' | 'variable';
      variable_name?: string;
      source?: string;
    }>) => {
      if (!templateId || !user) throw new Error("Missing template or user");

      // Build final schema from decisions
      const finalBlocks: TemplateBlock[] = decisions.map((d, index) => ({
        id: d.block_id,
        type: d.modified_type || 'static',
        content: blocks.find(b => b.id === d.block_id)?.content || '',
        order: index,
        variableName: d.variable_name,
        source: d.source,
        required: d.modified_type === 'variable',
        format: 'richtext' as const,
      }));

      const schema: TemplateSchema = {
        blocks: finalBlocks,
        version: "1.0",
      };

      const { error } = await supabase
        .from("document_templates")
        .update({
          status: 'reviewed',
          schema_json: JSON.parse(JSON.stringify(schema)),
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document_templates"] });
      toast({ title: "Schema confirmado - Estado: Reviewed" });
      navigate("/plantillas");
    },
    onError: (error) => {
      toast({
        title: "Error al confirmar",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  // Reject analysis (back to draft)
  const handleRejectAnalysis = async () => {
    if (templateId) {
      await supabase
        .from("document_templates")
        .update({
          status: 'draft',
          analysis_result: null,
          analyzed_at: null,
        })
        .eq("id", templateId);
    }

    setStatus('draft');
    setAnalysisResult(null);
    queryClient.invalidateQueries({ queryKey: ["document_templates"] });
    toast({ title: "Análisis rechazado - Volviendo a borrador" });
  };

  const handleSaveDraft = useCallback(() => {
    if (templateId) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  }, [templateId, createMutation, updateMutation]);

  const handleContentChange = useCallback((text: string, html: string) => {
    setContent(text);
    setHtmlContent(html);
  }, []);

  const handleBlocksChange = useCallback((newBlocks: TemplateBlock[]) => {
    setBlocks(newBlocks);
  }, []);

  const handleFileLoaded = useCallback((fileContent: string, fileName: string) => {
    setContent(fileContent);
    setHtmlContent(`<p>${fileContent.replace(/\n/g, '</p><p>')}</p>`);
    toast({ title: `Archivo cargado: ${fileName}` });
  }, [toast]);

  const canAnalyze = name.trim().length > 0 && content.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/plantillas")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <div>
                <h1 className="text-xl font-bold">Crear Nueva Plantilla</h1>
                <p className="text-sm text-muted-foreground">
                  Define el contenido y marca los bloques editables
                </p>
              </div>
            </div>
            <StatusWorkflow
              currentStatus={status}
              onSaveDraft={handleSaveDraft}
              onAnalyze={() => analyzeMutation.mutate()}
              onApprove={() => {}}
              onActivate={() => {}}
              isSaving={createMutation.isPending || updateMutation.isPending}
              isAnalyzing={analyzeMutation.isPending}
              canAnalyze={canAnalyze}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Form and Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Información Básica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre de la plantilla *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Propuesta de Planeación Fiscal"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe el propósito de esta plantilla..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Source type tabs */}
            {status === 'draft' && (
              <Tabs
                value={sourceType}
                onValueChange={(v) => setSourceType(v as SourceType)}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="manual" className="gap-2">
                    <PenTool className="h-4 w-4" />
                    Escribir Manualmente
                  </TabsTrigger>
                  <TabsTrigger value="docx" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Cargar DOCX
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Editor de Plantilla</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Escribe el contenido y usa la barra de herramientas para marcar
                        bloques como <strong>Fijo</strong> o <strong>Variable</strong>.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <TemplateEditor
                        initialContent={content}
                        blocks={blocks}
                        onBlocksChange={handleBlocksChange}
                        onContentChange={handleContentChange}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="docx" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Cargar Documento</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Sube un archivo DOCX para extraer su contenido.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FileUploader onFileLoaded={handleFileLoaded} />
                      
                      {content && (
                        <div className="mt-6">
                          <p className="text-sm font-medium mb-2">
                            Contenido extraído - Marca los bloques:
                          </p>
                          <TemplateEditor
                            initialContent={content}
                            blocks={blocks}
                            onBlocksChange={handleBlocksChange}
                            onContentChange={handleContentChange}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}

            {/* AI Analysis Panel (when in analyzed status) */}
            {status === 'analyzed' && analysisResult && (
              <Card>
                <CardContent className="pt-6">
                  <AIAnalysisPanel
                    analysisResult={analysisResult}
                    onConfirm={(decisions) => confirmSchemaMutation.mutate(decisions)}
                    onReject={handleRejectAnalysis}
                    isConfirming={confirmSchemaMutation.isPending}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Help panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Guía Rápida</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-1">🔒 Bloques Fijos</h4>
                  <p className="text-muted-foreground">
                    Texto que no cambia entre propuestas. Ej: cláusulas legales,
                    texto de introducción estándar.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">📝 Bloques Variables</h4>
                  <p className="text-muted-foreground">
                    Datos que se llenan automáticamente desde el sistema. Ej:
                    nombre del cliente, objetivos del servicio.
                  </p>
                </div>
                <div className="pt-3 border-t">
                  <h4 className="font-medium mb-1">Flujo de Estados</h4>
                  <ol className="text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Borrador - edita libremente</li>
                    <li>Analizado - revisa sugerencias IA</li>
                    <li>Revisado - listo para aprobar</li>
                    <li>Aprobado - pendiente de activar</li>
                    <li>Activo - disponible para propuestas</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {blocks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Resumen de Bloques ({blocks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Fijos:</span>
                      <span className="font-medium">
                        {blocks.filter((b) => b.type === "static").length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Variables:</span>
                      <span className="font-medium">
                        {blocks.filter((b) => b.type === "variable").length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
