import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EntityFormData } from "./types";
import { Building, Plus, Trash2 } from "lucide-react";

interface Step2EntitiesProps {
  entities: EntityFormData[];
  onChange: (entities: EntityFormData[]) => void;
  clientName: string;
}

export function Step2Entities({ entities, onChange, clientName }: Step2EntitiesProps) {
  const addEntity = () => {
    onChange([
      ...entities,
      { id: crypto.randomUUID(), legal_name: "", rfc: "" },
    ]);
  };

  const removeEntity = (index: number) => {
    if (entities.length > 1) {
      onChange(entities.filter((_, i) => i !== index));
    }
  };

  const updateEntity = (index: number, field: keyof EntityFormData, value: string) => {
    const updated = entities.map((entity, i) =>
      i === index ? { ...entity, [field]: value } : entity
    );
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Razones Sociales de {clientName || "Cliente"}
          </CardTitle>
          <CardDescription>
            Agrega todas las empresas o razones sociales asociadas a este cliente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {entities.map((entity, index) => (
            <div
              key={entity.id || index}
              className="p-4 border rounded-lg space-y-4 bg-muted/30"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Razón Social #{index + 1}
                </span>
                {entities.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEntity(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`legal_name_${index}`}>
                    Razón Social <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`legal_name_${index}`}
                    placeholder="Ej: PHARMA GBC SA DE CV"
                    value={entity.legal_name}
                    onChange={(e) =>
                      updateEntity(index, "legal_name", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`rfc_${index}`}>
                    RFC <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`rfc_${index}`}
                    placeholder="Ej: PGB890523XY7"
                    value={entity.rfc}
                    onChange={(e) =>
                      updateEntity(index, "rfc", e.target.value.toUpperCase())
                    }
                    className="uppercase"
                  />
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addEntity}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Razón Social
          </Button>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        <p>
          <span className="font-medium">Nota:</span> Cada razón social podrá
          tener sus propios documentos fiscales asociados en el siguiente paso.
        </p>
      </div>
    </div>
  );
}
