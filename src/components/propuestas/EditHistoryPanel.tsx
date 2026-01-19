/**
 * EditHistoryPanel - Shows history of text edits made to the proposal
 */

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { History, Pencil, Sparkles, Undo2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import type { TextOverride } from "./types";

interface EditHistoryPanelProps {
  overrides: TextOverride[];
  onRestore: (sectionId: string) => void;
  getSectionLabel: (sectionId: string) => string;
}

export function EditHistoryPanel({ overrides, onRestore, getSectionLabel }: EditHistoryPanelProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  // Sort by timestamp, most recent first
  const sortedOverrides = [...overrides].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  const toggleExpanded = (sectionId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedItems(newExpanded);
  };
  
  if (overrides.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p>No hay ediciones aún</p>
        <p className="text-xs mt-1">Las ediciones aparecerán aquí</p>
      </div>
    );
  }
  
  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-3">
          <History className="h-3.5 w-3.5" />
          Historial de ediciones ({overrides.length})
        </div>
        
        {sortedOverrides.map((override) => {
          const isExpanded = expandedItems.has(override.sectionId);
          const formattedTime = format(new Date(override.timestamp), "HH:mm", { locale: es });
          const formattedDate = format(new Date(override.timestamp), "d MMM", { locale: es });
          
          return (
            <Collapsible
              key={override.sectionId}
              open={isExpanded}
              onOpenChange={() => toggleExpanded(override.sectionId)}
            >
              <div className="border rounded-lg bg-card overflow-hidden">
                <CollapsibleTrigger asChild>
                  <button className="w-full p-3 flex items-start gap-2 text-left hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {override.isAIGenerated ? (
                          <Badge variant="secondary" className="text-xs gap-1 shrink-0">
                            <Sparkles className="h-2.5 w-2.5" />
                            IA
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs gap-1 shrink-0">
                            <Pencil className="h-2.5 w-2.5" />
                            Manual
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formattedDate} {formattedTime}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">
                        {getSectionLabel(override.sectionId)}
                      </p>
                      {override.instruction && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          "{override.instruction}"
                        </p>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="px-3 pb-3 space-y-2 border-t pt-2">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Original:</p>
                      <p className="text-xs bg-muted/50 p-2 rounded line-clamp-3">
                        {override.originalText.length > 150 
                          ? override.originalText.substring(0, 150) + "..." 
                          : override.originalText}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Nuevo:</p>
                      <p className="text-xs bg-primary/5 border border-primary/20 p-2 rounded line-clamp-3">
                        {override.newText.length > 150 
                          ? override.newText.substring(0, 150) + "..." 
                          : override.newText}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs gap-1"
                      onClick={() => onRestore(override.sectionId)}
                    >
                      <Undo2 className="h-3 w-3" />
                      Restaurar original
                    </Button>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    </ScrollArea>
  );
}
