"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { leerStockZonaSur } from "@/lib/zona-sur-stock";
import { parsearDiasImpa, parsearOpcionesImpa, puntoRetiroImpa, serializarDiasImpa } from "@/lib/impa";

async function requireOwner() {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  if (session.user.role !== "OWNER") throw new Error("No autorizado");
  return session;
}

const itemSchema = z.object({
  skuId: z.string().min(1),
  cantidad: z.coerce.number().int().positive(),
});

const itemsSchema = z.array(itemSchema).min(1, "Elegí al menos un producto");

type DatosPedido = {
  nombre: string;
  email: string;
  telefono: string;
  dia: string;
  opcion: string;
  metodoPago: "TRANSFERENCIA" | "EFECTIVO";
  pagaCon: number | null;
  items: { skuId: string; cantidad: number }[];
  comprobante: File | null;
  nota: string | null;
  /** Pedido cargado por el dueño: no se exige comprobante ni se frena por falta de stock. */
  porElDueno: boolean;
};

/** Crea un pedido de retiro en el IMPA. Los precios y el stock se comprueban acá, nunca se confía en el navegador. */
async function guardarPedidoImpa(d: DatosPedido): Promise<{ error: string } | { success: true; aviso?: string }> {
  const config = await prisma.zonaSurConfig.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} });

  const dias = parsearDiasImpa(config.impaDias, parsearOpcionesImpa(config.impaOpciones));
  if (dias.length === 0) return { error: "Por ahora no hay días de retiro en el IMPA." };
  const diaElegido = dias.find((x) => x.dia === d.dia);
  if (!diaElegido) return { error: "Ese día ya no está disponible. Elegí otro de la lista." };
  if (!diaElegido.opciones.includes(d.opcion)) return { error: "Ese momento no está disponible ese día. Elegí otro de la lista." };

  const skus = await prisma.sku.findMany({
    where: { id: { in: d.items.map((i) => i.skuId) }, activo: true, precioImpa: { not: null } },
  });
  const itemsParaCrear = [];
  for (const item of d.items) {
    const sku = skus.find((s) => s.id === item.skuId);
    if (!sku || !sku.precioImpa) {
      return { error: "Uno de los productos elegidos ya no está disponible. Recargá la página y volvé a armar tu pedido." };
    }
    const precioUnitario = Number(sku.precioImpa);
    itemsParaCrear.push({
      skuId: sku.id,
      nombre: sku.nombre,
      cantidad: item.cantidad,
      precioUnitario,
      subtotal: precioUnitario * item.cantidad,
    });
  }

  // Stock compartido con Zona Sur: lo que ya se pidió (de las dos páginas y lo cargado a mano) descuenta del mismo total.
  let aviso: string | undefined;
  const { stock, consumo } = await leerStockZonaSur();
  const necesario: Record<string, number> = {};
  for (const item of d.items) {
    for (const [frascoId, n] of Object.entries(consumo[item.skuId] ?? {})) {
      necesario[frascoId] = (necesario[frascoId] ?? 0) + n * item.cantidad;
    }
  }
  for (const f of stock) {
    const quedan = Math.max(0, f.total - f.usado);
    if ((necesario[f.id] ?? 0) > quedan) {
      if (!d.porElDueno) return { error: `No nos queda stock de ${f.nombre} (quedan ${quedan}).` };
      aviso = `Ojo: de ${f.nombre} quedaban ${quedan} y este pedido lleva ${necesario[f.id]}. Se cargó igual.`;
    }
  }

  const total = itemsParaCrear.reduce((acc, i) => acc + i.subtotal, 0);
  if (d.metodoPago === "EFECTIVO" && !d.porElDueno && (!d.pagaCon || d.pagaCon < total)) {
    return { error: "Falta indicar con cuánto pagás (tiene que ser al menos el total)" };
  }

  let comprobanteUrl: string | null = null;
  if (d.comprobante && d.comprobante.size > 0) {
    try {
      // El almacén es privado: se guarda la ruta del archivo y se lo ve desde /api/comprobante (solo dueño).
      const subido = await put(`zona-sur/comprobantes/impa-${Date.now()}.jpg`, d.comprobante, {
        access: "private",
        addRandomSuffix: true,
        contentType: d.comprobante.type || "image/jpeg",
      });
      comprobanteUrl = subido.pathname;
    } catch (error) {
      console.error("No se pudo subir el comprobante", error);
      return { error: "No pudimos subir el comprobante. Probá con otra foto o con una captura de pantalla." };
    }
  }

  await prisma.zonaSurPedido.create({
    data: {
      clienteNombre: d.nombre,
      clienteEmail: d.email,
      clienteTelefono: d.telefono,
      metodoEntrega: "RETIRO_IMPA",
      puntoElegido: puntoRetiroImpa(config.impaLugar, d.dia, d.opcion),
      metodoPago: d.metodoPago,
      comprobanteUrl,
      pagaCon: d.metodoPago === "EFECTIVO" ? d.pagaCon : null,
      descuento: 0,
      costoEnvio: 0,
      envioAConfirmar: false,
      total,
      nota: d.nota,
      items: { create: itemsParaCrear },
    },
  });

  revalidatePath("/pedidos-impa");
  return { success: true, aviso };
}

// ---------- Pedido público (sin login, lo llama el formulario de /impa) ----------

const publicoSchema = z.object({
  clienteNombre: z.string().trim().min(1, "Falta el nombre"),
  clienteEmail: z.string().email("El mail no parece válido"),
  clienteTelefono: z.string().trim().min(6, "Falta el teléfono"),
  impaDia: z.string().min(1, "Elegí el día de retiro"),
  impaOpcion: z.string().min(1, "Elegí si retirás a la entrada o a la salida"),
  metodoPago: z.enum(["TRANSFERENCIA", "EFECTIVO"]),
  pagaCon: z.coerce.number().optional(),
});

export async function crearImpaPedido(formData: FormData) {
  const parsed = publicoSchema.safeParse({
    clienteNombre: formData.get("clienteNombre"),
    clienteEmail: formData.get("clienteEmail"),
    clienteTelefono: formData.get("clienteTelefono"),
    impaDia: formData.get("impaDia") ?? "",
    impaOpcion: formData.get("impaOpcion") ?? "",
    metodoPago: formData.get("metodoPago"),
    pagaCon: formData.get("pagaCon") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  let items: z.infer<typeof itemsSchema>;
  try {
    items = itemsSchema.parse(JSON.parse(String(formData.get("items") ?? "")));
  } catch {
    return { error: "Elegí al menos un producto" };
  }

  const comprobante = formData.get("comprobante");
  const tieneComprobante = comprobante instanceof File && comprobante.size > 0;
  if (parsed.data.metodoPago === "TRANSFERENCIA" && !tieneComprobante) {
    return { error: "Falta subir el comprobante de la transferencia" };
  }

  const res = await guardarPedidoImpa({
    nombre: parsed.data.clienteNombre,
    email: parsed.data.clienteEmail,
    telefono: parsed.data.clienteTelefono,
    dia: parsed.data.impaDia,
    opcion: parsed.data.impaOpcion,
    metodoPago: parsed.data.metodoPago,
    pagaCon: parsed.data.pagaCon ?? null,
    items,
    comprobante: tieneComprobante ? (comprobante as File) : null,
    nota: null,
    porElDueno: false,
  });
  return "error" in res ? { error: res.error } : { success: true };
}

// ---------- Pedido cargado por el dueño desde el administrador ----------

const manualSchema = z.object({
  nombre: z.string().trim().min(1, "Falta el nombre"),
  telefono: z.string().trim().default(""),
  dia: z.string().min(1, "Elegí el día"),
  opcion: z.string().min(1, "Elegí entrada o salida"),
  metodoPago: z.enum(["TRANSFERENCIA", "EFECTIVO"]),
  nota: z.string().trim().max(1000).default(""),
  items: itemsSchema,
});

/** Carga un pedido a mano (alguien que pidió por WhatsApp): descuenta del mismo stock que los de la página. */
export async function cargarPedidoImpaManual(input: z.input<typeof manualSchema>) {
  await requireOwner();
  const parsed = manualSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const d = parsed.data;
  const res = await guardarPedidoImpa({
    nombre: d.nombre,
    email: "",
    telefono: d.telefono,
    dia: d.dia,
    opcion: d.opcion,
    metodoPago: d.metodoPago,
    pagaCon: null,
    items: d.items,
    comprobante: null,
    nota: d.nota || null,
    porElDueno: true,
  });
  return "error" in res ? { error: res.error } : { success: true, aviso: res.aviso };
}

// ---------- Configuración de la página del IMPA ----------

/** Guarda precios, días y opciones de retiro, y cuánto stock queda hoy (compartido con Zona Sur). */
export async function guardarImpaConfig(formData: FormData) {
  await requireOwner();

  const precios: { id: string; precio: number | null; tachado: number | null }[] = [];
  const quedan: { id: string; quedan: number }[] = [];
  const numero = (texto: string): number | null | "mal" => {
    const t = texto.trim().replace(",", ".");
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) && n >= 0 ? n : "mal";
  };

  for (const [clave, valor] of formData.entries()) {
    if (typeof valor !== "string") continue;
    if (clave.startsWith("precio_")) {
      const id = clave.slice("precio_".length);
      const precio = numero(valor);
      const tachado = numero(String(formData.get(`tachado_${id}`) ?? ""));
      if (precio === "mal" || tachado === "mal") return { error: `Un precio no es válido ("${valor}"). Escribí solo números.` };
      if (precio != null && tachado != null && tachado <= precio) {
        return { error: "El precio tachado tiene que ser mayor que el precio de venta (o dejalo vacío)." };
      }
      precios.push({ id, precio, tachado: precio == null ? null : tachado });
    } else if (clave.startsWith("quedan_")) {
      const t = valor.trim();
      if (!t) continue; // vacío = no se toca
      const n = Number(t);
      if (!Number.isInteger(n) || n < 0) return { error: `El stock "${t}" no es válido. Escribí un número entero (ej: 95).` };
      quedan.push({ id: clave.slice("quedan_".length), quedan: n });
    }
  }

  // El stock se guarda como total (lo que había + lo ya pedido) para que "quedan" sea exactamente lo que cargaste hoy.
  const { stock } = await leerStockZonaSur();
  const usadoPorId = new Map(stock.map((f) => [f.id, f.usado]));

  await prisma.$transaction([
    prisma.zonaSurConfig.upsert({
      where: { id: "singleton" },
      create: { id: "singleton" },
      update: {
        impaDias: serializarDiasImpa(parsearDiasImpa(String(formData.get("impaDias") ?? ""))),
        impaLugar: String(formData.get("impaLugar") ?? "").trim() || null,
      },
    }),
    ...precios.map(({ id, precio, tachado }) =>
      prisma.sku.updateMany({ where: { id }, data: { precioImpa: precio, precioImpaTachado: tachado } })
    ),
    ...quedan.map(({ id, quedan: q }) =>
      prisma.sku.updateMany({ where: { id }, data: { stockZonaSur: q + (usadoPorId.get(id) ?? 0) } })
    ),
  ]);

  revalidatePath("/pedidos-impa");
  revalidatePath("/pedidos-impa/config");
  revalidatePath("/impa");
  revalidatePath("/zona-sur");
  revalidatePath("/pedidos-zona-sur/config");
  return { success: true };
}
