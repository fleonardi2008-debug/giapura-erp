/**
 * Lupa para buscar pedidos por nombre del cliente. Es un formulario común (GET): al buscar, la página
 * se vuelve a armar con ?q=... y el filtro lo hace el servidor, así los botones de "seleccionar todos"
 * solo afectan a los pedidos que se ven.
 */
export function BuscadorPedidos({ q }: { q: string }) {
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
      <button
        type="submit"
        className="h-9 rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted"
      >
        Buscar
      </button>
      {q && (
        <a href="?" className="text-sm underline">
          Limpiar
        </a>
      )}
    </form>
  );
}
