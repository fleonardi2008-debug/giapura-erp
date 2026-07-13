import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "no-store",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Endpoint público (sin auth, CORS abierto) que consume la landing de lanzamiento
 * para mostrar el contador de packs vendidos en vivo. Solo lectura, no expone datos
 * sensibles. Toda la configuración de la preventa viene de env vars para poder
 * cambiar fecha/objetivo en un solo lugar.
 */
export async function GET() {
  const skuCodigo = process.env.PREVENTA_SKU_CODIGO ?? "PACK LANZAMIENTO";
  const objetivo = Number(process.env.PREVENTA_OBJETIVO ?? "1500");
  const inicioAt = process.env.PREVENTA_INICIO
    ? new Date(process.env.PREVENTA_INICIO)
    : null;
  const finAt = process.env.PREVENTA_FIN ? new Date(process.env.PREVENTA_FIN) : null;

  let vendidos = 0;
  const sku = await prisma.sku.findUnique({ where: { codigo: skuCodigo } });

  if (sku) {
    const agg = await prisma.pedidoItem.aggregate({
      _sum: { cantidad: true },
      where: {
        skuId: sku.id,
        ...(inicioAt ? { pedido: { fecha: { gte: inicioAt } } } : {}),
      },
    });
    const suma = agg._sum.cantidad ?? new Prisma.Decimal(0);
    vendidos = Math.floor(Number(suma));
  }

  const ahora = new Date();
  // La urgencia es el TIEMPO: la preventa abre/cierra solo por la ventana horaria,
  // no por llegar a un número de ventas.
  const abierta =
    (!inicioAt || ahora >= inicioAt) && (!finAt || ahora <= finAt);

  return NextResponse.json(
    {
      vendidos,
      objetivo,
      inicioAt: inicioAt?.toISOString() ?? null,
      finAt: finAt?.toISOString() ?? null,
      abierta,
    },
    { headers: CORS_HEADERS }
  );
}
