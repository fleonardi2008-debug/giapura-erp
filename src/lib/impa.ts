import { parsearDiasColegio } from "@/lib/zona-sur-colegio";

/** Un día de retiro con los momentos en que se puede retirar ese día (ej: "A la entrada 7:15 am"). */
export type DiaImpa = { dia: string; opciones: string[] };

const OPCIONES_POR_DEFECTO = ["A la entrada", "A la salida"];

/** Lista simple (una por línea, sin vacíos ni repetidos). */
export function parsearOpcionesImpa(texto: string | null | undefined): string[] {
  const opciones = parsearDiasColegio(texto);
  return opciones.length > 0 ? opciones : OPCIONES_POR_DEFECTO;
}

/**
 * Días de retiro, uno por línea. Cada día puede llevar sus propios momentos: "Jueves 12/11 = A la entrada 7:15 am | A la salida".
 * Sin "=" el día usa los momentos generales (`porDefecto`).
 */
export function parsearDiasImpa(texto: string | null | undefined, porDefecto: string[] = OPCIONES_POR_DEFECTO): DiaImpa[] {
  const vistos = new Set<string>();
  const dias: DiaImpa[] = [];
  for (const linea of (texto ?? "").split(/\r?\n/)) {
    const [parteDia, ...resto] = linea.split("=");
    const dia = parteDia.trim();
    if (!dia || vistos.has(dia)) continue;
    vistos.add(dia);
    const propias = resto
      .join("=")
      .split("|")
      .map((o) => o.trim())
      .filter(Boolean);
    dias.push({ dia, opciones: resto.length > 0 && propias.length > 0 ? [...new Set(propias)] : porDefecto });
  }
  return dias;
}

/** Vuelve a escribir los días como se guardan (un día por línea, con sus momentos). */
export function serializarDiasImpa(dias: DiaImpa[]): string {
  return dias.map((d) => `${d.dia} = ${d.opciones.join(" | ")}`).join("\n");
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
