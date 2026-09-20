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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { crearCompra } from "@/lib/actions/compras";

type InsumoOpcion = { id: string; nombre: string; unidadMedida: string };

export function NuevaCompraDialog({
  insumos,
  insumoIdFijo,
  variant = "default",
}: {
  insumos: InsumoOpcion[];
  /** Si viene, el insumo ya está elegido y no se puede cambiar (botón dentro de una fila). */
  insumoIdFijo?: string;
  variant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [insumoId, setInsumoId] = useState(insumoIdFijo ?? "");
  const [cantidad, setCantidad] = useState("");
  const [costoUnitario, setCostoUnitario] = useState("");

  const insumo = insumos.find((i) => i.id === (insumoIdFijo ?? insumoId));
  const total =
    cantidad && costoUnitario ? Number(cantidad) * Number(costoUnitario) : null;

  // Un id único por instancia: en /insumos hay un diálogo por fila y los Label
  // no deben apuntar al input de otra.
  const sufijo = insumoIdFijo ?? "nueva";

  function reset() {
    setInsumoId(insumoIdFijo ?? "");
    setCantidad("");
    setCostoUnitario("");
  }

  function handleSubmit(formData: FormData) {
    formData.set("insumoId", insumoIdFijo ?? insumoId);
    startTransition(async () => {
      const result = await crearCompra(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Compra registrada · en camino a la fábrica");
      reset();
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(abierto) => {
        setOpen(abierto);
        if (!abierto) reset();
      }}
    >
      <Button variant={variant} size={insumoIdFijo ? "sm" : "default"} onClick={() => setOpen(true)}>
        {insumoIdFijo ? "Comprar" : "Nueva compra"}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {insumoIdFijo && insumo ? `Nueva compra — ${insumo.nombre}` : "Nueva compra"}
          </DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          {!insumoIdFijo && (
            <div className="space-y-2">
              <Label htmlFor={`insumo-${sufijo}`}>Insumo</Label>
              <Select value={insumoId} onValueChange={(v) => setInsumoId((v as string) ?? "")}>
                <SelectTrigger id={`insumo-${sufijo}`} className="w-full">
                  <SelectValue placeholder="Elegí un insumo">
                    {(value) => insumos.find((i) => i.id === value)?.nombre ?? "Elegí un insumo"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {insumos.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`cantidad-${sufijo}`}>
                Cantidad{insumo ? ` (${insumo.unidadMedida})` : ""}
              </Label>
              <Input
                id={`cantidad-${sufijo}`}
                name="cantidad"
                type="number"
                step="0.001"
                min="0"
                required
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`costo-${sufijo}`}>
                Costo unitario{insumo ? ` ($/${insumo.unidadMedida})` : ""}
              </Label>
              <Input
                id={`costo-${sufijo}`}
                name="costoUnitario"
                type="number"
                step="0.0001"
                min="0"
                required
                value={costoUnitario}
                onChange={(e) => setCostoUnitario(e.target.value)}
              />
            </div>
          </div>

          {total !== null && Number.isFinite(total) && (
            <p className="text-sm text-muted-foreground">
              Total a pagar:{" "}
              <span className="font-semibold text-foreground">${total.toFixed(2)}</span>
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`fecha-${sufijo}`}>Fecha de compra</Label>
              <Input
                id={`fecha-${sufijo}`}
                name="fecha"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`proveedor-${sufijo}`}>Proveedor (opcional)</Label>
              <Input id={`proveedor-${sufijo}`} name="proveedor" placeholder="Ej: OPQ" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`nota-${sufijo}`}>Nota (opcional)</Label>
            <Input id={`nota-${sufijo}`} name="nota" placeholder="Ej: remito, seguimiento" />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending || !(insumoIdFijo ?? insumoId)}>
              {pending ? "Guardando..." : "Registrar compra"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
