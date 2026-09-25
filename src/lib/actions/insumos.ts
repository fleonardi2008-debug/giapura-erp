"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOwnerSession } from "@/lib/session";
import { Prisma } from "@/generated/prisma/client";

const crearInsumoSchema = z.object({
  nombre: z.string().min(1, "Requerido"),
  tipo: z.enum(["INGREDIENTE", "PACKAGING", "OTRO"]),
  unidadMedida: z.string().min(1, "Requerido"),
  stockMinimo: z.coerce.number().min(0).default(0),
  costoInicial: z.coerce.number().min(0).optional(),
});

export async function createInsumo(formData: FormData) {
  const session = await requireOwnerSession();
  if (!session) return { error: "No autorizado" };

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
  const session = await requireOwnerSession();
  if (!session) return { error: "No autorizado" };

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

export async function toggleInsumoActivo(insumoId: string, activo: boolean) {
  const session = await requireOwnerSession();
  if (!session) return { error: "No autorizado" };

  await prisma.insumo.update({ where: { id: insumoId }, data: { activo } });
  revalidatePath("/insumos");
  return { success: true };
}

const editarInsumoSchema = z.object({
  insumoId: z.string().min(1),
  nombre: z.string().min(1, "Requerido"),
  tipo: z.enum(["INGREDIENTE", "PACKAGING", "OTRO"]),
  unidadMedida: z.string().min(1, "Requerido"),
  stockMinimo: z.coerce.number().min(0).default(0),
});

/** Edita los datos básicos de un insumo (no toca costo ni stock). */
export async function editarInsumo(formData: FormData) {
  const session = await requireOwnerSession();
  if (!session) return { error: "No autorizado" };

  const parsed = editarInsumoSchema.safeParse({
    insumoId: formData.get("insumoId"),
    nombre: formData.get("nombre"),
    tipo: formData.get("tipo"),
    unidadMedida: formData.get("unidadMedida"),
    stockMinimo: formData.get("stockMinimo") || 0,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { insumoId, ...data } = parsed.data;
  await prisma.insumo.update({ where: { id: insumoId }, data });

  revalidatePath("/insumos");
  revalidatePath("/skus");
  return { success: true };
}

const ajusteInsumoSchema = z.object({
  insumoId: z.string().min(1),
  cantidadObjetivo: z.coerce.number().min(0),
  nota: z.string().optional(),
});

/**
 * Fija el stock de un insumo a una cantidad objetivo (conteo real, o corregir un
 * número que no cierra). Registra un movimiento de AJUSTE por la diferencia, igual
 * que ya existe para el stock de productos terminados.
 */
export async function ajustarStockInsumo(formData: FormData) {
  const session = await requireOwnerSession();
  if (!session) return { error: "No autorizado" };

  const parsed = ajusteInsumoSchema.safeParse({
    insumoId: formData.get("insumoId"),
    cantidadObjetivo: formData.get("cantidadObjetivo"),
    nota: formData.get("nota") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { insumoId, cantidadObjetivo, nota } = parsed.data;

  const insumo = await prisma.insumo.findUnique({
    where: { id: insumoId },
    include: { stockActual: true },
  });
  if (!insumo) return { error: "Insumo no encontrado" };

  const actual = insumo.stockActual?.cantidadActual ?? new Prisma.Decimal(0);
  const objetivo = new Prisma.Decimal(cantidadObjetivo);
  const delta = objetivo.minus(actual);

  await prisma.$transaction(async (tx) => {
    await tx.movimientoStock.create({
      data: {
        tipoItem: "INSUMO",
        insumoId,
        tipoMovimiento: "AJUSTE",
        cantidad: delta,
        nota: nota ?? "Ajuste manual de inventario",
        createdById: session.user.id,
      },
    });

    await tx.stockActual.update({
      where: { insumoId },
      data: { cantidadActual: objetivo },
    });
  });

  revalidatePath("/insumos");
  revalidatePath("/stock");
  revalidatePath("/reposicion");
  revalidatePath("/");
  return { success: true };
}
