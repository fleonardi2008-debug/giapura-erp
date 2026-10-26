import Link from "next/link";
import { enlaceComprobante } from "@/lib/comprobante";
import { filasDatosAndreani } from "@/lib/datos-andreani";
import { DatosEnvioBoton } from "@/components/zona-sur/datos-envio-boton";
import { NotaPedido, PasarARetiroCasa } from "@/components/zona-sur/acciones-pedido";
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

export default async function PedidosZonaSurPage() {
  const pedidos = await prisma.zonaSurPedido.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { items: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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

      {pedidos.length === 0 ? (
        <p className="text-muted-foreground">Todavía no hay pedidos.</p>
      ) : (
        <SeleccionProvider ids={pedidos.map((p) => p.id)}>
          <BarraAccionesPedidos />
          <Table>
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
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {pedido.createdAt.toLocaleDateString("es-AR")}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{pedido.clienteNombre}</div>
                    <div className="text-xs text-muted-foreground">{pedido.clienteEmail}</div>
                    <div className="text-xs text-muted-foreground">{pedido.clienteTelefono}</div>
                    {pedido.clienteDni && <div className="text-xs text-muted-foreground">DNI {pedido.clienteDni}</div>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {pedido.items.map((item) => (
                      <div key={item.id}>
                        {item.cantidad} × {item.nombre}
                      </div>
                    ))}
                    <NotaPedido pedidoId={pedido.id} nota={pedido.nota} />
                  </TableCell>
                  <TableCell className="text-sm">
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
                    {pedido.metodoEntrega !== "RETIRO_CASA" && <PasarARetiroCasa pedidoId={pedido.id} />}
                  </TableCell>
                  <TableCell className="text-sm">
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
                  <TableCell className="whitespace-nowrap font-medium">
                    ${Number(pedido.total).toLocaleString("es-AR")}
                  </TableCell>
                  <TableCell>
                    <EstadoPedidoSelect pedidoId={pedido.id} estado={pedido.estado} />
                  </TableCell>
                  <TableCell className="text-sm">
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
