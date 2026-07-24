"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  crearBloque,
  actualizarBloque,
  toggleBloqueVisible,
  moverBloque,
  eliminarBloque,
} from "@/lib/actions/club";

type Bloque = {
  id: string;
  tipo: string;
  titulo: string | null;
  cuerpo: string | null;
  codigo: string | null;
  ctaTexto: string | null;
  ctaUrl: string | null;
  mediaUrl: string | null;
  visible: boolean;
  orden: number;
};

const TIPOS = [
  { value: "TEXTO", label: "Texto" },
  { value: "VIDEO", label: "Video" },
  { value: "DESCUENTO", label: "Descuento" },
  { value: "ENCUESTA", label: "Encuesta" },
  { value: "INVITACION", label: "Invitación" },
  { value: "IMAGEN", label: "Imagen" },
];

const TIPO_LABEL: Record<string, string> = Object.fromEntries(
  TIPOS.map((t) => [t.value, t.label])
);

function BloqueForm({
  bloque,
  onDone,
}: {
  bloque?: Bloque;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = bloque
        ? await actualizarBloque(bloque.id, formData)
        : await crearBloque(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(bloque ? "Bloque actualizado" : "Bloque creado");
      onDone();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tipo">Tipo de bloque</Label>
        <Select name="tipo" defaultValue={bloque?.tipo ?? "TEXTO"}>
          <SelectTrigger id="tipo" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          El tipo define el ícono y el estilo con que se muestra en la página.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="titulo">Título (opcional)</Label>
        <Input id="titulo" name="titulo" defaultValue={bloque?.titulo ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cuerpo">Texto (opcional)</Label>
        <Textarea id="cuerpo" name="cuerpo" defaultValue={bloque?.cuerpo ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="codigo">Código de descuento (opcional)</Label>
        <Input id="codigo" name="codigo" defaultValue={bloque?.codigo ?? ""} placeholder="Ej: FUNDADOR15" />
        <p className="text-xs text-muted-foreground">
          Si lo completás, en la página aparece en un recuadro destacado con botón
          &quot;Copiar&quot;.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="mediaUrl">Link de video o imagen (opcional)</Label>
        <Input
          id="mediaUrl"
          name="mediaUrl"
          defaultValue={bloque?.mediaUrl ?? ""}
          placeholder="https://... (YouTube/Vimeo para video, o URL de una imagen)"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ctaTexto">Texto del botón (opcional)</Label>
          <Input id="ctaTexto" name="ctaTexto" defaultValue={bloque?.ctaTexto ?? ""} placeholder="Ver más" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ctaUrl">Link del botón (opcional)</Label>
          <Input
            id="ctaUrl"
            name="ctaUrl"
            defaultValue={bloque?.ctaUrl ?? ""}
            placeholder="https://..."
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Guardar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function EditarBloqueDialog({ bloque }: { bloque: Bloque }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm">Editar</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar bloque</DialogTitle>
        </DialogHeader>
        <BloqueForm bloque={bloque} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function NuevoBloqueDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Nuevo bloque</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo bloque</DialogTitle>
        </DialogHeader>
        <BloqueForm onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function AccionesBloque({ bloque, esPrimero, esUltimo }: { bloque: Bloque; esPrimero: boolean; esUltimo: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={pending || esPrimero}
        onClick={() => startTransition(() => moverBloque(bloque.id, "arriba"))}
        title="Subir"
      >
        ↑
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending || esUltimo}
        onClick={() => startTransition(() => moverBloque(bloque.id, "abajo"))}
        title="Bajar"
      >
        ↓
      </Button>
      <EditarBloqueDialog bloque={bloque} />
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await toggleBloqueVisible(bloque.id, !bloque.visible);
            toast.success(bloque.visible ? "Bloque oculto" : "Bloque visible");
          })
        }
      >
        {bloque.visible ? "Ocultar" : "Mostrar"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm("¿Eliminar este bloque?")) return;
          startTransition(async () => {
            await eliminarBloque(bloque.id);
            toast.success("Bloque eliminado");
          });
        }}
      >
        Eliminar
      </Button>
    </div>
  );
}

export function BloquesPanel({ bloques }: { bloques: Bloque[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Estos bloques son la parte que cambia con el tiempo (descuento, video, encuesta,
          invitación...). Se muestran en la página en este orden.
        </p>
        <NuevoBloqueDialog />
      </div>

      <div className="space-y-3">
        {bloques.map((bloque, i) => (
          <div
            key={bloque.id}
            className="flex flex-col gap-2 rounded-xl border border-border p-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{TIPO_LABEL[bloque.tipo] ?? bloque.tipo}</Badge>
                {!bloque.visible && <Badge variant="outline">Oculto</Badge>}
              </div>
              {bloque.titulo && <p className="font-medium">{bloque.titulo}</p>}
              {bloque.cuerpo && (
                <p className="line-clamp-2 text-sm text-muted-foreground">{bloque.cuerpo}</p>
              )}
              {bloque.mediaUrl && (
                <p className="truncate text-xs text-muted-foreground">{bloque.mediaUrl}</p>
              )}
            </div>
            <AccionesBloque
              bloque={bloque}
              esPrimero={i === 0}
              esUltimo={i === bloques.length - 1}
            />
          </div>
        ))}
        {bloques.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Todavía no hay bloques. Creá el primero (por ejemplo, el descuento de
            lanzamiento).
          </p>
        )}
      </div>
    </div>
  );
}
