import { prisma } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { NuevoPedidoDialog } from "@/components/pedidos/nuevo-pedido-dialog";
import { EliminarPedidoButton } from "@/components/pedidos/eliminar-pedido-button";

const ESTADO_PAGO_LABEL: Record<string, string> = {
  PAGADO: "Pagado",
  PENDIENTE: "Pendiente",
  PARCIAL: "Parcial",
  REEMBOLSADO: "Reembolsado",
};

export default async function PedidosPage() {
  const [pedidos, skus] = await Promise.all([
    prisma.pedido.findMany({
      orderBy: { fecha: "desc" },
      take: 200,
      include: { items: { include: { sku: true } } },
    }),
    prisma.sku.findMany({ where: { activo: true }, orderBy: { codigo: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pedidos</h1>
          <p className="text-muted-foreground">
            Carga manual mientras no está conectada la integración con Tienda Nube.
          </p>
        </div>
        <NuevoPedidoDialog skus={skus} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pedido</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Productos</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Pago</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pedidos.map((pedido) => (
            <TableRow key={pedido.id}>
              <TableCell className="font-medium">{pedido.numeroPedido}</TableCell>
              <TableCell>{pedido.fecha.toLocaleDateString("es-AR")}</TableCell>
              <TableCell>{pedido.clienteNombre ?? "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {pedido.items.map((item) => `${item.sku?.codigo} x${item.cantidad}`).join(", ")}
              </TableCell>
              <TableCell>${pedido.total.toFixed(2)}</TableCell>
              <TableCell>
                <Badge variant={pedido.estadoPago === "PAGADO" ? "default" : "outline"}>
                  {ESTADO_PAGO_LABEL[pedido.estadoPago]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <EliminarPedidoButton pedidoId={pedido.id} />
              </TableCell>
            </TableRow>
          ))}
          {pedidos.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Todavía no cargaste pedidos.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
