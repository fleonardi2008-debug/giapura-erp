"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

const crearSkuSchema = z.object({
  codigo: z.string().min(1, "Requerido"),
  nombre: z.string().min(1, "Requerido"),
  unidadMedida: z.string().min(1).default("unidad"),
});

export async function createSku(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  const parsed = crearSkuSchema.safeParse({
    codigo: formData.get("codigo"),
    nombre: formData.get("nombre"),
    unidadMedida: formData.get("unidadMedida") || "unidad",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  await prisma.$transaction(async (tx) => {
    const sku = await tx.sku.create({ data: parsed.data });
    await tx.stockActual.create({
      data: { itemTipo: "PRODUCTO_TERMINADO", skuId: sku.id, cantidadActual: 0 },
    });
  });

  revalidatePath("/skus");
  return { success: true };
}

const recetaItemSchema = z.object({
  insumoId: z.string().min(1),
  cantidadPorUnidad: z.coerce.number().positive(),
});

export async function createReceta(skuId: string, formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  const insumoIds = formData.getAll("insumoId") as string[];
  const cantidades = formData.getAll("cantidadPorUnidad") as string[];

  const items = insumoIds
    .map((insumoId, i) => ({ insumoId, cantidadPorUnidad: cantidades[i] }))
    .filter((item) => item.insumoId && item.cantidadPorUnidad)
    .map((item) => recetaItemSchema.parse(item));

  if (items.length === 0) {
    return { error: "Agregá al menos un insumo a la receta." };
  }

  const vigenteDesde = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.receta.updateMany({
      where: { skuId, vigenteHasta: null },
      data: { vigenteHasta: vigenteDesde },
    });

    const ultima = await tx.receta.findFirst({
      where: { skuId },
      orderBy: { version: "desc" },
    });

    const receta = await tx.receta.create({
      data: {
        skuId,
        version: (ultima?.version ?? 0) + 1,
        vigenteDesde,
      },
    });

    await tx.recetaItem.createMany({
      data: items.map((item) => {
        return {
          recetaId: receta.id,
          insumoId: item.insumoId,
          cantidadPorUnidad: item.cantidadPorUnidad,
          unidadMedida: "",
        };
      }),
    });

    // completar unidadMedida desde el insumo
    const insumos = await tx.insumo.findMany({
      where: { id: { in: items.map((i) => i.insumoId) } },
    });
    for (const insumo of insumos) {
      await tx.recetaItem.updateMany({
        where: { recetaId: receta.id, insumoId: insumo.id },
        data: { unidadMedida: insumo.unidadMedida },
      });
    }
  });

  revalidatePath(`/skus/${skuId}`);
  revalidatePath("/skus");
  return { success: true };
}

const costoFabricaSchema = z.object({
  skuId: z.string().min(1),
  costoPorUnidad: z.coerce.number().positive("Debe ser mayor a 0"),
  vigenteDesde: z.coerce.date(),
  nota: z.string().optional(),
});

export async function addCostoFabrica(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  const parsed = costoFabricaSchema.safeParse({
    skuId: formData.get("skuId"),
    costoPorUnidad: formData.get("costoPorUnidad"),
    vigenteDesde: formData.get("vigenteDesde") || new Date(),
    nota: formData.get("nota") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { skuId, costoPorUnidad, vigenteDesde, nota } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.costoFabricaHistorico.updateMany({
      where: { skuId, vigenteHasta: null },
      data: { vigenteHasta: vigenteDesde },
    });

    await tx.costoFabricaHistorico.create({
      data: { skuId, costoPorUnidad, vigenteDesde, nota },
    });
  });

  revalidatePath(`/skus/${skuId}`);
  revalidatePath("/skus");
  return { success: true };
}
