"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { eliminarLote } from "@/lib/actions/lotes";

export function EliminarLoteButton({
  loteId,
  recibido,
}: {
  loteId: string;
  /** Si ya estaba recibido, borrarlo también revierte el stock que sumó/descontó. */
  recibido: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function eliminar() {
    const confirmacion = recibido
      ? "Este lote ya sumó stock y descontó insumos/frascos. Borrarlo revierte todo eso. ¿Seguro?"
      : "¿Borrar este lote?";
    if (!confirm(confirmacion)) return;

    startTransition(async () => {
      const result = await eliminarLote(loteId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Lote eliminado");
    });
  }

  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={eliminar}>
      Eliminar
    </Button>
  );
}
