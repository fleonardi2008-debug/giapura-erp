"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EnvioGratisCalculator({
  contribucionMarginal,
  precioVenta,
}: {
  contribucionMarginal: number | null;
  precioVenta: number | null;
}) {
  const [costoEnvio, setCostoEnvio] = useState("");

  const costo = parseFloat(costoEnvio);
  const puedeCalcular =
    !isNaN(costo) && costo > 0 && contribucionMarginal !== null && contribucionMarginal > 0;

  const unidadesNecesarias = puedeCalcular
    ? Math.ceil(costo / (contribucionMarginal as number))
    : null;
  const montoMinimo =
    unidadesNecesarias && precioVenta ? unidadesNecesarias * precioVenta : null;

  return (
    <div className="space-y-3">
      <div className="max-w-xs space-y-2">
        <Label htmlFor="costoEnvio">Costo de envío del pedido</Label>
        <Input
          id="costoEnvio"
          type="number"
          step="0.01"
          placeholder="Ej: 3000"
          value={costoEnvio}
          onChange={(e) => setCostoEnvio(e.target.value)}
        />
      </div>

      {!contribucionMarginal && (
        <p className="text-sm text-muted-foreground">
          Cargá un precio de venta en &quot;Editar economía&quot; para poder calcular esto.
        </p>
      )}

      {contribucionMarginal !== null && costoEnvio && !puedeCalcular && (
        <p className="text-sm text-muted-foreground">Ingresá un costo de envío mayor a 0.</p>
      )}

      {unidadesNecesarias !== null && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Unidades necesarias en el pedido</p>
            <p className="text-xl font-semibold">{unidadesNecesarias}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Monto mínimo del pedido</p>
            <p className="text-xl font-semibold">
              {montoMinimo ? `$${montoMinimo.toFixed(2)}` : "—"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
