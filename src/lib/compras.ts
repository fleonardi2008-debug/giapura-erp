import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export type ComprasMes = {
  /** Plata ya pagada en compras del mes (comprado + recibido, sin canceladas). */
  total: Prisma.Decimal;
  /** Parte del total que todavía no llegó a la fábrica. */
  enCamino: Prisma.Decimal;
  /** Parte del total que ya llegó a la fábrica. */
  recibido: Prisma.Decimal;
  cantidad: number;
};

/**
 * Plata que salió en compras de insumos en un mes calendario (por fecha de compra).
 * Es caja, no resultado: el costo de estos insumos entra al resultado recién cuando
 * se vende el producto (vía CMV), por eso NO se suma a los gastos operativos.
 */
export async function calcularComprasMes(anio: number, mes: number): Promise<ComprasMes> {
  const desde = new Date(Date.UTC(anio, mes - 1, 1));
  const hasta = new Date(Date.UTC(anio, mes, 1));

  const compras = await prisma.compraInsumo.findMany({
    where: { fecha: { gte: desde, lt: hasta }, estado: { not: "CANCELADO" } },
    select: { estado: true, costoTotal: true },
  });

  const cero = new Prisma.Decimal(0);
  const enCamino = compras
    .filter((c) => c.estado === "COMPRADO")
    .reduce((sum, c) => sum.plus(c.costoTotal), cero);
  const recibido = compras
    .filter((c) => c.estado === "RECIBIDO")
    .reduce((sum, c) => sum.plus(c.costoTotal), cero);

  return { total: enCamino.plus(recibido), enCamino, recibido, cantidad: compras.length };
}

/** Cantidad de cada insumo comprada pero todavía no recibida, por insumoId. */
export async function cantidadEnCaminoPorInsumo() {
  const pendientes = await prisma.compraInsumo.groupBy({
    by: ["insumoId"],
    where: { estado: "COMPRADO" },
    _sum: { cantidad: true },
  });
  return new Map(pendientes.map((p) => [p.insumoId, p._sum.cantidad ?? new Prisma.Decimal(0)]));
}
