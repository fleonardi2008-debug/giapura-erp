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
import { updateSkuImagen } from "@/lib/actions/skus";

export function EditarImagenDialog({ skuId, imagenUrl }: { skuId: string; imagenUrl: string | null }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    formData.set("skuId", skuId);
    startTransition(async () => {
      const result = await updateSkuImagen(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Foto actualizada");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {imagenUrl ? "Cambiar foto" : "Agregar foto"}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Foto del producto</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="imagenUrl">Link de la foto</Label>
            <Input id="imagenUrl" name="imagenUrl" type="url" placeholder="https://..." defaultValue={imagenUrl ?? ""} />
            <p className="text-xs text-muted-foreground">
              Se usa en páginas de venta propias, como /zona-sur. Podés usar el mismo link de la foto que ya
              tenés subida en Shopify (Contenido → Archivos → clic derecho en la imagen → Copiar dirección del
              enlace).
            </p>
          </div>
          {imagenUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagenUrl} alt="" className="h-32 w-32 rounded-lg border object-cover" />
          )}
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
