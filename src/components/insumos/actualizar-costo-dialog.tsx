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
import { addInsumoCosto } from "@/lib/actions/insumos";

export function ActualizarCostoDialog({
  insumoId,
  insumoNombre,
}: {
  insumoId: string;
  insumoNombre: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    formData.set("insumoId", insumoId);
    startTransition(async () => {
      const result = await addInsumoCosto(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Costo actualizado");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Actualizar costo
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo costo — {insumoNombre}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="costoUnitario">Costo unitario</Label>
            <Input id="costoUnitario" name="costoUnitario" type="number" step="0.0001" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vigenteDesde">Vigente desde</Label>
            <Input
              id="vigenteDesde"
              name="vigenteDesde"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nota">Nota (opcional)</Label>
            <Input id="nota" name="nota" placeholder="Ej: aumento del proveedor" />
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
