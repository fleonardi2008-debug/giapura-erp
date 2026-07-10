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

export type DetalleInsumo = {
  insumoId: string;
  nombre: string;
  cantidadPorUnidad: Prisma.Decimal;
  unidadMedida: string;
  costoPorUnidadMedida: Prisma.Decimal | null;
  subtotal: Prisma.Decimal;
};

export type CostoUnitarioBreakdown = {
  skuId: string;
  fecha: Date;
  detalleInsumos: DetalleInsumo[];
  costoInsumosBase: Prisma.Decimal;
  perdidaPct: Prisma.Decimal;
  costoInsumos: Prisma.Decimal;
  costoFabrica: Prisma.Decimal;
  /** Costo variable/marginal: insumos (con merma) + costo de fábrica. */
  costoTotal: Prisma.Decimal;
  precioVenta: Prisma.Decimal | null;
  gastosGeneralesMensuales: Prisma.Decimal | null;
  produccionMensualEstimada: number | null;
  /** Gastos fijos mensuales prorrateados por unidad estimada. */
  gastoGeneralPorUnidad: Prisma.Decimal;
  /** Costo unitario completo: costo variable + gastos generales por unidad. */
  costoUnitarioCompleto: Prisma.Decimal;
  margenUnitario: Prisma.Decimal | null;
  contribucionMarginal: Prisma.Decimal | null;
  puntoEquilibrioUnidades: Prisma.Decimal | null;
  receta: Awaited<ReturnType<typeof getRecetaVigente>>;
  faltantes: string[];
};

/**
 * Costo unitario de un SKU a una fecha dada: suma de (cantidad de cada insumo de la
 * receta vigente x costo vigente de ese insumo, ajustado por % de merma) + costo de
 * fábrica vigente, más el prorrateo de gastos generales fijos por unidad.
 * El costo variable (costoTotal) se snapshotea en cada lote de producción, no se
 * recalcula retroactivamente.
 */
export async function calcularCostoUnitario(
  skuId: string,
  fecha: Date = new Date()
): Promise<CostoUnitarioBreakdown> {
  const [sku, receta, costoFabrica] = await Promise.all([
    prisma.sku.findUnique({ where: { id: skuId } }),
    getRecetaVigente(skuId, fecha),
    getCostoFabricaVigente(skuId, fecha),
  ]);

  const faltantes: string[] = [];
  let costoInsumosBase = new Prisma.Decimal(0);
  const detalleInsumos: DetalleInsumo[] = [];

  if (!receta) {
    faltantes.push("No hay receta vigente para este SKU.");
  } else {
    for (const item of receta.items) {
      const costoInsumo = await getCostoInsumoVigente(item.insumoId, fecha);
      if (!costoInsumo) {
        faltantes.push(`Falta costo vigente de "${item.insumo.nombre}".`);
        detalleInsumos.push({
          insumoId: item.insumoId,
          nombre: item.insumo.nombre,
          cantidadPorUnidad: item.cantidadPorUnidad,
          unidadMedida: item.unidadMedida,
          costoPorUnidadMedida: null,
          subtotal: new Prisma.Decimal(0),
        });
        continue;
      }
      const subtotal = costoInsumo.costoUnitario.times(item.cantidadPorUnidad);
      costoInsumosBase = costoInsumosBase.plus(subtotal);
      detalleInsumos.push({
        insumoId: item.insumoId,
        nombre: item.insumo.nombre,
        cantidadPorUnidad: item.cantidadPorUnidad,
        unidadMedida: item.unidadMedida,
        costoPorUnidadMedida: costoInsumo.costoUnitario,
        subtotal,
      });
    }
  }

  if (!costoFabrica) {
    faltantes.push("No hay costo de fábrica vigente para este SKU.");
  }

  const perdidaPct = sku?.perdidaPct ?? new Prisma.Decimal(0);
  const costoInsumos = costoInsumosBase.times(perdidaPct.dividedBy(100).plus(1));
  const costoFabricaValor = costoFabrica?.costoPorUnidad ?? new Prisma.Decimal(0);
  const costoTotal = costoInsumos.plus(costoFabricaValor);

  const precioVenta = sku?.precioVenta ?? null;
  const gastosGeneralesMensuales = sku?.gastosGeneralesMensuales ?? null;
  const produccionMensualEstimada = sku?.produccionMensualEstimada ?? null;

  const gastoGeneralPorUnidad =
    gastosGeneralesMensuales && produccionMensualEstimada
      ? gastosGeneralesMensuales.dividedBy(produccionMensualEstimada)
      : new Prisma.Decimal(0);

  const costoUnitarioCompleto = costoTotal.plus(gastoGeneralPorUnidad);

  const margenUnitario = precioVenta ? precioVenta.minus(costoUnitarioCompleto) : null;
  const contribucionMarginal = precioVenta ? precioVenta.minus(costoTotal) : null;
  const puntoEquilibrioUnidades =
    gastosGeneralesMensuales && contribucionMarginal && contribucionMarginal.greaterThan(0)
      ? gastosGeneralesMensuales.dividedBy(contribucionMarginal)
      : null;

  return {
    skuId,
    fecha,
    detalleInsumos,
    costoInsumosBase,
    perdidaPct,
    costoInsumos,
    costoFabrica: costoFabricaValor,
    costoTotal,
    precioVenta,
    gastosGeneralesMensuales,
    produccionMensualEstimada,
    gastoGeneralPorUnidad,
    costoUnitarioCompleto,
    margenUnitario,
    contribucionMarginal,
    puntoEquilibrioUnidades,
    receta,
    faltantes,
  };
}
