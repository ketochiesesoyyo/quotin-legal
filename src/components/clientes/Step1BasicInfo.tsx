import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientFormData, INDUSTRIES, REVENUE_RANGES } from "./types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, User } from "lucide-react";

interface Step1BasicInfoProps {
  data: ClientFormData;
  onChange: (data: ClientFormData) => void;
}

export function Step1BasicInfo({ data, onChange }: Step1BasicInfoProps) {
  const updateField = <K extends keyof ClientFormData>(
    field: K,
    value: ClientFormData[K]
  ) => {
    onChange({ ...data, [field]: value });
  };

  const updateContact = (field: keyof ClientFormData["contact"], value: string) => {
    onChange({
      ...data,
      contact: { ...data.contact, [field]: value },
    });
  };

  return (
    <div className="space-y-6">
      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Información del Cliente
          </CardTitle>
          <CardDescription>
            Datos generales del grupo empresarial o cliente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="group_name">
                Nombre del Cliente / Grupo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="group_name"
                placeholder="Ej: PHARMA GBC"
                value={data.group_name}
                onChange={(e) => updateField("group_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alias">Alias para documentos</Label>
              <Input
                id="alias"
                placeholder="Ej: PGB"
                value={data.alias}
                onChange={(e) => updateField("alias", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Sector / Industria</Label>
              <Select
                value={data.industry}
                onValueChange={(value) => updateField("industry", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sector" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="annual_revenue">Ingresos anuales aprox.</Label>
              <Select
                value={data.annual_revenue}
                onValueChange={(value) => updateField("annual_revenue", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rango" />
                </SelectTrigger>
                <SelectContent>
                  {REVENUE_RANGES.map((range) => (
                    <SelectItem key={range} value={range}>
                      {range}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee_count">Número de empleados</Label>
              <Input
                id="employee_count"
                type="number"
                placeholder="Ej: 120"
                value={data.employee_count ?? ""}
                onChange={(e) =>
                  updateField(
                    "employee_count",
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observaciones</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionales sobre el cliente..."
              value={data.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Contacto Principal
          </CardTitle>
          <CardDescription>
            Persona de contacto principal para este cliente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_name">
                Nombre completo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contact_name"
                placeholder="Ej: Juan Pérez"
                value={data.contact.full_name}
                onChange={(e) => updateContact("full_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_position">Cargo</Label>
              <Input
                id="contact_position"
                placeholder="Ej: Director Financiero"
                value={data.contact.position}
                onChange={(e) => updateContact("position", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contact_email"
                type="email"
                placeholder="Ej: juan@empresa.com"
                value={data.contact.email}
                onChange={(e) => updateContact("email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Teléfono</Label>
              <Input
                id="contact_phone"
                placeholder="Ej: +52 33 1234 5678"
                value={data.contact.phone}
                onChange={(e) => updateContact("phone", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
