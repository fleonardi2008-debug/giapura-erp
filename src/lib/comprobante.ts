/** Dirección para abrir un comprobante guardado. Los nuevos son una ruta del almacén privado; los viejos eran un link directo. */
export function enlaceComprobante(valor: string): string {
  return /^https?:\/\//.test(valor) ? valor : `/api/comprobante?p=${encodeURIComponent(valor)}`;
}
