import type { Punto } from "@/lib/zona-sur-geo";

export type ParadaRuta = { id: string; punto: Punto };
export type TramoRuta = { paradaId: string; minutos: number; km: number };
export type ResultadoRuta = { orden: TramoRuta[]; minutosTotal: number; kmTotal: number };

/**
 * Pide a OSRM (rutas por calles, gratis) el mejor orden para pasar por todas las paradas, saliendo del
 * primer punto y terminando en el último. Se llama desde el navegador.
 * Devuelve las paradas en orden con el tiempo de manejo de cada tramo (el último tramo, el de la llegada, no está en la lista).
 */
export async function calcularRuta(inicio: Punto, paradas: ParadaRuta[], fin: Punto): Promise<ResultadoRuta | null> {
  const puntos = [inicio, ...paradas.map((p) => p.punto), fin];
  const coords = puntos.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `https://router.project-osrm.org/trip/v1/driving/${coords}?source=first&destination=last&roundtrip=false&overview=false`;
  try {
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
    const minutosTotal = legs.reduce((a, l) => a + l.duration, 0) / 60;
    const kmTotal = legs.reduce((a, l) => a + l.distance, 0) / 1000;
    return { orden, minutosTotal, kmTotal };
  } catch {
    return null;
  }
}

/** Tiempo del último tramo (hasta la llegada) = total menos los tramos de las paradas. */
export function tramoFinal(r: ResultadoRuta) {
  return {
    minutos: r.minutosTotal - r.orden.reduce((a, t) => a + t.minutos, 0),
    km: r.kmTotal - r.orden.reduce((a, t) => a + t.km, 0),
  };
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
