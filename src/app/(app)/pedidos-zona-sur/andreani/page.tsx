import Link from "next/link";
import { prisma } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { AndreaniLinkForm } from "@/components/zona-sur/andreani-link-form";
import { EstadoPedidoSelect } from "@/components/zona-sur/estado-pedido-select";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AndreaniPage() {
  const pedidos = await prisma.zonaSurPedido.findMany({
    where: { metodoEntrega: "ANDREANI", estado: { in: ["PENDIENTE", "CONFIRMADO"] } },
    orderBy: { createdAt: "asc" },
    include: { items: true },
  });

  const sinLink = pedidos.filter((p) => !p.andreaniLink).length;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Envíos por Andreani</h1>
          <p className="text-muted-foreground">
            Por cada pedido: revisá el comprobante, generá el link en Andreani, pegalo acá y mandalo por WhatsApp.
            Cada link se usa una sola vez, así que hay uno por pedido.
          </p>
        </div>
        <Link href="/pedidos-zona-sur" className={cn(buttonVariants({ variant: "secondary" }))}>
          Todos los pedidos
        </Link>
      </div>

      {pedidos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No hay pedidos de Andreani pendientes.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"} · {sinLink}{" "}
            {sinLink === 1 ? "espera su link" : "esperan su link"}
          </p>
          <div className="space-y-2">
            {pedidos.map((pedido) => (
              <div key={pedido.id} className="space-y-3 rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <div className="font-medium">{pedido.clienteNombre}</div>
                    <div className="text-sm text-muted-foreground">
                      {pedido.items.map((i) => `${i.cantidad} × ${i.nombre}`).join(" · ")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pedido.clienteTelefono} · {pedido.clienteEmail} · $
                      {Number(pedido.total).toLocaleString("es-AR")}
                      {pedido.comprobanteUrl && (
                        <>
                          {" · "}
                          <a href={pedido.comprobanteUrl} target="_blank" rel="noopener noreferrer" className="underline">
                            Ver comprobante
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium",
                        pedido.andreaniLink ? "bg-secondary text-secondary-foreground" : "bg-destructive/10 text-destructive"
                      )}
                    >
                      {pedido.andreaniLink ? "Link listo" : "Falta el link"}
                    </span>
                    <EstadoPedidoSelect pedidoId={pedido.id} estado={pedido.estado} />
                  </div>
                </div>
                <AndreaniLinkForm
                  pedidoId={pedido.id}
                  linkGuardado={pedido.andreaniLink}
                  telefono={pedido.clienteTelefono}
                  nombre={pedido.clienteNombre}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
