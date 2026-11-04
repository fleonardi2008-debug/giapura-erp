import { parsearDiasColegio } from "@/lib/zona-sur-colegio";

/** Días de retiro en el IMPA: uno por línea, sin vacíos ni repetidos. */
export const parsearDiasImpa = parsearDiasColegio;

const OPCIONES_POR_DEFECTO = ["A la entrada", "A la salida"];

/** Momentos de retiro de cada día (ej: "A la entrada", "A la salida"): uno por línea. */
export function parsearOpcionesImpa(texto: string | null | undefined): string[] {
  const opciones = parsearDiasColegio(texto);
  return opciones.length > 0 ? opciones : OPCIONES_POR_DEFECTO;
}

/** Texto que se guarda en el pedido y se muestra en listas y etiquetas: "IMPA — Martes 11/11 — A la salida". */
export function puntoRetiroImpa(lugar: string | null | undefined, dia: string, opcion: string) {
  return [lugar?.trim() || "IMPA", dia, opcion].join(" — ");
}

/** Porcentaje que se ahorra respecto del precio tachado, redondeado (null si no hay ahorro). */
export function porcentajeOff(tachado: number | null | undefined, precio: number) {
  if (!tachado || tachado <= precio) return null;
  return Math.round(((tachado - precio) / tachado) * 100);
}
