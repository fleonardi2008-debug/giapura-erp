"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  sincronizarProductos,
  reenviarStockAhora,
  desconectarTiendaNube,
} from "@/lib/actions/tiendanube";

export function IntegracionesActions() {
  const [pendingSync, startSync] = useTransition();
  const [pendingStock, startStock] = useTransition();
  const [pendingDisconnect, startDisconnect] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pendingSync}
        onClick={() =>
          startSync(async () => {
            const result = await sincronizarProductos();
            if ("error" in result) {
              toast.error(result.error);
              return;
            }
            toast.success(
              `Sincronizado: ${result.matcheados.length} producto(s) mapeados` +
                (result.sinMatch.length > 0
                  ? `, sin match: ${result.sinMatch.join(", ")}`
                  : "")
            );
          })
        }
      >
        {pendingSync ? "Sincronizando..." : "Sincronizar productos"}
      </Button>

      <Button
        variant="outline"
        size="sm"
        disabled={pendingStock}
        onClick={() =>
          startStock(async () => {
            const result = await reenviarStockAhora();
            if ("error" in result) {
              toast.error(result.error);
              return;
            }
            toast.success(`Stock reenviado para ${result.cantidad} producto(s)`);
          })
        }
      >
        {pendingStock ? "Enviando..." : "Reenviar stock ahora"}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        disabled={pendingDisconnect}
        onClick={() =>
          startDisconnect(async () => {
            await desconectarTiendaNube();
            toast.success("Desconectado de Tienda Nube");
          })
        }
      >
        Desconectar
      </Button>
    </div>
  );
}
