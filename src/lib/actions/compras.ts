"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession, requireOwnerSession } from "@/lib/session";
import { Prisma } from "@/generated/prisma/client";

const crearCompraSchema = z.object({
  insumoId: z.string().min(1, "Elegí un insumo"),
  cantidad: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  costoUnitario: z.coerce.number().positive("El costo unitario debe ser mayor a 0"),
  fecha: z.coerce.date(),
  proveedor: z.string().trim().optional(),
  nota: z.string().trim().optional(),
});

function revalidarCompras() {
  revalidatePath("/compras");
  revalidatePath("/insumos");
  revalidatePath("/stock");
  revalidatePath("/resultados");
  revalidatePath("/");
}

export async function crearCompra(formData: FormData) {
  // Decidir gastar plata es del dueño; la fábrica solo confirma cuando el material llega.
  const session = await requireOwnerSession();
  if (!session) return { error: "No autorizado" };

  const parsed = crearCompraSchema.safeParse({
    insumoId: formData.get("insumoId"),
    cantidad: formData.get("cantidad"),
    costoUnitario: formData.get("costoUnitario"),
    fecha: formData.get("fecha") || new Date(),
    proveedor: formData.get("proveedor") || undefined,
    nota: formData.get("nota") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { insumoId, cantidad, costoUnitario, fecha, proveedor, nota } = parsed.data;

  const insumo = await prisma.insumo.findUnique({ where: { id: insumoId } });
  if (!insumo) return { error: "El insumo no existe" };

  const costoTotal = new Prisma.Decimal(cantidad).times(costoUnitario).toDecimalPlaces(2);

  await prisma.compraInsumo.create({
    data: {
      insumoId,
      cantidad,
      costoUnitario,
      costoTotal,
      fecha,
      proveedor,
      nota,
      estado: "COMPRADO",
      createdById: session.user.id,
    },
  });

  revalidarCompras();
  return { success: true };
}

export async function marcarCompraRecibida(compraId: string) {
  // La confirma quien reciba el material: dueño u operador de fábrica.
  const session = await getSession();
  if (!session) return { error: "No autenticado" };

  const compra = await prisma.compraInsumo.findUnique({ where: { id: compraId } });
  if (!compra) return { error: "Compra no encontrada" };
  if (compra.estado === "RECIBIDO") return { error: "Esta compra ya fue recibida" };
  if (compra.estado === "CANCELADO") return { error: "Esta compra está cancelada" };

  const recibidaAt = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      // Guardia: solo una recepción puede ganar aunque se haga doble clic.
      const { count } = await tx.compraInsumo.updateMany({
        where: { id: compraId, estado: "COMPRADO" },
        data: { estado: "RECIBIDO", recibidaAt },
      });
      if (count !== 1) throw new Error("YA_PROCESADA");

      await tx.movimientoStock.create({
        data: {
          tipoItem: "INSUMO",
          insumoId: compra.insumoId,
          tipoMovimiento: "COMPRA",
          cantidad: compra.cantidad,
          costoUnitarioSnapshot: compra.costoUnitario,
          compraId,
          fecha: recibidaAt,
          nota: compra.nota,
          createdById: session.user.id,
        },
      });

      await tx.stockActual.update({
        where: { insumoId: compra.insumoId },
        data: { cantidadActual: { increment: compra.cantidad } },
      });

      // El último precio pagado pasa a ser el costo vigente, solo si cambió.
      const costoVigente = await tx.insumoCosto.findFirst({
        where: { insumoId: compra.insumoId, vigenteHasta: null },
        orderBy: { vigenteDesde: "desc" },
      });
      if (!costoVigente || !costoVigente.costoUnitario.equals(compra.costoUnitario)) {
        await tx.insumoCosto.updateMany({
          where: { insumoId: compra.insumoId, vigenteHasta: null },
          data: { vigenteHasta: recibidaAt },
        });
        await tx.insumoCosto.create({
          data: {
            insumoId: compra.insumoId,
            costoUnitario: compra.costoUnitario,
            vigenteDesde: recibidaAt,
            nota: "Actualizado desde compra recibida",
          },
        });
      }
    });
  } catch (e) {
    if (e instanceof Error && e.message === "YA_PROCESADA") {
      return { error: "Esta compra ya fue procesada" };
    }
    throw e;
  }

  revalidarCompras();
  revalidatePath("/skus");
  return { success: true };
}

export async function cancelarCompra(compraId: string) {
  const session = await requireOwnerSession();
  if (!session) return { error: "No autorizado" };

  // Solo se puede cancelar lo que todavía no llegó: si ya es stock, corresponde un ajuste.
  const { count } = await prisma.compraInsumo.updateMany({
    where: { id: compraId, estado: "COMPRADO" },
    data: { estado: "CANCELADO" },
  });
  if (count !== 1) return { error: "Solo se pueden cancelar compras que todavía no llegaron" };

  revalidarCompras();
  return { success: true };
}
