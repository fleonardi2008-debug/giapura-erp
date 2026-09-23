"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { actualizarEstadoZonaSurPedido } from "@/lib/actions/zona-sur";
import { ZonaSurEstado } from "@/generated/prisma/client";

const ESTADO_LABEL: Record<ZonaSurEstado, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

export function EstadoPedidoSelect({ pedidoId, estado }: { pedidoId: string; estado: ZonaSurEstado }) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={estado}
      disabled={pending}
      onValueChange={(valor) =>
        startTransition(async () => {
          await actualizarEstadoZonaSurPedido(pedidoId, valor as ZonaSurEstado);
          toast.success("Estado actualizado");
        })
      }
    >
      <SelectTrigger size="sm" className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(ESTADO_LABEL).map(([valor, label]) => (
          <SelectItem key={valor} value={valor}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
