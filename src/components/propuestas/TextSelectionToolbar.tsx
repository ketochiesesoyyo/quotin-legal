/**
 * TextSelectionToolbar - Floating toolbar for text editing and AI rewriting
 * 
 * Appears when user selects text in the preview, offering:
 * 1. Manual editing
 * 2. AI-powered rewriting with preview before applying
 */

import { useState, useRef, useEffect } from "react";
import { Pencil, Sparkles, X, Check, RefreshCw, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TextSelectionToolbarProps {
  selectedText: string;
  position: { top: number; left: number };
  onClose: () => void;
  onManualEdit: (newText: string) => void;
  onAIRewrite: (instruction: string) => Promise<string>;
  isRewriting?: boolean;
}

export function TextSelectionToolbar({
  selectedText,
  position,
  onClose,
  onManualEdit,
  onAIRewrite,
  isRewriting = false,
}: TextSelectionToolbarProps) {
  const [mode, setMode] = useState<'initial' | 'edit' | 'ai' | 'ai-preview'>('initial');
  const [editedText, setEditedText] = useState(selectedText);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [editableAiResult, setEditableAiResult] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  // Handle click outside to close - with delay to prevent immediate close after selection
  useEffect(() => {
    isInitialMount.current = true;
    
    function handleClickOutside(event: MouseEvent) {
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }
      
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (mode === 'ai-preview') {
          setMode('ai');
        } else if (mode !== 'initial') {
          setMode('initial');
          setAiResult(null);
        } else {
          onClose();
        }
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mode, onClose]);

  const handleSaveManualEdit = () => {
    if (editedText.trim() !== selectedText) {
      onManualEdit(editedText);
    }
    onClose();
  };

  const handleAIRewrite = async () => {
    if (!aiInstruction.trim()) return;
    
    setIsProcessing(true);
    try {
      const result = await onAIRewrite(aiInstruction);
      setAiResult(result);
      setEditableAiResult(result);
      setMode('ai-preview'); // Go to preview mode instead of showing inline
    } catch (error) {
      console.error("AI rewrite error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyAIResult = () => {
    if (editableAiResult) {
      onManualEdit(editableAiResult);
      onClose();
    }
  };

  const handleRegenerate = async () => {
    setMode('ai');
    setAiResult(null);
    setEditableAiResult("");
  };

  return (
    <div
      ref={toolbarRef}
      className={cn(
        "bg-popover border rounded-lg shadow-lg p-2",
        "animate-in fade-in-0 zoom-in-95 duration-200"
      )}
    >
      {/* Initial mode - show buttons */}
      {mode === 'initial' && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-xs"
            onClick={() => {
              setMode('edit');
              setEditedText(selectedText);
            }}
          >
            <Pencil className="h-3 w-3" />
            Editar
          </Button>
          <div className="w-px h-4 bg-border" />
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-xs text-primary"
            onClick={() => setMode('ai')}
          >
            <Sparkles className="h-3 w-3" />
            Reescribir con IA
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 ml-1"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Manual edit mode */}
      {mode === 'edit' && (
        <div className="w-80 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium">Editar texto</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => setMode('initial')}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="min-h-[100px] text-sm"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMode('initial')}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveManualEdit}
              disabled={editedText.trim() === selectedText}
            >
              <Check className="h-3 w-3 mr-1" />
              Guardar
            </Button>
          </div>
        </div>
      )}

      {/* AI rewrite mode - instruction input */}
      {mode === 'ai' && (
        <div className="w-80 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" />
              Reescribir con IA
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => {
                setMode('initial');
                setAiResult(null);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Show original text snippet */}
          <div className="text-xs bg-muted p-2 rounded max-h-20 overflow-auto">
            <span className="text-muted-foreground">Texto seleccionado: </span>
            <span className="italic">
              {selectedText.length > 100
                ? selectedText.substring(0, 100) + "..."
                : selectedText}
            </span>
          </div>

          {/* Instruction input */}
          <Input
            placeholder="¿Cómo quieres que lo cambie? Ej: Hazlo más conciso"
            value={aiInstruction}
            onChange={(e) => setAiInstruction(e.target.value)}
            className="text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAIRewrite();
              }
            }}
          />
          <div className="flex flex-wrap gap-1">
            {["Más formal", "Más conciso", "Más detallado", "Simplificar"].map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                className="text-xs h-6 px-2"
                onClick={() => setAiInstruction(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleAIRewrite}
              disabled={!aiInstruction.trim() || isProcessing}
            >
              {isProcessing ? (
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
      )}

      {/* AI Preview mode - show editable result before applying */}
      {mode === 'ai-preview' && (
        <div className="w-96 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" />
              Vista previa del texto generado
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => {
                setMode('ai');
                setAiResult(null);
                setEditableAiResult("");
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          {/* Comparison view */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Original</p>
              <div className="text-xs bg-muted/50 p-2 rounded max-h-24 overflow-auto border">
                {selectedText.length > 200
                  ? selectedText.substring(0, 200) + "..."
                  : selectedText}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-primary flex items-center gap-1">
                <ArrowRight className="h-2.5 w-2.5" />
                Nuevo
              </p>
              <div className="text-xs text-primary/80 bg-primary/5 border border-primary/20 p-2 rounded max-h-24 overflow-auto">
                {aiResult && aiResult.length > 200
                  ? aiResult.substring(0, 200) + "..."
                  : aiResult}
              </div>
            </div>
          </div>
          
          {/* Editable textarea for final adjustments */}
          <div className="space-y-1">
            <p className="text-xs font-medium flex items-center gap-1">
              <Pencil className="h-3 w-3" />
              Ajusta el texto antes de aplicar (opcional)
            </p>
            <Textarea
              value={editableAiResult}
              onChange={(e) => setEditableAiResult(e.target.value)}
              className="min-h-[100px] text-sm"
              placeholder="Edita el texto generado aquí..."
            />
          </div>
          
          {/* Action buttons */}
          <div className="flex justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isProcessing}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Regenerar
            </Button>
            <Button
              size="sm"
              onClick={handleApplyAIResult}
              disabled={!editableAiResult.trim()}
              className="gap-1"
            >
              <Check className="h-3 w-3" />
              Actualizar texto
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
