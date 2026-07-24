"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  crearHistorialItem,
  toggleHistorialItem,
  eliminarHistorialItem,
} from "@/lib/actions/club";

type Item = {
  id: string;
  titulo: string;
  desbloqueado: boolean;
};

function NuevoItemDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await crearHistorialItem(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Hito agregado");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Nuevo hito</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo hito del historial</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              name="titulo"
              required
              placeholder="Ej: Descuento lanzamiento nacional"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="desbloqueado" className="size-4" />
            Marcar como desbloqueado (✓)
          </label>
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

function AccionesItem({ item }: { item: Item }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await toggleHistorialItem(item.id, !item.desbloqueado);
            toast.success(item.desbloqueado ? "Marcado como bloqueado" : "Marcado como desbloqueado");
          })
        }
      >
        {item.desbloqueado ? "Bloquear" : "Desbloquear"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm("¿Eliminar este hito?")) return;
          startTransition(async () => {
            await eliminarHistorialItem(item.id);
            toast.success("Hito eliminado");
          });
        }}
      >
        Eliminar
      </Button>
    </div>
  );
}

export function HistorialPanel({ items }: { items: Item[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Los hitos que ve el fundador. Los desbloqueados aparecen con ✓; los bloqueados,
          con 🔒. Hace que el acceso se sienta vivo.
        </p>
        <NuevoItemDialog />
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-xl border border-border p-3"
          >
            <div className="flex items-center gap-2">
              <span aria-hidden>{item.desbloqueado ? "✓" : "🔒"}</span>
              <span className={item.desbloqueado ? "" : "text-muted-foreground"}>
                {item.titulo}
              </span>
              <Badge variant={item.desbloqueado ? "secondary" : "outline"}>
                {item.desbloqueado ? "Desbloqueado" : "Bloqueado"}
              </Badge>
            </div>
            <AccionesItem item={item} />
          </div>
        ))}
        {items.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Todavía no hay hitos en el historial.
          </p>
        )}
      </div>
    </div>
  );
}
