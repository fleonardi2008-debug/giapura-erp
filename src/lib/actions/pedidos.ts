"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { Prisma } from "@/generated/prisma/client";

const itemSchema = z.object({
  skuId: z.string().min(1),
  cantidad: z.coerce.number().positive(),
  precioUnitario: z.coerce.number().positive(),
});

const crearPedidoSchema = z.object({
  numeroPedido: z.string().min(1, "Requerido"),
  fecha: z.coerce.date(),
  clienteNombre: z.string().optional(),
  estadoPago: z.enum(["PENDIENTE", "PAGADO", "PARCIAL", "REEMBOLSADO"]),
});

export async function createPedidoManual(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  const parsedPedido = crearPedidoSchema.safeParse({
    numeroPedido: formData.get("numeroPedido"),
    fecha: formData.get("fecha") || new Date(),
    clienteNombre: formData.get("clienteNombre") || undefined,
    estadoPago: formData.get("estadoPago") || "PAGADO",
  });

  if (!parsedPedido.success) {
    return { error: parsedPedido.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const skuIds = formData.getAll("skuId") as string[];
  const cantidades = formData.getAll("cantidad") as string[];
  const precios = formData.getAll("precioUnitario") as string[];

  const items = skuIds
    .map((skuId, i) => ({ skuId, cantidad: cantidades[i], precioUnitario: precios[i] }))
    .filter((item) => item.skuId && item.cantidad && item.precioUnitario)
    .map((item) => itemSchema.parse(item));

  if (items.length === 0) {
    return { error: "Agregá al menos un producto al pedido." };
  }

  const { numeroPedido, fecha, clienteNombre, estadoPago } = parsedPedido.data;

  try {
    await prisma.$transaction(async (tx) => {
      const total = items.reduce(
        (sum, item) => sum + item.cantidad * item.precioUnitario,
        0
      );

      const pedido = await tx.pedido.create({
        data: {
          numeroPedido,
          fecha,
          clienteNombre,
          estadoPedido: "CERRADO",
          estadoPago,
          subtotal: total,
          total,
          sincronizadoEn: new Date(),
        },
      });

      for (const item of items) {
        await tx.pedidoItem.create({
          data: {
            pedidoId: pedido.id,
            skuId: item.skuId,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            subtotal: item.cantidad * item.precioUnitario,
          },
        });

        const stockActual = await tx.stockActual.findUnique({ where: { skuId: item.skuId } });
        const costoSnapshot = stockActual?.costoPromedioPonderado ?? new Prisma.Decimal(0);

        await tx.movimientoStock.create({
          data: {
            tipoItem: "PRODUCTO_TERMINADO",
            skuId: item.skuId,
            tipoMovimiento: "VENTA",
            cantidad: new Prisma.Decimal(item.cantidad).negated(),
            costoUnitarioSnapshot: costoSnapshot,
            pedidoId: pedido.id,
            fecha,
            createdById: session.user.id,
          },
        });

        await tx.stockActual.update({
          where: { skuId: item.skuId },
          data: { cantidadActual: { decrement: item.cantidad } },
        });
      }
    });
  } catch {
    return { error: "Ya existe un pedido con ese número." };
  }

  revalidatePath("/pedidos");
  revalidatePath("/stock");
  revalidatePath("/resultados");
  revalidatePath("/");
  return { success: true };
}

export async function deletePedido(pedidoId: string) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: { items: true },
  });
  if (!pedido) return;

  await prisma.$transaction(async (tx) => {
    for (const item of pedido.items) {
      if (!item.skuId) continue;
      await tx.stockActual.update({
        where: { skuId: item.skuId },
        data: { cantidadActual: { increment: item.cantidad } },
      });
    }
    await tx.movimientoStock.deleteMany({ where: { pedidoId } });
    await tx.pedidoItem.deleteMany({ where: { pedidoId } });
    await tx.pedido.delete({ where: { id: pedidoId } });
  });

  revalidatePath("/pedidos");
  revalidatePath("/stock");
  revalidatePath("/resultados");
  revalidatePath("/");
}
