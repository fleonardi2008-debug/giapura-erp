"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { ZonaSurEstado, ZonaSurMetodoEntrega, ZonaSurMetodoPago } from "@/generated/prisma/client";

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  return session;
}

// ---------- Config (zona en el mapa, precio, transferencia, puntos) ----------

const configSchema = z.object({
  zonaNombre: z.string().min(1, "Requerido"),
  zonaCentroLat: z.coerce.number(),
  zonaCentroLng: z.coerce.number(),
  zonaRadioKm: z.coerce.number().positive("Tiene que ser mayor a 0"),
  zonaPrecio: z.coerce.number().min(0, "No puede ser negativo"),
  cbuAlias: z.string().optional(),
  titularCuenta: z.string().optional(),
  puntoQuilmesTexto: z.string().optional(),
  puntoBernalTexto: z.string().optional(),
});

export async function guardarZonaSurConfig(formData: FormData) {
  await requireSession();

  const parsed = configSchema.safeParse({
    zonaNombre: formData.get("zonaNombre"),
    zonaCentroLat: formData.get("zonaCentroLat"),
    zonaCentroLng: formData.get("zonaCentroLng"),
    zonaRadioKm: formData.get("zonaRadioKm"),
    zonaPrecio: formData.get("zonaPrecio"),
    cbuAlias: formData.get("cbuAlias") ?? "",
    titularCuenta: formData.get("titularCuenta") ?? "",
    puntoQuilmesTexto: formData.get("puntoQuilmesTexto") ?? "",
    puntoBernalTexto: formData.get("puntoBernalTexto") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  await prisma.zonaSurConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...parsed.data },
    update: parsed.data,
  });

  revalidatePath("/pedidos-zona-sur/config");
  revalidatePath("/zona-sur");
  return { success: true };
}

// ---------- Pedidos ----------

export async function actualizarEstadoZonaSurPedido(pedidoId: string, estado: ZonaSurEstado) {
  await requireSession();

  await prisma.zonaSurPedido.update({
    where: { id: pedidoId },
    data: { estado },
  });

  revalidatePath("/pedidos-zona-sur");
  return { success: true };
}

// ---------- Pedido publico (sin login, lo llama el formulario del cliente) ----------

const itemSchema = z.object({
  skuId: z.string().min(1),
  cantidad: z.coerce.number().int().positive(),
});

const pedidoPublicoSchema = z.object({
  clienteNombre: z.string().min(1, "Falta el nombre"),
  clienteEmail: z.string().email("El mail no parece válido"),
  clienteTelefono: z.string().min(6, "Falta el teléfono"),
  metodoEntrega: z.nativeEnum(ZonaSurMetodoEntrega),
  direccion: z.string().optional(),
  metodoPago: z.nativeEnum(ZonaSurMetodoPago),
  items: z.string().transform((v, ctx) => {
    try {
      const parsed = JSON.parse(v);
      return z.array(itemSchema).min(1, "Elegí al menos un producto").parse(parsed);
    } catch {
      ctx.addIssue({ code: "custom", message: "Pedido inválido" });
      return z.NEVER;
    }
  }),
});

export async function crearZonaSurPedido(formData: FormData) {
  const parsed = pedidoPublicoSchema.safeParse({
    clienteNombre: formData.get("clienteNombre"),
    clienteEmail: formData.get("clienteEmail"),
    clienteTelefono: formData.get("clienteTelefono"),
    metodoEntrega: formData.get("metodoEntrega"),
    direccion: formData.get("direccion") ?? "",
    metodoPago: formData.get("metodoPago"),
    items: formData.get("items"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  if (data.metodoEntrega === "ENVIO_ZONA" && !data.direccion?.trim()) {
    return { error: "Falta la dirección de envío" };
  }

  const comprobante = formData.get("comprobante");
  if (data.metodoPago === "TRANSFERENCIA" && !(comprobante instanceof File && comprobante.size > 0)) {
    return { error: "Falta subir el comprobante de la transferencia" };
  }

  const config = await prisma.zonaSurConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });

  // El punto de encuentro elegido tiene que existir todavia (no vacio) y se
  // congela el texto tal cual esta hoy, por si Fran lo cambia despues.
  let puntoElegido: string | null = null;
  if (data.metodoEntrega === "PUNTO_QUILMES") {
    if (!config.puntoQuilmesTexto?.trim()) return { error: "Por ahora no hay un punto de encuentro en Quilmes. Probá con envío o con Bernal." };
    puntoElegido = config.puntoQuilmesTexto;
  } else if (data.metodoEntrega === "PUNTO_BERNAL") {
    if (!config.puntoBernalTexto?.trim()) return { error: "Por ahora no hay un punto de encuentro en Bernal. Probá con envío o con Quilmes." };
    puntoElegido = config.puntoBernalTexto;
  }

  // El precio de cada producto se busca en el servidor (nunca se confia en lo
  // que mande el navegador), para que no se pueda pedir con precio distinto.
  const skus = await prisma.sku.findMany({
    where: { id: { in: data.items.map((i) => i.skuId) }, activo: true },
  });
  const itemsParaCrear = data.items.map((item) => {
    const sku = skus.find((s) => s.id === item.skuId);
    if (!sku || !sku.precioVenta) throw new Error("Uno de los productos elegidos ya no está disponible");
    const precioUnitario = Number(sku.precioVenta);
    return {
      skuId: sku.id,
      nombre: sku.nombre,
      cantidad: item.cantidad,
      precioUnitario,
      subtotal: precioUnitario * item.cantidad,
    };
  });

  let total = itemsParaCrear.reduce((acc, i) => acc + i.subtotal, 0);
  if (data.metodoEntrega === "ENVIO_ZONA") total += Number(config.zonaPrecio);

  let comprobanteUrl: string | null = null;
  if (comprobante instanceof File && comprobante.size > 0) {
    const subido = await put(`zona-sur/comprobantes/${Date.now()}-${comprobante.name}`, comprobante, {
      access: "public",
      addRandomSuffix: true,
    });
    comprobanteUrl = subido.url;
  }

  await prisma.zonaSurPedido.create({
    data: {
      clienteNombre: data.clienteNombre,
      clienteEmail: data.clienteEmail,
      clienteTelefono: data.clienteTelefono,
      metodoEntrega: data.metodoEntrega,
      direccion: data.metodoEntrega === "ENVIO_ZONA" ? data.direccion : null,
      puntoElegido,
      metodoPago: data.metodoPago,
      comprobanteUrl,
      total,
      items: { create: itemsParaCrear },
    },
  });

  revalidatePath("/pedidos-zona-sur");
  return { success: true };
}
