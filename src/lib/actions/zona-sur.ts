"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { ZonaSurEstado, ZonaSurMetodoEntrega, ZonaSurMetodoPago } from "@/generated/prisma/client";
import { parsearDiasColegio } from "@/lib/zona-sur-colegio";

async function requireOwner() {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  if (session.user.role !== "OWNER") throw new Error("No autorizado");
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
  colegioNombre: z.string().optional(),
  colegioDias: z.string().optional(),
});

export async function guardarZonaSurConfig(formData: FormData) {
  await requireOwner();

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
    colegioNombre: formData.get("colegioNombre") ?? "",
    colegioDias: formData.get("colegioDias") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const data = {
    ...parsed.data,
    colegioDias: parsearDiasColegio(parsed.data.colegioDias).join("\n"),
  };

  await prisma.zonaSurConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });

  revalidatePath("/pedidos-zona-sur/config");
  revalidatePath("/pedidos-zona-sur/colegio");
  revalidatePath("/zona-sur");
  return { success: true };
}

// ---------- Pedidos ----------

export async function actualizarEstadoZonaSurPedido(pedidoId: string, estado: ZonaSurEstado) {
  await requireOwner();

  await prisma.zonaSurPedido.update({
    where: { id: pedidoId },
    data: { estado },
  });

  revalidatePath("/pedidos-zona-sur");
  return { success: true };
}

const estadosMasivosSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "No hay pedidos seleccionados").max(500),
  estado: z.nativeEnum(ZonaSurEstado),
});

/** Cambia el estado de varios pedidos de una vez (casillas de la lista de Pedidos Zona Sur). */
export async function actualizarEstadoZonaSurPedidos(ids: string[], estado: ZonaSurEstado) {
  await requireOwner();

  const parsed = estadosMasivosSchema.safeParse({ ids, estado });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const resultado = await prisma.zonaSurPedido.updateMany({
    where: { id: { in: parsed.data.ids } },
    data: { estado: parsed.data.estado },
  });

  revalidatePath("/pedidos-zona-sur");
  revalidatePath("/etiquetas");
  return { success: true, cantidad: resultado.count };
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
  colegioDia: z.string().optional(),
  metodoPago: z.nativeEnum(ZonaSurMetodoPago),
  pagaCon: z.coerce.number().optional(),
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
    colegioDia: formData.get("colegioDia") ?? "",
    metodoPago: formData.get("metodoPago"),
    pagaCon: formData.get("pagaCon") || undefined,
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

  // Colegio: el día tiene que ser uno de los que están ofrecidos hoy. Se guarda el día
  // tal cual figuraba y, en puntoElegido, el lugar + el día (así lo muestran etiquetas y lista).
  let colegioDia: string | null = null;
  if (data.metodoEntrega === "COLEGIO") {
    const dias = parsearDiasColegio(config.colegioDias);
    if (!config.colegioNombre?.trim() || dias.length === 0) {
      return { error: "Por ahora no hay entregas en el colegio. Probá con envío o con un punto de encuentro." };
    }
    const elegido = data.colegioDia?.trim();
    if (!elegido) return { error: "Elegí el día en que te lo llevamos al colegio" };
    if (!dias.includes(elegido)) return { error: "Ese día ya no está disponible. Elegí otro de la lista." };
    colegioDia = elegido;
    puntoElegido = `${config.colegioNombre.trim()} — ${elegido}`;
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

  if (data.metodoPago === "EFECTIVO" && (!data.pagaCon || data.pagaCon < total)) {
    return { error: "Falta indicar con cuánto pagás (tiene que ser al menos el total)" };
  }

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
      colegioDia,
      metodoPago: data.metodoPago,
      comprobanteUrl,
      pagaCon: data.metodoPago === "EFECTIVO" ? data.pagaCon : null,
      total,
      items: { create: itemsParaCrear },
    },
  });

  revalidatePath("/pedidos-zona-sur");
  revalidatePath("/pedidos-zona-sur/colegio");
  return { success: true };
}
