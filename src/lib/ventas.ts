import { Prisma } from "@/generated/prisma/client";

/**
 * Genera el movimiento de stock de una venta (salida de producto terminado al costo
 * promedio ponderado vigente) y descuenta el stock. Se usa tanto para pedidos
 * cargados a mano como para pedidos que llegan desde Tienda Nube.
 */
export async function registrarVentaItem(
  tx: Prisma.TransactionClient,
  params: {
    pedidoId: string;
    skuId: string;
    cantidad: number;
    fecha: Date;
    createdById?: string;
  }
) {
  const stockActual = await tx.stockActual.findUnique({ where: { skuId: params.skuId } });
  const costoSnapshot = stockActual?.costoPromedioPonderado ?? new Prisma.Decimal(0);

  await tx.movimientoStock.create({
    data: {
      tipoItem: "PRODUCTO_TERMINADO",
      skuId: params.skuId,
      tipoMovimiento: "VENTA",
      cantidad: new Prisma.Decimal(params.cantidad).negated(),
      costoUnitarioSnapshot: costoSnapshot,
      pedidoId: params.pedidoId,
      fecha: params.fecha,
      createdById: params.createdById,
    },
  });

  await tx.stockActual.update({
    where: { skuId: params.skuId },
    data: { cantidadActual: { decrement: params.cantidad } },
  });
}
