"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleUsuarioActivo } from "@/lib/actions/usuarios";

export function ToggleUsuarioButton({ userId, activo }: { userId: string; activo: boolean }) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await toggleUsuarioActivo(userId, !activo);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(activo ? "Usuario desactivado" : "Usuario reactivado");
    });
  }

  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={toggle}>
      {activo ? "Desactivar" : "Reactivar"}
    </Button>
  );
}
