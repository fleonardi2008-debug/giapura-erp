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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPedidoManual } from "@/lib/actions/pedidos";

type Sku = { id: string; codigo: string; nombre: string };
type Row = { key: string; skuId: string; cantidad: string; precioUnitario: string };

export function NuevoPedidoDialog({ skus }: { skus: Sku[] }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([
    { key: "0", skuId: "", cantidad: "", precioUnitario: "" },
  ]);
  const [pending, startTransition] = useTransition();

  function addRow() {
    setRows((r) => [...r, { key: `${Date.now()}`, skuId: "", cantidad: "", precioUnitario: "" }]);
  }

  function removeRow(key: string) {
    setRows((r) => (r.length > 1 ? r.filter((row) => row.key !== key) : r));
  }

  function updateRow(key: string, field: keyof Row, value: string | null) {
    setRows((r) => r.map((row) => (row.key === key ? { ...row, [field]: value ?? "" } : row)));
  }

  function handleSubmit(formData: FormData) {
    for (const row of rows) {
      if (!row.skuId || !row.cantidad || !row.precioUnitario) continue;
      formData.append("skuId", row.skuId);
      formData.append("cantidad", row.cantidad);
      formData.append("precioUnitario", row.precioUnitario);
    }

    startTransition(async () => {
      const result = await createPedidoManual(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Pedido registrado");
      setOpen(false);
      setRows([{ key: "0", skuId: "", cantidad: "", precioUnitario: "" }]);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Nuevo pedido</Button>} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo pedido (carga manual)</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numeroPedido">Número de pedido</Label>
              <Input id="numeroPedido" name="numeroPedido" required placeholder="Ej: 1001" />
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="clienteNombre">Cliente (opcional)</Label>
            <Input id="clienteNombre" name="clienteNombre" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="estadoPago">Estado de pago</Label>
            <Select name="estadoPago" defaultValue="PAGADO">
              <SelectTrigger id="estadoPago" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PAGADO">Pagado</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="PARCIAL">Parcial</SelectItem>
                <SelectItem value="REEMBOLSADO">Reembolsado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Productos</Label>
            {rows.map((row) => (
              <div key={row.key} className="flex items-center gap-2">
                <Select value={row.skuId} onValueChange={(v) => updateRow(row.key, "skuId", v)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {skus.map((sku) => (
                      <SelectItem key={sku.id} value={sku.id}>
                        {sku.codigo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="1"
                  placeholder="Cant."
                  className="w-20"
                  value={row.cantidad}
                  onChange={(e) => updateRow(row.key, "cantidad", e.target.value)}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Precio"
                  className="w-28"
                  value={row.precioUnitario}
                  onChange={(e) => updateRow(row.key, "precioUnitario", e.target.value)}
                />
                <Button variant="ghost" size="sm" type="button" onClick={() => removeRow(row.key)}>
                  Quitar
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" type="button" onClick={addRow}>
              Agregar producto
            </Button>
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
