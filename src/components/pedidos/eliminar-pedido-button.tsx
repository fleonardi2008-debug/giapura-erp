"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deletePedido } from "@/lib/actions/pedidos";

export function EliminarPedidoButton({ pedidoId }: { pedidoId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deletePedido(pedidoId);
          toast.success("Pedido eliminado");
        })
      }
    >
      Eliminar
    </Button>
  );
}
