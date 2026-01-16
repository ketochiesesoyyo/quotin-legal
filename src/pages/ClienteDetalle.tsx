import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowLeft, 
  Building2, 
  User, 
  FileText, 
  Pencil, 
  Phone, 
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock,
  Upload,
  Eye,
  Plus,
  Trash2,
  Building
} from "lucide-react";
import { DOCUMENT_TYPES } from "@/components/clientes/types";
import { toast } from "sonner";
import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ClienteDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Fetch client data
  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch contacts
  const { data: contacts } = useQuery({
    queryKey: ["client_contacts", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", id)
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch entities
  const { data: entities } = useQuery({
    queryKey: ["client_entities", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_entities")
        .select("*")
        .eq("client_id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch documents for all entities
  const { data: documents } = useQuery({
    queryKey: ["client_documents", id],
    queryFn: async () => {
      if (!entities || entities.length === 0) return [];
      const entityIds = entities.map((e) => e.id);
      const { data, error } = await supabase
        .from("client_documents")
        .select("*")
        .in("entity_id", entityIds);
      if (error) throw error;
      return data;
    },
    enabled: !!entities && entities.length > 0,
  });

  const handleFileUpload = async (entityId: string, docType: string, file: File) => {
    const key = `${entityId}-${docType}`;
    setUploading(key);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${entityId}/${docType}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("client-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("client-documents")
        .getPublicUrl(fileName);

      // Check if document already exists
      const existingDoc = documents?.find(
        (d) => d.entity_id === entityId && d.document_type === docType
      );

      if (existingDoc) {
        await supabase
          .from("client_documents")
          .update({
            file_url: urlData.publicUrl,
            file_name: file.name,
            status: "subido",
            uploaded_at: new Date().toISOString(),
          })
          .eq("id", existingDoc.id);
      } else {
        await supabase.from("client_documents").insert({
          entity_id: entityId,
          document_type: docType,
          file_url: urlData.publicUrl,
          file_name: file.name,
          status: "subido",
          uploaded_at: new Date().toISOString(),
        });
      }

      queryClient.invalidateQueries({ queryKey: ["client_documents", id] });
      toast.success(`${file.name} subido correctamente`);
    } catch (error) {
      console.error("Error uploading:", error);
      toast.error("Error al subir el archivo");
    } finally {
      setUploading(null);
    }
  };

  const getDocumentForEntity = (entityId: string, docType: string) => {
    return documents?.find(
      (d) => d.entity_id === entityId && d.document_type === docType
    );
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "validado":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "subido":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const primaryContact = contacts?.find((c) => c.is_primary) || contacts?.[0];

  if (clientLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/clientes")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Clientes
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Cliente no encontrado</h3>
            <p className="text-muted-foreground">
              El cliente que buscas no existe o fue eliminado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isComplete = client.status === "completo";
  const totalDocs = documents?.length || 0;
  const validatedDocs = documents?.filter((d) => d.status === "validado").length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clientes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{client.group_name}</h1>
              {isComplete ? (
                <Badge className="bg-green-500/10 text-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Completo
                </Badge>
              ) : (
                <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Incompleto
                </Badge>
              )}
            </div>
            {client.alias && (
              <p className="text-muted-foreground">{client.alias}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/clientes/${id}/editar`)}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button onClick={() => navigate("/propuestas", { state: { clientId: id } })}>
            <FileText className="h-4 w-4 mr-2" />
            Crear Propuesta
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{entities?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Razones Sociales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contacts?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Contactos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalDocs}</p>
                <p className="text-sm text-muted-foreground">Documentos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{validatedDocs}</p>
                <p className="text-sm text-muted-foreground">Validados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Información General</TabsTrigger>
          <TabsTrigger value="entities">Razones Sociales</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="contacts">Contactos</TabsTrigger>
        </TabsList>

        {/* General Info Tab */}
        <TabsContent value="info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Datos del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nombre del Grupo</p>
                    <p className="font-medium">{client.group_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Alias</p>
                    <p className="font-medium">{client.alias || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Industria</p>
                    <p className="font-medium">{client.industry || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ingresos Anuales</p>
                    <p className="font-medium">{client.annual_revenue || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Empleados</p>
                    <p className="font-medium">{client.employee_count || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estado</p>
                    <p className="font-medium">{client.status || "incompleto"}</p>
                  </div>
                </div>
                {client.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Observaciones</p>
                    <p className="text-sm mt-1">{client.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contacto Principal
                </CardTitle>
              </CardHeader>
              <CardContent>
                {primaryContact ? (
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium text-lg">{primaryContact.full_name}</p>
                      {primaryContact.position && (
                        <p className="text-muted-foreground">{primaryContact.position}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      {primaryContact.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a href={`mailto:${primaryContact.email}`} className="hover:underline">
                            {primaryContact.email}
                          </a>
                        </div>
                      )}
                      {primaryContact.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a href={`tel:${primaryContact.phone}`} className="hover:underline">
                            {primaryContact.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Sin contacto principal</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Entities Tab */}
        <TabsContent value="entities">
          <Card>
            <CardHeader>
              <CardTitle>Razones Sociales</CardTitle>
              <CardDescription>
                Empresas asociadas a este grupo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {entities && entities.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Razón Social</TableHead>
                      <TableHead>RFC</TableHead>
                      <TableHead className="text-center">Documentos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entities.map((entity) => {
                      const entityDocs = documents?.filter((d) => d.entity_id === entity.id) || [];
                      return (
                        <TableRow key={entity.id}>
                          <TableCell className="font-medium">{entity.legal_name}</TableCell>
                          <TableCell className="font-mono">{entity.rfc}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">
                              {entityDocs.length}/4
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No hay razones sociales registradas
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documentos por Razón Social</CardTitle>
              <CardDescription>
                Gestiona los documentos fiscales de cada empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              {entities && entities.length > 0 ? (
                <div className="space-y-6">
                  {entities.map((entity) => (
                    <div key={entity.id} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-4">{entity.legal_name}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {DOCUMENT_TYPES.map((docType) => {
                          const doc = getDocumentForEntity(entity.id, docType.id);
                          const isUploading = uploading === `${entity.id}-${docType.id}`;

                          return (
                            <div
                              key={docType.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                {getStatusIcon(doc?.status)}
                                <div>
                                  <p className="text-sm font-medium">{docType.name}</p>
                                  {doc?.file_name && (
                                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                      {doc.file_name}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {doc?.file_url && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setPreviewUrl(doc.file_url)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
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
                                      handleFileUpload(entity.id, docType.id, file);
                                    }
                                  }}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isUploading}
                                  onClick={() => {
                                    fileInputRefs.current[`${entity.id}-${docType.id}`]?.click();
                                  }}
                                >
                                  {isUploading ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                                  ) : (
                                    <Upload className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Primero agrega razones sociales para subir documentos
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle>Contactos</CardTitle>
              <CardDescription>
                Personas de contacto asociadas a este cliente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contacts && contacts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{contact.full_name}</span>
                            {contact.is_primary && (
                              <Badge variant="secondary" className="text-xs">Principal</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{contact.position || "-"}</TableCell>
                        <TableCell>{contact.email || "-"}</TableCell>
                        <TableCell>{contact.phone || "-"}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No hay contactos registrados
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Vista previa del documento</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {previewUrl && (
              <iframe
                src={previewUrl}
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
