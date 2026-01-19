import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { BlockMarkerToolbar } from './BlockMarkerToolbar';
import type { TemplateBlock, BlockType } from './types';
import { useState, useCallback, useEffect } from 'react';
import { Lock, Variable, Sparkles, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VARIABLE_SOURCES } from './types';

interface MarkedBlock {
  id: string;
  type: BlockType;
  content: string;
  variableName?: string;
  source?: string;
  instructions?: string;
  startPos: number;
  endPos: number;
}

interface TemplateEditorProps {
  initialContent?: string;
  blocks: TemplateBlock[];
  onBlocksChange: (blocks: TemplateBlock[]) => void;
  onContentChange: (content: string, html: string) => void;
  readOnly?: boolean;
}

export function TemplateEditor({
  initialContent = '',
  blocks,
  onBlocksChange,
  onContentChange,
  readOnly = false,
}: TemplateEditorProps) {
  const [markedBlocks, setMarkedBlocks] = useState<MarkedBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [variableConfig, setVariableConfig] = useState<{
    variableName: string;
    source: string;
  }>({ variableName: '', source: '' });
  const [dynamicConfig, setDynamicConfig] = useState<{
    instructions: string;
  }>({ instructions: '' });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: 'template-highlight',
        },
      }),
      Placeholder.configure({
        placeholder: 'Escribe el contenido de tu plantilla aquí...\n\nSelecciona texto y usa los botones "Fijo", "Variable" o "Dinámico" para marcar bloques.',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: initialContent,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      const html = editor.getHTML();
      onContentChange(text, html);
    },
  });

  // Sync blocks to parent when markedBlocks change
  useEffect(() => {
    const templateBlocks: TemplateBlock[] = markedBlocks.map((block, index) => ({
      id: block.id,
      type: block.type,
      content: block.content,
      order: index,
      variableName: block.variableName,
      source: block.source,
      instructions: block.instructions,
      required: block.type === 'variable',
      format: 'richtext' as const,
    }));
    onBlocksChange(templateBlocks);
  }, [markedBlocks, onBlocksChange]);

  const generateBlockId = useCallback(() => {
    return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const handleMarkAsStatic = useCallback(() => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);

    if (!selectedText.trim()) return;

    const newBlock: MarkedBlock = {
      id: generateBlockId(),
      type: 'static',
      content: selectedText,
      startPos: from,
      endPos: to,
    };

    // Apply highlight
    editor
      .chain()
      .focus()
      .setHighlight({ color: '#e0e7ff' }) // Light blue for static
      .run();

    setMarkedBlocks(prev => [...prev, newBlock]);
  }, [editor, generateBlockId]);

  const handleMarkAsVariable = useCallback(() => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);

    if (!selectedText.trim()) return;

    const newBlock: MarkedBlock = {
      id: generateBlockId(),
      type: 'variable',
      content: selectedText,
      startPos: from,
      endPos: to,
    };

    // Apply highlight
    editor
      .chain()
      .focus()
      .setHighlight({ color: '#fef3c7' }) // Light yellow for variable
      .run();

    setMarkedBlocks(prev => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
    setVariableConfig({ variableName: '', source: '' });
  }, [editor, generateBlockId]);

  const handleMarkAsDynamic = useCallback(() => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);

    if (!selectedText.trim()) return;

    const newBlock: MarkedBlock = {
      id: generateBlockId(),
      type: 'dynamic',
      content: selectedText,
      startPos: from,
      endPos: to,
    };

    // Apply highlight
    editor
      .chain()
      .focus()
      .setHighlight({ color: '#f3e8ff' }) // Light purple for dynamic
      .run();

    setMarkedBlocks(prev => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
    setDynamicConfig({ instructions: '' });
  }, [editor, generateBlockId]);

  const handleUpdateVariableConfig = useCallback((blockId: string) => {
    setMarkedBlocks(prev =>
      prev.map(block =>
        block.id === blockId
          ? {
              ...block,
              variableName: variableConfig.variableName,
              source: variableConfig.source,
            }
          : block
      )
    );
    setSelectedBlockId(null);
    setVariableConfig({ variableName: '', source: '' });
  }, [variableConfig]);

  const handleUpdateDynamicConfig = useCallback((blockId: string) => {
    setMarkedBlocks(prev =>
      prev.map(block =>
        block.id === blockId
          ? {
              ...block,
              instructions: dynamicConfig.instructions,
            }
          : block
      )
    );
    setSelectedBlockId(null);
    setDynamicConfig({ instructions: '' });
  }, [dynamicConfig]);

  const handleRemoveBlock = useCallback((blockId: string) => {
    setMarkedBlocks(prev => prev.filter(b => b.id !== blockId));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  }, [selectedBlockId]);

  const handleRemoveMark = useCallback(() => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    
    // Find blocks that overlap with the selection and remove them
    setMarkedBlocks(prev => {
      const overlapping = prev.filter(block => 
        (block.startPos <= to && block.endPos >= from)
      );
      
      if (overlapping.length > 0) {
        // Remove the highlight from editor
        editor.chain().focus().unsetHighlight().run();
        
        // Return blocks that don't overlap
        return prev.filter(block => 
          !(block.startPos <= to && block.endPos >= from)
        );
      }
      
      // If no block found but there's a highlight, just remove the highlight
      editor.chain().focus().unsetHighlight().run();
      return prev;
    });
    
    setSelectedBlockId(null);
  }, [editor, selectedBlockId]);

  const selectedBlock = markedBlocks.find(b => b.id === selectedBlockId);

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <BlockMarkerToolbar
        editor={editor}
        onMarkAsStatic={handleMarkAsStatic}
        onMarkAsVariable={handleMarkAsVariable}
        onMarkAsDynamic={handleMarkAsDynamic}
        onRemoveMark={handleRemoveMark}
      />

      {/* Marked blocks summary */}
      {markedBlocks.length > 0 && (
        <div className="border-b p-3 bg-muted/20">
          <div className="text-sm font-medium mb-2">Bloques marcados ({markedBlocks.length})</div>
          
          {/* Validation warnings */}
          {(() => {
            const incompleteBlocks = markedBlocks.filter(block => {
              if (block.type === 'variable' && (!block.source || !block.variableName)) return true;
              if (block.type === 'dynamic' && !block.instructions) return true;
              return false;
            });
            
            if (incompleteBlocks.length > 0) {
              return (
                <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>
                      {incompleteBlocks.length} bloque(s) sin configurar. Haz clic para completar la configuración.
                    </span>
                  </div>
                </div>
              );
            }
            return null;
          })()}
          
          <div className="flex flex-wrap gap-2">
            {markedBlocks.map((block) => {
              // Check if block is incomplete
              const isIncomplete = 
                (block.type === 'variable' && (!block.source || !block.variableName)) ||
                (block.type === 'dynamic' && !block.instructions);
              
              return (
                <div
                  key={block.id}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer transition-all ${
                    block.type === 'static'
                      ? 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700'
                      : block.type === 'dynamic'
                      ? 'bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700'
                      : 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700'
                  } ${selectedBlockId === block.id ? 'ring-2 ring-primary' : ''} ${isIncomplete ? 'ring-2 ring-destructive animate-pulse' : ''}`}
                  onClick={() => {
                    if (block.type === 'variable') {
                      setSelectedBlockId(block.id);
                      setVariableConfig({
                        variableName: block.variableName || '',
                        source: block.source || '',
                      });
                    } else if (block.type === 'dynamic') {
                      setSelectedBlockId(block.id);
                      setDynamicConfig({
                        instructions: block.instructions || '',
                      });
                    }
                  }}
                >
                  {block.type === 'static' ? (
                    <Lock className="h-3 w-3" />
                  ) : block.type === 'dynamic' ? (
                    <Sparkles className="h-3 w-3" />
                  ) : (
                    <Variable className="h-3 w-3" />
                  )}
                  <span className="max-w-[100px] truncate">
                    {block.content.substring(0, 20)}...
                  </span>
                  {block.type === 'variable' && block.variableName && (
                    <span className="text-muted-foreground">
                      ({block.variableName})
                    </span>
                  )}
                  {block.type === 'dynamic' && block.instructions && (
                    <span className="text-purple-600 dark:text-purple-400">
                      ✓
                    </span>
                  )}
                  {isIncomplete && (
                    <AlertTriangle className="h-3 w-3 text-destructive" />
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveBlock(block.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Variable configuration panel */}
      {selectedBlock && selectedBlock.type === 'variable' && (
        <div className="border-b p-4 bg-amber-50/50">
          <div className="text-sm font-medium mb-3 flex items-center gap-2">
            <Variable className="h-4 w-4" />
            Configurar Variable
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="variableName">Nombre de la variable</Label>
              <Input
                id="variableName"
                value={variableConfig.variableName}
                onChange={(e) =>
                  setVariableConfig((prev) => ({
                    ...prev,
                    variableName: e.target.value.replace(/\s/g, '_').toLowerCase(),
                  }))
                }
                placeholder="ej: nombre_cliente"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Fuente de datos</Label>
              <Select
                value={variableConfig.source}
                onValueChange={(value) =>
                  setVariableConfig((prev) => ({ ...prev, source: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar fuente..." />
                </SelectTrigger>
                <SelectContent>
                  {VARIABLE_SOURCES.map((source) => (
                    <SelectItem key={source.value} value={source.value}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedBlockId(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleUpdateVariableConfig(selectedBlock.id)}
              disabled={!variableConfig.variableName || !variableConfig.source}
            >
              Guardar configuración
            </Button>
          </div>
        </div>
      )}

      {/* Dynamic configuration panel */}
      {selectedBlock && selectedBlock.type === 'dynamic' && (
        <div className="border-b p-4 bg-purple-50/50">
          <div className="text-sm font-medium mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            Configurar Bloque Dinámico (IA)
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="instructions">Instrucciones para la IA</Label>
              <Textarea
                id="instructions"
                value={dynamicConfig.instructions}
                onChange={(e) =>
                  setDynamicConfig((prev) => ({
                    ...prev,
                    instructions: e.target.value,
                  }))
                }
                placeholder="Ej: Redacta los antecedentes del caso basándote en la información del cliente, su industria y los servicios solicitados. Incluye contexto sobre necesidades específicas y situación actual."
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                La IA usará estas instrucciones junto con el contexto del caso (cliente, servicios, notas) para generar contenido personalizado al compilar la propuesta.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedBlockId(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleUpdateDynamicConfig(selectedBlock.id)}
              disabled={!dynamicConfig.instructions.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Guardar instrucciones
            </Button>
          </div>
        </div>
      )}

      {/* Editor content */}
      <div className="p-4 min-h-[400px] prose prose-sm max-w-none">
        <EditorContent editor={editor} className="outline-none" />
      </div>

      {/* Styles for highlights */}
      <style>{`
        .template-highlight[data-color="#e0e7ff"] {
          background-color: #e0e7ff;
          border-left: 3px solid #6366f1;
          padding: 2px 4px;
        }
        .template-highlight[data-color="#fef3c7"] {
          background-color: #fef3c7;
          border-left: 3px solid #f59e0b;
          padding: 2px 4px;
        }
        .template-highlight[data-color="#f3e8ff"] {
          background-color: #f3e8ff;
          border-left: 3px solid #a855f7;
          padding: 2px 4px;
        }
        .ProseMirror {
          outline: none;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
          white-space: pre-wrap;
        }
      `}</style>
    </div>
  );
}
