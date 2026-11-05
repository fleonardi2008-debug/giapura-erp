"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { guardarImpaConfig } from "@/lib/actions/impa";
import { serializarDiasImpa, type DiaImpa } from "@/lib/impa";

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
  config: { dias: DiaImpa[]; lugar: string };
  productos: Producto[];
}) {
  const [pending, startTransition] = useTransition();
  const frascos = productos.filter((p) => !p.esPack);
  // Cada día se edita en una fila: el nombre del día y, aparte, qué momentos hay ese día (con la hora si querés).
  const [filas, setFilas] = useState(() =>
    (config.dias.length > 0 ? config.dias : [{ dia: "", opciones: ["A la entrada", "A la salida"] }]).map((d) => ({
      dia: d.dia,
      entrada: d.opciones.find((o) => /entrada/i.test(o)) ?? "",
      salida: d.opciones.find((o) => /salida/i.test(o)) ?? "",
      otros: d.opciones.filter((o) => !/entrada|salida/i.test(o)),
    }))
  );
  const cambiarFila = (i: number, campo: "dia" | "entrada" | "salida", valor: string) =>
    setFilas((fs) => fs.map((f, k) => (k === i ? { ...f, [campo]: valor } : f)));
  const diasParaGuardar = serializarDiasImpa(
    filas
      .filter((f) => f.dia.trim())
      .map((f) => ({
        dia: f.dia.trim(),
        opciones: [f.entrada.trim(), f.salida.trim(), ...f.otros].filter(Boolean),
      }))
      .filter((d) => d.opciones.length > 0)
  );

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
          <div className="space-y-3 sm:col-span-2">
            <input type="hidden" name="impaDias" value={diasParaGuardar} />
            <p className="text-sm text-muted-foreground">
              Un renglón por día. Escribí el momento solo en los que hay: si dejás la salida vacía, ese día solo se puede retirar
              a la entrada. Podés poner la hora, por ejemplo &quot;A la entrada 7:15 am&quot;.
            </p>
            {filas.map((f, i) => (
              <div key={i} className="grid items-end gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <div className="space-y-1">
                  <Label htmlFor={`dia_${i}`} className="text-xs">
                    Día
                  </Label>
                  <Input id={`dia_${i}`} value={f.dia} onChange={(e) => cambiarFila(i, "dia", e.target.value)} placeholder="Jueves 12/11" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`entrada_${i}`} className="text-xs">
                    A la entrada
                  </Label>
                  <Input
                    id={`entrada_${i}`}
                    value={f.entrada}
                    onChange={(e) => cambiarFila(i, "entrada", e.target.value)}
                    placeholder="A la entrada 7:15 am"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`salida_${i}`} className="text-xs">
                    A la salida
                  </Label>
                  <Input
                    id={`salida_${i}`}
                    value={f.salida}
                    onChange={(e) => cambiarFila(i, "salida", e.target.value)}
                    placeholder="A la salida 12:30 (vacío = no hay)"
                  />
                </div>
                <Button type="button" variant="outline" onClick={() => setFilas((fs) => fs.filter((_, k) => k !== i))}>
                  Quitar
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setFilas((fs) => [...fs, { dia: "", entrada: "A la entrada", salida: "A la salida", otros: [] }])}
            >
              Agregar día
            </Button>
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
