import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "./StepIndicator";
import { Step1BasicInfo } from "./Step1BasicInfo";
import { Step2Entities } from "./Step2Entities";
import { Step3Documents } from "./Step3Documents";
import { Step4Validation } from "./Step4Validation";
import { StepSuccess } from "./StepSuccess";
import { ClientFormData, EntityFormData, DocumentData } from "./types";
import { ArrowLeft, ArrowRight, Save, SkipForward } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const STEPS = [
  { number: 1, title: "Información", description: "Datos del cliente" },
  { number: 2, title: "Razones Sociales", description: "Empresas asociadas" },
  { number: 3, title: "Documentos", description: "Subir archivos" },
  { number: 4, title: "Validación", description: "Revisar documentos" },
];

const defaultClientData: ClientFormData = {
  group_name: "",
  alias: "",
  notes: "",
  industry: "",
  annual_revenue: "",
  employee_count: null,
  contact: {
    full_name: "",
    position: "",
    email: "",
    phone: "",
  },
};

interface ClienteWizardProps {
  editMode?: boolean;
  clientId?: string;
  initialClientData?: ClientFormData;
  initialEntities?: EntityFormData[];
  initialDocuments?: Record<string, DocumentData[]>;
  primaryContactId?: string;
}

export function ClienteWizard({
  editMode = false,
  clientId,
  initialClientData,
  initialEntities,
  initialDocuments,
  primaryContactId,
}: ClienteWizardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedClientId, setSavedClientId] = useState<string | null>(clientId || null);

  const [clientData, setClientData] = useState<ClientFormData>(
    initialClientData || defaultClientData
  );
  const [entities, setEntities] = useState<EntityFormData[]>(
    initialEntities || [{ id: crypto.randomUUID(), legal_name: "", rfc: "" }]
  );
  const [documents, setDocuments] = useState<Record<string, DocumentData[]>>(
    initialDocuments || {}
  );

  // Update state when initial data changes (for edit mode)
  useEffect(() => {
    if (initialClientData) {
      setClientData(initialClientData);
    }
    if (initialEntities && initialEntities.length > 0) {
      setEntities(initialEntities);
    }
    if (initialDocuments) {
      setDocuments(initialDocuments);
    }
  }, [initialClientData, initialEntities, initialDocuments]);

  const hasDocuments = Object.values(documents).some(
    (docs) => docs.filter((d) => d.status !== "pendiente").length > 0
  );

  const canProceedStep1 = 
    clientData.group_name.trim() !== "" &&
    clientData.contact.full_name.trim() !== "" &&
    clientData.contact.email.trim() !== "";

  const canProceedStep2 = entities.every(
    (e) => e.legal_name.trim() !== "" && e.rfc.trim() !== ""
  );

  const handleNext = () => {
    if (currentStep < 4) {
      // Skip step 4 if no documents
      if (currentStep === 3 && !hasDocuments) {
        handleSubmit();
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (editMode && clientId) {
        // UPDATE existing client
        const { error: clientError } = await supabase
          .from("clients")
          .update({
            group_name: clientData.group_name,
            alias: clientData.alias || null,
            notes: clientData.notes || null,
            industry: clientData.industry || null,
            annual_revenue: clientData.annual_revenue || null,
            employee_count: clientData.employee_count,
            status: hasDocuments ? "completo" : "incompleto",
          })
          .eq("id", clientId);

        if (clientError) throw clientError;

        // Update or create primary contact
        if (primaryContactId) {
          const { error: contactError } = await supabase
            .from("client_contacts")
            .update({
              full_name: clientData.contact.full_name,
              position: clientData.contact.position || null,
              email: clientData.contact.email,
              phone: clientData.contact.phone || null,
            })
            .eq("id", primaryContactId);

          if (contactError) throw contactError;
        } else {
          const { error: contactError } = await supabase
            .from("client_contacts")
            .insert({
              client_id: clientId,
              full_name: clientData.contact.full_name,
              position: clientData.contact.position || null,
              email: clientData.contact.email,
              phone: clientData.contact.phone || null,
              is_primary: true,
            });

          if (contactError) throw contactError;
        }

        // Update entities: update existing, create new ones
        for (const entity of entities) {
          // Check if entity already exists in DB (has UUID format id that exists)
          const { data: existingEntity } = await supabase
            .from("client_entities")
            .select("id")
            .eq("id", entity.id || "")
            .maybeSingle();

          if (existingEntity) {
            // Update existing
            const { error } = await supabase
              .from("client_entities")
              .update({
                legal_name: entity.legal_name,
                rfc: entity.rfc,
              })
              .eq("id", entity.id);
            if (error) throw error;
          } else {
            // Create new
            const { data: newEntity, error } = await supabase
              .from("client_entities")
              .insert({
                client_id: clientId,
                legal_name: entity.legal_name,
                rfc: entity.rfc,
              })
              .select()
              .single();
            if (error) throw error;
            
            // Update documents with new entity ID if there were any for this temp ID
            if (entity.id && documents[entity.id]) {
              const entityDocs = documents[entity.id];
              for (const doc of entityDocs) {
                if (doc.status === "pendiente") continue;
                await supabase.from("client_documents").insert({
                  entity_id: newEntity.id,
                  document_type: doc.document_type,
                  file_url: doc.file_url,
                  file_name: doc.file_name,
                  status: doc.status,
                  notes: doc.notes,
                  uploaded_at: new Date().toISOString(),
                });
              }
            }
          }
        }

        setSavedClientId(clientId);
        setCurrentStep(5);
        toast.success("Cliente actualizado exitosamente");
      } else {
        // CREATE new client
        const { data: client, error: clientError } = await supabase
          .from("clients")
          .insert({
            group_name: clientData.group_name,
            alias: clientData.alias || null,
            notes: clientData.notes || null,
            industry: clientData.industry || null,
            annual_revenue: clientData.annual_revenue || null,
            employee_count: clientData.employee_count,
            status: hasDocuments ? "completo" : "incompleto",
            created_by: user?.id,
          })
          .select()
          .single();

        if (clientError) throw clientError;

        // Create the primary contact
        const { error: contactError } = await supabase
          .from("client_contacts")
          .insert({
            client_id: client.id,
            full_name: clientData.contact.full_name,
            position: clientData.contact.position || null,
            email: clientData.contact.email,
            phone: clientData.contact.phone || null,
            is_primary: true,
          });

        if (contactError) throw contactError;

        // Create entities and map old IDs to new IDs
        const entityIdMap: Record<string, string> = {};
        for (const entity of entities) {
          const { data: newEntity, error: entityError } = await supabase
            .from("client_entities")
            .insert({
              client_id: client.id,
              legal_name: entity.legal_name,
              rfc: entity.rfc,
            })
            .select()
            .single();

          if (entityError) throw entityError;
          if (entity.id) {
            entityIdMap[entity.id] = newEntity.id;
          }
        }

        // Create documents with new entity IDs
        for (const [oldEntityId, entityDocs] of Object.entries(documents)) {
          const newEntityId = entityIdMap[oldEntityId];
          if (!newEntityId) continue;

          for (const doc of entityDocs) {
            if (doc.status === "pendiente") continue;

            const { error: docError } = await supabase
              .from("client_documents")
              .insert({
                entity_id: newEntityId,
                document_type: doc.document_type,
                file_url: doc.file_url,
                file_name: doc.file_name,
                status: doc.status,
                notes: doc.notes,
                uploaded_at: new Date().toISOString(),
              });

            if (docError) throw docError;
          }
        }

        setSavedClientId(client.id);
        setCurrentStep(5);
        toast.success("Cliente creado exitosamente");
      }
    } catch (error) {
      console.error("Error saving client:", error);
      toast.error(editMode ? "Error al actualizar el cliente" : "Error al crear el cliente");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipDocuments = () => {
    handleSubmit();
  };

  const handleCancel = () => {
    if (editMode && clientId) {
      navigate(`/clientes/${clientId}`);
    } else {
      navigate("/clientes");
    }
  };

  // Success screen
  if (currentStep === 5 && savedClientId) {
    return (
      <StepSuccess
        clientData={clientData}
        entities={entities}
        documents={documents}
        clientId={savedClientId}
        isEdit={editMode}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Step Indicator */}
      <StepIndicator steps={STEPS} currentStep={currentStep} />

      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentStep === 1 && (
          <Step1BasicInfo data={clientData} onChange={setClientData} />
        )}
        {currentStep === 2 && (
          <Step2Entities
            entities={entities}
            onChange={setEntities}
            clientName={clientData.group_name}
          />
        )}
        {currentStep === 3 && (
          <Step3Documents
            entities={entities}
            documents={documents}
            onChange={setDocuments}
          />
        )}
        {currentStep === 4 && (
          <Step4Validation
            entities={entities}
            documents={documents}
            onChange={setDocuments}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t">
        <div>
          {currentStep === 1 ? (
            <Button variant="ghost" onClick={handleCancel}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          ) : (
            <Button variant="ghost" onClick={handlePrevious}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {currentStep === 3 && (
            <Button
              variant="outline"
              onClick={handleSkipDocuments}
              disabled={isSubmitting}
            >
              <SkipForward className="h-4 w-4 mr-2" />
              {editMode ? "Guardar sin Cambios" : "Omitir y Finalizar"}
            </Button>
          )}

          {currentStep < 4 && (
            <Button
              onClick={handleNext}
              disabled={
                (currentStep === 1 && !canProceedStep1) ||
                (currentStep === 2 && !canProceedStep2) ||
                isSubmitting
              }
            >
              Siguiente
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {currentStep === 4 && (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editMode ? "Guardar Cambios" : "Finalizar y Guardar"}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
