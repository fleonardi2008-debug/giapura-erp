"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { Prisma } from "@/generated/prisma/client";
import { reenviarStock } from "@/lib/tiendanube/sync";

const ajusteSchema = z.object({
  skuId: z.string().min(1),
  cantidadObjetivo: z.coerce.number().min(0),
  nota: z.string().optional(),
});

/**
 * Fija el stock de un producto terminado a una cantidad objetivo (conteo real de
 * inventario o carga inicial). Registra un movimiento de AJUSTE por la diferencia y
 * reenvía el nuevo stock a Tienda Nube si el producto está mapeado.
 */
export async function ajustarStockProducto(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  const parsed = ajusteSchema.safeParse({
    skuId: formData.get("skuId"),
    cantidadObjetivo: formData.get("cantidadObjetivo"),
    nota: formData.get("nota") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { skuId, cantidadObjetivo, nota } = parsed.data;

  const sku = await prisma.sku.findUnique({
    where: { id: skuId },
    include: { stockActual: true },
  });
  if (!sku) return { error: "Producto no encontrado" };

  const actual = sku.stockActual?.cantidadActual ?? new Prisma.Decimal(0);
  const objetivo = new Prisma.Decimal(cantidadObjetivo);
  const delta = objetivo.minus(actual);

  await prisma.$transaction(async (tx) => {
    await tx.movimientoStock.create({
      data: {
        tipoItem: "PRODUCTO_TERMINADO",
        skuId,
        tipoMovimiento: "AJUSTE",
        cantidad: delta,
        nota: nota ?? "Ajuste manual de inventario",
        createdById: session.user.id,
      },
    });

    await tx.stockActual.update({
      where: { skuId },
      data: { cantidadActual: objetivo },
    });
  });

  // Si está conectada la tienda y el producto está mapeado, mantener TN en sync.
  if (sku.tiendaNubeVariantId) {
    try {
      await reenviarStock([skuId]);
    } catch {
      // No es fatal si falla el push (por ejemplo si no hay conexión activa).
    }
  }

  revalidatePath("/stock");
  revalidatePath("/");
  return { success: true };
}
