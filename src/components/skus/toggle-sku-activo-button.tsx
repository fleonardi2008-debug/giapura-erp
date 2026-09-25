"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleSkuActivo } from "@/lib/actions/skus";

export function ToggleSkuActivoButton({
  skuId,
  activo,
}: {
  skuId: string;
  /** Estado ACTUAL del producto: true = está activo (el botón lo desactiva). */
  activo: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    if (activo && !confirm("¿Desactivar este producto? Deja de aparecer en Productos y en Zona Sur. Se puede reactivar cuando quieras.")) {
      return;
    }
    startTransition(async () => {
      const result = await toggleSkuActivo(skuId, !activo);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(activo ? "Producto desactivado" : "Producto reactivado");
    });
  }

  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={toggle}>
      {activo ? "Desactivar" : "Reactivar"}
    </Button>
  );
}
