/**
 * ProposalDocumentEditor - Unified TipTap-based document editor for proposals
 * 
 * This component provides a WYSIWYG editing experience where:
 * - The template IS the document (cloned to draft_content)
 * - Users can select text and get AI suggestions or edit manually
 * - All changes are saved directly to the document
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Sparkles,
  Pencil,
  Save,
  Loader2,
  Undo,
  Redo,
  Eye,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AITextToolbar } from "./AITextToolbar";

interface ClientContext {
  clientName: string;
  groupAlias?: string;
  industry?: string | null;
  entities?: Array<{ legalName: string; rfc?: string | null }>;
  primaryContact?: {
    fullName: string;
    position?: string | null;
    salutationPrefix?: string;
  };
}

interface ServiceContext {
  id: string;
  name: string;
  description?: string | null;
  customText?: string | null;
  fee?: number;
  monthlyFee?: number;
}

interface ProposalDocumentEditorProps {
  caseId: string;
  initialContent: string;
  clientContext: ClientContext;
  services: ServiceContext[];
  onSave: (content: string) => Promise<void>;
  /**
   * Optional: keep parent state in sync on every keystroke so other flows
   * (e.g., Guardar borrador / Guardar y continuar) persist the latest HTML
   * even if the user didn't click "Guardar" inside the editor.
   */
  onContentChange?: (content: string) => void;
  onExportPDF?: () => void;
  onPreview?: () => void;
  isSaving?: boolean;
}

export function ProposalDocumentEditor({
  caseId,
  initialContent,
  clientContext,
  services,
  onSave,
  onContentChange,
  onExportPDF,
  onPreview,
  isSaving = false,
}: ProposalDocumentEditorProps) {
  const { toast } = useToast();
  const [hasChanges, setHasChanges] = useState(false);
  const [showAIToolbar, setShowAIToolbar] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [aiToolbarPosition, setAIToolbarPosition] = useState({ top: 0, left: 0 });
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: "Comienza a escribir tu propuesta aquí...",
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: initialContent || "<p></p>",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none dark:prose-invert focus:outline-none min-h-[500px] p-6",
      },
    },
    onUpdate: ({ editor }) => {
      setHasChanges(true);
      onContentChange?.(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to, " ");
      
      if (text.length > 5) {
        setSelectedText(text);
        
        // Calculate position for AI toolbar
        if (editorContainerRef.current) {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const containerRect = editorContainerRef.current.getBoundingClientRect();
            
            setAIToolbarPosition({
              top: rect.bottom - containerRect.top + 8,
              left: rect.left - containerRect.left,
            });
          }
        }
      } else {
        setSelectedText("");
        setShowAIToolbar(false);
      }
    },
  });

  // Update content when initialContent changes
  useEffect(() => {
    if (editor && initialContent && editor.getHTML() !== initialContent) {
      editor.commands.setContent(initialContent);
      setHasChanges(false);
    }
  }, [editor, initialContent]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!editor) return;
    
    try {
      await onSave(editor.getHTML());
      setHasChanges(false);
      toast({
        title: "Documento guardado",
        description: "Los cambios se han guardado correctamente",
      });
    } catch (error) {
      console.error("Error saving:", error);
      toast({
        title: "Error al guardar",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    }
  }, [editor, onSave, toast]);

  // Handle AI rewrite
  const handleAIRewrite = useCallback(async (instruction: string): Promise<string> => {
    if (!selectedText) throw new Error("No text selected");
    
    setIsAIProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("rewrite-text", {
        body: {
          originalText: selectedText,
          instruction,
          context: {
            clientName: clientContext.clientName,
            industry: clientContext.industry,
          },
        },
      });

      if (error) throw error;
      return data.rewrittenText;
    } finally {
      setIsAIProcessing(false);
    }
  }, [selectedText, clientContext]);

  // Apply AI result to editor
  const handleApplyAIResult = useCallback((newText: string) => {
    if (!editor) return;
    
    const { from, to } = editor.state.selection;
    editor.chain().focus().deleteRange({ from, to }).insertContent(newText).run();
    setShowAIToolbar(false);
    setSelectedText("");
  }, [editor]);

  // Insert variable into document
  const handleInsertVariable = useCallback((variable: string) => {
    if (!editor) return;
    
    let valueToInsert = "";
    
    switch (variable) {
      case "client.name":
        valueToInsert = clientContext.clientName;
        break;
      case "client.alias":
        valueToInsert = clientContext.groupAlias || clientContext.clientName;
        break;
      case "contact.name":
        valueToInsert = clientContext.primaryContact?.fullName || "[Nombre del Contacto]";
        break;
      case "contact.position":
        valueToInsert = clientContext.primaryContact?.position || "[Cargo]";
        break;
      case "entities":
        valueToInsert = clientContext.entities?.map(e => e.legalName).join(", ") || "[Entidades]";
        break;
      case "services.list":
        valueToInsert = services.map(s => s.name).join(", ");
        break;
      case "date.today":
        valueToInsert = new Date().toLocaleDateString("es-MX", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        break;
      default:
        valueToInsert = `[${variable}]`;
    }
    
    editor.chain().focus().insertContent(valueToInsert).run();
  }, [editor, clientContext, services]);

  if (!editor) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="border-b bg-muted/30 p-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {/* Formatting buttons */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8", editor.isActive("bold") && "bg-accent")}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Negrita (Ctrl+B)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8", editor.isActive("italic") && "bg-accent")}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Cursiva (Ctrl+I)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8", editor.isActive("heading", { level: 1 }) && "bg-accent")}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  >
                    <Heading1 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Título 1</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8", editor.isActive("heading", { level: 2 }) && "bg-accent")}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  >
                    <Heading2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Título 2</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8", editor.isActive("bulletList") && "bg-accent")}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Lista con viñetas</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8", editor.isActive("orderedList") && "bg-accent")}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  >
                    <ListOrdered className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Lista numerada</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8", editor.isActive({ textAlign: "left" }) && "bg-accent")}
                    onClick={() => editor.chain().focus().setTextAlign("left").run()}
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Alinear izquierda</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8", editor.isActive({ textAlign: "center" }) && "bg-accent")}
                    onClick={() => editor.chain().focus().setTextAlign("center").run()}
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Centrar</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8", editor.isActive({ textAlign: "right" }) && "bg-accent")}
                    onClick={() => editor.chain().focus().setTextAlign("right").run()}
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Alinear derecha</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                  >
                    <Undo className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Deshacer (Ctrl+Z)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                  >
                    <Redo className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rehacer (Ctrl+Y)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
                Sin guardar
              </Badge>
            )}

            {selectedText && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-primary border-primary/30"
                onClick={() => setShowAIToolbar(true)}
              >
                <Sparkles className="h-4 w-4" />
                Reescribir con IA
              </Button>
            )}

            {onPreview && (
              <Button variant="outline" size="sm" className="gap-2" onClick={onPreview}>
                <Eye className="h-4 w-4" />
                Vista previa
              </Button>
            )}

            {onExportPDF && (
              <Button variant="outline" size="sm" className="gap-2" onClick={onExportPDF}>
                <FileDown className="h-4 w-4" />
                PDF
              </Button>
            )}

            <Button size="sm" className="gap-2" onClick={handleSave} disabled={isSaving || !hasChanges}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar
            </Button>
          </div>
        </div>
      </div>

      {/* Editor content */}
      <div ref={editorContainerRef} className="flex-1 overflow-auto relative">
        <EditorContent editor={editor} className="h-full" />

        {/* AI Toolbar (floating) */}
        {showAIToolbar && selectedText && (
          <AITextToolbar
            selectedText={selectedText}
            position={aiToolbarPosition}
            onClose={() => setShowAIToolbar(false)}
            onRewrite={handleAIRewrite}
            onApply={handleApplyAIResult}
            isProcessing={isAIProcessing}
            clientContext={clientContext}
          />
        )}
      </div>

      {/* Status bar */}
      <div className="border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <span>
            {selectedText ? `${selectedText.split(/\s+/).length} palabras seleccionadas` : "Listo para editar"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>Cliente: {clientContext.clientName}</span>
          <span>{services.length} servicio(s)</span>
        </div>
      </div>
    </div>
  );
}
