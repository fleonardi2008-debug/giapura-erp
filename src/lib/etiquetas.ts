import type { Prisma, ZonaSurMetodoEntrega } from "@/generated/prisma/client";

/** Tamaño de la etiqueta en milímetros (se usa en el CSS de impresión). */
export const ETIQUETA_ANCHO_MM = 80;
export const ETIQUETA_ALTO_MM = 50;

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

export type Etiqueta = {
  clave: string;
  codigo: string;
  fecha: Date;
  cliente: string;
  entrega: string;
  destino: string;
  producto: string;
  frascos: { nombre: string; cantidad: number }[];
  numero: number;
  total: number;
};

export const ENTREGA_LABEL: Record<ZonaSurMetodoEntrega, string> = {
  ENVIO_ZONA: "Envío a domicilio",
  PUNTO_QUILMES: "Retiro en Quilmes",
  PUNTO_BERNAL: "Retiro en Bernal",
};

/** Código corto para identificar el pedido a simple vista (ej: "K3F9Q"). */
export function codigoPedido(id: string) {
  return id.slice(-5).toUpperCase();
}

export function destinoPedido(p: Pick<PedidoParaEtiqueta, "metodoEntrega" | "direccion" | "puntoElegido">) {
  const texto = p.metodoEntrega === "ENVIO_ZONA" ? p.direccion : p.puntoElegido;
  return texto?.trim() || "—";
}

/** Cuántos paquetes (packs o unidades) lleva el pedido en total. */
export function totalPaquetes(p: Pick<PedidoParaEtiqueta, "items">) {
  return p.items.reduce((suma, item) => suma + item.cantidad, 0);
}

/**
 * Una etiqueta por cada pack del pedido (si pidió 2 packs iguales salen 2 etiquetas,
 * "Paquete 1 de 2" y "Paquete 2 de 2"). Si el producto es un pack, lista los frascos que
 * lleva según su composición; si es un frasco suelto, lo lista a él mismo.
 */
export function armarEtiquetas(pedidos: PedidoParaEtiqueta[]): Etiqueta[] {
  const etiquetas: Etiqueta[] = [];

  for (const pedido of pedidos) {
    const total = totalPaquetes(pedido);
    let numero = 0;

    for (const item of pedido.items) {
      const composicion = item.sku?.nivel === "PACK" ? item.sku.composicion : [];
      const frascos =
        composicion.length > 0
          ? composicion
              .map((c) => ({ nombre: c.componente.nombre, cantidad: c.cantidad }))
              .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
          : [{ nombre: item.nombre, cantidad: 1 }];

      for (let i = 0; i < item.cantidad; i++) {
        numero += 1;
        etiquetas.push({
          clave: `${pedido.id}-${item.id}-${i}`,
          codigo: codigoPedido(pedido.id),
          fecha: pedido.createdAt,
          cliente: pedido.clienteNombre,
          entrega: ENTREGA_LABEL[pedido.metodoEntrega],
          destino: destinoPedido(pedido),
          producto: item.nombre,
          frascos,
          numero,
          total,
        });
      }
    }
  }

  return etiquetas;
}
