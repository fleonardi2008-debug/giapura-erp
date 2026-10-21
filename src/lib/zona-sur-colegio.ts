/** Días de entrega en el colegio: un día por línea, sin vacíos ni repetidos. */
export function parsearDiasColegio(texto: string | null | undefined): string[] {
  const vistos = new Set<string>();
  const dias: string[] = [];
  for (const linea of (texto ?? "").split(/\r?\n/)) {
    const dia = linea.trim();
    if (dia && !vistos.has(dia)) {
      vistos.add(dia);
      dias.push(dia);
    }
  }
  return dias;
}

/**
 * Número en el formato que pide wa.me para celulares argentinos (549 + característica + número,
 * sin 0 ni 15). Cubre los formatos comunes; si no lo reconoce devuelve los dígitos tal cual,
 * así que conviene mirar el link antes de mandar.
 */
export function telefonoParaWhatsapp(telefono: string): string {
  let d = telefono.replace(/\D/g, "").replace(/^00/, "");
  if (d.startsWith("549")) return d;
  if (d.startsWith("54")) d = d.slice(2);
  d = d.replace(/^0/, "");
  // "11 15 5555 4444": se saca el 15 que va después del código de área de 2 dígitos
  if (d.length === 12 && d.slice(2, 4) === "15") d = d.slice(0, 2) + d.slice(4);
  return d.length === 10 ? `549${d}` : d;
}

export function whatsappUrl(telefono: string, mensaje: string): string {
  return `https://wa.me/${telefonoParaWhatsapp(telefono)}?text=${encodeURIComponent(mensaje)}`;
}
