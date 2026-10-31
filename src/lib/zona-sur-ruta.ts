import type { Punto } from "@/lib/zona-sur-geo";

export type ParadaRuta = { id: string; punto: Punto };
export type TramoRuta = { paradaId: string; minutos: number; km: number };
export type Tramo = { minutos: number; km: number };
export type ResultadoRuta = {
  aRetiro: Tramo; // de la salida al lugar donde se buscan las cajas
  orden: TramoRuta[]; // entregas en el orden recomendado
  final: Tramo | null; // hasta el punto de llegada, si se cargó uno
  minutosTotal: number;
  kmTotal: number;
};

const OSRM = "https://router.project-osrm.org";
const coord = (p: Punto) => `${p.lng},${p.lat}`;

/**
 * Pide a OSRM (rutas por calles, gratis) el recorrido: salida -> retiro de cajas (primera parada, fija) ->
 * entregas en el mejor orden por tiempo de manejo -> llegada (opcional; si no hay, termina en la última entrega).
 * Se llama desde el navegador. Devuelve null si el servicio no responde.
 */
export async function calcularRuta(
  inicio: Punto,
  retiro: Punto,
  paradas: ParadaRuta[],
  fin: Punto | null
): Promise<ResultadoRuta | null> {
  try {
    const rutaRetiro = await fetch(`${OSRM}/route/v1/driving/${coord(inicio)};${coord(retiro)}?overview=false`);
    if (!rutaRetiro.ok) return null;
    const dr = (await rutaRetiro.json()) as { code: string; routes: { duration: number; distance: number }[] };
    if (dr.code !== "Ok" || !dr.routes?.[0]) return null;
    const aRetiro = { minutos: dr.routes[0].duration / 60, km: dr.routes[0].distance / 1000 };

    // El recorrido óptimo empieza en el retiro (source=first); si hay llegada, termina ahí (destination=last).
    const puntos = [retiro, ...paradas.map((p) => p.punto), ...(fin ? [fin] : [])];
    const url =
      `${OSRM}/trip/v1/driving/${puntos.map(coord).join(";")}?source=first` +
      `${fin ? "&destination=last" : ""}&roundtrip=false&overview=false`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const datos = (await res.json()) as {
      code: string;
      waypoints: { waypoint_index: number }[];
      trips: { legs: { duration: number; distance: number }[] }[];
    };
    if (datos.code !== "Ok" || !datos.trips?.[0]) return null;
    const legs = datos.trips[0].legs;
    // waypoints[i].waypoint_index = posición de la entrada i dentro del recorrido
    const porPosicion = new Map<number, number>();
    datos.waypoints.forEach((w, entrada) => porPosicion.set(w.waypoint_index, entrada));
    const orden: TramoRuta[] = [];
    for (let pos = 1; pos <= paradas.length; pos++) {
      const entrada = porPosicion.get(pos);
      if (entrada == null || entrada < 1 || entrada > paradas.length) return null;
      orden.push({ paradaId: paradas[entrada - 1].id, minutos: legs[pos - 1].duration / 60, km: legs[pos - 1].distance / 1000 });
    }
    const ultimo = fin ? legs[paradas.length] : null;
    const final = ultimo ? { minutos: ultimo.duration / 60, km: ultimo.distance / 1000 } : null;
    const minutosTotal = aRetiro.minutos + orden.reduce((a, t) => a + t.minutos, 0) + (final?.minutos ?? 0);
    const kmTotal = aRetiro.km + orden.reduce((a, t) => a + t.km, 0) + (final?.km ?? 0);
    return { aRetiro, orden, final, minutosTotal, kmTotal };
  } catch {
    return null;
  }
}

/**
 * Enlaces de Google Maps con el recorrido en orden. Google acepta ~9 paradas intermedias por enlace;
 * si hay más, se parte en varios tramos consecutivos.
 */
export function enlacesGoogleMaps(inicio: string, paradas: string[], fin: string): string[] {
  const puntos = [inicio, ...paradas, fin];
  const enlaces: string[] = [];
  const POR_ENLACE = 10; // origen + 9 paradas + destino
  for (let i = 0; i < puntos.length - 1; i += POR_ENLACE - 1) {
    const tramo = puntos.slice(i, i + POR_ENLACE);
    if (tramo.length < 2) break;
    const params = new URLSearchParams({
      api: "1",
      travelmode: "driving",
      origin: tramo[0],
      destination: tramo[tramo.length - 1],
    });
    const medio = tramo.slice(1, -1);
    if (medio.length) params.set("waypoints", medio.join("|"));
    enlaces.push(`https://www.google.com/maps/dir/?${params.toString()}`);
  }
  return enlaces;
}
