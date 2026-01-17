import { useState, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TemplateEditor } from "@/components/plantillas/TemplateEditor";
import { StatusWorkflow } from "@/components/plantillas/StatusWorkflow";
import { AIAnalysisPanel } from "@/components/plantillas/AIAnalysisPanel";
import { StatusBadge } from "@/components/plantillas/StatusBadge";
import type { 
  TemplateBlock, 
  TemplateSchema, 
  TemplateStatus,
  AIAnalysisResult,
  DocumentTemplate 
} from "@/components/plantillas/types";
import { ArrowLeft, FileText, Loader2, Eye, Pencil } from "lucide-react";
import { BlockTypeGuide } from "@/components/plantillas/BlockTypeGuide";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PlantillaEditar() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [blocks, setBlocks] = useState<TemplateBlock[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch template
  const { data: template, isLoading } = useQuery({
    queryKey: ["document_template", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as unknown as DocumentTemplate;
    },
    enabled: !!id,
  });

  // Populate form when template loads
  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || "");
      const canonical = template.canonical_content as { text?: string; html?: string } || {};
      setContent(canonical.text || "");
      setHtmlContent(canonical.html || "");
      setBlocks((template.schema_json as TemplateSchema)?.blocks || []);
    }
  }, [template]);

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("No template ID");

      const schema: TemplateSchema = {
        blocks,
        version: template?.version || "1.0",
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
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document_templates"] });
      queryClient.invalidateQueries({ queryKey: ["document_template", id] });
      toast({ title: "Plantilla actualizada" });
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
      // Save first
      const schema: TemplateSchema = { blocks, version: template?.version || "1.0" };
      await supabase
        .from("document_templates")
        .update({
          name,
          description: description || null,
          canonical_content: JSON.parse(JSON.stringify({ text: content, html: htmlContent })),
          schema_json: JSON.parse(JSON.stringify(schema)),
        })
        .eq("id", id);

      // Call analyze function
      const { data, error } = await supabase.functions.invoke('analyze-template', {
        body: {
          template_id: id,
          canonical_content: { text: content, html: htmlContent, blocks },
          context: 'legal_proposals',
        },
      });

      if (error) throw error;
      return data as AIAnalysisResult;
    },
    onSuccess: async (result) => {
      // Update template status
      await supabase
        .from("document_templates")
        .update({
          status: 'analyzed',
          analysis_result: JSON.parse(JSON.stringify(result)),
          analyzed_at: new Date().toISOString(),
        })
        .eq("id", id);

      queryClient.invalidateQueries({ queryKey: ["document_templates"] });
      queryClient.invalidateQueries({ queryKey: ["document_template", id] });
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

  // Confirm schema mutation
  const confirmSchemaMutation = useMutation({
    mutationFn: async (decisions: Array<{
      block_id: string;
      modified_type?: 'static' | 'variable' | 'dynamic';
      variable_name?: string;
      source?: string;
      instructions?: string;
    }>) => {
      if (!id || !user) throw new Error("Missing template or user");

      const finalBlocks: TemplateBlock[] = decisions.map((d, index) => ({
        id: d.block_id,
        type: d.modified_type || 'static',
        content: blocks.find(b => b.id === d.block_id)?.content || '',
        order: index,
        variableName: d.variable_name,
        source: d.source,
        instructions: d.instructions,
        required: d.modified_type === 'variable',
        format: 'richtext' as const,
      }));

      const schema: TemplateSchema = {
        blocks: finalBlocks,
        version: template?.version || "1.0",
      };

      const { error } = await supabase
        .from("document_templates")
        .update({
          status: 'reviewed',
          schema_json: JSON.parse(JSON.stringify(schema)),
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document_templates"] });
      queryClient.invalidateQueries({ queryKey: ["document_template", id] });
      toast({ title: "Schema confirmado - Estado: Reviewed" });
    },
    onError: (error) => {
      toast({
        title: "Error al confirmar",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!id || !user) throw new Error("Missing template or user");

      const { error } = await supabase
        .from("document_templates")
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document_templates"] });
      queryClient.invalidateQueries({ queryKey: ["document_template", id] });
      toast({ title: "Plantilla aprobada" });
    },
    onError: (error) => {
      toast({
        title: "Error al aprobar",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  // Activate mutation
  const activateMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("No template ID");

      const { error } = await supabase
        .from("document_templates")
        .update({
          status: 'active',
          is_active: true,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document_templates"] });
      queryClient.invalidateQueries({ queryKey: ["document_template", id] });
      toast({ title: "¡Plantilla activada!", description: "Ya está disponible para usar en propuestas." });
    },
    onError: (error) => {
      toast({
        title: "Error al activar",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  // Reject analysis
  const handleRejectAnalysis = async () => {
    await supabase
      .from("document_templates")
      .update({
        status: 'draft',
        analysis_result: null,
        analyzed_at: null,
      })
      .eq("id", id);

    queryClient.invalidateQueries({ queryKey: ["document_templates"] });
    queryClient.invalidateQueries({ queryKey: ["document_template", id] });
    toast({ title: "Análisis rechazado - Volviendo a borrador" });
  };

  // Helper to increment version
  const incrementVersion = (currentVersion: string): string => {
    // Parse version like "v1.0" or "1.0"
    const match = currentVersion.match(/v?(\d+)\.?(\d*)/i);
    if (match) {
      const major = parseInt(match[1], 10);
      return `v${major + 1}.0`;
    }
    return "v2.0";
  };

  // Revert to draft from reviewed/approved (increments version)
  const revertToDraftMutation = useMutation({
    mutationFn: async () => {
      if (!id || !template) throw new Error("No template ID");

      const newVersion = incrementVersion(template.version || "v1.0");

      const { error } = await supabase
        .from("document_templates")
        .update({
          status: 'draft',
          version: newVersion,
          reviewed_at: null,
          reviewed_by: null,
          approved_at: null,
          approved_by: null,
          analysis_result: null,
          analyzed_at: null,
        })
        .eq("id", id);

      if (error) throw error;
      return newVersion;
    },
    onSuccess: (newVersion) => {
      queryClient.invalidateQueries({ queryKey: ["document_templates"] });
      queryClient.invalidateQueries({ queryKey: ["document_template", id] });
      toast({ 
        title: "Plantilla en modo edición", 
        description: `Nueva versión: ${newVersion}. Ahora puedes editar el contenido.` 
      });
    },
    onError: (error) => {
      toast({
        title: "Error al revertir",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const handleContentChange = useCallback((text: string, html: string) => {
    setContent(text);
    setHtmlContent(html);
  }, []);

  const handleBlocksChange = useCallback((newBlocks: TemplateBlock[]) => {
    setBlocks(newBlocks);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Plantilla no encontrada</p>
      </div>
    );
  }

  const currentStatus = template.status as TemplateStatus;
  const analysisResult = template.analysis_result as AIAnalysisResult | null;
  const isReadOnly = currentStatus === 'active';

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
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{template.name}</h1>
                  <StatusBadge status={currentStatus} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Versión: {template.version}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Preview button - always visible */}
              <Button
                variant="outline"
                onClick={() => setShowPreview(true)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Vista Previa
              </Button>
              
              {/* Edit button for reviewed/approved/active templates */}
              {['reviewed', 'approved', 'active'].includes(currentStatus) && (
                <Button
                  variant="default"
                  onClick={() => revertToDraftMutation.mutate()}
                  disabled={revertToDraftMutation.isPending}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  {revertToDraftMutation.isPending ? "Preparando..." : "Editar Plantilla"}
                </Button>
              )}
              
              <StatusWorkflow
                currentStatus={currentStatus}
                onSaveDraft={() => updateMutation.mutate()}
                onAnalyze={() => analyzeMutation.mutate()}
                onApprove={() => approveMutation.mutate()}
                onActivate={() => activateMutation.mutate()}
                isSaving={updateMutation.isPending}
                isAnalyzing={analyzeMutation.isPending}
                isApproving={approveMutation.isPending}
                isActivating={activateMutation.isPending}
                canAnalyze={name.trim().length > 0 && content.trim().length > 0}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
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
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    disabled={isReadOnly}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Editor (for draft status) */}
            {currentStatus === 'draft' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Editor de Plantilla</CardTitle>
                </CardHeader>
                <CardContent>
                  <TemplateEditor
                    initialContent={htmlContent}
                    blocks={blocks}
                    onBlocksChange={handleBlocksChange}
                    onContentChange={handleContentChange}
                    readOnly={isReadOnly}
                  />
                </CardContent>
              </Card>
            )}

            {/* AI Analysis Panel (for analyzed status) */}
            {currentStatus === 'analyzed' && analysisResult && (
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

            {/* Schema preview (for reviewed, approved, active) */}
            {['reviewed', 'approved', 'active'].includes(currentStatus) && (
              <Card>
                <CardHeader>
                  <CardTitle>Schema Confirmado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {blocks.map((block) => (
                      <div
                        key={block.id}
                        className={`p-3 rounded border ${
                          block.type === 'static'
                            ? 'bg-blue-50 border-blue-200'
                            : block.type === 'dynamic'
                            ? 'bg-purple-50 border-purple-200'
                            : 'bg-amber-50 border-amber-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm font-medium mb-1">
                          {block.type === 'static' ? '🔒 FIJO' : block.type === 'dynamic' ? '✨ DINÁMICO' : '📝 VARIABLE'}
                          {block.variableName && (
                            <span className="text-muted-foreground">
                              ({block.variableName})
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {block.content.substring(0, 100)}...
                        </p>
                        {block.source && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Fuente: {block.source}
                          </p>
                        )}
                        {block.instructions && (
                          <p className="text-xs text-purple-600 mt-1">
                            Instrucciones: {block.instructions.substring(0, 80)}...
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span>{template.source_type === 'manual' ? 'Manual' : 'DOCX'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Versión:</span>
                  <span>{template.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Creado:</span>
                  <span>{new Date(template.created_at).toLocaleDateString('es-MX')}</span>
                </div>
                {template.analyzed_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Analizado:</span>
                    <span>{new Date(template.analyzed_at).toLocaleDateString('es-MX')}</span>
                  </div>
                )}
                {template.reviewed_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Revisado:</span>
                    <span>{new Date(template.reviewed_at).toLocaleDateString('es-MX')}</span>
                  </div>
                )}
                {template.approved_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Aprobado:</span>
                    <span>{new Date(template.approved_at).toLocaleDateString('es-MX')}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {blocks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Bloques ({blocks.length})
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
                    <div className="flex justify-between text-sm">
                      <span>Dinámicos:</span>
                      <span className="font-medium">
                        {blocks.filter((b) => b.type === "dynamic").length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Block type guide - show when in draft mode */}
            {currentStatus === 'draft' && <BlockTypeGuide />}
          </div>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Vista Previa: {template.name}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 p-6 bg-white border rounded-lg shadow-inner">
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent || '<p class="text-muted-foreground">Sin contenido</p>' }}
            />
          </div>
          <div className="mt-4 flex justify-between items-center text-sm text-muted-foreground">
            <span>Versión: {template.version}</span>
            <span>{blocks.length} bloques definidos</span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
