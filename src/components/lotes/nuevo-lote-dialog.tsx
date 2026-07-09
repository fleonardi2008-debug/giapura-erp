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
import { createLote } from "@/lib/actions/lotes";

type Sku = { id: string; codigo: string; nombre: string };

export function NuevoLoteDialog({ skus }: { skus: Sku[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createLote(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Lote creado");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Nuevo lote</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo lote de producción</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="skuId">Producto</Label>
            <Select name="skuId" required>
              <SelectTrigger id="skuId">
                <SelectValue placeholder="Elegir producto" />
              </SelectTrigger>
              <SelectContent>
                {skus.map((sku) => (
                  <SelectItem key={sku.id} value={sku.id}>
                    {sku.codigo} — {sku.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numeroLote">Número de lote</Label>
              <Input id="numeroLote" name="numeroLote" required placeholder="Ej: L-2026-001" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cantidadUnidades">Cantidad (unidades)</Label>
              <Input id="cantidadUnidades" name="cantidadUnidades" type="number" step="1" required />
            </div>
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
            <Label htmlFor="nota">Nota (opcional)</Label>
            <Input id="nota" name="nota" />
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
