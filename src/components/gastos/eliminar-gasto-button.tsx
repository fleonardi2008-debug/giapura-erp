"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteGasto } from "@/lib/actions/gastos";

export function EliminarGastoButton({ gastoId }: { gastoId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deleteGasto(gastoId);
          toast.success("Gasto eliminado");
        })
      }
    >
      Eliminar
    </Button>
  );
}
