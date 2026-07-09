"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleInsumoActivo } from "@/lib/actions/insumos";

export function DesactivarInsumoButton({ insumoId }: { insumoId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleInsumoActivo(insumoId, false);
          toast.success("Insumo desactivado");
        })
      }
    >
      Desactivar
    </Button>
  );
}
