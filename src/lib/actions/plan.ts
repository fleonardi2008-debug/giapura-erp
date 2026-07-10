"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { PLAN_TAREA_IDS } from "@/lib/plan";

export async function togglePlanTarea(tareaId: string, hecho: boolean) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  if (!PLAN_TAREA_IDS.has(tareaId)) {
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

export async function resetPlan() {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  await prisma.planTareaProgreso.deleteMany();
  revalidatePath("/plan");
}
