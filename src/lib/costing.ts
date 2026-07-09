import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export async function getCostoInsumoVigente(insumoId: string, fecha: Date = new Date()) {
  return prisma.insumoCosto.findFirst({
    where: {
      insumoId,
      vigenteDesde: { lte: fecha },
      OR: [{ vigenteHasta: null }, { vigenteHasta: { gt: fecha } }],
    },
    orderBy: { vigenteDesde: "desc" },
  });
}

export async function getCostoFabricaVigente(skuId: string, fecha: Date = new Date()) {
  return prisma.costoFabricaHistorico.findFirst({
    where: {
      skuId,
      vigenteDesde: { lte: fecha },
      OR: [{ vigenteHasta: null }, { vigenteHasta: { gt: fecha } }],
    },
    orderBy: { vigenteDesde: "desc" },
  });
}

export async function getRecetaVigente(skuId: string, fecha: Date = new Date()) {
  return prisma.receta.findFirst({
    where: {
      skuId,
      vigenteDesde: { lte: fecha },
      OR: [{ vigenteHasta: null }, { vigenteHasta: { gt: fecha } }],
    },
    orderBy: { vigenteDesde: "desc" },
    include: { items: { include: { insumo: true } } },
  });
}

export type CostoUnitarioBreakdown = {
  skuId: string;
  fecha: Date;
  costoInsumos: Prisma.Decimal;
  costoFabrica: Prisma.Decimal;
  costoTotal: Prisma.Decimal;
  receta: Awaited<ReturnType<typeof getRecetaVigente>>;
  faltantes: string[];
};

/**
 * Costo unitario de un SKU a una fecha dada: suma de (cantidad de cada insumo de la
 * receta vigente x costo vigente de ese insumo) + costo de fábrica vigente.
 * Este valor se snapshotea en cada lote de producción, no se recalcula retroactivamente.
 */
export async function calcularCostoUnitario(
  skuId: string,
  fecha: Date = new Date()
): Promise<CostoUnitarioBreakdown> {
  const [receta, costoFabrica] = await Promise.all([
    getRecetaVigente(skuId, fecha),
    getCostoFabricaVigente(skuId, fecha),
  ]);

  const faltantes: string[] = [];
  let costoInsumos = new Prisma.Decimal(0);

  if (!receta) {
    faltantes.push("No hay receta vigente para este SKU.");
  } else {
    for (const item of receta.items) {
      const costoInsumo = await getCostoInsumoVigente(item.insumoId, fecha);
      if (!costoInsumo) {
        faltantes.push(`Falta costo vigente de "${item.insumo.nombre}".`);
        continue;
      }
      costoInsumos = costoInsumos.plus(costoInsumo.costoUnitario.times(item.cantidadPorUnidad));
    }
  }

  if (!costoFabrica) {
    faltantes.push("No hay costo de fábrica vigente para este SKU.");
  }

  const costoFabricaValor = costoFabrica?.costoPorUnidad ?? new Prisma.Decimal(0);
  const costoTotal = costoInsumos.plus(costoFabricaValor);

  return {
    skuId,
    fecha,
    costoInsumos,
    costoFabrica: costoFabricaValor,
    costoTotal,
    receta,
    faltantes,
  };
}
