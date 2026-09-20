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
import { createSku } from "@/lib/actions/skus";

export function NuevoSkuDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createSku(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Producto creado");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Nuevo producto</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo producto (SKU)</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nivel">Tipo de producto</Label>
            <Select name="nivel" defaultValue="FRASCO">
              <SelectTrigger id="nivel" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FRASCO">Frasco (individual, se produce)</SelectItem>
                <SelectItem value="PACK">Pack (combina frascos)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Un frasco lleva receta de insumos. Un pack se arma con frascos (la composición
              la definís después, en el detalle).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="codigo">Código</Label>
            <Input id="codigo" name="codigo" required placeholder="Ej: PM-450" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" name="nombre" required placeholder="Ej: Pasta de maní clásica 450g" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unidadMedida">Unidad de medida</Label>
            <Input id="unidadMedida" name="unidadMedida" defaultValue="unidad" required />
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
