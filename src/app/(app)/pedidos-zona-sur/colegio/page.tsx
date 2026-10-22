import Link from "next/link";
import { prisma } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { parsearDiasColegio, whatsappUrl } from "@/lib/zona-sur-colegio";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function plata(n: number) {
  return `$${n.toLocaleString("es-AR")}`;
}

/** Recordatorio para mandar la noche anterior: por eso habla de "mañana". */
function mensajeRecordatorio(opts: {
  nombre: string;
  dia: string;
  lugar: string | null;
  efectivo: boolean;
  total: number;
}) {
  const primerNombre = opts.nombre.trim().split(/\s+/)[0] || "";
  const lineas = [
    `Hola ${primerNombre}! Te recuerdo que mañana (${opts.dia}) te llevo tu pedido de Giapura al colegio.`,
  ];
  if (opts.lugar) lineas.push(`Te espero en: ${opts.lugar}.`);
  if (opts.efectivo) lineas.push(`Acordate que se paga en efectivo: ${plata(opts.total)}.`);
  lineas.push("Cualquier cosa avisame. — Fran");
  return lineas.join("\n");
}

export default async function ColegioPage() {
  const [config, pedidos] = await Promise.all([
    prisma.zonaSurConfig.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} }),
    prisma.zonaSurPedido.findMany({
      where: { metodoEntrega: "COLEGIO", estado: { in: ["PENDIENTE", "CONFIRMADO"] } },
      orderBy: { createdAt: "asc" },
      include: { items: true },
    }),
  ]);

  const ordenDias = parsearDiasColegio(config.colegioDias);
  const grupos = new Map<string, typeof pedidos>();
  for (const pedido of pedidos) {
    const dia = pedido.colegioDia ?? "Sin día";
    grupos.set(dia, [...(grupos.get(dia) ?? []), pedido]);
  }
  // Primero los días que están ofrecidos hoy, en el orden de la config; el resto (días viejos) al final.
  const dias = [...grupos.keys()].sort((a, b) => {
    const ia = ordenDias.indexOf(a);
    const ib = ordenDias.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Entregas en el colegio</h1>
          <p className="text-muted-foreground">
            Pedidos pendientes y confirmados, agrupados por el día que eligió cada persona. La noche anterior,
            tocá &quot;Recordar&quot; y se abre WhatsApp con el mensaje ya escrito.
          </p>
        </div>
        <Link href="/pedidos-zona-sur" className={cn(buttonVariants({ variant: "secondary" }))}>
          Todos los pedidos
        </Link>
      </div>

      {dias.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Todavía no hay pedidos para entregar en el colegio.
        </p>
      ) : (
        dias.map((dia) => {
          const delDia = grupos.get(dia) ?? [];
          const packs = delDia.reduce((s, p) => s + p.items.reduce((x, i) => x + i.cantidad, 0), 0);
          const totalDia = delDia.reduce((s, p) => s + Number(p.total), 0);
          const aCobrar = delDia
            .filter((p) => p.metodoPago === "EFECTIVO")
            .reduce((s, p) => s + Number(p.total), 0);
          return (
            <section key={dia} className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-semibold">{dia}</h2>
                <p className="text-sm text-muted-foreground">
                  {delDia.length} {delDia.length === 1 ? "pedido" : "pedidos"} · {packs}{" "}
                  {packs === 1 ? "pack" : "packs"} · {plata(totalDia)}
                  {aCobrar > 0 && <> · a cobrar en efectivo: {plata(aCobrar)}</>}
                </p>
              </div>
              <div className="space-y-2">
                {delDia.map((pedido) => {
                  const efectivo = pedido.metodoPago === "EFECTIVO";
                  const mensaje = mensajeRecordatorio({
                    nombre: pedido.clienteNombre,
                    dia,
                    lugar: config.colegioNombre?.trim() || null,
                    efectivo,
                    total: Number(pedido.total),
                  });
                  return (
                    <div
                      key={pedido.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="font-medium">{pedido.clienteNombre}</div>
                        <div className="text-sm text-muted-foreground">
                          {pedido.items.map((i) => `${i.cantidad} × ${i.nombre}`).join(" · ")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {pedido.clienteTelefono} · {efectivo ? `Efectivo ${plata(Number(pedido.total))}` : "Transferencia"}
                          {Number(pedido.descuento) > 0 && <> (con {plata(Number(pedido.descuento))} de descuento)</>}
                          {efectivo && pedido.pagaCon != null && (
                            <> · paga con {plata(Number(pedido.pagaCon))}, vuelto {plata(Number(pedido.pagaCon) - Number(pedido.total))}</>
                          )}
                          {" · "}
                          {pedido.estado === "CONFIRMADO" ? "Confirmado" : "Pendiente"}
                        </div>
                      </div>
                      <a
                        href={whatsappUrl(pedido.clienteTelefono, mensaje)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        Recordar por WhatsApp
                      </a>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
