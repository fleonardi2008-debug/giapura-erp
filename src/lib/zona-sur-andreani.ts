export type TarifaAndreani = { desde: number; hasta: number; precio: number };

/** "6.500" -> 6500, "6500,50" -> 6500.5, "$ 6500" -> 6500. null si no es un número válido. */
function leerPrecio(texto: string): number | null {
  const limpio = texto.replace(/[$\s]/g, "");
  if (!/^\d[\d.]*(,\d+)?$/.test(limpio)) return null;
  const n = Number(limpio.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Tabla de precios aproximados por código postal, una regla por línea:
 *   1878 = 6500          (un código postal)
 *   1800-1999 = 6500     (un rango)
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
    const precio = m ? leerPrecio(m[3]) : null;
    const desde = m ? Number(m[1]) : NaN;
    const hasta = m ? Number(m[2] ?? m[1]) : NaN;
    if (!m || precio === null || hasta < desde) {
      errores.push({ linea: i + 1, texto: linea });
      return;
    }
    tarifas.push({ desde, hasta, precio });
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
 * Precio aproximado para un código postal. Si coinciden varias reglas gana la más específica
 * (el rango más angosto), así que se pueden combinar un rango grande con excepciones puntuales.
 */
export function estimarEnvioAndreani(tarifas: TarifaAndreani[], codigoPostal: string): number | null {
  const cp = numeroDeCodigoPostal(codigoPostal);
  if (cp === null) return null;
  let mejor: TarifaAndreani | null = null;
  for (const t of tarifas) {
    if (cp < t.desde || cp > t.hasta) continue;
    if (!mejor || t.hasta - t.desde < mejor.hasta - mejor.desde) mejor = t;
  }
  return mejor ? mejor.precio : null;
}
