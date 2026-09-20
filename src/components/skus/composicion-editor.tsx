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
import { setComposicion } from "@/lib/actions/skus";

type Frasco = { id: string; nombre: string };
type Row = { key: string; componenteId: string; cantidad: string };

export function ComposicionEditor({
  packId,
  frascos,
  initialItems,
}: {
  packId: string;
  frascos: Frasco[];
  initialItems: { componenteId: string; cantidad: number }[];
}) {
  const [rows, setRows] = useState<Row[]>(
    initialItems.length > 0
      ? initialItems.map((item, i) => ({
          key: `${i}-${item.componenteId}`,
          componenteId: item.componenteId,
          cantidad: String(item.cantidad),
        }))
      : [{ key: "0", componenteId: "", cantidad: "1" }]
  );
  const [pending, startTransition] = useTransition();

  function addRow() {
    setRows((r) => [...r, { key: `${Date.now()}`, componenteId: "", cantidad: "1" }]);
  }

  function removeRow(key: string) {
    setRows((r) => r.filter((row) => row.key !== key));
  }

  function updateRow(key: string, field: "componenteId" | "cantidad", value: string | null) {
    setRows((r) => r.map((row) => (row.key === key ? { ...row, [field]: value ?? "" } : row)));
  }

  function handleSave() {
    const formData = new FormData();
    for (const row of rows) {
      if (!row.componenteId || !row.cantidad) continue;
      formData.append("componenteId", row.componenteId);
      formData.append("cantidad", row.cantidad);
    }

    startTransition(async () => {
      const result = await setComposicion(packId, formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Composición guardada");
    });
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center gap-2">
          <Select
            value={row.componenteId}
            onValueChange={(v) => updateRow(row.key, "componenteId", v)}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Frasco">
                {(value) => frascos.find((f) => f.id === value)?.nombre ?? "Frasco"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {frascos.map((frasco) => (
                <SelectItem key={frasco.id} value={frasco.id}>
                  {frasco.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min="1"
            step="1"
            placeholder="Cantidad"
            className="w-32"
            value={row.cantidad}
            onChange={(e) => updateRow(row.key, "cantidad", e.target.value)}
          />
          <span className="text-sm text-muted-foreground">frascos por pack</span>
          <Button variant="ghost" size="sm" onClick={() => removeRow(row.key)}>
            Quitar
          </Button>
        </div>
      ))}
      {frascos.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Todavía no hay frascos cargados. Creá primero los frascos y después armá el pack.
        </p>
      )}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={addRow} type="button">
          Agregar frasco
        </Button>
        <Button size="sm" onClick={handleSave} disabled={pending} type="button">
          {pending ? "Guardando..." : "Guardar composición"}
        </Button>
      </div>
    </div>
  );
}
