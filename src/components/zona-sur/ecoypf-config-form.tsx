"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { guardarEcoYpfConfig } from "@/lib/actions/ecoypf";

export function EcoYpfConfigForm({ config }: { config: { radioKm: string; precioEnvio: string; fechaEntrega: string } }) {
  const [pending, startTransition] = useTransition();

  function guardar(formData: FormData) {
    startTransition(async () => {
      try {
        const res = await guardarEcoYpfConfig(formData);
        if (res?.error) toast.error(res.error);
        else toast.success("Guardado");
      } catch {
        toast.error("No se pudo guardar. Probá de nuevo.");
      }
    });
  }

  return (
    <form action={guardar} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Entrega</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="ecoFechaEntrega">Fecha de entrega (se muestra en la página)</Label>
            <Input id="ecoFechaEntrega" name="ecoFechaEntrega" defaultValue={config.fechaEntrega} placeholder="Domingo 29 de noviembre" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ecoPrecioEnvio">Precio del envío a domicilio</Label>
            <Input id="ecoPrecioEnvio" name="ecoPrecioEnvio" inputMode="decimal" defaultValue={config.precioEnvio} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ecoRadioKm">Radio del envío (km)</Label>
            <Input id="ecoRadioKm" name="ecoRadioKm" inputMode="decimal" defaultValue={config.radioKm} required />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-3">
            Dentro de ese radio el envío a domicilio cuesta el precio indicado (el centro es el mismo de Zona Sur). Fuera del radio,
            la persona elige envío por Andreani. Los precios de los productos son los de IMPA y no hay límite de stock.
          </p>
        </CardContent>
      </Card>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
