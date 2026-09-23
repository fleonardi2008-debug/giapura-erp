"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { calcularCostoUnitario, getRecetaVigente } from "@/lib/costing";
import { marcarLoteRecibido } from "@/lib/actions/lotes";
import { Prisma } from "@/generated/prisma/client";

// Estas dos acciones las usa tanto el dueño como el operador de fábrica (su login
// limitado solo ve /produccion): reportar frascos y armar packs son trabajo físico
// de la fábrica, no una decisión de plata, así que no llevan requireOwnerSession.

const reportarFrascoSchema = z.object({
  skuId: z.string().min(1, "Elegí un frasco"),
  cantidad: z.coerce.number().positive("Debe ser mayor a 0"),
  fecha: z.coerce.date(),
  nota: z.string().trim().optional(),
});

export async function fabricaReportarFrasco(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "No autenticado" };

  const parsed = reportarFrascoSchema.safeParse({
    skuId: formData.get("skuId"),
    cantidad: formData.get("cantidad"),
    fecha: formData.get("fecha") || new Date(),
    nota: formData.get("nota") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { skuId, cantidad, fecha, nota } = parsed.data;

  const sku = await prisma.sku.findUnique({ where: { id: skuId } });
  if (!sku) return { error: "El producto no existe" };
  if (sku.nivel !== "FRASCO") return { error: "Acá solo se reporta producción de frascos." };

  const numeroLote = `FAB-${sku.codigo}-${Date.now()}`;
  const lote = await prisma.loteProduccion.create({
    data: { skuId, fecha, cantidadUnidades: cantidad, numeroLote, estado: "EN_FABRICA", nota },
  });

  // Reusa exactamente la misma lógica que ya usa el dueño en Lotes de producción:
  // descuenta insumos por receta y suma el frasco al stock, con su costo snapshot.
  const resultado = await marcarLoteRecibido(lote.id);

  revalidatePath("/produccion");
  revalidatePath("/lotes");
  revalidatePath("/stock");

  if (resultado?.error) {
    // No se pierde el reporte: queda planificado. El dueño completa el costo que
    // falta y lo recibe después desde Lotes de producción.
    return {
      error: `Quedó registrado, pero falta completar costos para sumarlo al stock: ${resultado.error}`,
    };
  }

  return { success: true };
}

const armarPackSchema = z.object({
  packId: z.string().min(1, "Elegí un pack"),
  cantidad: z.coerce.number().int().positive("Debe ser mayor a 0"),
  fecha: z.coerce.date(),
  nota: z.string().trim().optional(),
});

export async function armarPack(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "No autenticado" };

  const parsed = armarPackSchema.safeParse({
    packId: formData.get("packId"),
    cantidad: formData.get("cantidad"),
    fecha: formData.get("fecha") || new Date(),
    nota: formData.get("nota") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { packId, cantidad, fecha, nota } = parsed.data;

  const pack = await prisma.sku.findUnique({ where: { id: packId } });
  if (!pack) return { error: "El producto no existe" };
  if (pack.nivel !== "PACK") return { error: "Acá solo se arman packs." };

  const composicion = await prisma.skuComposicion.findMany({
    where: { packId },
    include: { componente: true },
  });
  if (composicion.length === 0) {
    return { error: "Este pack no tiene composición definida todavía." };
  }

  // Igual que en lotes.ts: se evalúa al final del día para que un costo cargado
  // hoy mismo ya cuente como vigente.
  const fechaEfectiva = new Date(fecha);
  fechaEfectiva.setUTCHours(23, 59, 59, 999);

  const costo = await calcularCostoUnitario(packId, fechaEfectiva);
  if (costo.faltantes.length > 0) {
    return { error: `No se puede armar: ${costo.faltantes.join(" ")}` };
  }

  // Stock suficiente de cada frasco componente.
  const stocksFrascos = await prisma.stockActual.findMany({
    where: { skuId: { in: composicion.map((c) => c.componenteId) } },
  });
  const stockPorFrasco = new Map(stocksFrascos.map((s) => [s.skuId!, s.cantidadActual]));
  for (const comp of composicion) {
    const necesario = new Prisma.Decimal(comp.cantidad).times(cantidad);
    const disponible = stockPorFrasco.get(comp.componenteId) ?? new Prisma.Decimal(0);
    if (disponible.lessThan(necesario)) {
      return {
        error: `No hay suficientes frascos de "${comp.componente.nombre}": disponés ${disponible.toString()}, necesitás ${necesario.toString()}.`,
      };
    }
  }

  // Stock suficiente del packaging propio del pack (ej: la caja), si tiene receta.
  const receta = await getRecetaVigente(packId, fechaEfectiva);
  if (receta) {
    const stocksInsumos = await prisma.stockActual.findMany({
      where: { insumoId: { in: receta.items.map((i) => i.insumoId) } },
    });
    const stockPorInsumo = new Map(stocksInsumos.map((s) => [s.insumoId!, s.cantidadActual]));
    for (const item of receta.items) {
      const necesario = item.cantidadPorUnidad.times(cantidad);
      const disponible = stockPorInsumo.get(item.insumoId) ?? new Prisma.Decimal(0);
      if (disponible.lessThan(necesario)) {
        return {
          error: `Falta "${item.insumo.nombre}" para armar el pack: disponés ${disponible.toString()}, necesitás ${necesario.toString()}.`,
        };
      }
    }
  }

  const numeroLote = `ARM-${pack.codigo}-${Date.now()}`;
  const costoTotalLote = costo.costoTotal.times(cantidad);

  await prisma.$transaction(async (tx) => {
    const lote = await tx.loteProduccion.create({
      data: {
        skuId: packId,
        fecha,
        cantidadUnidades: cantidad,
        numeroLote,
        estado: "RECIBIDO",
        recibidoAt: new Date(),
        costoUnitarioSnapshot: costo.costoTotal,
        costoTotalSnapshot: costoTotalLote,
        nota,
      },
    });

    // Consumir los frascos que componen el pack.
    for (const comp of composicion) {
      const cantidadConsumida = new Prisma.Decimal(comp.cantidad).times(cantidad);
      await tx.movimientoStock.create({
        data: {
          tipoItem: "PRODUCTO_TERMINADO",
          skuId: comp.componenteId,
          tipoMovimiento: "PRODUCCION_CONSUMO",
          cantidad: cantidadConsumida.negated(),
          loteProduccionId: lote.id,
          nota: `Usado para armar ${cantidad} x ${pack.nombre}`,
          createdById: session.user.id,
        },
      });
      await tx.stockActual.update({
        where: { skuId: comp.componenteId },
        data: { cantidadActual: { decrement: cantidadConsumida } },
      });
    }

    // Consumir el packaging propio del pack (la caja, etiqueta, etc.), si tiene receta.
    if (receta) {
      for (const item of receta.items) {
        const cantidadConsumida = item.cantidadPorUnidad.times(cantidad);
        await tx.movimientoStock.create({
          data: {
            tipoItem: "INSUMO",
            insumoId: item.insumoId,
            tipoMovimiento: "PRODUCCION_CONSUMO",
            cantidad: cantidadConsumida.negated(),
            loteProduccionId: lote.id,
            createdById: session.user.id,
          },
        });
        await tx.stockActual.update({
          where: { insumoId: item.insumoId },
          data: { cantidadActual: { decrement: cantidadConsumida } },
        });
      }
    }

    // Sumar el pack armado, con costo promedio ponderado (igual criterio que un lote).
    await tx.movimientoStock.create({
      data: {
        tipoItem: "PRODUCTO_TERMINADO",
        skuId: packId,
        tipoMovimiento: "PRODUCCION_INGRESO",
        cantidad,
        costoUnitarioSnapshot: costo.costoTotal,
        loteProduccionId: lote.id,
        createdById: session.user.id,
      },
    });

    const stockPack = await tx.stockActual.findUnique({ where: { skuId: packId } });
    const cantidadPrevia = stockPack?.cantidadActual ?? new Prisma.Decimal(0);
    const costoPrevio = stockPack?.costoPromedioPonderado ?? new Prisma.Decimal(0);
    const nuevaCantidad = cantidadPrevia.plus(cantidad);
    const nuevoCostoPromedio = nuevaCantidad.isZero()
      ? new Prisma.Decimal(0)
      : cantidadPrevia
          .times(costoPrevio)
          .plus(new Prisma.Decimal(cantidad).times(costo.costoTotal))
          .dividedBy(nuevaCantidad);

    await tx.stockActual.update({
      where: { skuId: packId },
      data: { cantidadActual: nuevaCantidad, costoPromedioPonderado: nuevoCostoPromedio },
    });
  });

  revalidatePath("/produccion");
  revalidatePath("/lotes");
  revalidatePath("/stock");
  revalidatePath("/skus");
  return { success: true };
}
