/**
 * TextSelectionToolbar - Floating toolbar for text editing and AI rewriting
 * 
 * Appears when user selects text in the preview, offering:
 * 1. Manual editing
 * 2. AI-powered rewriting
 */

import { useState, useRef, useEffect } from "react";
import { Pencil, Sparkles, X, Check, RefreshCw, Loader2 } from "lucide-react";
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
  useRelativePosition?: boolean; // When true, position is handled by parent
}

export function TextSelectionToolbar({
  selectedText,
  position,
  onClose,
  onManualEdit,
  onAIRewrite,
  isRewriting = false,
  useRelativePosition = false,
}: TextSelectionToolbarProps) {
  const [mode, setMode] = useState<'initial' | 'edit' | 'ai'>('initial');
  const [editedText, setEditedText] = useState(selectedText);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  // Handle click outside to close - with delay to prevent immediate close after selection
  useEffect(() => {
    // Skip the first render to avoid closing on the selection mouseup
    isInitialMount.current = true;
    
    function handleClickOutside(event: MouseEvent) {
      // Ignore the first mousedown after toolbar appears (from text selection)
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }
      
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    // Add listener after a small delay to avoid catching the selection event
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
        if (mode !== 'initial') {
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
    } catch (error) {
      console.error("AI rewrite error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptAIResult = () => {
    if (aiResult) {
      onManualEdit(aiResult);
      onClose();
    }
  };

  const handleRegenerate = async () => {
    setAiResult(null);
    await handleAIRewrite();
  };

  // Calculate position adjustments to keep toolbar in view
  // When using relative positioning, use simpler positioning
  const adjustedPosition = useRelativePosition
    ? { top: 0, left: 0 }
    : {
        top: Math.max(10, position.top - 45), // Position above selection
        left: Math.max(10, Math.min(position.left, window.innerWidth - 300)),
      };

  const positionStyles = useRelativePosition
    ? {} // Position is handled by parent
    : {
        position: 'fixed' as const,
        top: adjustedPosition.top,
        left: adjustedPosition.left,
      };

  return (
    <div
      ref={toolbarRef}
      className={cn(
        "bg-popover border rounded-lg shadow-lg p-2",
        "animate-in fade-in-0 zoom-in-95 duration-200",
        !useRelativePosition && "fixed z-50"
      )}
      style={positionStyles}
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

      {/* AI rewrite mode */}
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
          {!aiResult && (
            <>
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
                    onClick={() => {
                      setAiInstruction(suggestion);
                    }}
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
            </>
          )}

          {/* AI result */}
          {aiResult && (
            <>
              <div className="text-sm bg-primary/5 border border-primary/20 p-3 rounded max-h-40 overflow-auto">
                {aiResult}
              </div>
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  Regenerar
                </Button>
                <Button size="sm" onClick={handleAcceptAIResult}>
                  <Check className="h-3 w-3 mr-1" />
                  Aceptar
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
