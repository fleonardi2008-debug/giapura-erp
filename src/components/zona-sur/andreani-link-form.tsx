"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { guardarAndreaniLink } from "@/lib/actions/zona-sur";
import { whatsappUrl } from "@/lib/zona-sur-colegio";
import { cn } from "@/lib/utils";

function mensaje(nombre: string, link: string) {
  const primerNombre = nombre.trim().split(/\s+/)[0] || "";
  return [
    `Hola ${primerNombre}! Ya recibí tu pedido de Giapura.`,
    "Para mandártelo por Andreani, completá tu dirección y pagá el envío en este link:",
    link,
    "Es de un solo uso, no lo compartas. — Fran",
  ].join("\n");
}

/** Casillero para pegar el link de Andreani de UN pedido (cada link sirve una sola vez) y mandarlo por WhatsApp. */
export function AndreaniLinkForm({
  pedidoId,
  linkGuardado,
  telefono,
  nombre,
}: {
  pedidoId: string;
  linkGuardado: string | null;
  telefono: string;
  nombre: string;
}) {
  const [link, setLink] = useState(linkGuardado ?? "");
  const [pending, startTransition] = useTransition();
  const sinGuardar = link.trim() !== (linkGuardado ?? "");

  function guardar() {
    startTransition(async () => {
      const result = await guardarAndreaniLink(pedidoId, link);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(link.trim() ? "Link guardado" : "Link quitado");
    });
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
      <Input
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="Pegá acá el link de Andreani"
        aria-label={`Link de Andreani para ${nombre}`}
        className="min-w-0 flex-1 sm:w-64"
      />
      <Button type="button" variant="outline" size="sm" onClick={guardar} disabled={pending || !sinGuardar}>
        {pending ? "Guardando..." : "Guardar"}
      </Button>
      {linkGuardado && !sinGuardar ? (
        <a
          href={whatsappUrl(telefono, mensaje(nombre, linkGuardado))}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "default", size: "sm" }))}
        >
          Mandar por WhatsApp
        </a>
      ) : (
        <Button type="button" size="sm" disabled title="Primero pegá el link y guardalo">
          Mandar por WhatsApp
        </Button>
      )}
    </div>
  );
}
