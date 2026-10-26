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
import { achicarImagen } from "@/lib/achicar-imagen";

export function EditarImagenDialog({
  skuId,
  imagenUrl,
  posX = 50,
  posY = 50,
  zoom = 100,
}: {
  skuId: string;
  imagenUrl: string | null;
  posX?: number;
  posY?: number;
  zoom?: number;
}) {
  const [open, setOpen] = useState(false);
  const [x, setX] = useState(posX);
  const [y, setY] = useState(posY);
  const [z, setZ] = useState(zoom);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    formData.set("skuId", skuId);
    startTransition(async () => {
      const elegido = formData.get("archivo");
      if (elegido instanceof File && elegido.size > 0) {
        try {
          formData.set("archivo", await achicarImagen(elegido));
        } catch {
          toast.error("No pude leer esa imagen. Probá con otra (JPG o PNG).");
          return;
        }
      }
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
            <Label htmlFor="archivo">Subir una foto desde tu compu o celular</Label>
            <Input id="archivo" name="archivo" type="file" accept="image/*" />
            <p className="text-xs text-muted-foreground">
              Se achica sola para que la página cargue rápido. Si elegís un archivo, se usa en lugar del link de abajo.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="imagenUrl">O pegá el link de una foto</Label>
            <Input id="imagenUrl" name="imagenUrl" type="url" placeholder="https://..." defaultValue={imagenUrl ?? ""} />
            <p className="text-xs text-muted-foreground">
              Se usa en páginas de venta propias, como /zona-sur. Podés usar el mismo link de la foto que ya
              tenés subida en Shopify (Contenido → Archivos → clic derecho en la imagen → Copiar dirección del
              enlace).
            </p>
          </div>
          {imagenUrl && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Encuadre en la página</p>
              <div className="flex flex-wrap items-center gap-4">
                {/* Misma forma que en /zona-sur: cuadrado que recorta la foto. */}
                <div className="h-40 w-40 overflow-hidden rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagenUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    style={{ objectPosition: `${x}% ${y}%`, transform: `scale(${z / 100})`, transformOrigin: `${x}% ${y}%` }}
                  />
                </div>
                <div className="min-w-48 flex-1 space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="imagenZoom">Zoom ({z}%)</Label>
                    <input
                      id="imagenZoom"
                      name="imagenZoom"
                      type="range"
                      min={100}
                      max={300}
                      step={5}
                      value={z}
                      onChange={(e) => setZ(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="imagenPosX">Izquierda ↔ derecha</Label>
                    <input
                      id="imagenPosX"
                      name="imagenPosX"
                      type="range"
                      min={0}
                      max={100}
                      value={x}
                      onChange={(e) => setX(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="imagenPosY">Arriba ↕ abajo</Label>
                    <input
                      id="imagenPosY"
                      name="imagenPosY"
                      type="range"
                      min={0}
                      max={100}
                      value={y}
                      onChange={(e) => setY(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Con el zoom acercás la foto y con los otros dos deslizadores la movés hasta que el frasco quede
                centrado. Sin zoom, si la foto es casi cuadrada casi no hay margen para mover.
              </p>
            </div>
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
