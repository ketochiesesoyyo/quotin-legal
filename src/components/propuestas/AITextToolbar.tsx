/**
 * AITextToolbar - Floating toolbar for AI-powered text operations
 * 
 * Appears when text is selected, offering options to:
 * - Rewrite with AI using custom instructions
 * - Quick actions like "make more formal", "simplify", etc.
 * - Preview before applying changes
 */

import { useState } from "react";
import { Sparkles, X, Check, RefreshCw, Loader2, ArrowRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AITextToolbarProps {
  selectedText: string;
  position: { top: number; left: number };
  onClose: () => void;
  onRewrite: (instruction: string) => Promise<string>;
  onApply: (newText: string) => void;
  isProcessing?: boolean;
  clientContext?: {
    clientName: string;
    industry?: string | null;
  };
}

const QUICK_ACTIONS = [
  { label: "Más formal", instruction: "Hazlo más formal y profesional" },
  { label: "Más conciso", instruction: "Hazlo más conciso, manteniendo la información clave" },
  { label: "Más detallado", instruction: "Agrega más detalle y contexto" },
  { label: "Simplificar", instruction: "Simplifica el lenguaje para que sea más claro" },
];

export function AITextToolbar({
  selectedText,
  position,
  onClose,
  onRewrite,
  onApply,
  isProcessing = false,
  clientContext,
}: AITextToolbarProps) {
  const [mode, setMode] = useState<"initial" | "custom" | "preview">("initial");
  const [customInstruction, setCustomInstruction] = useState("");
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [editableResult, setEditableResult] = useState("");
  const [localProcessing, setLocalProcessing] = useState(false);

  const handleQuickAction = async (instruction: string) => {
    setLocalProcessing(true);
    try {
      const result = await onRewrite(instruction);
      setAiResult(result);
      setEditableResult(result);
      setMode("preview");
    } catch (error) {
      console.error("AI rewrite error:", error);
    } finally {
      setLocalProcessing(false);
    }
  };

  const handleCustomRewrite = async () => {
    if (!customInstruction.trim()) return;
    
    setLocalProcessing(true);
    try {
      const result = await onRewrite(customInstruction);
      setAiResult(result);
      setEditableResult(result);
      setMode("preview");
    } catch (error) {
      console.error("AI rewrite error:", error);
    } finally {
      setLocalProcessing(false);
    }
  };

  const handleApply = () => {
    if (editableResult) {
      onApply(editableResult);
    }
  };

  const handleRegenerate = () => {
    setMode("initial");
    setAiResult(null);
    setEditableResult("");
  };

  const processing = isProcessing || localProcessing;

  return (
    <div
      className={cn(
        "absolute z-50 bg-popover border rounded-lg shadow-lg p-3",
        "animate-in fade-in-0 zoom-in-95 duration-200"
      )}
      style={{
        top: position.top,
        left: Math.max(10, Math.min(position.left, window.innerWidth - 400)),
      }}
    >
      {/* Initial mode - quick actions */}
      {mode === "initial" && (
        <div className="w-80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Reescribir con IA
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Selected text preview */}
          <div className="text-xs bg-muted p-2 rounded max-h-16 overflow-auto">
            <span className="text-muted-foreground">Seleccionado: </span>
            <span className="italic">
              {selectedText.length > 80 ? selectedText.substring(0, 80) + "..." : selectedText}
            </span>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2.5"
                onClick={() => handleQuickAction(action.instruction)}
                disabled={processing}
              >
                {action.label}
              </Button>
            ))}
          </div>

          {/* Custom instruction */}
          <div className="space-y-2">
            <Input
              placeholder="O escribe tu propia instrucción..."
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              className="text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleCustomRewrite();
                }
              }}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleCustomRewrite}
                disabled={!customInstruction.trim() || processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 mr-1" />
                    Generar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Preview mode - show result before applying */}
      {mode === "preview" && (
        <div className="w-96 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Vista previa
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Side by side comparison */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Original</p>
              <div className="text-xs bg-muted/50 p-2 rounded max-h-20 overflow-auto border">
                {selectedText.length > 150 ? selectedText.substring(0, 150) + "..." : selectedText}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-primary flex items-center gap-1">
                <ArrowRight className="h-2.5 w-2.5" />
                Nuevo
              </p>
              <div className="text-xs text-primary/80 bg-primary/5 border border-primary/20 p-2 rounded max-h-20 overflow-auto">
                {aiResult && aiResult.length > 150 ? aiResult.substring(0, 150) + "..." : aiResult}
              </div>
            </div>
          </div>

          {/* Editable result */}
          <div className="space-y-1">
            <p className="text-xs font-medium flex items-center gap-1">
              <Pencil className="h-3 w-3" />
              Ajusta antes de aplicar (opcional)
            </p>
            <Textarea
              value={editableResult}
              onChange={(e) => setEditableResult(e.target.value)}
              className="min-h-[80px] text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-2">
            <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={processing}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Regenerar
            </Button>
            <Button size="sm" onClick={handleApply} disabled={!editableResult.trim()}>
              <Check className="h-3 w-3 mr-1" />
              Aplicar cambio
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
