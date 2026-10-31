/**
 * Lupa para buscar pedidos por nombre del cliente. Es un formulario común (GET): al buscar, la página
 * se vuelve a armar con ?q=... y el filtro lo hace el servidor, así los botones de "seleccionar todos"
 * solo afectan a los pedidos que se ven.
 */
export const ESTADOS_FILTRO = ["PENDIENTE", "PREPARADO", "ENTREGADO", "CANCELADO"] as const;
export type EstadoFiltro = (typeof ESTADOS_FILTRO)[number];

/** Estado pedido en ?estado=...; si no es uno válido, null (= sin filtrar). */
export function leerEstadoFiltro(valor: string | undefined): EstadoFiltro | null {
  return ESTADOS_FILTRO.find((e) => e === valor) ?? null;
}

const ETIQUETA_ESTADO: Record<EstadoFiltro, string> = {
  PENDIENTE: "Pendiente",
  PREPARADO: "Preparado",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

export function BuscadorPedidos({ q, estado, todosLabel = "Todos los estados" }: { q: string; estado: EstadoFiltro | null; todosLabel?: string }) {
  return (
    <form method="get" role="search" className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre…"
          aria-label="Buscar pedido por nombre"
          autoComplete="off"
          className="h-9 w-64 max-w-full rounded-lg border border-input bg-transparent pr-3 pl-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      <select
        name="estado"
        defaultValue={estado ?? ""}
        aria-label="Filtrar por estado"
        className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <option value="">{todosLabel}</option>
        {ESTADOS_FILTRO.map((e) => (
          <option key={e} value={e}>
            {ETIQUETA_ESTADO[e]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="h-9 rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted"
      >
        Buscar
      </button>
      {(q || estado) && (
        <a href="?" className="text-sm underline">
          Limpiar
        </a>
      )}
    </form>
  );
}
