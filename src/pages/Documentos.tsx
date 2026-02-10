import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { TableSearch } from "@/components/ui/table-search";
import { useTableSort } from "@/hooks/useTableSort";
import { FileText, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import type { Tables, Enums } from "@/integrations/supabase/types";

type CaseDocument = Tables<"case_documents">;
type Case = Tables<"cases">;
type DocumentStatus = Enums<"document_status">;

const STATUS_CONFIG: Record<DocumentStatus, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  pendiente: { label: "Pendiente", icon: Clock, color: "bg-yellow-100 text-yellow-800" },
  recibido: { label: "Recibido", icon: AlertCircle, color: "bg-blue-100 text-blue-800" },
  validado: { label: "Validado", icon: CheckCircle, color: "bg-green-100 text-green-800" },
  rechazado: { label: "Rechazado", icon: XCircle, color: "bg-red-100 text-red-800" },
};

export default function Documentos() {
  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ["case_documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("case_documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CaseDocument[];
    },
  });

  const { data: cases } = useQuery({
    queryKey: ["cases"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cases").select("*");
      if (error) throw error;
      return data as Case[];
    },
  });

  const getCaseName = (caseId: string) => {
    return cases?.find((c) => c.id === caseId)?.title || "Sin caso";
  };

  const getDocsByStatus = (status: DocumentStatus) => {
    return documents?.filter((d) => d.status === status) || [];
  };

  // Prepare data with computed fields for sorting
  const docsWithComputedFields = documents?.map((doc) => ({
    ...doc,
    caseName: getCaseName(doc.case_id),
  }));

  const { sortConfig, handleSort, searchQuery, setSearchQuery, filteredData } = useTableSort(docsWithComputedFields);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Documentos</h1>
        <p className="text-muted-foreground">Centro de documentos por caso</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getDocsByStatus("pendiente").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recibidos</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getDocsByStatus("recibido").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Validados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getDocsByStatus("validado").length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Todos los Documentos</CardTitle>
          <TableSearch 
            value={searchQuery} 
            onChange={setSearchQuery} 
            placeholder="Buscar documento..."
          />
        </CardHeader>
        <CardContent>
          {docsLoading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : documents?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay documentos registrados. Los documentos se crean al gestionar propuestas.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead sortKey="name" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort}>Nombre</SortableTableHead>
                  <SortableTableHead sortKey="caseName" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort}>Caso</SortableTableHead>
                  <SortableTableHead sortKey="status" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort}>Estado</SortableTableHead>
                  <SortableTableHead sortKey="created_at" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort}>Fecha</SortableTableHead>
                  <SortableTableHead sortKey="notes" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort}>Notas</SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData?.map((doc) => {
                  const StatusIcon = STATUS_CONFIG[doc.status].icon;
                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell>{doc.caseName}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_CONFIG[doc.status].color}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {STATUS_CONFIG[doc.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(doc.created_at).toLocaleDateString("es-MX")}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {doc.notes || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
