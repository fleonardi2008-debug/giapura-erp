import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { registrarVentaItem, revertirVentaItem } from "@/lib/ventas";

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

type ShopifyOrderCancelado = { id: number };

/**
 * Reversa el stock de un pedido cancelado en Shopify (webhook "orders/cancelled").
 * Idempotente: si el pedido no existe (nunca matcheó ningún SKU) o ya está
 * CANCELADO, no hace nada.
 */
export async function procesarCancelacionShopify(orden: ShopifyOrderCancelado): Promise<void> {
  const shopifyOrderId = String(orden.id);

  const pedido = await prisma.pedido.findUnique({
    where: { shopifyOrderId },
    include: { items: true },
  });

  if (!pedido) {
    console.warn(`Cancelación Shopify ${orden.id}: no se encontró el pedido, se ignora.`);
    return;
  }
  if (pedido.estadoPedido === "CANCELADO") return;

  await prisma.$transaction(async (tx) => {
    for (const item of pedido.items) {
      if (!item.skuId) continue;
      await revertirVentaItem(tx, {
        pedidoId: pedido.id,
        skuId: item.skuId,
        cantidad: Number(item.cantidad),
        fecha: new Date(),
        nota: `Cancelación Shopify pedido ${orden.id}`,
      });
    }

    await tx.pedido.update({
      where: { id: pedido.id },
      data: { estadoPedido: "CANCELADO" },
    });
  });
}

type ShopifyRefund = {
  id: number;
  order_id: number;
  created_at: string;
  refund_line_items?: {
    quantity: number;
    line_item?: { sku: string | null } | null;
  }[];
};

/**
 * Repone el stock de los items reembolsados en Shopify (webhook "refunds/create").
 * Un pedido puede tener varios reembolsos parciales; cada uno se identifica por su
 * propio id de Shopify para no reprocesarlo si el webhook se reintenta.
 */
export async function procesarReembolsoShopify(refund: ShopifyRefund): Promise<void> {
  const shopifyOrderId = String(refund.order_id);
  const notaReembolso = `Reembolso Shopify #${refund.id} (pedido ${refund.order_id})`;

  const pedido = await prisma.pedido.findUnique({ where: { shopifyOrderId } });
  if (!pedido) {
    console.warn(`Reembolso Shopify ${refund.id}: no se encontró el pedido, se ignora.`);
    return;
  }

  const yaProcesado = await prisma.movimientoStock.findFirst({
    where: { pedidoId: pedido.id, nota: notaReembolso },
  });
  if (yaProcesado) return;

  const itemsResueltos: { skuId: string; cantidad: number }[] = [];
  for (const item of refund.refund_line_items ?? []) {
    const codigo = item.line_item?.sku;
    if (!codigo) continue;
    const sku = await prisma.sku.findUnique({ where: { codigo } });
    if (!sku) continue;
    itemsResueltos.push({ skuId: sku.id, cantidad: Number(item.quantity) });
  }

  await prisma.$transaction(async (tx) => {
    for (const item of itemsResueltos) {
      await revertirVentaItem(tx, {
        pedidoId: pedido.id,
        skuId: item.skuId,
        cantidad: item.cantidad,
        fecha: new Date(refund.created_at),
        nota: notaReembolso,
      });
    }

    // Mismo criterio que Tienda Nube: tanto el reembolso total como el parcial
    // quedan como REEMBOLSADO (no hay un estado intermedio en el modelo actual).
    await tx.pedido.update({
      where: { id: pedido.id },
      data: { estadoPago: "REEMBOLSADO" },
    });
  });
}
