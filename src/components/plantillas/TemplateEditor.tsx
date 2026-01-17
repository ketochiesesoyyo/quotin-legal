import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { BlockMarkerToolbar } from './BlockMarkerToolbar';
import type { TemplateBlock, BlockType } from './types';
import { useState, useCallback, useEffect } from 'react';
import { Lock, Variable, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
        placeholder: 'Escribe el contenido de tu plantilla aquí...\n\nSelecciona texto y usa los botones "Fijo" o "Variable" para marcar bloques.',
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

  const handleRemoveBlock = useCallback((blockId: string) => {
    setMarkedBlocks(prev => prev.filter(b => b.id !== blockId));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  }, [selectedBlockId]);

  const selectedBlock = markedBlocks.find(b => b.id === selectedBlockId);

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <BlockMarkerToolbar
        editor={editor}
        onMarkAsStatic={handleMarkAsStatic}
        onMarkAsVariable={handleMarkAsVariable}
      />

      {/* Marked blocks summary */}
      {markedBlocks.length > 0 && (
        <div className="border-b p-3 bg-muted/20">
          <div className="text-sm font-medium mb-2">Bloques marcados ({markedBlocks.length})</div>
          <div className="flex flex-wrap gap-2">
            {markedBlocks.map((block) => (
              <div
                key={block.id}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer transition-all ${
                  block.type === 'static'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                } ${selectedBlockId === block.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => {
                  if (block.type === 'variable') {
                    setSelectedBlockId(block.id);
                    setVariableConfig({
                      variableName: block.variableName || '',
                      source: block.source || '',
                    });
                  }
                }}
              >
                {block.type === 'static' ? (
                  <Lock className="h-3 w-3" />
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
            ))}
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
