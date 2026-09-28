import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  procesarOrdenShopify,
  procesarCancelacionShopify,
  procesarReembolsoShopify,
} from "@/lib/shopify/procesarPedido";

/**
 * Shopify firma el body crudo con HMAC-SHA256 y el secreto de firma de webhooks
 * (el que se ve en Configuración → Notificaciones → Webhooks), codificado en
 * base64 — a diferencia de Tienda Nube, que usa hex. Header: X-Shopify-Hmac-Sha256.
 */
function verificarFirma(rawBody: string, signature: string | null): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!signature || !secret) return false;

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");

  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return false;

  return timingSafeEqual(expectedBuf, signatureBuf);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-shopify-hmac-sha256");

  if (!verificarFirma(rawBody, signature)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  const topic = request.headers.get("x-shopify-topic") ?? "orders/create";
  const shopDomain = request.headers.get("x-shopify-shop-domain") ?? "";
  const payload = JSON.parse(rawBody);

  const evento = await prisma.webhookEvent.create({
    data: {
      evento: topic,
      storeId: shopDomain,
      payload,
      procesado: false,
    },
  });

  try {
    if (topic === "orders/create" && payload.id) {
      await procesarOrdenShopify(payload);
    } else if (topic === "orders/cancelled" && payload.id) {
      await procesarCancelacionShopify(payload);
    } else if (topic === "refunds/create" && payload.id) {
      await procesarReembolsoShopify(payload);
    }
    await prisma.webhookEvent.update({ where: { id: evento.id }, data: { procesado: true } });
  } catch (error) {
    await prisma.webhookEvent.update({
      where: { id: evento.id },
      data: { error: error instanceof Error ? error.message : "Error desconocido" },
    });
    // Devolver 200 igual: si contestamos error, Shopify reintenta el mismo webhook
    // muchas veces y no suma nada — el evento ya quedó guardado con su error para revisar.
  }

  return NextResponse.json({ ok: true });
}
