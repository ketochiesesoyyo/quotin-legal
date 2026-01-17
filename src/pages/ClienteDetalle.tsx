import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Building,
  Save,
  X
} from "lucide-react";
import { DOCUMENT_TYPES } from "@/components/clientes/types";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Types for form state
interface ClientFormData {
  group_name: string;
  alias: string;
  industry: string;
  annual_revenue: string;
  employee_count: number | null;
  notes: string;
}

interface ContactFormData {
  id?: string;
  full_name: string;
  position: string;
  email: string;
  phone: string;
  is_primary: boolean;
}

interface EntityFormData {
  id: string;
  legal_name: string;
  rfc: string;
  isNew?: boolean;
}

const INDUSTRIES = [
  "Tecnología",
  "Manufactura",
  "Comercio",
  "Servicios",
  "Construcción",
  "Salud",
  "Educación",
  "Finanzas",
  "Agricultura",
  "Otro",
];

const REVENUE_OPTIONS = [
  "< 1M MXN",
  "1-10M MXN",
  "10-50M MXN",
  "50-100M MXN",
  "> 100M MXN",
];

export default function ClienteDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [clientForm, setClientForm] = useState<ClientFormData>({
    group_name: "",
    alias: "",
    industry: "",
    annual_revenue: "",
    employee_count: null,
    notes: "",
  });
  const [contactsForm, setContactsForm] = useState<ContactFormData[]>([]);
  const [entitiesForm, setEntitiesForm] = useState<EntityFormData[]>([]);

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

  // Initialize form data when entering edit mode
  useEffect(() => {
    if (isEditing && client) {
      setClientForm({
        group_name: client.group_name || "",
        alias: client.alias || "",
        industry: client.industry || "",
        annual_revenue: client.annual_revenue || "",
        employee_count: client.employee_count,
        notes: client.notes || "",
      });
    }
  }, [isEditing, client]);

  useEffect(() => {
    if (isEditing && contacts) {
      setContactsForm(
        contacts.map((c) => ({
          id: c.id,
          full_name: c.full_name,
          position: c.position || "",
          email: c.email || "",
          phone: c.phone || "",
          is_primary: c.is_primary || false,
        }))
      );
    }
  }, [isEditing, contacts]);

  useEffect(() => {
    if (isEditing && entities) {
      setEntitiesForm(
        entities.map((e) => ({
          id: e.id,
          legal_name: e.legal_name,
          rfc: e.rfc || "",
        }))
      );
    }
  }, [isEditing, entities]);

  // Save mutations
  const saveClientMutation = useMutation({
    mutationFn: async () => {
      // Update client
      const { error: clientError } = await supabase
        .from("clients")
        .update({
          group_name: clientForm.group_name,
          alias: clientForm.alias || null,
          industry: clientForm.industry || null,
          annual_revenue: clientForm.annual_revenue || null,
          employee_count: clientForm.employee_count,
          notes: clientForm.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (clientError) throw clientError;

      // Update contacts - delete removed, update existing, insert new
      const existingContactIds = contacts?.map((c) => c.id) || [];
      const formContactIds = contactsForm.filter((c) => c.id).map((c) => c.id!);
      const toDelete = existingContactIds.filter((id) => !formContactIds.includes(id));

      if (toDelete.length > 0) {
        const { error } = await supabase
          .from("client_contacts")
          .delete()
          .in("id", toDelete);
        if (error) throw error;
      }

      for (const contact of contactsForm) {
        if (contact.id) {
          // Update existing
          const { error } = await supabase
            .from("client_contacts")
            .update({
              full_name: contact.full_name,
              position: contact.position || null,
              email: contact.email || null,
              phone: contact.phone || null,
              is_primary: contact.is_primary,
              updated_at: new Date().toISOString(),
            })
            .eq("id", contact.id);
          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase.from("client_contacts").insert({
            client_id: id,
            full_name: contact.full_name,
            position: contact.position || null,
            email: contact.email || null,
            phone: contact.phone || null,
            is_primary: contact.is_primary,
          });
          if (error) throw error;
        }
      }

      // Update entities - delete removed, update existing, insert new
      const existingEntityIds = entities?.map((e) => e.id) || [];
      const formEntityIds = entitiesForm.filter((e) => !e.isNew).map((e) => e.id);
      const entitiesToDelete = existingEntityIds.filter((id) => !formEntityIds.includes(id));

      if (entitiesToDelete.length > 0) {
        // First delete documents for these entities
        const { error: docError } = await supabase
          .from("client_documents")
          .delete()
          .in("entity_id", entitiesToDelete);
        if (docError) throw docError;

        const { error } = await supabase
          .from("client_entities")
          .delete()
          .in("id", entitiesToDelete);
        if (error) throw error;
      }

      for (const entity of entitiesForm) {
        if (entity.isNew) {
          // Insert new
          const { error } = await supabase.from("client_entities").insert({
            client_id: id,
            legal_name: entity.legal_name,
            rfc: entity.rfc || null,
          });
          if (error) throw error;
        } else {
          // Update existing
          const { error } = await supabase
            .from("client_entities")
            .update({
              legal_name: entity.legal_name,
              rfc: entity.rfc || null,
            })
            .eq("id", entity.id);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client", id] });
      queryClient.invalidateQueries({ queryKey: ["client_contacts", id] });
      queryClient.invalidateQueries({ queryKey: ["client_entities", id] });
      queryClient.invalidateQueries({ queryKey: ["client_documents", id] });
      setIsEditing(false);
      toast.success("Cambios guardados correctamente");
    },
    onError: (error) => {
      console.error("Error saving:", error);
      toast.error("Error al guardar los cambios");
    },
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

  // Form handlers
  const handleAddContact = () => {
    setContactsForm([
      ...contactsForm,
      {
        full_name: "",
        position: "",
        email: "",
        phone: "",
        is_primary: contactsForm.length === 0,
      },
    ]);
  };

  const handleRemoveContact = (index: number) => {
    const newContacts = contactsForm.filter((_, i) => i !== index);
    // If removed contact was primary, make first one primary
    if (contactsForm[index].is_primary && newContacts.length > 0) {
      newContacts[0].is_primary = true;
    }
    setContactsForm(newContacts);
  };

  const handleSetPrimaryContact = (index: number) => {
    setContactsForm(
      contactsForm.map((c, i) => ({
        ...c,
        is_primary: i === index,
      }))
    );
  };

  const handleAddEntity = () => {
    setEntitiesForm([
      ...entitiesForm,
      {
        id: crypto.randomUUID(),
        legal_name: "",
        rfc: "",
        isNew: true,
      },
    ]);
  };

  const handleRemoveEntity = (index: number) => {
    setEntitiesForm(entitiesForm.filter((_, i) => i !== index));
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset forms
    if (client) {
      setClientForm({
        group_name: client.group_name || "",
        alias: client.alias || "",
        industry: client.industry || "",
        annual_revenue: client.annual_revenue || "",
        employee_count: client.employee_count,
        notes: client.notes || "",
      });
    }
    if (contacts) {
      setContactsForm(
        contacts.map((c) => ({
          id: c.id,
          full_name: c.full_name,
          position: c.position || "",
          email: c.email || "",
          phone: c.phone || "",
          is_primary: c.is_primary || false,
        }))
      );
    }
    if (entities) {
      setEntitiesForm(
        entities.map((e) => ({
          id: e.id,
          legal_name: e.legal_name,
          rfc: e.rfc || "",
        }))
      );
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
              {isEditing && (
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  <Pencil className="h-3 w-3 mr-1" />
                  Editando
                </Badge>
              )}
            </div>
            {client.alias && (
              <p className="text-muted-foreground">{client.alias}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancelEdit}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button 
                onClick={() => saveClientMutation.mutate()}
                disabled={saveClientMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {saveClientMutation.isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button onClick={() => navigate("/propuestas", { state: { clientId: id } })}>
                <FileText className="h-4 w-4 mr-2" />
                Crear Propuesta
              </Button>
            </>
          )}
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
                <p className="text-2xl font-bold">{isEditing ? entitiesForm.length : (entities?.length || 0)}</p>
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
                <p className="text-2xl font-bold">{isEditing ? contactsForm.length : (contacts?.length || 0)}</p>
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
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nombre del Grupo *</Label>
                        <Input
                          value={clientForm.group_name}
                          onChange={(e) => setClientForm({ ...clientForm, group_name: e.target.value })}
                          placeholder="Nombre del grupo empresarial"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Alias</Label>
                        <Input
                          value={clientForm.alias}
                          onChange={(e) => setClientForm({ ...clientForm, alias: e.target.value })}
                          placeholder="Nombre corto o alias"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Industria</Label>
                        <Select
                          value={clientForm.industry}
                          onValueChange={(value) => setClientForm({ ...clientForm, industry: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar industria" />
                          </SelectTrigger>
                          <SelectContent>
                            {INDUSTRIES.map((ind) => (
                              <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Ingresos Anuales</Label>
                        <Select
                          value={clientForm.annual_revenue}
                          onValueChange={(value) => setClientForm({ ...clientForm, annual_revenue: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar rango" />
                          </SelectTrigger>
                          <SelectContent>
                            {REVENUE_OPTIONS.map((rev) => (
                              <SelectItem key={rev} value={rev}>{rev}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Empleados</Label>
                        <Input
                          type="number"
                          value={clientForm.employee_count || ""}
                          onChange={(e) => setClientForm({ ...clientForm, employee_count: e.target.value ? parseInt(e.target.value) : null })}
                          placeholder="Número de empleados"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Observaciones</Label>
                      <Textarea
                        value={clientForm.notes}
                        onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                        placeholder="Notas adicionales sobre el cliente"
                        rows={3}
                      />
                    </div>
                  </div>
                ) : (
                  <>
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
                  </>
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
                {isEditing ? (
                  <div className="space-y-4">
                    {contactsForm.filter(c => c.is_primary).map((contact, idx) => {
                      const realIndex = contactsForm.findIndex(c => c === contact);
                      return (
                        <div key={idx} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Nombre completo *</Label>
                              <Input
                                value={contact.full_name}
                                onChange={(e) => {
                                  const updated = [...contactsForm];
                                  updated[realIndex].full_name = e.target.value;
                                  setContactsForm(updated);
                                }}
                                placeholder="Nombre del contacto"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Cargo</Label>
                              <Input
                                value={contact.position}
                                onChange={(e) => {
                                  const updated = [...contactsForm];
                                  updated[realIndex].position = e.target.value;
                                  setContactsForm(updated);
                                }}
                                placeholder="Cargo o puesto"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Email</Label>
                              <Input
                                type="email"
                                value={contact.email}
                                onChange={(e) => {
                                  const updated = [...contactsForm];
                                  updated[realIndex].email = e.target.value;
                                  setContactsForm(updated);
                                }}
                                placeholder="correo@ejemplo.com"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Teléfono</Label>
                              <Input
                                value={contact.phone}
                                onChange={(e) => {
                                  const updated = [...contactsForm];
                                  updated[realIndex].phone = e.target.value;
                                  setContactsForm(updated);
                                }}
                                placeholder="+52 55 1234 5678"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {contactsForm.filter(c => c.is_primary).length === 0 && (
                      <p className="text-muted-foreground text-sm">
                        No hay contacto principal. Ve a la pestaña "Contactos" para agregar uno.
                      </p>
                    )}
                  </div>
                ) : (
                  primaryContact ? (
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
                  )
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Entities Tab */}
        <TabsContent value="entities">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Razones Sociales</CardTitle>
                <CardDescription>
                  Empresas asociadas a este grupo
                </CardDescription>
              </div>
              {isEditing && (
                <Button onClick={handleAddEntity} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  {entitiesForm.length > 0 ? (
                    entitiesForm.map((entity, index) => (
                      <div key={entity.id} className="flex items-end gap-4 p-4 border rounded-lg">
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Razón Social *</Label>
                            <Input
                              value={entity.legal_name}
                              onChange={(e) => {
                                const updated = [...entitiesForm];
                                updated[index].legal_name = e.target.value;
                                setEntitiesForm(updated);
                              }}
                              placeholder="Nombre legal de la empresa"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>RFC</Label>
                            <Input
                              value={entity.rfc}
                              onChange={(e) => {
                                const updated = [...entitiesForm];
                                updated[index].rfc = e.target.value.toUpperCase();
                                setEntitiesForm(updated);
                              }}
                              placeholder="RFC de la empresa"
                              maxLength={13}
                            />
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveEntity(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">No hay razones sociales</p>
                      <Button onClick={handleAddEntity} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar primera razón social
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                entities && entities.length > 0 ? (
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
                )
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
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Contactos</CardTitle>
                <CardDescription>
                  Personas de contacto asociadas a este cliente
                </CardDescription>
              </div>
              {isEditing && (
                <Button onClick={handleAddContact} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  {contactsForm.length > 0 ? (
                    contactsForm.map((contact, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {contact.is_primary ? (
                              <Badge variant="secondary">Principal</Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetPrimaryContact(index)}
                              >
                                Hacer principal
                              </Button>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemoveContact(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Nombre completo *</Label>
                            <Input
                              value={contact.full_name}
                              onChange={(e) => {
                                const updated = [...contactsForm];
                                updated[index].full_name = e.target.value;
                                setContactsForm(updated);
                              }}
                              placeholder="Nombre del contacto"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Cargo</Label>
                            <Input
                              value={contact.position}
                              onChange={(e) => {
                                const updated = [...contactsForm];
                                updated[index].position = e.target.value;
                                setContactsForm(updated);
                              }}
                              placeholder="Cargo o puesto"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                              type="email"
                              value={contact.email}
                              onChange={(e) => {
                                const updated = [...contactsForm];
                                updated[index].email = e.target.value;
                                setContactsForm(updated);
                              }}
                              placeholder="correo@ejemplo.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Teléfono</Label>
                            <Input
                              value={contact.phone}
                              onChange={(e) => {
                                const updated = [...contactsForm];
                                updated[index].phone = e.target.value;
                                setContactsForm(updated);
                              }}
                              placeholder="+52 55 1234 5678"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">No hay contactos</p>
                      <Button onClick={handleAddContact} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar primer contacto
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                contacts && contacts.length > 0 ? (
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
                )
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
