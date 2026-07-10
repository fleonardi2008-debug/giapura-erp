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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { crearPlanTarea } from "@/lib/actions/plan";
import { PLAN_FASES_BASE, estimarPuntos } from "@/lib/plan";

export function NuevaTareaDialog({ faseNumInicial }: { faseNumInicial: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [faseNum, setFaseNum] = useState(faseNumInicial);
  const [texto, setTexto] = useState("");
  const [puntosManual, setPuntosManual] = useState<number | null>(null);

  const estimacion = estimarPuntos(faseNum, texto);
  const puntos = puntosManual ?? estimacion.puntos;

  // Los cuatro diálogos (uno por fase) conviven en el DOM: los ids deben ser únicos
  // o los Label terminan apuntando al input de otra fase.
  const idFase = `faseNum-${faseNumInicial}`;
  const idTexto = `texto-${faseNumInicial}`;
  const idPuntos = `puntos-${faseNumInicial}`;

  function reset() {
    setFaseNum(faseNumInicial);
    setTexto("");
    setPuntosManual(null);
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await crearPlanTarea(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Tarea agregada · +${puntos} pts`);
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
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            + Agregar tarea
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva tarea</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={idFase}>Fase</Label>
            <Select name="faseNum" value={faseNum} onValueChange={(v) => setFaseNum(v as string)}>
              <SelectTrigger id={idFase} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAN_FASES_BASE.map((fase) => (
                  <SelectItem key={fase.num} value={fase.num}>
                    {fase.num} · {fase.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={idTexto}>Tarea</Label>
            <Input
              id={idTexto}
              name="texto"
              required
              autoComplete="off"
              placeholder="Ej: Grabar el reel de la sesión de fotos"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={idPuntos}>Puntos</Label>
            <div className="flex items-center gap-3">
              <Input
                id={idPuntos}
                name="puntos"
                type="number"
                min={1}
                max={50}
                className="w-24"
                value={puntos}
                onChange={(e) => setPuntosManual(Number(e.target.value))}
              />
              {puntosManual !== null && puntosManual !== estimacion.puntos && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPuntosManual(null)}
                >
                  Volver a +{estimacion.puntos}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Sugerido <span className="font-mono font-semibold">+{estimacion.puntos}</span> —{" "}
              {estimacion.razon}
            </p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Agregar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
