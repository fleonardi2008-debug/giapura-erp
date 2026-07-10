import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { procesarOrdenTiendaNube } from "@/lib/tiendanube/procesarPedido";

function verificarFirma(rawBody: string, signature: string | null): boolean {
  const secret = process.env.TIENDANUBE_CLIENT_SECRET;
  if (!signature || !secret) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return false;

  return timingSafeEqual(expectedBuf, signatureBuf);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-linkedstore-hmac-sha256");

  if (!verificarFirma(rawBody, signature)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as { store_id: number; event: string; id?: number };

  const evento = await prisma.webhookEvent.create({
    data: {
      evento: payload.event,
      storeId: String(payload.store_id),
      payload,
      procesado: false,
    },
  });

  try {
    if (payload.event?.startsWith("order/") && payload.id) {
      await procesarOrdenTiendaNube(String(payload.id));
    }
    await prisma.webhookEvent.update({ where: { id: evento.id }, data: { procesado: true } });
  } catch (error) {
    await prisma.webhookEvent.update({
      where: { id: evento.id },
      data: { error: error instanceof Error ? error.message : "Error desconocido" },
    });
  }

  return NextResponse.json({ ok: true });
}
