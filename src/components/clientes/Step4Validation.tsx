import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EntityFormData, DocumentData, DOCUMENT_TYPES } from "./types";
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Eye, 
  RotateCcw, 
  Check,
  FileSearch
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Step4ValidationProps {
  entities: EntityFormData[];
  documents: Record<string, DocumentData[]>;
  onChange: (documents: Record<string, DocumentData[]>) => void;
}

type ValidationStatus = "validado" | "requiere_revision" | "pendiente";

export function Step4Validation({ entities, documents, onChange }: Step4ValidationProps) {
  const [activeTab, setActiveTab] = useState(entities[0]?.id || "0");
  const [previewDoc, setPreviewDoc] = useState<DocumentData | null>(null);

  const getDocumentStatus = (entityId: string, docType: string): ValidationStatus => {
    const doc = (documents[entityId] || []).find((d) => d.document_type === docType);
    if (!doc || doc.status === "pendiente") return "pendiente";
    if (doc.status === "validado") return "validado";
    return "requiere_revision";
  };

  const getDocumentForType = (entityId: string, docType: string): DocumentData | undefined => {
    return (documents[entityId] || []).find((d) => d.document_type === docType);
  };

  const getStatusIcon = (status: ValidationStatus) => {
    switch (status) {
      case "validado":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "requiere_revision":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEntityStats = (entityId: string) => {
    const entityDocs = documents[entityId] || [];
    return {
      total: 4,
      subidos: entityDocs.filter((d) => d.status !== "pendiente").length,
      validados: entityDocs.filter((d) => d.status === "validado").length,
    };
  };

  const markAsValidated = (entityId: string, docType: string) => {
    const entityDocs = documents[entityId] || [];
    const updatedDocs = entityDocs.map((d) =>
      d.document_type === docType ? { ...d, status: "validado" as const } : d
    );
    onChange({ ...documents, [entityId]: updatedDocs });
  };

  return (
    <div className="space-y-6">
      {/* Validation Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5" />
            Matriz de Validación
          </CardTitle>
          <CardDescription>
            Resumen del estado de documentos por razón social
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">Razón Social</th>
                  {DOCUMENT_TYPES.map((dt) => (
                    <th key={dt.id} className="text-center py-2 px-2 min-w-[60px]">
                      <span className="text-xs">{dt.name.split(" ")[0]}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entities.map((entity) => (
                  <tr key={entity.id} className="border-b">
                    <td className="py-2 pr-4 font-medium">
                      {entity.legal_name || "Sin nombre"}
                    </td>
                    {DOCUMENT_TYPES.map((dt) => {
                      const status = getDocumentStatus(entity.id || "", dt.id);
                      return (
                        <td key={dt.id} className="text-center py-2 px-2">
                          {getStatusIcon(status)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" /> Validado
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-yellow-500" /> Requiere revisión
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" /> Pendiente
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Detailed validation by entity */}
      <Card>
        <CardHeader>
          <CardTitle>Validación Detallada</CardTitle>
          <CardDescription>
            Revisa y valida cada documento por empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full flex-wrap h-auto gap-2 bg-transparent justify-start">
              {entities.map((entity) => {
                const stats = getEntityStats(entity.id || "");
                return (
                  <TabsTrigger
                    key={entity.id}
                    value={entity.id || ""}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {entity.legal_name?.split(" ")[0] || "Sin nombre"}
                    <Badge
                      variant={stats.validados === stats.subidos && stats.subidos > 0 ? "default" : "secondary"}
                      className="ml-2"
                    >
                      {stats.validados}/{stats.subidos}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {entities.map((entity) => (
              <TabsContent key={entity.id} value={entity.id || ""} className="mt-6">
                <div className="space-y-4">
                  {DOCUMENT_TYPES.map((docType) => {
                    const doc = getDocumentForType(entity.id || "", docType.id);
                    const status = getDocumentStatus(entity.id || "", docType.id);
                    const hasDoc = doc && doc.status !== "pendiente";

                    return (
                      <div
                        key={docType.id}
                        className={cn(
                          "p-4 border rounded-lg",
                          status === "validado" && "border-green-500/50 bg-green-50/50 dark:bg-green-950/20",
                          status === "requiere_revision" && "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20",
                          status === "pendiente" && "border-muted"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(status)}
                            <div>
                              <p className="font-medium">{docType.name}</p>
                              {hasDoc && doc?.file_name && (
                                <p className="text-xs text-muted-foreground">
                                  📎 {doc.file_name}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {hasDoc && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPreviewDoc(doc)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver
                                </Button>
                                {status !== "validado" && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => markAsValidated(entity.id || "", docType.id)}
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Validar
                                  </Button>
                                )}
                              </>
                            )}
                            {!hasDoc && (
                              <Badge variant="outline">Sin documento</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {previewDoc?.file_name || "Vista previa del documento"}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {previewDoc?.file_url && (
              <iframe
                src={previewDoc.file_url}
                className="w-full h-[500px] border rounded"
                title="Document preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
