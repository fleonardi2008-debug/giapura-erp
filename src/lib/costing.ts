import { prisma } from "@/lib/db";
import { Prisma, type NivelSku } from "@/generated/prisma/client";

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
  tipo: string;
  cantidadPorUnidad: Prisma.Decimal;
  unidadMedida: string;
  costoPorUnidadMedida: Prisma.Decimal | null;
  subtotal: Prisma.Decimal;
};

/** Un frasco que compone un pack, con su costo unitario y subtotal. */
export type DetalleComponente = {
  componenteId: string;
  codigo: string;
  nombre: string;
  cantidad: number;
  costoUnitario: Prisma.Decimal;
  subtotal: Prisma.Decimal;
};

export type CostoUnitarioBreakdown = {
  skuId: string;
  fecha: Date;
  nivel: NivelSku;
  detalleInsumos: DetalleInsumo[];
  /** Frascos que componen el pack (vacío para frascos). */
  detalleComponentes: DetalleComponente[];
  /** Suma del costo de los frascos que componen el pack. */
  costoComponentes: Prisma.Decimal;
  costoInsumosBase: Prisma.Decimal;
  perdidaPct: Prisma.Decimal;
  costoInsumos: Prisma.Decimal;
  costoFabrica: Prisma.Decimal;
  /** Costo variable/marginal: frascos que lo componen + insumos (con merma) + costo de fábrica. */
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
  const [sku, receta, costoFabrica, composicion] = await Promise.all([
    prisma.sku.findUnique({ where: { id: skuId } }),
    getRecetaVigente(skuId, fecha),
    getCostoFabricaVigente(skuId, fecha),
    prisma.skuComposicion.findMany({
      where: { packId: skuId },
      include: { componente: true },
    }),
  ]);

  const nivel: NivelSku = sku?.nivel ?? "FRASCO";
  const esPack = nivel === "PACK";
  const faltantes: string[] = [];

  // Costo de los frascos que componen el pack (recursivo, 1 nivel de profundidad).
  const detalleComponentes: DetalleComponente[] = [];
  let costoComponentes = new Prisma.Decimal(0);
  if (esPack) {
    if (composicion.length === 0) {
      faltantes.push("El pack no tiene composición definida (frascos que lo forman).");
    }
    for (const comp of composicion) {
      const costoComp = await calcularCostoUnitario(comp.componenteId, fecha);
      const subtotal = costoComp.costoTotal.times(comp.cantidad);
      costoComponentes = costoComponentes.plus(subtotal);
      detalleComponentes.push({
        componenteId: comp.componenteId,
        codigo: comp.componente.codigo,
        nombre: comp.componente.nombre,
        cantidad: comp.cantidad,
        costoUnitario: costoComp.costoTotal,
        subtotal,
      });
      for (const f of costoComp.faltantes) {
        faltantes.push(`${comp.componente.nombre}: ${f}`);
      }
    }
  }

  let costoInsumosBase = new Prisma.Decimal(0);
  const detalleInsumos: DetalleInsumo[] = [];

  if (!receta) {
    // Un frasco sin receta está incompleto; un pack puede no tener packaging propio cargado.
    if (!esPack) faltantes.push("No hay receta vigente para este SKU.");
  } else {
    for (const item of receta.items) {
      const costoInsumo = await getCostoInsumoVigente(item.insumoId, fecha);
      if (!costoInsumo) {
        faltantes.push(`Falta costo vigente de "${item.insumo.nombre}".`);
        detalleInsumos.push({
          insumoId: item.insumoId,
          nombre: item.insumo.nombre,
          tipo: item.insumo.tipo,
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
        tipo: item.insumo.tipo,
        cantidadPorUnidad: item.cantidadPorUnidad,
        unidadMedida: item.unidadMedida,
        costoPorUnidadMedida: costoInsumo.costoUnitario,
        subtotal,
      });
    }
  }

  // El costo de fábrica es clave para los frascos (los produce la fábrica). En un pack,
  // el armado puede no tener costo de fábrica cargado, así que no se marca como faltante.
  if (!costoFabrica && !esPack) {
    faltantes.push("No hay costo de fábrica vigente para este SKU.");
  }

  const perdidaPct = sku?.perdidaPct ?? new Prisma.Decimal(0);
  const costoInsumos = costoInsumosBase.times(perdidaPct.dividedBy(100).plus(1));
  const costoFabricaValor = costoFabrica?.costoPorUnidad ?? new Prisma.Decimal(0);
  const costoTotal = costoComponentes.plus(costoInsumos).plus(costoFabricaValor);

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
    nivel,
    detalleInsumos,
    detalleComponentes,
    costoComponentes,
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
