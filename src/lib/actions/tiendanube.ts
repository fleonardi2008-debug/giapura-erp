"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAuthorizeUrl } from "@/lib/tiendanube/client";
import { sincronizarProductos as sincronizarProductosLib, reenviarStock as reenviarStockLib } from "@/lib/tiendanube/sync";

export async function getUrlConexion() {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  const state = randomBytes(16).toString("hex");
  return getAuthorizeUrl(state);
}

export async function sincronizarProductos() {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  try {
    const resultado = await sincronizarProductosLib();
    revalidatePath("/integraciones");
    revalidatePath("/skus");
    return { success: true, ...resultado };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error sincronizando productos" };
  }
}

export async function reenviarStockAhora() {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  try {
    const cantidad = await reenviarStockLib();
    revalidatePath("/integraciones");
    return { success: true, cantidad };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error reenviando stock" };
  }
}

export async function desconectarTiendaNube() {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  await prisma.tiendaNubeConexion.updateMany({ where: { activo: true }, data: { activo: false } });
  revalidatePath("/integraciones");
}
