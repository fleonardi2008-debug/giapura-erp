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
import { updateSkuEconomia } from "@/lib/actions/skus";

export function EditarEconomiaDialog({
  skuId,
  precioVenta,
  perdidaPct,
  gastosGeneralesMensuales,
  produccionMensualEstimada,
}: {
  skuId: string;
  precioVenta: string | null;
  perdidaPct: string;
  gastosGeneralesMensuales: string | null;
  produccionMensualEstimada: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    formData.set("skuId", skuId);
    startTransition(async () => {
      const result = await updateSkuEconomia(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Economía del producto actualizada");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Editar economía
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Precio y gastos generales</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="precioVenta">Precio de venta</Label>
            <Input
              id="precioVenta"
              name="precioVenta"
              type="number"
              step="0.01"
              defaultValue={precioVenta ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="perdidaPct">% pérdida / merma sobre insumos</Label>
            <Input
              id="perdidaPct"
              name="perdidaPct"
              type="number"
              step="0.01"
              defaultValue={perdidaPct}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gastosGeneralesMensuales">Gastos generales mensuales</Label>
              <Input
                id="gastosGeneralesMensuales"
                name="gastosGeneralesMensuales"
                type="number"
                step="0.01"
                placeholder="Marketing, salarios, amortización..."
                defaultValue={gastosGeneralesMensuales ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="produccionMensualEstimada">Producción mensual estimada</Label>
              <Input
                id="produccionMensualEstimada"
                name="produccionMensualEstimada"
                type="number"
                step="1"
                placeholder="Unidades"
                defaultValue={produccionMensualEstimada ?? ""}
              />
            </div>
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
