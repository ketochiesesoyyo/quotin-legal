import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { 
  Plus, 
  Building2, 
  Users, 
  FileText, 
  MoreHorizontal, 
  Pencil, 
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Tables } from "@/integrations/supabase/types";

type Client = Tables<"clients">;
type ClientContact = Tables<"client_contacts">;
type ClientEntity = Tables<"client_entities">;

export default function Clientes() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Client[];
    },
  });

  const { data: contacts } = useQuery({
    queryKey: ["client_contacts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_contacts").select("*");
      if (error) throw error;
      return data as ClientContact[];
    },
  });

  const { data: entities } = useQuery({
    queryKey: ["client_entities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_entities").select("*");
      if (error) throw error;
      return data as ClientEntity[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Cliente eliminado exitosamente" });
    },
    onError: (error) => {
      toast({ title: "Error al eliminar cliente", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const getClientContacts = (clientId: string) => {
    return contacts?.filter((c) => c.client_id === clientId) || [];
  };

  const getClientEntities = (clientId: string) => {
    return entities?.filter((e) => e.client_id === clientId) || [];
  };

  const getPrimaryContact = (clientId: string) => {
    const clientContacts = getClientContacts(clientId);
    return clientContacts.find((c) => c.is_primary) || clientContacts[0];
  };

  // Sortable and searchable data
  const { sortConfig, handleSort, searchQuery, setSearchQuery, filteredData } = useTableSort(clients);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gestiona tus clientes y grupos empresariales</p>
        </div>
        <Button onClick={() => navigate("/clientes/nuevo")}>
          <Plus className="mr-2 h-4 w-4" />
          Crear Nuevo Cliente
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Contactos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contacts?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Razones Sociales</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entities?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients?.filter((c) => c.status === "completo").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lista de Clientes</CardTitle>
          <TableSearch 
            value={searchQuery} 
            onChange={setSearchQuery} 
            placeholder="Buscar cliente..."
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : clients?.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay clientes registrados</h3>
              <p className="text-muted-foreground mb-4">
                Comienza agregando tu primer cliente
              </p>
              <Button onClick={() => navigate("/clientes/nuevo")}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Nuevo Cliente
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead sortKey="group_name" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort}>Cliente</SortableTableHead>
                  <SortableTableHead sortKey="industry" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort}>Industria</SortableTableHead>
                  <TableHead>Contacto Principal</TableHead>
                  <TableHead className="text-center">Razones Sociales</TableHead>
                  <SortableTableHead sortKey="status" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort} className="text-center">Estado</SortableTableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData?.map((client) => {
                  const primaryContact = getPrimaryContact(client.id);
                  const entitiesCount = getClientEntities(client.id).length;
                  const isComplete = client.status === "completo";

                  return (
                    <TableRow key={client.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <p className="font-medium">{client.group_name}</p>
                          {client.alias && (
                            <p className="text-sm text-muted-foreground">{client.alias}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.industry || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {primaryContact ? (
                          <div>
                            <p className="text-sm">{primaryContact.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {primaryContact.email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{entitiesCount}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {isComplete ? (
                          <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Completo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Incompleto
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/clientes/${client.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Expediente
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => navigate("/propuestas", { state: { clientId: client.id } })}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Crear Propuesta
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/clientes/${client.id}/editar`)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteMutation.mutate(client.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
