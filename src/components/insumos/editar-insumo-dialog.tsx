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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { editarInsumo } from "@/lib/actions/insumos";

const TIPO_LABEL: Record<string, string> = {
  INGREDIENTE: "Ingrediente",
  PACKAGING: "Packaging",
  OTRO: "Otro",
};

export function EditarInsumoDialog({
  insumoId,
  nombre,
  tipo,
  unidadMedida,
  stockMinimo,
}: {
  insumoId: string;
  nombre: string;
  tipo: string;
  unidadMedida: string;
  stockMinimo: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const idSufijo = insumoId;

  function handleSubmit(formData: FormData) {
    formData.set("insumoId", insumoId);
    startTransition(async () => {
      const result = await editarInsumo(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Insumo actualizado");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Editar
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar insumo</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`nombre-${idSufijo}`}>Nombre</Label>
            <Input id={`nombre-${idSufijo}`} name="nombre" required defaultValue={nombre} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`tipo-${idSufijo}`}>Tipo</Label>
            <Select name="tipo" defaultValue={tipo}>
              <SelectTrigger id={`tipo-${idSufijo}`}>
                <SelectValue>
                  {(value) => TIPO_LABEL[value as string] ?? "Tipo"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INGREDIENTE">Ingrediente</SelectItem>
                <SelectItem value="PACKAGING">Packaging</SelectItem>
                <SelectItem value="OTRO">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`unidad-${idSufijo}`}>Unidad de medida</Label>
              <Input
                id={`unidad-${idSufijo}`}
                name="unidadMedida"
                required
                defaultValue={unidadMedida}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`min-${idSufijo}`}>Stock mínimo</Label>
              <Input
                id={`min-${idSufijo}`}
                name="stockMinimo"
                type="number"
                step="0.001"
                defaultValue={stockMinimo}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Esto no toca el costo ni el stock actual — eso se edita aparte.
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
