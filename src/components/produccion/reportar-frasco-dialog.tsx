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
import { fabricaReportarFrasco } from "@/lib/actions/produccion";

type Frasco = { id: string; nombre: string };

export function ReportarFrascoDialog({ frascos }: { frascos: Frasco[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [skuId, setSkuId] = useState("");

  function reset() {
    setSkuId("");
  }

  function handleSubmit(formData: FormData) {
    formData.set("skuId", skuId);
    startTransition(async () => {
      const result = await fabricaReportarFrasco(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Producción cargada");
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
      <DialogTrigger render={<Button>Reportar frascos producidos</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Frascos producidos</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="frasco">Frasco</Label>
            <Select value={skuId} onValueChange={(v) => setSkuId((v as string) ?? "")}>
              <SelectTrigger id="frasco" className="w-full">
                <SelectValue placeholder="Elegí un frasco">
                  {(value) => frascos.find((f) => f.id === value)?.nombre ?? "Elegí un frasco"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {frascos.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad producida</Label>
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
            <Input id="nota" name="nota" placeholder="Ej: turno tarde" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || !skuId}>
              {pending ? "Guardando..." : "Registrar producción"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
