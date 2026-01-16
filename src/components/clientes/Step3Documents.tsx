import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EntityFormData, DocumentData, DOCUMENT_TYPES } from "./types";
import { FileText, Upload, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Step3DocumentsProps {
  entities: EntityFormData[];
  documents: Record<string, DocumentData[]>;
  onChange: (documents: Record<string, DocumentData[]>) => void;
}

export function Step3Documents({ entities, documents, onChange }: Step3DocumentsProps) {
  const [activeTab, setActiveTab] = useState(entities[0]?.id || "0");
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getDocumentCount = (entityId: string) => {
    const entityDocs = documents[entityId] || [];
    return entityDocs.filter((d) => d.status === "subido").length;
  };

  const getDocumentForType = (entityId: string, docType: string): DocumentData | undefined => {
    return (documents[entityId] || []).find((d) => d.document_type === docType);
  };

  const handleFileSelect = async (
    entityId: string,
    docType: string,
    file: File
  ) => {
    const key = `${entityId}-${docType}`;
    setUploading(key);

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${entityId}/${docType}-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from("client-documents")
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("client-documents")
        .getPublicUrl(fileName);

      // Update document state
      const entityDocs = documents[entityId] || [];
      const existingIndex = entityDocs.findIndex(
        (d) => d.document_type === docType
      );

      const newDoc: DocumentData = {
        entity_id: entityId,
        document_type: docType as DocumentData["document_type"],
        file_url: urlData.publicUrl,
        file_name: file.name,
        status: "subido",
        notes: null,
      };

      let updatedDocs: DocumentData[];
      if (existingIndex >= 0) {
        updatedDocs = entityDocs.map((d, i) =>
          i === existingIndex ? newDoc : d
        );
      } else {
        updatedDocs = [...entityDocs, newDoc];
      }

      onChange({ ...documents, [entityId]: updatedDocs });
      toast.success(`${file.name} subido correctamente`);
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Error al subir el archivo");
    } finally {
      setUploading(null);
    }
  };

  const removeDocument = (entityId: string, docType: string) => {
    const entityDocs = documents[entityId] || [];
    const updatedDocs = entityDocs.filter((d) => d.document_type !== docType);
    onChange({ ...documents, [entityId]: updatedDocs });
    toast.success("Documento eliminado");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Subir Documentos (Opcional)
          </CardTitle>
          <CardDescription>
            Sube los documentos fiscales de cada razón social. Este paso es opcional,
            puedes continuar sin documentos y agregarlos después.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full flex-wrap h-auto gap-2 bg-transparent justify-start">
              {entities.map((entity) => (
                <TabsTrigger
                  key={entity.id}
                  value={entity.id || ""}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {entity.legal_name || "Sin nombre"}
                  <Badge
                    variant="secondary"
                    className="ml-2"
                  >
                    {getDocumentCount(entity.id || "")}/4
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {entities.map((entity) => (
              <TabsContent key={entity.id} value={entity.id || ""} className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {DOCUMENT_TYPES.map((docType) => {
                    const doc = getDocumentForType(entity.id || "", docType.id);
                    const isUploading = uploading === `${entity.id}-${docType.id}`;
                    const hasFile = doc?.status === "subido";

                    return (
                      <div
                        key={docType.id}
                        className={cn(
                          "p-4 border-2 border-dashed rounded-lg transition-colors cursor-pointer",
                          hasFile
                            ? "border-primary bg-primary/5"
                            : "border-muted-foreground/25 hover:border-primary/50"
                        )}
                        onClick={() => {
                          if (!hasFile && !isUploading) {
                            fileInputRefs.current[`${entity.id}-${docType.id}`]?.click();
                          }
                        }}
                      >
                        <input
                          ref={(el) => {
                            fileInputRefs.current[`${entity.id}-${docType.id}`] = el;
                          }}
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileSelect(entity.id || "", docType.id, file);
                            }
                          }}
                        />

                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center",
                                hasFile ? "bg-primary" : "bg-muted"
                              )}
                            >
                              {isUploading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-foreground border-t-transparent" />
                              ) : hasFile ? (
                                <Check className="h-5 w-5 text-primary-foreground" />
                              ) : (
                                <Upload className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{docType.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {docType.description}
                              </p>
                            </div>
                          </div>
                          {hasFile && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeDocument(entity.id || "", docType.id);
                              }}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {hasFile && doc?.file_name && (
                          <p className="mt-2 text-xs text-muted-foreground truncate">
                            📎 {doc.file_name}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
        <p className="font-medium">💡 Tip:</p>
        <p>
          Puedes continuar sin subir documentos ahora. El cliente quedará con
          estado "Incompleto" y podrás agregar documentos posteriormente desde
          el expediente del cliente.
        </p>
      </div>
    </div>
  );
}
