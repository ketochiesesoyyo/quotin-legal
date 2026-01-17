import { useState } from "react";
import { User, Pencil, Check, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ClientContact } from "./types";

export interface RecipientData {
  fullName: string;
  position: string | null;
  salutationPrefix: 'Sr.' | 'Sra.';
  isCustom: boolean;
  contactId?: string | null;
}

interface RecipientSectionProps {
  availableContacts: ClientContact[];
  recipient: RecipientData;
  onUpdateRecipient: (data: RecipientData) => void;
}

export function RecipientSection({
  availableContacts,
  recipient,
  onUpdateRecipient,
}: RecipientSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedRecipient, setEditedRecipient] = useState<RecipientData>(recipient);

  const handleSelectContact = (contactId: string) => {
    if (contactId === "custom") {
      setEditedRecipient({
        fullName: "",
        position: null,
        salutationPrefix: 'Sr.',
        isCustom: true,
        contactId: null,
      });
      setIsEditing(true);
    } else {
      const contact = availableContacts.find(c => c.id === contactId);
      if (contact) {
        const newRecipient: RecipientData = {
          fullName: contact.full_name,
          position: contact.position,
          salutationPrefix: getSalutationPrefix(contact.full_name),
          isCustom: false,
          contactId: contact.id,
        };
        setEditedRecipient(newRecipient);
        onUpdateRecipient(newRecipient);
      }
    }
  };

  const handleSave = () => {
    onUpdateRecipient(editedRecipient);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedRecipient(recipient);
    setIsEditing(false);
  };

  // Helper to get salutation prefix from name
  function getSalutationPrefix(fullName: string): 'Sr.' | 'Sra.' {
    const firstName = fullName.split(" ")[0].toLowerCase();
    const femaleNames = ["maria", "ana", "carmen", "laura", "patricia", "martha", "rosa", "guadalupe", "elena", "adriana", "claudia", "gabriela", "monica", "veronica", "alejandra", "sandra", "lucia", "fernanda", "diana", "paola"];
    return femaleNames.some((n) => firstName.includes(n)) ? "Sra." : "Sr.";
  }

  const isPlaceholder = recipient.fullName.startsWith("[");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">DESTINATARIO DE LA PROPUESTA</CardTitle>
          </div>
          {!isEditing && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-1" />
              Editar
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Selecciona o ingresa los datos del contacto a quien va dirigida la propuesta
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-4">
            {/* Contact selector */}
            {availableContacts.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Seleccionar contacto existente</Label>
                <Select
                  value={editedRecipient.contactId || (editedRecipient.isCustom ? "custom" : "")}
                  onValueChange={handleSelectContact}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar contacto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableContacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.full_name}
                        {contact.is_primary && " (Principal)"}
                        {contact.position && ` - ${contact.position}`}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">
                      <span className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Agregar manualmente
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Manual input fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre completo</Label>
                <Input
                  id="fullName"
                  value={editedRecipient.fullName}
                  onChange={(e) =>
                    setEditedRecipient({ ...editedRecipient, fullName: e.target.value, isCustom: true })
                  }
                  placeholder="Ej: Juan Pérez García"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Cargo (opcional)</Label>
                <Input
                  id="position"
                  value={editedRecipient.position || ""}
                  onChange={(e) =>
                    setEditedRecipient({ ...editedRecipient, position: e.target.value || null, isCustom: true })
                  }
                  placeholder="Ej: Director General"
                />
              </div>
            </div>

            {/* Salutation toggle */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Tratamiento para el saludo</Label>
              <ToggleGroup
                type="single"
                value={editedRecipient.salutationPrefix}
                onValueChange={(value) =>
                  value && setEditedRecipient({ ...editedRecipient, salutationPrefix: value as 'Sr.' | 'Sra.' })
                }
                className="justify-start"
              >
                <ToggleGroupItem value="Sr." aria-label="Señor" className="px-4">
                  Sr.
                </ToggleGroupItem>
                <ToggleGroupItem value="Sra." aria-label="Señora" className="px-4">
                  Sra.
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!editedRecipient.fullName.trim()}>
                <Check className="h-4 w-4 mr-1" />
                Guardar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className={`p-3 rounded-lg border ${isPlaceholder ? 'border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700' : 'bg-muted/30'}`}>
              <p className={`font-medium ${isPlaceholder ? 'text-amber-700 dark:text-amber-400' : ''}`}>
                {recipient.salutationPrefix} {recipient.fullName}
              </p>
              {recipient.position && (
                <p className="text-sm text-muted-foreground">{recipient.position}</p>
              )}
              {isPlaceholder && (
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                  ⚠️ Haz clic en "Editar" para agregar los datos del destinatario
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
