"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireOwnerSession } from "@/lib/session";

const crearUsuarioSchema = z.object({
  email: z.string().email("Email inválido"),
  nombre: z.string().min(1, "Requerido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  role: z.enum(["OWNER", "OPERADOR"]).default("OPERADOR"),
});

export async function createUsuario(formData: FormData) {
  const session = await requireOwnerSession();
  if (!session) return { error: "No autorizado" };

  const parsed = crearUsuarioSchema.safeParse({
    email: formData.get("email"),
    nombre: formData.get("nombre"),
    password: formData.get("password"),
    role: formData.get("role") || "OPERADOR",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { nombre, password, role } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) return { error: "Ya existe un usuario con ese email" };

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, nombre, passwordHash, role, activo: true },
  });

  revalidatePath("/usuarios");
  return { success: true };
}

export async function toggleUsuarioActivo(userId: string, activo: boolean) {
  const session = await requireOwnerSession();
  if (!session) return { error: "No autorizado" };

  if (session.user.id === userId && !activo) {
    return { error: "No podés desactivar tu propia cuenta" };
  }

  await prisma.user.update({ where: { id: userId }, data: { activo } });
  revalidatePath("/usuarios");
  return { success: true };
}
