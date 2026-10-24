"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { ZonaSurEstado, ZonaSurMetodoEntrega, ZonaSurMetodoPago } from "@/generated/prisma/client";
import { parsearDiasColegio } from "@/lib/zona-sur-colegio";
import { parsearTarifasAndreani } from "@/lib/zona-sur-andreani";
import { descuentoEfectivo } from "@/lib/zona-sur-precios";
import { leerStockZonaSur } from "@/lib/zona-sur-stock";

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
  andreaniTexto: z.string().optional(),
  andreaniTarifas: z.string().optional(),
  descuentoEfectivo: z.coerce.number().int("Tiene que ser un número entero").min(0, "No puede ser negativo").max(50, "El descuento en efectivo no puede pasar del 50%"),
});

export async function guardarZonaSurConfig(formData: FormData) {
  // (los interruptores sin tildar no viajan en el formulario: ausente = apagado)
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
    andreaniTexto: formData.get("andreaniTexto") ?? "",
    andreaniTarifas: formData.get("andreaniTarifas") ?? "",
    descuentoEfectivo: formData.get("descuentoEfectivo") || 0,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  // Precios de Zona Sur por producto: campos "precio_<id del producto>". Vacío = usar el precio online.
  const preciosZonaSur: { id: string; precio: number | null }[] = [];
  for (const [clave, valor] of formData.entries()) {
    if (!clave.startsWith("precio_") || typeof valor !== "string") continue;
    const id = clave.slice("precio_".length);
    const texto = valor.trim();
    if (!texto) {
      preciosZonaSur.push({ id, precio: null });
      continue;
    }
    const numero = Number(texto.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(numero) || numero <= 0) {
      return { error: `El precio "${texto}" no es válido. Escribí solo el número (ej: 6670).` };
    }
    preciosZonaSur.push({ id, precio: numero });
  }

  // Stock de cada frasco para entrega propia: campos "stock_<id>". Vacío = sin límite (sin barra).
  const stocksZonaSur: { id: string; stock: number | null }[] = [];
  for (const [clave, valor] of formData.entries()) {
    if (!clave.startsWith("stock_") || typeof valor !== "string") continue;
    const id = clave.slice("stock_".length);
    const texto = valor.trim();
    if (!texto) {
      stocksZonaSur.push({ id, stock: null });
      continue;
    }
    const numero = Number(texto);
    if (!Number.isInteger(numero) || numero < 0) {
      return { error: `El stock "${texto}" no es válido. Escribí un número entero (ej: 236).` };
    }
    stocksZonaSur.push({ id, stock: numero });
  }

  // Si una línea de la tabla de precios está mal escrita, se avisa cuál en vez de guardarla rota.
  const { errores } = parsearTarifasAndreani(parsed.data.andreaniTarifas);
  if (errores.length > 0) {
    const e = errores[0];
    return {
      error: `La línea ${e.linea} de la tabla de Andreani no se entiende: "${e.texto}". Formato: 1878 = 6500 o 1800-1999 = 6500`,
    };
  }

  const data = {
    ...parsed.data,
    colegioDias: parsearDiasColegio(parsed.data.colegioDias).join("\n"),
    andreaniActivo: formData.get("andreaniActivo") === "on",
    frascosSueltos: formData.get("frascosSueltos") === "on",
  };

  // Config y precios se guardan juntos: o entra todo o no entra nada.
  await prisma.$transaction([
    prisma.zonaSurConfig.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...data },
      update: data,
    }),
    ...preciosZonaSur.map(({ id, precio }) =>
      prisma.sku.updateMany({ where: { id }, data: { precioZonaSur: precio } })
    ),
    ...stocksZonaSur.map(({ id, stock }) =>
      prisma.sku.updateMany({ where: { id }, data: { stockZonaSur: stock } })
    ),
  ]);

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

/**
 * Guarda el link de Andreani de un pedido. Cada link es de un solo uso (después aparece como
 * "no disponible"), así que se genera uno por pedido. Vacío = quitar el link.
 */
export async function guardarAndreaniLink(pedidoId: string, link: string) {
  await requireOwner();

  const limpio = link.trim();
  if (limpio && !(/^https?:\/\//i.test(limpio) && z.string().url().safeParse(limpio).success)) {
    return { error: "Eso no parece un link. Pegá el link completo que te dio Andreani." };
  }

  const pedido = await prisma.zonaSurPedido.findUnique({ where: { id: pedidoId }, select: { metodoEntrega: true } });
  if (!pedido) return { error: "No encontré el pedido" };
  if (pedido.metodoEntrega !== "ANDREANI") return { error: "Este pedido no es de Andreani" };

  await prisma.zonaSurPedido.update({
    where: { id: pedidoId },
    data: { andreaniLink: limpio || null },
  });

  revalidatePath("/pedidos-zona-sur/andreani");
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

  // El efectivo no se puede cobrar a distancia: con Andreani solo se paga por transferencia.
  // (La dirección y el pago del envío los completa el cliente en el link de Andreani.)
  if (data.metodoEntrega === "ANDREANI" && data.metodoPago === "EFECTIVO") {
    return { error: "Con envío por Andreani solo se puede pagar por transferencia" };
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

  if (data.metodoEntrega === "ANDREANI" && !config.andreaniActivo) {
    return { error: "Por ahora no hacemos envíos por Andreani. Probá con otra forma de entrega." };
  }

  // Los retiros en puntos de encuentro (Quilmes y Bernal) ya no se ofrecen.
  if (data.metodoEntrega === "PUNTO_QUILMES" || data.metodoEntrega === "PUNTO_BERNAL") {
    return { error: "Ya no hacemos retiros en puntos de encuentro. Elegí otra forma de entrega." };
  }
  let puntoElegido: string | null = null;

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
    // Precio de Zona Sur si está cargado; si no, el precio online de siempre.
    const precioBase = sku?.precioZonaSur ?? sku?.precioVenta;
    if (!sku || !precioBase) throw new Error("Uno de los productos elegidos ya no está disponible");
    // Los frascos sueltos solo se pueden pedir si están habilitados en la configuración.
    if (sku.nivel !== "PACK" && !config.frascosSueltos) {
      throw new Error("Uno de los productos elegidos ya no está disponible");
    }
    const precioUnitario = Number(precioBase);
    return {
      skuId: sku.id,
      nombre: sku.nombre,
      cantidad: item.cantidad,
      precioUnitario,
      subtotal: precioUnitario * item.cantidad,
    };
  });

  // Las cajas de Andreani son de a dos: por ese medio solo se piden packs.
  if (data.metodoEntrega === "ANDREANI" && skus.some((s) => s.nivel !== "PACK")) {
    return { error: "Para envíos por Andreani solo se pueden pedir packs (las cajas son de a dos)" };
  }

  // Stock de lo que reparte Fran: todo menos Andreani (sale de fábrica, sin límite).
  if (data.metodoEntrega !== "ANDREANI") {
    const { stock, consumo } = await leerStockZonaSur();
    const necesario: Record<string, number> = {};
    for (const item of data.items) {
      for (const [frascoId, n] of Object.entries(consumo[item.skuId] ?? {})) {
        necesario[frascoId] = (necesario[frascoId] ?? 0) + n * item.cantidad;
      }
    }
    for (const f of stock) {
      const quedan = Math.max(0, f.total - f.usado);
      if ((necesario[f.id] ?? 0) > quedan) {
        return {
          error: `No nos queda stock de ${f.nombre} para entregar en la zona (quedan ${quedan}).${config.andreaniActivo ? " Por Andreani sí podés pedirlo." : ""}`,
        };
      }
    }
  }

  const totalProductos = itemsParaCrear.reduce((acc, i) => acc + i.subtotal, 0);
  // El descuento por pagar en efectivo es sobre los productos (no sobre el envío).
  const descuento = data.metodoPago === "EFECTIVO" ? descuentoEfectivo(totalProductos, config.descuentoEfectivo) : 0;
  let total = totalProductos - descuento;
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
      descuento,
      total,
      items: { create: itemsParaCrear },
    },
  });

  revalidatePath("/pedidos-zona-sur");
  revalidatePath("/pedidos-zona-sur/colegio");
  return { success: true };
}
