import Link from "next/link";
import { prisma } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { BuscadorPedidos, leerEstadoFiltro } from "@/components/zona-sur/buscador-pedidos";
import { EstadoPedidoSelect } from "@/components/zona-sur/estado-pedido-select";
import { NotaPedido } from "@/components/zona-sur/acciones-pedido";
import {
  BarraAccionesPedidos,
  CasillaPedido,
  CasillaTodos,
  SeleccionProvider,
} from "@/components/zona-sur/seleccion-pedidos";
import { enlaceComprobante } from "@/lib/comprobante";
import { parsearDiasImpa, parsearOpcionesImpa } from "@/lib/impa";
import { leerStockZonaSur } from "@/lib/zona-sur-stock";
import { whatsappUrl } from "@/lib/zona-sur-colegio";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function plata(n: number) {
  return `$${n.toLocaleString("es-AR")}`;
}

/** "IMPA — Martes 11/11 — A la salida" → { dia, opcion } */
function partesRetiro(puntoElegido: string | null) {
  const partes = (puntoElegido ?? "").split(" — ");
  return { dia: partes[1] ?? "Sin día", opcion: partes[2] ?? "" };
}

/** Recordatorio para mandar la noche anterior: por eso habla de "mañana". */
function mensajeRecordatorio(opts: { nombre: string; dia: string; opcion: string; efectivo: boolean; total: number }) {
  const primerNombre = opts.nombre.trim().split(/\s+/)[0] || "";
  const lineas = [
    `Hola ${primerNombre}! Te recuerdo que mañana (${opts.dia}${opts.opcion ? `, ${opts.opcion.toLowerCase()}` : ""}) retirás tu pedido de Giapura en el IMPA.`,
  ];
  if (opts.efectivo) lineas.push(`Acordate que se paga en efectivo: ${plata(opts.total)}.`);
  lineas.push("Cualquier cosa avisame");
  return lineas.join("\n");
}

export default async function PedidosImpaPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const estado = leerEstadoFiltro(params.estado);
  const [config, pedidos, { stock }] = await Promise.all([
    prisma.zonaSurConfig.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} }),
    prisma.zonaSurPedido.findMany({
      where: {
        metodoEntrega: "RETIRO_IMPA",
        estado: estado ?? { in: ["PENDIENTE", "PREPARADO"] },
        ...(q ? { clienteNombre: { contains: q, mode: "insensitive" as const } } : {}),
      },
      orderBy: { createdAt: "asc" },
      include: { items: true },
    }),
    leerStockZonaSur(),
  ]);

  const dias = parsearDiasImpa(config.impaDias);
  const opciones = parsearOpcionesImpa(config.impaOpciones);
  const grupos = new Map<string, typeof pedidos>();
  for (const pedido of pedidos) {
    const { dia, opcion } = partesRetiro(pedido.puntoElegido);
    const clave = `${dia}|${opcion}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), pedido]);
  }
  // Primero los días y momentos que están ofrecidos hoy, en el orden de la config; el resto (viejos) al final.
  const claves = [...grupos.keys()].sort((a, b) => {
    const [da, oa] = a.split("|");
    const [db, ob] = b.split("|");
    const rank = (lista: string[], x: string) => (lista.indexOf(x) === -1 ? 999 : lista.indexOf(x));
    return rank(dias, da) - rank(dias, db) || rank(opciones, oa) - rank(opciones, ob);
  });

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pedidos IMPA</h1>
          <p className="text-muted-foreground">
            Pedidos de la página{" "}
            <a href="/impa" target="_blank" rel="noopener noreferrer" className="underline">
              /impa
            </a>
            , agrupados por día y momento de retiro. Pendientes y preparados.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/pedidos-impa/nuevo" className={cn(buttonVariants())}>
            Cargar pedido
          </Link>
          <Link href="/pedidos-impa/config" className={cn(buttonVariants({ variant: "secondary" }))}>
            Precios, días y stock
          </Link>
        </div>
      </div>

      {stock.length > 0 && (
        <p className="rounded-xl border border-border p-3 text-sm text-muted-foreground">
          Stock compartido con Zona Sur:{" "}
          {stock.map((f) => `${f.nombre}: quedan ${Math.max(0, f.total - f.usado)}`).join(" · ")}
        </p>
      )}

      <BuscadorPedidos q={q} estado={estado} todosLabel="Pendientes y preparados" />

      <SeleccionProvider ids={pedidos.map((p) => p.id)}>
        <BarraAccionesPedidos />
        {pedidos.length > 0 && (
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
            <CasillaTodos /> Seleccionar todos
          </label>
        )}
        {claves.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {q ? `No hay pedidos que coincidan con "${q}".` : "Todavía no hay pedidos del IMPA."}
          </p>
        ) : (
          claves.map((clave) => {
            const [dia, opcion] = clave.split("|");
            const delGrupo = grupos.get(clave) ?? [];
            const unidades = delGrupo.reduce((s, p) => s + p.items.reduce((x, i) => x + i.cantidad, 0), 0);
            const totalGrupo = delGrupo.reduce((s, p) => s + Number(p.total), 0);
            const aCobrar = delGrupo.filter((p) => p.metodoPago === "EFECTIVO").reduce((s, p) => s + Number(p.total), 0);
            return (
              <section key={clave} className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-xl font-semibold">
                    {dia}
                    {opcion && <span className="font-normal text-muted-foreground"> · {opcion}</span>}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {delGrupo.length} {delGrupo.length === 1 ? "pedido" : "pedidos"} · {unidades}{" "}
                    {unidades === 1 ? "producto" : "productos"} · {plata(totalGrupo)}
                    {aCobrar > 0 && <> · a cobrar en efectivo: {plata(aCobrar)}</>}
                  </p>
                </div>
                <div className="space-y-2">
                  {delGrupo.map((pedido) => {
                    const efectivo = pedido.metodoPago === "EFECTIVO";
                    const mensaje = mensajeRecordatorio({
                      nombre: pedido.clienteNombre,
                      dia,
                      opcion,
                      efectivo,
                      total: Number(pedido.total),
                    });
                    return (
                      <div
                        key={pedido.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <CasillaPedido id={pedido.id} nombre={pedido.clienteNombre} />
                          <div className="min-w-0 space-y-0.5">
                            <div className="font-medium">{pedido.clienteNombre}</div>
                            <div className="text-sm text-muted-foreground">
                              {pedido.items.map((i) => `${i.cantidad} × ${i.nombre}`).join(" · ")}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {pedido.clienteTelefono} · {efectivo ? `Efectivo ${plata(Number(pedido.total))}` : `Transferencia ${plata(Number(pedido.total))}`}
                              {efectivo && pedido.pagaCon != null && (
                                <> · paga con {plata(Number(pedido.pagaCon))}, vuelto {plata(Number(pedido.pagaCon) - Number(pedido.total))}</>
                              )}
                              {pedido.comprobanteUrl && (
                                <>
                                  {" · "}
                                  <a
                                    href={enlaceComprobante(pedido.comprobanteUrl)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline"
                                  >
                                    Ver comprobante
                                  </a>
                                </>
                              )}
                            </div>
                            <NotaPedido pedidoId={pedido.id} nota={pedido.nota} />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <EstadoPedidoSelect pedidoId={pedido.id} estado={pedido.estado} />
                          {pedido.clienteTelefono && (
                            <a
                              href={whatsappUrl(pedido.clienteTelefono, mensaje)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                            >
                              Recordar por WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </SeleccionProvider>
    </div>
  );
}
