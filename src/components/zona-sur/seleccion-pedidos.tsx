"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { actualizarEstadoZonaSurPedidos } from "@/lib/actions/zona-sur";
import type { ZonaSurEstado } from "@/generated/prisma/client";

type Seleccion = {
  ids: string[];
  marcados: string[];
  alternar: (id: string) => void;
  alternarTodos: () => void;
  limpiar: () => void;
};

const Contexto = createContext<Seleccion | null>(null);

function useSeleccion() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("Falta el SeleccionProvider");
  return ctx;
}

/** Guarda qué pedidos están marcados. `ids` son todos los que se ven en la lista. */
export function SeleccionProvider({ ids, children }: { ids: string[]; children: ReactNode }) {
  const [elegidos, setElegidos] = useState<Set<string>>(new Set());
  // Si la lista cambia (por ejemplo después de actualizar estados), se descartan los que ya no están.
  const marcados = ids.filter((id) => elegidos.has(id));

  const valor: Seleccion = {
    ids,
    marcados,
    alternar: (id) =>
      setElegidos((actual) => {
        const nuevo = new Set(actual);
        if (nuevo.has(id)) nuevo.delete(id);
        else nuevo.add(id);
        return nuevo;
      }),
    alternarTodos: () => setElegidos(marcados.length === ids.length ? new Set() : new Set(ids)),
    limpiar: () => setElegidos(new Set()),
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** Casilla del encabezado: marca o desmarca todos los pedidos de la lista. */
export function CasillaTodos() {
  const { ids, marcados, alternarTodos } = useSeleccion();
  const ref = useRef<HTMLInputElement>(null);
  const todos = ids.length > 0 && marcados.length === ids.length;

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = marcados.length > 0 && !todos;
  }, [marcados.length, todos]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className="size-4 cursor-pointer"
      aria-label="Seleccionar todos los pedidos"
      checked={todos}
      onChange={alternarTodos}
    />
  );
}

export function CasillaPedido({ id, nombre }: { id: string; nombre: string }) {
  const { marcados, alternar } = useSeleccion();
  return (
    <input
      type="checkbox"
      className="size-4 cursor-pointer"
      aria-label={`Seleccionar el pedido de ${nombre}`}
      checked={marcados.includes(id)}
      onChange={() => alternar(id)}
    />
  );
}

const CAMBIOS: { estado: ZonaSurEstado; label: string; variant: "default" | "outline" | "destructive" }[] = [
  { estado: "PREPARADO", label: "Marcar preparados", variant: "default" },
  { estado: "ENTREGADO", label: "Marcar entregados", variant: "outline" },
  { estado: "PENDIENTE", label: "Volver a pendiente", variant: "outline" },
  { estado: "CANCELADO", label: "Cancelar", variant: "destructive" },
];

/** Aparece al marcar pedidos: cambia el estado de todos juntos o imprime sus etiquetas. */
export function BarraAccionesPedidos() {
  const { marcados, limpiar } = useSeleccion();
  const [pending, startTransition] = useTransition();

  if (marcados.length === 0) {
    return <p className="text-sm text-muted-foreground">Marcá pedidos para cambiarles el estado todos juntos.</p>;
  }

  function cambiar(estado: ZonaSurEstado, label: string) {
    const cantidad = marcados.length;
    if (
      estado === "CANCELADO" &&
      !window.confirm(`¿Cancelar ${cantidad} ${cantidad === 1 ? "pedido" : "pedidos"}?`)
    ) {
      return;
    }
    startTransition(async () => {
      try {
        const res = await actualizarEstadoZonaSurPedidos(marcados, estado);
        if (res?.error) {
          toast.error(res.error);
          return;
        }
        toast.success(`${label}: ${res.cantidad} ${res.cantidad === 1 ? "pedido actualizado" : "pedidos actualizados"}`);
        limpiar();
      } catch {
        toast.error("No se pudieron actualizar los pedidos. Probá de nuevo.");
      }
    });
  }

  return (
    <div
      role="region"
      aria-label="Acciones sobre los pedidos seleccionados"
      className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-lg border bg-background/95 p-3 shadow-sm backdrop-blur"
    >
      <span className="mr-2 text-sm font-medium">
        {marcados.length} {marcados.length === 1 ? "pedido seleccionado" : "pedidos seleccionados"}
      </span>
      {CAMBIOS.map((c) => (
        <Button key={c.estado} size="sm" variant={c.variant} disabled={pending} onClick={() => cambiar(c.estado, c.label)}>
          {c.label}
        </Button>
      ))}
      <Button
        size="sm"
        variant="outline"
        onClick={() => window.open(`/imprimir-etiquetas?ids=${marcados.join(",")}`, "_blank", "noopener,noreferrer")}
      >
        Imprimir etiquetas
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={limpiar}>
        Quitar selección
      </Button>
    </div>
  );
}
