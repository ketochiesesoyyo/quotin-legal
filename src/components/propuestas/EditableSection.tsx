/**
 * EditableSection - Wrapper component for editable text sections
 * 
 * Handles text selection detection and displays visual indicators
 * for edited/AI-rewritten content.
 */

import { useRef, useCallback, ReactNode } from "react";
import { Pencil, Sparkles, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import type { TextOverride } from "./types";

interface EditableSectionProps {
  sectionId: string;
  children: ReactNode;
  className?: string;
  override?: TextOverride;
  onTextSelection: (selection: {
    text: string;
    sectionId: string;
    position: { top: number; left: number };
  }) => void;
  onRestoreOriginal?: () => void;
}

export function EditableSection({
  sectionId,
  children,
  className,
  override,
  onTextSelection,
  onRestoreOriginal,
}: EditableSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString().trim();
    if (selectedText.length < 3) return; // Minimum selection length

    // Check if selection is within this section
    const range = selection.getRangeAt(0);
    if (!sectionRef.current?.contains(range.commonAncestorContainer)) return;

    // Get position for toolbar
    const rect = range.getBoundingClientRect();
    const position = {
      top: rect.top + window.scrollY,
      left: rect.left + rect.width / 2,
    };

    onTextSelection({
      text: selectedText,
      sectionId,
      position,
    });
  }, [sectionId, onTextSelection]);

  const isEdited = !!override;
  const isAIGenerated = override?.isAIGenerated ?? false;

  return (
    <div
      ref={sectionRef}
      onMouseUp={handleMouseUp}
      className={cn(
        "relative group transition-colors",
        isEdited && !isAIGenerated && "border-l-2 border-blue-400 pl-3",
        isAIGenerated && "border-l-2 border-primary pl-3",
        className
      )}
    >
      {/* Content */}
      {children}

      {/* Edit indicator */}
      {isEdited && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute -left-5 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {isAIGenerated ? (
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Pencil className="h-3.5 w-3.5 text-blue-500" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <div className="space-y-1">
                <p className="text-xs font-medium">
                  {isAIGenerated ? "Reescrito con IA" : "Editado manualmente"}
                </p>
                {onRestoreOriginal && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs w-full justify-start"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestoreOriginal();
                    }}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Restaurar original
                  </Button>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
