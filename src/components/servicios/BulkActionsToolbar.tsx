import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, DollarSign, ToggleLeft, ToggleRight, X } from "lucide-react";

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkUpdateFee: (fee: number | null, monthlyFee: number | null) => void;
  onBulkUpdateStatus: (isActive: boolean) => void;
  onBulkDelete: () => void;
  isUpdating: boolean;
}

export function BulkActionsToolbar({
  selectedCount,
  onClearSelection,
  onBulkUpdateFee,
  onBulkUpdateStatus,
  onBulkDelete,
  isUpdating,
}: BulkActionsToolbarProps) {
  const [feeDialogOpen, setFeeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [suggestedFee, setSuggestedFee] = useState("");
  const [suggestedMonthlyFee, setSuggestedMonthlyFee] = useState("");

  const handleFeeSubmit = () => {
    const fee = suggestedFee ? parseFloat(suggestedFee) : null;
    const monthlyFee = suggestedMonthlyFee ? parseFloat(suggestedMonthlyFee) : null;
    onBulkUpdateFee(fee, monthlyFee);
    setFeeDialogOpen(false);
    setSuggestedFee("");
    setSuggestedMonthlyFee("");
  };

  const handleDelete = () => {
    onBulkDelete();
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
        <span className="text-sm font-medium">
          {selectedCount} {selectedCount === 1 ? "servicio seleccionado" : "servicios seleccionados"}
        </span>
        
        <div className="flex-1" />
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFeeDialogOpen(true)}
          disabled={isUpdating}
        >
          <DollarSign className="h-4 w-4 mr-1" />
          Cambiar Honorarios
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onBulkUpdateStatus(true)}
          disabled={isUpdating}
        >
          <ToggleRight className="h-4 w-4 mr-1" />
          Activar
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onBulkUpdateStatus(false)}
          disabled={isUpdating}
        >
          <ToggleLeft className="h-4 w-4 mr-1" />
          Desactivar
        </Button>
        
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={isUpdating}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Eliminar
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          disabled={isUpdating}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Fee Dialog */}
      <Dialog open={feeDialogOpen} onOpenChange={setFeeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Honorarios en Lote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Los valores ingresados se aplicarán a los {selectedCount} servicios seleccionados.
              Deja vacío para no modificar ese campo.
            </p>
            <div className="space-y-2">
              <Label htmlFor="bulk_suggested_fee">Honorario Sugerido (Pago Único)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="bulk_suggested_fee"
                  type="number"
                  className="pl-7"
                  value={suggestedFee}
                  onChange={(e) => setSuggestedFee(e.target.value)}
                  placeholder="Dejar vacío para no cambiar"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk_suggested_monthly_fee">Iguala Mensual Sugerida</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="bulk_suggested_monthly_fee"
                  type="number"
                  className="pl-7"
                  value={suggestedMonthlyFee}
                  onChange={(e) => setSuggestedMonthlyFee(e.target.value)}
                  placeholder="Dejar vacío para no cambiar"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeeDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleFeeSubmit}
              disabled={!suggestedFee && !suggestedMonthlyFee}
            >
              Aplicar a {selectedCount} servicios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {selectedCount} servicios?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Los servicios seleccionados serán eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar {selectedCount} servicios
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
