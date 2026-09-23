"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { marcarCompraRecibida } from "@/lib/actions/compras";

export function ConfirmarLlegadaButton({ compraId }: { compraId: string }) {
  const [pending, startTransition] = useTransition();

  function confirmar() {
    startTransition(async () => {
      const result = await marcarCompraRecibida(compraId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Confirmado: ya suma al stock disponible");
    });
  }

  return (
    <Button size="sm" disabled={pending} onClick={confirmar}>
      {pending ? "Confirmando..." : "Llegó"}
    </Button>
  );
}
