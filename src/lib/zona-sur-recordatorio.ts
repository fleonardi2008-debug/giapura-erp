import { whatsappUrl } from "@/lib/zona-sur-colegio";

/** Aviso para mandar el día anterior a quien recibe el pedido en su casa (envío a domicilio). */
export function recordatorioDomicilioUrl(opts: { nombre: string; telefono: string; efectivo: boolean; total: number }) {
  const primerNombre = opts.nombre.trim().split(/\s+/)[0] || "";
  const plata = `$${opts.total.toLocaleString("es-AR")}`;
  const mensaje =
    `holaa ${primerNombre} como estás? mañana entre las 11hs y 15hs voy a estar pasando por tu casa con tu pedido! ` +
    (opts.efectivo ? `recordá que en efectivo es: ${plata}. ` : "") +
    "cualquier cosa avisamee";
  return whatsappUrl(opts.telefono, mensaje);
}
