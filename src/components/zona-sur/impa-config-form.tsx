"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { guardarImpaConfig } from "@/lib/actions/impa";

type Producto = {
  id: string;
  nombre: string;
  esPack: boolean;
  precio: string;
  tachado: string;
  /** Cuántos quedan hoy (solo frascos); null = nunca se cargó stock */
  quedan: string | null;
};

export function ImpaConfigForm({
  config,
  productos,
}: {
  config: { dias: string; opciones: string; lugar: string };
  productos: Producto[];
}) {
  const [pending, startTransition] = useTransition();
  const frascos = productos.filter((p) => !p.esPack);

  function guardar(formData: FormData) {
    startTransition(async () => {
      try {
        const res = await guardarImpaConfig(formData);
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
          <CardTitle>Precios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Dejá el precio vacío para que el producto no aparezca en la página del IMPA. El precio tachado es el de lista:
            se muestra tachado y arriba de la foto sale el % de descuento.
          </p>
          <div className="space-y-2">
            {productos.map((p) => (
              <div key={p.id} className="grid items-end gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_9rem_9rem]">
                <div className="text-sm font-medium">
                  {p.nombre} <span className="font-normal text-muted-foreground">({p.esPack ? "pack" : "suelto"})</span>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`precio_${p.id}`} className="text-xs">
                    Precio de venta
                  </Label>
                  <Input id={`precio_${p.id}`} name={`precio_${p.id}`} inputMode="decimal" defaultValue={p.precio} placeholder="Ej: 5900" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`tachado_${p.id}`} className="text-xs">
                    Precio tachado
                  </Label>
                  <Input id={`tachado_${p.id}`} name={`tachado_${p.id}`} inputMode="decimal" defaultValue={p.tachado} placeholder="Ej: 6670" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Retiro en el IMPA</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="impaDias">Días de retiro (uno por línea)</Label>
            <Textarea id="impaDias" name="impaDias" rows={5} defaultValue={config.dias} placeholder={"Martes 11/11\nJueves 13/11"} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="impaOpciones">Momentos de cada día (uno por línea)</Label>
            <Textarea
              id="impaOpciones"
              name="impaOpciones"
              rows={5}
              defaultValue={config.opciones}
              placeholder={"A la entrada\nA la salida"}
            />
            <p className="text-xs text-muted-foreground">Podés poner la hora: &quot;A la entrada (7:15hs)&quot;.</p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="impaLugar">Dónde se retira</Label>
            <Input id="impaLugar" name="impaLugar" defaultValue={config.lugar} placeholder="Ej: IMPA, en el estacionamiento antes de la barrera" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock (compartido con Zona Sur)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Escribí cuántos frascos te quedan HOY de cada uno. Los pedidos de las dos páginas y los que cargás a mano van
            descontando de acá. Dejalo vacío para no tocarlo.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {frascos.map((p) => (
              <div key={p.id} className="space-y-1">
                <Label htmlFor={`quedan_${p.id}`}>{p.nombre}</Label>
                <Input
                  id={`quedan_${p.id}`}
                  name={`quedan_${p.id}`}
                  inputMode="numeric"
                  defaultValue={p.quedan ?? ""}
                  placeholder={p.quedan == null ? "Sin stock cargado" : ""}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
