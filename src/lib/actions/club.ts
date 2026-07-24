"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  return session;
}

// ---------- Config (hero + footer) ----------

const configSchema = z.object({
  heroTitulo: z.string().min(1, "Requerido"),
  heroSubtitulo: z.string().optional(),
  heroVideoUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  introTitulo: z.string().min(1, "Requerido"),
  introTexto: z.string().optional(),
  novedadesTexto: z.string().optional(),
  footerTexto: z.string().min(1, "Requerido"),
});

export async function guardarClubConfig(formData: FormData) {
  await requireSession();

  const parsed = configSchema.safeParse({
    heroTitulo: formData.get("heroTitulo"),
    heroSubtitulo: formData.get("heroSubtitulo") ?? "",
    heroVideoUrl: formData.get("heroVideoUrl") ?? "",
    introTitulo: formData.get("introTitulo"),
    introTexto: formData.get("introTexto") ?? "",
    novedadesTexto: formData.get("novedadesTexto") ?? "",
    footerTexto: formData.get("footerTexto"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const data = {
    ...parsed.data,
    heroVideoUrl: parsed.data.heroVideoUrl || null,
  };

  await prisma.clubConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });

  revalidatePath("/club");
  return { success: true };
}

// ---------- Bloques (contenido dinámico) ----------

const bloqueTipos = [
  "TEXTO",
  "VIDEO",
  "DESCUENTO",
  "ENCUESTA",
  "INVITACION",
  "IMAGEN",
] as const;

const bloqueSchema = z.object({
  tipo: z.enum(bloqueTipos),
  titulo: z.string().optional(),
  cuerpo: z.string().optional(),
  codigo: z.string().optional(),
  ctaTexto: z.string().optional(),
  ctaUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  mediaUrl: z.string().url("URL inválida").optional().or(z.literal("")),
});

function parseBloque(formData: FormData) {
  return bloqueSchema.safeParse({
    tipo: formData.get("tipo"),
    titulo: formData.get("titulo") ?? "",
    cuerpo: formData.get("cuerpo") ?? "",
    codigo: formData.get("codigo") ?? "",
    ctaTexto: formData.get("ctaTexto") ?? "",
    ctaUrl: formData.get("ctaUrl") ?? "",
    mediaUrl: formData.get("mediaUrl") ?? "",
  });
}

export async function crearBloque(formData: FormData) {
  await requireSession();

  const parsed = parseBloque(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const ultimo = await prisma.clubBloque.findFirst({ orderBy: { orden: "desc" } });
  const orden = (ultimo?.orden ?? -1) + 1;

  await prisma.clubBloque.create({
    data: {
      tipo: parsed.data.tipo,
      titulo: parsed.data.titulo || null,
      cuerpo: parsed.data.cuerpo || null,
      codigo: parsed.data.codigo || null,
      ctaTexto: parsed.data.ctaTexto || null,
      ctaUrl: parsed.data.ctaUrl || null,
      mediaUrl: parsed.data.mediaUrl || null,
      orden,
    },
  });

  revalidatePath("/club");
  return { success: true };
}

export async function actualizarBloque(id: string, formData: FormData) {
  await requireSession();

  const parsed = parseBloque(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  await prisma.clubBloque.update({
    where: { id },
    data: {
      tipo: parsed.data.tipo,
      titulo: parsed.data.titulo || null,
      cuerpo: parsed.data.cuerpo || null,
      codigo: parsed.data.codigo || null,
      ctaTexto: parsed.data.ctaTexto || null,
      ctaUrl: parsed.data.ctaUrl || null,
      mediaUrl: parsed.data.mediaUrl || null,
    },
  });

  revalidatePath("/club");
  return { success: true };
}

export async function toggleBloqueVisible(id: string, visible: boolean) {
  await requireSession();
  await prisma.clubBloque.update({ where: { id }, data: { visible } });
  revalidatePath("/club");
}

export async function moverBloque(id: string, direccion: "arriba" | "abajo") {
  await requireSession();

  const actual = await prisma.clubBloque.findUnique({ where: { id } });
  if (!actual) return;

  const vecino = await prisma.clubBloque.findFirst({
    where:
      direccion === "arriba"
        ? { orden: { lt: actual.orden } }
        : { orden: { gt: actual.orden } },
    orderBy: { orden: direccion === "arriba" ? "desc" : "asc" },
  });
  if (!vecino) return;

  await prisma.$transaction([
    prisma.clubBloque.update({ where: { id: actual.id }, data: { orden: vecino.orden } }),
    prisma.clubBloque.update({ where: { id: vecino.id }, data: { orden: actual.orden } }),
  ]);

  revalidatePath("/club");
}

export async function eliminarBloque(id: string) {
  await requireSession();
  await prisma.clubBloque.delete({ where: { id } });
  revalidatePath("/club");
}

// ---------- Historial del Ticket ----------

export async function crearHistorialItem(formData: FormData) {
  await requireSession();

  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) return { error: "Escribí un título" };
  const desbloqueado = formData.get("desbloqueado") === "on";

  const ultimo = await prisma.clubHistorialItem.findFirst({ orderBy: { orden: "desc" } });
  const orden = (ultimo?.orden ?? -1) + 1;

  await prisma.clubHistorialItem.create({ data: { titulo, desbloqueado, orden } });
  revalidatePath("/club");
  return { success: true };
}

export async function toggleHistorialItem(id: string, desbloqueado: boolean) {
  await requireSession();
  await prisma.clubHistorialItem.update({ where: { id }, data: { desbloqueado } });
  revalidatePath("/club");
}

export async function eliminarHistorialItem(id: string) {
  await requireSession();
  await prisma.clubHistorialItem.delete({ where: { id } });
  revalidatePath("/club");
}
