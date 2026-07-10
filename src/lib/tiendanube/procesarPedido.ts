import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { getCredentials, getOrder } from "@/lib/tiendanube/client";
import { registrarVentaItem } from "@/lib/ventas";
import { reenviarStock } from "@/lib/tiendanube/sync";

function mapEstadoPago(paymentStatus: string): "PENDIENTE" | "PAGADO" | "PARCIAL" | "REEMBOLSADO" {
  switch (paymentStatus) {
    case "paid":
    case "authorized":
      return "PAGADO";
    case "partially_paid":
      return "PARCIAL";
    case "refunded":
    case "partially_refunded":
    case "voided":
      return "REEMBOLSADO";
    default:
      return "PENDIENTE";
  }
}

function mapEstadoEnvio(
  shippingStatus: string
): "PENDIENTE" | "DESPACHADO" | "EN_TRANSITO" | "ENTREGADO" | "PROBLEMA" {
  switch (shippingStatus) {
    case "shipped":
      return "DESPACHADO";
    case "delivered":
      return "ENTREGADO";
    case "packed":
      return "PENDIENTE";
    default:
      return "PENDIENTE";
  }
}

/**
 * Trae un pedido completo de Tienda Nube, matchea sus items por código de SKU,
 * genera el pedido + movimientos de venta en nuestra base (si no fue procesado
 * antes) y reenvía el stock actualizado a Tienda Nube.
 */
export async function procesarOrdenTiendaNube(
  tiendaNubeOrderId: string
): Promise<{ pedidoId: string; creado: boolean }> {
  const creds = await getCredentials();
  if (!creds) throw new Error("No hay conexión activa con Tienda Nube");

  const yaExiste = await prisma.pedido.findUnique({
    where: { tiendaNubeOrderId: String(tiendaNubeOrderId) },
  });
  if (yaExiste) return { pedidoId: yaExiste.id, creado: false };

  const orden = await getOrder(creds, tiendaNubeOrderId);

  const itemsResueltos: { skuId: string; cantidad: number; precioUnitario: number }[] = [];
  const sinMatch: string[] = [];

  for (const item of orden.products ?? []) {
    if (!item.sku) {
      sinMatch.push("(sin SKU)");
      continue;
    }
    const sku = await prisma.sku.findUnique({ where: { codigo: item.sku } });
    if (!sku) {
      sinMatch.push(item.sku);
      continue;
    }
    itemsResueltos.push({
      skuId: sku.id,
      cantidad: Number(item.quantity),
      precioUnitario: Number(item.price),
    });
  }

  if (sinMatch.length > 0) {
    // El pedido se registra igual (con su total real), pero estos items no descuentan
    // stock ni suman al CMV porque no matchearon contra ningún SKU nuestro.
    console.warn(
      `Pedido ${orden.id}: items sin SKU mapeado, no descuentan stock: ${sinMatch.join(", ")}`
    );
  }

  const fecha = new Date(orden.created_at);

  const pedido = await prisma.$transaction(async (tx) => {
    const nuevo = await tx.pedido.create({
      data: {
        tiendaNubeOrderId: String(orden.id),
        numeroPedido: String(orden.number),
        fecha,
        clienteNombre: orden.contact_name,
        clienteEmail: orden.contact_email,
        estadoPedido: "CERRADO",
        estadoPago: mapEstadoPago(orden.payment_status),
        estadoEnvio: mapEstadoEnvio(orden.shipping_status),
        subtotal: orden.subtotal,
        total: orden.total,
        rawPayload: orden as unknown as Prisma.InputJsonValue,
        sincronizadoEn: new Date(),
      },
    });

    for (const item of itemsResueltos) {
      await tx.pedidoItem.create({
        data: {
          pedidoId: nuevo.id,
          skuId: item.skuId,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          subtotal: item.cantidad * item.precioUnitario,
        },
      });
      await registrarVentaItem(tx, {
        pedidoId: nuevo.id,
        skuId: item.skuId,
        cantidad: item.cantidad,
        fecha,
      });
    }

    return nuevo;
  });

  if (itemsResueltos.length > 0) {
    await reenviarStock(itemsResueltos.map((i) => i.skuId));
  }

  return { pedidoId: pedido.id, creado: true };
}
