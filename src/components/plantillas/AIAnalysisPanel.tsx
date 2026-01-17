import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  Brain,
  Check,
  Lock,
  Variable,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
} from "lucide-react";
import type { AIAnalysisResult, AIAnalysisBlock, BlockType } from "./types";
import { VARIABLE_SOURCES } from "./types";

export interface BlockDecision {
  block_id: string;
  accepted: boolean;
  modified_type?: BlockType;
  variable_name?: string;
  source?: string;
  instructions?: string;
}

interface AIAnalysisPanelProps {
  analysisResult: AIAnalysisResult;
  onConfirm: (decisions: BlockDecision[]) => void;
  onReject: () => void;
  isConfirming?: boolean;
}

export function AIAnalysisPanel({
  analysisResult,
  onConfirm,
  onReject,
  isConfirming = false,
}: AIAnalysisPanelProps) {
  const [decisions, setDecisions] = useState<Record<string, BlockDecision>>(() => {
    const initial: Record<string, BlockDecision> = {};
    analysisResult.detected_blocks.forEach((block) => {
      initial[block.block_id] = {
        block_id: block.block_id,
        accepted: true,
        modified_type: block.suggested_type,
        variable_name: block.suggested_variable_name,
        source: block.suggested_source,
      };
    });
    return initial;
  });
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());

  const confidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "text-green-600";
    if (confidence >= 0.7) return "text-amber-600";
    return "text-red-600";
  };

  const confidenceBg = (confidence: number) => {
    if (confidence >= 0.9) return "bg-green-100";
    if (confidence >= 0.7) return "bg-amber-100";
    return "bg-red-100";
  };

  const toggleExpand = (blockId: string) => {
    setExpandedBlocks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(blockId)) {
        newSet.delete(blockId);
      } else {
        newSet.add(blockId);
      }
      return newSet;
    });
  };

  const updateDecision = (
    blockId: string,
    updates: Partial<BlockDecision>
  ) => {
    setDecisions((prev) => ({
      ...prev,
      [blockId]: { ...prev[blockId], ...updates },
    }));
  };

  const handleConfirm = () => {
    const decisionList = Object.values(decisions);
    onConfirm(decisionList);
  };

  const lowConfidenceBlocks = analysisResult.detected_blocks.filter(
    (b) => b.confidence < 0.7
  );

  return (
    <div className="space-y-6">
      {/* Header with confidence score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Resultado del Análisis</h3>
            <p className="text-sm text-muted-foreground">
              {analysisResult.detected_blocks.length} bloques detectados
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-primary">
            {Math.round(analysisResult.confidence_score * 100)}%
          </div>
          <div className="text-sm text-muted-foreground">Confianza general</div>
        </div>
      </div>

      <Progress value={analysisResult.confidence_score * 100} className="h-2" />

      {/* Warnings */}
      {analysisResult.warnings.length > 0 && (
        <Alert variant="default" className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">
            Advertencias ({analysisResult.warnings.length})
          </AlertTitle>
          <AlertDescription className="text-amber-700">
            <ul className="list-disc list-inside mt-2 space-y-1">
              {analysisResult.warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Low confidence alert */}
      {lowConfidenceBlocks.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Bloques con baja confianza</AlertTitle>
          <AlertDescription>
            {lowConfidenceBlocks.length} bloque(s) tienen confianza menor al 70%.
            Se han marcado como FIJO por defecto. Revisa cuidadosamente.
          </AlertDescription>
        </Alert>
      )}

      {/* Detected blocks */}
      <div className="space-y-3">
        <h4 className="font-medium">Bloques detectados</h4>
        {analysisResult.detected_blocks.map((block) => {
          const decision = decisions[block.block_id];
          const isExpanded = expandedBlocks.has(block.block_id);
          const isLowConfidence = block.confidence < 0.7;

          return (
            <Card
              key={block.block_id}
              className={`transition-all ${
                isLowConfidence ? "border-red-300 bg-red-50/30" : ""
              }`}
            >
              <CardHeader className="py-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {decision.modified_type === "static" ? (
                        <div className="h-8 w-8 rounded bg-blue-100 flex items-center justify-center">
                          <Lock className="h-4 w-4 text-blue-600" />
                        </div>
                      ) : decision.modified_type === "dynamic" ? (
                        <div className="h-8 w-8 rounded bg-purple-100 flex items-center justify-center">
                          <Sparkles className="h-4 w-4 text-purple-600" />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded bg-amber-100 flex items-center justify-center">
                          <Variable className="h-4 w-4 text-amber-600" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-sm">
                          {decision.modified_type === "static" ? "FIJO" : decision.modified_type === "dynamic" ? "DINÁMICO" : "VARIABLE"}
                        <Badge
                          variant="outline"
                          className={`ml-2 ${confidenceBg(block.confidence)}`}
                        >
                          <span className={confidenceColor(block.confidence)}>
                            {Math.round(block.confidence * 100)}%
                          </span>
                        </Badge>
                        {isLowConfidence && (
                          <Badge variant="destructive" className="ml-1">
                            Revisar
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {block.reason}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(block.block_id)}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0 space-y-4">
                  {/* Block type toggle */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={decision.modified_type === "static" ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        updateDecision(block.block_id, { modified_type: "static" })
                      }
                      className="flex-1"
                    >
                      <Lock className="h-4 w-4 mr-1" />
                      Fijo
                    </Button>
                    <Button
                      type="button"
                      variant={decision.modified_type === "variable" ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        updateDecision(block.block_id, { modified_type: "variable" })
                      }
                      className="flex-1"
                    >
                      <Variable className="h-4 w-4 mr-1" />
                      Variable
                    </Button>
                    <Button
                      type="button"
                      variant={decision.modified_type === "dynamic" ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        updateDecision(block.block_id, { modified_type: "dynamic" })
                      }
                      className="flex-1"
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      Dinámico
                    </Button>
                  </div>

                  {/* Variable configuration */}
                  {decision.modified_type === "variable" && (
                    <div className="grid gap-3 sm:grid-cols-2 p-3 bg-muted/30 rounded">
                      <div className="space-y-2">
                        <Label>Nombre de variable</Label>
                        <Input
                          value={decision.variable_name || ""}
                          onChange={(e) =>
                            updateDecision(block.block_id, {
                              variable_name: e.target.value.replace(/\s/g, "_"),
                            })
                          }
                          placeholder="ej: client_name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fuente de datos</Label>
                        <Select
                          value={decision.source || ""}
                          onValueChange={(value) =>
                            updateDecision(block.block_id, { source: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {VARIABLE_SOURCES.map((src) => (
                              <SelectItem key={src.value} value={src.value}>
                                {src.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Dynamic block configuration */}
                  {decision.modified_type === "dynamic" && (
                    <div className="p-3 bg-purple-50 rounded border border-purple-200">
                      <div className="space-y-2">
                        <Label className="text-purple-800">Instrucciones para la IA</Label>
                        <textarea
                          value={decision.instructions || ""}
                          onChange={(e) =>
                            updateDecision(block.block_id, {
                              instructions: e.target.value,
                            })
                          }
                          placeholder="Ej: Redacta los antecedentes del caso basándote en la información del cliente y los servicios solicitados. Incluye contexto sobre la industria y necesidades específicas."
                          className="w-full min-h-[80px] p-2 text-sm border rounded-md resize-y bg-white"
                        />
                        <p className="text-xs text-purple-600">
                          La IA generará contenido dinámico basándose en estas instrucciones y el contexto del caso.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Accept/Modify indicator */}
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-muted-foreground">
                      {decision.modified_type === block.suggested_type
                        ? "Sugerencia aceptada"
                        : "Tipo modificado manualmente"}
                    </span>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button type="button" variant="outline" onClick={onReject}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Rechazar y volver a Draft
        </Button>
        <Button onClick={handleConfirm} disabled={isConfirming}>
          <Check className="h-4 w-4 mr-2" />
          {isConfirming ? "Confirmando..." : "Confirmar Schema → Reviewed"}
        </Button>
      </div>
    </div>
  );
}
