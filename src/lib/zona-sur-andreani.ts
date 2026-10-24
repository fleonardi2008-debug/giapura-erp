export type ModalidadAndreani = "DOMICILIO" | "SUCURSAL";
export type TarifaAndreani = { desde: number; hasta: number; sucursal: number; domicilio: number };

/** "6.500" -> 6500, "6500,50" -> 6500.5, "$ 6500" -> 6500. null si no es un número válido. */
function leerPrecio(texto: string): number | null {
  const limpio = texto.replace(/[$\s]/g, "");
  if (!/^\d[\d.]*(,\d+)?$/.test(limpio)) return null;
  const n = Number(limpio.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Tabla de precios del envío por código postal, una regla por línea. El precio es "sucursal / domicilio":
 *   1000-1999 = 7701 / 10158   (un rango: 7701 a sucursal, 10158 a domicilio)
 *   1878 = 7701 / 10158        (un código postal)
 *   5000 = 12000               (un solo precio: vale para los dos)
 * Devuelve las reglas válidas y las líneas que no se entendieron (con su número).
 */
export function parsearTarifasAndreani(texto: string | null | undefined): {
  tarifas: TarifaAndreani[];
  errores: { linea: number; texto: string }[];
} {
  const tarifas: TarifaAndreani[] = [];
  const errores: { linea: number; texto: string }[] = [];
  (texto ?? "").split(/\r?\n/).forEach((cruda, i) => {
    const linea = cruda.trim();
    if (!linea) return;
    const m = linea.match(/^(\d{4})(?:\s*-\s*(\d{4}))?\s*[=:]\s*(.+)$/);
    const partes = m ? m[3].split("/") : [];
    const sucursal = partes.length >= 1 && partes.length <= 2 ? leerPrecio(partes[0]) : null;
    const domicilio = partes.length === 2 ? leerPrecio(partes[1]) : sucursal;
    const desde = m ? Number(m[1]) : NaN;
    const hasta = m ? Number(m[2] ?? m[1]) : NaN;
    if (!m || sucursal === null || domicilio === null || hasta < desde) {
      errores.push({ linea: i + 1, texto: linea });
      return;
    }
    tarifas.push({ desde, hasta, sucursal, domicilio });
  });
  return { tarifas, errores };
}

/**
 * Los 4 dígitos del código postal ("1878", "B1878ABC", "b 1878" -> 1878). null si no hay un grupo
 * de exactamente 4 dígitos: con uno de más ("18789") no es un código válido y no se adivina.
 */
export function numeroDeCodigoPostal(texto: string): number | null {
  const m = texto.match(/(?<!\d)\d{4}(?!\d)/);
  return m ? Number(m[0]) : null;
}

/**
 * Precio del envío para un código postal. Si coinciden varias reglas gana la más específica
 * (el rango más angosto), así que se pueden combinar un rango grande con excepciones puntuales.
 */
export function estimarEnvioAndreani(
  tarifas: TarifaAndreani[],
  codigoPostal: string,
  modalidad: ModalidadAndreani
): number | null {
  const cp = numeroDeCodigoPostal(codigoPostal);
  if (cp === null) return null;
  let mejor: TarifaAndreani | null = null;
  for (const t of tarifas) {
    if (cp < t.desde || cp > t.hasta) continue;
    if (!mejor || t.hasta - t.desde < mejor.hasta - mejor.desde) mejor = t;
  }
  return mejor ? (modalidad === "SUCURSAL" ? mejor.sucursal : mejor.domicilio) : null;
}

/** Hasta cuántos números de código postal se acepta tomar una tarifa "vecina" cuando no hay una que coincida. */
export const TOLERANCIA_CERCANO = 300;

/**
 * Como estimarEnvioAndreani, pero si ninguna regla incluye el código postal usa la regla más cercana
 * (siempre que esté a TOLERANCIA_CERCANO números o menos). `cercano` avisa que es una estimación por vecindad.
 */
export function estimarEnvioAndreaniCercano(
  tarifas: TarifaAndreani[],
  codigoPostal: string,
  modalidad: ModalidadAndreani
): { precio: number; cercano: boolean } | null {
  const exacto = estimarEnvioAndreani(tarifas, codigoPostal, modalidad);
  if (exacto !== null) return { precio: exacto, cercano: false };
  const cp = numeroDeCodigoPostal(codigoPostal);
  if (cp === null) return null;
  let mejor: { t: TarifaAndreani; distancia: number } | null = null;
  for (const t of tarifas) {
    const distancia = cp < t.desde ? t.desde - cp : cp - t.hasta;
    if (distancia > TOLERANCIA_CERCANO) continue;
    if (!mejor || distancia < mejor.distancia) mejor = { t, distancia };
  }
  return mejor ? { precio: modalidad === "SUCURSAL" ? mejor.t.sucursal : mejor.t.domicilio, cercano: true } : null;
}
