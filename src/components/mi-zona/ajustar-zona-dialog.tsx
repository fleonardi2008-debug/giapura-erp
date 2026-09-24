"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ajustarStockZona } from "@/lib/actions/mi-zona";

export function AjustarZonaDialog({
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
      const result = await ajustarStockZona(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Stock de mi zona ajustado");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Ajustar
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar stock en mi zona — {skuNombre}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cantidadObjetivo">Cantidad real en mi zona</Label>
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
              Para reflejar ventas locales, roturas o un conteo real. No toca el stock de
              fábrica.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nota">Nota (opcional)</Label>
            <Input id="nota" name="nota" placeholder="Ej: vendí 3 este fin de semana" />
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
