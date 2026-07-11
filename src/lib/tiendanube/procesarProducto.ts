import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { getCredentials, getProduct } from "@/lib/tiendanube/client";

/**
 * Reacciona a un cambio de producto en Tienda Nube (webhook product/updated):
 * si el stock de una variante en TN difiere del de Giapura, ajusta Giapura para
 * igualarlo (registrando un movimiento de AJUSTE).
 *
 * IMPORTANTE: no reenvía el stock a TN — eso generaría un loop
 * (push → product/updated → pull → push...). El guard de "delta cero" también
 * evita ruido cuando el cambio en TN lo originó el propio push de Giapura.
 */
export async function procesarProductoActualizado(tiendaNubeProductId: string) {
  const creds = await getCredentials();
  if (!creds) return;

  const producto = await getProduct(creds, tiendaNubeProductId);

  for (const variante of producto.variants ?? []) {
    if (variante.stock === null || variante.stock === undefined) continue;

    const sku = await prisma.sku.findFirst({
      where: { tiendaNubeVariantId: String(variante.id) },
      include: { stockActual: true },
    });
    if (!sku) continue;

    const actual = sku.stockActual?.cantidadActual ?? new Prisma.Decimal(0);
    const objetivo = new Prisma.Decimal(variante.stock);
    const delta = objetivo.minus(actual);

    // Ya coinciden: nada que hacer (evita el loop con el push de Giapura).
    if (delta.isZero()) continue;

    await prisma.$transaction(async (tx) => {
      await tx.movimientoStock.create({
        data: {
          tipoItem: "PRODUCTO_TERMINADO",
          skuId: sku.id,
          tipoMovimiento: "AJUSTE",
          cantidad: delta,
          nota: "Ajuste automático desde Tienda Nube",
        },
      });
      await tx.stockActual.update({
        where: { skuId: sku.id },
        data: { cantidadActual: objetivo },
      });
    });
  }
}
