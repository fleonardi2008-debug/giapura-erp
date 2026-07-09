import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export type ResultadoMensual = {
  anio: number;
  mes: number;
  desde: Date;
  hasta: Date;
  ingresos: Prisma.Decimal;
  cmv: Prisma.Decimal;
  gastos: Prisma.Decimal;
  margenBruto: Prisma.Decimal;
  margenNeto: Prisma.Decimal;
  cantidadPedidos: number;
};

/**
 * Ingresos/CMV/gastos de un mes calendario. El CMV usa el costo_unitario_snapshot
 * guardado en cada MovimientoStock de venta, así que nunca se recalcula
 * retroactivamente aunque cambien los costos vigentes después.
 */
export async function calcularResultadosMes(anio: number, mes: number): Promise<ResultadoMensual> {
  const desde = new Date(Date.UTC(anio, mes - 1, 1));
  const hasta = new Date(Date.UTC(anio, mes, 1));

  const [pedidos, movimientosVenta, gastos] = await Promise.all([
    prisma.pedido.findMany({
      where: { fecha: { gte: desde, lt: hasta } },
      select: { total: true },
    }),
    prisma.movimientoStock.findMany({
      where: { tipoMovimiento: "VENTA", fecha: { gte: desde, lt: hasta } },
      select: { cantidad: true, costoUnitarioSnapshot: true },
    }),
    prisma.gasto.findMany({
      where: { fecha: { gte: desde, lt: hasta } },
      select: { monto: true },
    }),
  ]);

  const ingresos = pedidos.reduce((sum, p) => sum.plus(p.total), new Prisma.Decimal(0));
  const cmv = movimientosVenta.reduce(
    (sum, m) => sum.plus(m.cantidad.abs().times(m.costoUnitarioSnapshot ?? 0)),
    new Prisma.Decimal(0)
  );
  const gastosTotal = gastos.reduce((sum, g) => sum.plus(g.monto), new Prisma.Decimal(0));

  const margenBruto = ingresos.minus(cmv);
  const margenNeto = margenBruto.minus(gastosTotal);

  return {
    anio,
    mes,
    desde,
    hasta,
    ingresos,
    cmv,
    gastos: gastosTotal,
    margenBruto,
    margenNeto,
    cantidadPedidos: pedidos.length,
  };
}
