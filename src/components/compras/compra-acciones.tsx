"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelarCompra, marcarCompraRecibida } from "@/lib/actions/compras";

export function CompraAcciones({ compraId }: { compraId: string }) {
  const [pending, startTransition] = useTransition();

  function recibir() {
    startTransition(async () => {
      const result = await marcarCompraRecibida(compraId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Recibida: ya suma al stock disponible");
    });
  }

  function cancelar() {
    if (!confirm("¿Cancelar esta compra? Deja de contar como plata gastada.")) return;
    startTransition(async () => {
      const result = await cancelarCompra(compraId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Compra cancelada");
    });
  }

  return (
    <div className="flex justify-end gap-2">
      <Button size="sm" disabled={pending} onClick={recibir}>
        Llegó a la fábrica
      </Button>
      <Button variant="ghost" size="sm" disabled={pending} onClick={cancelar}>
        Cancelar
      </Button>
    </div>
  );
}
