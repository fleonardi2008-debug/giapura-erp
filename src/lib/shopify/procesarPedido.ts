import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { registrarVentaItem } from "@/lib/ventas";

type ShopifyLineItem = {
  sku: string | null;
  quantity: number;
  price: string;
};

type ShopifyOrder = {
  id: number;
  order_number?: number;
  name?: string;
  created_at: string;
  financial_status: string | null;
  customer?: { first_name?: string | null; last_name?: string | null } | null;
  email?: string | null;
  contact_email?: string | null;
  subtotal_price?: string | null;
  total_price: string;
  line_items: ShopifyLineItem[];
};

function mapEstadoPago(financialStatus: string | null): "PENDIENTE" | "PAGADO" | "PARCIAL" | "REEMBOLSADO" {
  switch (financialStatus) {
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

/**
 * Procesa un pedido de Shopify a partir del payload que ya viene completo en el
 * webhook "orders/create" (a diferencia de Tienda Nube, acá no hace falta un llamado
 * aparte a la API: line_items, cliente y totales ya están en el mismo aviso).
 * Matchea cada línea por el código de SKU, igual que Tienda Nube.
 */
export async function procesarOrdenShopify(
  orden: ShopifyOrder
): Promise<{ pedidoId: string; creado: boolean }> {
  const shopifyOrderId = String(orden.id);

  const yaExiste = await prisma.pedido.findUnique({ where: { shopifyOrderId } });
  if (yaExiste) return { pedidoId: yaExiste.id, creado: false };

  const itemsResueltos: { skuId: string; cantidad: number; precioUnitario: number }[] = [];
  const sinMatch: string[] = [];

  for (const item of orden.line_items ?? []) {
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
      `Pedido Shopify ${orden.id}: items sin SKU mapeado, no descuentan stock: ${sinMatch.join(", ")}`
    );
  }

  const fecha = new Date(orden.created_at);
  const clienteNombre = orden.customer
    ? [orden.customer.first_name, orden.customer.last_name].filter(Boolean).join(" ") || null
    : null;
  const clienteEmail = orden.email ?? orden.contact_email ?? null;
  const subtotal = orden.subtotal_price ?? orden.total_price;
  const numeroPedido = orden.name ?? (orden.order_number ? String(orden.order_number) : shopifyOrderId);

  const pedido = await prisma.$transaction(async (tx) => {
    const nuevo = await tx.pedido.create({
      data: {
        shopifyOrderId,
        numeroPedido,
        fecha,
        clienteNombre,
        clienteEmail,
        estadoPedido: "CERRADO",
        estadoPago: mapEstadoPago(orden.financial_status),
        subtotal,
        total: orden.total_price,
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

  return { pedidoId: pedido.id, creado: true };
}
