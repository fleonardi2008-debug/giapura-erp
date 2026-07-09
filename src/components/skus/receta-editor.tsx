"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createReceta } from "@/lib/actions/skus";

type Insumo = { id: string; nombre: string; unidadMedida: string };
type Row = { key: string; insumoId: string; cantidad: string };

export function RecetaEditor({
  skuId,
  insumos,
  initialItems,
}: {
  skuId: string;
  insumos: Insumo[];
  initialItems: { insumoId: string; cantidadPorUnidad: string }[];
}) {
  const [rows, setRows] = useState<Row[]>(
    initialItems.length > 0
      ? initialItems.map((item, i) => ({
          key: `${i}-${item.insumoId}`,
          insumoId: item.insumoId,
          cantidad: item.cantidadPorUnidad,
        }))
      : [{ key: "0", insumoId: "", cantidad: "" }]
  );
  const [pending, startTransition] = useTransition();

  function addRow() {
    setRows((r) => [...r, { key: `${Date.now()}`, insumoId: "", cantidad: "" }]);
  }

  function removeRow(key: string) {
    setRows((r) => r.filter((row) => row.key !== key));
  }

  function updateRow(key: string, field: "insumoId" | "cantidad", value: string | null) {
    setRows((r) => r.map((row) => (row.key === key ? { ...row, [field]: value ?? "" } : row)));
  }

  function handleSave() {
    const formData = new FormData();
    for (const row of rows) {
      if (!row.insumoId || !row.cantidad) continue;
      formData.append("insumoId", row.insumoId);
      formData.append("cantidadPorUnidad", row.cantidad);
    }

    startTransition(async () => {
      const result = await createReceta(skuId, formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Receta guardada como nueva versión");
    });
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center gap-2">
          <Select value={row.insumoId} onValueChange={(v) => updateRow(row.key, "insumoId", v)}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Insumo" />
            </SelectTrigger>
            <SelectContent>
              {insumos.map((insumo) => (
                <SelectItem key={insumo.id} value={insumo.id}>
                  {insumo.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            step="0.0001"
            placeholder="Cantidad por unidad"
            className="w-40"
            value={row.cantidad}
            onChange={(e) => updateRow(row.key, "cantidad", e.target.value)}
          />
          <span className="text-sm text-muted-foreground">
            {insumos.find((i) => i.id === row.insumoId)?.unidadMedida}
          </span>
          <Button variant="ghost" size="sm" onClick={() => removeRow(row.key)}>
            Quitar
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={addRow} type="button">
          Agregar insumo
        </Button>
        <Button size="sm" onClick={handleSave} disabled={pending} type="button">
          {pending ? "Guardando..." : "Guardar receta (nueva versión)"}
        </Button>
      </div>
    </div>
  );
}
