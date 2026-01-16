import { Building2, Users, DollarSign, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import type { Client } from "./types";

interface EditorHeaderProps {
  client: Client | null;
  entityCount: number;
  employeeCount: number;
  annualRevenue: string;
}

export function EditorHeader({ client, entityCount, employeeCount, annualRevenue }: EditorHeaderProps) {
  const navigate = useNavigate();

  const formatRevenue = (revenue: string | null) => {
    if (!revenue) return "No especificado";
    return revenue;
  };

  return (
    <div className="border-b bg-card">
      <div className="container py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/propuestas")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{client?.group_name || "Cliente"}</h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {entityCount} {entityCount === 1 ? "empresa" : "empresas"}
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {formatRevenue(annualRevenue)}
                </span>
                {employeeCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {employeeCount} empleados
                  </span>
                )}
              </div>
            </div>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1">
            Borrador
          </Badge>
        </div>
      </div>
    </div>
  );
}
