"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import { ajustarStockInsumo } from "@/lib/actions/insumos";

export function AjustarStockInsumoDialog({
  insumoId,
  insumoNombre,
  unidadMedida,
  stockActual,
}: {
  insumoId: string;
  insumoNombre: string;
  unidadMedida: string;
  stockActual: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    formData.set("insumoId", insumoId);
    startTransition(async () => {
      const result = await ajustarStockInsumo(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Stock ajustado");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Ajustar stock
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar stock — {insumoNombre}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`cantidadObjetivo-${insumoId}`}>
              Cantidad real ({unidadMedida})
            </Label>
            <Input
              id={`cantidadObjetivo-${insumoId}`}
              name="cantidadObjetivo"
              type="number"
              step="0.001"
              min="0"
              defaultValue={stockActual}
              required
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Poné cuánto hay en realidad. Se registra un ajuste por la diferencia, para
              dejar el motivo en el historial.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`nota-${insumoId}`}>Nota (opcional)</Label>
            <Input id={`nota-${insumoId}`} name="nota" placeholder="Ej: conteo de inventario" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
