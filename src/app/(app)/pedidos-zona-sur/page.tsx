import Link from "next/link";
import { BuscadorPedidos, leerEstadoFiltro } from "@/components/zona-sur/buscador-pedidos";
import { enlaceComprobante } from "@/lib/comprobante";
import { filasDatosAndreani } from "@/lib/datos-andreani";
import { DatosEnvioBoton } from "@/components/zona-sur/datos-envio-boton";
import { NotaPedido, PasarAEnvioDomicilio, PasarARetiroCasa } from "@/components/zona-sur/acciones-pedido";
import { prisma } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { EstadoPedidoSelect } from "@/components/zona-sur/estado-pedido-select";
import {
  BarraAccionesPedidos,
  CasillaPedido,
  CasillaTodos,
  SeleccionProvider,
} from "@/components/zona-sur/seleccion-pedidos";
import { cn } from "@/lib/utils";

const ENTREGA_LABEL: Record<string, string> = {
  ENVIO_ZONA: "Envío a domicilio",
  PUNTO_QUILMES: "Retiro en Quilmes",
  PUNTO_BERNAL: "Retiro en Bernal",
  COLEGIO: "Entrega en el colegio",
  ANDREANI: "Envío por Andreani",
  RETIRO_CASA: "Retiro por la casa",
};

const PAGO_LABEL: Record<string, string> = {
  TRANSFERENCIA: "Transferencia",
  EFECTIVO: "Efectivo",
};

export default async function PedidosZonaSurPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const estado = leerEstadoFiltro(params.estado);
  const pedidos = await prisma.zonaSurPedido.findMany({
    where: {
      ...(q ? { clienteNombre: { contains: q, mode: "insensitive" as const } } : {}),
      ...(estado ? { estado } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { items: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pedidos Zona Sur</h1>
          <p className="text-muted-foreground">
            Pedidos hechos desde{" "}
            <a href="/zona-sur" target="_blank" rel="noopener noreferrer" className="underline">
              /zona-sur
            </a>
            . Se coordinan y confirman a mano, no se sincronizan con Tienda Nube.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/pedidos-zona-sur/ruta" className={cn(buttonVariants({ variant: "secondary" }))}>
            Ruta de reparto
          </Link>
          <Link href="/pedidos-zona-sur/colegio" className={cn(buttonVariants({ variant: "secondary" }))}>
            Entregas en el colegio
          </Link>
          <Link href="/pedidos-zona-sur/andreani" className={cn(buttonVariants({ variant: "secondary" }))}>
            Envíos por Andreani
          </Link>
          <Link href="/pedidos-zona-sur/config" className={cn(buttonVariants({ variant: "secondary" }))}>
            Configurar zona y puntos
          </Link>
        </div>
      </div>

      <BuscadorPedidos q={q} estado={estado} />

      {pedidos.length === 0 ? (
        <p className="text-muted-foreground">
          {q ? `No hay pedidos que coincidan con "${q}".` : "Todavía no hay pedidos."}
        </p>
      ) : (
        <SeleccionProvider ids={pedidos.map((p) => p.id)}>
          <BarraAccionesPedidos />
          <Table className="tabla-tarjetas">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <CasillaTodos />
                </TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Etiqueta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell>
                    <CasillaPedido id={pedido.id} nombre={pedido.clienteNombre} />
                  </TableCell>
                  <TableCell data-label="Fecha" className="whitespace-nowrap text-sm text-muted-foreground">
                    {pedido.createdAt.toLocaleDateString("es-AR")}
                  </TableCell>
                  <TableCell data-label="Cliente">
                    <div className="font-medium">{pedido.clienteNombre}</div>
                    <div className="text-xs text-muted-foreground">{pedido.clienteEmail}</div>
                    <div className="text-xs text-muted-foreground">{pedido.clienteTelefono}</div>
                    {pedido.clienteDni && <div className="text-xs text-muted-foreground">DNI {pedido.clienteDni}</div>}
                  </TableCell>
                  <TableCell data-label="Productos" className="text-sm">
                    {pedido.items.map((item) => (
                      <div key={item.id}>
                        {item.cantidad} × {item.nombre}
                      </div>
                    ))}
                    <NotaPedido pedidoId={pedido.id} nota={pedido.nota} />
                  </TableCell>
                  <TableCell data-label="Entrega" className="text-sm">
                    <div>{ENTREGA_LABEL[pedido.metodoEntrega] ?? pedido.metodoEntrega}</div>
                    {pedido.metodoEntrega === "ANDREANI" && pedido.andreaniModalidad ? (
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        <div>{pedido.andreaniModalidad === "SUCURSAL" ? "A sucursal" : "A domicilio"} · CP {pedido.envioCp}</div>
                        <div>
                          Envío:{" "}
                          {pedido.envioAConfirmar
                            ? "a confirmar con el cliente"
                            : `$${Number(pedido.costoEnvio).toLocaleString("es-AR")} (ya cobrado en el total)`}
                        </div>
                        <DatosEnvioBoton filas={filasDatosAndreani(pedido)} cliente={pedido.clienteNombre} />
                      </div>
                    ) : (
                      pedido.direccion && <div className="text-xs text-muted-foreground">{pedido.direccion}</div>
                    )}
                    {pedido.puntoElegido && <div className="text-xs text-muted-foreground">{pedido.puntoElegido}</div>}
                    {pedido.metodoEntrega === "ANDREANI" && pedido.andreaniModalidad === "DOMICILIO" && <PasarAEnvioDomicilio pedidoId={pedido.id} />}
                    {pedido.metodoEntrega !== "RETIRO_CASA" && <PasarARetiroCasa pedidoId={pedido.id} />}
                  </TableCell>
                  <TableCell data-label="Pago" className="text-sm">
                    <div>{PAGO_LABEL[pedido.metodoPago] ?? pedido.metodoPago}</div>
                    {pedido.comprobanteUrl && (
                      <a href={enlaceComprobante(pedido.comprobanteUrl)} target="_blank" rel="noopener noreferrer" className="text-xs underline">
                        Ver comprobante
                      </a>
                    )}
                    {Number(pedido.descuento) > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Incluye descuento por efectivo (−${Number(pedido.descuento).toLocaleString("es-AR")})
                      </div>
                    )}
                    {pedido.pagaCon != null && (
                      <div className="text-xs text-muted-foreground">
                        Paga con ${Number(pedido.pagaCon).toLocaleString("es-AR")} — vuelto $
                        {(Number(pedido.pagaCon) - Number(pedido.total)).toLocaleString("es-AR")}
                      </div>
                    )}
                  </TableCell>
                  <TableCell data-label="Total" className="whitespace-nowrap font-medium">
                    ${Number(pedido.total).toLocaleString("es-AR")}
                  </TableCell>
                  <TableCell data-label="Estado">
                    <EstadoPedidoSelect pedidoId={pedido.id} estado={pedido.estado} />
                  </TableCell>
                  <TableCell data-label="Etiqueta" className="text-sm">
                    <a
                      href={`/imprimir-etiquetas?ids=${pedido.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Imprimir
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SeleccionProvider>
      )}
    </div>
  );
}
