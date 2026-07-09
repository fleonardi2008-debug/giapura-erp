"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { marcarLoteRecibido } from "@/lib/actions/lotes";

export function MarcarRecibidoButton({ loteId }: { loteId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await marcarLoteRecibido(loteId);
          if (result?.error) {
            toast.error(result.error);
            return;
          }
          toast.success("Lote recibido: stock actualizado");
        })
      }
    >
      {pending ? "Procesando..." : "Marcar recibido"}
    </Button>
  );
}
