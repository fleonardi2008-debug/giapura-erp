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
import { venderEnMiZona } from "@/lib/actions/mi-zona";

export function VenderZonaDialog({
  skuId,
  skuNombre,
  stockZona,
  precioSugerido,
}: {
  skuId: string;
  skuNombre: string;
  stockZona: number;
  precioSugerido: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [cantidad, setCantidad] = useState("1");
  const [precioUnitario, setPrecioUnitario] = useState(precioSugerido ?? "");

  const total = cantidad && precioUnitario ? Number(cantidad) * Number(precioUnitario) : null;

  function handleSubmit(formData: FormData) {
    formData.set("skuId", skuId);
    startTransition(async () => {
      const result = await venderEnMiZona(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Venta registrada");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" disabled={stockZona === 0} onClick={() => setOpen(true)}>
        Vender
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vender en mi zona — {skuNombre}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <p className="text-xs text-muted-foreground">Tenés {stockZona} disponibles en tu zona.</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad</Label>
              <Input
                id="cantidad"
                name="cantidad"
                type="number"
                step="1"
                min="1"
                max={stockZona}
                required
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="precioUnitario">Precio unitario</Label>
              <Input
                id="precioUnitario"
                name="precioUnitario"
                type="number"
                step="0.01"
                min="0"
                required
                value={precioUnitario}
                onChange={(e) => setPrecioUnitario(e.target.value)}
              />
            </div>
          </div>
          {total !== null && Number.isFinite(total) && (
            <p className="text-sm text-muted-foreground">
              Total: <span className="font-semibold text-foreground">${total.toFixed(2)}</span>
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="estadoPago">Pago</Label>
              <Select name="estadoPago" defaultValue="PAGADO">
                <SelectTrigger id="estadoPago" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAGADO">Pagado</SelectItem>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="PARCIAL">Parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="clienteNombre">Cliente (opcional)</Label>
            <Input id="clienteNombre" name="clienteNombre" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Registrar venta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
