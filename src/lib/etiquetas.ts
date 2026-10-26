import type { Prisma, ZonaSurMetodoEntrega } from "@/generated/prisma/client";

/** Tamaño de la etiqueta en milímetros (se usa en el CSS de impresión). */
export const ETIQUETA_ANCHO_MM = 80;
export const ETIQUETA_ALTO_MM = 50;

/** 2 columnas x 5 filas de 80x50 mm entran en una hoja A4 (con 10 mm de margen). */
export const ETIQUETAS_POR_HOJA_A4 = 10;

export type FormatoEtiqueta = "etiquetera" | "a4";

/** Lo mínimo que se lee de la base para armar etiquetas (sin mails, teléfonos ni montos). */
export const INCLUDE_ETIQUETA = {
  items: {
    include: {
      sku: {
        select: {
          nivel: true,
          composicion: { select: { cantidad: true, componente: { select: { nombre: true } } } },
        },
      },
    },
  },
} satisfies Prisma.ZonaSurPedidoInclude;

export type PedidoParaEtiqueta = Prisma.ZonaSurPedidoGetPayload<{ include: typeof INCLUDE_ETIQUETA }>;

export type EtiquetaItem = {
  cantidad: number;
  nombre: string;
  /** Frascos que lleva cada pack. Vacío si es un frasco suelto o el pack no tiene composición cargada. */
  frascos: { nombre: string; cantidad: number }[];
};

export type Etiqueta = {
  clave: string;
  codigo: string;
  fecha: Date;
  cliente: string;
  entrega: string;
  destino: string;
  items: EtiquetaItem[];
  /** Unidades que lleva el pedido en total (suma de cantidades). */
  unidades: number;
};

export const ENTREGA_LABEL: Record<ZonaSurMetodoEntrega, string> = {
  ENVIO_ZONA: "Envío a domicilio",
  PUNTO_QUILMES: "Retiro en Quilmes",
  PUNTO_BERNAL: "Retiro en Bernal",
  COLEGIO: "Entrega en el colegio",
  ANDREANI: "Envío por Andreani",
  RETIRO_CASA: "Retiro por la casa",
};

/** Código corto para identificar el pedido a simple vista (ej: "K3F9Q"). */
export function codigoPedido(id: string) {
  return id.slice(-5).toUpperCase();
}

export function destinoPedido(p: Pick<PedidoParaEtiqueta, "metodoEntrega" | "direccion" | "puntoElegido">) {
  if (p.metodoEntrega === "ANDREANI") {
    // Pedidos nuevos traen la dirección del cliente; los viejos la completaron en el link de Andreani.
    return p.direccion?.trim() ? `Andreani — ${p.direccion.trim()}` : "Andreani (datos en su link)";
  }
  const texto = p.metodoEntrega === "ENVIO_ZONA" ? p.direccion : p.puntoElegido;
  return texto?.trim() || "—";
}

export function totalUnidades(p: Pick<PedidoParaEtiqueta, "items">) {
  return p.items.reduce((suma, item) => suma + item.cantidad, 0);
}

/**
 * Una etiqueta por pedido, con todos sus productos. Para cada pack lista los frascos que
 * lleva según su composición (si pidió 2 iguales, cada uno lleva esos frascos); un frasco
 * suelto se lista a sí mismo.
 */
export function armarEtiquetas(pedidos: PedidoParaEtiqueta[]): Etiqueta[] {
  return pedidos.map((pedido) => ({
    clave: pedido.id,
    codigo: codigoPedido(pedido.id),
    fecha: pedido.createdAt,
    cliente: pedido.clienteNombre,
    entrega: ENTREGA_LABEL[pedido.metodoEntrega],
    destino: destinoPedido(pedido),
    unidades: totalUnidades(pedido),
    items: pedido.items.map((item) => ({
      cantidad: item.cantidad,
      nombre: item.nombre,
      frascos:
        item.sku?.nivel === "PACK"
          ? item.sku.composicion
              .map((c) => ({ nombre: c.componente.nombre, cantidad: c.cantidad }))
              .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
          : [],
    })),
  }));
}
