"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleInsumoActivo } from "@/lib/actions/insumos";

export function ToggleInsumoActivoButton({
  insumoId,
  activo,
}: {
  insumoId: string;
  /** Estado ACTUAL del insumo: true = está activo (el botón lo desactiva). */
  activo: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await toggleInsumoActivo(insumoId, !activo);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(activo ? "Insumo desactivado" : "Insumo reactivado");
    });
  }

  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={toggle}>
      {activo ? "Desactivar" : "Reactivar"}
    </Button>
  );
}
