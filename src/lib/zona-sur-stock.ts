import { prisma } from "@/lib/db";

export type StockFrasco = { id: string; nombre: string; total: number; usado: number };

/** Qué frascos (y cuántos) gasta cada producto: un frasco gasta uno de sí mismo, un pack lo que dice su composición. */
export type ConsumoPorSku = Record<string, Record<string, number>>;

/**
 * Stock de Zona Sur: solo cuenta lo que reparte Fran. Los pedidos por Andreani salen de fábrica (stock
 * infinito) y los cancelados no gastan. Los pendientes sí cuentan, porque ya están reservados.
 */
export async function leerStockZonaSur(): Promise<{ stock: StockFrasco[]; consumo: ConsumoPorSku }> {
  const [skus, vendidos] = await Promise.all([
    prisma.sku.findMany({
      select: {
        id: true,
        nombre: true,
        nivel: true,
        stockZonaSur: true,
        composicion: { select: { componenteId: true, cantidad: true } },
      },
    }),
    prisma.zonaSurPedidoItem.groupBy({
      by: ["skuId"],
      _sum: { cantidad: true },
      where: {
        skuId: { not: null },
        pedido: { estado: { not: "CANCELADO" }, metodoEntrega: { not: "ANDREANI" } },
      },
    }),
  ]);

  const consumo: ConsumoPorSku = {};
  for (const s of skus) {
    consumo[s.id] =
      s.nivel === "PACK"
        ? Object.fromEntries(s.composicion.map((c) => [c.componenteId, c.cantidad]))
        : { [s.id]: 1 };
  }

  const usadoPorFrasco: Record<string, number> = {};
  for (const v of vendidos) {
    if (!v.skuId) continue;
    for (const [frascoId, n] of Object.entries(consumo[v.skuId] ?? {})) {
      usadoPorFrasco[frascoId] = (usadoPorFrasco[frascoId] ?? 0) + n * (v._sum.cantidad ?? 0);
    }
  }

  const stock = skus
    .filter((s) => s.nivel === "FRASCO" && s.stockZonaSur != null)
    .map((s) => ({ id: s.id, nombre: s.nombre, total: s.stockZonaSur as number, usado: usadoPorFrasco[s.id] ?? 0 }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  return { stock, consumo };
}
