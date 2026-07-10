"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { PLAN_FASE_NUMS, PLAN_TAREA_IDS_BASE } from "@/lib/plan";

async function existeTarea(tareaId: string) {
  if (PLAN_TAREA_IDS_BASE.has(tareaId)) return true;
  const custom = await prisma.planTareaCustom.findUnique({ where: { id: tareaId } });
  return custom !== null;
}

export async function togglePlanTarea(tareaId: string, hecho: boolean) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  if (!(await existeTarea(tareaId))) {
    return { error: "Tarea desconocida" };
  }

  await prisma.planTareaProgreso.upsert({
    where: { id: tareaId },
    create: { id: tareaId, hecho },
    update: { hecho },
  });

  revalidatePath("/plan");
  return { success: true };
}

const crearTareaSchema = z.object({
  faseNum: z.enum(PLAN_FASE_NUMS as [string, ...string[]]),
  texto: z.string().trim().min(3, "Escribí la tarea"),
  puntos: z.coerce.number().int().min(1, "Mínimo 1 punto").max(50, "Máximo 50 puntos"),
});

export async function crearPlanTarea(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  const parsed = crearTareaSchema.safeParse({
    faseNum: formData.get("faseNum"),
    texto: formData.get("texto"),
    puntos: formData.get("puntos"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  await prisma.planTareaCustom.create({ data: parsed.data });

  revalidatePath("/plan");
  return { success: true };
}

export async function eliminarPlanTarea(tareaId: string) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  // Solo las tareas agregadas por el usuario se pueden borrar; las fijas viven en el código.
  await prisma.planTareaCustom.delete({ where: { id: tareaId } });
  await prisma.planTareaProgreso.deleteMany({ where: { id: tareaId } });

  revalidatePath("/plan");
}

export async function resetPlan() {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  await prisma.planTareaProgreso.deleteMany();
  revalidatePath("/plan");
}
