"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOwnerSession } from "@/lib/session";
import { Prisma } from "@/generated/prisma/client";

function revalidarMiZona() {
  revalidatePath("/mi-zona");
  revalidatePath("/reposicion");
  revalidatePath("/stock");
  revalidatePath("/");
}

const transferirSchema = z.object({
  skuId: z.string().min(1, "Elegí un producto"),
  cantidad: z.coerce.number().int().positive("Debe ser mayor a 0"),
  nota: z.string().trim().optional(),
});

/**
 * Mueve frascos/packs del stock de fábrica hacia "mi zona" (lo que el dueño se lleva
 * para vender aparte). Solo el dueño lo hace: es su decisión de a dónde va el producto.
 */
export async function transferirAMiZona(formData: FormData) {
  const session = await requireOwnerSession();
  if (!session) return { error: "No autorizado" };

  const parsed = transferirSchema.safeParse({
    skuId: formData.get("skuId"),
    cantidad: formData.get("cantidad"),
    nota: formData.get("nota") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { skuId, cantidad, nota } = parsed.data;

  const sku = await prisma.sku.findUnique({ where: { id: skuId }, include: { stockActual: true } });
  if (!sku) return { error: "El producto no existe" };
  if (sku.nivel !== "FRASCO" && sku.nivel !== "PACK") {
    return { error: "Solo se transfieren frascos o packs." };
  }

  const disponible = sku.stockActual?.cantidadActual ?? new Prisma.Decimal(0);
  if (disponible.lessThan(cantidad)) {
    return {
      error: `No hay suficiente stock en fábrica: disponés ${disponible.toString()}, querés llevarte ${cantidad}.`,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.movimientoStock.create({
      data: {
        tipoItem: "PRODUCTO_TERMINADO",
        skuId,
        tipoMovimiento: "TRANSFERENCIA_ZONA",
        cantidad: new Prisma.Decimal(cantidad).negated(),
        nota: nota ?? "Transferido a mi zona",
        createdById: session.user.id,
      },
    });

    await tx.stockActual.update({
      where: { skuId },
      data: { cantidadActual: { decrement: cantidad } },
    });

    await tx.stockZona.upsert({
      where: { skuId },
      create: { skuId, cantidadActual: cantidad },
      update: { cantidadActual: { increment: cantidad } },
    });
  });

  revalidarMiZona();
  return { success: true };
}

const ajustarZonaSchema = z.object({
  skuId: z.string().min(1),
  cantidadObjetivo: z.coerce.number().int().min(0),
  nota: z.string().trim().optional(),
});

/**
 * Corrige el stock de "mi zona" a un número real (venta local, rotura, conteo).
 * No toca el stock de fábrica: son universos separados.
 */
export async function ajustarStockZona(formData: FormData) {
  const session = await requireOwnerSession();
  if (!session) return { error: "No autorizado" };

  const parsed = ajustarZonaSchema.safeParse({
    skuId: formData.get("skuId"),
    cantidadObjetivo: formData.get("cantidadObjetivo"),
    nota: formData.get("nota") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { skuId, cantidadObjetivo } = parsed.data;

  await prisma.stockZona.upsert({
    where: { skuId },
    create: { skuId, cantidadActual: cantidadObjetivo },
    update: { cantidadActual: cantidadObjetivo },
  });

  revalidarMiZona();
  return { success: true };
}
