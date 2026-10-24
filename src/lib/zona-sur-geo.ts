export type Punto = { lat: number; lng: number };

/** Distancia en km entre dos puntos (fórmula de haversine). */
export function distanciaKm(a: Punto, b: Punto): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export type ResultadoUbicar = { estado: "ok"; punto: Punto } | { estado: "noencontrada" } | { estado: "error" };

/**
 * Busca una dirección en OpenStreetMap (Nominatim). Se llama desde el navegador del cliente.
 * Se sesga hacia la zona de envío para que "Mitre 500" no caiga en otra ciudad.
 */
export async function ubicarDireccion(direccion: string, centro: Punto): Promise<ResultadoUbicar> {
  const consulta = /argentina/i.test(direccion) ? direccion : `${direccion}, Argentina`;
  const margen = 0.5;
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ar" +
    `&viewbox=${centro.lng - margen},${centro.lat + margen},${centro.lng + margen},${centro.lat - margen}` +
    `&q=${encodeURIComponent(consulta)}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return { estado: "error" };
    const datos = (await res.json()) as { lat: string; lon: string }[];
    if (!datos?.[0]) return { estado: "noencontrada" };
    const punto = { lat: parseFloat(datos[0].lat), lng: parseFloat(datos[0].lon) };
    if (!Number.isFinite(punto.lat) || !Number.isFinite(punto.lng)) return { estado: "noencontrada" };
    return { estado: "ok", punto };
  } catch {
    return { estado: "error" };
  }
}
