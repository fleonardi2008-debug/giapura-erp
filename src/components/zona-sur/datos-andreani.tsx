"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Fila = { etiqueta: string; valor: string };

async function copiar(texto: string, aviso: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(aviso);
  } catch {
    toast.error("No se pudo copiar. Seleccionalo y copialo a mano.");
  }
}

/**
 * Los datos del pedido en el mismo orden que el formulario "Nueva orden" de RedChat,
 * con un botón para copiar cada uno (o todos juntos).
 */
export function DatosAndreani({ filas, plegable = true }: { filas: Fila[]; plegable?: boolean }) {
  const [abierto, setAbierto] = useState(true);
  const visibles = filas.filter((f) => f.valor.trim());
  return (
    <div className="space-y-2 rounded-lg bg-muted/50 p-3">
      <div className="flex items-center justify-between gap-2">
        {plegable ? (
          <button
            type="button"
            onClick={() => setAbierto((a) => !a)}
            aria-expanded={abierto}
            className="text-sm font-medium"
          >
            Datos para cargar en RedChat {abierto ? "▴" : "▾"}
          </button>
        ) : (
          <span className="text-sm font-medium">Datos para cargar en RedChat</span>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => copiar(visibles.map((f) => `${f.etiqueta}: ${f.valor}`).join("\n"), "Datos copiados")}
        >
          Copiar todo
        </Button>
      </div>
      {(abierto || !plegable) && (
        <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
          {visibles.map((f) => (
            <div key={f.etiqueta} className="flex items-center justify-between gap-2 border-b border-border/60 py-1">
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">{f.etiqueta}</dt>
                <dd className="break-words">{f.valor}</dd>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => copiar(f.valor, `${f.etiqueta} copiado`)}
                aria-label={`Copiar ${f.etiqueta}`}
              >
                Copiar
              </Button>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
