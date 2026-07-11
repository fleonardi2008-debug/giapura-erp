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
import { ajustarStockProducto } from "@/lib/actions/stock";

export function AjustarStockDialog({
  skuId,
  skuNombre,
  stockActual,
}: {
  skuId: string;
  skuNombre: string;
  stockActual: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    formData.set("skuId", skuId);
    startTransition(async () => {
      const result = await ajustarStockProducto(formData);
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
          <DialogTitle>Ajustar stock — {skuNombre}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cantidadObjetivo">Cantidad real (unidades)</Label>
            <Input
              id="cantidadObjetivo"
              name="cantidadObjetivo"
              type="number"
              step="1"
              min="0"
              defaultValue={stockActual}
              required
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Poné cuántas unidades tenés realmente. Se registra un ajuste por la diferencia y,
              si el producto está conectado a Tienda Nube, se actualiza allá también.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nota">Nota (opcional)</Label>
            <Input id="nota" name="nota" placeholder="Ej: conteo de inventario" />
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
