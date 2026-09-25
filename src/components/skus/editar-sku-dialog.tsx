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
import { editarSku } from "@/lib/actions/skus";

export function EditarSkuDialog({
  skuId,
  codigo,
  nombre,
  unidadMedida,
}: {
  skuId: string;
  codigo: string;
  nombre: string;
  unidadMedida: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    formData.set("skuId", skuId);
    startTransition(async () => {
      const result = await editarSku(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Producto actualizado");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Editar producto
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar producto</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="codigo">Código</Label>
            <Input id="codigo" name="codigo" required defaultValue={codigo} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" name="nombre" required defaultValue={nombre} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unidadMedida">Unidad de medida</Label>
            <Input id="unidadMedida" name="unidadMedida" required defaultValue={unidadMedida} />
          </div>
          <p className="text-xs text-muted-foreground">
            El tipo (frasco/pack), la receta y la composición se editan más abajo, en sus
            propias secciones.
          </p>
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
