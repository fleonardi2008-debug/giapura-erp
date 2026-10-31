"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { guardarNotaZonaSurPedido, pasarPedidoARetiroCasa, pasarPedidoAEnvioDomicilio } from "@/lib/actions/zona-sur";

/** Nota interna del pedido (cualquier cosa que quieras recordar o coordinar). */
export function NotaPedido({ pedidoId, nota }: { pedidoId: string; nota: string | null }) {
  const [texto, setTexto] = useState(nota ?? "");
  const [pending, startTransition] = useTransition();
  const sinGuardar = texto.trim() !== (nota ?? "");

  function guardar() {
    startTransition(async () => {
      const result = await guardarNotaZonaSurPedido(pedidoId, texto);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(texto.trim() ? "Nota guardada" : "Nota borrada");
    });
  }

  return (
    <div className="mt-2 space-y-1">
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={2}
        placeholder="Agregar nota…"
        aria-label="Nota del pedido"
        className="min-h-0 text-xs"
      />
      {sinGuardar && (
        <Button type="button" size="sm" variant="outline" onClick={guardar} disabled={pending}>
          {pending ? "Guardando..." : "Guardar nota"}
        </Button>
      )}
    </div>
  );
}

/** Pasa el pedido a "Retiro por la casa": lo coordinás vos. Pide confirmación porque cambia el total si había envío. */
export function PasarARetiroCasa({ pedidoId }: { pedidoId: string }) {
  const [pending, startTransition] = useTransition();

  function pasar() {
    if (!window.confirm("¿Pasar este pedido a retiro por tu casa? Si tenía envío cobrado, se descuenta del total.")) return;
    startTransition(async () => {
      const result = await pasarPedidoARetiroCasa(pedidoId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Pasado a retiro por la casa");
    });
  }

  return (
    <Button type="button" size="sm" variant="ghost" className="mt-1 h-7 px-2 text-xs" onClick={pasar} disabled={pending}>
      {pending ? "Pasando..." : "Pasar a retiro por mi casa"}
    </Button>
  );
}

/** Pasa un pedido de Andreani a domicilio a "Envío a domicilio" de la zona (entra en la ruta de reparto). */
export function PasarAEnvioDomicilio({ pedidoId }: { pedidoId: string }) {
  const [pending, startTransition] = useTransition();

  function pasar() {
    if (!window.confirm("¿Pasar este pedido a envío a domicilio? Se descuenta el costo de Andreani del total y entra en la ruta de reparto.")) return;
    startTransition(async () => {
      const result = await pasarPedidoAEnvioDomicilio(pedidoId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Pasado a envío a domicilio");
    });
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={pasar} disabled={pending}>
      {pending ? "Pasando..." : "Pasar a envío a domicilio"}
    </Button>
  );
}
