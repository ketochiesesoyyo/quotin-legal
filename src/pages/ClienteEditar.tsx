import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ClienteWizard } from "@/components/clientes/ClienteWizard";
import { ArrowLeft, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ClienteEditar() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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

  // Fetch primary contact
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

  // Fetch documents
  const { data: documents } = useQuery({
    queryKey: ["client_documents_for_edit", id],
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

  const primaryContact = contacts?.find((c) => c.is_primary) || contacts?.[0];

  // Transform data for wizard
  const initialClientData = {
    group_name: client.group_name,
    alias: client.alias || "",
    notes: client.notes || "",
    industry: client.industry || "",
    annual_revenue: client.annual_revenue || "",
    employee_count: client.employee_count,
    contact: {
      full_name: primaryContact?.full_name || "",
      position: primaryContact?.position || "",
      email: primaryContact?.email || "",
      phone: primaryContact?.phone || "",
    },
  };

  const initialEntities = entities?.map((e) => ({
    id: e.id,
    legal_name: e.legal_name,
    rfc: e.rfc || "",
  })) || [{ id: crypto.randomUUID(), legal_name: "", rfc: "" }];

  // Transform documents into the format expected by wizard
  const initialDocuments: Record<string, any[]> = {};
  if (documents && entities) {
    entities.forEach((entity) => {
      const entityDocs = documents.filter((d) => d.entity_id === entity.id);
      if (entityDocs.length > 0) {
        initialDocuments[entity.id] = entityDocs.map((d) => ({
          entity_id: d.entity_id,
          document_type: d.document_type,
          file_url: d.file_url,
          file_name: d.file_name,
          status: d.status,
          notes: d.notes,
        }));
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/clientes/${id}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Editar Cliente</h1>
          <p className="text-muted-foreground">
            Modifica los datos de {client.group_name}
          </p>
        </div>
      </div>

      {/* Wizard in edit mode */}
      <ClienteWizard
        editMode
        clientId={id}
        initialClientData={initialClientData}
        initialEntities={initialEntities}
        initialDocuments={initialDocuments}
        primaryContactId={primaryContact?.id}
      />
    </div>
  );
}
