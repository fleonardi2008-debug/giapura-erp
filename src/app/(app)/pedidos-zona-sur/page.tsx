import Link from "next/link";
import { prisma } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { EstadoPedidoSelect } from "@/components/zona-sur/estado-pedido-select";
import { cn } from "@/lib/utils";

const ENTREGA_LABEL: Record<string, string> = {
  ENVIO_ZONA: "Envío a domicilio",
  PUNTO_QUILMES: "Retiro en Quilmes",
  PUNTO_BERNAL: "Retiro en Bernal",
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
        <Link href="/pedidos-zona-sur/config" className={cn(buttonVariants({ variant: "secondary" }))}>
          Configurar zona y puntos
        </Link>
      </div>

      {pedidos.length === 0 ? (
        <p className="text-muted-foreground">Todavía no hay pedidos.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Productos</TableHead>
              <TableHead>Entrega</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pedidos.map((pedido) => (
              <TableRow key={pedido.id}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {pedido.createdAt.toLocaleDateString("es-AR")}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{pedido.clienteNombre}</div>
                  <div className="text-xs text-muted-foreground">{pedido.clienteEmail}</div>
                  <div className="text-xs text-muted-foreground">{pedido.clienteTelefono}</div>
                </TableCell>
                <TableCell className="text-sm">
                  {pedido.items.map((item) => (
                    <div key={item.id}>
                      {item.cantidad} × {item.nombre}
                    </div>
                  ))}
                </TableCell>
                <TableCell className="text-sm">
                  <div>{ENTREGA_LABEL[pedido.metodoEntrega] ?? pedido.metodoEntrega}</div>
                  {pedido.direccion && <div className="text-xs text-muted-foreground">{pedido.direccion}</div>}
                  {pedido.puntoElegido && <div className="text-xs text-muted-foreground">{pedido.puntoElegido}</div>}
                </TableCell>
                <TableCell className="text-sm">
                  <div>{PAGO_LABEL[pedido.metodoPago] ?? pedido.metodoPago}</div>
                  {pedido.comprobanteUrl && (
                    <a href={pedido.comprobanteUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline">
                      Ver comprobante
                    </a>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap font-medium">
                  ${Number(pedido.total).toLocaleString("es-AR")}
                </TableCell>
                <TableCell>
                  <EstadoPedidoSelect pedidoId={pedido.id} estado={pedido.estado} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
