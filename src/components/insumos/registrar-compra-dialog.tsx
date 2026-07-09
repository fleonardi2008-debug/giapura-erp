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
import { registrarCompraInsumo } from "@/lib/actions/insumos";

export function RegistrarCompraDialog({
  insumoId,
  insumoNombre,
  unidadMedida,
}: {
  insumoId: string;
  insumoNombre: string;
  unidadMedida: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    formData.set("insumoId", insumoId);
    startTransition(async () => {
      const result = await registrarCompraInsumo(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Compra registrada");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Registrar compra
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar compra — {insumoNombre}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cantidad">Cantidad ({unidadMedida})</Label>
            <Input id="cantidad" name="cantidad" type="number" step="0.001" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fecha">Fecha</Label>
            <Input
              id="fecha"
              name="fecha"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="costoUnitario">Costo unitario pagado (opcional)</Label>
            <Input id="costoUnitario" name="costoUnitario" type="number" step="0.0001" placeholder="Dejalo vacío si no cambió" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nota">Nota (opcional)</Label>
            <Input id="nota" name="nota" placeholder="Ej: proveedor, remito" />
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
