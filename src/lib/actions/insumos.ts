"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

const crearInsumoSchema = z.object({
  nombre: z.string().min(1, "Requerido"),
  tipo: z.enum(["INGREDIENTE", "PACKAGING", "OTRO"]),
  unidadMedida: z.string().min(1, "Requerido"),
  stockMinimo: z.coerce.number().min(0).default(0),
  costoInicial: z.coerce.number().min(0).optional(),
});

export async function createInsumo(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  const parsed = crearInsumoSchema.safeParse({
    nombre: formData.get("nombre"),
    tipo: formData.get("tipo"),
    unidadMedida: formData.get("unidadMedida"),
    stockMinimo: formData.get("stockMinimo") || 0,
    costoInicial: formData.get("costoInicial") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { nombre, tipo, unidadMedida, stockMinimo, costoInicial } = parsed.data;

  await prisma.$transaction(async (tx) => {
    const insumo = await tx.insumo.create({
      data: { nombre, tipo, unidadMedida, stockMinimo },
    });

    await tx.stockActual.create({
      data: { itemTipo: "INSUMO", insumoId: insumo.id, cantidadActual: 0 },
    });

    if (costoInicial !== undefined) {
      await tx.insumoCosto.create({
        data: {
          insumoId: insumo.id,
          costoUnitario: costoInicial,
          vigenteDesde: new Date(),
        },
      });
    }
  });

  revalidatePath("/insumos");
  return { success: true };
}

const actualizarCostoSchema = z.object({
  insumoId: z.string().min(1),
  costoUnitario: z.coerce.number().positive("Debe ser mayor a 0"),
  vigenteDesde: z.coerce.date(),
  nota: z.string().optional(),
});

export async function addInsumoCosto(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  const parsed = actualizarCostoSchema.safeParse({
    insumoId: formData.get("insumoId"),
    costoUnitario: formData.get("costoUnitario"),
    vigenteDesde: formData.get("vigenteDesde") || new Date(),
    nota: formData.get("nota") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { insumoId, costoUnitario, vigenteDesde, nota } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.insumoCosto.updateMany({
      where: { insumoId, vigenteHasta: null },
      data: { vigenteHasta: vigenteDesde },
    });

    await tx.insumoCosto.create({
      data: { insumoId, costoUnitario, vigenteDesde, nota },
    });
  });

  revalidatePath("/insumos");
  revalidatePath("/skus");
  return { success: true };
}

const registrarCompraSchema = z.object({
  insumoId: z.string().min(1),
  cantidad: z.coerce.number().positive("Debe ser mayor a 0"),
  fecha: z.coerce.date(),
  costoUnitario: z.coerce.number().positive().optional(),
  nota: z.string().optional(),
});

export async function registrarCompraInsumo(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  const parsed = registrarCompraSchema.safeParse({
    insumoId: formData.get("insumoId"),
    cantidad: formData.get("cantidad"),
    fecha: formData.get("fecha") || new Date(),
    costoUnitario: formData.get("costoUnitario") || undefined,
    nota: formData.get("nota") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { insumoId, cantidad, fecha, costoUnitario, nota } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.movimientoStock.create({
      data: {
        tipoItem: "INSUMO",
        insumoId,
        tipoMovimiento: "COMPRA",
        cantidad,
        costoUnitarioSnapshot: costoUnitario,
        fecha,
        nota,
        createdById: session.user.id,
      },
    });

    await tx.stockActual.update({
      where: { insumoId },
      data: { cantidadActual: { increment: cantidad } },
    });

    if (costoUnitario !== undefined) {
      await tx.insumoCosto.updateMany({
        where: { insumoId, vigenteHasta: null },
        data: { vigenteHasta: fecha },
      });
      await tx.insumoCosto.create({
        data: { insumoId, costoUnitario, vigenteDesde: fecha, nota: nota ?? "Actualizado desde compra" },
      });
    }
  });

  revalidatePath("/insumos");
  revalidatePath("/stock");
  return { success: true };
}

export async function toggleInsumoActivo(insumoId: string, activo: boolean) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  await prisma.insumo.update({ where: { id: insumoId }, data: { activo } });
  revalidatePath("/insumos");
}
