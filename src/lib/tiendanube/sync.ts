import { prisma } from "@/lib/db";
import { getCredentials, getProducts, updateStockAndPrice } from "@/lib/tiendanube/client";

/**
 * Matchea las variantes de Tienda Nube con nuestros SKU por código (campo `sku` de
 * la variante) y completa tiendaNubeProductId/tiendaNubeVariantId automáticamente.
 */
export async function sincronizarProductos() {
  const creds = await getCredentials();
  if (!creds) throw new Error("No hay conexión activa con Tienda Nube");

  const productos = await getProducts(creds);
  const skus = await prisma.sku.findMany({ where: { activo: true } });

  const matcheados: string[] = [];

  for (const producto of productos) {
    for (const variante of producto.variants) {
      if (!variante.sku) continue;
      const sku = skus.find((s) => s.codigo === variante.sku);
      if (!sku) continue;

      await prisma.sku.update({
        where: { id: sku.id },
        data: {
          tiendaNubeProductId: String(producto.id),
          tiendaNubeVariantId: String(variante.id),
        },
      });
      matcheados.push(sku.codigo);
    }
  }

  const sinMatch = skus.filter((s) => !matcheados.includes(s.codigo)).map((s) => s.codigo);

  return { matcheados, sinMatch };
}

/** Empuja el stock actual (StockActual) hacia Tienda Nube para los SKU mapeados. */
export async function reenviarStock(skuIds?: string[]) {
  const creds = await getCredentials();
  if (!creds) throw new Error("No hay conexión activa con Tienda Nube");

  const skus = await prisma.sku.findMany({
    where: {
      activo: true,
      tiendaNubeVariantId: { not: null },
      ...(skuIds ? { id: { in: skuIds } } : {}),
    },
    include: { stockActual: true },
  });

  const items = skus
    .filter((s) => s.tiendaNubeVariantId)
    .map((s) => ({
      variant_id: Number(s.tiendaNubeVariantId),
      stock: Math.max(0, Math.floor(Number(s.stockActual?.cantidadActual ?? 0))),
    }));

  if (items.length > 0) {
    await updateStockAndPrice(creds, items);
  }

  return items.length;
}
