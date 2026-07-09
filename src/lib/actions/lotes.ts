"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { calcularCostoUnitario, getRecetaVigente } from "@/lib/costing";
import { Prisma } from "@/generated/prisma/client";

const crearLoteSchema = z.object({
  skuId: z.string().min(1),
  fecha: z.coerce.date(),
  cantidadUnidades: z.coerce.number().positive("Debe ser mayor a 0"),
  numeroLote: z.string().min(1, "Requerido"),
  nota: z.string().optional(),
});

export async function createLote(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  const parsed = crearLoteSchema.safeParse({
    skuId: formData.get("skuId"),
    fecha: formData.get("fecha") || new Date(),
    cantidadUnidades: formData.get("cantidadUnidades"),
    numeroLote: formData.get("numeroLote"),
    nota: formData.get("nota") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  try {
    await prisma.loteProduccion.create({
      data: { ...parsed.data, estado: "EN_FABRICA" },
    });
  } catch {
    return { error: "Ya existe un lote con ese número." };
  }

  revalidatePath("/lotes");
  return { success: true };
}

export async function marcarLoteRecibido(loteId: string) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  const lote = await prisma.loteProduccion.findUnique({ where: { id: loteId } });
  if (!lote) return { error: "Lote no encontrado" };
  if (lote.estado === "RECIBIDO") return { error: "Este lote ya fue recibido" };

  const costo = await calcularCostoUnitario(lote.skuId, lote.fecha);
  if (costo.faltantes.length > 0) {
    return {
      error: `No se puede recibir: ${costo.faltantes.join(" ")}`,
    };
  }

  const receta = await getRecetaVigente(lote.skuId, lote.fecha);

  await prisma.$transaction(async (tx) => {
    const costoTotal = costo.costoTotal.times(lote.cantidadUnidades);

    await tx.loteProduccion.update({
      where: { id: loteId },
      data: {
        estado: "RECIBIDO",
        recibidoAt: new Date(),
        costoUnitarioSnapshot: costo.costoTotal,
        costoTotalSnapshot: costoTotal,
      },
    });

    // Consumo de insumos según receta vigente
    for (const item of receta!.items) {
      const cantidadConsumida = item.cantidadPorUnidad.times(lote.cantidadUnidades);

      await tx.movimientoStock.create({
        data: {
          tipoItem: "INSUMO",
          insumoId: item.insumoId,
          tipoMovimiento: "PRODUCCION_CONSUMO",
          cantidad: cantidadConsumida.negated(),
          loteProduccionId: loteId,
          createdById: session.user.id,
        },
      });

      await tx.stockActual.update({
        where: { insumoId: item.insumoId },
        data: { cantidadActual: { decrement: cantidadConsumida } },
      });
    }

    // Ingreso de producto terminado
    await tx.movimientoStock.create({
      data: {
        tipoItem: "PRODUCTO_TERMINADO",
        skuId: lote.skuId,
        tipoMovimiento: "PRODUCCION_INGRESO",
        cantidad: lote.cantidadUnidades,
        costoUnitarioSnapshot: costo.costoTotal,
        loteProduccionId: loteId,
        createdById: session.user.id,
      },
    });

    const stockSku = await tx.stockActual.findUnique({ where: { skuId: lote.skuId } });
    const cantidadPrevia = stockSku?.cantidadActual ?? new Prisma.Decimal(0);
    const costoPrevio = stockSku?.costoPromedioPonderado ?? new Prisma.Decimal(0);
    const nuevaCantidad = cantidadPrevia.plus(lote.cantidadUnidades);
    const nuevoCostoPromedio = nuevaCantidad.isZero()
      ? new Prisma.Decimal(0)
      : cantidadPrevia
          .times(costoPrevio)
          .plus(lote.cantidadUnidades.times(costo.costoTotal))
          .dividedBy(nuevaCantidad);

    await tx.stockActual.update({
      where: { skuId: lote.skuId },
      data: {
        cantidadActual: nuevaCantidad,
        costoPromedioPonderado: nuevoCostoPromedio,
      },
    });
  });

  revalidatePath("/lotes");
  revalidatePath("/stock");
  return { success: true };
}
