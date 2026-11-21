"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

const schema = z.object({
  ecoRadioKm: z.coerce.number().positive("El radio tiene que ser mayor a 0"),
  ecoPrecioEnvio: z.coerce.number().min(0, "El precio no puede ser negativo"),
  ecoFechaEntrega: z.string().trim().min(1, "Escribí la fecha de entrega").max(100, "La fecha de entrega es demasiado larga"),
});

/** Guarda el radio, el precio del envío a domicilio y la fecha de entrega de la página Desafío Eco YPF. */
export async function guardarEcoYpfConfig(formData: FormData) {
  const session = await getSession();
  if (!session || session.user.role !== "OWNER") throw new Error("No autorizado");

  const parsed = schema.safeParse({
    ecoRadioKm: String(formData.get("ecoRadioKm") ?? "").replace(",", "."),
    ecoPrecioEnvio: String(formData.get("ecoPrecioEnvio") ?? "").replace(",", "."),
    ecoFechaEntrega: formData.get("ecoFechaEntrega") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  await prisma.zonaSurConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...parsed.data },
    update: parsed.data,
  });
  revalidatePath("/ecoypf");
  revalidatePath("/pedidos-ecoypf/config");
  return { success: true };
}
