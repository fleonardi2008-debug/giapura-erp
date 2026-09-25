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
  esFrasco,
  precioVenta,
  perdidaPct,
  gastosGeneralesMensuales,
  produccionMensualEstimada,
  stockMinimo,
  precioVentaMayorista,
  costoReferenciaOnline,
}: {
  skuId: string;
  /** Un pack solo tiene un canal de venta; un frasco puede venderse mayorista y online. */
  esFrasco: boolean;
  precioVenta: string | null;
  perdidaPct: string;
  gastosGeneralesMensuales: string | null;
  produccionMensualEstimada: number | null;
  stockMinimo: number | null;
  precioVentaMayorista: string | null;
  costoReferenciaOnline: string | null;
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
            <Label htmlFor="precioVenta">
              {esFrasco ? "Precio de venta — tienda online" : "Precio de venta"}
            </Label>
            <Input
              id="precioVenta"
              name="precioVenta"
              type="number"
              step="0.01"
              defaultValue={precioVenta ?? ""}
            />
          </div>
          {esFrasco && (
            <div className="grid grid-cols-2 gap-4 rounded-md border border-border p-3">
              <div className="col-span-2 -mt-1 text-xs font-medium text-muted-foreground">
                Otros canales de venta
              </div>
              <div className="space-y-2">
                <Label htmlFor="precioVentaMayorista">Precio — tienda física (mayorista)</Label>
                <Input
                  id="precioVentaMayorista"
                  name="precioVentaMayorista"
                  type="number"
                  step="0.01"
                  placeholder="Lo que le cobrás al distribuidor"
                  defaultValue={precioVentaMayorista ?? ""}
                />
                <p className="text-xs text-muted-foreground">
                  El costo usa el mismo costo del frasco (sin packaging de combo).
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="costoReferenciaOnline">Costo de referencia — tienda online</Label>
                <Input
                  id="costoReferenciaOnline"
                  name="costoReferenciaOnline"
                  type="number"
                  step="0.01"
                  placeholder="Si lleva packaging que la receta no contempla"
                  defaultValue={costoReferenciaOnline ?? ""}
                />
                <p className="text-xs text-muted-foreground">
                  Opcional. Si lo dejás vacío, se usa el costo normal del producto.
                </p>
              </div>
            </div>
          )}
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
          <div className="space-y-2">
            <Label htmlFor="stockMinimo">Stock mínimo (fábrica + mi zona)</Label>
            <Input
              id="stockMinimo"
              name="stockMinimo"
              type="number"
              step="1"
              min="0"
              placeholder="Unidades antes de avisar que hay que reponer"
              defaultValue={stockMinimo ?? ""}
            />
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
