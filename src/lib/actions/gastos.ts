"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

const crearGastoSchema = z.object({
  categoria: z.enum([
    "COMISION_TIENDANUBE",
    "COMISION_MERCADOPAGO",
    "ENVIO",
    "MARKETING",
    "FIJO",
    "OTRO",
  ]),
  descripcion: z.string().min(1, "Requerido"),
  monto: z.coerce.number().positive("Debe ser mayor a 0"),
  fecha: z.coerce.date(),
  recurrente: z.coerce.boolean().default(false),
});

export async function createGasto(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  const parsed = crearGastoSchema.safeParse({
    categoria: formData.get("categoria"),
    descripcion: formData.get("descripcion"),
    monto: formData.get("monto"),
    fecha: formData.get("fecha") || new Date(),
    recurrente: formData.get("recurrente") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  await prisma.gasto.create({
    data: { ...parsed.data, createdById: session.user.id },
  });

  revalidatePath("/gastos");
  revalidatePath("/resultados");
  revalidatePath("/");
  return { success: true };
}

export async function deleteGasto(gastoId: string) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  await prisma.gasto.delete({ where: { id: gastoId } });
  revalidatePath("/gastos");
  revalidatePath("/resultados");
  revalidatePath("/");
}
