import { useState, useCallback } from "react";
import { Upload, FileText, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DOCX_LIMITATIONS } from "./types";
import { useToast } from "@/hooks/use-toast";

interface FileUploaderProps {
  onFileLoaded: (content: string, fileName: string) => void;
  disabled?: boolean;
}

export function FileUploader({ onFileLoaded, disabled = false }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = useCallback(async (file: File) => {
    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.docx') && !file.name.endsWith('.doc')) {
      toast({
        title: "Formato no soportado",
        description: "Solo se aceptan archivos DOCX (.docx)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "Archivo muy grande",
        description: "El archivo no debe exceder 20MB",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
    setShowWarning(true);

    // For now, we'll read the file as text
    // In a real implementation, we'd send this to an edge function for parsing
    try {
      // Simulate text extraction (in production, this would be an edge function)
      const reader = new FileReader();
      reader.onload = (e) => {
        // For demo purposes, show a placeholder
        // Real implementation would parse DOCX and extract structured content
        const placeholder = `[Contenido extraído de: ${file.name}]\n\nNota: El procesamiento completo de DOCX se realizará en el servidor.\n\nPor favor, continúa con el editor manual para marcar los bloques.`;
        onFileLoaded(placeholder, file.name);
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      toast({
        title: "Error al procesar archivo",
        description: "No se pudo leer el archivo. Intenta de nuevo.",
        variant: "destructive",
      });
    }
  }, [onFileLoaded, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleRemoveFile = useCallback(() => {
    setUploadedFile(null);
    setShowWarning(false);
  }, []);

  return (
    <div className="space-y-4">
      {/* DOCX Limitations Warning */}
      <Alert variant="default" className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">Limitaciones de DOCX</AlertTitle>
        <AlertDescription className="text-amber-700">
          <div className="mt-2">
            <p className="font-medium">Soportado:</p>
            <p className="text-sm">{DOCX_LIMITATIONS.supported.join(', ')}</p>
            <p className="font-medium mt-2">No soportado (se convertirá a texto plano):</p>
            <p className="text-sm">{DOCX_LIMITATIONS.notSupported.join(', ')}</p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all
          ${isDragging 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {uploadedFile ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div className="text-left">
              <p className="font-medium">{uploadedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(uploadedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleRemoveFile}
              className="ml-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-1">
              Arrastra tu archivo DOCX aquí
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              o haz clic para seleccionar
            </p>
            <input
              type="file"
              accept=".docx,.doc"
              onChange={handleFileSelect}
              disabled={disabled}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </>
        )}
      </div>

      {/* Warning about review requirement */}
      {showWarning && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Revisión obligatoria</AlertTitle>
          <AlertDescription>
            Los archivos cargados requieren revisión manual obligatoria antes de poder activarse.
            Asegúrate de verificar que el contenido se extrajo correctamente.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
