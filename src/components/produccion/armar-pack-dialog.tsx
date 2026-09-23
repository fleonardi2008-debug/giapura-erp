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
import { armarPack } from "@/lib/actions/produccion";

type Pack = {
  id: string;
  nombre: string;
  /** Cuántos packs se pueden armar con el stock de frascos disponible ahora mismo. */
  maxArmables: number;
  composicionTexto: string;
};

export function ArmarPackDialog({ packs }: { packs: Pack[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [packId, setPackId] = useState("");

  const pack = packs.find((p) => p.id === packId);

  function reset() {
    setPackId("");
  }

  function handleSubmit(formData: FormData) {
    formData.set("packId", packId);
    startTransition(async () => {
      const result = await armarPack(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Pack armado y sumado al stock");
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
      <DialogTrigger render={<Button variant="outline">Armar packs</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Armar packs</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pack">Pack</Label>
            <Select value={packId} onValueChange={(v) => setPackId((v as string) ?? "")}>
              <SelectTrigger id="pack" className="w-full">
                <SelectValue placeholder="Elegí un pack">
                  {(value) => packs.find((p) => p.id === value)?.nombre ?? "Elegí un pack"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {packs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pack && (
              <p className="text-xs text-muted-foreground">
                Lleva {pack.composicionTexto}. Con el stock de frascos de ahora podés armar hasta{" "}
                <span className="font-medium text-foreground">{pack.maxArmables}</span>.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad a armar</Label>
              <Input id="cantidad" name="cantidad" type="number" step="1" min="1" required />
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="nota">Nota (opcional)</Label>
            <Input id="nota" name="nota" placeholder="Ej: para el envío del jueves" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || !packId}>
              {pending ? "Armando..." : "Armar y sumar al stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
