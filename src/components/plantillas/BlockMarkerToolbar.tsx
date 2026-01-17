import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Lock, Variable, Bold, Italic, List, AlignLeft, AlignCenter, Heading1, Heading2 } from "lucide-react";
import type { Editor } from "@tiptap/react";

interface BlockMarkerToolbarProps {
  editor: Editor | null;
  onMarkAsStatic: () => void;
  onMarkAsVariable: () => void;
}

export function BlockMarkerToolbar({ 
  editor, 
  onMarkAsStatic, 
  onMarkAsVariable 
}: BlockMarkerToolbarProps) {
  if (!editor) return null;

  const hasSelection = !editor.state.selection.empty;

  return (
    <div className="flex items-center gap-1 p-2 border-b bg-muted/30 flex-wrap">
      {/* Block Type Markers */}
      <div className="flex items-center gap-1 border-r pr-2 mr-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onMarkAsStatic}
              disabled={!hasSelection}
              className="gap-1"
            >
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Fijo</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Marcar como texto fijo (no cambia entre propuestas)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onMarkAsVariable}
              disabled={!hasSelection}
              className="gap-1"
            >
              <Variable className="h-4 w-4" />
              <span className="hidden sm:inline">Variable</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Marcar como variable (se llena con datos del sistema)</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Text Formatting */}
      <div className="flex items-center gap-1 border-r pr-2 mr-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive('bold') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Negritas</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive('italic') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Cursiva</TooltipContent>
        </Tooltip>
      </div>

      {/* Headings */}
      <div className="flex items-center gap-1 border-r pr-2 mr-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            >
              <Heading1 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Título 1</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Título 2</TooltipContent>
        </Tooltip>
      </div>

      {/* Lists and Alignment */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Lista</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Alinear izquierda</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Centrar</TooltipContent>
        </Tooltip>
      </div>

      {/* Info about dynamic blocks */}
      <div className="ml-auto text-xs text-muted-foreground hidden lg:block">
        💡 Los bloques "Dinámicos" estarán disponibles en una versión futura
      </div>
    </div>
  );
}
