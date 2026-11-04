"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cargarPedidoImpaManual } from "@/lib/actions/impa";

type Producto = { id: string; nombre: string; precio: number; consumo: Record<string, number> };
type StockFrasco = { id: string; nombre: string; total: number; usado: number };

const SELECT =
  "h-10 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function plata(n: number) {
  return `$${n.toLocaleString("es-AR")}`;
}

/** Carga a mano un pedido del IMPA (alguien que pidió por WhatsApp). Cuenta para el mismo stock que los de la página. */
export function PedidoImpaManual({
  dias,
  opciones,
  productos,
  stock,
}: {
  dias: string[];
  opciones: string[];
  productos: Producto[];
  stock: StockFrasco[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [dia, setDia] = useState(dias[0] ?? "");
  const [opcion, setOpcion] = useState(opciones[0] ?? "");
  const [metodoPago, setMetodoPago] = useState<"TRANSFERENCIA" | "EFECTIVO">("EFECTIVO");
  const [nota, setNota] = useState("");

  const total = productos.reduce((a, p) => a + (cantidades[p.id] ?? 0) * p.precio, 0);
  const usadoEnEsteFormulario = (frascoId: string) =>
    productos.reduce((a, p) => a + (cantidades[p.id] ?? 0) * (p.consumo[frascoId] ?? 0), 0);

  function guardar() {
    const items = productos.filter((p) => (cantidades[p.id] ?? 0) > 0).map((p) => ({ skuId: p.id, cantidad: cantidades[p.id] }));
    if (items.length === 0) {
      toast.error("Elegí al menos un producto");
      return;
    }
    startTransition(async () => {
      try {
        const res = await cargarPedidoImpaManual({ nombre, telefono, dia, opcion, metodoPago, nota, items });
        if ("error" in res && res.error) {
          toast.error(res.error);
          return;
        }
        if ("aviso" in res && res.aviso) toast.warning(res.aviso);
        toast.success("Pedido cargado");
        router.push("/pedidos-impa");
      } catch {
        toast.error("No se pudo cargar el pedido. Probá de nuevo.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Productos</h2>
        {productos.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Todavía no hay productos con precio del IMPA. Cargalos en &quot;Precios, días y stock&quot;.
          </p>
        )}
        <div className="space-y-2">
          {productos.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div className="min-w-0">
                <div className="font-medium">{p.nombre}</div>
                <div className="text-sm text-muted-foreground">{plata(p.precio)}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={(cantidades[p.id] ?? 0) === 0}
                  onClick={() => setCantidades((c) => ({ ...c, [p.id]: Math.max(0, (c[p.id] ?? 0) - 1) }))}
                  aria-label={`Quitar ${p.nombre}`}
                >
                  −
                </Button>
                <span className="w-6 text-center font-semibold tabular-nums">{cantidades[p.id] ?? 0}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setCantidades((c) => ({ ...c, [p.id]: (c[p.id] ?? 0) + 1 }))}
                  aria-label={`Sumar ${p.nombre}`}
                >
                  +
                </Button>
              </div>
            </div>
          ))}
        </div>
        {stock.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Stock: {stock.map((f) => `${f.nombre}: quedan ${Math.max(0, f.total - f.usado)} (este pedido usa ${usadoEnEsteFormulario(f.id)})`).join(" · ")}
          </p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="nombre">Nombre y apellido</Label>
          <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefono">Teléfono (WhatsApp)</Label>
          <Input id="telefono" type="tel" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pago">Forma de pago</Label>
          <select id="pago" className={SELECT} value={metodoPago} onChange={(e) => setMetodoPago(e.target.value as "TRANSFERENCIA" | "EFECTIVO")}>
            <option value="EFECTIVO">Efectivo</option>
            <option value="TRANSFERENCIA">Transferencia</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dia">Día de retiro</Label>
          <select id="dia" className={SELECT} value={dia} onChange={(e) => setDia(e.target.value)}>
            {dias.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="opcion">Momento</Label>
          <select id="opcion" className={SELECT} value={opcion} onChange={(e) => setOpcion(e.target.value)}>
            {opciones.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="nota">Nota (opcional)</Label>
          <Textarea id="nota" rows={2} value={nota} onChange={(e) => setNota(e.target.value)} />
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-lg font-semibold">Total: {plata(total)}</p>
        <Button type="button" size="lg" onClick={guardar} disabled={pending || dias.length === 0}>
          {pending ? "Guardando..." : "Cargar pedido"}
        </Button>
      </div>
      {dias.length === 0 && (
        <p className="text-sm text-muted-foreground">Primero cargá los días de retiro en &quot;Precios, días y stock&quot;.</p>
      )}
    </div>
  );
}
