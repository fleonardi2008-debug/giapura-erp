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
import { transferirAMiZona } from "@/lib/actions/mi-zona";

type Producto = { id: string; nombre: string; stockFabrica: string };

export function TransferirDialog({ productos }: { productos: Producto[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [skuId, setSkuId] = useState("");

  const producto = productos.find((p) => p.id === skuId);

  function reset() {
    setSkuId("");
  }

  function handleSubmit(formData: FormData) {
    formData.set("skuId", skuId);
    startTransition(async () => {
      const result = await transferirAMiZona(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Transferido a mi zona");
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
      <Button onClick={() => setOpen(true)}>Traer a mi zona</Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Traer a mi zona</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="producto">Producto</Label>
            <Select value={skuId} onValueChange={(v) => setSkuId((v as string) ?? "")}>
              <SelectTrigger id="producto" className="w-full">
                <SelectValue placeholder="Elegí un frasco o pack">
                  {(value) => productos.find((p) => p.id === value)?.nombre ?? "Elegí un producto"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {productos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {producto && (
              <p className="text-xs text-muted-foreground">
                En fábrica hay <span className="font-medium text-foreground">{producto.stockFabrica}</span>{" "}
                disponibles.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cantidad">Cantidad a llevarte</Label>
            <Input id="cantidad" name="cantidad" type="number" step="1" min="1" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nota">Nota (opcional)</Label>
            <Input id="nota" name="nota" placeholder="Ej: viaje del sábado" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || !skuId}>
              {pending ? "Transfiriendo..." : "Transferir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
